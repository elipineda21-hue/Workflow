// ── CSV Export ────────────────────────────────────────────────────────────────
export function buildCSV(state, projectMeta) {
  const esc = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
  const headers = [
    "Project Name","Project ID","Customer","Site Address","Tech Lead","Techs","Date",
    "Category","Group Label","Brand","Model",
    "Device Name","Location","IP Address","MAC Address","Serial #","Notes",
    // camera-specific
    "Codec","Resolution","Lens","Camera Type","HTTP Port","RTSP Port","FPS","Bitrate (kbps)","PTZ","Username","Password","Storage Group",
    // server-specific
    "Role","OS / Platform","Storage Config",
    // switch-specific
    "Port Count","VLAN Config","Uplink",
    // access-specific
    "Reader Type","Credential Type","Lock Type","Card Format","Facility Code","Access Group","Schedule","Controller Name","Controller IP","Controller S/N","Reader S/N",
    // zone-specific
    "Zone #","Zone Type","Partitions","Bypassable",
    // audio-specific
    "Zone Group","Amp Zone","Volume (%)",
  ];

  const projCols = [projectMeta.name, projectMeta.projectId, state.customer, state.siteAddress, state.techLead, state.techs, state.date];

  const rows = [headers.map(esc).join(",")];

  // Cameras (cols 7-16 base, 17-28 camera-specific)
  state.cameraGroups.forEach(grp => {
    grp.devices.forEach(d => {
      const base = [projCols, "Camera", grp.groupLabel || "", grp.brand, grp.model, d.name, d.location, d.ip, d.mac, d.serial, d.notes].flat().map(esc);
      const cam  = [grp.codec, grp.resolution, grp.lens, grp.type, grp.port, grp.rtspPort, grp.fps, grp.bitrate, grp.ptz ? "Yes" : "No", grp.username, grp.password, grp.storageGroup].map(esc);
      const rest = Array(headers.length - base.length - cam.length).fill('""');
      rows.push([...base, ...cam, ...rest].join(","));
    });
  });

  // Servers (cols after camera block: Role, OS, Storage = indices 30,31,32)
  state.serverGroups.forEach(grp => {
    grp.devices.forEach(d => {
      const base = [projCols, "Server", grp.groupLabel || "", grp.brand, grp.model, d.name, d.location, d.ip, d.mac, d.serial, d.notes].flat().map(esc);
      const camEmpty = Array(12).fill('""');
      const srv = [grp.role, grp.os, grp.storage].map(esc);
      const rest = Array(headers.length - base.length - camEmpty.length - srv.length).fill('""');
      rows.push([...base, ...camEmpty, ...srv, ...rest].join(","));
    });
  });

  // Switches
  state.switchGroups.forEach(grp => {
    grp.devices.forEach(d => {
      const base = [projCols, "Switch", grp.groupLabel || "", grp.brand, grp.model, d.name, d.location, d.ip, d.mac, d.serial, d.notes].flat().map(esc);
      const camEmpty = Array(12).fill('""');
      const srvEmpty = Array(3).fill('""');
      const sw = [d.ports || "", grp.vlan, grp.uplink].map(esc);
      const rest = Array(headers.length - base.length - camEmpty.length - srvEmpty.length - sw.length).fill('""');
      rows.push([...base, ...camEmpty, ...srvEmpty, ...sw, ...rest].join(","));
    });
  });

  // Doors
  state.doorGroups.forEach(grp => {
    grp.devices.forEach(d => {
      const base = [projCols, "Access Door", grp.groupLabel || "", grp.brand, grp.model, d.name, d.location, "", "", "", d.notes].flat().map(esc);
      const camEmpty = Array(12).fill('""');
      const srvEmpty = Array(3).fill('""');
      const swEmpty  = Array(3).fill('""');
      const ac = [grp.readerType, grp.credentialType, grp.lockType, grp.cardFormat, grp.facilityCode, grp.accessGroup, grp.schedule, d.controllerName, d.controllerIP, d.controllerSerial, d.readerSerial].map(esc);
      const rest = Array(headers.length - base.length - camEmpty.length - srvEmpty.length - swEmpty.length - ac.length).fill('""');
      rows.push([...base, ...camEmpty, ...srvEmpty, ...swEmpty, ...ac, ...rest].join(","));
    });
  });

  // Zones
  state.zoneGroups.forEach(grp => {
    grp.devices.forEach(d => {
      const base = [projCols, "Intrusion Zone", grp.groupLabel || "", "", "", d.name, d.location, "", "", "", d.notes].flat().map(esc);
      const camEmpty = Array(12).fill('""');
      const srvEmpty = Array(3).fill('""');
      const swEmpty  = Array(3).fill('""');
      const acEmpty  = Array(11).fill('""');
      const zone = [d.zoneNumber, d.zoneType, d.partitions, d.bypassable ? "Yes" : "No"].map(esc);
      const rest = Array(headers.length - base.length - camEmpty.length - srvEmpty.length - swEmpty.length - acEmpty.length - zone.length).fill('""');
      rows.push([...base, ...camEmpty, ...srvEmpty, ...swEmpty, ...acEmpty, ...zone, ...rest].join(","));
    });
  });

  // Audio
  state.speakerGroups.forEach(grp => {
    grp.devices.forEach(d => {
      const base = [projCols, "Audio Zone", grp.groupLabel || "", grp.brand, grp.model, d.name, d.location, d.ip, "", "", d.notes].flat().map(esc);
      const camEmpty = Array(12).fill('""');
      const srvEmpty = Array(3).fill('""');
      const swEmpty  = Array(3).fill('""');
      const acEmpty  = Array(11).fill('""');
      const zoneEmpty = Array(4).fill('""');
      const audio = [grp.zoneGroup, grp.ampZone, grp.volume].map(esc);
      const rest = Array(headers.length - base.length - camEmpty.length - srvEmpty.length - swEmpty.length - acEmpty.length - zoneEmpty.length - audio.length).fill('""');
      rows.push([...base, ...camEmpty, ...srvEmpty, ...swEmpty, ...acEmpty, ...zoneEmpty, ...audio, ...rest].join(","));
    });
  });

  // ── Network Configuration sheet (appended as separate section) ──
  if (state.networkConfig && state.networkConfig.vlans && state.networkConfig.vlans.length > 0) {
    const net = state.networkConfig;
    const prefix = net.sitePrefix || "SITE";
    rows.push(""); // blank line separator
    rows.push([esc("--- NETWORK CONFIGURATION ---")].join(","));
    rows.push([esc("Mode"), esc(net.useDefaults ? "Calidad SOP Defaults" : "Customer Required")].join(","));
    rows.push([esc("Router"), esc(net.routerModel), esc("APs"), esc(net.apCount), esc("ISP"), esc(net.isp)].join(","));
    rows.push("");
    // VLAN table
    rows.push([esc("Network Name"), esc("VLAN ID"), esc("Subnet"), esc("DHCP"), esc("Pool Size"), esc("Purpose")].join(","));
    net.vlans.forEach(v => {
      rows.push([esc(v.name), esc(v.vlanId), esc(v.subnet), esc(v.dhcp ? "Yes" : "No"), esc(v.poolSize), esc(v.purpose)].join(","));
    });
    rows.push("");
    // SSID table
    rows.push([esc("SSID Name"), esc("Mapped Network"), esc("Band"), esc("Security")].join(","));
    net.ssids.forEach(s => {
      rows.push([esc(s.pattern.replace("[SITE]", prefix)), esc(s.mappedVlan), esc(s.band), esc(s.security)].join(","));
    });
    // Firewall matrix
    const fw = net.firewall;
    if (fw && fw.matrix) {
      rows.push("");
      rows.push([esc("Firewall: From / To"), ...fw.cols.map(esc)].join(","));
      fw.rows.forEach((rowLabel, ri) => {
        rows.push([esc(rowLabel), ...fw.matrix[ri].map(esc)].join(","));
      });
    }
  }

  const csv = rows.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PCWO_${projectMeta.name.replace(/\s+/g,"_").substring(0,40)}_${state.date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
