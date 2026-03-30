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
      <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ background: C.navy, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>🌐</span>
            <span style={{ color: C.white, fontWeight: 800, fontSize: 14 }}>Network Configuration</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Tog label={<span style={{ color: C.white, fontSize: 12 }}>Use Calidad SOP Defaults</span>} val={useDefaults} set={v => {
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
        <div style={{ padding: 16 }}>
          <div style={{ background: useDefaults ? "#D1FAE5" : "#FEF3C7", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: useDefaults ? "#065F46" : "#92400E", marginBottom: 12 }}>
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
      <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 16 }}>
        <CardHead icon="🔗" title="VLAN & Subnet Configuration" count={cfg.vlans.length} color={C.navy} />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.surface }}>
                {["Network Name", "VLAN ID", "Subnet", "DHCP", "Pool Size", "Purpose"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cfg.vlans.map((vlan, i) => (
                <tr key={vlan.id} style={{ background: i % 2 === 0 ? C.white : C.surface, borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "6px 10px", fontWeight: 700, color: C.navy }}>
                    {useDefaults ? vlan.name : (
                      <input value={vlan.name} onChange={e => setVlan(i, "name", e.target.value)} style={inpSt} />
                    )}
                  </td>
                  <td style={{ padding: "6px 10px" }}>
                    {useDefaults ? (
                      <span style={{ background: C.accent + "22", color: C.accent, borderRadius: 6, padding: "2px 8px", fontWeight: 700, fontSize: 11 }}>{vlan.vlanId}</span>
                    ) : (
                      <input value={vlan.vlanId} onChange={e => setVlan(i, "vlanId", e.target.value)} style={{ ...inpSt, width: 60 }} />
                    )}
                  </td>
                  <td style={{ padding: "6px 10px", fontFamily: "monospace", fontSize: 11 }}>
                    {useDefaults ? vlan.subnet : (
                      <input value={vlan.subnet} onChange={e => setVlan(i, "subnet", e.target.value)} style={{ ...inpSt, width: 150 }} />
                    )}
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "center" }}>
                    <span style={{ color: vlan.dhcp ? C.success : C.muted, fontWeight: 700, fontSize: 11 }}>{vlan.dhcp ? "✓" : "—"}</span>
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700, color: C.navy }}>
                    {useDefaults ? vlan.poolSize : (
                      <input type="number" value={vlan.poolSize} onChange={e => setVlan(i, "poolSize", e.target.value)} style={{ ...inpSt, width: 70, textAlign: "center" }} />
                    )}
                  </td>
                  <td style={{ padding: "6px 10px", color: C.muted, fontSize: 11, maxWidth: 250 }}>
                    {vlan.purpose}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {cfg.vlans.length > 0 && (
          <div style={{ padding: "8px 14px", background: C.surface, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.muted }}>
            VMS VLAN uses /23 (500 addresses) for large camera deployments. All others use /24 (249 usable).
          </div>
        )}
      </div>

      {/* SSID Table */}
      <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 16 }}>
        <CardHead icon="📶" title="Wireless (WiFi) Configuration" count={cfg.ssids.length} color={C.steel} />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.surface }}>
                {["SSID Name", "Mapped Network", "Radio Band", "Security", "Password"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cfg.ssids.map((ssid, i) => (
                <tr key={ssid.id} style={{ background: i % 2 === 0 ? C.white : C.surface, borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "6px 10px", fontWeight: 700, color: C.navy, fontFamily: "monospace", fontSize: 12 }}>
                    {resolveSsid(ssid.pattern)}
                  </td>
                  <td style={{ padding: "6px 10px" }}>
                    <span style={{ background: C.accent + "18", color: C.accent, borderRadius: 6, padding: "2px 8px", fontWeight: 700, fontSize: 11 }}>{ssid.mappedVlan}</span>
                  </td>
                  <td style={{ padding: "6px 10px", color: C.muted, fontSize: 11 }}>{ssid.band}</td>
                  <td style={{ padding: "6px 10px" }}>
                    {useDefaults ? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.navy }}>{ssid.security}</span>
                    ) : (
                      <select value={ssid.security} onChange={e => setSsid(i, "security", e.target.value)}
                        style={{ ...inpSt, width: 120 }}>
                        <option>WPA2/WPA3</option>
                        <option>WPA2</option>
                        <option>WPA3</option>
                      </select>
                    )}
                  </td>
                  <td style={{ padding: "6px 10px" }}>
                    <input value={ssid.password || ""} onChange={e => setSsid(i, "password", e.target.value)}
                      placeholder="••••••••" type="password" style={{ ...inpSt, width: 140 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "8px 14px", background: C.surface, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.muted }}>
          SSIDs auto-generate from site prefix: <strong>{cfg.sitePrefix || "[SITE]"}</strong>-STAFF, <strong>{cfg.sitePrefix || "[SITE]"}</strong>-GUEST, etc. SEC-FAILOVER broadcasts on all APs as backup for alarm panels.
        </div>
      </div>

      {/* Firewall Matrix */}
      <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 16 }}>
        <CardHead icon="🛡" title="Inter-VLAN Firewall Rules" color={C.steel} />
        <div style={{ padding: "10px 14px", background: C.surface, borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.muted, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Default-deny model: all inter-VLAN traffic is blocked unless explicitly allowed. <strong>Click a cell</strong> to toggle ALLOW / DENY.</span>
          <button onClick={() => set("firewall", { rows: SOP_FIREWALL.rows, cols: SOP_FIREWALL.cols, matrix: SOP_FIREWALL.matrix.map(r => [...r]) })}
            style={{ background: C.steel, color: C.white, border: "none", borderRadius: 5, padding: "4px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            ↻ Reset to SOP Defaults
          </button>
        </div>
        <div style={{ overflowX: "auto", padding: 16 }}>
          <table style={{ borderCollapse: "collapse", fontSize: 11, margin: "0 auto" }}>
            <thead>
              <tr>
                <th style={{ padding: "6px 10px", background: C.navy, color: C.white, fontWeight: 700, fontSize: 10, borderRadius: "6px 0 0 0" }}>From ↓ \ To →</th>
                {fw.cols.map(col => (
                  <th key={col} style={{ padding: "6px 10px", background: C.navy, color: "rgba(255,255,255,0.8)", fontWeight: 700, fontSize: 10, whiteSpace: "nowrap" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fw.rows.map((row, ri) => (
                <tr key={row}>
                  <td style={{ padding: "6px 10px", fontWeight: 700, color: C.navy, background: C.surface, whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}` }}>{row}</td>
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
                            const newMatrix = s.firewall.matrix.map(r => [...r]);
                            newMatrix[ri][ci] = newVal;
                            return { ...s, firewall: { ...s.firewall, matrix: newMatrix } };
                          });
                        }}
                        style={{
                          padding: "6px 10px", textAlign: "center", fontWeight: 700, fontSize: 10,
                          background: bg, color, borderBottom: `1px solid ${C.border}`, borderLeft: `1px solid ${C.border}`,
                          cursor: isDiag ? "default" : "pointer", userSelect: "none",
                          transition: "background .15s",
                        }}
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
        <div style={{ padding: "10px 14px", background: C.surface, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.muted }}>
          <strong>Guest (VLAN 20)</strong> — fully isolated, internet only. <strong>Intrusion (VLAN 50)</strong> — fully isolated, outbound-only for cloud reporting.
          Employee can reach AV + VMS for display control and camera viewing.
        </div>
      </div>

      {/* Deployment Checklist */}
      <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <CardHead icon="✅" title="Deployment Checklist" color={C.steel} />
        <div style={{ padding: 16 }}>
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
            <div key={sec.section} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.steel, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{sec.section}</div>
              {sec.items.map((item, i) => {
                const key = `${sec.section}_${i}`;
                const checked = cfg.checklist?.[key] || false;
                return (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer", fontSize: 12, color: checked ? C.success : C.navy }}>
                    <input type="checkbox" checked={checked}
                      onChange={e => setNetworkConfig(s => ({ ...s, checklist: { ...s.checklist, [key]: e.target.checked } }))}
                      style={{ accentColor: C.success, width: 15, height: 15 }} />
                    <span style={{ textDecoration: checked ? "line-through" : "none" }}>{item}</span>
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
