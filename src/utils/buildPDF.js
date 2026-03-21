// ── PDF Generator ─────────────────────────────────────────────────────────────
export async function buildPDF(state, projectMeta, opts = {}) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const W = 215.9, M = 14, CW = W - M * 2;
  let y = 0;
  const np = () => { doc.addPage(); y = 18; hdrStrip(); };
  const chk = (n = 20) => { if (y + n > 262) np(); };
  const hdrStrip = () => {
    doc.setFillColor(11, 31, 58); doc.rect(0, 0, W, 10, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
    doc.text(`${projectMeta.name}  |  Programming & Configuration Report`, M, 7);
    doc.setTextColor(0, 174, 239);
    doc.text(`Project ID: ${projectMeta.projectId}`, W - M - 30, 7);
  };
  const sectionBanner = (txt, icon = "") => {
    chk(14);
    doc.setFillColor(11, 31, 58); doc.rect(M, y, CW, 8, "F");
    doc.setFillColor(0, 174, 239); doc.rect(M, y + 8, CW, 1.5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text(`${icon}  ${txt}`, M + 4, y + 5.5);
    y += 13;
  };
  const groupBanner = (txt) => {
    chk(10);
    doc.setFillColor(26, 51, 85); doc.rect(M, y, CW, 7, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(0, 174, 239);
    doc.text(txt, M + 4, y + 5);
    y += 9;
  };
  const row = (pairs, lineH = 9) => {
    const cols = pairs.length;
    const colW = CW / cols;
    doc.setFontSize(8);
    pairs.forEach(([k, v], i) => {
      const x = M + i * colW;
      doc.setFont("helvetica", "bold"); doc.setTextColor(107, 126, 150); doc.text(k, x + 2, y);
      doc.setFont("helvetica", "normal"); doc.setTextColor(20, 20, 20); doc.text(String(v || "—").substring(0, 32), x + 2, y + 4.5);
    });
    y += lineH;
  };
  const noteRow = (note) => {
    if (!note) return;
    doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(130, 130, 130);
    doc.text("Note: " + note.substring(0, 160), M + 2, y);
    y += 5;
  };
  const divider = () => {
    doc.setDrawColor(200, 210, 220); doc.setLineWidth(0.3);
    doc.line(M, y, M + CW, y); y += 3;
  };
  // ─ Cover ─────────────────────────────────────────────────────────────────
  doc.setFillColor(11, 31, 58); doc.rect(0, 0, W, 62, "F");
  doc.setFillColor(0, 174, 239); doc.rect(0, 62, W, 3, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(0, 174, 239);
  doc.text("PROGRAMMING & CONFIGURATION WORK ORDER", M, 18);
  doc.setFontSize(20); doc.setTextColor(255, 255, 255);
  doc.text(projectMeta.name, M, 30);
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 200, 220);
  doc.text(`Project ID: ${projectMeta.projectId}   |   Date: ${state.date}   |   Tech Lead: ${state.techLead}   |   Tech(s): ${state.techs}`, M, 40);
  const camCount  = state.cameraGroups.reduce((s, g) => s + g.devices.length, 0);
  const swCount   = state.switchGroups.reduce((s, g) => s + g.devices.length, 0);
  const srvCount  = state.serverGroups.reduce((s, g) => s + g.devices.length, 0);
  const doorCount = state.doorGroups.reduce((s, g) => s + g.devices.length, 0);
  const zoneCount = state.zoneGroups.reduce((s, g) => s + g.devices.length, 0);
  const spkCount  = state.speakerGroups.reduce((s, g) => s + g.devices.length, 0);
  const tiles = [
    { label: "Servers",       val: srvCount },
    { label: "Switches",      val: swCount },
    { label: "Cameras",       val: camCount },
    { label: "Access Doors",  val: doorCount },
    { label: "Intrusion Zones", val: zoneCount },
    { label: "Audio Zones",   val: spkCount },
  ];
  const tW = CW / tiles.length;
  tiles.forEach((t, i) => {
    const x = M + i * tW;
    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(0, 174, 239);
    doc.text(String(t.val), x + 4, 58);
    doc.setFontSize(7); doc.setTextColor(180, 200, 220);
    doc.text(t.label, x + 4, 54);
  });
  y = 78;
  // Project info box
  doc.setFillColor(240, 244, 248); doc.roundedRect(M, y, CW, 38, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(11, 31, 58);
  doc.text("PROJECT INFORMATION", M + 4, y + 7);
  y += 10;
  const infoL = [["Project Name:", projectMeta.name],["Project ID:", projectMeta.projectId],["Customer:", state.customer],["Site Address:", state.siteAddress]];
  const infoR = [["Tech Lead:", state.techLead],["Tech(s):", state.techs],["Date:", state.date],["Submitted By:", state.submittedBy]];
  infoL.forEach(([k, v], i) => {
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(107,126,150); doc.text(k, M+4, y+i*7);
    doc.setFont("helvetica","normal"); doc.setTextColor(20,20,20); doc.text(v||"—", M+36, y+i*7);
  });
  infoR.forEach(([k, v], i) => {
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(107,126,150); doc.text(k, M+CW/2+4, y+i*7);
    doc.setFont("helvetica","normal"); doc.setTextColor(20,20,20); doc.text(v||"—", M+CW/2+28, y+i*7);
  });
  y += 38;
  // ─ SERVERS ───────────────────────────────────────────────────────────────
  if (srvCount > 0) {
    np();
    sectionBanner("SERVERS & COMPUTING INFRASTRUCTURE", "Server");
    state.serverGroups.forEach(grp => {
      if (!grp.devices.length) return;
      const grpLabel = grp.groupLabel || `${grp.brand || "Server"} ${grp.model || "Group"}`.trim();
      groupBanner(`${grpLabel}  |  Role: ${grp.role || "—"}  |  OS: ${grp.os || "—"}  |  Storage: ${grp.storage || "—"}`);
      grp.devices.forEach((s, i) => {
        chk(22);
        doc.setFillColor(i%2===0?240:248, i%2===0?244:250, i%2===0?248:252);
        doc.roundedRect(M, y, CW, 20, 1.5, 1.5, "F");
        y += 4;
        doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(11,31,58);
        doc.text(`SERVER ${i+1}${s.name ? " — " + s.name : ""}`, M+3, y);
        y += 5;
        row([["IP Address:", s.ip], ["MAC:", s.mac], ["Serial #:", s.serial], ["Location:", s.location]]);
        noteRow(s.notes);
        divider();
      });
    });
  }
  // ─ SWITCHING ─────────────────────────────────────────────────────────────
  if (swCount > 0) {
    np();
    sectionBanner("NETWORK SWITCHING", "Switch");
    state.switchGroups.forEach(grp => {
      if (!grp.devices.length) return;
      const grpLabel = grp.groupLabel || `${grp.brand || "Switch"} ${grp.model || "Group"}`.trim();
      groupBanner(`${grpLabel}  |  VLAN: ${grp.vlan || "—"}  |  Uplink: ${grp.uplink || "—"}`);
      grp.devices.forEach((sw, i) => {
        chk(22);
        doc.setFillColor(i%2===0?240:248, i%2===0?244:250, i%2===0?248:252);
        doc.roundedRect(M, y, CW, 20, 1.5, 1.5, "F");
        y += 4;
        doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(11,31,58);
        doc.text(`SWITCH ${i+1}${sw.name ? " — " + sw.name : ""}`, M+3, y);
        y += 5;
        row([["IP Address:", sw.ip], ["MAC:", sw.mac], ["Serial #:", sw.serial], ["Ports:", sw.ports]]);
        row([["Location:", sw.location]]);
        noteRow(sw.notes);
        divider();
      });
    });
  }
  // ─ CAMERAS ───────────────────────────────────────────────────────────────
  if (camCount > 0) {
    np();
    sectionBanner("CCTV / VMS CAMERA PROGRAMMING LOG", "Camera");
    if (state.nvrBrand) {
      doc.setFillColor(235,244,255); doc.roundedRect(M, y, CW, 14, 1.5, 1.5, "F");
      y += 3;
      row([["NVR/DVR Brand:", state.nvrBrand], ["Model:", state.nvrModel], ["IP:", state.nvrIp], ["Serial:", state.nvrSerial]]);
      row([["Firmware:", state.nvrFirmware], ["Storage:", state.nvrStorage], ["Retention:", state.nvrRetention], ["VMS Software:", state.vmsSoftware]]);
      y += 2;
    }
    state.cameraGroups.forEach(grp => {
      if (!grp.devices.length) return;
      const grpLabel = grp.groupLabel || `${grp.brand || "Camera"} ${grp.model || "Group"}`.trim();
      groupBanner(`${grpLabel}  |  ${grp.resolution}  ${grp.codec}  ${grp.lens}  ${grp.type}  |  FPS: ${grp.fps}  Bitrate: ${grp.bitrate || "—"}  |  HTTP: ${grp.port}  RTSP: ${grp.rtspPort}  |  PTZ: ${grp.ptz ? "Yes" : "No"}`);
      grp.devices.forEach((cam, i) => {
        chk(28);
        doc.setFillColor(i%2===0?240:248, i%2===0?244:250, i%2===0?248:252);
        doc.roundedRect(M, y, CW, 26, 1.5, 1.5, "F");
        y += 4;
        doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(11,31,58);
        doc.text(`CAMERA ${i+1}${cam.name ? " — " + cam.name : ""}`, M+3, y);
        y += 5;
        row([["Location:", cam.location], ["IP Address:", cam.ip], ["MAC:", cam.mac], ["Serial #:", cam.serial]]);
        row([["Username:", grp.username], ["Password:", grp.password], ["Storage Group:", grp.storageGroup]]);
        noteRow(cam.notes);
        divider();
      });
    });
  }
  // ─ ACCESS CONTROL ────────────────────────────────────────────────────────
  if (doorCount > 0) {
    np();
    sectionBanner("ACCESS CONTROL PROGRAMMING LOG", "Door");
    state.doorGroups.forEach(grp => {
      if (!grp.devices.length) return;
      const grpLabel = grp.groupLabel || `${grp.brand || "Access"} ${grp.model || "Group"}`.trim();
      groupBanner(`${grpLabel}  |  Reader: ${grp.readerType}  Credential: ${grp.credentialType}  Lock: ${grp.lockType}  |  Format: ${grp.cardFormat || "—"}  Facility: ${grp.facilityCode || "—"}`);
      grp.devices.forEach((d, i) => {
        chk(30);
        doc.setFillColor(i%2===0?240:248, i%2===0?244:250, i%2===0?248:252);
        doc.roundedRect(M, y, CW, 28, 1.5, 1.5, "F");
        y += 4;
        doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(11,31,58);
        doc.text(`DOOR ${i+1}${d.name ? " — " + d.name : ""}`, M+3, y);
        y += 5;
        row([["Location:", d.location], ["Controller:", d.controllerName], ["Controller IP:", d.controllerIP], ["Controller S/N:", d.controllerSerial]]);
        row([["Reader S/N:", d.readerSerial], ["REX:", d.rex ? "Yes" : "No"], ["Door Contact:", d.doorContact ? "Yes" : "No"], ["Schedule:", grp.schedule || "—"]]);
        noteRow(d.notes);
        divider();
      });
    });
  }
  // ─ INTRUSION ─────────────────────────────────────────────────────────────
  if (zoneCount > 0) {
    np();
    sectionBanner("INTRUSION SYSTEM PROGRAMMING LOG", "Alarm");
    if (state.panelBrand) {
      doc.setFillColor(235,244,255); doc.roundedRect(M, y, CW, 12, 1.5, 1.5, "F");
      y += 3;
      row([["Panel Brand:", state.panelBrand], ["Model:", state.panelModel], ["Serial:", state.panelSerial], ["Firmware:", state.panelFirmware]]);
      y += 4;
    }
    state.zoneGroups.forEach(grp => {
      if (!grp.devices.length) return;
      const grpLabel = grp.groupLabel || `${grp.zoneType} Zones`;
      groupBanner(`${grpLabel}  |  Type: ${grp.zoneType}  |  Partitions: ${grp.partitions || "—"}  |  Bypassable: ${grp.bypassable ? "Yes" : "No"}`);
      grp.devices.forEach((z, i) => {
        chk(18);
        doc.setFillColor(i%2===0?240:248, i%2===0?244:250, i%2===0?248:252);
        doc.roundedRect(M, y, CW, 16, 1.5, 1.5, "F");
        y += 4;
        row([["Zone #:", z.zoneNumber], ["Name:", z.name], ["Location:", z.location], ["Type:", z.zoneType]]);
        noteRow(z.notes);
        divider();
      });
    });
  }
  // ─ AUDIO ─────────────────────────────────────────────────────────────────
  if (spkCount > 0) {
    np();
    sectionBanner("AUDIO SYSTEM PROGRAMMING LOG", "Audio");
    state.speakerGroups.forEach(grp => {
      if (!grp.devices.length) return;
      const grpLabel = grp.groupLabel || `${grp.brand || "Audio"} ${grp.model || "Group"}`.trim();
      groupBanner(`${grpLabel}  |  Zone Group: ${grp.zoneGroup || "—"}  Amp Zone: ${grp.ampZone || "—"}  Volume: ${grp.volume}%`);
      grp.devices.forEach((sp, i) => {
        chk(16);
        doc.setFillColor(i%2===0?240:248, i%2===0?244:250, i%2===0?248:252);
        doc.roundedRect(M, y, CW, 14, 1.5, 1.5, "F");
        y += 4;
        row([["Speaker/Zone:", sp.name], ["Location:", sp.location], ["IP/Address:", sp.ip]]);
        noteRow(sp.notes);
        divider();
      });
    });
  }
  // ─ Sign-off ───────────────────────────────────────────────────────────────
  np();
  sectionBanner("SIGN-OFF & CERTIFICATION", "Sign");
  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(60,60,60);
  doc.text("The undersigned certifies all programming listed in this document has been completed, tested, verified, and customer training provided.", M, y);
  y += 12;
  [["Lead Technician", state.techLead], ["Customer Representative", state.customer]].forEach(([lbl, name], i) => {
    const x = M + i * (CW / 2 + 2);
    doc.setDrawColor(200,210,220); doc.setLineWidth(0.3);
    doc.roundedRect(x, y, CW/2-2, 30, 2, 2, "S");
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(107,126,150); doc.text(lbl, x+4, y+7);
    doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(11,31,58); doc.text(name || "___________________________", x+4, y+16);
    doc.setFontSize(8); doc.setTextColor(150,150,150); doc.text("Date: __________________", x+4, y+24);
  });
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(160,160,160);
    doc.text(`Page ${i} of ${totalPages}`, W-M-18, 270);
    doc.text("CONFIDENTIAL — Programming & Configuration Work Order", M, 270);
  }
  const fname = `PCWO_${projectMeta.name.replace(/\s+/g,"_").substring(0,40)}_${state.date}.pdf`;
  if (opts?.returnBytes) return doc.output("arraybuffer");
  doc.save(fname);
}
