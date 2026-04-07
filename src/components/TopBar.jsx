export default function TopBar({
  selectedProject, saveStatus, totalDevices,
  importFileRef, handleProposalFileChange,
  tab, setTab, TABS,
  onBack, onReports, onPdfImport,
}) {
  return (
    <div className="bg-navy sticky top-0 z-[100] shadow-[0_2px_12px_rgba(0,0,0,.35)]">
      <div className="flex items-center gap-3 px-[18px] h-12">
        <button onClick={onBack} className="bg-white/10 text-white border-none rounded-[5px] p-1 px-2.5 text-[11px] cursor-pointer">← Back</button>
        <div className="w-px h-6 bg-white/15" />
        <div>
          <div className="text-white font-extrabold text-[13px]">{selectedProject?.name || "Project"}</div>
          <div className="text-accent text-[10px]">ID: {selectedProject?.projectId || "—"}</div>
        </div>
        <div className="ml-auto flex gap-2.5 items-center">
          {saveStatus === "saving" && <span className="text-white/45 text-[11px]">⏳ Saving…</span>}
          {saveStatus === "saved"  && <span className="text-success text-[11px] font-bold">✓ Saved</span>}
          {saveStatus === "error"  && <span className="text-danger text-[11px] font-bold">⚠ Save failed</span>}
          {totalDevices > 0 && (
            <span className="bg-accent text-white rounded-xl px-2.5 py-0.5 text-[11px] font-bold">
              {totalDevices} devices
            </span>
          )}
          <input ref={importFileRef} type="file" accept=".csv" className="hidden" onChange={handleProposalFileChange} />
          <button onClick={onPdfImport}
            className="bg-steel text-white border border-white/15 rounded-md px-3.5 py-[7px] text-[11px] font-bold cursor-pointer">
            📄 Import PDF
          </button>
          <button onClick={onReports}
            className="bg-gold text-navy border-none rounded-md px-4 py-[7px] text-xs font-extrabold cursor-pointer">
            📊 Reports
          </button>
        </div>
      </div>
      {/* Tabs */}
      <div className="flex overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`${tab === t.id ? 'bg-accent text-white border-b-[3px] border-b-white' : 'bg-transparent text-white/55 border-b-[3px] border-b-transparent'} border-none px-3.5 py-2 text-[11px] font-bold cursor-pointer whitespace-nowrap flex items-center gap-[5px] rounded-t-[3px]`}>
            {t.icon} {t.label}
            {t.count > 0 && <span className="bg-gold text-navy rounded-lg px-[5px] text-[10px] font-extrabold">{t.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
