import { useState, useEffect } from "react";
import { C } from "../constants";
import { listWorkOrders } from "../supabase";

export default function MasterDashboard({ onBack, laborTypes }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    listWorkOrders()
      .then(data => { setRows(data); setLoading(false); })
      .catch(e   => { setError(e.message); setLoading(false); });
  }, []);

  const allDevs = (s) => [
    ...(s.cameraGroups  || []), ...(s.switchGroups  || []),
    ...(s.serverGroups  || []), ...(s.doorGroups    || []),
    ...(s.zoneGroups    || []), ...(s.speakerGroups || []),
  ].flatMap(g => g.devices || []);

  const pct = (n, d) => d ? Math.round((n / d) * 100) : 0;

  const Bar = ({ val, color }) => (
    <div style={{ background: "#E5E7EB", borderRadius: 999, height: 6, width: "100%", overflow: "hidden", marginTop: 2 }}>
      <div style={{ height: "100%", width: `${val}%`, background: color, borderRadius: 999, transition: "width .4s" }} />
    </div>
  );

  const summary = rows.map(r => {
    const s = r.state || {};
    const devs = allDevs(s);
    const inst = devs.filter(d => d.installed).length;
    const pgmd = devs.filter(d => d.programmed).length;
    const bud  = laborTypes.reduce((a, t) => a + (parseFloat((s.laborBudget || {})[t.key]) || 0), 0);
    const act  = laborTypes.reduce((a, t) => a + (parseFloat((s.laborActual || {})[t.key]) || 0), 0);
    return { name: r.project_name, id: r.monday_project_id, total: devs.length, inst, pgmd, bud, act, updated: r.updated_at };
  });

  const totDevices = summary.reduce((a, r) => a + r.total, 0);
  const totInst    = summary.reduce((a, r) => a + r.inst,  0);
  const totPgmd    = summary.reduce((a, r) => a + r.pgmd,  0);
  const totBud     = summary.reduce((a, r) => a + r.bud,   0);
  const totAct     = summary.reduce((a, r) => a + r.act,   0);

  const statusLabel = (r) => {
    if (r.total === 0) return { label: "No Devices", color: C.muted };
    if (r.pgmd === r.total) return { label: "Complete", color: C.success };
    if (r.inst === r.total) return { label: "Installed", color: C.warn };
    if (r.inst > 0) return { label: "In Progress", color: C.accent };
    return { label: "Not Started", color: C.steel };
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: C.navy, padding: "12px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", color: C.white, border: "none", borderRadius: 5, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>← Back</button>
        <div style={{ color: C.white, fontWeight: 800, fontSize: 16 }}>📊 Master Project Dashboard</div>
        <div style={{ marginLeft: "auto", color: C.accent, fontSize: 12, fontWeight: 600 }}>{rows.length} projects loaded</div>
      </div>
      <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        {loading && <div style={{ textAlign: "center", padding: 60, color: C.muted }}>Loading all projects…</div>}
        {error   && <div style={{ background: "#FEE2E2", borderRadius: 8, padding: 16, color: C.danger, marginBottom: 16 }}>Error: {error}</div>}
        {!loading && !error && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Projects",      value: rows.length,                    color: C.navy },
                { label: "Total Devices", value: totDevices,                     color: C.navy },
                { label: "Avg Install",   value: `${pct(totInst, totDevices)}%`, color: C.warn },
                { label: "Avg Program",   value: `${pct(totPgmd, totDevices)}%`, color: C.accent },
                { label: "Budget Hrs",    value: `${totBud}h`,                   color: C.navy },
                { label: "Actual Hrs",    value: `${totAct}h`,                   color: totAct > totBud && totBud > 0 ? C.danger : C.success },
              ].map(card => (
                <div key={card.label} style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 16 }}>
                  <div style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>{card.label}</div>
                  <div style={{ fontWeight: 800, fontSize: 22, color: card.color, marginTop: 4 }}>{card.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.navy }}>
                    {["Project","Status","Devices","Install %","Program %","Budget Hrs","Actual Hrs","Variance","Last Updated"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 700, textAlign: h === "Project" || h === "Status" ? "left" : "center", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.map((r, i) => {
                    const st   = statusLabel(r);
                    const ip   = pct(r.inst, r.total);
                    const pp   = pct(r.pgmd, r.total);
                    const varr = r.act - r.bud;
                    return (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? C.white : C.surface, borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: C.navy, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: st.color + "22", color: st.color, borderRadius: 6, padding: "2px 10px", fontWeight: 700, fontSize: 11 }}>{st.label}</span>
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: C.navy, fontWeight: 700 }}>{r.total}</td>
                        <td style={{ padding: "10px 14px", minWidth: 100 }}>
                          <div style={{ textAlign: "center", fontWeight: 700, color: ip === 100 ? C.success : C.warn, fontSize: 12 }}>{ip}%</div>
                          <Bar val={ip} color={ip === 100 ? C.success : C.warn} />
                        </td>
                        <td style={{ padding: "10px 14px", minWidth: 100 }}>
                          <div style={{ textAlign: "center", fontWeight: 700, color: pp === 100 ? C.success : C.accent, fontSize: 12 }}>{pp}%</div>
                          <Bar val={pp} color={pp === 100 ? C.success : C.accent} />
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: C.navy }}>{r.bud ? `${r.bud}h` : "—"}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: C.navy }}>{r.act ? `${r.act}h` : "—"}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: varr > 0 ? C.danger : varr < 0 ? C.success : C.muted }}>
                          {r.bud === 0 ? "—" : varr === 0 ? "0h" : `${varr > 0 ? "+" : ""}${varr}h`}
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: C.muted, fontSize: 11 }}>
                          {r.updated ? new Date(r.updated).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {summary.length === 0 && (
                    <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: C.muted }}>No saved projects yet. Open a project and make changes to save it.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
