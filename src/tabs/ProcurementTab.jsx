import { useState } from "react";
import { uid } from "../models";
import { updGrp } from "../models";
import { Tog, F, Inp, Sel } from "../components/ui";
import { ChevronUp, ChevronDown, Plus, X } from "lucide-react";

const PROC_STATUSES = [
  { value: "not_ordered", label: "Not Ordered", color: "#64748B", bg: "#F1F5F9" },
  { value: "ordered",     label: "Ordered",     color: "#3B82F6", bg: "#EFF6FF" },
  { value: "in_transit",  label: "In Transit",  color: "#F59E0B", bg: "#FEF3C7" },
  { value: "received",    label: "Received",    color: "#059669", bg: "#D1FAE5" },
  { value: "in_house",    label: "In House",    color: "#22C55E", bg: "#F0FDF4" },
];
const procStatusMeta = Object.fromEntries(PROC_STATUSES.map(s => [s.value, s]));

const VENDORS = [
  "Anixter", "Alarm.com", "ENS", "ADI", "IML", "Cable Connections",
  "Connect Concepts", "Platt", "Home Depot", "All Star Cable",
  "Brivo", "Avigilon",
];

function exportProcurementCSV(groups, miscItems, projectName) {
  const esc = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
  const headers = ["Status", "Category", "Group / Model", "Brand", "Model", "Qty", "Vendor", "PO #", "ETA", "Tracking #"];
  const rows = [headers.map(esc).join(",")];
  const all = [
    ...groups.map(g => ({ ...g, _rowLabel: g.groupLabel || [g.brand, g.model].filter(Boolean).join(" ") || `${g._label} Group` })),
    ...miscItems.map(m => ({ ...m, _rowLabel: m.description || "Misc Item", _label: "Misc", _icon: "🔧" })),
  ];
  const statusOrder = ["not_ordered", "ordered", "in_transit", "received", "in_house"];
  all.sort((a, b) => statusOrder.indexOf(a.procurementStatus || "not_ordered") - statusOrder.indexOf(b.procurementStatus || "not_ordered"));
  for (const g of all) {
    const qty = g.devices?.length || parseInt(g.quantity) || 1;
    const status = procStatusMeta[g.procurementStatus || "not_ordered"]?.label || "Not Ordered";
    rows.push([esc(status), esc(g._label || ""), esc(g._rowLabel), esc(g.brand || ""), esc(g.model || ""), esc(qty), esc(g.vendor || ""), esc(g.poNumber || ""), esc(g.eta || ""), esc(g.trackingNumber || "")].join(","));
  }
  const csv = rows.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `Procurement_${(projectName || "Project").replace(/\s+/g, "_").substring(0, 40)}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function exportVendorOrder(groups, miscItems, vendor, projectName) {
  const esc = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
  const vendorItems = [...groups, ...miscItems].filter(g => g.vendor === vendor);
  if (!vendorItems.length) return;
  const headers = ["Brand", "Model", "Description", "Qty", "PO #", "Status", "ETA"];
  const rows = [headers.map(esc).join(",")];
  for (const g of vendorItems) {
    const label = g.groupLabel || g.description || [g.brand, g.model].filter(Boolean).join(" ") || "";
    const qty = g.devices?.length || parseInt(g.quantity) || 1;
    const status = procStatusMeta[g.procurementStatus || "not_ordered"]?.label || "Not Ordered";
    rows.push([esc(g.brand || ""), esc(g.model || ""), esc(label), esc(qty), esc(g.poNumber || ""), esc(status), esc(g.eta || "")].join(","));
  }
  const csv = rows.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `Order_${vendor.replace(/\s+/g, "_")}_${(projectName || "Project").replace(/\s+/g, "_").substring(0, 30)}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function ProcurementTab({
  cameraGroups, setCameraGroups,
  switchGroups, setSwitchGroups,
  serverGroups, setServerGroups,
  doorGroups, setDoorGroups,
  zoneGroups, setZoneGroups,
  speakerGroups, setSpeakerGroups,
  mondaySyncEnabled, setMondaySyncEnabled,
  mondaySyncColId, setMondaySyncColId,
  addLog, selectedProject,
  miscHardware, setMiscHardware,
}) {
  const [groupByPO, setGroupByPO] = useState(false);
  const misc = miscHardware || [];

  const allGroupsForProc = [
    ...cameraGroups.map(g  => ({ ...g, _cat: "camera",  _icon: "📷", _label: "CCTV",     _setter: setCameraGroups  })),
    ...switchGroups.map(g  => ({ ...g, _cat: "switch",  _icon: "🔀", _label: "Switch",    _setter: setSwitchGroups  })),
    ...serverGroups.map(g  => ({ ...g, _cat: "server",  _icon: "🖥", _label: "Server",    _setter: setServerGroups  })),
    ...doorGroups.map(g    => ({ ...g, _cat: "door",    _icon: "🚪", _label: "Access",    _setter: setDoorGroups    })),
    ...zoneGroups.map(g    => ({ ...g, _cat: "zone",    _icon: "🔔", _label: "Intrusion", _setter: setZoneGroups    })),
    ...speakerGroups.map(g => ({ ...g, _cat: "speaker", _icon: "🔊", _label: "Audio",     _setter: setSpeakerGroups })),
  ];

  const procCounts = PROC_STATUSES.map(s => ({
    ...s,
    count: [...allGroupsForProc, ...misc].filter(g => (g.procurementStatus || "not_ordered") === s.value).length,
  }));

  const vendorsInUse = [...new Set([...allGroupsForProc, ...misc].map(g => g.vendor).filter(Boolean))];
  const setGrpProc = (g, key, val) => updGrp(g._setter, g.id, key, val);
  const projectName = selectedProject?.name || "Project";

  // Sort by PO# grouping or default order
  const sortedGroups = groupByPO
    ? [...allGroupsForProc].sort((a, b) => (a.poNumber || "zzz").localeCompare(b.poNumber || "zzz"))
    : allGroupsForProc;

  // For PO grouping display
  const poGroups = {};
  if (groupByPO) {
    for (const g of sortedGroups) {
      const po = g.poNumber || "(No PO)";
      if (!poGroups[po]) poGroups[po] = [];
      poGroups[po].push(g);
    }
  }

  // Misc hardware handlers
  const addMiscItem = () => setMiscHardware([...misc, { id: uid(), description: "", brand: "", model: "", quantity: "1", vendor: "", poNumber: "", eta: "", trackingNumber: "", procurementStatus: "not_ordered" }]);
  const updateMisc = (id, k, v) => setMiscHardware(misc.map(m => m.id === id ? { ...m, [k]: v } : m));
  const removeMisc = (id) => setMiscHardware(misc.filter(m => m.id !== id));

  const renderRow = (g, i, isMisc = false) => {
    const status = g.procurementStatus || "not_ordered";
    const meta = procStatusMeta[status] || procStatusMeta["not_ordered"];
    const rowLabel = isMisc ? (g.description || "Misc Item") : (g.groupLabel || [g.brand, g.model].filter(Boolean).join(" ") || `${g._label} Group ${i + 1}`);
    const qty = isMisc ? (g.quantity || 1) : (g.devices?.length || parseInt(g.quantity) || "—");
    return (
      <tr key={g.id} className={`border-b border-border ${i % 2 === 0 ? "bg-white" : "bg-surface"} hover:bg-accent/[0.03] transition-colors`}>
        <td className="py-2 px-2.5 whitespace-nowrap">
          {isMisc ? (
            <span className="text-[10px] font-semibold text-muted">MISC</span>
          ) : (
            <>
              <span className="text-sm">{g._icon}</span>
              <span className="text-[10px] font-semibold text-muted ml-1">{g._label}</span>
            </>
          )}
        </td>
        <td className="py-2 px-2.5 font-semibold text-navy max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
          {isMisc ? (
            <input value={g.description || ""} onChange={e => updateMisc(g.id, "description", e.target.value)}
              placeholder="Item description" className="p-1 px-2 rounded border border-border text-[11px] bg-white text-navy w-full" />
          ) : rowLabel}
        </td>
        <td className="py-2 px-2.5 text-center font-semibold text-navy w-14">
          {isMisc ? (
            <input type="number" min="1" value={g.quantity || ""} onChange={e => updateMisc(g.id, "quantity", e.target.value)}
              className="p-1 rounded border border-border text-[11px] text-navy w-12 text-center" />
          ) : qty}
        </td>
        <td className="py-1.5 px-2 min-w-[130px]">
          <select value={status}
            onChange={e => { isMisc ? updateMisc(g.id, "procurementStatus", e.target.value) : (setGrpProc(g, "procurementStatus", e.target.value), addLog("procurement", `"${rowLabel}" → ${procStatusMeta[e.target.value]?.label}`)); }}
            className="py-1 px-2 rounded-md text-[11px] font-bold cursor-pointer w-full" style={{ border: `1.5px solid ${meta.color}`, background: meta.bg, color: meta.color }}>
            {PROC_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </td>
        <td className="py-1 px-1.5 min-w-[140px]">
          <select value={g.vendor || ""}
            onChange={e => isMisc ? updateMisc(g.id, "vendor", e.target.value) : setGrpProc(g, "vendor", e.target.value)}
            className="p-1 px-2 rounded border border-border text-[11px] bg-white text-navy w-full cursor-pointer">
            <option value="">— Vendor —</option>
            {VENDORS.map(v => <option key={v} value={v}>{v}</option>)}
            <option value="__other__">Other</option>
          </select>
        </td>
        <td className="py-1 px-1.5 min-w-[100px]">
          <input value={g.poNumber || ""} onChange={e => isMisc ? updateMisc(g.id, "poNumber", e.target.value) : setGrpProc(g, "poNumber", e.target.value)}
            placeholder="PO #" className="p-1 px-2 rounded border border-border text-[11px] bg-white text-navy w-full" />
        </td>
        <td className="py-1 px-1.5 min-w-[110px]">
          <input type="date" value={g.eta || ""} onChange={e => isMisc ? updateMisc(g.id, "eta", e.target.value) : setGrpProc(g, "eta", e.target.value)}
            className="p-1 px-2 rounded border border-border text-[11px] bg-white text-navy w-full" />
        </td>
        <td className="py-1 px-1.5 min-w-[120px]">
          <input value={g.trackingNumber || ""} onChange={e => isMisc ? updateMisc(g.id, "trackingNumber", e.target.value) : setGrpProc(g, "trackingNumber", e.target.value)}
            placeholder="Tracking" className="p-1 px-2 rounded border border-border text-[11px] bg-white text-navy w-full" />
        </td>
        {isMisc && (
          <td className="py-1 px-1.5">
            <button onClick={() => removeMisc(g.id)} className="text-danger/50 hover:text-danger bg-transparent border-none cursor-pointer"><X size={14} /></button>
          </td>
        )}
      </tr>
    );
  };

  return (
    <div>
      {/* Summary bar + Export */}
      <div className="flex gap-2.5 mb-4 flex-wrap items-end">
        {procCounts.map(s => (
          <div key={s.value} className="rounded-xl p-2.5 px-4 min-w-[100px] text-center" style={{ background: s.bg, border: `1.5px solid ${s.color}33` }}>
            <div className="text-xl font-extrabold" style={{ color: s.color }}>{s.count}</div>
            <div className="text-[10px] font-semibold whitespace-nowrap" style={{ color: s.color }}>{s.label}</div>
          </div>
        ))}
        <div className="ml-auto flex flex-col gap-1.5 items-end">
          <div className="text-[11px] text-muted font-medium">{allGroupsForProc.length + misc.length} total items</div>
          <div className="flex gap-1.5">
            <button onClick={() => exportProcurementCSV(allGroupsForProc, misc, projectName)}
              disabled={allGroupsForProc.length + misc.length === 0}
              className="bg-success text-white border-none rounded-lg py-1.5 px-3 text-[11px] font-semibold cursor-pointer" style={{ opacity: allGroupsForProc.length + misc.length === 0 ? 0.5 : 1 }}>
              Export All
            </button>
            {vendorsInUse.length > 0 && (
              <select value="" onChange={e => { if (e.target.value) exportVendorOrder(allGroupsForProc, misc, e.target.value, projectName); }}
                className="bg-accent text-white border-none rounded-lg py-1.5 px-2.5 text-[11px] font-semibold cursor-pointer">
                <option value="">Export by Vendor</option>
                {vendorsInUse.map(v => {
                  const count = [...allGroupsForProc, ...misc].filter(g => g.vendor === v).length;
                  return <option key={v} value={v}>{v} ({count})</option>;
                })}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Controls: Group by PO + Monday sync */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="bg-white rounded-xl border border-border p-3 px-4 flex items-center gap-3">
          <Tog label={<span className="text-[11px] font-semibold text-navy">Group by PO #</span>} val={groupByPO} set={setGroupByPO} />
        </div>
        <div className="bg-white rounded-xl border border-border p-3 px-4 flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-semibold text-navy">Monday.com Sync</span>
          <Tog label="" val={mondaySyncEnabled} set={v => { setMondaySyncEnabled(v); localStorage.setItem("mondaySyncEnabled", v); }} />
          {mondaySyncEnabled && (
            <input value={mondaySyncColId} onChange={e => { setMondaySyncColId(e.target.value); localStorage.setItem("mondaySyncColId", e.target.value); }}
              placeholder="Column ID" className="p-1 px-2 rounded-md border border-border text-[11px] w-36 text-navy bg-bg" />
          )}
        </div>
      </div>

      {/* Device Groups Table */}
      {allGroupsForProc.length === 0 && misc.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center text-muted text-sm">
          No device groups yet. Add groups under the hardware tabs, or add misc items below.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden mb-4">
          <div className="bg-gradient-to-r from-dark to-navy py-2.5 px-4 flex items-center gap-2.5">
            <span className="text-white font-semibold text-[13px]">Procurement Tracker</span>
            <span className="text-white/40 text-[11px]">{allGroupsForProc.length} groups</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-surface">
                  {["Cat", "Group / Model", "Qty", "Status", "Vendor", "PO #", "ETA", "Tracking"].map(h => (
                    <th key={h} className="py-2 px-2.5 text-left text-muted font-semibold text-[10px] uppercase tracking-wide border-b border-border whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupByPO ? (
                  Object.entries(poGroups).map(([po, items]) => (
                    <>
                      <tr key={`po-${po}`} className="bg-accent/[0.06]">
                        <td colSpan={8} className="py-1.5 px-3 text-[11px] font-bold text-accent">
                          PO: {po} <span className="font-normal text-muted ml-2">({items.length} item{items.length !== 1 ? "s" : ""})</span>
                        </td>
                      </tr>
                      {items.map((g, i) => renderRow(g, i))}
                    </>
                  ))
                ) : (
                  sortedGroups.map((g, i) => renderRow(g, i))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Misc Hardware Section */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="bg-steel py-2.5 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-[13px]">Misc Hardware</span>
            <span className="text-white/40 text-[11px]">{misc.length} items · not tied to device groups</span>
          </div>
          <button onClick={addMiscItem} className="bg-white/15 hover:bg-white/25 text-white border-none rounded-lg px-3 py-1 text-[11px] font-semibold cursor-pointer flex items-center gap-1">
            <Plus size={12} /> Add Item
          </button>
        </div>
        {misc.length === 0 ? (
          <div className="p-6 text-center text-muted text-xs">
            Add standalone hardware items that aren't tied to any device group (cables, misc supplies, tools, etc.)
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-surface">
                  {["", "Description", "Qty", "Status", "Vendor", "PO #", "ETA", "Tracking", ""].map(h => (
                    <th key={h} className="py-2 px-2.5 text-left text-muted font-semibold text-[10px] uppercase tracking-wide border-b border-border whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {misc.map((m, i) => renderRow(m, i, true))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
