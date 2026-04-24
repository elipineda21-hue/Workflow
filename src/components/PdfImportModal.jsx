import { useState, useRef } from "react";
import { extractPdfText, parsePdfParts } from "../utils/parsePdfParts";
import { CAT_OPTIONS } from "../constants";
import { normalizeBrand } from "../constants";

export default function PdfImportModal({ open, onClose, onImport, existingGroups }) {
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
      const textItems = await extractPdfText(file);
      console.log("PDF raw text items:", textItems.length, textItems.slice(0, 100));
      const parsed = parsePdfParts(textItems);
      console.log("Parsed items:", parsed);
      if (!parsed.length) {
        // Show raw text dump for debugging
        const sample = textItems.slice(0, 200).map(t => `[${t.x},${t.y}] "${t.text}"`).join("\n");
        console.log("Full text dump:\n", sample);
        setError("No items found. Raw text (first 200 items) logged to console (F12). Check that the PDF has section headers and line items.");
        setLoading(false);
        return;
      }
      // Build set of existing brand|model keys to auto-detect duplicates
      const existingKeys = new Set(
        (existingGroups || []).map(g => `${normalizeBrand(g.brand)}|${g.model}`.toLowerCase()).filter(k => k !== "|")
      );
      setItems(parsed.map((p, i) => {
        const key = `${normalizeBrand(p.brand)}|${p.model}`.toLowerCase();
        const isDuplicate = existingKeys.has(key);
        return { ...p, _idx: i, _include: !isDuplicate, _duplicate: isDuplicate };
      }));
    } catch (err) {
      console.error("PDF import error:", err);
      setError("Error reading PDF: " + (err.message || String(err)));
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
    <div className="fixed inset-0 bg-dark/[0.82] z-[500] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-[900px] w-full max-h-[90vh] flex flex-col shadow-[0_8px_48px_rgba(0,0,0,.45)]">
        {/* Header */}
        <div className="bg-navy rounded-t-xl px-5 py-4 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-white font-extrabold text-[15px]">📄 Import Parts from PDF</div>
            <div className="text-accent text-xs mt-0.5">
              Upload a procurement/proposal PDF with parts lists
              {fileName && <span className="text-gold ml-2">— {fileName}</span>}
            </div>
          </div>
          <button onClick={onClose} className="bg-white/[0.12] text-white border-none rounded-md p-1 px-2.5 text-[13px] cursor-pointer">✕</button>
        </div>

        {/* Upload area */}
        {items.length === 0 && !loading && (
          <div className="p-8 text-center">
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()}
              className="bg-accent text-white border-none rounded-lg px-8 py-3.5 text-sm font-extrabold cursor-pointer">
              📄 Choose PDF File
            </button>
            <div className="text-muted text-xs mt-3">
              Works with Portal.io procurement sheets, proposal PDFs, and parts lists with section headers.
            </div>
            {error && (
              <div className="bg-[#FEE2E2] rounded-lg p-3.5 text-[#991B1B] text-xs mt-4 text-left">
                {error}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="p-10 text-center text-muted">
            <div className="text-[32px] mb-2">⏳</div>
            Reading PDF...
          </div>
        )}

        {/* Items table */}
        {items.length > 0 && (
          <>
            <div className="overflow-y-auto flex-1">
              {error && (
                <div className="bg-[#FEE2E2] px-5 py-2.5 text-xs text-[#991B1B]">{error}</div>
              )}
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-surface sticky top-0">
                    <th className="px-1.5 py-2 w-[30px]"></th>
                    {["#", "Brand", "Model", "Qty", "Category", "Hardware Only"].map(h => (
                      <th key={h} className="px-2 py-2 text-left text-muted font-bold text-[10px] uppercase tracking-[0.06em] border-b border-border whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className={`border-b border-border ${!item._include ? 'bg-[#F9FAFB] opacity-40' : item.hardware ? 'bg-[#FFFBEB]' : i % 2 === 0 ? 'bg-white' : 'bg-surface'} ${item._include ? 'opacity-100' : 'opacity-40'}`}>
                      <td className="px-1.5 py-1.5 text-center">
                        <input type="checkbox" checked={item._include} onChange={() => toggleItem(i)}
                          className="w-3.5 h-3.5 accent-accent" />
                      </td>
                      <td className="px-2 py-1.5 text-muted text-[10px]">{item.lineNum}</td>
                      <td className="px-2 py-1.5 text-navy font-semibold">
                        {item.brand}
                        {item._duplicate && <span className="ml-1.5 text-[9px] font-semibold text-muted bg-border/50 rounded px-1 py-0.5">EXISTS</span>}
                      </td>
                      <td className="px-2 py-1.5 text-navy font-mono text-[11px]">{item.model}</td>
                      <td className="px-2 py-1.5 w-[60px]">
                        <input type="number" min="1" value={item.qty}
                          onChange={e => setQty(i, e.target.value)}
                          className="w-[50px] px-1.5 py-[3px] rounded border border-border text-xs text-center text-navy" />
                      </td>
                      <td className="px-2 py-1.5">
                        <select value={item.category} onChange={e => setCat(i, e.target.value)}
                          className={`px-1.5 py-[3px] rounded-[5px] text-[11px] font-bold cursor-pointer ${item.category === "unknown" ? 'border border-warn bg-[#FEF3C7] text-[#92400E]' : 'border border-border bg-white text-navy'}`}>
                          {CAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.icon} {o.label}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input type="checkbox" checked={!!item.hardware} onChange={() => setHw(i, !item.hardware)}
                          className="w-3.5 h-3.5 accent-gold" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-border flex items-center gap-3 bg-surface rounded-b-xl">
              <div className="flex-1 text-xs text-muted">
                <strong>{included.length}</strong> items will be imported as device groups.
                {items.filter(it => it.hardware && it._include).length > 0 && (
                  <span className="text-gold ml-1.5">
                    ({items.filter(it => it.hardware && it._include).length} hardware-only)
                  </span>
                )}
              </div>
              <button onClick={() => { fileRef.current?.click(); }}
                className="bg-bg text-steel border border-border rounded-[7px] px-3.5 py-2 text-xs cursor-pointer">
                ↻ Different PDF
              </button>
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
              <button onClick={onClose}
                className="bg-transparent text-muted border border-border rounded-[7px] px-[18px] py-2 text-[13px] cursor-pointer">
                Cancel
              </button>
              <button
                disabled={included.length === 0}
                onClick={() => { onImport(included); onClose(); }}
                style={{ opacity: included.length === 0 ? 0.5 : 1 }}
                className="bg-accent text-white border-none rounded-[7px] px-[22px] py-2 text-[13px] font-extrabold cursor-pointer">
                ⬆ Import {included.length} Items
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
