import { C } from "../constants";

export default function LaborTab({ laborBudget, setLaborBudget, laborActual, setLaborActual, LABOR_TYPES, emptyLabor }) {
  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    const budget = emptyLabor();
    lines.forEach(line => {
      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      const combined = cols.join(" ").toLowerCase();
      const qty = cols.map(c => parseFloat(c)).find(n => !isNaN(n) && n > 0);
      if (!qty) return;
      if (combined.includes("l1") || combined.includes("level 1") || (combined.includes("install") && combined.includes("1"))) budget.l1 = qty;
      else if (combined.includes("l2") || combined.includes("level 2") || (combined.includes("install") && combined.includes("2"))) budget.l2 = qty;
      else if (combined.includes("l3") || combined.includes("level 3") || (combined.includes("install") && combined.includes("3"))) budget.l3 = qty;
      else if (combined.includes("program")) budget.programming = qty;
      else if (combined.includes("travel")) budget.travel = qty;
      else if (combined.includes("super")) budget.super = qty;
      else if (combined.includes("manage") || combined.includes(" pm") || combined.includes("admin")) budget.pm = qty;
    });
    setLaborBudget(b => ({ ...b, ...Object.fromEntries(Object.entries(budget).filter(([,v]) => v !== "")) }));
  };

  const totalBudget = LABOR_TYPES.reduce((s, t) => s + (parseFloat(laborBudget[t.key]) || 0), 0);
  const totalActual = LABOR_TYPES.reduce((s, t) => s + (parseFloat(laborActual[t.key]) || 0), 0);
  const variance = totalActual - totalBudget;

  return (
    <div className="max-w-[700px]">
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="bg-navy py-3 px-5 flex justify-between items-center">
          <div className="text-white font-extrabold text-[15px]">⏱ Labor Hours</div>
          <label className="bg-accent text-white rounded-md py-1.5 px-3.5 text-xs font-bold cursor-pointer">
            📎 Import from CSV
            <input type="file" accept=".csv,.txt" className="hidden" onChange={e => {
              const f = e.target.files[0]; if (!f) return;
              const r = new FileReader(); r.onload = ev => parseCSV(ev.target.result); r.readAsText(f);
              e.target.value = "";
            }} />
          </label>
        </div>
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_100px_100px_90px] py-2 px-5 bg-surface border-b border-border">
          {["Labor Type", "Budget (hrs)", "Actual (hrs)", "Variance"].map(h => (
            <div key={h} className={`text-[11px] font-bold text-steel ${h === "Labor Type" ? "text-left" : "text-right"}`}>{h}</div>
          ))}
        </div>
        {/* Rows */}
        {LABOR_TYPES.map((lt, i) => {
          const b = parseFloat(laborBudget[lt.key]) || 0;
          const a = parseFloat(laborActual[lt.key]) || 0;
          const v = a - b;
          return (
            <div key={lt.key} className={`grid grid-cols-[1fr_100px_100px_90px] py-2 px-5 items-center border-b border-border ${i % 2 === 0 ? "bg-white" : "bg-surface"}`}>
              <div className="text-[13px] text-navy font-semibold">{lt.label}</div>
              <div className="text-right">
                <input className="p-1.5 px-2.5 rounded-[5px] border-[1.5px] border-border text-[13px] w-[90px] text-right outline-none bg-white text-navy" type="number" min="0" value={laborBudget[lt.key]} placeholder="0"
                  onChange={e => setLaborBudget(s => ({ ...s, [lt.key]: e.target.value }))} />
              </div>
              <div className="text-right">
                <input className="p-1.5 px-2.5 rounded-[5px] border-[1.5px] border-border text-[13px] w-[90px] text-right outline-none bg-white text-navy" type="number" min="0" value={laborActual[lt.key]} placeholder="0"
                  onChange={e => setLaborActual(s => ({ ...s, [lt.key]: e.target.value }))} />
              </div>
              <div className="text-right font-bold text-[13px]" style={{ color: v > 0 ? C.danger : v < 0 ? C.success : C.muted }}>
                {b === 0 && a === 0 ? "—" : (v > 0 ? `+${v}h` : v < 0 ? `${v}h` : "0h")}
              </div>
            </div>
          );
        })}
        {/* Totals */}
        <div className="grid grid-cols-[1fr_100px_100px_90px] py-3 px-5 bg-navy items-center">
          <div className="text-white font-extrabold text-[13px]">TOTAL</div>
          <div className="text-right text-white font-extrabold text-sm">{totalBudget}h</div>
          <div className="text-right text-white font-extrabold text-sm">{totalActual}h</div>
          <div className="text-right font-extrabold text-sm" style={{ color: variance > 0 ? "#FCA5A5" : variance < 0 ? "#6EE7B7" : "rgba(255,255,255,0.5)" }}>
            {variance === 0 ? "—" : (variance > 0 ? `+${variance}h` : `${variance}h`)}
          </div>
        </div>
      </div>
      <div className="mt-2.5 text-muted text-[11px]">
        CSV format: one row per labor type, e.g. <code>Labor,Installation - L1,49</code> — the app matches keywords automatically.
      </div>
    </div>
  );
}
