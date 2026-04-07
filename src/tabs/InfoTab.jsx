import { PANEL_DB } from "../deviceDB";
import { CardHead, G, F, Inp, Sel } from "../components/ui";

export default function InfoTab({ info, setI, nvrInfo, setNV, panelInfo, setPan }) {
  return (
    <div>
      <div className="bg-white rounded-xl border border-border overflow-hidden mb-5">
        <CardHead icon="📋" title="Job & Project Details" color="#0B1F3A" />
        <div className="p-4">
          <G cols={3}>
            <F label="Customer"><Inp value={info.customer} onChange={e => setI("customer", e.target.value)} placeholder="Customer / Client name" /></F>
            <F label="Site Address" span={2}><Inp value={info.siteAddress} onChange={e => setI("siteAddress", e.target.value)} placeholder="Full site address" /></F>
            <F label="Tech Lead"><Inp value={info.techLead} onChange={e => setI("techLead", e.target.value)} /></F>
            <F label="Tech(s) On-Site"><Inp value={info.techs} onChange={e => setI("techs", e.target.value)} placeholder="e.g. Brendan, Jake" /></F>
            <F label="Date"><Inp type="date" value={info.date} onChange={e => setI("date", e.target.value)} /></F>
            <F label="Submitted By"><Inp value={info.submittedBy} onChange={e => setI("submittedBy", e.target.value)} /></F>
          </G>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-border overflow-hidden mb-5">
        <CardHead icon="🖥" title="VMS / Recorder Details" color="#1A3355" />
        <div className="p-4">
          <G cols={4}>
            {[["NVR/DVR Brand","nvrBrand","e.g. Hikvision"],["Model","nvrModel","DS-9632NI"],["IP Address","nvrIp","192.168.x.x"],["Serial Number","nvrSerial",""],["Firmware","nvrFirmware",""],["Storage","nvrStorage","e.g. 4x4TB"],["Retention","nvrRetention","e.g. 30 days"],["VMS Software","vmsSoftware","e.g. iVMS-4200"]].map(([lbl, k, ph]) => (
              <F key={k} label={lbl}><Inp value={nvrInfo[k]} onChange={e => setNV(k, e.target.value)} placeholder={ph} /></F>
            ))}
          </G>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <CardHead icon="🔔" title="Intrusion Panel Details" color="#1A3355" />
        <div className="p-4">
          <G cols={4}>
            <F label="Panel Brand">
              <Sel value={panelInfo.panelBrand} onChange={e => setPan("panelBrand", e.target.value)}>
                <option value="">Select...</option>
                {PANEL_DB.map(b => <option key={b.brand}>{b.brand}</option>)}
                <option>Other</option>
              </Sel>
            </F>
            <F label="Model">
              {(() => {
                const entry = PANEL_DB.find(b => b.brand === panelInfo.panelBrand);
                return entry ? (
                  <Sel value={panelInfo.panelModel} onChange={e => setPan("panelModel", e.target.value)}>
                    <option value="">Select model...</option>
                    {entry.models.map(m => <option key={m.model} value={m.model}>{m.name} ({m.model})</option>)}
                  </Sel>
                ) : (
                  <Inp value={panelInfo.panelModel} onChange={e => setPan("panelModel", e.target.value)} />
                );
              })()}
            </F>
            {[["Serial #","panelSerial"],["Firmware","panelFirmware"]].map(([lbl, k]) => (
              <F key={k} label={lbl}><Inp value={panelInfo[k]} onChange={e => setPan(k, e.target.value)} /></F>
            ))}
          </G>
        </div>
      </div>
    </div>
  );
}
