import { C } from "../constants";
import { addDev, remDev, updDev } from "../models";
import DevRow from "./DevRow";

export default function DevTable({ cols, devices, gid, setter, newDevFn, onLog, onFieldLog, noProgramming }) {
  if (!devices.length) {
    return (
      <div style={{ textAlign: "center", padding: "16px", color: C.muted, fontSize: 12, border: `1px dashed ${C.border}`, borderRadius: 6, marginTop: 8 }}>
        No devices yet — click Generate or add one manually.
        <button onClick={() => addDev(setter, gid, newDevFn())}
          style={{ marginLeft: 10, background: C.accent, color: C.white, border: "none", borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          + Add One
        </button>
      </div>
    );
  }
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.steel }}>{devices.length} Device{devices.length !== 1 ? "s" : ""}</span>
        <button onClick={() => addDev(setter, gid, newDevFn(devices.length))}
          style={{ background: C.accent, color: C.white, border: "none", borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          + Add One
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: C.navy }}>
              <th style={{ padding: "5px 8px", color: C.muted, fontSize: 10, fontWeight: 700, textAlign: "center", width: 30 }}>#</th>
              {cols.map(c => <th key={c.key} style={{ padding: "5px 8px", color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 700, textAlign: "left", whiteSpace: "nowrap" }}>{c.label}</th>)}
              <th style={{ padding: "5px 8px", color: C.warn, fontSize: 10, fontWeight: 700, textAlign: "center", width: 50, whiteSpace: "nowrap" }}>Inst</th>
              {!noProgramming && <th style={{ padding: "5px 8px", color: C.success, fontSize: 10, fontWeight: 700, textAlign: "center", width: 50, whiteSpace: "nowrap" }}>Pgmd</th>}
              <th style={{ padding: "5px 8px", width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {devices.map((dev, i) => (
              <DevRow key={dev.id} num={i + 1} dev={dev} cols={cols}
                onRemove={() => remDev(setter, gid, dev.id)}
                onUpd={(k, v) => updDev(setter, gid, dev.id, k, v)}
                onLog={onLog}
                onFieldLog={onFieldLog}
                noProgramming={noProgramming}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
