import { useRef } from "react";
import { C } from "../constants";
import { uploadSpecSheet, listLibrary, deleteLibraryEntry, getSpecSheetUrl } from "../supabase";

const CAT_META = {
  camera:  { label: "CCTV / Cameras",   icon: "📷" },
  door:    { label: "Access Control",    icon: "🚪" },
  zone:    { label: "Intrusion",         icon: "🔔" },
  speaker: { label: "Audio",             icon: "🔊" },
  switch:  { label: "Network Switching", icon: "🔀" },
  server:  { label: "Server / NVR",      icon: "🖥" },
};
const CAT_ORDER = ["camera","door","zone","speaker","switch","server"];

export default function LibraryTab({
  library, setLibrary, libraryLoading,
  libUploadForm, setLibUploadForm,
  libShowAll, setLibShowAll,
  cameraGroups, doorGroups, zoneGroups, speakerGroups, switchGroups, serverGroups,
}) {
  const libUploadFileRef = useRef(null);

  const projectKeys = new Set(
    [...cameraGroups,...doorGroups,...zoneGroups,...speakerGroups,...switchGroups,...serverGroups]
      .map(g => `${g.brand}|${g.model}`.toLowerCase())
      .filter(k => k !== "|")
  );
  const hasProjectDevices = projectKeys.size > 0;
  const matchedRows = library.filter(e => projectKeys.has(`${e.brand}|${e.model}`.toLowerCase()));
  const matchCount  = matchedRows.length;
  const visibleRows = (hasProjectDevices && !libShowAll) ? matchedRows : library;

  const tree = {};
  for (const row of visibleRows) {
    if (!tree[row.category]) tree[row.category] = {};
    if (!tree[row.category][row.brand]) tree[row.category][row.brand] = [];
    tree[row.category][row.brand].push(row);
  }

  return (
    <div>
      {/* Upload form modal */}
      {libUploadForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(7,20,42,0.78)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.white, borderRadius: 12, maxWidth: 480, width: "100%", boxShadow: "0 8px 48px rgba(0,0,0,.4)" }}>
            <div style={{ background: C.navy, borderRadius: "12px 12px 0 0", padding: "14px 18px", display: "flex", alignItems: "center" }}>
              <span style={{ color: C.white, fontWeight: 800, fontSize: 14, flex: 1 }}>Add to Device Library</span>
              <button onClick={() => setLibUploadForm(null)} style={{ background: "rgba(255,255,255,0.12)", color: C.white, border: "none", borderRadius: 5, padding: "3px 9px", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                ["Category", "category", "select", CAT_ORDER],
                ["Brand",    "brand",     "text"],
                ["Model #",  "model",     "text"],
                ["Display Name (optional)", "displayName", "text"],
              ].map(([lbl, key, type, opts]) => (
                <div key={key}>
                  <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>{lbl}</label>
                  {type === "select" ? (
                    <select value={libUploadForm[key] || ""} onChange={e => setLibUploadForm(s => ({ ...s, [key]: e.target.value }))}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, color: C.navy }}>
                      <option value="">— select —</option>
                      {opts.map(v => <option key={v} value={v}>{CAT_META[v]?.label || v}</option>)}
                    </select>
                  ) : (
                    <input value={libUploadForm[key] || ""} onChange={e => setLibUploadForm(s => ({ ...s, [key]: e.target.value }))}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, color: C.navy, boxSizing: "border-box" }} />
                  )}
                </div>
              ))}
              <div>
                <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Spec Sheet PDF</label>
                <input ref={libUploadFileRef} type="file" accept=".pdf" style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) setLibUploadForm(s => ({ ...s, file: f })); e.target.value = ""; }} />
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => libUploadFileRef.current?.click()}
                    style={{ background: C.bg, color: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    ⬆ Choose PDF
                  </button>
                  {libUploadForm.file
                    ? <span style={{ color: C.success, fontSize: 12, fontWeight: 600 }}>✓ {libUploadForm.file.name}</span>
                    : <span style={{ color: C.muted, fontSize: 12 }}>No file chosen</span>}
                </div>
              </div>
              {libUploadForm.error && <div style={{ color: C.danger, fontSize: 12 }}>{libUploadForm.error}</div>}
            </div>
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setLibUploadForm(null)} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button
                disabled={libUploadForm.uploading || !libUploadForm.category || !libUploadForm.brand || !libUploadForm.model || !libUploadForm.file}
                onClick={async () => {
                  setLibUploadForm(s => ({ ...s, uploading: true, error: null }));
                  try {
                    await uploadSpecSheet({
                      category:    libUploadForm.category,
                      brand:       libUploadForm.brand.trim(),
                      model:       libUploadForm.model.trim(),
                      displayName: libUploadForm.displayName?.trim() || libUploadForm.model.trim(),
                      file:        libUploadForm.file,
                    });
                    const rows = await listLibrary();
                    setLibrary(rows);
                    setLibUploadForm(null);
                  } catch (err) {
                    setLibUploadForm(s => ({ ...s, uploading: false, error: err.message || "Upload failed" }));
                  }
                }}
                style={{ background: C.accent, color: C.white, border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer",
                  opacity: (libUploadForm.uploading || !libUploadForm.category || !libUploadForm.brand || !libUploadForm.model || !libUploadForm.file) ? 0.5 : 1 }}>
                {libUploadForm.uploading ? "Uploading…" : "Save to Library"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 800, color: C.navy, fontSize: 16 }}>📚 Device Library</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
            {hasProjectDevices && !libShowAll
              ? `${matchCount} spec sheet${matchCount !== 1 ? "s" : ""} matched to this project · ${library.length} total in library`
              : `${library.length} spec sheet${library.length !== 1 ? "s" : ""} stored · shared across all projects`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {hasProjectDevices && (
            <button onClick={() => setLibShowAll(v => !v)}
              style={{ background: libShowAll ? C.bg : C.surface, color: libShowAll ? C.muted : C.accent, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {libShowAll ? "Show project only" : `Show all ${library.length}`}
            </button>
          )}
          <button onClick={() => setLibUploadForm({ category: "", brand: "", model: "", displayName: "", file: null, uploading: false, error: null })}
            style={{ background: C.accent, color: C.white, border: "none", borderRadius: 7, padding: "9px 18px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
            + Add Spec Sheet
          </button>
        </div>
      </div>

      {/* Library tree */}
      {libraryLoading ? (
        <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 40, textAlign: "center", color: C.muted }}>Loading library…</div>
      ) : visibleRows.length === 0 ? (
        <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 40, textAlign: "center", color: C.muted }}>
          {library.length === 0
            ? <>No spec sheets yet. Click <strong>+ Add Spec Sheet</strong> to upload your first PDF.</>
            : <>No spec sheets in the library match this project's devices. <button onClick={() => setLibShowAll(true)} style={{ background: "none", border: "none", color: C.accent, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>View full library</button></>}
        </div>
      ) : CAT_ORDER.filter(cat => tree[cat]).map(catKey => (
        <div key={catKey} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ background: C.navy, padding: "9px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>{CAT_META[catKey]?.icon}</span>
            <span style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>{CAT_META[catKey]?.label}</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
              {Object.values(tree[catKey]).flat().length} model{Object.values(tree[catKey]).flat().length !== 1 ? "s" : ""}
            </span>
          </div>
          {Object.keys(tree[catKey]).sort().map(brand => (
            <div key={brand}>
              <div style={{ background: C.steel, padding: "6px 16px", display: "flex", alignItems: "center" }}>
                <span style={{ color: C.white, fontWeight: 700, fontSize: 12 }}>{brand}</span>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginLeft: 8 }}>
                  {tree[catKey][brand].length} model{tree[catKey][brand].length !== 1 ? "s" : ""}
                </span>
              </div>
              {tree[catKey][brand].map((entry, ei) => {
                const url       = getSpecSheetUrl(entry.file_path);
                const onProject = projectKeys.has(`${entry.brand}|${entry.model}`.toLowerCase());
                return (
                  <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 16px", background: ei % 2 === 0 ? C.white : C.surface, borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: C.navy, fontSize: 13 }}>{entry.display_name || entry.model}</div>
                      <div style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{entry.file_name}</div>
                    </div>
                    {onProject && (
                      <span style={{ background: "#D1FAE5", color: C.success, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, whiteSpace: "nowrap" }}>✓ On this project</span>
                    )}
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        style={{ color: C.accent, fontSize: 12, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>🔗 View PDF</a>
                    )}
                    <button onClick={async () => {
                        if (!confirm(`Delete "${entry.display_name || entry.model}" from library?`)) return;
                        await deleteLibraryEntry(entry.id, entry.file_path);
                        setLibrary(l => l.filter(r => r.id !== entry.id));
                      }}
                      style={{ background: "transparent", color: C.danger, border: `1px solid ${C.danger}`, borderRadius: 5, padding: "3px 8px", fontSize: 11, cursor: "pointer" }}>
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
