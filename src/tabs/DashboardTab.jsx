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
    { id: "cameras",   label: "CCTV / Cameras",    icon: "📷", devs: cameraGroups.flatMap(g => g.devices.map(d => ({ ...d, _grp: g.groupLabel || g.model || g.brand || "" }))) },
    { id: "access",    label: "Access Control",    icon: "🚪", devs: doorGroups.flatMap(g => g.devices.map(d => ({ ...d, _grp: g.groupLabel || g.model || g.brand || "" }))) },
    { id: "audio",     label: "Audio / Speakers",  icon: "🔊", devs: speakerGroups.flatMap(g => g.devices.map(d => ({ ...d, _grp: g.groupLabel || g.model || g.brand || "" }))) },
    { id: "intrusion", label: "Intrusion / Zones", icon: "🔔", devs: zoneGroups.flatMap(g => g.devices.map(d => ({ ...d, _grp: g.groupLabel || "" }))) },
    { id: "servers",   label: "Server / NVR",      icon: "🖥", devs: serverGroups.flatMap(g => g.devices.map(d => ({ ...d, _grp: g.groupLabel || g.model || g.brand || "" }))) },
    { id: "switches",  label: "Switching",         icon: "🔀", devs: switchGroups.flatMap(g => g.devices.map(d => ({ ...d, _grp: g.groupLabel || g.model || g.brand || "" }))) },
  ].filter(c => c.devs.length > 0);

  const allDevs = catSections.flatMap(c => c.devs);
  const installedCount  = allDevs.filter(d => d.installed).length;
  const programmedCount = allDevs.filter(d => d.programmed).length;
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Install %",  value: `${instPct}%`, sub: `${installedCount} / ${allDevs.length} devices`, color: instPct === 100 ? C.success : C.warn },
          { label: "Program %",  value: `${pct}%`,     sub: `${programmedCount} / ${allDevs.length} devices`, color: pct === 100 ? C.success : C.accent },
          { label: "Budget Hrs", value: `${totalBudget}h`, sub: "from proposal", color: C.navy },
          { label: "Actual Hrs", value: `${totalActual}h`, sub: totalBudget ? `${totalActual - totalBudget > 0 ? "+" : ""}${totalActual - totalBudget}h variance` : "enter in Labor tab", color: totalActual > totalBudget ? C.danger : C.success },
        ].map(card => (
          <div key={card.label} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 16 }}>
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontWeight: 800, fontSize: 24, color: card.color }}>{card.value}</div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Progress bars */}
      <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>Installation</div>
          <div style={{ fontWeight: 800, color: instPct === 100 ? C.success : C.warn }}>{instPct}%</div>
        </div>
        <div style={{ background: C.bg, borderRadius: 999, height: 10, overflow: "hidden", marginBottom: 4 }}>
          <div style={{ height: "100%", width: `${instPct}%`, background: instPct === 100 ? C.success : C.warn, borderRadius: 999, transition: "width .4s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>Programming</div>
          <div style={{ fontWeight: 800, color: pct === 100 ? C.success : C.accent }}>{pct}%</div>
        </div>
        <div style={{ background: C.bg, borderRadius: 999, height: 10, overflow: "hidden", marginTop: 4 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? C.success : C.accent, borderRadius: 999, transition: "width .4s" }} />
        </div>
      </div>

      {/* Collapsible category device sections */}
      {allDevs.length === 0 ? (
        <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 40, textAlign: "center", color: C.muted, marginBottom: 16 }}>
          No devices added yet. Go to any category tab and add device groups.
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {catSections.map(cat => {
            const done = cat.devs.filter(d => d.programmed).length;
            const cp = cat.devs.length ? Math.round((done / cat.devs.length) * 100) : 0;
            const isCollapsed = dashCollapsed[cat.id];
            return (
              <div key={cat.id} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 8 }}>
                <div
                  onClick={() => setDashCollapsed(s => ({ ...s, [cat.id]: !s[cat.id] }))}
                  style={{ background: C.navy, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>{cat.icon} {cat.label}</span>
                    <span style={{ background: "rgba(255,255,255,0.15)", color: C.white, borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{cat.devs.length}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ color: cp === 100 ? C.success : "#FCD34D", fontWeight: 700, fontSize: 12 }}>{done}/{cat.devs.length} programmed</span>
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>{isCollapsed ? "▶" : "▼"}</span>
                  </div>
                </div>
                <div style={{ height: 3, background: C.bg }}>
                  <div style={{ height: "100%", width: `${cp}%`, background: cp === 100 ? C.success : C.accent, transition: "width .4s" }} />
                </div>
                {!isCollapsed && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: C.surface }}>
                        <th style={{ padding: "7px 12px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${C.border}`, width: 90 }}>Status</th>
                        <th style={{ padding: "7px 12px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>Device Name</th>
                        <th style={{ padding: "7px 12px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${C.border}`, width: 140 }}>Blueprint ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.devs.map((dev, i) => (
                        <tr key={dev.id} style={{ background: dev.programmed ? "#F0FDF4" : (i % 2 === 0 ? C.white : C.surface) }}>
                          <td style={{ padding: "6px 12px" }}>
                            <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: dev.programmed ? "#D1FAE5" : "#FEF3C7", color: dev.programmed ? C.success : C.warn }}>
                              {dev.programmed ? "✓ Done" : "Pending"}
                            </span>
                          </td>
                          <td style={{ padding: "6px 12px", fontWeight: 600, color: C.navy }}>
                            {dev.name}
                            {dev._grp && <span style={{ fontWeight: 400, color: C.muted, fontSize: 11, marginLeft: 6 }}>({dev._grp})</span>}
                          </td>
                          <td style={{ padding: "6px 12px", fontFamily: "monospace", color: C.steel, fontSize: 11 }}>{dev.cableId || <span style={{ color: C.border }}>—</span>}</td>
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
      <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 16 }}>
        <div
          onClick={() => setDashCollapsed(s => ({ ...s, _changelog: !s._changelog }))}
          style={{ background: C.surface, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none", borderBottom: `1px solid ${C.border}` }}
        >
          <span style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>📋 Change Log <span style={{ fontWeight: 400, color: C.muted, fontSize: 11 }}>({changeLog.length} entries)</span></span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {changeLog.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setChangeLog([]); }}
                style={{ fontSize: 11, padding: "2px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.white, color: C.danger, cursor: "pointer", fontWeight: 600 }}
              >Clear</button>
            )}
            <span style={{ color: C.muted, fontSize: 14 }}>{dashCollapsed._changelog ? "▶" : "▼"}</span>
          </div>
        </div>
        {!dashCollapsed._changelog && (
          changeLog.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: C.muted, fontSize: 12 }}>No activity yet. Mark devices as programmed/installed to log changes.</div>
          ) : (
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {changeLog.map(entry => {
                const meta = logTypeMeta[entry.type] || { label: entry.type, bg: C.surface, color: C.muted };
                return (
                  <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                    <span style={{ color: C.muted, fontSize: 11, minWidth: 70, flexShrink: 0 }}>{new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span style={{ background: meta.bg, color: meta.color, borderRadius: 8, padding: "1px 8px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{meta.label}</span>
                    <span style={{ color: C.navy }}>{entry.desc}</span>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Send Update to AI Agent */}
      <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div
          onClick={() => setDashCollapsed(s => ({ ...s, _ai: !s._ai }))}
          style={{ background: C.surface, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none", borderBottom: `1px solid ${C.border}` }}
        >
          <span style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>🤖 Send Update to AI Agent</span>
          <span style={{ color: C.muted, fontSize: 14 }}>{dashCollapsed._ai ? "▶" : "▼"}</span>
        </div>
        {!dashCollapsed._ai && (
          <div style={{ padding: 16 }}>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 10 }}>
              Posts the change log + device status counts to your AI agent's webhook. The agent handles Monday.com updates from there.
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                type="url"
                placeholder="Webhook URL (https://...)"
                value={webhookUrl}
                onChange={e => { setWebhookUrl(e.target.value); localStorage.setItem("agentWebhookUrl", e.target.value); }}
                style={{ flex: 1, padding: "8px 10px", borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: "monospace" }}
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
                style={{ padding: "8px 16px", borderRadius: 7, border: "none", background: aiLoading ? C.muted : C.accent, color: C.white, fontWeight: 700, fontSize: 12, cursor: aiLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
              >{aiLoading ? "Sending…" : "Send Update"}</button>
            </div>
            <div style={{ background: C.surface, borderRadius: 7, border: `1px solid ${C.border}`, padding: "8px 12px", fontSize: 11, color: C.muted }}>
              <strong style={{ color: C.navy }}>Payload includes:</strong> project ID &amp; name · device counts per category (total / programmed / installed / pending) · labor hours &amp; variance · last 100 change log entries
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
