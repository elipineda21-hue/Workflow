import { C, SOP_VLANS, SOP_SSIDS, SOP_FIREWALL } from "../constants";
import { CardHead, G, F, Inp, Sel, Tog, SectionLabel } from "./ui";

export default function NetworkTab({ networkConfig, setNetworkConfig, sitePrefix }) {
  const cfg = networkConfig;
  const useDefaults = cfg.useDefaults;
  const fw = cfg.firewall || { rows: SOP_FIREWALL.rows, cols: SOP_FIREWALL.cols, matrix: SOP_FIREWALL.matrix.map(r => [...r]) };
  const set = (k, v) => setNetworkConfig(s => ({ ...s, [k]: v }));
  const setVlan = (idx, k, v) => setNetworkConfig(s => {
    const vlans = [...s.vlans];
    vlans[idx] = { ...vlans[idx], [k]: v };
    return { ...s, vlans };
  });
  const setSsid = (idx, k, v) => setNetworkConfig(s => {
    const ssids = [...s.ssids];
    ssids[idx] = { ...ssids[idx], [k]: v };
    return { ...s, ssids };
  });

  // Generate SSID names from site prefix
  const resolveSsid = (pattern) => {
    const prefix = sitePrefix || "SITE";
    return pattern.replace("[SITE]", prefix);
  };

  const inpSt = { padding: "5px 8px", borderRadius: 4, border: `1.5px solid ${C.border}`, fontSize: 11, background: C.white, color: C.navy, outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div>
      {/* Mode Toggle */}
      <div className="bg-white rounded-xl border border-border overflow-hidden mb-4">
        <div className="bg-navy px-[18px] py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-[18px]">🌐</span>
            <span className="text-white font-extrabold text-sm">Network Configuration</span>
          </div>
          <div className="flex items-center gap-3.5">
            <Tog label={<span className="text-white text-xs">Use Calidad SOP Defaults</span>} val={useDefaults} set={v => {
              if (v) {
                // Reset to SOP defaults
                set("useDefaults", true);
                set("vlans", SOP_VLANS.map(v => ({ ...v })));
                set("ssids", SOP_SSIDS.map(s => ({ ...s })));
                set("firewall", { rows: SOP_FIREWALL.rows, cols: SOP_FIREWALL.cols, matrix: SOP_FIREWALL.matrix.map(r => [...r]) });
              } else {
                set("useDefaults", false);
              }
            }} />
          </div>
        </div>
        <div className="p-4">
          <div className={`${useDefaults ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEF3C7] text-[#92400E]'} rounded-lg px-3.5 py-2.5 text-xs mb-3`}>
            {useDefaults
              ? "Using Calidad SOP standard network template. VLANs, subnets, and firewall rules follow the standard deployment spec."
              : "Custom mode — enter the customer's required network ranges below. All fields are editable."}
          </div>
          <G cols={3}>
            <F label="Site Prefix (for SSIDs)">
              <Inp value={cfg.sitePrefix || ""} onChange={e => set("sitePrefix", e.target.value)} placeholder="e.g. NAT3" />
            </F>
            <F label="Router Model">
              <Inp value={cfg.routerModel || ""} onChange={e => set("routerModel", e.target.value)} placeholder="e.g. UniFi Dream Machine Pro" />
            </F>
            <F label="AP Count">
              <Inp type="number" value={cfg.apCount || ""} onChange={e => set("apCount", e.target.value)} placeholder="e.g. 13" />
            </F>
            <F label="ISP / Circuit ID">
              <Inp value={cfg.isp || ""} onChange={e => set("isp", e.target.value)} placeholder="e.g. Comcast / CKT-12345" />
            </F>
            <F label="Primary IT Contact">
              <Inp value={cfg.itContact || ""} onChange={e => set("itContact", e.target.value)} placeholder="e.g. John Doe / (916) 555-0100" />
            </F>
            <F label="Controller Type">
              <Sel value={cfg.controllerType || "cloud"} onChange={e => set("controllerType", e.target.value)}>
                <option value="cloud">Cloud (UniFi)</option>
                <option value="onsite">On-Site Controller</option>
                <option value="other">Other</option>
              </Sel>
            </F>
          </G>
        </div>
      </div>

      {/* VLAN Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden mb-4">
        <CardHead icon="🔗" title="VLAN & Subnet Configuration" count={cfg.vlans.length} color={C.navy} />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-surface">
                {["Network Name", "VLAN ID", "Subnet", "DHCP", "Pool Size", "Purpose"].map(h => (
                  <th key={h} className="px-2.5 py-2 text-left text-muted font-bold text-[10px] uppercase tracking-[0.06em] border-b border-border whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cfg.vlans.map((vlan, i) => (
                <tr key={vlan.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-surface'} border-b border-border`}>
                  <td className="px-2.5 py-1.5 font-bold text-navy">
                    {useDefaults ? vlan.name : (
                      <input value={vlan.name} onChange={e => setVlan(i, "name", e.target.value)} style={inpSt} />
                    )}
                  </td>
                  <td className="px-2.5 py-1.5">
                    {useDefaults ? (
                      <span className="bg-accent/[0.13] text-accent rounded-md px-2 py-0.5 font-bold text-[11px]">{vlan.vlanId}</span>
                    ) : (
                      <input value={vlan.vlanId} onChange={e => setVlan(i, "vlanId", e.target.value)} style={{ ...inpSt, width: 60 }} />
                    )}
                  </td>
                  <td className="px-2.5 py-1.5 font-mono text-[11px]">
                    {useDefaults ? vlan.subnet : (
                      <input value={vlan.subnet} onChange={e => setVlan(i, "subnet", e.target.value)} style={{ ...inpSt, width: 150 }} />
                    )}
                  </td>
                  <td className="px-2.5 py-1.5 text-center">
                    <span className={`${vlan.dhcp ? 'text-success' : 'text-muted'} font-bold text-[11px]`}>{vlan.dhcp ? "✓" : "—"}</span>
                  </td>
                  <td className="px-2.5 py-1.5 text-center font-bold text-navy">
                    {useDefaults ? vlan.poolSize : (
                      <input type="number" value={vlan.poolSize} onChange={e => setVlan(i, "poolSize", e.target.value)} style={{ ...inpSt, width: 70, textAlign: "center" }} />
                    )}
                  </td>
                  <td className="px-2.5 py-1.5 text-muted text-[11px] max-w-[250px]">
                    {vlan.purpose}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {cfg.vlans.length > 0 && (
          <div className="px-3.5 py-2 bg-surface border-t border-border text-[11px] text-muted">
            VMS VLAN uses /23 (500 addresses) for large camera deployments. All others use /24 (249 usable).
          </div>
        )}
      </div>

      {/* SSID Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden mb-4">
        <CardHead icon="📶" title="Wireless (WiFi) Configuration" count={cfg.ssids.length} color={C.steel} />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-surface">
                {["SSID Name", "Mapped Network", "Radio Band", "Security", "Password"].map(h => (
                  <th key={h} className="px-2.5 py-2 text-left text-muted font-bold text-[10px] uppercase tracking-[0.06em] border-b border-border whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cfg.ssids.map((ssid, i) => (
                <tr key={ssid.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-surface'} border-b border-border`}>
                  <td className="px-2.5 py-1.5 font-bold text-navy font-mono text-xs">
                    {resolveSsid(ssid.pattern)}
                  </td>
                  <td className="px-2.5 py-1.5">
                    <span className="bg-accent/[0.09] text-accent rounded-md px-2 py-0.5 font-bold text-[11px]">{ssid.mappedVlan}</span>
                  </td>
                  <td className="px-2.5 py-1.5 text-muted text-[11px]">{ssid.band}</td>
                  <td className="px-2.5 py-1.5">
                    {useDefaults ? (
                      <span className="text-[11px] font-semibold text-navy">{ssid.security}</span>
                    ) : (
                      <select value={ssid.security} onChange={e => setSsid(i, "security", e.target.value)}
                        style={{ ...inpSt, width: 120 }}>
                        <option>WPA2/WPA3</option>
                        <option>WPA2</option>
                        <option>WPA3</option>
                      </select>
                    )}
                  </td>
                  <td className="px-2.5 py-1.5">
                    <input value={ssid.password || ""} onChange={e => setSsid(i, "password", e.target.value)}
                      placeholder="••••••••" type="password" style={{ ...inpSt, width: 140 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3.5 py-2 bg-surface border-t border-border text-[11px] text-muted">
          SSIDs auto-generate from site prefix: <strong>{cfg.sitePrefix || "[SITE]"}</strong>-STAFF, <strong>{cfg.sitePrefix || "[SITE]"}</strong>-GUEST, etc. SEC-FAILOVER broadcasts on all APs as backup for alarm panels.
        </div>
      </div>

      {/* Firewall Matrix */}
      <div className="bg-white rounded-xl border border-border overflow-hidden mb-4">
        <CardHead icon="🛡" title="Inter-VLAN Firewall Rules" color={C.steel} />
        <div className="px-3.5 py-2.5 bg-surface border-b border-border text-[11px] text-muted flex justify-between items-center">
          <span>Default-deny model: all inter-VLAN traffic is blocked unless explicitly allowed. <strong>Click a cell</strong> to toggle ALLOW / DENY.</span>
          <button onClick={() => set("firewall", { rows: SOP_FIREWALL.rows, cols: SOP_FIREWALL.cols, matrix: SOP_FIREWALL.matrix.map(r => [...r]) })}
            className="bg-steel text-white border-none rounded-[5px] px-3 py-1 text-[10px] font-bold cursor-pointer whitespace-nowrap">
            ↻ Reset to SOP Defaults
          </button>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="border-collapse text-[11px] mx-auto">
            <thead>
              <tr>
                <th className="px-2.5 py-1.5 bg-navy text-white font-bold text-[10px] rounded-tl-md">From ↓ \ To →</th>
                {fw.cols.map(col => (
                  <th key={col} className="px-2.5 py-1.5 bg-navy text-white/80 font-bold text-[10px] whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fw.rows.map((row, ri) => (
                <tr key={row}>
                  <td className="px-2.5 py-1.5 font-bold text-navy bg-surface whitespace-nowrap border-b border-border">{row}</td>
                  {fw.matrix[ri].map((cell, ci) => {
                    const isDiag = cell === "—";
                    const bg = cell === "ALLOW" ? "#D1FAE5" : cell === "DENY" ? "#FEE2E2" : C.surface;
                    const color = cell === "ALLOW" ? "#065F46" : cell === "DENY" ? "#991B1B" : C.muted;
                    return (
                      <td key={ci}
                        onClick={() => {
                          if (isDiag) return;
                          const newVal = cell === "ALLOW" ? "DENY" : "ALLOW";
                          setNetworkConfig(s => {
                            const currentFw = s.firewall || { rows: SOP_FIREWALL.rows, cols: SOP_FIREWALL.cols, matrix: SOP_FIREWALL.matrix.map(r => [...r]) };
                            const newMatrix = currentFw.matrix.map(r => [...r]);
                            newMatrix[ri][ci] = newVal;
                            return { ...s, firewall: { ...currentFw, matrix: newMatrix } };
                          });
                        }}
                        style={{
                          background: bg, color,
                          cursor: isDiag ? "default" : "pointer",
                        }}
                        className="px-2.5 py-1.5 text-center font-bold text-[10px] border-b border-border border-l border-l-border select-none transition-[background] duration-150"
                        title={isDiag ? "" : `Click to toggle ${cell === "ALLOW" ? "DENY" : "ALLOW"}`}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3.5 py-2.5 bg-surface border-t border-border text-[11px] text-muted">
          <strong>Guest (VLAN 20)</strong> — fully isolated, internet only. <strong>Intrusion (VLAN 50)</strong> — fully isolated, outbound-only for cloud reporting.
          Employee can reach AV + VMS for display control and camera viewing.
        </div>
      </div>

      {/* Deployment Checklist */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <CardHead icon="✅" title="Deployment Checklist" color={C.steel} />
        <div className="p-4">
          {[
            { section: "Pre-Deployment", items: [
              "ISP circuit active and handoff location confirmed",
              "AP mounting locations and Ethernet drops complete",
              "All site-specific template fields filled in above",
              "UniFi controller accessible (cloud or on-site)",
            ]},
            { section: "Network Configuration", items: [
              "Gateway adopted into UniFi controller",
              "All 6 VLANs created with correct subnets",
              "DHCP enabled on each VLAN with correct pool range",
              "All 5 SSIDs created with correct VLAN mappings",
              "All access points adopted and provisioned",
              "Inter-VLAN firewall rules configured per matrix above",
            ]},
            { section: "Validation", items: [
              "Device on each SSID gets IP in correct subnet",
              "Employee VLAN can reach AV and VMS devices",
              "Guest VLAN has internet but no internal access",
              "Intrusion VLAN has cloud reporting, all other VLANs blocked",
              "AP channels and signal strength verified with WiFi analyzer",
            ]},
          ].map(sec => (
            <div key={sec.section} className="mb-3.5">
              <div className="text-[11px] font-extrabold text-steel uppercase tracking-[0.08em] mb-1.5">{sec.section}</div>
              {sec.items.map((item, i) => {
                const key = `${sec.section}_${i}`;
                const checked = cfg.checklist?.[key] || false;
                return (
                  <label key={key} className={`flex items-center gap-2 py-[5px] cursor-pointer text-xs ${checked ? 'text-success' : 'text-navy'}`}>
                    <input type="checkbox" checked={checked}
                      onChange={e => setNetworkConfig(s => ({ ...s, checklist: { ...(s.checklist || {}), [key]: e.target.checked } }))}
                      className="w-[15px] h-[15px] accent-success" />
                    <span className={checked ? 'line-through' : ''}>{item}</span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
