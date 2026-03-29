import { C } from "../constants";
import { uploadProjectFile, listProjectFiles, deleteProjectFile, getProjectFileUrl } from "../supabase";

const FILE_CATS = ["Drawings", "Quotes", "Contracts", "Notes", "Photos", "Other"];
const catIcon = { Drawings: "📐", Quotes: "💰", Contracts: "📝", Notes: "🗒", Photos: "🖼", Other: "📎" };
const fmtSize = b => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : b > 1024 ? `${(b/1024).toFixed(0)} KB` : `${b} B`;

export default function FilesTab({
  selectedProject,
  projectFiles, setProjectFiles,
  filesLoading,
  fileUploadCat, setFileUploadCat,
  fileInputRef,
  showToast,
}) {
  const grouped = FILE_CATS.reduce((acc, cat) => ({ ...acc, [cat]: projectFiles.filter(f => f.category === cat) }), {});

  return (
    <div>
      {/* Upload bar */}
      <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>📁 Upload File</span>
        <select value={fileUploadCat} onChange={e => setFileUploadCat(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, color: C.navy, background: C.white }}>
          {FILE_CATS.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={() => fileInputRef.current?.click()}
          style={{ background: C.accent, color: C.white, border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          + Choose File
        </button>
        <input ref={fileInputRef} type="file" style={{ display: "none" }}
          onChange={async e => {
            const file = e.target.files?.[0];
            if (!file || !selectedProject) return;
            e.target.value = "";
            try {
              await uploadProjectFile(selectedProject.id, fileUploadCat, file);
              const rows = await listProjectFiles(selectedProject.id);
              setProjectFiles(rows);
              showToast(`✓ ${file.name} uploaded to ${fileUploadCat}`);
            } catch(err) { showToast(`Upload failed: ${err.message}`); }
          }} />
        <span style={{ color: C.muted, fontSize: 11 }}>Drawings · Quotes · Contracts · Notes · Photos · Portal.io CSVs</span>
      </div>

      {filesLoading ? (
        <div style={{ textAlign: "center", color: C.muted, padding: 40 }}>Loading files…</div>
      ) : projectFiles.length === 0 ? (
        <div style={{ textAlign: "center", color: C.muted, padding: 40, fontSize: 13 }}>
          No files yet. Upload drawings, quotes, contracts, or notes for this project.
        </div>
      ) : (
        FILE_CATS.map(cat => {
          const files = grouped[cat];
          if (!files.length) return null;
          return (
            <div key={cat} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ background: C.surface, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 15 }}>{catIcon[cat]}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>{cat}</span>
                <span style={{ background: C.accent, color: C.white, borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>{files.length}</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.surface }}>
                    <th style={{ padding: "6px 14px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 700 }}>File Name</th>
                    <th style={{ padding: "6px 14px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 700, width: 80 }}>Size</th>
                    <th style={{ padding: "6px 14px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 700, width: 110 }}>Uploaded</th>
                    <th style={{ padding: "6px 14px", textAlign: "right", color: C.muted, fontSize: 11, fontWeight: 700, width: 110 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f, i) => (
                    <tr key={f.id} style={{ background: i % 2 === 0 ? C.white : C.surface, borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "8px 14px", color: C.navy, fontWeight: 600 }}>{f.file_name}</td>
                      <td style={{ padding: "8px 14px", color: C.muted }}>{f.file_size ? fmtSize(f.file_size) : "—"}</td>
                      <td style={{ padding: "8px 14px", color: C.muted }}>{new Date(f.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: "8px 14px", textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <a href={getProjectFileUrl(f.file_path)} target="_blank" rel="noopener noreferrer"
                          style={{ background: C.accent, color: C.white, borderRadius: 5, padding: "3px 10px", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                          Open
                        </a>
                        <button onClick={async () => {
                            if (!confirm(`Delete "${f.file_name}"?`)) return;
                            try {
                              await deleteProjectFile(f.id, f.file_path);
                              setProjectFiles(p => p.filter(x => x.id !== f.id));
                              showToast("File deleted");
                            } catch(err) { showToast(`Delete failed: ${err.message}`); }
                          }}
                          style={{ background: "#FEE2E2", color: C.danger, border: "none", borderRadius: 5, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </div>
  );
}
