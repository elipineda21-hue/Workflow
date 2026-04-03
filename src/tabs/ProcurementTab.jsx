import { C } from "../constants";
import { updGrp } from "../models";
import { Tog } from "../components/ui";

const PROC_STATUSES = [
  { value: "not_ordered", label: "Not Ordered", color: C.muted,   bg: "#F1F5F9" },
  { value: "ordered",     label: "Ordered",     color: C.accent,  bg: "#E0F2FE" },
  { value: "in_transit",  label: "In Transit",  color: C.gold,    bg: "#FEF3C7" },
  { value: "received",    label: "Received",    color: "#059669", bg: "#D1FAE5" },
  { value: "in_house",    label: "In House",    color: C.success, bg: "#ECFDF5" },
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
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "flex-end" }}>
        {procCounts.map(s => (
          <div key={s.value} style={{ background: s.bg, border: `1.5px solid ${s.color}33`, borderRadius: 10, padding: "10px 18px", minWidth: 100, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: s.color, whiteSpace: "nowrap" }}>{s.label}</div>
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{allGroupsForProc.length} total groups</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => exportProcurementCSV(allGroupsForProc, projectName)}
              disabled={allGroupsForProc.length === 0}
              style={{ background: C.success, color: C.white, border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: allGroupsForProc.length === 0 ? 0.5 : 1 }}>
              ⬇ Export All
            </button>
            {vendorsInUse.length > 0 && (
              <select
                value=""
                onChange={e => { if (e.target.value) exportVendorOrder(allGroupsForProc, e.target.value, projectName); }}
                style={{ background: C.gold, color: C.navy, border: "none", borderRadius: 6, padding: "7px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
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
      <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>📅 Monday.com Write-back</span>
        <Tog label="Auto-push status after save" val={mondaySyncEnabled} set={v => { setMondaySyncEnabled(v); localStorage.setItem("mondaySyncEnabled", v); }} />
        {mondaySyncEnabled && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Status Column ID:</label>
              <input value={mondaySyncColId} onChange={e => { setMondaySyncColId(e.target.value); localStorage.setItem("mondaySyncColId", e.target.value); }}
                placeholder="e.g. status or text_abc123"
                style={{ padding: "4px 8px", borderRadius: 5, border: `1px solid ${C.border}`, fontSize: 12, width: 180, color: C.navy, background: C.bg }} />
            </div>
            <span style={{ fontSize: 11, color: C.muted }}>Find column ID in ⚙ Column Map on the project select screen</span>
          </>
        )}
      </div>

      {/* Group table */}
      {allGroupsForProc.length === 0 ? (
        <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 40, textAlign: "center", color: C.muted }}>
          No device groups yet. Add groups under the CCTV, Access, etc. tabs then track them here.
        </div>
      ) : (
        <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{ background: C.navy, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>📦</span>
            <span style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>Device Group Procurement Tracker</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginLeft: 4 }}>{allGroupsForProc.length} groups</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.surface }}>
                  {["Cat","Group / Model","Qty","Status","Vendor","PO #","ETA","Tracking #"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allGroupsForProc.map((g, i) => {
                  const status   = g.procurementStatus || "not_ordered";
                  const meta     = procStatusMeta[status] || procStatusMeta["not_ordered"];
                  const rowLabel = g.groupLabel || [g.brand, g.model].filter(Boolean).join(" ") || `${g._label} Group ${i + 1}`;
                  const qty      = g.devices.length || parseInt(g.quantity) || "—";
                  const inpSt    = { padding: "5px 8px", borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 11, background: C.white, color: C.navy, outline: "none", width: "100%", boxSizing: "border-box" };
                  return (
                    <tr key={g.id} style={{ background: i % 2 === 0 ? C.white : C.surface, borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 15 }}>{g._icon}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginLeft: 4 }}>{g._label}</span>
                      </td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: C.navy, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rowLabel}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: C.navy }}>{qty}</td>
                      <td style={{ padding: "6px 8px", minWidth: 140 }}>
                        <select value={status}
                          onChange={e => { setGrpProc(g, "procurementStatus", e.target.value); addLog("procurement", `"${rowLabel}" → ${procStatusMeta[e.target.value]?.label || e.target.value}`); }}
                          style={{ padding: "4px 8px", borderRadius: 6, border: `1.5px solid ${meta.color}`, background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 700, cursor: "pointer", width: "100%" }}>
                          {PROC_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "4px 6px", minWidth: 150 }}>
                        <select value={g.vendor || ""}
                          onChange={e => setGrpProc(g, "vendor", e.target.value)}
                          style={{ ...inpSt, cursor: "pointer" }}>
                          <option value="">— Select Vendor —</option>
                          {VENDORS.map(v => <option key={v} value={v}>{v}</option>)}
                          <option value="__other__">Other (type below)</option>
                        </select>
                        {g.vendor === "__other__" && (
                          <input value={g.vendorCustom || ""} onChange={e => setGrpProc(g, "vendorCustom", e.target.value)}
                            onBlur={e => { if (e.target.value.trim()) setGrpProc(g, "vendor", e.target.value.trim()); }}
                            placeholder="Enter vendor name, then click away"
                            style={{ ...inpSt, marginTop: 4 }} />
                        )}
                      </td>
                      <td style={{ padding: "4px 6px", minWidth: 110 }}>
                        <input value={g.poNumber || ""} onChange={e => setGrpProc(g, "poNumber", e.target.value)} placeholder="PO-00000" style={inpSt} />
                      </td>
                      <td style={{ padding: "4px 6px", minWidth: 120 }}>
                        <input type="date" value={g.eta || ""} onChange={e => setGrpProc(g, "eta", e.target.value)} style={{ ...inpSt, colorScheme: "light" }} />
                      </td>
                      <td style={{ padding: "4px 6px", minWidth: 140 }}>
                        <input value={g.trackingNumber || ""} onChange={e => setGrpProc(g, "trackingNumber", e.target.value)} placeholder="1Z…" style={inpSt} />
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
