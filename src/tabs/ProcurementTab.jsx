import { updGrp } from "../models";
import { Tog } from "../components/ui";

const PROC_STATUSES = [
  { value: "not_ordered", label: "Not Ordered", color: "#6B7E96", bg: "#F1F5F9" },
  { value: "ordered",     label: "Ordered",     color: "#00AEEF", bg: "#E0F2FE" },
  { value: "in_transit",  label: "In Transit",  color: "#F4A300", bg: "#FEF3C7" },
  { value: "received",    label: "Received",    color: "#059669", bg: "#D1FAE5" },
  { value: "in_house",    label: "In House",    color: "#10B981", bg: "#ECFDF5" },
];
const procStatusMeta = Object.fromEntries(PROC_STATUSES.map(s => [s.value, s]));

const VENDORS = [
  "Anixter", "Alarm.com", "ENS", "ADI", "IML", "Cable Connections",
  "Connect Concepts", "Platt", "Home Depot", "All Star Cable",
  "Brivo", "Avigilon",
];

function exportProcurementCSV(groups, projectName) {
  const esc = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
  const headers = ["Status", "Category", "Group / Model", "Brand", "Model", "Qty", "Vendor", "PO #", "ETA", "Tracking #"];
  const rows = [headers.map(esc).join(",")];

  const statusOrder = ["not_ordered", "ordered", "in_transit", "received", "in_house"];
  const sorted = [...groups].sort((a, b) => {
    const ai = statusOrder.indexOf(a.procurementStatus || "not_ordered");
    const bi = statusOrder.indexOf(b.procurementStatus || "not_ordered");
    return ai - bi;
  });

  for (const g of sorted) {
    const label = g.groupLabel || [g.brand, g.model].filter(Boolean).join(" ") || `${g._label} Group`;
    const qty = g.devices.length || parseInt(g.quantity) || 1;
    const status = procStatusMeta[g.procurementStatus || "not_ordered"]?.label || "Not Ordered";
    rows.push([esc(status), esc(g._label), esc(label), esc(g.brand), esc(g.model), esc(qty), esc(g.vendor), esc(g.poNumber), esc(g.eta), esc(g.trackingNumber)].join(","));
  }

  const csv = rows.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Procurement_${(projectName || "Project").replace(/\s+/g, "_").substring(0, 40)}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportVendorOrder(groups, vendor, projectName) {
  const esc = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
  const vendorGroups = groups.filter(g => g.vendor === vendor);
  if (!vendorGroups.length) return;

  const headers = ["Brand", "Model", "Description", "Qty", "PO #", "Status", "ETA"];
  const rows = [headers.map(esc).join(",")];

  for (const g of vendorGroups) {
    const label = g.groupLabel || [g.brand, g.model].filter(Boolean).join(" ") || "";
    const qty = g.devices.length || parseInt(g.quantity) || 1;
    const status = procStatusMeta[g.procurementStatus || "not_ordered"]?.label || "Not Ordered";
    rows.push([esc(g.brand), esc(g.model), esc(label), esc(qty), esc(g.poNumber), esc(status), esc(g.eta)].join(","));
  }

  const csv = rows.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Order_${vendor.replace(/\s+/g, "_")}_${(projectName || "Project").replace(/\s+/g, "_").substring(0, 30)}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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
}) {
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
    count: allGroupsForProc.filter(g => (g.procurementStatus || "not_ordered") === s.value).length,
  }));

  // Unique vendors in use
  const vendorsInUse = [...new Set(allGroupsForProc.map(g => g.vendor).filter(Boolean))];

  const setGrpProc = (g, key, val) => updGrp(g._setter, g.id, key, val);
  const projectName = selectedProject?.name || "Project";

  return (
    <div>
      {/* Summary bar + Export */}
      <div className="flex gap-2.5 mb-4 flex-wrap items-end">
        {procCounts.map(s => (
          <div key={s.value} className="rounded-xl p-2.5 px-4 min-w-[100px] text-center" style={{ background: s.bg, border: `1.5px solid ${s.color}33` }}>
            <div className="text-[22px] font-extrabold" style={{ color: s.color }}>{s.count}</div>
            <div className="text-[11px] font-bold whitespace-nowrap" style={{ color: s.color }}>{s.label}</div>
          </div>
        ))}
        <div className="ml-auto flex flex-col gap-1.5 items-end">
          <div className="text-xs text-muted font-semibold">{allGroupsForProc.length} total groups</div>
          <div className="flex gap-1.5">
            <button onClick={() => exportProcurementCSV(allGroupsForProc, projectName)}
              disabled={allGroupsForProc.length === 0}
              className="bg-success text-white border-none rounded-md py-[7px] px-3.5 text-[11px] font-bold cursor-pointer" style={{ opacity: allGroupsForProc.length === 0 ? 0.5 : 1 }}>
              ⬇ Export All
            </button>
            {vendorsInUse.length > 0 && (
              <select
                value=""
                onChange={e => { if (e.target.value) exportVendorOrder(allGroupsForProc, e.target.value, projectName); }}
                className="bg-gold text-navy border-none rounded-md py-[7px] px-2.5 text-[11px] font-bold cursor-pointer">
                <option value="">⬇ Export by Vendor</option>
                {vendorsInUse.map(v => {
                  const count = allGroupsForProc.filter(g => g.vendor === v).length;
                  return <option key={v} value={v}>{v} ({count} items)</option>;
                })}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Monday sync settings */}
      <div className="bg-white rounded-xl border border-border p-3.5 px-4 mb-4 flex items-center gap-3.5 flex-wrap">
        <span className="text-[13px] font-bold text-navy">📅 Monday.com Write-back</span>
        <Tog label="Auto-push status after save" val={mondaySyncEnabled} set={v => { setMondaySyncEnabled(v); localStorage.setItem("mondaySyncEnabled", v); }} />
        {mondaySyncEnabled && (
          <>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-muted">Status Column ID:</label>
              <input value={mondaySyncColId} onChange={e => { setMondaySyncColId(e.target.value); localStorage.setItem("mondaySyncColId", e.target.value); }}
                placeholder="e.g. status or text_abc123"
                className="p-1 px-2 rounded-[5px] border border-border text-xs w-[180px] text-navy bg-bg" />
            </div>
            <span className="text-[11px] text-muted">Find column ID in ⚙ Column Map on the project select screen</span>
          </>
        )}
      </div>

      {/* Group table */}
      {allGroupsForProc.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center text-muted">
          No device groups yet. Add groups under the CCTV, Access, etc. tabs then track them here.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="bg-navy py-2.5 px-4 flex items-center gap-2.5">
            <span className="text-[18px]">📦</span>
            <span className="text-white font-bold text-[13px]">Device Group Procurement Tracker</span>
            <span className="text-white/50 text-[11px] ml-1">{allGroupsForProc.length} groups</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-surface">
                  {["Cat","Group / Model","Qty","Status","Vendor","PO #","ETA","Tracking #"].map(h => (
                    <th key={h} className="py-2 px-2.5 text-left text-muted font-bold text-[10px] uppercase tracking-wide border-b border-border whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allGroupsForProc.map((g, i) => {
                  const status   = g.procurementStatus || "not_ordered";
                  const meta     = procStatusMeta[status] || procStatusMeta["not_ordered"];
                  const rowLabel = g.groupLabel || [g.brand, g.model].filter(Boolean).join(" ") || `${g._label} Group ${i + 1}`;
                  const qty      = g.devices.length || parseInt(g.quantity) || "—";
                  return (
                    <tr key={g.id} className={`border-b border-border ${i % 2 === 0 ? "bg-white" : "bg-surface"}`}>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <span className="text-[15px]">{g._icon}</span>
                        <span className="text-[10px] font-bold text-muted ml-1">{g._label}</span>
                      </td>
                      <td className="py-2 px-2.5 font-bold text-navy max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">{rowLabel}</td>
                      <td className="py-2 px-2.5 text-center font-bold text-navy">{qty}</td>
                      <td className="py-1.5 px-2 min-w-[140px]">
                        <select value={status}
                          onChange={e => { setGrpProc(g, "procurementStatus", e.target.value); addLog("procurement", `"${rowLabel}" → ${procStatusMeta[e.target.value]?.label || e.target.value}`); }}
                          className="py-1 px-2 rounded-md text-[11px] font-bold cursor-pointer w-full" style={{ border: `1.5px solid ${meta.color}`, background: meta.bg, color: meta.color }}>
                          {PROC_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </td>
                      <td className="py-1 px-1.5 min-w-[150px]">
                        <select value={g.vendor || ""}
                          onChange={e => setGrpProc(g, "vendor", e.target.value)}
                          className="p-[5px] px-2 rounded border border-border text-[11px] bg-white text-navy outline-none w-full box-border cursor-pointer">
                          <option value="">— Select Vendor —</option>
                          {VENDORS.map(v => <option key={v} value={v}>{v}</option>)}
                          <option value="__other__">Other (type below)</option>
                        </select>
                        {g.vendor === "__other__" && (
                          <input value={g.vendorCustom || ""} onChange={e => setGrpProc(g, "vendorCustom", e.target.value)}
                            onBlur={e => { if (e.target.value.trim()) setGrpProc(g, "vendor", e.target.value.trim()); }}
                            placeholder="Enter vendor name, then click away"
                            className="p-[5px] px-2 rounded border border-border text-[11px] bg-white text-navy outline-none w-full box-border mt-1" />
                        )}
                      </td>
                      <td className="py-1 px-1.5 min-w-[110px]">
                        <input value={g.poNumber || ""} onChange={e => setGrpProc(g, "poNumber", e.target.value)} placeholder="PO-00000" className="p-[5px] px-2 rounded border border-border text-[11px] bg-white text-navy outline-none w-full box-border" />
                      </td>
                      <td className="py-1 px-1.5 min-w-[120px]">
                        <input type="date" value={g.eta || ""} onChange={e => setGrpProc(g, "eta", e.target.value)} className="p-[5px] px-2 rounded border border-border text-[11px] bg-white text-navy outline-none w-full box-border" style={{ colorScheme: "light" }} />
                      </td>
                      <td className="py-1 px-1.5 min-w-[140px]">
                        <input value={g.trackingNumber || ""} onChange={e => setGrpProc(g, "trackingNumber", e.target.value)} placeholder="1Z…" className="p-[5px] px-2 rounded border border-border text-[11px] bg-white text-navy outline-none w-full box-border" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
