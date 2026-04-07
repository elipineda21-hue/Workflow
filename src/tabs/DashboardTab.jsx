import { C } from "../constants";

export default function DashboardTab({
  cameraGroups, doorGroups, speakerGroups, zoneGroups, serverGroups, switchGroups,
  laborBudget, laborActual, LABOR_TYPES,
  changeLog, setChangeLog,
  webhookUrl, setWebhookUrl,
  aiLoading, setAiLoading,
  selectedProject, info,
  dashCollapsed, setDashCollapsed,
}) {
  const catSections = [
    { id: "cameras",   label: "CCTV / Cameras",    icon: "📷", devs: cameraGroups.flatMap(g => g.devices.map(d => ({ ...d, _grp: g.groupLabel || g.model || g.brand || "", _noProg: g.noProgramming }))) },
    { id: "access",    label: "Access Control",    icon: "🚪", devs: doorGroups.flatMap(g => g.devices.map(d => ({ ...d, _grp: g.groupLabel || g.model || g.brand || "", _noProg: g.noProgramming }))) },
    { id: "audio",     label: "Audio / Speakers",  icon: "🔊", devs: speakerGroups.flatMap(g => g.devices.map(d => ({ ...d, _grp: g.groupLabel || g.model || g.brand || "", _noProg: g.noProgramming }))) },
    { id: "intrusion", label: "Intrusion / Zones", icon: "🔔", devs: zoneGroups.flatMap(g => g.devices.map(d => ({ ...d, _grp: g.groupLabel || "", _noProg: g.noProgramming }))) },
    { id: "servers",   label: "Server / NVR",      icon: "🖥", devs: serverGroups.flatMap(g => g.devices.map(d => ({ ...d, _grp: g.groupLabel || g.model || g.brand || "", _noProg: g.noProgramming }))) },
    { id: "switches",  label: "Switching",         icon: "🔀", devs: switchGroups.flatMap(g => g.devices.map(d => ({ ...d, _grp: g.groupLabel || g.model || g.brand || "", _noProg: g.noProgramming }))) },
  ].filter(c => c.devs.length > 0);

  const allDevs = catSections.flatMap(c => c.devs);
  const installedCount  = allDevs.filter(d => d.installed).length;
  const programmedCount = allDevs.filter(d => d.programmed || d._noProg).length;
  const instPct = allDevs.length ? Math.round((installedCount / allDevs.length) * 100) : 0;
  const pct     = allDevs.length ? Math.round((programmedCount / allDevs.length) * 100) : 0;
  const totalBudget = LABOR_TYPES.reduce((s, t) => s + (parseFloat(laborBudget[t.key]) || 0), 0);
  const totalActual = LABOR_TYPES.reduce((s, t) => s + (parseFloat(laborActual[t.key]) || 0), 0);

  const logTypeMeta = {
    programmed:   { label: "Programmed",   bg: "#D1FAE5", color: C.success },
    unprogrammed: { label: "Unprogrammed", bg: "#FEE2E2", color: C.danger },
    group_added:  { label: "Group Added",  bg: "#DBEAFE", color: "#1D4ED8" },
    name_change:  { label: "Renamed",      bg: "#FEF9C3", color: "#92400E" },
    location_set: { label: "Location",     bg: "#E0F2FE", color: "#0369A1" },
    import:       { label: "Import",       bg: "#EDE9FE", color: "#6D28D9" },
  };

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 mb-4">
        {[
          { label: "Install %",  value: `${instPct}%`, sub: `${installedCount} / ${allDevs.length} devices`, color: instPct === 100 ? C.success : C.warn },
          { label: "Program %",  value: `${pct}%`,     sub: `${programmedCount} / ${allDevs.length} devices`, color: pct === 100 ? C.success : C.accent },
          { label: "Budget Hrs", value: `${totalBudget}h`, sub: "from proposal", color: C.navy },
          { label: "Actual Hrs", value: `${totalActual}h`, sub: totalBudget ? `${totalActual - totalBudget > 0 ? "+" : ""}${totalActual - totalBudget}h variance` : "enter in Labor tab", color: totalActual > totalBudget ? C.danger : C.success },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-border p-4">
            <div className="text-muted text-[11px] font-bold mb-1">{card.label}</div>
            <div className="font-extrabold text-[24px]" style={{ color: card.color }}>{card.value}</div>
            <div className="text-muted text-[11px] mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Progress bars */}
      <div className="bg-white rounded-xl border border-border p-5 mb-4">
        <div className="flex justify-between mb-2">
          <div className="font-bold text-[13px] text-navy">Installation</div>
          <div className="font-extrabold" style={{ color: instPct === 100 ? C.success : C.warn }}>{instPct}%</div>
        </div>
        <div className="bg-bg rounded-full h-2.5 overflow-hidden mb-1">
          <div className="h-full rounded-full transition-[width] duration-400" style={{ width: `${instPct}%`, background: instPct === 100 ? C.success : C.warn }} />
        </div>
        <div className="flex justify-between mt-3">
          <div className="font-bold text-[13px] text-navy">Programming</div>
          <div className="font-extrabold" style={{ color: pct === 100 ? C.success : C.accent }}>{pct}%</div>
        </div>
        <div className="bg-bg rounded-full h-2.5 overflow-hidden mt-1">
          <div className="h-full rounded-full transition-[width] duration-400" style={{ width: `${pct}%`, background: pct === 100 ? C.success : C.accent }} />
        </div>
      </div>

      {/* Collapsible category device sections */}
      {allDevs.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center text-muted mb-4">
          No devices added yet. Go to any category tab and add device groups.
        </div>
      ) : (
        <div className="mb-4">
          {catSections.map(cat => {
            const done = cat.devs.filter(d => d.programmed || d._noProg).length;
            const cp = cat.devs.length ? Math.round((done / cat.devs.length) * 100) : 0;
            const isCollapsed = dashCollapsed[cat.id];
            return (
              <div key={cat.id} className="bg-white rounded-xl border border-border overflow-hidden mb-2">
                <div
                  onClick={() => setDashCollapsed(s => ({ ...s, [cat.id]: !s[cat.id] }))}
                  className="bg-navy py-2.5 px-4 flex justify-between items-center cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-white font-bold text-[13px]">{cat.icon} {cat.label}</span>
                    <span className="bg-white/15 text-white rounded-xl px-2 py-px text-[11px] font-bold">{cat.devs.length}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs" style={{ color: cp === 100 ? C.success : "#FCD34D" }}>{done}/{cat.devs.length} programmed</span>
                    <span className="text-white/60 text-sm">{isCollapsed ? "▶" : "▼"}</span>
                  </div>
                </div>
                <div className="h-[3px] bg-bg">
                  <div className="h-full transition-[width] duration-400" style={{ width: `${cp}%`, background: cp === 100 ? C.success : C.accent }} />
                </div>
                {!isCollapsed && (
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface">
                        <th className="py-[7px] px-3 text-left text-muted text-[11px] font-bold border-b border-border w-[90px]">Status</th>
                        <th className="py-[7px] px-3 text-left text-muted text-[11px] font-bold border-b border-border">Device Name</th>
                        <th className="py-[7px] px-3 text-left text-muted text-[11px] font-bold border-b border-border w-[140px]">Blueprint ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.devs.map((dev, i) => (
                        <tr key={dev.id} style={{ background: (dev.programmed || dev._noProg) ? "#F0FDF4" : (i % 2 === 0 ? C.white : C.surface) }}>
                          <td className="py-1.5 px-3">
                            <span className="inline-block py-0.5 px-2 rounded-xl text-[10px] font-bold" style={{ background: dev._noProg ? "#E0F2FE" : dev.programmed ? "#D1FAE5" : "#FEF3C7", color: dev._noProg ? C.accent : dev.programmed ? C.success : C.warn }}>
                              {dev._noProg ? "N/A" : dev.programmed ? "✓ Done" : "Pending"}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 font-semibold text-navy">
                            {dev.name}
                            {dev._grp && <span className="font-normal text-muted text-[11px] ml-1.5">({dev._grp})</span>}
                          </td>
                          <td className="py-1.5 px-3 font-mono text-steel text-[11px]">{dev.cableId || <span className="text-border">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Change Log */}
      <div className="bg-white rounded-xl border border-border overflow-hidden mb-4">
        <div
          onClick={() => setDashCollapsed(s => ({ ...s, _changelog: !s._changelog }))}
          className="bg-surface py-2.5 px-4 flex justify-between items-center cursor-pointer select-none border-b border-border"
        >
          <span className="font-bold text-[13px] text-navy">📋 Change Log <span className="font-normal text-muted text-[11px]">({changeLog.length} entries)</span></span>
          <div className="flex gap-2.5 items-center">
            {changeLog.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setChangeLog([]); }}
                className="text-[11px] py-0.5 px-2.5 rounded-md border border-border bg-white text-danger cursor-pointer font-semibold"
              >Clear</button>
            )}
            <span className="text-muted text-sm">{dashCollapsed._changelog ? "▶" : "▼"}</span>
          </div>
        </div>
        {!dashCollapsed._changelog && (
          changeLog.length === 0 ? (
            <div className="p-5 text-center text-muted text-xs">No activity yet. Mark devices as programmed/installed to log changes.</div>
          ) : (
            <div className="max-h-[280px] overflow-y-auto">
              {changeLog.map(entry => {
                const meta = logTypeMeta[entry.type] || { label: entry.type, bg: C.surface, color: C.muted };
                return (
                  <div key={entry.id} className="flex items-center gap-2.5 py-[7px] px-3.5 border-b border-border text-xs">
                    <span className="text-muted text-[11px] min-w-[70px] shrink-0">{new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="rounded-lg py-px px-2 text-[10px] font-bold shrink-0" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                    <span className="text-navy">{entry.desc}</span>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Send Update to AI Agent */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div
          onClick={() => setDashCollapsed(s => ({ ...s, _ai: !s._ai }))}
          className="bg-surface py-2.5 px-4 flex justify-between items-center cursor-pointer select-none border-b border-border"
        >
          <span className="font-bold text-[13px] text-navy">🤖 Send Update to AI Agent</span>
          <span className="text-muted text-sm">{dashCollapsed._ai ? "▶" : "▼"}</span>
        </div>
        {!dashCollapsed._ai && (
          <div className="p-4">
            <div className="text-muted text-[11px] mb-2.5">
              Posts the change log + device status counts to your AI agent's webhook. The agent handles Monday.com updates from there.
            </div>
            <div className="flex gap-2 mb-3">
              <input
                type="url"
                placeholder="Webhook URL (https://...)"
                value={webhookUrl}
                onChange={e => { setWebhookUrl(e.target.value); localStorage.setItem("agentWebhookUrl", e.target.value); }}
                className="flex-1 p-2 px-2.5 rounded-[7px] border border-border text-xs font-mono"
              />
              <button
                onClick={async () => {
                  if (!webhookUrl) { alert("Enter a webhook URL first"); return; }
                  setAiLoading(true);
                  const payload = {
                    project_id:   selectedProject?.id   || null,
                    project_name: selectedProject?.name || info.projectName || null,
                    project_ref:  info.projectRef       || null,
                    sent_at:      new Date().toISOString(),
                    device_summary: catSections.map(c => ({
                      category:   c.label,
                      total:      c.devs.length,
                      programmed: c.devs.filter(d => d.programmed).length,
                      installed:  c.devs.filter(d => d.installed).length,
                      pending:    c.devs.filter(d => !d.programmed).length,
                    })),
                    totals: {
                      devices:     allDevs.length,
                      programmed:  programmedCount,
                      installed:   installedCount,
                      program_pct: pct,
                      install_pct: instPct,
                    },
                    labor: {
                      budget_hrs:   totalBudget,
                      actual_hrs:   totalActual,
                      variance_hrs: totalActual - totalBudget,
                    },
                    change_log: changeLog.slice(0, 100).map(e => ({
                      time:        e.ts,
                      type:        e.type,
                      description: e.desc,
                    })),
                  };
                  try {
                    const res = await fetch(webhookUrl, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    alert("✓ Update sent to AI agent");
                  } catch(e) {
                    alert(`Webhook error: ${e.message}`);
                  }
                  setAiLoading(false);
                }}
                disabled={aiLoading}
                className={`py-2 px-4 rounded-[7px] border-none text-white font-bold text-xs whitespace-nowrap ${aiLoading ? "bg-muted cursor-not-allowed" : "bg-accent cursor-pointer"}`}
              >{aiLoading ? "Sending…" : "Send Update"}</button>
            </div>
            <div className="bg-surface rounded-[7px] border border-border py-2 px-3 text-[11px] text-muted">
              <strong className="text-navy">Payload includes:</strong> project ID &amp; name · device counts per category (total / programmed / installed / pending) · labor hours &amp; variance · last 100 change log entries
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
