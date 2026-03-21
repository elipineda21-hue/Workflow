import { F, Inp, Sel } from "./ui";

export default function ModelSelector({ db, brand, model, onBrand, onModel, onApply }) {
  const brandList = db.map(b => b.brand);
  const brandEntry = db.find(b => b.brand === brand);
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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
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
            {modelList.map(m => <option key={m.model} value={m.model}>{m.name} ({m.model})</option>)}
          </Sel>
        )}
      </F>
    </div>
  );
}
