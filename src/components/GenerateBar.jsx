import { C } from "../constants";
import { updGrp, applyGen } from "../models";
import { F, Inp } from "./ui";

export default function GenerateBar({ group, setter, genFn, showIP = true }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, background: "#EBF8FF", border: `1px solid #BAE6FD`, borderRadius: 7, padding: "10px 14px", marginTop: 10 }}>
      <F label="Quantity" >
        <Inp type="number" min="1" max="64" value={group.quantity}
          onChange={e => updGrp(setter, group.id, "quantity", e.target.value)}
          style={{ width: 80 }} />
      </F>
      {showIP && (
        <F label="IP Start">
          <Inp value={group.ipStart}
            onChange={e => updGrp(setter, group.id, "ipStart", e.target.value)}
            placeholder="192.168.x.x" style={{ width: 160 }} />
        </F>
      )}
      <button
        onClick={() => applyGen(setter, group.id, genFn)}
        style={{ background: C.gold, color: C.navy, border: "none", borderRadius: 6, padding: "7px 18px", fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", marginBottom: 1 }}>
        ⚡ Generate {group.quantity || 1} Device{parseInt(group.quantity) !== 1 ? "s" : ""}
      </button>
      {group.devices.length > 0 && (
        <span style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>
          (will replace {group.devices.length} existing row{group.devices.length !== 1 ? "s" : ""})
        </span>
      )}
    </div>
  );
}
