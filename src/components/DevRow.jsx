import { useRef } from "react";
import { C } from "../constants";
import { Tog } from "./ui";

export default function DevRow({ num, dev, cols, onRemove, onUpd, onLog, onFieldLog, noProgramming }) {
  const inpSt = { padding: "5px 7px", borderRadius: 4, border: `1.5px solid ${C.border}`, fontSize: 11, background: C.white, color: C.navy, outline: "none", width: "100%", boxSizing: "border-box" };
  const focusVals = useRef({});
  const rowBg = dev.programmed ? "#F0FDF4" : dev.installed ? "#FFFBEB" : (num % 2 === 0 ? C.white : C.surface);
  return (
    <tr style={{ background: rowBg }}>
      <td style={{ padding: "5px 8px", fontSize: 11, fontWeight: 700, color: C.muted, textAlign: "center", width: 30 }}>{num}</td>
      {cols.map(col => (
        <td key={col.key} style={{ padding: "4px 4px" }}>
          {col.type === "toggle" ? (
            <Tog label="" val={dev[col.key]} set={v => onUpd(col.key, v)} />
          ) : (
            <input
              value={dev[col.key] || ""}
              onChange={e => onUpd(col.key, e.target.value)}
              placeholder={col.ph || ""}
              style={inpSt}
              onFocus={e => { e.target.style.borderColor = C.accent; focusVals.current[col.key] = e.target.value; }}
              onBlur={e => {
                e.target.style.borderColor = C.border;
                const newVal = e.target.value;
                const oldVal = focusVals.current[col.key] ?? "";
                if (newVal !== oldVal && onFieldLog) onFieldLog(col.key, oldVal, newVal);
              }}
            />
          )}
        </td>
      ))}
      <td style={{ padding: "4px 8px", textAlign: "center", width: 50 }}>
        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, cursor: "pointer" }}>
          <input type="checkbox" checked={!!dev.installed} onChange={e => onUpd("installed", e.target.checked)}
            style={{ cursor: "pointer", accentColor: C.warn, width: 15, height: 15 }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: dev.installed ? C.warn : C.muted }}>
            {dev.installed ? "✓ Inst" : "—"}
          </span>
        </label>
      </td>
      {!noProgramming && (
        <td style={{ padding: "4px 8px", textAlign: "center", width: 50 }}>
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, cursor: "pointer" }}>
            <input type="checkbox" checked={!!dev.programmed} onChange={e => { onUpd("programmed", e.target.checked); onLog?.(dev.name, e.target.checked); }}
              style={{ cursor: "pointer", accentColor: C.success, width: 15, height: 15 }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: dev.programmed ? C.success : C.muted }}>
              {dev.programmed ? "✓ Pgmd" : "—"}
            </span>
          </label>
        </td>
      )}
      <td style={{ padding: "4px 6px", textAlign: "center" }}>
        <button onClick={onRemove} style={{ background: "#FEE2E2", color: C.danger, border: "none", borderRadius: 3, padding: "2px 6px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>✕</button>
      </td>
    </tr>
  );
}
