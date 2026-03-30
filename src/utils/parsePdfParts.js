// ── PDF Parts List Parser ─────────────────────────────────────────────────────
// Extracts brand, model, quantity from Portal.io procurement/proposal PDFs.
//
// Strategy: Use the spatial X/Y positions from pdf.js directly.
// Portal.io layout columns (approximate X positions):
//   x ≈ 30       → line numbers (01, 02, ...)
//   x ≈ 94       → brand (above lineNum) and model (below lineNum)
//   x ≈ 259-263  → quantity
//   x ≈ 41       → section headers

function sectionToCategory(text) {
  const t = (text || "").toLowerCase().trim();
  if (/surveillance|cctv|video\s*surveil|camera\s*system|vss/i.test(t)) return "camera";
  if (/^access\s*control$/i.test(t))                                   return "door";
  if (/intrusion|alarm|burglar|detection/i.test(t))                     return "zone";
  if (/audio|speaker|sound|intercom|paging/i.test(t))                   return "speaker";
  if (/^network/i.test(t))                                              return "switch";
  if (/server|nvr|dvr|recording|storage|vms/i.test(t))                  return "server";
  if (/^video$/i.test(t))                                               return "camera";
  if (/connector|adapter/i.test(t))                                     return "hardware";
  if (/equipment\s*rack|rack/i.test(t))                                 return "hardware";
  if (/installation\s*suppli|suppli/i.test(t))                          return "hardware";
  if (/power\s*manage|power\s*supply/i.test(t))                         return "hardware";
  if (/mount|bracket|enclosure/i.test(t))                               return "hardware";
  if (/^wire|^low\s*voltage\s*wire|cable$/i.test(t))                    return "hardware";
  if (/custom\s*items?/i.test(t))                                       return "hardware";
  return null;
}

const HARDWARE_PATTERNS = [
  /junction/i, /j-?box/i, /mount/i, /bracket/i, /adapter/i,
  /power\s*supply/i, /transformer/i, /conduit/i, /backbox/i,
  /faceplate/i, /patch\s*panel/i, /rack/i, /enclosure/i, /housing/i,
  /wall\s*plate/i, /connector/i, /splitter/i, /^tr-/i, /maximal/i,
  /vevor/i, /cat6/i, /plenum/i, /pdu/i,
];

function isHardwareOnly(model, brand) {
  const combined = `${brand || ""} ${model || ""}`;
  return HARDWARE_PATTERNS.some(p => p.test(combined));
}

// ── PDF text extraction ─────────────────────────────────────────────────────
export async function extractPdfText(file) {
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error("PDF.js not loaded yet. Please wait and try again.");

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allTokens = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items
      .filter(i => i.str.trim())
      .map(i => ({
        text: i.str.trim(),
        x: Math.round(i.transform[4]),
        y: Math.round(i.transform[5]),
        page: p,
      }));
    allTokens.push(...items);
  }
  return allTokens;
}

// ── Spatial parser ──────────────────────────────────────────────────────────
// Instead of row grouping, directly match tokens by their X/Y positions
// relative to each line-number token.

export function parsePdfParts(textItems) {
  console.log("PDF raw tokens:", textItems.length);

  // Noise filter for individual tokens
  const isNoise = (t) => {
    const s = t.text.toLowerCase();
    return /^(required|in-stock|in stock|order|received|qty|taken by|taken|by|x\.+|[-=|])$/.test(s);
  };

  // --- Step 1: Identify ALL line-number tokens ---
  // Line numbers are at x ≈ 25-35, two-digit zero-padded or plain numbers 1-99
  const lineNumTokens = textItems.filter(t =>
    t.x >= 20 && t.x <= 40 &&
    /^\d{1,2}$/.test(t.text) &&
    parseInt(t.text) >= 1 && parseInt(t.text) <= 99
  ).sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return b.y - a.y; // top to bottom within page
  });

  console.log("Line numbers found:", lineNumTokens.map(t => `#${t.text} (p${t.page}, y=${t.y})`));

  // --- Step 2: Identify section headers ---
  // Section headers are at x ≈ 41, standalone text rows
  const sectionHeaders = [];
  // Group tokens into Y-rows first just for section detection
  const rowMap = new Map(); // key: "page:y_bucket" → tokens
  for (const t of textItems) {
    const key = `${t.page}:${Math.round(t.y / 6) * 6}`;
    if (!rowMap.has(key)) rowMap.set(key, []);
    rowMap.get(key).push(t);
  }

  for (const [key, tokens] of rowMap) {
    // Section headers: text starting at x ≈ 35-50, often followed by "N Items"
    const leftToken = tokens.find(t => t.x >= 35 && t.x <= 55);
    if (!leftToken) continue;

    // Skip if this row has a line number (it's a line item, not a header)
    const hasLineNum = tokens.some(t => t.x >= 20 && t.x <= 35 && /^\d{1,2}$/.test(t.text));
    if (hasLineNum) continue;

    const mainText = tokens
      .filter(t => t.x >= 35 && t.x <= 500 && !/^\d+\s*items?$/i.test(t.text))
      .map(t => t.text).join(" ").trim();

    const cat = sectionToCategory(mainText);
    if (cat) {
      sectionHeaders.push({ page: leftToken.page, y: leftToken.y, category: cat, label: mainText });
    }
  }

  // Sort by page then Y descending
  sectionHeaders.sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return b.y - a.y;
  });

  console.log("Sections:", sectionHeaders.map(s => `${s.label} → ${s.category} (p${s.page} y=${s.y})`));

  const getCategoryAt = (page, y) => {
    let cat = "unknown";
    for (const s of sectionHeaders) {
      if (s.page < page || (s.page === page && s.y > y)) {
        cat = s.category;
      }
    }
    return cat;
  };

  // --- Step 3: Build line-number Y-boundaries ---
  // For each line number, define the Y-range where its brand/model/qty live.
  // Brand is ABOVE the line number, model is BELOW (or at same Y).
  // The boundary extends to the midpoint between adjacent line numbers.

  // Also need to know section header Y positions to avoid crossing them
  const sectionYs = sectionHeaders.map(s => ({ page: s.page, y: s.y }));

  // --- Step 4: For each line number, find brand, qty, model by spatial proximity ---
  const results = [];
  const usedLineNums = new Set();

  // Content-area tokens: x >= 80, not noise
  const contentTokens = textItems.filter(t =>
    t.x >= 80 && t.x <= 450 && !isNoise(t) &&
    !/^\d+\s*items?$/i.test(t.text) &&
    !/^\d+\s+of\s+\d+$/.test(t.text) &&
    !/^proposal\s*#/i.test(t.text) &&
    !/^sisler/i.test(t.text) &&
    !/^calidad/i.test(t.text) &&
    !/^pick\s*list/i.test(t.text) &&
    !/^x\.+$/i.test(t.text)
  );

  // Qty tokens: numbers at x ≈ 245-280
  const qtyTokens = textItems.filter(t =>
    t.x >= 245 && t.x <= 280 &&
    /^\d+(\.\d+)?$/.test(t.text)
  );

  for (let i = 0; i < lineNumTokens.length; i++) {
    const ln = lineNumTokens[i];
    const lineNum = parseInt(ln.text);
    if (usedLineNums.has(lineNum)) continue;
    usedLineNums.add(lineNum);

    // Determine Y boundaries for this line item
    // Upper bound: the line number above this one (or section header, or page top)
    // Lower bound: the next line number below (or next section header, or page bottom)
    const prevLn = lineNumTokens[i - 1];
    const nextLn = lineNumTokens[i + 1];

    // Use MIDPOINT boundaries between adjacent line numbers to prevent
    // one item's brand/model from bleeding into a neighbor's zone.
    let upperY = ln.y + 60; // default: 60 units above
    if (prevLn && prevLn.page === ln.page) {
      upperY = Math.min(upperY, Math.floor((ln.y + prevLn.y) / 2));
    }
    // Don't cross section headers above
    for (const sh of sectionYs) {
      if (sh.page === ln.page && sh.y > ln.y && sh.y < upperY) {
        upperY = sh.y - 2;
      }
    }

    let lowerY = ln.y - 50; // default: 50 units below
    if (nextLn && nextLn.page === ln.page) {
      lowerY = Math.max(lowerY, Math.ceil((ln.y + nextLn.y) / 2));
    }

    // --- Find BRAND: content tokens clearly ABOVE the line number ---
    // Brand sits at x ≈ 94, meaningfully above lineNum (y > ln.y + 5).
    // The +5 threshold prevents model text that's nearly co-located with
    // the lineNum from being mis-classified as brand.
    const brandCandidates = contentTokens.filter(t =>
      t.page === ln.page &&
      t.y > ln.y + 5 && t.y <= upperY &&
      t.x >= 80 && t.x <= 230
    ).sort((a, b) => a.y - b.y); // closest to lineNum first (lowest Y first)

    let brand = null;
    if (brandCandidates.length > 0) {
      // Group brand candidates by Y proximity (within ±4)
      const brandGroup = [brandCandidates[0]];
      for (let j = 1; j < brandCandidates.length; j++) {
        if (Math.abs(brandCandidates[j].y - brandCandidates[0].y) <= 4) {
          brandGroup.push(brandCandidates[j]);
        }
      }
      brand = brandGroup.map(t => t.text).join(" ").trim();
    }

    // --- Find QTY: number at x ≈ 245-280, near the brand Y or lineNum Y ---
    let qty = 1;
    const qtyCandidates = qtyTokens.filter(t =>
      t.page === ln.page &&
      t.y >= lowerY && t.y <= upperY
    ).sort((a, b) => Math.abs(a.y - ln.y) - Math.abs(b.y - ln.y)); // closest to lineNum

    if (qtyCandidates.length > 0) {
      qty = parseFloat(qtyCandidates[0].text);
      if (qty < 0.1) qty = 1;
      qty = Math.ceil(qty);
    }

    // --- Find MODEL: content tokens AT or BELOW the line number ---
    // Model sits at x ≈ 94, at or just below lineNum Y.
    // Use ln.y + 5 as upper bound so tokens nearly co-located with lineNum
    // (like "USW-Pro-Max-16-PoE" at y=382 vs lineNum y=380) are captured.
    // Restrict to x <= 230 (brand/model column) to avoid qty tokens at x ≈ 263.
    const modelCandidates = contentTokens.filter(t =>
      t.page === ln.page &&
      t.y <= ln.y + 5 && t.y >= lowerY &&
      t.x >= 80 && t.x <= 230
    ).sort((a, b) => b.y - a.y); // highest Y first (closest to lineNum)

    let model = null;
    if (modelCandidates.length > 0) {
      // The model might be on the same Y-line as the lineNum, or just below
      // Group model tokens that are within ±4 Y of each other
      const firstModelY = modelCandidates[0].y;
      const modelGroup = modelCandidates.filter(t =>
        Math.abs(t.y - firstModelY) <= 4
      );

      if (modelGroup.length > 0) {
        model = modelGroup.map(t => t.text).join(" ").trim();

        // Check for continuation line (e.g., "(180W)" or "I0-NB")
        // Look for tokens on the NEXT line down (Y 10-25 below the model)
        const contCandidates = modelCandidates.filter(t =>
          t.y < firstModelY - 5 && t.y >= firstModelY - 25 &&
          t.x >= 80 && t.x <= 230
        );
        if (contCandidates.length > 0) {
          // Only treat as continuation if there's no line number at that Y
          const contY = contCandidates[0].y;
          const hasLnAtContY = lineNumTokens.some(l =>
            l.page === ln.page && Math.abs(l.y - contY) <= 5
          );
          if (!hasLnAtContY) {
            const contText = contCandidates
              .filter(t => Math.abs(t.y - contY) <= 4)
              .map(t => t.text).join(" ").trim();
            if (contText && !/required|in.stock|order|received|taken/i.test(contText)) {
              model = model + " " + contText;
            }
          }
        }
      }
    }

    // --- Handle items with no separate brand (e.g., "MISC Hardware") ---
    // These have text at x ≈ 94 on the SAME Y as the lineNum, with no brand above
    if (!brand && model) {
      brand = model;
    }
    if (!model && brand) {
      model = brand;
    }

    // For items where model appears on same line as lineNum and brand is
    // actually the previous item's model — detect this by checking if the brand
    // looks like a model number rather than a brand name
    // (We rely on the Y-boundary logic to prevent this)

    if (!brand || !model) {
      console.log(`Skipping line #${lineNum}: brand=${brand}, model=${model}`);
      continue;
    }

    brand = brand.replace(/\s*\|.*$/, "").trim();

    const category = getCategoryAt(ln.page, ln.y);
    const isHwSection = category === "hardware";

    results.push({
      lineNum,
      brand,
      model,
      qty: Math.max(1, qty),
      category: isHwSection ? "unknown" : category,
      sectionLabel: category,
      hardware: isHwSection || isHardwareOnly(model, brand),
    });
  }

  console.log("Parsed results:", results);
  return results;
}
