// ── As-Built Documentation PDF Generator ──────────────────────────────────────
export async function buildAsBuiltPDF(state, projectMeta) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const W = 215.9, H = 279.4, M = 14, CW = W - M * 2;
  let y = 0;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const np = () => { doc.addPage(); y = 18; hdrStrip(); };
  const chk = (n = 20) => { if (y + n > 262) np(); };

  const hdrStrip = () => {
    doc.setFillColor(11, 31, 58); doc.rect(0, 0, W, 10, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
    doc.text(`${projectMeta.name}  |  As-Built Documentation`, M, 7);
    doc.setTextColor(0, 174, 239);
    doc.text(`Project ID: ${projectMeta.projectId}`, W - M - 30, 7);
  };

  const sectionBanner = (txt) => {
    chk(14);
    doc.setFillColor(11, 31, 58); doc.rect(M, y, CW, 8, "F");
    doc.setFillColor(0, 174, 239); doc.rect(M, y + 8, CW, 1.5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text(txt, M + 4, y + 5.5);
    y += 13;
  };

  const groupBanner = (txt) => {
    chk(10);
    doc.setFillColor(26, 51, 85); doc.rect(M, y, CW, 7, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(0, 174, 239);
    doc.text(txt, M + 4, y + 5);
    y += 9;
  };

  // Generic table renderer
  const drawTable = (headers, colWidths, rows) => {
    // Header row
    chk(12);
    doc.setFillColor(240, 244, 248);
    doc.rect(M, y, CW, 6, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(107, 126, 150);
    let x = M;
    headers.forEach((h, i) => { doc.text(h, x + 1.5, y + 4); x += colWidths[i]; });
    y += 7;

    // Data rows
    rows.forEach((cells, ri) => {
      chk(7);
      if (ri % 2 === 0) { doc.setFillColor(248, 250, 253); doc.rect(M, y - 1, CW, 6, "F"); }
      doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(20, 20, 20);
      x = M;
      cells.forEach((val, i) => {
        const txt = String(val || "—").substring(0, 28);
        doc.text(txt, x + 1.5, y + 3);
        x += colWidths[i];
      });
      y += 6;
    });
    y += 3;
  };

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // ── Cover Page ─────────────────────────────────────────────────────────────
  doc.setFillColor(11, 31, 58); doc.rect(0, 0, W, 62, "F");
  doc.setFillColor(0, 174, 239); doc.rect(0, 62, W, 3, "F");

  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(0, 174, 239);
  doc.text("AS-BUILT DOCUMENTATION", M, 18);

  doc.setFontSize(20); doc.setTextColor(255, 255, 255);
  doc.text(projectMeta.name, M, 30);

  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 200, 220);
  doc.text(`Project ID: ${projectMeta.projectId}   |   Date: ${today}`, M, 40);

  // Device count tiles
  const camCount  = state.cameraGroups.reduce((s, g) => s + g.devices.length, 0);
  const swCount   = state.switchGroups.reduce((s, g) => s + g.devices.length, 0);
  const srvCount  = state.serverGroups.reduce((s, g) => s + g.devices.length, 0);
  const doorCount = state.doorGroups.reduce((s, g) => s + g.devices.length, 0);
  const zoneCount = state.zoneGroups.reduce((s, g) => s + g.devices.length, 0);
  const spkCount  = state.speakerGroups.reduce((s, g) => s + g.devices.length, 0);

  const tiles = [
    { label: "Servers",         val: srvCount },
    { label: "Switches",        val: swCount },
    { label: "Cameras",         val: camCount },
    { label: "Access Doors",    val: doorCount },
    { label: "Intrusion Zones", val: zoneCount },
    { label: "Audio Zones",     val: spkCount },
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
  doc.setFillColor(240, 244, 248); doc.roundedRect(M, y, CW, 22, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(11, 31, 58);
  doc.text("PROJECT INFORMATION", M + 4, y + 7);
  y += 10;
  const infoL = [["Project Name:", projectMeta.name], ["Project ID:", projectMeta.projectId]];
  const infoR = [["Date:", today], ["Prepared By:", "Calidad Services, Inc."]];
  infoL.forEach(([k, v], i) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(107, 126, 150); doc.text(k, M + 4, y + i * 7);
    doc.setFont("helvetica", "normal"); doc.setTextColor(20, 20, 20); doc.text(v || "—", M + 36, y + i * 7);
  });
  infoR.forEach(([k, v], i) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(107, 126, 150); doc.text(k, M + CW / 2 + 4, y + i * 7);
    doc.setFont("helvetica", "normal"); doc.setTextColor(20, 20, 20); doc.text(v || "—", M + CW / 2 + 28, y + i * 7);
  });
  y += 22;

  // ── CCTV Section ───────────────────────────────────────────────────────────
  if (camCount > 0) {
    np();
    sectionBanner("CCTV SYSTEM");
    state.cameraGroups.forEach(grp => {
      if (!grp.devices.length) return;
      const label = grp.groupLabel || `${grp.brand || "Camera"} ${grp.model || "Group"}`.trim();
      groupBanner(label);
      const headers = ["Device Name", "Device ID", "IP Address", "MAC", "Serial #", "Username", "Password", "Codec", "Resolution", "FPS"];
      const colWidths = [CW * 0.12, CW * 0.09, CW * 0.11, CW * 0.12, CW * 0.11, CW * 0.09, CW * 0.09, CW * 0.07, CW * 0.11, CW * 0.09];
      const rows = grp.devices.map((cam, i) => [
        cam.name || `Camera ${i + 1}`,
        cam.deviceId || cam.id || "",
        cam.ip || "",
        cam.mac || "",
        cam.serial || "",
        grp.username || "",
        grp.password || "",
        grp.codec || "",
        grp.resolution || "",
        grp.fps || "",
      ]);
      drawTable(headers, colWidths, rows);
    });
  }

  // ── Access Control Section ─────────────────────────────────────────────────
  if (doorCount > 0) {
    np();
    sectionBanner("ACCESS CONTROL SYSTEM");
    state.doorGroups.forEach(grp => {
      if (!grp.devices.length) return;
      const label = grp.groupLabel || `${grp.brand || "Access"} ${grp.model || "Group"}`.trim();
      groupBanner(label);
      const headers = ["Device Name", "Device ID", "Controller", "Controller IP", "Controller S/N", "Reader S/N"];
      const colWidths = [CW * 0.18, CW * 0.12, CW * 0.18, CW * 0.18, CW * 0.17, CW * 0.17];
      const rows = grp.devices.map((d, i) => [
        d.name || `Door ${i + 1}`,
        d.deviceId || d.id || "",
        d.controllerName || "",
        d.controllerIP || "",
        d.controllerSerial || "",
        d.readerSerial || "",
      ]);
      drawTable(headers, colWidths, rows);
    });
  }

  // ── Intrusion Section ──────────────────────────────────────────────────────
  if (zoneCount > 0) {
    np();
    sectionBanner("INTRUSION SYSTEM");
    state.zoneGroups.forEach(grp => {
      if (!grp.devices.length) return;
      const label = grp.groupLabel || `${grp.zoneType || "Intrusion"} Zones`;
      groupBanner(label);
      const headers = ["Device Name", "Device ID", "Zone #", "Zone Type", "Partitions"];
      const colWidths = [CW * 0.24, CW * 0.16, CW * 0.14, CW * 0.22, CW * 0.24];
      const rows = grp.devices.map((z, i) => [
        z.name || `Zone ${i + 1}`,
        z.deviceId || z.id || "",
        z.zoneNumber || "",
        z.zoneType || grp.zoneType || "",
        grp.partitions || "",
      ]);
      drawTable(headers, colWidths, rows);
    });
  }

  // ── Network (Switches) Section ─────────────────────────────────────────────
  if (swCount > 0) {
    np();
    sectionBanner("NETWORK INFRASTRUCTURE");
    state.switchGroups.forEach(grp => {
      if (!grp.devices.length) return;
      const label = grp.groupLabel || `${grp.brand || "Switch"} ${grp.model || "Group"}`.trim();
      groupBanner(label);
      const headers = ["Device Name", "Device ID", "IP Address", "MAC", "Serial #", "Port Count"];
      const colWidths = [CW * 0.20, CW * 0.14, CW * 0.18, CW * 0.18, CW * 0.16, CW * 0.14];
      const rows = grp.devices.map((sw, i) => [
        sw.name || `Switch ${i + 1}`,
        sw.deviceId || sw.id || "",
        sw.ip || "",
        sw.mac || "",
        sw.serial || "",
        sw.ports || "",
      ]);
      drawTable(headers, colWidths, rows);
    });
  }

  // ── Server Section ─────────────────────────────────────────────────────────
  if (srvCount > 0) {
    np();
    sectionBanner("SERVERS & COMPUTING");
    state.serverGroups.forEach(grp => {
      if (!grp.devices.length) return;
      const label = grp.groupLabel || `${grp.brand || "Server"} ${grp.model || "Group"}`.trim();
      groupBanner(label);
      const headers = ["Device Name", "Device ID", "IP Address", "MAC", "Serial #", "Role", "OS"];
      const colWidths = [CW * 0.17, CW * 0.11, CW * 0.15, CW * 0.16, CW * 0.15, CW * 0.13, CW * 0.13];
      const rows = grp.devices.map((s, i) => [
        s.name || `Server ${i + 1}`,
        s.deviceId || s.id || "",
        s.ip || "",
        s.mac || "",
        s.serial || "",
        grp.role || "",
        grp.os || "",
      ]);
      drawTable(headers, colWidths, rows);
    });
  }

  // ── Audio Section ──────────────────────────────────────────────────────────
  if (spkCount > 0) {
    np();
    sectionBanner("AUDIO SYSTEM");
    state.speakerGroups.forEach(grp => {
      if (!grp.devices.length) return;
      const label = grp.groupLabel || `${grp.brand || "Audio"} ${grp.model || "Group"}`.trim();
      groupBanner(label);
      const headers = ["Device Name", "Device ID", "IP Address"];
      const colWidths = [CW * 0.38, CW * 0.28, CW * 0.34];
      const rows = grp.devices.map((sp, i) => [
        sp.name || `Speaker ${i + 1}`,
        sp.deviceId || sp.id || "",
        sp.ip || "",
      ]);
      drawTable(headers, colWidths, rows);
    });
  }

  // ── Network Configuration ──────────────────────────────────────────────────
  const net = state.networkConfig;
  if (net && net.vlans && net.vlans.length > 0) {
    np();
    sectionBanner("NETWORK CONFIGURATION");

    // VLAN table
    groupBanner("VLAN & Subnet Configuration");
    const vHeaders = ["Network Name", "VLAN", "Subnet", "DHCP", "Pool", "Purpose"];
    const vColW = [CW * 0.22, CW * 0.10, CW * 0.22, CW * 0.08, CW * 0.10, CW * 0.28];
    const vRows = net.vlans.map(v => [
      v.name, v.vlanId, v.subnet, v.dhcp ? "Yes" : "No", String(v.poolSize || ""), (v.purpose || "").substring(0, 45),
    ]);
    drawTable(vHeaders, vColW, vRows);

    // SSID table
    if (net.ssids && net.ssids.length > 0) {
      groupBanner("Wireless (WiFi) Configuration");
      const prefix = net.sitePrefix || "SITE";
      const sHeaders = ["SSID Name", "Mapped Network", "Band", "Security"];
      const sColW = [CW * 0.28, CW * 0.28, CW * 0.20, CW * 0.24];
      const sRows = net.ssids.map(ssid => [
        ssid.pattern ? ssid.pattern.replace("[SITE]", prefix) : "",
        ssid.mappedVlan || "",
        ssid.band || "",
        ssid.security || "",
      ]);
      drawTable(sHeaders, sColW, sRows);
    }

    // Firewall matrix
    const fw = net.firewall;
    if (fw && fw.matrix && fw.rows && fw.cols) {
      groupBanner("Inter-VLAN Firewall Rules");
      const fwColCount = fw.cols.length + 1;
      const fwColW = CW / fwColCount;

      // Header row
      chk(14 + fw.rows.length * 6);
      doc.setFillColor(11, 31, 58); doc.rect(M, y, CW, 6, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(255, 255, 255);
      doc.text("From / To", M + 2, y + 4);
      fw.cols.forEach((col, ci) => { doc.text(col, M + (ci + 1) * fwColW + 2, y + 4); });
      y += 7;

      // Data rows
      fw.rows.forEach((rowLabel, ri) => {
        chk(7);
        doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(20, 20, 20);
        doc.text(rowLabel, M + 2, y + 3);
        fw.matrix[ri].forEach((cell, ci) => {
          const cx = M + (ci + 1) * fwColW;
          if (cell === "ALLOW") {
            doc.setFillColor(209, 250, 229); doc.rect(cx, y - 1, fwColW, 6, "F");
            doc.setTextColor(6, 95, 70);
          } else if (cell === "DENY") {
            doc.setFillColor(254, 226, 226); doc.rect(cx, y - 1, fwColW, 6, "F");
            doc.setTextColor(153, 27, 27);
          } else {
            doc.setTextColor(150, 150, 150);
          }
          doc.setFont("helvetica", "bold"); doc.setFontSize(6.5);
          doc.text(cell, cx + 2, y + 3);
        });
        y += 6;
      });
      y += 4;
    }
  }

  // ── Page numbers & footer ──────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(160, 160, 160);
    doc.text(`Page ${i} of ${totalPages}`, W - M - 18, 270);
    doc.text("CONFIDENTIAL — As-Built Documentation", M, 270);
  }

  // ── Trigger download ──────────────────────────────────────────────────────
  const fname = `AsBuilt_${projectMeta.name.replace(/\s+/g, "_").substring(0, 40)}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fname);
}
