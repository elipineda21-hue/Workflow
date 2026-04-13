import { useEffect, useRef, useState } from "react";
import { uploadSpecSheet, listLibrary, deleteLibraryEntry, getSpecSheetUrl, catalogDevice, listCatalog, deleteCatalogEntry } from "../supabase";

const CAT_META = {
  camera:  { label: "CCTV / Cameras" },
  door:    { label: "Access Control" },
  zone:    { label: "Intrusion" },
  speaker: { label: "Audio" },
  switch:  { label: "Network Switching" },
  server:  { label: "Server / NVR" },
};
const CAT_ORDER = ["camera","door","zone","speaker","switch","server"];

function mergeLibraryAndCatalog(library, catalog) {
  const map = new Map();

  for (const lib of library) {
    const key = `${lib.brand}|${lib.model}`.toLowerCase();
    map.set(key, {
      id: lib.id,
      libraryId: lib.id,
      catalogId: null,
      category: lib.category,
      brand: lib.brand,
      model: lib.model,
      display_name: lib.display_name || lib.model,
      file_path: lib.file_path,
      file_name: lib.file_name,
      seen_count: null,
      source: "library",
    });
  }

  for (const cat of catalog) {
    const key = `${cat.brand}|${cat.model}`.toLowerCase();
    if (map.has(key)) {
      const existing = map.get(key);
      existing.catalogId = cat.id;
      existing.seen_count = cat.seen_count || 1;
      existing.source = "both";
      if (!existing.category || existing.category === "unknown") {
        existing.category = cat.category;
      }
    } else {
      map.set(key, {
        id: `cat-${cat.id}`,
        libraryId: null,
        catalogId: cat.id,
        category: cat.category,
        brand: cat.brand,
        model: cat.model,
        display_name: cat.display_name || cat.model,
        file_path: null,
        file_name: null,
        seen_count: cat.seen_count || 1,
        source: "catalog",
      });
    }
  }

  const arr = Array.from(map.values());
  arr.sort((a, b) => {
    const ci = CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category);
    if (ci !== 0) return ci;
    const bi = a.brand.localeCompare(b.brand);
    if (bi !== 0) return bi;
    return a.model.localeCompare(b.model);
  });
  return arr;
}

export default function LibraryTab({
  library, setLibrary, libraryLoading,
  libUploadForm, setLibUploadForm,
  libShowAll, setLibShowAll,
  cameraGroups, doorGroups, zoneGroups, speakerGroups, switchGroups, serverGroups,
}) {
  const libUploadFileRef = useRef(null);
  const bulkFileRef = useRef(null);
  const inlineFileRef = useRef(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState({ category: "", brand: "", model: "", displayName: "" });
  const [newFile, setNewFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingFor, setUploadingFor] = useState(null); // entry ID being uploaded to
  const uploadForRef = useRef(null);
  const uploadForEntryRef = useRef(null); // stores the entry object for the upload callback

  // Load catalog on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await listCatalog();
        setCatalog(data);
      } catch {}
      setCatalogLoaded(true);
    })();
  }, []);

  const reloadAll = async () => {
    try {
      const [lib, cat] = await Promise.all([listLibrary(), listCatalog()]);
      setLibrary(lib);
      setCatalog(cat);
    } catch {}
  };

  const handleBulkUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setBulkUploading(true);
    setBulkStatus(`Uploading 0 / ${files.length}...`);
    let success = 0, failed = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setBulkStatus(`Uploading ${i + 1} / ${files.length}: ${file.name}`);
      const name = file.name.replace(/\.pdf$/i, "");
      const parts = name.split(/[_\-\u2013\u2014\s]+/);
      const brand = parts[0] || "Unknown";
      const model = parts.slice(1).join("-") || name;
      try {
        await uploadSpecSheet({ category: "camera", brand: brand.trim(), model: model.trim(), displayName: model.trim(), file });
        success++;
      } catch (err) {
        console.warn(`Failed to upload ${file.name}:`, err);
        failed++;
      }
    }
    setBulkStatus(`Done: ${success} uploaded${failed ? `, ${failed} failed` : ""}`);
    setBulkUploading(false);
    await reloadAll();
    setTimeout(() => setBulkStatus(""), 5000);
  };

  const handleUploadForEntry = async (entry, file) => {
    if (!file) return;
    setUploadingFor(entry.id);
    try {
      await uploadSpecSheet({
        category: entry.category,
        brand: entry.brand,
        model: entry.model,
        displayName: entry.display_name || entry.model,
        file,
      });
      await reloadAll();
    } catch (err) {
      alert("Upload failed: " + (err.message || "Unknown error"));
    }
    setUploadingFor(null);
  };

  const handleDelete = async (entry) => {
    const label = `${entry.brand} ${entry.model}`;
    if (!confirm(`Delete "${label}" from the device library?`)) return;
    try {
      if (entry.libraryId && entry.file_path) {
        await deleteLibraryEntry(entry.libraryId, entry.file_path);
      }
      if (entry.catalogId) {
        await deleteCatalogEntry(entry.catalogId);
      }
      // Optimistic update
      if (entry.libraryId) setLibrary(l => l.filter(r => r.id !== entry.libraryId));
      setCatalog(c => c.filter(r => r.id !== entry.catalogId));
    } catch (err) {
      alert("Delete failed: " + (err.message || "Unknown error"));
    }
  };

  const handleSaveEdit = async (entry) => {
    setSaving(true);
    try {
      // If it has a library entry, we need to re-upload with updated metadata
      // For now, update catalog entry and/or create one
      if (entry.catalogId) {
        // Update catalog by deleting and re-inserting
        await deleteCatalogEntry(entry.catalogId);
      }
      await catalogDevice(editForm.category, editForm.brand.trim(), editForm.model.trim());
      await reloadAll();
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      alert("Save failed: " + (err.message || "Unknown error"));
    }
    setSaving(false);
  };

  const handleAddNew = async () => {
    if (!newForm.category || !newForm.brand || !newForm.model) return;
    setSaving(true);
    try {
      if (newFile) {
        await uploadSpecSheet({
          category: newForm.category,
          brand: newForm.brand.trim(),
          model: newForm.model.trim(),
          displayName: newForm.displayName?.trim() || newForm.model.trim(),
          file: newFile,
        });
      } else {
        await catalogDevice(newForm.category, newForm.brand.trim(), newForm.model.trim());
      }
      await reloadAll();
      setAddingNew(false);
      setNewForm({ category: "", brand: "", model: "", displayName: "" });
      setNewFile(null);
    } catch (err) {
      alert("Add failed: " + (err.message || "Unknown error"));
    }
    setSaving(false);
  };

  // Build combined data
  const combined = mergeLibraryAndCatalog(library, catalog);

  const projectKeys = new Set(
    [...cameraGroups,...doorGroups,...zoneGroups,...speakerGroups,...switchGroups,...serverGroups]
      .map(g => `${g.brand}|${g.model}`.toLowerCase())
      .filter(k => k !== "|")
  );
  const hasProjectDevices = projectKeys.size > 0;
  const matchedRows = combined.filter(e => projectKeys.has(`${e.brand}|${e.model}`.toLowerCase()));
  const matchCount = matchedRows.length;
  const visibleRows = (hasProjectDevices && !libShowAll) ? matchedRows : combined;

  const loading = libraryLoading || !catalogLoaded;

  return (
    <div>
      {/* Upload form modal */}
      {libUploadForm && (
        <div className="fixed inset-0 bg-dark/[0.78] z-[600] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-[480px] w-full shadow-[0_8px_48px_rgba(0,0,0,.4)]">
            <div className="bg-navy rounded-t-xl py-3.5 px-4 flex items-center">
              <span className="text-white font-extrabold text-sm flex-1">Add to Device Library</span>
              <button onClick={() => setLibUploadForm(null)} className="bg-white/[0.12] text-white border-none rounded-[5px] py-[3px] px-[9px] cursor-pointer">X</button>
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
                      <option value="">-- select --</option>
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
                    Choose PDF
                  </button>
                  {libUploadForm.file
                    ? <span className="text-success text-xs font-semibold">{libUploadForm.file.name}</span>
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
                    await reloadAll();
                    setLibUploadForm(null);
                  } catch (err) {
                    setLibUploadForm(s => ({ ...s, uploading: false, error: err.message || "Upload failed" }));
                  }
                }}
                className="bg-accent text-white border-none rounded-md py-2 px-5 text-[13px] font-extrabold cursor-pointer"
                style={{ opacity: (libUploadForm.uploading || !libUploadForm.category || !libUploadForm.brand || !libUploadForm.model || !libUploadForm.file) ? 0.5 : 1 }}>
                {libUploadForm.uploading ? "Uploading..." : "Save to Library"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for inline PDF upload */}
      <input ref={uploadForRef} type="file" accept=".pdf" className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          const entry = uploadForEntryRef.current;
          if (f && entry) handleUploadForEntry(entry, f);
          uploadForEntryRef.current = null;
          e.target.value = "";
        }} />

      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <div className="font-extrabold text-navy text-base">Device Library</div>
          <div className="text-muted text-xs mt-0.5">
            {hasProjectDevices && !libShowAll
              ? `${matchCount} device${matchCount !== 1 ? "s" : ""} matched to this project -- ${combined.length} total in library`
              : `${combined.length} device${combined.length !== 1 ? "s" : ""} stored -- shared across all projects`}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {hasProjectDevices && (
            <button onClick={() => setLibShowAll(v => !v)}
              className={`border border-border rounded-[7px] py-[7px] px-3.5 text-xs font-bold cursor-pointer ${libShowAll ? "bg-bg text-muted" : "bg-surface text-accent"}`}>
              {libShowAll ? "Show project only" : `Show all ${combined.length}`}
            </button>
          )}
          <input ref={bulkFileRef} type="file" accept=".pdf" multiple className="hidden" onChange={handleBulkUpload} />
          <button onClick={() => bulkFileRef.current?.click()} disabled={bulkUploading}
            className="bg-steel text-white border-none rounded-lg py-2 px-3.5 text-[11px] font-semibold cursor-pointer">
            {bulkUploading ? "Uploading..." : "Bulk Upload PDFs"}
          </button>
          <button onClick={() => setAddingNew(true)}
            className="bg-accent text-white border-none rounded-lg py-2 px-4 text-[13px] font-bold cursor-pointer">
            + Add Device
          </button>
        </div>
      </div>

      {/* Bulk upload status */}
      {bulkStatus && (
        <div className={`rounded-lg px-4 py-2.5 mb-4 text-xs font-semibold ${bulkUploading ? "bg-accent/10 text-accent" : "bg-success/10 text-success"}`}>
          {bulkStatus}
        </div>
      )}

      {/* Main table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center text-muted">Loading device library...</div>
      ) : visibleRows.length === 0 && !addingNew ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center text-muted">
          {combined.length === 0
            ? <>No devices yet. Click <strong>+ Add Device</strong> to add your first device.</>
            : <>No devices match this project. <button onClick={() => setLibShowAll(true)} className="bg-transparent border-none text-accent font-bold cursor-pointer text-[13px]">View full library</button></>}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-navy">
                {["Category", "Brand", "Model", "Display Name", "Spec Sheet", "Seen", "Actions"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-white/80 font-semibold text-[10px] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Add new row */}
              {addingNew && (
                <tr className="bg-accent/5 border-b border-border">
                  <td className="px-3 py-2">
                    <select value={newForm.category} onChange={e => setNewForm(s => ({ ...s, category: e.target.value }))}
                      className="w-full py-1.5 px-2 rounded-md border border-accent/40 text-[11px] text-navy bg-white">
                      <option value="">Select...</option>
                      {CAT_ORDER.map(c => <option key={c} value={c}>{CAT_META[c]?.label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input value={newForm.brand} onChange={e => setNewForm(s => ({ ...s, brand: e.target.value }))}
                      placeholder="Brand" className="w-full py-1.5 px-2 rounded-md border border-accent/40 text-[11px] text-navy bg-white" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={newForm.model} onChange={e => setNewForm(s => ({ ...s, model: e.target.value }))}
                      placeholder="Model #" className="w-full py-1.5 px-2 rounded-md border border-accent/40 text-[11px] text-navy bg-white" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={newForm.displayName} onChange={e => setNewForm(s => ({ ...s, displayName: e.target.value }))}
                      placeholder="(optional)" className="w-full py-1.5 px-2 rounded-md border border-accent/40 text-[11px] text-navy bg-white" />
                  </td>
                  <td className="px-3 py-2">
                    <input ref={inlineFileRef} type="file" accept=".pdf" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) setNewFile(f); e.target.value = ""; }} />
                    <button onClick={() => inlineFileRef.current?.click()}
                      className="bg-bg text-steel border border-border rounded-md py-1 px-2 text-[10px] font-semibold cursor-pointer">
                      {newFile ? newFile.name : "Choose PDF"}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-muted text-[11px]">--</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      <button
                        disabled={saving || !newForm.category || !newForm.brand || !newForm.model}
                        onClick={handleAddNew}
                        className="bg-success text-white border-none rounded-md py-1 px-2.5 text-[10px] font-bold cursor-pointer"
                        style={{ opacity: (saving || !newForm.category || !newForm.brand || !newForm.model) ? 0.5 : 1 }}>
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button onClick={() => { setAddingNew(false); setNewForm({ category: "", brand: "", model: "", displayName: "" }); setNewFile(null); }}
                        className="bg-transparent text-muted border border-border rounded-md py-1 px-2.5 text-[10px] cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {visibleRows.map((entry, i) => {
                const isEditing = editingId === entry.id;
                const onProject = projectKeys.has(`${entry.brand}|${entry.model}`.toLowerCase());
                const hasPdf = !!entry.file_path;
                const pdfUrl = hasPdf ? getSpecSheetUrl(entry.file_path) : null;
                const isUploading = uploadingFor === entry.id;

                return (
                  <tr key={entry.id} className={`border-b border-border ${i % 2 === 0 ? "bg-white" : "bg-surface"} ${onProject ? "ring-1 ring-inset ring-success/20" : ""}`}>
                    {/* Category */}
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <select value={editForm.category || ""} onChange={e => setEditForm(s => ({ ...s, category: e.target.value }))}
                          className="w-full py-1 px-1.5 rounded border border-accent/40 text-[11px] text-navy bg-white">
                          {CAT_ORDER.map(c => <option key={c} value={c}>{CAT_META[c]?.label}</option>)}
                        </select>
                      ) : (
                        <span className="text-muted text-[11px]">{CAT_META[entry.category]?.label || entry.category}</span>
                      )}
                    </td>

                    {/* Brand */}
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input value={editForm.brand || ""} onChange={e => setEditForm(s => ({ ...s, brand: e.target.value }))}
                          className="w-full py-1 px-1.5 rounded border border-accent/40 text-[11px] text-navy bg-white" />
                      ) : (
                        <span className="text-navy font-semibold text-[12px]">{entry.brand}</span>
                      )}
                    </td>

                    {/* Model */}
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input value={editForm.model || ""} onChange={e => setEditForm(s => ({ ...s, model: e.target.value }))}
                          className="w-full py-1 px-1.5 rounded border border-accent/40 text-[11px] text-navy font-mono bg-white" />
                      ) : (
                        <span className="text-navy font-mono text-[11px]">{entry.model}</span>
                      )}
                    </td>

                    {/* Display Name */}
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input value={editForm.displayName || ""} onChange={e => setEditForm(s => ({ ...s, displayName: e.target.value }))}
                          className="w-full py-1 px-1.5 rounded border border-accent/40 text-[11px] text-navy bg-white" />
                      ) : (
                        <span className="text-navy text-[12px]">
                          {entry.display_name || entry.model}
                          {onProject && (
                            <span className="ml-1.5 bg-success/10 text-success text-[9px] font-bold py-0.5 px-1.5 rounded-xl whitespace-nowrap align-middle">
                              In project
                            </span>
                          )}
                        </span>
                      )}
                    </td>

                    {/* Spec Sheet */}
                    <td className="px-3 py-2">
                      {hasPdf && pdfUrl ? (
                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                          className="text-accent text-[11px] font-semibold no-underline hover:underline">
                          View PDF
                        </a>
                      ) : isUploading ? (
                        <span className="text-accent text-[10px] font-semibold">Uploading...</span>
                      ) : (
                        <button onClick={() => {
                            uploadForEntryRef.current = entry;
                            setUploadingFor(entry.id);
                            uploadForRef.current?.click();
                          }}
                          className="bg-accent/10 text-accent border-none rounded-md py-1 px-2 text-[10px] font-semibold cursor-pointer hover:bg-accent/20">
                          Upload PDF
                        </button>
                      )}
                    </td>

                    {/* Seen count */}
                    <td className="px-3 py-2 text-muted text-[11px]">
                      {entry.seen_count ? `${entry.seen_count}x` : "--"}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <div className="flex gap-1.5">
                          <button
                            disabled={saving}
                            onClick={() => handleSaveEdit(entry)}
                            className="bg-success text-white border-none rounded-md py-1 px-2.5 text-[10px] font-bold cursor-pointer"
                            style={{ opacity: saving ? 0.5 : 1 }}>
                            {saving ? "..." : "Save"}
                          </button>
                          <button onClick={() => { setEditingId(null); setEditForm({}); }}
                            className="bg-transparent text-muted border border-border rounded-md py-1 px-2.5 text-[10px] cursor-pointer">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              setEditingId(entry.id);
                              setEditForm({
                                category: entry.category,
                                brand: entry.brand,
                                model: entry.model,
                                displayName: entry.display_name || entry.model,
                              });
                            }}
                            className="bg-transparent text-steel border border-border rounded-md py-1 px-2 text-[10px] cursor-pointer hover:bg-surface"
                            title="Edit">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(entry)}
                            className="bg-transparent text-danger border border-danger/40 rounded-md py-1 px-2 text-[10px] cursor-pointer hover:bg-danger/5"
                            title="Delete">
                            Del
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
