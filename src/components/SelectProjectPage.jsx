import { useState } from "react";
import { Zap, Search, X } from "lucide-react";
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
  setInfo, setNVR, setPanel, setAccess,
  setCameraGroups, setSwitchGroups, setServerGroups,
  setDoorGroups, setZoneGroups, setSpeakerGroups,
  setLaborBudget, setLaborActual, setSpecSheetUrls, setChangeLog, setNetworkConfig,
}) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
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
        if (s.accessInfo)    setAccess(s.accessInfo);
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
    <div className="min-h-screen bg-gradient-to-br from-dark via-navy to-steel flex flex-col items-center justify-center p-6">
      <div className="max-w-[720px] w-full">
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="mb-3 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/20"><Zap size={32} className="text-accent" /></div>
          <div className="text-white font-extrabold text-[32px] tracking-tight">ProjectPal</div>
          <div className="text-accent/70 text-[11px] mt-1.5 tracking-[0.12em] uppercase font-medium">by Anonymous - Zero</div>
        </div>

        {/* Dashboard preview (when connected) */}
        {mondayToken && projects.length > 0 && (
          <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.08] p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-white/90 font-bold text-sm tracking-tight">Dashboard</div>
              <button onClick={() => setPhase("master")}
                className="bg-accent/90 hover:bg-accent text-white border-none rounded-lg px-4 py-1.5 text-[11px] font-semibold cursor-pointer">
                Open Full Dashboard
              </button>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
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
                  <div key={card.label} className="bg-white/[0.05] hover:bg-white/[0.08] rounded-xl px-3 py-3 text-center transition-colors">
                    <div className="text-[22px] font-black" style={{ color: card.color }}>{card.value}</div>
                    <div className="text-[10px] font-medium text-white/40 mt-1 whitespace-nowrap">{card.label}</div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Token setup */}
        {!mondayToken && (
          <div className="bg-white/5 rounded-xl p-5 mb-5">
            <div className="text-gold font-bold text-[13px] mb-2">Connect to monday.com</div>
            <div className="text-muted text-xs mb-3">
              Enter your monday.com API token to load active projects automatically.<br />
              Find it at: <span className="text-accent">monday.com → Avatar → Developers → API v2 Token</span>
            </div>
            <div className="flex gap-2">
              <input value={tokenDraft} onChange={e => setTokenDraft(e.target.value)}
                placeholder="eyJhbGc..." type="password"
                onKeyDown={e => e.key === "Enter" && saveToken()}
                className="flex-1 w-full p-2.5 px-3.5 rounded-md border border-white/15 bg-white/[0.07] text-white text-[13px] outline-none box-border" />
              <button onClick={saveToken} className="bg-accent text-white border-none rounded-md px-[18px] py-2.5 font-bold text-[13px] cursor-pointer whitespace-nowrap">
                Connect
              </button>
            </div>
          </div>
        )}

        {/* Refresh token + column mapper */}
        {mondayToken && (
          <>
            <div className="flex justify-end mb-2 gap-2 items-center">
              <div className="flex gap-2 items-center">
                <span className="text-success text-[11px] font-semibold">✓ Connected to monday.com</span>
                <button onClick={async () => {
                    setLoadingProjects(true);
                    try {
                      const ps = await fetchProjects(mondayToken, colMap);
                      setProjects(ps);
                    } catch {}
                    setLoadingProjects(false);
                  }}
                  className="bg-accent/15 text-accent border border-accent/30 rounded-[5px] px-2.5 py-[3px] text-[11px] font-semibold cursor-pointer">
                  ↻ Refresh
                </button>
                <button onClick={() => setColMapperOpen(v => !v)}
                  className="bg-white/[0.07] text-accent border border-accent/30 rounded-[5px] px-2.5 py-[3px] text-[11px] cursor-pointer">
                  ⚙ Column Map
                </button>
                <button onClick={() => { localStorage.removeItem("mondayToken"); setMondayToken(""); setProjects([]); }}
                  className="bg-white/[0.07] text-muted border border-white/10 rounded-[5px] px-2.5 py-[3px] text-[11px] cursor-pointer">
                  Change Token
                </button>
              </div>
            </div>

            {/* Column Mapper Panel */}
            {colMapperOpen && (
              <div className="bg-white/[0.06] rounded-xl border border-accent/20 p-4 mb-4">
                <div className="text-white font-bold text-[13px] mb-1">⚙ Monday.com Column Mapping</div>
                <div className="text-muted text-[11px] mb-3">
                  Map your board columns to app fields so project info auto-fills when you select a project.
                  Click <strong className="text-accent">Load Columns</strong> to see all column IDs from your board.
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
                  className="bg-accent text-white border-none rounded-[5px] px-3.5 py-[5px] text-[11px] font-bold cursor-pointer mb-3">
                  {colMapperLoading ? "Loading…" : "Load Columns from Board"}
                </button>
                {colMapperCols.length > 0 && (
                  <>
                    <div className="overflow-x-auto mb-3">
                      <table className="w-full border-collapse text-[11px]">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="py-[5px] px-2 text-left text-muted">Column Title</th>
                            <th className="py-[5px] px-2 text-left text-muted">Column ID</th>
                            <th className="py-[5px] px-2 text-left text-muted">Sample Value</th>
                            <th className="py-[5px] px-2 text-left text-muted">Map to App Field</th>
                          </tr>
                        </thead>
                        <tbody>
                          {colMapperCols.map(col => (
                            <tr key={col.id} className="border-b border-white/5">
                              <td className="py-[5px] px-2 text-white font-semibold">{col.title}</td>
                              <td className="py-[5px] px-2 text-accent font-mono text-[10px]">{col.id}</td>
                              <td className="py-[5px] px-2 text-muted max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap">{col.sample || "—"}</td>
                              <td className="py-[5px] px-2">
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
                                  className="bg-white/[0.07] text-white border border-white/10 rounded px-1.5 py-[3px] text-[11px]">
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
                    <div className="flex gap-2">
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
                        className="bg-success text-white border-none rounded-[5px] px-4 py-1.5 text-[11px] font-bold cursor-pointer">
                        ✓ Save Mapping
                      </button>
                      <button onClick={() => setColMapperOpen(false)}
                        className="bg-white/[0.07] text-muted border-none rounded-[5px] px-3 py-1.5 text-[11px] cursor-pointer">
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
          <div className="text-center text-muted p-10">
            <div className="text-[32px] mb-2">⏳</div>
            <div>Loading projects from monday.com...</div>
          </div>
        ) : projectsError ? (
          <div className="bg-[#3B0F0F] rounded-lg p-4 text-[#FCA5A5] text-[13px] mb-4">
            Error: {projectsError}. Check your API token and board ID.
          </div>
        ) : projects.length > 0 ? (
          <>
            {/* Search bar */}
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full py-2.5 pl-10 pr-10 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-sm outline-none placeholder:text-white/25"
                placeholder="Search projects by name, ID, customer, address..."
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 bg-transparent border-none cursor-pointer p-0"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Status filter */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {PROJECT_STATUSES.map(s => {
                const count = s === "All" ? projects.length : projects.filter(p => (p.projectStatus || "") === s).length;
                const active = statusFilter === s;
                const sc = STATUS_COLORS[s] || { bg: "rgba(255,255,255,0.1)", color: C.white };
                return (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    style={{ background: active ? (sc.bg || "rgba(0,174,239,0.2)") : "rgba(255,255,255,0.06)", color: active ? (sc.color || C.accent) : "rgba(255,255,255,0.5)", border: active ? `1.5px solid ${sc.color || C.accent}` : "1.5px solid transparent" }}
                    className="rounded-lg px-3 py-[5px] text-[11px] font-bold cursor-pointer whitespace-nowrap">
                    {s} {count > 0 && <span className="opacity-70">({count})</span>}
                  </button>
                );
              })}
            </div>
            {/* Result count */}
            {(() => {
              const filtered = projects.filter(p => {
                const matchesStatus = statusFilter === "All" || (p.projectStatus || "") === statusFilter;
                const q = searchQuery.toLowerCase();
                const matchesSearch = !q || [p.name, p.projectId, p.customer, p.siteAddress, p.techLead, p.pm].some(v => (v || "").toLowerCase().includes(q));
                return matchesStatus && matchesSearch;
              });
              return (
                <div className="text-white/30 text-[11px] font-medium mb-2">
                  Showing {filtered.length} of {projects.length} projects
                </div>
              );
            })()}

            {/* Project list */}
            <div className="flex flex-col gap-2.5">
              {projects.filter(p => {
                const matchesStatus = statusFilter === "All" || (p.projectStatus || "") === statusFilter;
                const q = searchQuery.toLowerCase();
                const matchesSearch = !q || [p.name, p.projectId, p.customer, p.siteAddress, p.techLead, p.pm].some(v => (v || "").toLowerCase().includes(q));
                return matchesStatus && matchesSearch;
              }).map(p => {
                const projSt = STATUS_COLORS[p.projectStatus] || null;
                const progSt = PROG_COLORS[p.programmingStatus] || null;
                return (
                  <div key={p.id} onClick={() => handleProjectClick(p)}
                    className={`rounded-xl px-5 py-4 cursor-pointer transition-all duration-150 border ${selectedProject?.id === p.id ? 'bg-accent/20 border-accent' : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/20'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-white font-semibold text-sm flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{p.name}</div>
                      <div className="flex gap-2 shrink-0">
                        {progSt && p.programmingStatus && (
                          <span style={{ background: progSt.bg, color: progSt.color }} className="rounded-md px-2.5 py-1 text-[9px] font-bold whitespace-nowrap">{p.programmingStatus}</span>
                        )}
                        {projSt && p.projectStatus && (
                          <span style={{ background: projSt.bg, color: projSt.color }} className="rounded-md px-2.5 py-1 text-[9px] font-bold whitespace-nowrap">{p.projectStatus}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-white/40 text-[11px] mt-1.5 font-medium">ID: {p.projectId}  |  Lead: {p.techLead}</div>
                    {(p.customer || p.siteAddress || p.pm || p.schedule) && (
                      <div className="text-white/30 text-[10px] mt-1">
                        {[p.customer, p.siteAddress, p.pm ? `PM: ${p.pm}` : "", p.schedule ? `Schedule: ${p.schedule}` : ""].filter(Boolean).join("  ·  ")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : mondayToken ? (
          <div className="text-center text-muted p-6 text-[13px]">No projects found on board {MONDAY_BOARD_ID}.</div>
        ) : null}

        {/* Manual fallback */}
        <div className="mt-5">
          <div className="text-center text-white/25 text-[11px] mb-3">— or enter manually —</div>
          <div className="bg-white/[0.04] rounded-xl p-4">
            {[["Project Name","name"],["Project ID","projectId"]].map(([lbl, k]) => (
              <div key={k} className="mb-2.5">
                <label className="text-muted text-[11px] font-bold uppercase tracking-[0.07em] block mb-1">{lbl}</label>
                <input value={selectedProject?.[k] || ""} onChange={e => setSelectedProject(s => ({ ...(s || {}), [k]: e.target.value }))}
                  className="w-full p-2.5 px-3.5 rounded-md border border-white/15 bg-white/[0.07] text-white text-[13px] outline-none box-border" />
              </div>
            ))}
          </div>
          <button onClick={() => setPhase("build")} className="w-full mt-3 bg-accent text-white border-none rounded-lg p-3 text-sm font-bold cursor-pointer">
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
