import { useRef } from "react";
import { Tog } from "./ui";

export default function DevRow({ num, dev, cols, onRemove, onUpd, onLog, onFieldLog, noProgramming }) {
  const focusVals = useRef({});
  const rowBg = dev.programmed ? "#F0FDF4" : dev.installed ? "#FFFBEB" : (num % 2 === 0 ? '#FFFFFF' : '#F8FAFD');
  return (
    <tr style={{ background: rowBg }}>
      <td className="px-2 py-[5px] text-[11px] font-bold text-muted text-center w-[30px]">{num}</td>
      {cols.map(col => (
        <td key={col.key} className="p-1">
          {col.type === "toggle" ? (
            <Tog label="" val={dev[col.key]} set={v => onUpd(col.key, v)} />
          ) : (
            <input
              value={dev[col.key] || ""}
              onChange={e => onUpd(col.key, e.target.value)}
              placeholder={col.ph || ""}
              className="py-[5px] px-[7px] rounded border-[1.5px] border-border text-[11px] bg-white text-navy outline-none w-full box-border"
              onFocus={e => { e.target.style.borderColor = '#00AEEF'; focusVals.current[col.key] = e.target.value; }}
              onBlur={e => {
                e.target.style.borderColor = '#CBD5E1';
                const newVal = e.target.value;
                const oldVal = focusVals.current[col.key] ?? "";
                if (newVal !== oldVal && onFieldLog) onFieldLog(col.key, oldVal, newVal);
              }}
            />
          )}
        </td>
      ))}
      <td className="px-2 py-1 text-center w-[50px]">
        <label className="flex flex-col items-center gap-[1px] cursor-pointer">
          <input type="checkbox" checked={!!dev.installed} onChange={e => onUpd("installed", e.target.checked)}
            className="cursor-pointer w-[15px] h-[15px]" style={{ accentColor: '#F59E0B' }} />
          <span className="text-[9px] font-bold" style={{ color: dev.installed ? '#F59E0B' : '#6B7E96' }}>
            {dev.installed ? "✓ Inst" : "—"}
          </span>
        </label>
      </td>
      {!noProgramming && (
        <td className="px-2 py-1 text-center w-[50px]">
          <label className="flex flex-col items-center gap-[1px] cursor-pointer">
            <input type="checkbox" checked={!!dev.programmed} onChange={e => { onUpd("programmed", e.target.checked); onLog?.(dev.name, e.target.checked); }}
              className="cursor-pointer w-[15px] h-[15px]" style={{ accentColor: '#10B981' }} />
            <span className="text-[9px] font-bold" style={{ color: dev.programmed ? '#10B981' : '#6B7E96' }}>
              {dev.programmed ? "✓ Pgmd" : "—"}
            </span>
          </label>
        </td>
      )}
      <td className="px-1.5 py-1 text-center">
        <button onClick={onRemove} className="border-none rounded-[3px] px-1.5 py-[2px] text-[10px] font-bold cursor-pointer text-danger" style={{ background: "#FEE2E2" }}>✕</button>
      </td>
    </tr>
  );
}
