import { addDev, remDev, updDev } from "../models";
import DevRow from "./DevRow";

export default function DevTable({ cols, devices, gid, setter, newDevFn, onLog, onFieldLog, noProgramming }) {
  if (!devices.length) {
    return (
      <div className="text-center p-4 text-muted text-xs border border-dashed border-border rounded-md mt-2">
        No devices yet — click Generate or add one manually.
        <button onClick={() => addDev(setter, gid, newDevFn())}
          className="ml-2.5 bg-accent text-white border-none rounded px-2.5 py-[3px] text-[11px] font-bold cursor-pointer">
          + Add One
        </button>
      </div>
    );
  }
  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] font-bold text-steel">{devices.length} Device{devices.length !== 1 ? "s" : ""}</span>
        <button onClick={() => addDev(setter, gid, newDevFn(devices.length))}
          className="bg-accent text-white border-none rounded px-2.5 py-[3px] text-[11px] font-bold cursor-pointer">
          + Add One
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-navy">
              <th className="px-2 py-[5px] text-muted text-[10px] font-bold text-center w-[30px]">#</th>
              {cols.map(c => <th key={c.key} className="px-2 py-[5px] text-[10px] font-bold text-left whitespace-nowrap" style={{ color: "rgba(255,255,255,0.7)" }}>{c.label}</th>)}
              <th className="px-2 py-[5px] text-warn text-[10px] font-bold text-center w-[50px] whitespace-nowrap">Inst</th>
              {!noProgramming && <th className="px-2 py-[5px] text-success text-[10px] font-bold text-center w-[50px] whitespace-nowrap">Pgmd</th>}
              <th className="px-2 py-[5px] w-[30px]"></th>
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
