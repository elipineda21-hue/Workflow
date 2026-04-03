import { useState } from "react";
import { C } from "../constants";
import { MONDAY_BOARD_ID, fetchProjects, fetchBoardColumns } from "../api/monday";
import { loadWorkOrder } from "../supabase";

const PROJECT_STATUSES = ["All", "Active", "Pending Start", "Paused/Stuck", "Closeout Req", "Complete"];

const STATUS_COLORS = {
  "Active":       { bg: "#D1FAE5", color: "#065F46" },
  "Pending Start":{ bg: "#FEF3C7", color: "#92400E" },
  "Paused/Stuck": { bg: "#FEE2E2", color: "#991B1B" },
  "Closeout Req": { bg: "#DBEAFE", color: "#1E40AF" },
  "Complete":     { bg: "#EDE9FE", color: "#5B21B6" },
};

const PROG_COLORS = {
  "Scheduled":                 { bg: "#FEF3C7", color: "#92400E" },
  "Programming In Progress":   { bg: "#E0F2FE", color: "#0369A1" },
  "Customer Trainned":         { bg: "#D1FAE5", color: "#065F46" },
  "Stuck":                     { bg: "#FEE2E2", color: "#991B1B" },
  "Sub-Contract":              { bg: "#EDE9FE", color: "#5B21B6" },
  "New":                       { bg: "#F1F5F9", color: "#64748B" },
  "Not Required":              { bg: "#F1F5F9", color: "#64748B" },
};

export default function SelectProjectPage({
  mondayToken, setMondayToken, tokenDraft, setTokenDraft,
  colMap, setColMap, colMapperOpen, setColMapperOpen,
  colMapperCols, setColMapperCols, colMapperLoading, setColMapperLoading,
  colMapDraft, setColMapDraft,
  projects, setProjects, loadingProjects, setLoadingProjects, projectsError,
  selectedProject, setSelectedProject,
  setPhase,
  // state loaders
  setInfo, setNVR, setPanel,
  setCameraGroups, setSwitchGroups, setServerGroups,
  setDoorGroups, setZoneGroups, setSpeakerGroups,
  setLaborBudget, setLaborActual, setSpecSheetUrls, setChangeLog, setNetworkConfig,
}) {
  const [statusFilter, setStatusFilter] = useState("All");
  const inp2St = { width: "100%", padding: "10px 14px", borderRadius: 6, border: `1px solid rgba(255,255,255,0.15)`, background: "rgba(255,255,255,0.07)", color: C.white, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const saveToken = () => {
    const t = tokenDraft.trim();
    if (!t) return;
    localStorage.setItem("mondayToken", t);
    setMondayToken(t);
    setTokenDraft("");
  };

  const handleProjectClick = async (p) => {
    setSelectedProject(p);
    try {
      const saved = await loadWorkOrder(p.id);
      if (saved?.state) {
        const s = saved.state;
        const mergedInfo = {
          customer:    p.customer    || "",
          siteAddress: p.siteAddress || "",
          techLead:    p.techLead    || "",
          ...(s.info || {}),
          ...(p.customer    && !(s.info?.customer)    ? { customer:    p.customer }    : {}),
          ...(p.siteAddress && !(s.info?.siteAddress) ? { siteAddress: p.siteAddress } : {}),
          ...(p.techLead    && !(s.info?.techLead)    ? { techLead:    p.techLead }    : {}),
        };
        setInfo(mergedInfo);
        if (s.nvrInfo)       setNVR(s.nvrInfo);
        if (s.panelInfo)     setPanel(s.panelInfo);
        if (s.cameraGroups)  setCameraGroups(s.cameraGroups);
        if (s.switchGroups)  setSwitchGroups(s.switchGroups);
        if (s.serverGroups)  setServerGroups(s.serverGroups);
        if (s.doorGroups)    setDoorGroups(s.doorGroups);
        if (s.zoneGroups)    setZoneGroups(s.zoneGroups);
        if (s.speakerGroups) setSpeakerGroups(s.speakerGroups);
        if (s.laborBudget)   setLaborBudget(s.laborBudget);
        if (s.laborActual)   setLaborActual(s.laborActual);
        if (s.specSheetUrls) setSpecSheetUrls(s.specSheetUrls);
        if (s.changeLog)     setChangeLog(s.changeLog);
        if (s.networkConfig) setNetworkConfig(s.networkConfig);
      } else {
        setInfo(s => ({
          ...s,
          customer:    p.customer    || s.customer,
          siteAddress: p.siteAddress || s.siteAddress,
          techLead:    p.techLead    || s.techLead,
        }));
      }
    } catch (e) { console.warn("Could not load saved work order:", e); }
    setPhase("build");
  };

  return (
    <div style={{ minHeight: "100vh", background: C.navy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 720, width: "100%" }}>
        {/* Branding */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 44, marginBottom: 6 }}>⚡</div>
          <div style={{ color: C.white, fontWeight: 800, fontSize: 28, letterSpacing: "0.02em" }}>ProjectPal</div>
          <div style={{ color: C.accent, fontSize: 12, marginTop: 4, letterSpacing: "0.08em" }}>by your friends at Calidad</div>
        </div>

        {/* Dashboard preview (when connected) */}
        {mondayToken && projects.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, border: `1px solid rgba(0,174,239,0.15)`, padding: 18, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ color: C.white, fontWeight: 800, fontSize: 15 }}>Dashboard</div>
              <button onClick={() => setPhase("master")}
                style={{ background: C.accent, color: C.white, border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                Open Full Dashboard
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
              {(() => {
                const statusCounts = {};
                projects.forEach(p => {
                  const s = p.programmingStatus || "No Status";
                  statusCounts[s] = (statusCounts[s] || 0) + 1;
                });
                const statusColors = {
                  "Done": C.success, "Complete": C.success, "Completed": C.success,
                  "Working on it": C.accent, "In Progress": C.accent,
                  "Stuck": C.danger,
                  "Not Started": C.muted, "No Status": C.muted,
                };
                return [
                  { label: "Active Projects", value: projects.length, color: C.accent },
                  ...Object.entries(statusCounts).map(([status, count]) => ({
                    label: status, value: count, color: statusColors[status] || C.gold,
                  })),
                ].map(card => (
                  <div key={card.label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginTop: 2, whiteSpace: "nowrap" }}>{card.label}</div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Token setup */}
        {!mondayToken && (
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ color: C.gold, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Connect to monday.com</div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
              Enter your monday.com API token to load active projects automatically.<br />
              Find it at: <span style={{ color: C.accent }}>monday.com → Avatar → Developers → API v2 Token</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={tokenDraft} onChange={e => setTokenDraft(e.target.value)}
                placeholder="eyJhbGc..." type="password"
                onKeyDown={e => e.key === "Enter" && saveToken()}
                style={{ ...inp2St, flex: 1 }} />
              <button onClick={saveToken} style={{ background: C.accent, color: C.white, border: "none", borderRadius: 6, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
                Connect
              </button>
            </div>
          </div>
        )}

        {/* Refresh token + column mapper */}
        {mondayToken && (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8, gap: 8, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: C.success, fontSize: 11, fontWeight: 600 }}>✓ Connected to monday.com</span>
                <button onClick={() => setColMapperOpen(v => !v)}
                  style={{ background: "rgba(255,255,255,0.07)", color: C.accent, border: `1px solid rgba(0,174,239,0.3)`, borderRadius: 5, padding: "3px 10px", fontSize: 11, cursor: "pointer" }}>
                  ⚙ Column Map
                </button>
                <button onClick={() => { localStorage.removeItem("mondayToken"); setMondayToken(""); setProjects([]); }}
                  style={{ background: "rgba(255,255,255,0.07)", color: C.muted, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 5, padding: "3px 10px", fontSize: 11, cursor: "pointer" }}>
                  Change Token
                </button>
              </div>
            </div>

            {/* Column Mapper Panel */}
            {colMapperOpen && (
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, border: `1px solid rgba(0,174,239,0.2)`, padding: 16, marginBottom: 16 }}>
                <div style={{ color: C.white, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>⚙ Monday.com Column Mapping</div>
                <div style={{ color: C.muted, fontSize: 11, marginBottom: 12 }}>
                  Map your board columns to app fields so project info auto-fills when you select a project.
                  Click <strong style={{ color: C.accent }}>Load Columns</strong> to see all column IDs from your board.
                </div>
                <button
                  onClick={async () => {
                    setColMapperLoading(true);
                    try {
                      const cols = await fetchBoardColumns(mondayToken);
                      setColMapperCols(cols);
                      setColMapDraft({ ...colMap });
                    } catch(e) { alert("Error: " + e.message); }
                    setColMapperLoading(false);
                  }}
                  style={{ background: C.accent, color: C.white, border: "none", borderRadius: 5, padding: "5px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>
                  {colMapperLoading ? "Loading…" : "Load Columns from Board"}
                </button>
                {colMapperCols.length > 0 && (
                  <>
                    <div style={{ overflowX: "auto", marginBottom: 12 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.1)` }}>
                            <th style={{ padding: "5px 8px", textAlign: "left", color: C.muted }}>Column Title</th>
                            <th style={{ padding: "5px 8px", textAlign: "left", color: C.muted }}>Column ID</th>
                            <th style={{ padding: "5px 8px", textAlign: "left", color: C.muted }}>Sample Value</th>
                            <th style={{ padding: "5px 8px", textAlign: "left", color: C.muted }}>Map to App Field</th>
                          </tr>
                        </thead>
                        <tbody>
                          {colMapperCols.map(col => (
                            <tr key={col.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                              <td style={{ padding: "5px 8px", color: C.white, fontWeight: 600 }}>{col.title}</td>
                              <td style={{ padding: "5px 8px", color: C.accent, fontFamily: "monospace", fontSize: 10 }}>{col.id}</td>
                              <td style={{ padding: "5px 8px", color: C.muted, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.sample || "—"}</td>
                              <td style={{ padding: "5px 8px" }}>
                                <select
                                  value={Object.entries(colMapDraft).find(([, v]) => v === col.id)?.[0] || ""}
                                  onChange={e => {
                                    const field = e.target.value;
                                    setColMapDraft(d => {
                                      const next = { ...d };
                                      Object.keys(next).forEach(k => { if (next[k] === col.id) next[k] = ""; });
                                      if (field) next[field] = col.id;
                                      return next;
                                    });
                                  }}
                                  style={{ background: "rgba(255,255,255,0.07)", color: C.white, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 4, padding: "3px 6px", fontSize: 11 }}>
                                  <option value="">— none —</option>
                                  <option value="customer">Customer Name</option>
                                  <option value="siteAddress">Site Address</option>
                                  <option value="pm">Project Manager</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => {
                          const next = colMapDraft;
                          setColMap(next);
                          localStorage.setItem("mondayColMap", JSON.stringify(next));
                          setColMapperOpen(false);
                          setLoadingProjects(true);
                          fetchProjects(mondayToken, next)
                            .then(ps => { setProjects(ps); setLoadingProjects(false); })
                            .catch(() => setLoadingProjects(false));
                        }}
                        style={{ background: C.success, color: C.white, border: "none", borderRadius: 5, padding: "6px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        ✓ Save Mapping
                      </button>
                      <button onClick={() => setColMapperOpen(false)}
                        style={{ background: "rgba(255,255,255,0.07)", color: C.muted, border: "none", borderRadius: 5, padding: "6px 12px", fontSize: 11, cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {loadingProjects ? (
          <div style={{ textAlign: "center", color: C.muted, padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <div>Loading projects from monday.com...</div>
          </div>
        ) : projectsError ? (
          <div style={{ background: "#3B0F0F", borderRadius: 8, padding: 16, color: "#FCA5A5", fontSize: 13, marginBottom: 16 }}>
            Error: {projectsError}. Check your API token and board ID.
          </div>
        ) : projects.length > 0 ? (
          <>
            {/* Status filter */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {PROJECT_STATUSES.map(s => {
                const count = s === "All" ? projects.length : projects.filter(p => (p.projectStatus || "") === s).length;
                const active = statusFilter === s;
                const sc = STATUS_COLORS[s] || { bg: "rgba(255,255,255,0.1)", color: C.white };
                return (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    style={{ background: active ? (sc.bg || "rgba(0,174,239,0.2)") : "rgba(255,255,255,0.06)", color: active ? (sc.color || C.accent) : "rgba(255,255,255,0.5)", border: active ? `1.5px solid ${sc.color || C.accent}` : "1.5px solid transparent", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {s} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
                  </button>
                );
              })}
            </div>
            {/* Project list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {projects.filter(p => statusFilter === "All" || (p.projectStatus || "") === statusFilter).map(p => {
                const projSt = STATUS_COLORS[p.projectStatus] || null;
                const progSt = PROG_COLORS[p.programmingStatus] || null;
                return (
                  <div key={p.id} onClick={() => handleProjectClick(p)}
                    style={{ background: selectedProject?.id === p.id ? C.accent : "rgba(255,255,255,0.05)", border: `1px solid ${selectedProject?.id === p.id ? C.accent : "rgba(255,255,255,0.1)"}`, borderRadius: 8, padding: "14px 18px", cursor: "pointer", transition: "background .15s" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ color: C.white, fontWeight: 700, fontSize: 14, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {progSt && p.programmingStatus && (
                          <span style={{ background: progSt.bg, color: progSt.color, borderRadius: 8, padding: "3px 10px", fontSize: 9, fontWeight: 800, whiteSpace: "nowrap" }}>{p.programmingStatus}</span>
                        )}
                        {projSt && p.projectStatus && (
                          <span style={{ background: projSt.bg, color: projSt.color, borderRadius: 8, padding: "3px 10px", fontSize: 9, fontWeight: 800, whiteSpace: "nowrap" }}>{p.projectStatus}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>ID: {p.projectId}  |  Lead: {p.techLead}</div>
                    {(p.customer || p.siteAddress || p.pm || p.schedule) && (
                      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, marginTop: 2 }}>
                        {[p.customer, p.siteAddress, p.pm ? `PM: ${p.pm}` : "", p.schedule ? `Schedule: ${p.schedule}` : ""].filter(Boolean).join("  ·  ")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : mondayToken ? (
          <div style={{ textAlign: "center", color: C.muted, padding: 24, fontSize: 13 }}>No projects found on board {MONDAY_BOARD_ID}.</div>
        ) : null}

        {/* Manual fallback */}
        <div style={{ marginTop: 20 }}>
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 11, marginBottom: 12 }}>— or enter manually —</div>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 16 }}>
            {[["Project Name","name"],["Project ID","projectId"]].map(([lbl, k]) => (
              <div key={k} style={{ marginBottom: 10 }}>
                <label style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>{lbl}</label>
                <input value={selectedProject?.[k] || ""} onChange={e => setSelectedProject(s => ({ ...(s || {}), [k]: e.target.value }))}
                  style={inp2St} />
              </div>
            ))}
          </div>
          <button onClick={() => setPhase("build")} style={{ width: "100%", marginTop: 12, background: C.accent, color: C.white, border: "none", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
