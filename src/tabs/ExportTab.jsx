import { useState } from "react";
import { CardHead } from "../components/ui";
import { getSpecSheetUrl } from "../supabase";
import { generateSubmittal } from "../api/claude";
import { Zap } from "lucide-react";

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
  info, nvrInfo, panelInfo, accessInfo, networkConfig,
}) {
  const [submittalLoading, setSubmittalLoading] = useState(false);
  const [submittalResult, setSubmittalResult] = useState("");
  const [submittalSystem, setSubmittalSystem] = useState("all");
  const [submittalError, setSubmittalError] = useState("");

  const handleGenerateSubmittal = async () => {
    setSubmittalLoading(true);
    setSubmittalError("");
    setSubmittalResult("");
    try {
      const projectData = {
        projectName: selectedProject?.name || "Project",
        projectId: selectedProject?.projectId || "",
        customer: info?.customer || "",
        siteAddress: info?.siteAddress || "",
        techLead: info?.techLead || "",
        date: info?.date || "",
        systems: {},
      };
      if (submittalSystem === "all" || submittalSystem === "cctv") {
        projectData.systems.cctv = {
          groups: cameraGroups.map(g => ({ brand: g.brand, model: g.model, quantity: g.devices.length || g.quantity, codec: g.codec, resolution: g.resolution, lens: g.lens, type: g.type, platform: g.platform, groupLabel: g.groupLabel })),
          totalDevices: camCount,
          vmsPlatform: nvrInfo?.vmsPlatform || "",
          nvrBrand: nvrInfo?.nvrBrand || "",
          nvrModel: nvrInfo?.nvrModel || "",
        };
      }
      if (submittalSystem === "all" || submittalSystem === "access") {
        projectData.systems.accessControl = {
          groups: doorGroups.map(g => ({ brand: g.brand, model: g.model, quantity: g.devices.length || g.quantity, readerType: g.readerType, credentialType: g.credentialType, lockType: g.lockType, platform: g.platform, groupLabel: g.groupLabel })),
          totalDevices: doorCount,
          platform: accessInfo?.accessPlatform || "",
        };
      }
      if (submittalSystem === "all" || submittalSystem === "intrusion") {
        projectData.systems.intrusion = {
          groups: zoneGroups.map(g => ({ zoneType: g.zoneType, quantity: g.devices.length || g.quantity, platform: g.platform, groupLabel: g.groupLabel })),
          totalDevices: zoneCount,
          panelBrand: panelInfo?.panelBrand || "",
          panelModel: panelInfo?.panelModel || "",
          platform: panelInfo?.panelPlatform || "",
        };
      }
      if (submittalSystem === "all" || submittalSystem === "audio") {
        projectData.systems.audio = {
          groups: speakerGroups.map(g => ({ brand: g.brand, model: g.model, quantity: g.devices.length || g.quantity, platform: g.platform, groupLabel: g.groupLabel })),
          totalDevices: spkCount,
        };
      }
      if (submittalSystem === "all" || submittalSystem === "network") {
        projectData.systems.network = {
          vlans: networkConfig?.vlans || [],
          ssids: networkConfig?.ssids || [],
          routerModel: networkConfig?.routerModel || "",
          apCount: networkConfig?.apCount || "",
        };
      }
      if (submittalSystem === "all" || submittalSystem === "servers") {
        projectData.systems.servers = {
          groups: serverGroups.map(g => ({ brand: g.brand, model: g.model, quantity: g.devices.length || g.quantity, role: g.role, os: g.os, storage: g.storage, platform: g.platform, groupLabel: g.groupLabel })),
          totalDevices: srvCount,
        };
      }

      const systemLabel = submittalSystem === "all" ? "Complete Security System" : submittalSystem.toUpperCase();
      const result = await generateSubmittal(projectData, systemLabel);
      setSubmittalResult(result);
    } catch (err) {
      setSubmittalError(err.message || "Failed to generate submittal");
    }
    setSubmittalLoading(false);
  };
  const projectKeys = new Set(
    [...cameraGroups,...doorGroups,...zoneGroups,...speakerGroups,...switchGroups,...serverGroups]
      .map(g => `${g.brand}|${g.model}`.toLowerCase())
  );
  const matchCount = library.filter(e => projectKeys.has(`${e.brand}|${e.model}`.toLowerCase())).length;

  return (
    <>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <CardHead icon="📊" title="Reports" color="#0B1F3A" />
        <div className="p-6">
          {/* Action buttons row */}
          <div className="flex gap-3 flex-wrap mb-6">
            <button onClick={() => importFileRef.current?.click()}
              className="bg-steel text-white border border-white/15 rounded-lg py-2.5 px-5 text-[13px] font-extrabold cursor-pointer">
              ⬆ Import Proposal
            </button>
            <button onClick={handleCSV} disabled={totalDevices === 0}
              className="bg-success text-white border-none rounded-lg py-2.5 px-5 text-[13px] font-extrabold cursor-pointer" style={{ opacity: totalDevices === 0 ? 0.5 : 1 }}>
              ⬇ Export CSV
            </button>
            <button onClick={handleGenerate} disabled={generating || !sdkReady}
              className={`border-none rounded-lg py-2.5 px-5 text-[13px] font-extrabold cursor-pointer text-navy ${generating ? "bg-muted" : "bg-gold"}`}>
              {generating ? "⏳ Building PDF..." : "⬇ Export PDF Report"}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3.5 mb-6">
            {[
              ["🖥","Servers",srvCount,serverGroups.length],
              ["🔀","Switches",swCount,switchGroups.length],
              ["📷","Cameras",camCount,cameraGroups.length],
              ["🚪","Access Doors",doorCount,doorGroups.length],
              ["🔔","Intrusion Zones",zoneCount,zoneGroups.length],
              ["🔊","Audio Zones",spkCount,speakerGroups.length],
            ].map(([ic, lbl, cnt, grps]) => (
              <div key={lbl} className="bg-bg rounded-lg p-4 text-center border-t-[3px] border-t-accent">
                <div className="text-[24px]">{ic}</div>
                <div className="text-[28px] font-extrabold text-navy">{cnt}</div>
                <div className="text-[11px] text-muted font-semibold">{lbl}</div>
                <div className="text-[10px] text-muted mt-0.5">{grps} group{grps !== 1 ? "s" : ""}</div>
              </div>
            ))}
          </div>

          <div className="bg-bg rounded-lg p-4 mb-5">
            <div className="font-bold text-navy mb-2.5">Report will include:</div>
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
              <div key={i} className="text-[13px] text-navy py-1 border-b border-border">{item}</div>
            ))}
          </div>
          <div className="text-[11px] text-muted mt-1">
            PDF = full close-out report with signatures &nbsp;·&nbsp; CSV = flat device list for CRM / spreadsheet import
          </div>

          {/* OEM Manual */}
          <div className="bg-bg rounded-xl border border-border p-[22px] mt-6">
            <div className="font-extrabold text-navy text-[15px] mb-1.5">📦 OEM Manual</div>
            <div className="text-muted text-xs mb-4">
              Compiles a single PDF: <strong>Cover page</strong> → <strong>Close-out report</strong> → <strong>Spec sheets</strong> for every model on this project that exists in the library.
            </div>
            <div className="bg-surface rounded-lg py-3 px-4 mb-4 flex items-center gap-3">
              <span className="text-muted text-xs font-bold min-w-[90px]">Cover page</span>
              <input ref={coverFileRef} type="file" accept=".pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) setCoverPageFile(f); e.target.value = ""; }} />
              <button onClick={() => coverFileRef.current?.click()}
                className="bg-steel text-white border-none rounded-[5px] py-[5px] px-3 text-[11px] font-bold cursor-pointer">
                {coverPageFile ? "↻ Replace" : "⬆ Upload PDF"}
              </button>
              {coverPageFile
                ? <span className="text-success text-xs font-semibold">✓ {coverPageFile.name}</span>
                : <span className="text-muted text-xs">Optional — omitted if not uploaded</span>}
            </div>
            <div className="flex gap-3.5 items-center flex-wrap">
              <div className="flex gap-3 text-xs flex-wrap">
                <span className={coverPageFile ? "text-success" : "text-muted"}>{coverPageFile ? "✓" : "○"} Cover page</span>
                <span className="text-success">✓ Close-out report</span>
                <span className={matchCount > 0 ? "text-success" : "text-muted"}>
                  {matchCount > 0 ? `✓ ${matchCount} spec sheet${matchCount !== 1 ? "s" : ""} matched from library` : "○ No library matches for this project's devices"}
                </span>
              </div>
              <button onClick={buildOEMManual} disabled={!pdfLibReady || !sdkReady}
                className="ml-auto bg-gold text-navy border-none rounded-lg py-2.5 px-7 text-sm font-extrabold cursor-pointer" style={{ opacity: (!pdfLibReady || !sdkReady) ? 0.5 : 1 }}>
                📦 Export OEM Manual
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Submittal Generator ── */}
      <div className="bg-white rounded-xl border border-border overflow-hidden mt-6">
        <div className="bg-gradient-to-r from-dark to-navy px-5 py-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <Zap size={16} className="text-accent" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">AI Submittal Generator</div>
            <div className="text-white/40 text-[10px]">Powered by Claude — generates professional submittal documents from your project data</div>
          </div>
        </div>
        <div className="p-5">
          <div className="flex gap-3 items-end mb-4 flex-wrap">
            <div>
              <label className="text-[10px] font-semibold text-muted uppercase block mb-1">System</label>
              <select value={submittalSystem} onChange={e => setSubmittalSystem(e.target.value)}
                className="py-2 px-3 rounded-lg border border-border text-sm text-navy bg-white cursor-pointer">
                <option value="all">All Systems (Full Submittal)</option>
                <option value="cctv">CCTV / Surveillance</option>
                <option value="access">Access Control</option>
                <option value="intrusion">Intrusion / Alarm</option>
                <option value="audio">Audio / AV</option>
                <option value="servers">Servers / NVR</option>
                <option value="network">Network Infrastructure</option>
              </select>
            </div>
            <button onClick={handleGenerateSubmittal} disabled={submittalLoading || totalDevices === 0}
              className="bg-accent hover:bg-accent/90 text-white border-none rounded-lg px-5 py-2 text-sm font-semibold cursor-pointer flex items-center gap-2"
              style={{ opacity: (submittalLoading || totalDevices === 0) ? 0.5 : 1 }}>
              <Zap size={14} />
              {submittalLoading ? "Generating..." : "Generate Submittal"}
            </button>
            {submittalResult && (
              <button onClick={() => {
                  const blob = new Blob([submittalResult], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url;
                  a.download = `Submittal_${(selectedProject?.name || "Project").replace(/\s+/g, "_")}_${submittalSystem}_${new Date().toISOString().split("T")[0]}.txt`;
                  a.click(); URL.revokeObjectURL(url);
                }}
                className="bg-success hover:bg-success/90 text-white border-none rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer">
                Download .txt
              </button>
            )}
          </div>

          {submittalError && (
            <div className="bg-danger/10 text-danger rounded-lg p-3 text-xs font-semibold mb-4">{submittalError}</div>
          )}

          {submittalLoading && (
            <div className="bg-accent/5 rounded-xl p-8 text-center">
              <div className="text-2xl mb-2 animate-pulse">⚡</div>
              <div className="text-sm text-muted font-medium">Claude is generating your submittal...</div>
              <div className="text-[11px] text-muted/60 mt-1">This may take 15-30 seconds</div>
            </div>
          )}

          {submittalResult && !submittalLoading && (
            <div className="bg-surface rounded-xl border border-border p-5 max-h-[500px] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-navy leading-relaxed font-[inherit]">{submittalResult}</pre>
            </div>
          )}

          {!submittalResult && !submittalLoading && (
            <div className="bg-surface rounded-xl p-6 text-center">
              <div className="text-muted text-sm mb-2">Select a system and click Generate to create a professional submittal document.</div>
              <div className="text-muted/60 text-xs">
                Includes: System overview · Equipment schedule · System narrative · Compliance notes
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Proposal Import Preview Modal */}
      {importPreview && (
        <div className="fixed inset-0 bg-dark/[0.82] z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-[780px] w-full max-h-[90vh] flex flex-col shadow-[0_8px_48px_rgba(0,0,0,.45)]">
            <div className="bg-navy rounded-t-xl py-4 px-5 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-white font-extrabold text-[15px]">
                  {importPreview.isChangeOrder ? "Import Change Order Hardware" : "Import Proposal Hardware"}
                  {importPreview.isChangeOrder && <span className="bg-gold text-navy text-[10px] font-extrabold rounded-lg py-0.5 px-2 ml-2">CHANGE ORDER</span>}
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
              <button onClick={() => setImportPreview(null)} className="bg-white/[0.12] text-white border-none rounded-md py-1 px-2.5 text-[13px] cursor-pointer">✕</button>
            </div>
            {(cameraGroups.length + switchGroups.length + serverGroups.length + doorGroups.length + zoneGroups.length + speakerGroups.length) > 0 && (
              <div className="bg-[#FEF3C7] border-b border-[#FDE68A] py-2.5 px-5 text-xs text-[#92400E]">
                ⚠ This project already has hardware groups. Imported items will be <strong>added</strong> to the existing groups — nothing will be replaced.
              </div>
            )}
            <div className="overflow-y-auto flex-1 pb-1">
              {importPreview.rows.some(r => !r.recurring) && (
                <>
                  {importPreview.rows.some(r => r.recurring) && (
                    <div className="bg-navy py-1.5 px-3">
                      <span className="text-accent font-bold text-[11px]">ONE-TIME HARDWARE</span>
                    </div>
                  )}
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface sticky top-0">
                        {["Brand","Model","Description","Qty","Area","Category"].map(h => (
                          <th key={h} className="py-2 px-3 text-left text-muted font-bold text-[11px] uppercase tracking-wide border-b border-border">{h}</th>
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
                          <tr key={i} className={`border-b border-border ${i % 2 === 0 ? "bg-white" : "bg-surface"}`}>
                            <td className="py-[7px] px-3 text-navy">{row.brand || <span className="text-muted">—</span>}</td>
                            <td className="py-[7px] px-3 text-navy font-mono text-[11px]">{row.model || <span className="text-muted">—</span>}</td>
                            <td className="py-[7px] px-3 text-muted max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap">{row.label || "—"}</td>
                            <td className="py-[7px] px-3 text-navy font-bold text-center">{row.qty}</td>
                            <td className="py-[7px] px-3 text-muted text-[11px] max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">{row.area || "—"}</td>
                            <td className="py-[7px] px-3">
                              <select value={cat} onChange={e => setImportPreview(s => ({ ...s, overrideCats: { ...s.overrideCats, [i]: e.target.value } }))}
                                className={`py-[3px] px-2 rounded-[5px] text-[11px] font-bold cursor-pointer ${isUnknown ? "border border-warn bg-[#FEF3C7] text-[#92400E]" : "border border-border bg-white text-navy"}`}>
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
                  <div className="bg-[#78350F] py-1.5 px-3 flex items-center gap-2">
                    <span className="text-gold font-bold text-[11px]">RECURRING / MRR ITEMS</span>
                    <span className="text-white/50 text-[10px]">— not imported as hardware, for reference only</span>
                  </div>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#FEF3C7]">
                        {["Brand","Model","Description","Qty","Area"].map(h => (
                          <th key={h} className="py-[7px] px-3 text-left text-[#92400E] font-bold text-[10px] uppercase tracking-wide border-b border-[#FDE68A]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.map((row, i) => {
                        if (!row.recurring) return null;
                        return (
                          <tr key={i} className={`border-b border-[#FDE68A] ${i % 2 === 0 ? "bg-[#FFFBEB]" : "bg-[#FEF9E7]"}`}>
                            <td className="py-1.5 px-3 text-[#92400E]">{row.brand || "—"}</td>
                            <td className="py-1.5 px-3 text-[#92400E] font-mono text-[11px]">{row.model || "—"}</td>
                            <td className="py-1.5 px-3 text-[#B45309] max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">{row.label || "—"}</td>
                            <td className="py-1.5 px-3 text-[#92400E] font-bold text-center">{row.qty}</td>
                            <td className="py-1.5 px-3 text-[#B45309] text-[11px]">{row.area || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
            <div className="py-3.5 px-5 border-t border-border flex items-center gap-3 bg-surface rounded-b-xl">
              <div className="flex-1 text-xs text-muted">
                {importPreview.rows.filter((r, i) => !r.recurring && (importPreview.overrideCats[i] || r.category) !== "unknown").length} hardware items will be imported as device groups.
                {importPreview.rows.some(r => r.recurring) && ` · ${importPreview.rows.filter(r => r.recurring).length} recurring MRR items skipped.`}
                {" "}Devices not generated yet — set IP start + hit Generate in each group.
              </div>
              <button onClick={() => setImportPreview(null)} className="bg-transparent text-muted border border-border rounded-[7px] py-2 px-4 text-[13px] cursor-pointer">Cancel</button>
              <button onClick={handleProposalImport} className="bg-accent text-white border-none rounded-[7px] py-2 px-[22px] text-[13px] font-extrabold cursor-pointer">
                ⬆ Import Hardware
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
