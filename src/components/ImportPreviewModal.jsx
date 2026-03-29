import { C } from "../constants";

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
    <div style={{ position: "fixed", inset: 0, background: "rgba(7,20,42,0.82)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: C.white, borderRadius: 12, maxWidth: 780, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 48px rgba(0,0,0,.45)" }}>
        {/* Modal header */}
        <div style={{ background: C.navy, borderRadius: "12px 12px 0 0", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.white, fontWeight: 800, fontSize: 15 }}>
              {importPreview.isChangeOrder ? "Import Change Order Hardware" : "Import Proposal Hardware"}
              {importPreview.isChangeOrder && <span style={{ background: C.gold, color: C.navy, fontSize: 10, fontWeight: 800, borderRadius: 8, padding: "2px 8px", marginLeft: 8 }}>CHANGE ORDER</span>}
            </div>
            <div style={{ color: C.accent, fontSize: 12, marginTop: 2 }}>
              Proposal #{importPreview.proposalId}
              {selectedProject?.projectId && importPreview.proposalId !== selectedProject.projectId && (
                <span style={{ color: C.warn, marginLeft: 8 }}>⚠ Proposal ID doesn't match project ID ({selectedProject.projectId})</span>
              )}
              {importPreview.rows.some(r => r.recurring) && (
                <span style={{ color: C.gold, marginLeft: 8 }}>· {importPreview.rows.filter(r => r.recurring).length} recurring MRR item{importPreview.rows.filter(r => r.recurring).length !== 1 ? "s" : ""} (shown separately)</span>
              )}
            </div>
          </div>
          <button onClick={() => setImportPreview(null)} style={{ background: "rgba(255,255,255,0.12)", color: C.white, border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 13, cursor: "pointer" }}>✕</button>
        </div>
        {/* Existing data warning */}
        {(cameraGroups.length + switchGroups.length + serverGroups.length + doorGroups.length + zoneGroups.length + speakerGroups.length) > 0 && (
          <div style={{ background: "#FEF3C7", borderBottom: `1px solid #FDE68A`, padding: "10px 20px", fontSize: 12, color: "#92400E" }}>
            ⚠ This project already has hardware groups. Imported items will be <strong>added</strong> to the existing groups — nothing will be replaced.
          </div>
        )}
        {/* Parts table */}
        <div style={{ overflowY: "auto", flex: 1, padding: "0 0 4px" }}>
          {/* One-time hardware */}
          {importPreview.rows.some(r => !r.recurring) && (
            <>
              {importPreview.rows.some(r => r.recurring) && (
                <div style={{ background: C.navy, padding: "6px 12px" }}>
                  <span style={{ color: C.accent, fontWeight: 700, fontSize: 11 }}>ONE-TIME HARDWARE</span>
                </div>
              )}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.surface, position: "sticky", top: 0 }}>
                    {["Brand","Model","Description","Qty","Area","Category"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importPreview.rows.map((row, i) => {
                    if (row.recurring) return null;
                    const cat = importPreview.overrideCats[i] || row.category;
                    const isUnknown = cat === "unknown";
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? C.white : C.surface, borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "7px 12px", color: C.navy }}>{row.brand || <span style={{ color: C.muted }}>—</span>}</td>
                        <td style={{ padding: "7px 12px", color: C.navy, fontFamily: "monospace", fontSize: 11 }}>{row.model || <span style={{ color: C.muted }}>—</span>}</td>
                        <td style={{ padding: "7px 12px", color: C.muted, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label || "—"}</td>
                        <td style={{ padding: "7px 12px", color: C.navy, fontWeight: 700, textAlign: "center" }}>{row.qty}</td>
                        <td style={{ padding: "7px 12px", color: C.muted, fontSize: 11, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.area || "—"}</td>
                        <td style={{ padding: "7px 12px" }}>
                          <select value={cat} onChange={e => setImportPreview(s => ({ ...s, overrideCats: { ...s.overrideCats, [i]: e.target.value } }))}
                            style={{ padding: "3px 8px", borderRadius: 5, border: `1px solid ${isUnknown ? C.warn : C.border}`, background: isUnknown ? "#FEF3C7" : C.white, color: isUnknown ? "#92400E" : C.navy, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
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
              <div style={{ background: "#78350F", padding: "6px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: C.gold, fontWeight: 700, fontSize: 11 }}>RECURRING / MRR ITEMS</span>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>— not imported as hardware, for reference only</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#FEF3C7" }}>
                    {["Brand","Model","Description","Qty","Area"].map(h => (
                      <th key={h} style={{ padding: "7px 12px", textAlign: "left", color: "#92400E", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid #FDE68A` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importPreview.rows.map((row, i) => {
                    if (!row.recurring) return null;
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#FFFBEB" : "#FEF9E7", borderBottom: `1px solid #FDE68A` }}>
                        <td style={{ padding: "6px 12px", color: "#92400E" }}>{row.brand || "—"}</td>
                        <td style={{ padding: "6px 12px", color: "#92400E", fontFamily: "monospace", fontSize: 11 }}>{row.model || "—"}</td>
                        <td style={{ padding: "6px 12px", color: "#B45309", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label || "—"}</td>
                        <td style={{ padding: "6px 12px", color: "#92400E", fontWeight: 700, textAlign: "center" }}>{row.qty}</td>
                        <td style={{ padding: "6px 12px", color: "#B45309", fontSize: 11 }}>{row.area || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, background: C.surface, borderRadius: "0 0 12px 12px" }}>
          <div style={{ flex: 1, fontSize: 12, color: C.muted }}>
            {importPreview.rows.filter((r, i) => !r.recurring && (importPreview.overrideCats[i] || r.category) !== "unknown").length} hardware items will be imported as device groups.
            {importPreview.rows.some(r => r.recurring) && ` · ${importPreview.rows.filter(r => r.recurring).length} recurring MRR items skipped.`}
            {" "}Devices not generated yet — set IP start + hit Generate in each group.
          </div>
          <button onClick={() => setImportPreview(null)} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 18px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleProposalImport} style={{ background: C.accent, color: C.white, border: "none", borderRadius: 7, padding: "8px 22px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
            ⬆ Import Hardware
          </button>
        </div>
      </div>
    </div>
  );
}
