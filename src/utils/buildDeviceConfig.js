// ── Device Config Export ──────────────────────────────────────────────────────
// Generates a CSV with one row per device containing ALL programming details.
// Fields that don't apply to a device type are left blank.

export function buildDeviceConfigCSV(state, projectMeta) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const headers = [
    "System Type", "Device Name", "Device ID", "Manufacturer", "Model",
    "IP Address", "MAC Address", "Serial #",
    "Username", "Password",
    "Codec", "Resolution", "Lens", "Camera Type",
    "HTTP Port", "RTSP Port", "FPS", "Bitrate (kbps)", "PTZ",
    "VMS Platform",
    "Reader Type", "Credential Type", "Lock Type",
    "Controller Name", "Controller IP", "Controller S/N", "Reader S/N",
    "Zone #", "Zone Type", "Partitions", "Bypassable",
    "Zone Group", "Amp Zone", "Volume",
    "Role", "OS", "Storage Config",
    "VLAN Config", "Uplink", "Port Count",
    "Installed", "Programmed", "Notes",
  ];

  const rows = [headers.map(esc).join(",")];

  // Helper: build a row with blanks for all columns, then fill in the ones we have
  const blankRow = () => Object.fromEntries(headers.map(h => [h, ""]));

  // ── CCTV (cameras) ──
  (state.cameraGroups || []).forEach(grp => {
    grp.devices.forEach(d => {
      const r = blankRow();
      r["System Type"]   = "CCTV";
      r["Device Name"]   = d.name;
      r["Device ID"]     = d.cableId;
      r["Manufacturer"]  = grp.brand;
      r["Model"]         = grp.model;
      r["IP Address"]    = d.ip;
      r["MAC Address"]   = d.mac;
      r["Serial #"]      = d.serial;
      r["Username"]      = grp.username;
      r["Password"]      = grp.password;
      r["Codec"]         = grp.codec;
      r["Resolution"]    = grp.resolution;
      r["Lens"]          = grp.lens;
      r["Camera Type"]   = grp.type;
      r["HTTP Port"]     = grp.port;
      r["RTSP Port"]     = grp.rtspPort;
      r["FPS"]           = grp.fps;
      r["Bitrate (kbps)"] = grp.bitrate;
      r["PTZ"]           = grp.ptz ? "Yes" : "No";
      r["VMS Platform"]  = grp.platform || "";
      r["Installed"]     = d.installed ? "Yes" : "No";
      r["Programmed"]    = d.programmed ? "Yes" : "No";
      r["Notes"]         = d.notes;
      rows.push(headers.map(h => esc(r[h])).join(","));
    });
  });

  // ── Access Control (doors) ──
  (state.doorGroups || []).forEach(grp => {
    grp.devices.forEach(d => {
      const r = blankRow();
      r["System Type"]     = "Access Control";
      r["Device Name"]     = d.name;
      r["Device ID"]       = d.cableId;
      r["Manufacturer"]    = grp.brand;
      r["Model"]           = grp.model;
      r["Reader Type"]     = grp.readerType;
      r["Credential Type"] = grp.credentialType;
      r["Lock Type"]       = grp.lockType;
      r["Controller Name"] = d.controllerName;
      r["Controller IP"]   = d.controllerIP;
      r["Controller S/N"]  = d.controllerSerial;
      r["Reader S/N"]      = d.readerSerial;
      r["Installed"]       = d.installed ? "Yes" : "No";
      r["Programmed"]      = d.programmed ? "Yes" : "No";
      r["Notes"]           = d.notes;
      rows.push(headers.map(h => esc(r[h])).join(","));
    });
  });

  // ── Intrusion (zones) ──
  (state.zoneGroups || []).forEach(grp => {
    grp.devices.forEach(d => {
      const r = blankRow();
      r["System Type"]  = "Intrusion";
      r["Device Name"]  = d.name;
      r["Device ID"]    = d.cableId;
      r["Zone #"]       = d.zoneNumber;
      r["Zone Type"]    = d.zoneType;
      r["Partitions"]   = d.partitions;
      r["Bypassable"]   = d.bypassable ? "Yes" : "No";
      r["Installed"]    = d.installed ? "Yes" : "No";
      r["Programmed"]   = d.programmed ? "Yes" : "No";
      r["Notes"]        = d.notes;
      rows.push(headers.map(h => esc(r[h])).join(","));
    });
  });

  // ── Audio (speakers) ──
  (state.speakerGroups || []).forEach(grp => {
    grp.devices.forEach(d => {
      const r = blankRow();
      r["System Type"]  = "Audio";
      r["Device Name"]  = d.name;
      r["Device ID"]    = d.cableId;
      r["Manufacturer"] = grp.brand;
      r["Model"]        = grp.model;
      r["IP Address"]   = d.ip;
      r["Zone Group"]   = grp.zoneGroup;
      r["Amp Zone"]     = grp.ampZone;
      r["Volume"]       = grp.volume;
      r["Installed"]    = d.installed ? "Yes" : "No";
      r["Programmed"]   = d.programmed ? "Yes" : "No";
      r["Notes"]        = d.notes;
      rows.push(headers.map(h => esc(r[h])).join(","));
    });
  });

  // ── Server/NVR ──
  (state.serverGroups || []).forEach(grp => {
    grp.devices.forEach(d => {
      const r = blankRow();
      r["System Type"]    = "Server/NVR";
      r["Device Name"]    = d.name;
      r["Device ID"]      = d.cableId;
      r["Manufacturer"]   = grp.brand;
      r["Model"]          = grp.model;
      r["IP Address"]     = d.ip;
      r["MAC Address"]    = d.mac;
      r["Serial #"]       = d.serial;
      r["Role"]           = grp.role;
      r["OS"]             = grp.os;
      r["Storage Config"] = grp.storage;
      r["Installed"]      = d.installed ? "Yes" : "No";
      r["Programmed"]     = d.programmed ? "Yes" : "No";
      r["Notes"]          = d.notes;
      rows.push(headers.map(h => esc(r[h])).join(","));
    });
  });

  // ── Switching ──
  (state.switchGroups || []).forEach(grp => {
    grp.devices.forEach(d => {
      const r = blankRow();
      r["System Type"]  = "Switching";
      r["Device Name"]  = d.name;
      r["Device ID"]    = d.cableId;
      r["Manufacturer"] = grp.brand;
      r["Model"]        = grp.model;
      r["IP Address"]   = d.ip;
      r["MAC Address"]  = d.mac;
      r["Serial #"]     = d.serial;
      r["VLAN Config"]  = grp.vlan;
      r["Uplink"]       = grp.uplink;
      r["Port Count"]   = d.ports;
      r["Installed"]    = d.installed ? "Yes" : "No";
      r["Programmed"]   = d.programmed ? "Yes" : "No";
      r["Notes"]        = d.notes;
      rows.push(headers.map(h => esc(r[h])).join(","));
    });
  });

  // ── Software ──
  (state.softwareGroups || []).forEach(grp => {
    grp.devices.forEach(d => {
      const r = blankRow();
      r["System Type"]  = "Software";
      r["Device Name"]  = d.name;
      r["Device ID"]    = d.cableId;
      r["Manufacturer"] = grp.brand;
      r["Model"]        = grp.model;
      r["Installed"]    = d.installed ? "Yes" : "No";
      r["Programmed"]   = d.programmed ? "Yes" : "No";
      r["Notes"]        = d.notes;
      rows.push(headers.map(h => esc(r[h])).join(","));
    });
  });

  // ── Trigger download ──
  const csv = rows.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const projectName = (projectMeta.name || "Project").replace(/\s+/g, "_").substring(0, 40);
  const dateStr = state.date || new Date().toISOString().slice(0, 10);
  a.download = `DeviceConfig_${projectName}_${dateStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
