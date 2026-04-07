export default function ImportPreviewModal({
  importPreview, setImportPreview, handleProposalImport,
  selectedProject, cameraGroups, switchGroups, serverGroups,
  doorGroups, zoneGroups, speakerGroups,
}) {
  if (!importPreview) return null;

  const CAT_OPTIONS = [
    { value: "camera",  label: "CCTV / Camera" },
    { value: "door",    label: "Access Control" },
    { value: "zone",    label: "Intrusion" },
    { value: "speaker", label: "Audio" },
    { value: "switch",  label: "Network Switch" },
    { value: "server",  label: "Server / NVR" },
    { value: "unknown", label: "Skip this row" },
  ];

  return (
    <div className="fixed inset-0 bg-dark/[0.82] z-[500] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-[780px] w-full max-h-[90vh] flex flex-col shadow-[0_8px_48px_rgba(0,0,0,.45)]">
        {/* Modal header */}
        <div className="bg-navy rounded-t-xl px-5 py-4 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-white font-extrabold text-[15px]">
              {importPreview.isChangeOrder ? "Import Change Order Hardware" : "Import Proposal Hardware"}
              {importPreview.isChangeOrder && <span className="bg-gold text-navy text-[10px] font-extrabold rounded-lg px-2 py-0.5 ml-2">CHANGE ORDER</span>}
            </div>
            <div className="text-accent text-xs mt-0.5">
              Proposal #{importPreview.proposalId}
              {selectedProject?.projectId && importPreview.proposalId !== selectedProject.projectId && (
                <span className="text-warn ml-2">⚠ Proposal ID doesn't match project ID ({selectedProject.projectId})</span>
              )}
              {importPreview.rows.some(r => r.recurring) && (
                <span className="text-gold ml-2">· {importPreview.rows.filter(r => r.recurring).length} recurring MRR item{importPreview.rows.filter(r => r.recurring).length !== 1 ? "s" : ""} (shown separately)</span>
              )}
            </div>
          </div>
          <button onClick={() => setImportPreview(null)} className="bg-white/[0.12] text-white border-none rounded-md p-1 px-2.5 text-[13px] cursor-pointer">✕</button>
        </div>
        {/* Existing data warning */}
        {(cameraGroups.length + switchGroups.length + serverGroups.length + doorGroups.length + zoneGroups.length + speakerGroups.length) > 0 && (
          <div className="bg-[#FEF3C7] border-b border-[#FDE68A] px-5 py-2.5 text-xs text-[#92400E]">
            ⚠ This project already has hardware groups. Imported items will be <strong>added</strong> to the existing groups — nothing will be replaced.
          </div>
        )}
        {/* Parts table */}
        <div className="overflow-y-auto flex-1 pb-1">
          {/* One-time hardware */}
          {importPreview.rows.some(r => !r.recurring) && (
            <>
              {importPreview.rows.some(r => r.recurring) && (
                <div className="bg-navy px-3 py-1.5">
                  <span className="text-accent font-bold text-[11px]">ONE-TIME HARDWARE</span>
                </div>
              )}
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-surface sticky top-0">
                    {["Brand","Model","Description","Qty","Area","Category"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-muted font-bold text-[11px] uppercase tracking-[0.06em] border-b border-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importPreview.rows.map((row, i) => {
                    if (row.recurring) return null;
                    const cat = importPreview.overrideCats[i] || row.category;
                    const isUnknown = cat === "unknown";
                    return (
                      <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-surface'} border-b border-border`}>
                        <td className="px-3 py-[7px] text-navy">{row.brand || <span className="text-muted">—</span>}</td>
                        <td className="px-3 py-[7px] text-navy font-mono text-[11px]">{row.model || <span className="text-muted">—</span>}</td>
                        <td className="px-3 py-[7px] text-muted max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap">{row.label || "—"}</td>
                        <td className="px-3 py-[7px] text-navy font-bold text-center">{row.qty}</td>
                        <td className="px-3 py-[7px] text-muted text-[11px] max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">{row.area || "—"}</td>
                        <td className="px-3 py-[7px]">
                          <select value={cat} onChange={e => setImportPreview(s => ({ ...s, overrideCats: { ...s.overrideCats, [i]: e.target.value } }))}
                            className={`px-2 py-[3px] rounded-[5px] text-[11px] font-bold cursor-pointer ${isUnknown ? 'border border-warn bg-[#FEF3C7] text-[#92400E]' : 'border border-border bg-white text-navy'}`}>
                            {CAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
          {/* Recurring / MRR items (read-only, not imported) */}
          {importPreview.rows.some(r => r.recurring) && (
            <>
              <div className="bg-[#78350F] px-3 py-1.5 flex items-center gap-2">
                <span className="text-gold font-bold text-[11px]">RECURRING / MRR ITEMS</span>
                <span className="text-white/50 text-[10px]">— not imported as hardware, for reference only</span>
              </div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FEF3C7]">
                    {["Brand","Model","Description","Qty","Area"].map(h => (
                      <th key={h} className="px-3 py-[7px] text-left text-[#92400E] font-bold text-[10px] uppercase tracking-[0.06em] border-b border-[#FDE68A]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importPreview.rows.map((row, i) => {
                    if (!row.recurring) return null;
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#FFFBEB" : "#FEF9E7" }} className="border-b border-[#FDE68A]">
                        <td className="px-3 py-1.5 text-[#92400E]">{row.brand || "—"}</td>
                        <td className="px-3 py-1.5 text-[#92400E] font-mono text-[11px]">{row.model || "—"}</td>
                        <td className="px-3 py-1.5 text-[#B45309] max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">{row.label || "—"}</td>
                        <td className="px-3 py-1.5 text-[#92400E] font-bold text-center">{row.qty}</td>
                        <td className="px-3 py-1.5 text-[#B45309] text-[11px]">{row.area || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border flex items-center gap-3 bg-surface rounded-b-xl">
          <div className="flex-1 text-xs text-muted">
            {importPreview.rows.filter((r, i) => !r.recurring && (importPreview.overrideCats[i] || r.category) !== "unknown").length} hardware items will be imported as device groups.
            {importPreview.rows.some(r => r.recurring) && ` · ${importPreview.rows.filter(r => r.recurring).length} recurring MRR items skipped.`}
            {" "}Devices not generated yet — set IP start + hit Generate in each group.
          </div>
          <button onClick={() => setImportPreview(null)} className="bg-transparent text-muted border border-border rounded-[7px] px-[18px] py-2 text-[13px] cursor-pointer">Cancel</button>
          <button onClick={handleProposalImport} className="bg-accent text-white border-none rounded-[7px] px-[22px] py-2 text-[13px] font-extrabold cursor-pointer">
            ⬆ Import Hardware
          </button>
        </div>
      </div>
    </div>
  );
}
