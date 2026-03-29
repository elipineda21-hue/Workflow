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
  const inp = { padding: "6px 10px", borderRadius: 5, border: `1.5px solid ${C.border}`, fontSize: 13, width: 90, textAlign: "right", outline: "none", background: C.white, color: C.navy };

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: C.navy, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: C.white, fontWeight: 800, fontSize: 15 }}>⏱ Labor Hours</div>
          <label style={{ background: C.accent, color: C.white, borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            📎 Import from CSV
            <input type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={e => {
              const f = e.target.files[0]; if (!f) return;
              const r = new FileReader(); r.onload = ev => parseCSV(ev.target.result); r.readAsText(f);
              e.target.value = "";
            }} />
          </label>
        </div>
        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 90px", gap: 0, padding: "8px 20px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
          {["Labor Type", "Budget (hrs)", "Actual (hrs)", "Variance"].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: C.steel, textAlign: h === "Labor Type" ? "left" : "right" }}>{h}</div>
          ))}
        </div>
        {/* Rows */}
        {LABOR_TYPES.map((lt, i) => {
          const b = parseFloat(laborBudget[lt.key]) || 0;
          const a = parseFloat(laborActual[lt.key]) || 0;
          const v = a - b;
          return (
            <div key={lt.key} style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 90px", gap: 0, padding: "8px 20px", background: i % 2 === 0 ? C.white : C.surface, alignItems: "center", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, color: C.navy, fontWeight: 600 }}>{lt.label}</div>
              <div style={{ textAlign: "right" }}>
                <input style={inp} type="number" min="0" value={laborBudget[lt.key]} placeholder="0"
                  onChange={e => setLaborBudget(s => ({ ...s, [lt.key]: e.target.value }))} />
              </div>
              <div style={{ textAlign: "right" }}>
                <input style={inp} type="number" min="0" value={laborActual[lt.key]} placeholder="0"
                  onChange={e => setLaborActual(s => ({ ...s, [lt.key]: e.target.value }))} />
              </div>
              <div style={{ textAlign: "right", fontWeight: 700, fontSize: 13, color: v > 0 ? C.danger : v < 0 ? C.success : C.muted }}>
                {b === 0 && a === 0 ? "—" : (v > 0 ? `+${v}h` : v < 0 ? `${v}h` : "0h")}
              </div>
            </div>
          );
        })}
        {/* Totals */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 90px", gap: 0, padding: "12px 20px", background: C.navy, alignItems: "center" }}>
          <div style={{ color: C.white, fontWeight: 800, fontSize: 13 }}>TOTAL</div>
          <div style={{ textAlign: "right", color: C.white, fontWeight: 800, fontSize: 14 }}>{totalBudget}h</div>
          <div style={{ textAlign: "right", color: C.white, fontWeight: 800, fontSize: 14 }}>{totalActual}h</div>
          <div style={{ textAlign: "right", fontWeight: 800, fontSize: 14, color: variance > 0 ? "#FCA5A5" : variance < 0 ? "#6EE7B7" : "rgba(255,255,255,0.5)" }}>
            {variance === 0 ? "—" : (variance > 0 ? `+${variance}h` : `${variance}h`)}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, color: C.muted, fontSize: 11 }}>
        CSV format: one row per labor type, e.g. <code>Labor,Installation - L1,49</code> — the app matches keywords automatically.
      </div>
    </div>
  );
}
