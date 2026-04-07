export default function TopBar({
  selectedProject, saveStatus, totalDevices,
  importFileRef, handleProposalFileChange,
  tab, setTab, TABS,
  onBack, onReports, onPdfImport,
}) {
  return (
    <div className="bg-gradient-to-r from-dark to-navy sticky top-0 z-[100] shadow-[0_2px_20px_rgba(0,0,0,.4)]">
      <div className="flex items-center gap-3 px-5 h-14">
        <button onClick={onBack} className="bg-white/[0.08] hover:bg-white/15 text-white/70 hover:text-white border-none rounded-lg py-1.5 px-3 text-[11px] font-medium cursor-pointer">← Back</button>
        <div className="w-px h-7 bg-white/10" />
        <div>
          <div className="text-white font-bold text-sm tracking-tight">{selectedProject?.name || "Project"}</div>
          <div className="text-accent/70 text-[10px] font-medium">ID: {selectedProject?.projectId || "—"}</div>
        </div>
        <div className="ml-auto flex gap-2.5 items-center">
          {saveStatus === "saving" && <span className="text-white/40 text-[11px] font-medium">Saving…</span>}
          {saveStatus === "saved"  && <span className="text-success text-[11px] font-semibold">Saved</span>}
          {saveStatus === "error"  && <span className="text-danger text-[11px] font-semibold">Save failed</span>}
          {totalDevices > 0 && (
            <span className="bg-white/[0.08] text-white/70 rounded-lg px-2.5 py-1 text-[11px] font-medium">
              {totalDevices} devices
            </span>
          )}
          <input ref={importFileRef} type="file" accept=".csv" className="hidden" onChange={handleProposalFileChange} />
          <button onClick={onPdfImport}
            className="bg-white/[0.08] hover:bg-white/15 text-white/80 hover:text-white border-none rounded-lg px-3.5 py-1.5 text-[11px] font-semibold cursor-pointer">
            Import PDF
          </button>
          <button onClick={onReports}
            className="bg-accent hover:bg-accent/90 text-white border-none rounded-lg px-4 py-1.5 text-[11px] font-semibold cursor-pointer">
            Reports
          </button>
        </div>
      </div>
      {/* Tabs */}
      <div className="flex overflow-x-auto px-2 gap-0.5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`${tab === t.id ? 'bg-white/15 text-white' : 'bg-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.05]'} border-none px-3.5 py-2 text-[11px] font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1.5 rounded-lg transition-all duration-150`}>
            {t.icon} {t.label}
            {t.count > 0 && <span className="bg-accent/20 text-accent rounded-md px-1.5 text-[10px] font-bold">{t.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
