import { C } from "../constants";
import { MONDAY_BOARD_ID, fetchProjects, fetchBoardColumns } from "../api/monday";
import { loadWorkOrder } from "../supabase";

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
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚡</div>
          <div style={{ color: C.white, fontWeight: 800, fontSize: 22, letterSpacing: "0.02em" }}>PROGRAMMING & CONFIG WORK ORDER</div>
          <div style={{ color: C.accent, fontSize: 13, marginTop: 4, letterSpacing: "0.06em" }}>Select an active project from monday.com</div>
        </div>

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
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 8, alignItems: "center" }}>
              <button onClick={() => setPhase("master")}
                style={{ background: C.accent, color: C.white, border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                📊 Master Dashboard
              </button>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {projects.map(p => (
              <div key={p.id} onClick={() => handleProjectClick(p)}
                style={{ background: selectedProject?.id === p.id ? C.accent : "rgba(255,255,255,0.05)", border: `1px solid ${selectedProject?.id === p.id ? C.accent : "rgba(255,255,255,0.1)"}`, borderRadius: 8, padding: "14px 18px", cursor: "pointer", transition: "background .15s" }}>
                <div style={{ color: C.white, fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>ID: {p.projectId}  |  Lead: {p.techLead}  |  Status: {p.programmingStatus}</div>
                {(p.customer || p.siteAddress || p.pm) && (
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, marginTop: 2 }}>
                    {[p.customer, p.siteAddress, p.pm ? `PM: ${p.pm}` : ""].filter(Boolean).join("  ·  ")}
                  </div>
                )}
              </div>
            ))}
          </div>
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
