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
    <div className="bg-[#E5E7EB] rounded-full h-1.5 w-full overflow-hidden mt-0.5">
      <div className="h-full rounded-full transition-[width] duration-400" style={{ width: `${val}%`, background: color }} />
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
    <div className="min-h-screen bg-bg font-['Segoe_UI',system-ui,sans-serif]">
      <div className="bg-navy px-6 py-3 flex items-center gap-4">
        <button onClick={onBack} className="bg-white/10 text-white border-none rounded-[5px] px-3 py-1 text-xs cursor-pointer">← Back</button>
        <div className="text-white font-extrabold text-[16px]">📊 Master Project Dashboard</div>
        <div className="ml-auto text-accent text-xs font-semibold">{rows.length} projects loaded</div>
      </div>
      <div className="p-6 max-w-[1200px] mx-auto">
        {loading && <div className="text-center p-[60px] text-muted">Loading all projects…</div>}
        {error   && <div className="bg-[#FEE2E2] rounded-lg p-4 text-danger mb-4">Error: {error}</div>}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 mb-6">
              {[
                { label: "Projects",      value: rows.length,                    color: C.navy },
                { label: "Total Devices", value: totDevices,                     color: C.navy },
                { label: "Avg Install",   value: `${pct(totInst, totDevices)}%`, color: C.warn },
                { label: "Avg Program",   value: `${pct(totPgmd, totDevices)}%`, color: C.accent },
                { label: "Budget Hrs",    value: `${totBud}h`,                   color: C.navy },
                { label: "Actual Hrs",    value: `${totAct}h`,                   color: totAct > totBud && totBud > 0 ? C.danger : C.success },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-xl border border-border p-4">
                  <div className="text-muted text-[11px] font-bold">{card.label}</div>
                  <div className="font-extrabold text-[22px] mt-1" style={{ color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-navy">
                    {["Project","Status","Devices","Install %","Program %","Budget Hrs","Actual Hrs","Variance","Last Updated"].map(h => (
                      <th key={h} className={`px-3.5 py-2.5 text-white/80 text-[11px] font-bold whitespace-nowrap ${h === "Project" || h === "Status" ? 'text-left' : 'text-center'}`}>{h}</th>
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
                      <tr key={r.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-surface'} border-b border-border`}>
                        <td className="px-3.5 py-2.5 font-bold text-navy max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">{r.name || "—"}</td>
                        <td className="px-3.5 py-2.5">
                          <span style={{ background: st.color + "22", color: st.color }} className="rounded-md px-2.5 py-0.5 font-bold text-[11px]">{st.label}</span>
                        </td>
                        <td className="px-3.5 py-2.5 text-center text-navy font-bold">{r.total}</td>
                        <td className="px-3.5 py-2.5 min-w-[100px]">
                          <div className="text-center font-bold text-xs" style={{ color: ip === 100 ? C.success : C.warn }}>{ip}%</div>
                          <Bar val={ip} color={ip === 100 ? C.success : C.warn} />
                        </td>
                        <td className="px-3.5 py-2.5 min-w-[100px]">
                          <div className="text-center font-bold text-xs" style={{ color: pp === 100 ? C.success : C.accent }}>{pp}%</div>
                          <Bar val={pp} color={pp === 100 ? C.success : C.accent} />
                        </td>
                        <td className="px-3.5 py-2.5 text-center text-navy">{r.bud ? `${r.bud}h` : "—"}</td>
                        <td className="px-3.5 py-2.5 text-center text-navy">{r.act ? `${r.act}h` : "—"}</td>
                        <td className="px-3.5 py-2.5 text-center font-bold" style={{ color: varr > 0 ? C.danger : varr < 0 ? C.success : C.muted }}>
                          {r.bud === 0 ? "—" : varr === 0 ? "0h" : `${varr > 0 ? "+" : ""}${varr}h`}
                        </td>
                        <td className="px-3.5 py-2.5 text-center text-muted text-[11px]">
                          {r.updated ? new Date(r.updated).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {summary.length === 0 && (
                    <tr><td colSpan={9} className="p-10 text-center text-muted">No saved projects yet. Open a project and make changes to save it.</td></tr>
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
