import { PANEL_DB } from "../deviceDB";
import { CCTV_PLATFORMS, ACCESS_PLATFORMS, INTRUSION_PLATFORMS, AUDIO_PLATFORMS, NETWORK_PLATFORMS } from "../constants";
import { CardHead, G, F, Inp, Sel } from "../components/ui";
import { Camera, MonitorCog, Network, DoorOpen, ShieldAlert, Volume2, Globe, Wifi } from "lucide-react";

export default function InfoTab({
  info, setI, nvrInfo, setNV, panelInfo, setPan, accessInfo, setAcc,
  cameraGroups, switchGroups, serverGroups,
  doorGroups, zoneGroups, speakerGroups,
  camCount, swCount, srvCount, doorCount, zoneCount, spkCount,
  totalDevices, networkConfig,
}) {
  // Gather platforms in use across all groups
  const getPlatforms = (groups) => [...new Set(groups.map(g => g.platform).filter(Boolean))];
  const cctvPlatforms = getPlatforms(cameraGroups || []);
  const accessPlatforms = getPlatforms(doorGroups || []);
  const intrusionPlatforms = getPlatforms(zoneGroups || []);
  const audioPlatforms = getPlatforms(speakerGroups || []);
  const serverPlatforms = getPlatforms(serverGroups || []);

  const systems = [
    { icon: <Camera size={18} />,      label: "CCTV / Surveillance",  count: camCount || 0,  groups: (cameraGroups || []).length, platforms: cctvPlatforms, globalPlatform: nvrInfo?.vmsPlatform, color: "bg-blue-500/10 text-blue-500" },
    { icon: <DoorOpen size={18} />,    label: "Access Control",       count: doorCount || 0, groups: (doorGroups || []).length,   platforms: accessPlatforms, color: "bg-purple-500/10 text-purple-500" },
    { icon: <ShieldAlert size={18} />, label: "Intrusion / Alarm",    count: zoneCount || 0, groups: (zoneGroups || []).length,   platforms: intrusionPlatforms, globalPlatform: panelInfo?.panelPlatform, color: "bg-red-500/10 text-red-500" },
    { icon: <Volume2 size={18} />,     label: "Audio / AV",           count: spkCount || 0,  groups: (speakerGroups || []).length, platforms: audioPlatforms, color: "bg-amber-500/10 text-amber-500" },
    { icon: <MonitorCog size={18} />,  label: "Servers / NVR",        count: srvCount || 0,  groups: (serverGroups || []).length, platforms: serverPlatforms, color: "bg-emerald-500/10 text-emerald-500" },
    { icon: <Network size={18} />,     label: "Network / Switching",  count: swCount || 0,   groups: (switchGroups || []).length, platforms: [], color: "bg-cyan-500/10 text-cyan-500" },
  ];

  return (
    <div>
      {/* Systems Overview */}
      <div className="bg-white rounded-xl border border-border overflow-hidden mb-5">
        <CardHead icon="⚡" title="Systems Overview" color="#0F172A" />
        <div className="p-5">
          {/* Total count */}
          <div className="flex items-center gap-4 mb-5 pb-4 border-b border-border/50">
            <div>
              <div className="text-3xl font-extrabold text-navy">{totalDevices || 0}</div>
              <div className="text-[11px] text-muted font-medium">Total Devices</div>
            </div>
            <div className="w-px h-10 bg-border/50" />
            <div>
              <div className="text-3xl font-extrabold text-navy">{systems.filter(s => s.groups > 0).length}</div>
              <div className="text-[11px] text-muted font-medium">Active Systems</div>
            </div>
            <div className="w-px h-10 bg-border/50" />
            <div>
              <div className="text-3xl font-extrabold text-navy">{systems.reduce((a, s) => a + s.groups, 0)}</div>
              <div className="text-[11px] text-muted font-medium">Device Groups</div>
            </div>
            {networkConfig?.sitePrefix && (
              <>
                <div className="w-px h-10 bg-border/50" />
                <div>
                  <div className="text-lg font-bold text-accent">{networkConfig.sitePrefix}</div>
                  <div className="text-[11px] text-muted font-medium">Site Prefix</div>
                </div>
              </>
            )}
          </div>

          {/* System cards */}
          <div className="grid grid-cols-2 gap-3">
            {systems.map(sys => (
              <div key={sys.label} className={`rounded-xl border border-border/50 p-4 ${sys.groups > 0 ? '' : 'opacity-40'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${sys.color}`}>
                    {sys.icon}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-navy">{sys.label}</div>
                    <div className="text-[11px] text-muted">{sys.count} devices · {sys.groups} group{sys.groups !== 1 ? "s" : ""}</div>
                  </div>
                </div>
                {(sys.platforms.length > 0 || sys.globalPlatform) && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {sys.globalPlatform && !sys.platforms.includes(sys.globalPlatform) && (
                      <span className="bg-accent/10 text-accent rounded-md px-2 py-0.5 text-[10px] font-semibold">{sys.globalPlatform}</span>
                    )}
                    {sys.platforms.map(p => (
                      <span key={p} className="bg-navy/[0.06] text-navy rounded-md px-2 py-0.5 text-[10px] font-semibold">{p}</span>
                    ))}
                  </div>
                )}
                {sys.groups === 0 && (
                  <div className="text-[10px] text-muted/50 mt-1 italic">No groups configured</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Job Details */}
      <div className="bg-white rounded-xl border border-border overflow-hidden mb-5">
        <CardHead icon="📋" title="Job & Project Details" color="#0F172A" />
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

      {/* VMS / Recorder Details */}
      <div className="bg-white rounded-xl border border-border overflow-hidden mb-5">
        <CardHead icon="🖥" title="VMS / Recorder Details" color="#1E293B" />
        <div className="p-4">
          <G cols={4}>
            <F label="VMS Platform"><Sel value={nvrInfo.vmsPlatform || ""} onChange={e => setNV("vmsPlatform", e.target.value)}><option value="">Select...</option>{CCTV_PLATFORMS.map(o => <option key={o}>{o}</option>)}</Sel></F>
            {[["NVR/DVR Brand","nvrBrand","e.g. Hikvision"],["Model","nvrModel","DS-9632NI"],["IP Address","nvrIp","192.168.x.x"],["Serial Number","nvrSerial",""],["Firmware","nvrFirmware",""],["Storage","nvrStorage","e.g. 4x4TB"],["Retention","nvrRetention","e.g. 30 days"],["VMS Software","vmsSoftware","e.g. iVMS-4200"]].map(([lbl, k, ph]) => (
              <F key={k} label={lbl}><Inp value={nvrInfo[k]} onChange={e => setNV(k, e.target.value)} placeholder={ph} /></F>
            ))}
          </G>
        </div>
      </div>

      {/* Access Control Details */}
      <div className="bg-white rounded-xl border border-border overflow-hidden mb-5">
        <CardHead icon="🚪" title="Access Control Details" color="#1E293B" />
        <div className="p-4">
          <G cols={4}>
            <F label="Access Platform"><Sel value={(accessInfo || {}).accessPlatform || ""} onChange={e => setAcc("accessPlatform", e.target.value)}><option value="">Select...</option>{ACCESS_PLATFORMS.map(o => <option key={o}>{o}</option>)}</Sel></F>
            <F label="Controller Brand"><Inp value={(accessInfo || {}).controllerBrand || ""} onChange={e => setAcc("controllerBrand", e.target.value)} placeholder="e.g. Brivo, PDK" /></F>
            <F label="Controller Model"><Inp value={(accessInfo || {}).controllerModel || ""} onChange={e => setAcc("controllerModel", e.target.value)} placeholder="e.g. ACS6100" /></F>
            <F label="Controller IP"><Inp value={(accessInfo || {}).controllerIp || ""} onChange={e => setAcc("controllerIp", e.target.value)} placeholder="192.168.x.x" /></F>
            <F label="Controller S/N"><Inp value={(accessInfo || {}).controllerSerial || ""} onChange={e => setAcc("controllerSerial", e.target.value)} /></F>
            <F label="Firmware"><Inp value={(accessInfo || {}).firmware || ""} onChange={e => setAcc("firmware", e.target.value)} /></F>
            <F label="Total Doors"><Inp type="number" value={(accessInfo || {}).totalDoors || ""} onChange={e => setAcc("totalDoors", e.target.value)} placeholder="e.g. 12" /></F>
            <F label="Credential Format"><Inp value={(accessInfo || {}).credentialFormat || ""} onChange={e => setAcc("credentialFormat", e.target.value)} placeholder="e.g. 26-bit Wiegand" /></F>
          </G>
        </div>
      </div>

      {/* Intrusion Panel Details */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <CardHead icon="🔔" title="Intrusion Panel Details" color="#1E293B" />
        <div className="p-4">
          <G cols={4}>
            <F label="Alarm Platform"><Sel value={panelInfo.panelPlatform || ""} onChange={e => setPan("panelPlatform", e.target.value)}><option value="">Select...</option>{INTRUSION_PLATFORMS.map(o => <option key={o}>{o}</option>)}</Sel></F>
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
