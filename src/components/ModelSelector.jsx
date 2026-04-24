import { F, Inp, Sel } from "./ui";

export default function ModelSelector({ db, catalog, brand, model, onBrand, onModel, onApply }) {
  // Merge hardcoded db with catalog entries
  const mergedBrands = new Map();

  // Add hardcoded db entries
  for (const b of db) {
    mergedBrands.set(b.brand, { brand: b.brand, models: [...b.models] });
  }

  // Add catalog entries (if provided)
  if (catalog && catalog.length > 0) {
    for (const entry of catalog) {
      if (!entry.brand || !entry.model) continue;
      if (mergedBrands.has(entry.brand)) {
        const existing = mergedBrands.get(entry.brand);
        if (!existing.models.find(m => m.model === entry.model)) {
          existing.models.push({ model: entry.model, name: entry.display_name || entry.model });
        }
      } else {
        mergedBrands.set(entry.brand, {
          brand: entry.brand,
          models: [{ model: entry.model, name: entry.display_name || entry.model }],
        });
      }
    }
  }

  const brandList = [...mergedBrands.keys()].sort();
  const brandEntry = mergedBrands.get(brand);
  const modelList = brandEntry ? brandEntry.models : [];

  const handleBrand = (b) => {
    onBrand(b);
    onModel("");
  };
  const handleModel = (m) => {
    onModel(m);
    if (onApply && brandEntry) {
      const obj = brandEntry.models.find(x => x.model === m);
      if (obj) onApply(obj);
    }
  };
  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: "1fr 2fr" }}>
      <F label="Brand">
        <Sel value={brand} onChange={e => handleBrand(e.target.value)}>
          <option value="">-- Select Brand --</option>
          {brandList.map(b => <option key={b}>{b}</option>)}
          <option value="__custom__">Other / Custom</option>
        </Sel>
      </F>
      <F label="Model">
        {brand === "__custom__" || !brandEntry ? (
          <Inp value={model} onChange={e => onModel(e.target.value)} placeholder="Enter model number / name" />
        ) : (
          <Sel value={model} onChange={e => handleModel(e.target.value)}>
            <option value="">-- Select Model --</option>
            {modelList.map(m => <option key={m.model} value={m.model}>{m.name || m.model} ({m.model})</option>)}
          </Sel>
        )}
      </F>
    </div>
  );
}
