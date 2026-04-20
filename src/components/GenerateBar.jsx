import { updGrp, applyGen } from "../models";
import { F, Inp } from "./ui";

export default function GenerateBar({ group, setter, genFn, showIP = true }) {
  return (
    <div className="flex items-end gap-2.5 rounded-[7px] mt-2.5" style={{ background: "#EBF8FF", border: "1px solid #BAE6FD", padding: "10px 14px" }}>
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
        onClick={() => {
          if (group.devices.length > 0 && !confirm(`This will replace ${group.devices.length} existing device(s). Continue?`)) return;
          applyGen(setter, group.id, genFn);
        }}
        className="bg-gold text-navy border-none rounded-md font-extrabold text-xs cursor-pointer whitespace-nowrap mb-[1px]" style={{ padding: "7px 18px" }}>
        ⚡ Generate {group.quantity || 1} Device{parseInt(group.quantity) !== 1 ? "s" : ""}
      </button>
      {group.devices.length > 0 && (
        <span className="text-[11px] text-muted mb-[3px]">
          (will replace {group.devices.length} existing row{group.devices.length !== 1 ? "s" : ""})
        </span>
      )}
    </div>
  );
}
