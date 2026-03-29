import { C } from "../constants";
import { CardHead } from "../components/ui";
import { getSpecSheetUrl } from "../supabase";

export default function ExportTab({
  cameraGroups, switchGroups, serverGroups, doorGroups, zoneGroups, speakerGroups,
  camCount, swCount, srvCount, doorCount, zoneCount, spkCount, totalDevices,
  generating, sdkReady, pdfLibReady,
  handleCSV, handleGenerate, buildOEMManual,
  importFileRef,
  coverPageFile, setCoverPageFile, coverFileRef,
  library,
  importPreview, setImportPreview,
  handleProposalImport,
  selectedProject,
}) {
  const projectKeys = new Set(
    [...cameraGroups,...doorGroups,...zoneGroups,...speakerGroups,...switchGroups,...serverGroups]
      .map(g => `${g.brand}|${g.model}`.toLowerCase())
  );
  const matchCount = library.filter(e => projectKeys.has(`${e.brand}|${e.model}`.toLowerCase())).length;

  return (
    <>
      <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <CardHead icon="📊" title="Reports" color={C.navy} />
        <div style={{ padding: 24 }}>
          {/* Action buttons row */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            <button onClick={() => importFileRef.current?.click()}
              style={{ background: C.steel, color: C.white, border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
              ⬆ Import Proposal
            </button>
            <button onClick={handleCSV} disabled={totalDevices === 0}
              style={{ background: C.success, color: C.white, border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer", opacity: totalDevices === 0 ? 0.5 : 1 }}>
              ⬇ Export CSV
            </button>
            <button onClick={handleGenerate} disabled={generating || !sdkReady}
              style={{ background: generating ? C.muted : C.gold, color: C.navy, border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
              {generating ? "⏳ Building PDF..." : "⬇ Export PDF Report"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
            {[
              ["🖥","Servers",srvCount,serverGroups.length],
              ["🔀","Switches",swCount,switchGroups.length],
              ["📷","Cameras",camCount,cameraGroups.length],
              ["🚪","Access Doors",doorCount,doorGroups.length],
              ["🔔","Intrusion Zones",zoneCount,zoneGroups.length],
              ["🔊","Audio Zones",spkCount,speakerGroups.length],
            ].map(([ic, lbl, cnt, grps]) => (
              <div key={lbl} style={{ background: C.bg, borderRadius: 8, padding: 16, textAlign: "center", borderTop: `3px solid ${C.accent}` }}>
                <div style={{ fontSize: 24 }}>{ic}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.navy }}>{cnt}</div>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{lbl}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{grps} group{grps !== 1 ? "s" : ""}</div>
              </div>
            ))}
          </div>

          <div style={{ background: C.bg, borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: 10 }}>Report will include:</div>
            {[
              srvCount > 0 && `✅ ${serverGroups.length} server group(s), ${srvCount} server(s) — brand/model/role + IP, MAC, serial per unit`,
              swCount > 0 && `✅ ${switchGroups.length} switch group(s), ${swCount} switch(es) — brand/model/VLAN + per-unit details`,
              camCount > 0 && `✅ ${cameraGroups.length} camera group(s), ${camCount} camera(s) — model/codec/resolution/lens + IP, MAC, serial per camera`,
              doorCount > 0 && `✅ ${doorGroups.length} door group(s), ${doorCount} door(s) — reader type/credential/lock + per-door controller & serial`,
              zoneCount > 0 && `✅ ${zoneGroups.length} zone group(s), ${zoneCount} zone(s) — type/partition + per-zone number & location`,
              spkCount > 0 && `✅ ${speakerGroups.length} audio group(s), ${spkCount} speaker(s) — zone group/amp + per-unit location`,
              "📋 Project info header + VMS recorder details + intrusion panel info",
              "✍️ Technician and customer sign-off section",
            ].filter(Boolean).map((item, i) => (
              <div key={i} style={{ fontSize: 13, color: C.navy, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>{item}</div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            PDF = full close-out report with signatures &nbsp;·&nbsp; CSV = flat device list for CRM / spreadsheet import
          </div>

          {/* OEM Manual */}
          <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, padding: 22, marginTop: 24 }}>
            <div style={{ fontWeight: 800, color: C.navy, fontSize: 15, marginBottom: 6 }}>📦 OEM Manual</div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
              Compiles a single PDF: <strong>Cover page</strong> → <strong>Close-out report</strong> → <strong>Spec sheets</strong> for every model on this project that exists in the library.
            </div>
            <div style={{ background: C.surface, borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: C.muted, fontSize: 12, fontWeight: 700, minWidth: 90 }}>Cover page</span>
              <input ref={coverFileRef} type="file" accept=".pdf" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) setCoverPageFile(f); e.target.value = ""; }} />
              <button onClick={() => coverFileRef.current?.click()}
                style={{ background: C.steel, color: C.white, border: "none", borderRadius: 5, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                {coverPageFile ? "↻ Replace" : "⬆ Upload PDF"}
              </button>
              {coverPageFile
                ? <span style={{ color: C.success, fontSize: 12, fontWeight: 600 }}>✓ {coverPageFile.name}</span>
                : <span style={{ color: C.muted, fontSize: 12 }}>Optional — omitted if not uploaded</span>}
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 12, fontSize: 12, flexWrap: "wrap" }}>
                <span style={{ color: coverPageFile ? C.success : C.muted }}>{coverPageFile ? "✓" : "○"} Cover page</span>
                <span style={{ color: C.success }}>✓ Close-out report</span>
                <span style={{ color: matchCount > 0 ? C.success : C.muted }}>
                  {matchCount > 0 ? `✓ ${matchCount} spec sheet${matchCount !== 1 ? "s" : ""} matched from library` : "○ No library matches for this project's devices"}
                </span>
              </div>
              <button onClick={buildOEMManual} disabled={!pdfLibReady || !sdkReady}
                style={{ marginLeft: "auto", background: C.gold, color: C.navy, border: "none", borderRadius: 8, padding: "10px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: (!pdfLibReady || !sdkReady) ? 0.5 : 1 }}>
                📦 Export OEM Manual
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Proposal Import Preview Modal */}
      {importPreview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(7,20,42,0.82)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.white, borderRadius: 12, maxWidth: 780, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 48px rgba(0,0,0,.45)" }}>
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
            {(cameraGroups.length + switchGroups.length + serverGroups.length + doorGroups.length + zoneGroups.length + speakerGroups.length) > 0 && (
              <div style={{ background: "#FEF3C7", borderBottom: `1px solid #FDE68A`, padding: "10px 20px", fontSize: 12, color: "#92400E" }}>
                ⚠ This project already has hardware groups. Imported items will be <strong>added</strong> to the existing groups — nothing will be replaced.
              </div>
            )}
            <div style={{ overflowY: "auto", flex: 1, padding: "0 0 4px" }}>
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
      )}
    </>
  );
}
