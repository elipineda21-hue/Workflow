import { useRef } from "react";
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
        <div className="fixed inset-0 bg-dark/[0.78] z-[600] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-[480px] w-full shadow-[0_8px_48px_rgba(0,0,0,.4)]">
            <div className="bg-navy rounded-t-xl py-3.5 px-4 flex items-center">
              <span className="text-white font-extrabold text-sm flex-1">Add to Device Library</span>
              <button onClick={() => setLibUploadForm(null)} className="bg-white/[0.12] text-white border-none rounded-[5px] py-[3px] px-[9px] cursor-pointer">✕</button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              {[
                ["Category", "category", "select", CAT_ORDER],
                ["Brand",    "brand",     "text"],
                ["Model #",  "model",     "text"],
                ["Display Name (optional)", "displayName", "text"],
              ].map(([lbl, key, type, opts]) => (
                <div key={key}>
                  <label className="text-muted text-[11px] font-bold uppercase tracking-wide block mb-1">{lbl}</label>
                  {type === "select" ? (
                    <select value={libUploadForm[key] || ""} onChange={e => setLibUploadForm(s => ({ ...s, [key]: e.target.value }))}
                      className="w-full p-2 px-2.5 rounded-md border border-border text-[13px] text-navy">
                      <option value="">— select —</option>
                      {opts.map(v => <option key={v} value={v}>{CAT_META[v]?.label || v}</option>)}
                    </select>
                  ) : (
                    <input value={libUploadForm[key] || ""} onChange={e => setLibUploadForm(s => ({ ...s, [key]: e.target.value }))}
                      className="w-full p-2 px-2.5 rounded-md border border-border text-[13px] text-navy box-border" />
                  )}
                </div>
              ))}
              <div>
                <label className="text-muted text-[11px] font-bold uppercase tracking-wide block mb-1">Spec Sheet PDF</label>
                <input ref={libUploadFileRef} type="file" accept=".pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setLibUploadForm(s => ({ ...s, file: f })); e.target.value = ""; }} />
                <div className="flex items-center gap-2.5">
                  <button onClick={() => libUploadFileRef.current?.click()}
                    className="bg-bg text-steel border border-border rounded-md py-[7px] px-3.5 text-xs font-semibold cursor-pointer">
                    ⬆ Choose PDF
                  </button>
                  {libUploadForm.file
                    ? <span className="text-success text-xs font-semibold">✓ {libUploadForm.file.name}</span>
                    : <span className="text-muted text-xs">No file chosen</span>}
                </div>
              </div>
              {libUploadForm.error && <div className="text-danger text-xs">{libUploadForm.error}</div>}
            </div>
            <div className="py-3 px-5 border-t border-border flex gap-2.5 justify-end">
              <button onClick={() => setLibUploadForm(null)} className="bg-transparent text-muted border border-border rounded-md py-2 px-4 text-[13px] cursor-pointer">Cancel</button>
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
                className="bg-accent text-white border-none rounded-md py-2 px-5 text-[13px] font-extrabold cursor-pointer"
                style={{ opacity: (libUploadForm.uploading || !libUploadForm.category || !libUploadForm.brand || !libUploadForm.model || !libUploadForm.file) ? 0.5 : 1 }}>
                {libUploadForm.uploading ? "Uploading…" : "Save to Library"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <div className="font-extrabold text-navy text-base">📚 Device Library</div>
          <div className="text-muted text-xs mt-0.5">
            {hasProjectDevices && !libShowAll
              ? `${matchCount} spec sheet${matchCount !== 1 ? "s" : ""} matched to this project · ${library.length} total in library`
              : `${library.length} spec sheet${library.length !== 1 ? "s" : ""} stored · shared across all projects`}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {hasProjectDevices && (
            <button onClick={() => setLibShowAll(v => !v)}
              className={`border border-border rounded-[7px] py-[7px] px-3.5 text-xs font-bold cursor-pointer ${libShowAll ? "bg-bg text-muted" : "bg-surface text-accent"}`}>
              {libShowAll ? "Show project only" : `Show all ${library.length}`}
            </button>
          )}
          <button onClick={() => setLibUploadForm({ category: "", brand: "", model: "", displayName: "", file: null, uploading: false, error: null })}
            className="bg-accent text-white border-none rounded-[7px] py-[9px] px-4 text-[13px] font-extrabold cursor-pointer">
            + Add Spec Sheet
          </button>
        </div>
      </div>

      {/* Library tree */}
      {libraryLoading ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center text-muted">Loading library…</div>
      ) : visibleRows.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center text-muted">
          {library.length === 0
            ? <>No spec sheets yet. Click <strong>+ Add Spec Sheet</strong> to upload your first PDF.</>
            : <>No spec sheets in the library match this project's devices. <button onClick={() => setLibShowAll(true)} className="bg-transparent border-none text-accent font-bold cursor-pointer text-[13px]">View full library</button></>}
        </div>
      ) : CAT_ORDER.filter(cat => tree[cat]).map(catKey => (
        <div key={catKey} className="bg-white rounded-xl border border-border mb-3 overflow-hidden">
          <div className="bg-navy py-[9px] px-4 flex items-center gap-2">
            <span className="text-base">{CAT_META[catKey]?.icon}</span>
            <span className="text-white font-bold text-[13px]">{CAT_META[catKey]?.label}</span>
            <span className="text-white/40 text-[11px]">
              {Object.values(tree[catKey]).flat().length} model{Object.values(tree[catKey]).flat().length !== 1 ? "s" : ""}
            </span>
          </div>
          {Object.keys(tree[catKey]).sort().map(brand => (
            <div key={brand}>
              <div className="bg-steel py-1.5 px-4 flex items-center">
                <span className="text-white font-bold text-xs">{brand}</span>
                <span className="text-white/40 text-[11px] ml-2">
                  {tree[catKey][brand].length} model{tree[catKey][brand].length !== 1 ? "s" : ""}
                </span>
              </div>
              {tree[catKey][brand].map((entry, ei) => {
                const url       = getSpecSheetUrl(entry.file_path);
                const onProject = projectKeys.has(`${entry.brand}|${entry.model}`.toLowerCase());
                return (
                  <div key={entry.id} className={`flex items-center gap-3 py-[9px] px-4 border-b border-border ${ei % 2 === 0 ? "bg-white" : "bg-surface"}`}>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-navy text-[13px]">{entry.display_name || entry.model}</div>
                      <div className="text-muted text-[11px] mt-px">{entry.file_name}</div>
                    </div>
                    {onProject && (
                      <span className="bg-[#D1FAE5] text-success text-[10px] font-bold py-0.5 px-2 rounded-xl whitespace-nowrap">✓ On this project</span>
                    )}
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        className="text-accent text-xs font-semibold no-underline whitespace-nowrap">🔗 View PDF</a>
                    )}
                    <button onClick={async () => {
                        if (!confirm(`Delete "${entry.display_name || entry.model}" from library?`)) return;
                        await deleteLibraryEntry(entry.id, entry.file_path);
                        setLibrary(l => l.filter(r => r.id !== entry.id));
                      }}
                      className="bg-transparent text-danger border border-danger rounded-[5px] py-[3px] px-2 text-[11px] cursor-pointer">
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
