import { useState } from "react";
import { updGrp } from "../models";
import { F, Inp } from "./ui";

export default function GenerateBar({ group, setter, genFn, showIP = true }) {
  const [appendMode, setAppendMode] = useState(false);

  const handleGenerate = () => {
    if (appendMode) {
      // Append: generate new devices starting from current count
      const startIdx = group.devices.length;
      const count = Math.min(parseInt(group.quantity) || 1, 64);
      const newDevices = genFn({ ...group, quantity: String(count) }).map((dev, i) => ({
        ...dev,
        name: dev.name.replace(/\d+$/, String(startIdx + i + 1).padStart(2, "0")),
        cableId: dev.cableId ? dev.cableId.replace(/\d+$/, String(startIdx + i + 1).padStart(3, "0")) : dev.cableId,
      }));
      setter(gs => gs.map(g => g.id === group.id ? { ...g, devices: [...g.devices, ...newDevices] } : g));
    } else {
      if (group.devices.length > 0 && !confirm(`This will replace ${group.devices.length} existing device(s). Continue?`)) return;
      setter(gs => gs.map(g => g.id === group.id ? { ...g, devices: genFn(g) } : g));
    }
  };

  return (
    <div className="flex items-end gap-2.5 rounded-lg mt-2.5 bg-[#EBF8FF] border border-[#BAE6FD] px-3.5 py-2.5">
      <F label="Quantity">
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
      <div className="flex rounded-lg border border-[#BAE6FD] overflow-hidden mb-[1px]">
        <button
          onClick={handleGenerate}
          className="bg-gold text-navy border-none font-extrabold text-xs cursor-pointer whitespace-nowrap px-4 py-[7px]">
          ⚡ {appendMode ? "Add" : "Generate"} {group.quantity || 1} Device{parseInt(group.quantity) !== 1 ? "s" : ""}
        </button>
        <button
          onClick={() => setAppendMode(v => !v)}
          title={appendMode ? "Append mode: new devices are added to existing list" : "Replace mode: existing devices are replaced"}
          className={`border-none text-[10px] font-bold cursor-pointer whitespace-nowrap px-2.5 py-[7px] border-l border-[#BAE6FD] ${appendMode ? "bg-accent text-white" : "bg-white text-muted hover:bg-surface"}`}>
          {appendMode ? "Append ✓" : "Flatten"}
        </button>
      </div>
      {group.devices.length > 0 && !appendMode && (
        <span className="text-[11px] text-muted mb-[3px]">
          (will replace {group.devices.length} existing)
        </span>
      )}
      {group.devices.length > 0 && appendMode && (
        <span className="text-[11px] text-accent mb-[3px]">
          (will add {group.quantity || 1} to {group.devices.length} existing)
        </span>
      )}
    </div>
  );
}
