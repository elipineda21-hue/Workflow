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
      <div className="bg-white rounded-xl border border-border p-4 mb-4 flex gap-2.5 items-center flex-wrap">
        <span className="font-bold text-[13px] text-navy">📁 Upload File</span>
        <select value={fileUploadCat} onChange={e => setFileUploadCat(e.target.value)}
          className="py-1.5 px-2.5 rounded-md border border-border text-xs text-navy bg-white">
          {FILE_CATS.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={() => fileInputRef.current?.click()}
          className="bg-accent text-white border-none rounded-md py-[7px] px-4 text-xs font-bold cursor-pointer">
          + Choose File
        </button>
        <input ref={fileInputRef} type="file" className="hidden"
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
        <span className="text-muted text-[11px]">Drawings · Quotes · Contracts · Notes · Photos · Portal.io CSVs</span>
      </div>

      {filesLoading ? (
        <div className="text-center text-muted p-10">Loading files…</div>
      ) : projectFiles.length === 0 ? (
        <div className="text-center text-muted p-10 text-[13px]">
          No files yet. Upload drawings, quotes, contracts, or notes for this project.
        </div>
      ) : (
        FILE_CATS.map(cat => {
          const files = grouped[cat];
          if (!files.length) return null;
          return (
            <div key={cat} className="bg-white rounded-xl border border-border overflow-hidden mb-3.5">
              <div className="bg-surface py-2.5 px-4 flex items-center gap-2 border-b border-border">
                <span className="text-[15px]">{catIcon[cat]}</span>
                <span className="font-bold text-[13px] text-navy">{cat}</span>
                <span className="bg-accent text-white rounded-xl py-px px-2 text-[10px] font-bold">{files.length}</span>
              </div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-surface">
                    <th className="py-1.5 px-3.5 text-left text-muted text-[11px] font-bold">File Name</th>
                    <th className="py-1.5 px-3.5 text-left text-muted text-[11px] font-bold w-[80px]">Size</th>
                    <th className="py-1.5 px-3.5 text-left text-muted text-[11px] font-bold w-[110px]">Uploaded</th>
                    <th className="py-1.5 px-3.5 text-right text-muted text-[11px] font-bold w-[110px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f, i) => (
                    <tr key={f.id} className={`border-b border-border ${i % 2 === 0 ? "bg-white" : "bg-surface"}`}>
                      <td className="py-2 px-3.5 text-navy font-semibold">{f.file_name}</td>
                      <td className="py-2 px-3.5 text-muted">{f.file_size ? fmtSize(f.file_size) : "—"}</td>
                      <td className="py-2 px-3.5 text-muted">{new Date(f.created_at).toLocaleDateString()}</td>
                      <td className="py-2 px-3.5 text-right flex gap-1.5 justify-end">
                        <a href={getProjectFileUrl(f.file_path)} target="_blank" rel="noopener noreferrer"
                          className="bg-accent text-white rounded-[5px] py-[3px] px-2.5 text-[11px] font-bold no-underline">
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
                          className="bg-[#FEE2E2] text-danger border-none rounded-[5px] py-[3px] px-2.5 text-[11px] font-bold cursor-pointer">
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
