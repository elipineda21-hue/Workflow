// ── System Surveyor Excel Import / Export ────────────────────────────────────
import * as XLSX from "xlsx";

// ── Column mappings ──────────────────────────────────────────────────────────
// SheetJS uses 0-indexed columns: A=0, B=1, C=2 ...
const DEVICE_COLUMNS = [
  { col: 1,  key: "systemType",      header: "System Type" },
  { col: 2,  key: "assembly",        header: "Associated Node or Assembly" },
  { col: 3,  key: "elementName",     header: "Element Name" },
  { col: 4,  key: "deviceId",        header: "ID" },
  { col: 5,  key: "installStatus",   header: "Installation Status" },
  { col: 6,  key: "label",           header: "Descriptive Label" },
  { col: 7,  key: "location",        header: "Room # / Location" },
  { col: 8,  key: "brand",           header: "Component Manufacturer" },
  { col: 9,  key: "model",           header: "Component Model #" },
  { col: 10, key: "quantity",        header: "Element Quantity" },
  { col: 11, key: "price",           header: "Device Price" },
  { col: 12, key: "installHours",    header: "Installation Hours" },
  { col: 13, key: "installDate",     header: "Installation Date" },
  { col: 14, key: "maintenanceFreq", header: "Maintenance Frequency" },
  // columns O-U (15-20) are skipped in the spec
  { col: 21, key: "recordingFps",    header: "Recording Frame Rate / second" },
  { col: 22, key: "viewingFps",      header: "Viewing Frame Rate / second" },
  { col: 23, key: "ip",              header: "Network / IP Address" },
  { col: 24, key: "username",        header: "Username" },
  { col: 25, key: "firmware",        header: "Software/Firmware version" },
  { col: 26, key: "configAttr",      header: "Device configuration attribute" },
  { col: 27, key: "serialMac",       header: "Serial Number / MAC Address" },
  { col: 28, key: "licenseKey",      header: "License Key / Code" },
  { col: 29, key: "password",        header: "Password" },
  { col: 30, key: "dnsGateway",      header: "DNS Gateway" },
  { col: 31, key: "subnetMask",      header: "Subnet Mask" },
];

// ── System Type → category ──────────────────────────────────────────────────
const SYSTEM_TYPE_MAP = {
  "Video Surveillance":   "camera",
  "Access Control":       "door",
  "Intrusion Detection":  "zone",
  "Audio Visual":         "speaker",
  "Information Technology":"switch",
  "Infrastructure":       "hardware",
  "Communications":       "speaker",
  "Facility Equipment":   "hardware",
  "Building Management":  "hardware",
};

// ── Element Name hints (lowercase match) ─────────────────────────────────────
const NO_PROGRAMMING_ELEMENTS = [
  "cable path", "flex cable path", "equipment rack",
  "ups power unit", "network patch panel", "user interface panel",
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function cellValue(sheet, row, col) {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = sheet[addr];
  if (!cell) return "";
  return cell.v != null ? cell.v : "";
}

function mapCategory(systemType) {
  return SYSTEM_TYPE_MAP[systemType] || "hardware";
}

function isNoProgramming(elementName) {
  if (!elementName) return false;
  const lower = String(elementName).toLowerCase();
  return NO_PROGRAMMING_ELEMENTS.some((e) => lower.includes(e));
}

// ── IMPORT ───────────────────────────────────────────────────────────────────
/**
 * Parse a System Surveyor batch-export .xlsx file.
 * @param {File} file  Browser File object (or Node Buffer)
 * @returns {Promise<{siteInfo: object, devices: object[]}>}
 */
export async function parseSystemSurveyorXlsx(file) {
  const buf = file instanceof ArrayBuffer
    ? file
    : await file.arrayBuffer();

  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];

  // ── Site info (rows are 1-indexed in spec, 0-indexed here) ──
  const siteInfo = {
    name:        String(cellValue(sheet, 2, 3)),   // Row 3, col D
    address:     String(cellValue(sheet, 3, 3)),   // Row 4, col D
    surveyName:  String(cellValue(sheet, 6, 3)),   // Row 7, col D
    location:    String(cellValue(sheet, 7, 3)),   // Row 8, col D
    description: String(cellValue(sheet, 8, 3)),   // Row 9, col D
    exportedBy:  String(cellValue(sheet, 10, 3)),  // Row 11, col D
    exportDate:  String(cellValue(sheet, 11, 3)),  // Row 12, col D
  };

  // ── Device table (header row 15 = index 14, data from row 16 = index 15+) ──
  const devices = [];
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const lastRow = range.e.r;

  for (let r = 15; r <= lastRow; r++) {
    // Skip empty rows (check column B = systemType)
    const systemType = String(cellValue(sheet, r, 1)).trim();
    if (!systemType) continue;

    const device = {};
    for (const { col, key } of DEVICE_COLUMNS) {
      let val = cellValue(sheet, r, col);
      // Coerce quantity to number
      if (key === "quantity") {
        val = val === "" || val == null ? 1 : Number(val) || 1;
      } else {
        val = val != null ? String(val) : "";
      }
      device[key] = val;
    }

    device.category = mapCategory(device.systemType);
    device.noProgramming = isNoProgramming(device.elementName);

    devices.push(device);
  }

  return { siteInfo, devices };
}

// ── EXPORT ───────────────────────────────────────────────────────────────────
/**
 * Build a System Surveyor-compatible .xlsx workbook.
 * @param {object} projectData
 * @returns {ArrayBuffer}
 */
export function buildSystemSurveyorXlsx({
  siteName,
  siteAddress,
  surveyName,
  surveyLocation,
  description,
  exportedBy,
  exportDate,
  devices,
}) {
  const wb = XLSX.utils.book_new();
  const sheet = {};

  // ── Helper to write a cell ──────────────────────────────────────────────
  const setCell = (r, c, value, style) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = { v: value, t: typeof value === "number" ? "n" : "s" };
    if (style) cell.s = style;
    sheet[addr] = cell;
  };

  // ── Site info labels (column C = 2) and values (column D = 3) ──────────
  setCell(2, 2, "Site Name");
  setCell(2, 3, siteName || "");

  setCell(3, 2, "Site Address");
  setCell(3, 3, siteAddress || "");

  setCell(6, 2, "Survey Name");
  setCell(6, 3, surveyName || "");

  setCell(7, 2, "Survey Location");
  setCell(7, 3, surveyLocation || "");

  setCell(8, 2, "Survey Description");
  setCell(8, 3, description || "");

  setCell(10, 2, "Exported By");
  setCell(10, 3, exportedBy || "");

  setCell(11, 2, "Export Date");
  setCell(11, 3, exportDate || "");

  // ── Header row (row 15 = index 14) ─────────────────────────────────────
  const headerStyle = {
    fill: { fgColor: { rgb: "C6EFCE" } },
    font: { bold: true },
  };

  for (const { col, header } of DEVICE_COLUMNS) {
    setCell(14, col, header, headerStyle);
  }

  // ── Device rows (starting row 16 = index 15) ──────────────────────────
  if (devices && devices.length) {
    devices.forEach((device, i) => {
      const r = 15 + i;
      for (const { col, key } of DEVICE_COLUMNS) {
        const val = device[key] != null ? device[key] : "";
        setCell(r, col, val);
      }
    });
  }

  // ── Calculate sheet range ──────────────────────────────────────────────
  const lastDataRow = devices && devices.length ? 15 + devices.length - 1 : 14;
  const lastCol = DEVICE_COLUMNS.reduce((mx, d) => Math.max(mx, d.col), 0);
  sheet["!ref"] = XLSX.utils.encode_range(
    { r: 0, c: 0 },
    { r: lastDataRow, c: lastCol },
  );

  // ── Column widths (rough) ──────────────────────────────────────────────
  const colWidths = [];
  for (let c = 0; c <= lastCol; c++) {
    colWidths.push({ wch: 20 });
  }
  sheet["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, sheet, "Summary Table");

  // Return ArrayBuffer
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return out.buffer ? out.buffer : out;
}
