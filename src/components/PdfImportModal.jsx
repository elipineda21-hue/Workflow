import { useState, useRef } from "react";
import { C } from "../constants";
import { extractPdfText, parsePdfParts } from "../utils/parsePdfParts";

const CAT_OPTIONS = [
  { value: "camera",  label: "CCTV / Camera",   icon: "📷" },
  { value: "door",    label: "Access Control",   icon: "🚪" },
  { value: "zone",    label: "Intrusion",        icon: "🔔" },
  { value: "speaker", label: "Audio",            icon: "🔊" },
  { value: "switch",  label: "Network Switch",   icon: "🔀" },
  { value: "server",  label: "Server / NVR",     icon: "🖥" },
  { value: "unknown", label: "Skip",             icon: "⊘" },
];

export default function PdfImportModal({ open, onClose, onImport }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef(null);

  if (!open) return null;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setFileName(file.name);
    setLoading(true);
    setError("");
    setItems([]);
    try {
      const lines = await extractPdfText(file);
      const parsed = parsePdfParts(lines);
      if (!parsed.length) {
        setError("No items found in this PDF. Make sure it's a procurement/parts list with section headers (e.g. 'Surveillance  8 Items') and line items with brand, model, and quantity.");
        setLoading(false);
        return;
      }
      setItems(parsed.map((p, i) => ({ ...p, _idx: i, _include: true })));
    } catch (err) {
      setError("Error reading PDF: " + err.message);
    }
    setLoading(false);
  };

  const toggleItem = (idx) => setItems(its => its.map((it, i) => i === idx ? { ...it, _include: !it._include } : it));
  const setCat = (idx, cat) => setItems(its => its.map((it, i) => i === idx ? { ...it, category: cat } : it));
  const setHw = (idx, hw) => setItems(its => its.map((it, i) => i === idx ? { ...it, hardware: hw } : it));
  const setQty = (idx, q) => setItems(its => its.map((it, i) => i === idx ? { ...it, qty: Math.max(1, parseInt(q) || 1) } : it));

  const included = items.filter(it => it._include && it.category !== "unknown");
  const catIcon = (cat) => CAT_OPTIONS.find(c => c.value === cat)?.icon || "?";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(7,20,42,0.82)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: C.white, borderRadius: 12, maxWidth: 900, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 48px rgba(0,0,0,.45)" }}>
        {/* Header */}
        <div style={{ background: C.navy, borderRadius: "12px 12px 0 0", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.white, fontWeight: 800, fontSize: 15 }}>📄 Import Parts from PDF</div>
            <div style={{ color: C.accent, fontSize: 12, marginTop: 2 }}>
              Upload a procurement/proposal PDF with parts lists
              {fileName && <span style={{ color: C.gold, marginLeft: 8 }}>— {fileName}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.12)", color: C.white, border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 13, cursor: "pointer" }}>✕</button>
        </div>

        {/* Upload area */}
        {items.length === 0 && !loading && (
          <div style={{ padding: 32, textAlign: "center" }}>
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()}
              style={{ background: C.accent, color: C.white, border: "none", borderRadius: 8, padding: "14px 32px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              📄 Choose PDF File
            </button>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 12 }}>
              Works with Portal.io procurement sheets, proposal PDFs, and parts lists with section headers.
            </div>
            {error && (
              <div style={{ background: "#FEE2E2", borderRadius: 8, padding: 14, color: "#991B1B", fontSize: 12, marginTop: 16, textAlign: "left" }}>
                {error}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            Reading PDF...
          </div>
        )}

        {/* Items table */}
        {items.length > 0 && (
          <>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {error && (
                <div style={{ background: "#FEE2E2", padding: "10px 20px", fontSize: 12, color: "#991B1B" }}>{error}</div>
              )}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.surface, position: "sticky", top: 0 }}>
                    <th style={{ padding: "8px 6px", width: 30 }}></th>
                    {["#", "Brand", "Model", "Qty", "Category", "Hardware Only"].map(h => (
                      <th key={h} style={{ padding: "8px 8px", textAlign: "left", color: C.muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} style={{ background: !item._include ? "#F9FAFB" : item.hardware ? "#FFFBEB" : i % 2 === 0 ? C.white : C.surface, borderBottom: `1px solid ${C.border}`, opacity: item._include ? 1 : 0.4 }}>
                      <td style={{ padding: "6px 6px", textAlign: "center" }}>
                        <input type="checkbox" checked={item._include} onChange={() => toggleItem(i)}
                          style={{ accentColor: C.accent, width: 14, height: 14 }} />
                      </td>
                      <td style={{ padding: "6px 8px", color: C.muted, fontSize: 10 }}>{item.lineNum}</td>
                      <td style={{ padding: "6px 8px", color: C.navy, fontWeight: 600 }}>{item.brand}</td>
                      <td style={{ padding: "6px 8px", color: C.navy, fontFamily: "monospace", fontSize: 11 }}>{item.model}</td>
                      <td style={{ padding: "6px 8px", width: 60 }}>
                        <input type="number" min="1" value={item.qty}
                          onChange={e => setQty(i, e.target.value)}
                          style={{ width: 50, padding: "3px 6px", borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 12, textAlign: "center", color: C.navy }} />
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <select value={item.category} onChange={e => setCat(i, e.target.value)}
                          style={{ padding: "3px 6px", borderRadius: 5, border: `1px solid ${item.category === "unknown" ? C.warn : C.border}`, background: item.category === "unknown" ? "#FEF3C7" : C.white, color: item.category === "unknown" ? "#92400E" : C.navy, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                          {CAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.icon} {o.label}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "center" }}>
                        <input type="checkbox" checked={!!item.hardware} onChange={() => setHw(i, !item.hardware)}
                          style={{ accentColor: C.gold, width: 14, height: 14 }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, background: C.surface, borderRadius: "0 0 12px 12px" }}>
              <div style={{ flex: 1, fontSize: 12, color: C.muted }}>
                <strong>{included.length}</strong> items will be imported as device groups.
                {items.filter(it => it.hardware && it._include).length > 0 && (
                  <span style={{ color: C.gold, marginLeft: 6 }}>
                    ({items.filter(it => it.hardware && it._include).length} hardware-only)
                  </span>
                )}
              </div>
              <button onClick={() => { fileRef.current?.click(); }}
                style={{ background: C.bg, color: C.steel, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 14px", fontSize: 12, cursor: "pointer" }}>
                ↻ Different PDF
              </button>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleFile} />
              <button onClick={onClose}
                style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 18px", fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
              <button
                disabled={included.length === 0}
                onClick={() => { onImport(included); onClose(); }}
                style={{ background: C.accent, color: C.white, border: "none", borderRadius: 7, padding: "8px 22px", fontSize: 13, fontWeight: 800, cursor: "pointer", opacity: included.length === 0 ? 0.5 : 1 }}>
                ⬆ Import {included.length} Items
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
