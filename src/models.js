// ── Utilities ─────────────────────────────────────────────────────────────────
export const uid = () => crypto.randomUUID();
export const nextIP = (base, n) => {
  const p = (base || "").trim().split(".");
  if (p.length !== 4 || p.some(x => isNaN(parseInt(x)))) return base || "";
  const last = parseInt(p[3], 10) + n;
  return last > 254 ? base : `${p[0]}.${p[1]}.${p[2]}.${last}`;
};

// ── Group data makers ─────────────────────────────────────────────────────────
export const mkProcurement = () => ({ procurementStatus: "not_ordered", vendor: "", poNumber: "", eta: "", trackingNumber: "" });
export const mkCamGroup = () => ({ id: uid(), groupLabel: "", brand: "", model: "", codec: "H.265", resolution: "4MP", lens: "2.8mm", type: "Outdoor Dome", port: "80", rtspPort: "554", fps: "15", bitrate: "", ptz: false, username: "", password: "", storageGroup: "", quantity: "4", ipStart: "", devices: [], noProgramming: false, ...mkProcurement() });
export const mkCamDev = (ip = "", idx = 0) => ({ id: uid(), name: `Camera ${String(idx + 1).padStart(2, "0")}`, location: "", cableId: "", ip, mac: "", serial: "", notes: "", installed: false, programmed: false });
export const mkSwGrp = () => ({ id: uid(), groupLabel: "", brand: "", model: "", vlan: "", uplink: "", quantity: "1", ipStart: "", devices: [], noProgramming: false, ...mkProcurement() });
export const mkSwDev = (ip = "", idx = 0) => ({ id: uid(), name: `Switch ${String(idx + 1).padStart(2, "0")}`, location: "", cableId: "", ip, mac: "", serial: "", ports: "", notes: "", installed: false, programmed: false });
export const mkSrvGrp = () => ({ id: uid(), groupLabel: "", brand: "", model: "", role: "VMS Server", os: "", storage: "", quantity: "1", ipStart: "", devices: [], noProgramming: false, ...mkProcurement() });
export const mkSrvDev = (ip = "", idx = 0) => ({ id: uid(), name: `Server ${String(idx + 1).padStart(2, "0")}`, location: "", cableId: "", ip, mac: "", serial: "", notes: "", installed: false, programmed: false });
export const mkDoorGrp = () => ({ id: uid(), groupLabel: "", brand: "", model: "", readerType: "OSDP", credentialType: "Smart Card", lockType: "Electric Strike", cardFormat: "", facilityCode: "", accessGroup: "", schedule: "", quantity: "1", devices: [], noProgramming: false, ...mkProcurement() });
export const mkDoorDev = (idx = 0) => ({ id: uid(), name: `Door ${String(idx + 1).padStart(2, "0")}`, location: "", cableId: "", controllerName: "", controllerIP: "", controllerSerial: "", readerSerial: "", rex: false, doorContact: false, notes: "", installed: false, programmed: false });
export const mkZoneGrp = () => ({ id: uid(), groupLabel: "", zoneType: "Motion", partitions: "", bypassable: false, quantity: "1", startNumber: "1", devices: [], noProgramming: false, ...mkProcurement() });
export const mkZoneDev = (idx = 0, g = {}) => ({ id: uid(), name: `Zone ${String(idx + 1).padStart(2, "0")}`, location: "", cableId: "", zoneNumber: String((parseInt(g.startNumber) || 1) + idx), zoneType: g.zoneType || "Motion", partitions: g.partitions || "", bypassable: g.bypassable || false, notes: "", installed: false, programmed: false });
export const mkSpkGrp = () => ({ id: uid(), groupLabel: "", brand: "", model: "", zoneGroup: "", ampZone: "", volume: "70", quantity: "1", ipStart: "", devices: [], noProgramming: false, ...mkProcurement() });
export const mkSpkDev = (ip = "", idx = 0) => ({ id: uid(), name: `Speaker ${String(idx + 1).padStart(2, "0")}`, location: "", cableId: "", ip, notes: "", installed: false, programmed: false });

// ── Generate device arrays from a group config ────────────────────────────────
export const genCam  = g => Array.from({ length: Math.min(parseInt(g.quantity) || 1, 64) }, (_, i) => mkCamDev(nextIP(g.ipStart, i), i));
export const genSw   = g => Array.from({ length: Math.min(parseInt(g.quantity) || 1, 32) }, (_, i) => mkSwDev(nextIP(g.ipStart, i), i));
export const genSrv  = g => Array.from({ length: Math.min(parseInt(g.quantity) || 1, 16) }, (_, i) => mkSrvDev(nextIP(g.ipStart, i), i));
export const genDoor = g => Array.from({ length: Math.min(parseInt(g.quantity) || 1, 64) }, (_, i) => mkDoorDev(i));
export const genZone = g => Array.from({ length: Math.min(parseInt(g.quantity) || 1, 128) }, (_, i) => mkZoneDev(i, g));
export const genSpk  = g => Array.from({ length: Math.min(parseInt(g.quantity) || 1, 64) }, (_, i) => mkSpkDev(nextIP(g.ipStart, i), i));

// ── Group/device state helpers ────────────────────────────────────────────────
export const updGrp = (set, gid, k, v) => set(gs => gs.map(g => g.id === gid ? { ...g, [k]: v } : g));
export const updDev = (set, gid, did, k, v) => set(gs => gs.map(g => g.id === gid ? { ...g, devices: g.devices.map(d => d.id === did ? { ...d, [k]: v } : d) } : g));
export const remGrp = (set, gid) => set(gs => gs.filter(g => g.id !== gid));
export const remDev = (set, gid, did) => set(gs => gs.map(g => g.id === gid ? { ...g, devices: g.devices.filter(d => d.id !== did) } : g));
export const addDev = (set, gid, dev) => set(gs => gs.map(g => g.id === gid ? { ...g, devices: [...g.devices, dev] } : g));
export const applyGen = (set, gid, genFn) => set(gs => gs.map(g => g.id === gid ? { ...g, devices: genFn(g) } : g));

// ── Category → VLAN mapping for auto-IP ──────────────────────────────────────
// Maps device categories to their VLAN ID from the network SOP
const CATEGORY_VLAN_MAP = {
  camera: "40",  // VMS — cameras / VSS / CCTV
  server: "40",  // VMS — NVRs, VMS servers
  switch: "1",   // Default / Mgmt
  door:   "1",   // Default / Mgmt — access controllers
  zone:   "50",  // Intrusion — alarm panels
  speaker:"30",  // AV — audio systems
};

// Get the subnet base IP (first 3 octets) from a VLAN's subnet string
const subnetBase = (subnet) => {
  if (!subnet) return null;
  const parts = subnet.split("/")[0].split(".");
  if (parts.length !== 4) return null;
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
};

// Find the next available IP start for a category based on network config and existing groups
export function getNextIpStart(category, networkConfig, allGroups) {
  if (!networkConfig || !networkConfig.vlans) return "";
  const vlanId = CATEGORY_VLAN_MAP[category];
  if (!vlanId) return "";
  const vlan = networkConfig.vlans.find(v => v.vlanId === vlanId);
  if (!vlan) return "";
  const base = subnetBase(vlan.subnet);
  if (!base) return "";

  // Find the highest IP already in use across all groups on this VLAN
  const sameVlanCats = Object.entries(CATEGORY_VLAN_MAP)
    .filter(([, vid]) => vid === vlanId)
    .map(([cat]) => cat);

  let maxOctet = 0;
  for (const grp of allGroups) {
    if (!sameVlanCats.includes(grp._cat)) continue;
    // Check group ipStart
    const ip = grp.ipStart || "";
    const parts = ip.split(".");
    if (parts.length === 4 && ip.startsWith(base)) {
      const last = parseInt(parts[3], 10) + (grp.devices?.length || parseInt(grp.quantity) || 1);
      if (last > maxOctet) maxOctet = last;
    }
    // Check individual device IPs
    for (const dev of (grp.devices || [])) {
      const dip = dev.ip || "";
      const dparts = dip.split(".");
      if (dparts.length === 4 && dip.startsWith(base)) {
        const last = parseInt(dparts[3], 10) + 1;
        if (last > maxOctet) maxOctet = last;
      }
    }
  }

  // Start at .10 minimum (reserve .1-.9 for gateways/infra), or after the last used
  const startOctet = Math.max(10, maxOctet);
  return startOctet > 254 ? "" : `${base}.${startOctet}`;
}
