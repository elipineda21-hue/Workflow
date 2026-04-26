import { CAM_DB } from "../deviceDB";
import { CCTV_PLATFORMS, CODECS, RESS, LENSES, CAM_TYPES, CAM_PROFILES } from "../constants";
import { mkCamGroup, mkCamDev, genCam, updGrp, remGrp, getNextIpStart } from "../models";
import { CardHead, Empty, G, F, Inp, Sel, Tog, SectionLabel } from "../components/ui";
import GroupCard from "../components/GroupCard";
import DevTable from "../components/DevTable";
import ModelSelector from "../components/ModelSelector";
import GenerateBar from "../components/GenerateBar";

export default function CamerasTab({ cameraGroups, setCameraGroups, camCount, collapsed, toggleCollapse, addLog, moveGroup, networkConfig, allGroupsTagged, deviceCatalog, nvrInfo }) {
  const applyProfile = (grpId, profileKey) => {
    const profile = CAM_PROFILES[profileKey];
    if (!profile || profileKey === "custom") {
      setCameraGroups(gs => gs.map(g => g.id === grpId ? { ...g, profile: profileKey } : g));
      return;
    }
    setCameraGroups(gs => gs.map(g => {
      if (g.id !== grpId) return g;
      const stream = (g.streamView || "main") === "sub" ? profile.sub : profile.main;
      return { ...g, profile: profileKey, ...(stream || {}) };
    }));
  };

  const switchStream = (grpId, view) => {
    setCameraGroups(gs => gs.map(g => {
      if (g.id !== grpId) return g;
      const profileKey = g.profile || "custom";
      const profile = CAM_PROFILES[profileKey];
      const stream = profile && profileKey !== "custom" ? (view === "sub" ? profile.sub : profile.main) : null;
      return { ...g, streamView: view, ...(stream || {}) };
    }));
  };

  return (
    <div>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <CardHead icon="📷" title="CCTV Camera Programming" count={camCount} onAdd={() => { const ip = getNextIpStart("camera", networkConfig, allGroupsTagged); setCameraGroups(g => [...g, { ...mkCamGroup(), ipStart: ip }]); addLog("group_added", "Camera group added"); }} addLabel="Add Camera Group" color="#0B1F3A" />
        <div className="p-4">
          {cameraGroups.length === 0 && <Empty icon="📷" msg="No camera groups yet. Click + Add Camera Group to get started." />}
          {cameraGroups.map((grp, gi) => {
            const grpTitle = grp.groupLabel || (grp.brand ? `${grp.brand}${grp.model ? " — " + grp.model : ""}` : null);
            const hw = grp.noProgramming;
            const currentProfile = grp.profile || "custom";
            const currentStream = grp.streamView || "main";
            return (
              <GroupCard key={grp.id} icon="📷"
                title={grpTitle} idx={gi} devCount={grp.devices.length}
                collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
                onRemove={() => remGrp(setCameraGroups, grp.id)}
                onMove={cat => moveGroup(grp, "camera", cat)}
                currentCategory="camera">
                <SectionLabel text="Model" />
                <ModelSelector db={CAM_DB} catalog={(deviceCatalog || []).filter(c => c.category === "camera")} brand={grp.brand} model={grp.model}
                  onBrand={v => updGrp(setCameraGroups, grp.id, "brand", v)}
                  onModel={v => updGrp(setCameraGroups, grp.id, "model", v)}
                  onApply={obj => setCameraGroups(gs => gs.map(g => g.id === grp.id ? {
                    ...g,
                    codec: obj.codec || g.codec,
                    resolution: obj.resolution || g.resolution,
                    lens: obj.lens || g.lens,
                    type: obj.type || g.type,
                    fps: obj.fps || g.fps,
                    bitrate: obj.bitrate || g.bitrate,
                    port: obj.port || g.port,
                    rtspPort: obj.rtspPort || g.rtspPort,
                    ptz: obj.ptz !== undefined ? obj.ptz : g.ptz,
                  } : g))}
                />
                {/* Hardware-only toggle */}
                <div className={`flex items-center gap-2.5 mt-2.5 p-2 px-3 rounded-[7px] border ${hw ? "bg-[#FEF3C7] border-[#FDE68A]" : "bg-[#F0FDF4] border-[#BBF7D0]"}`}>
                  <Tog label={<span className={`text-xs font-semibold ${hw ? "text-[#92400E]" : "text-[#065F46]"}`}>{hw ? "Hardware only — no programming required" : "Programming required — devices need configuration"}</span>} val={hw} set={v => updGrp(setCameraGroups, grp.id, "noProgramming", v)} />
                </div>
                {/* Programming settings */}
                {!hw && (
                  <>
                    {/* Profile selector + Stream toggle */}
                    <div className="flex items-center gap-3 mt-3 mb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-muted uppercase">Profile:</span>
                        <div className="flex rounded-lg border border-border overflow-hidden">
                          {Object.entries(CAM_PROFILES).map(([key, prof]) => (
                            <button key={key} onClick={() => applyProfile(grp.id, key)}
                              className={`py-1 px-3 text-[11px] font-semibold cursor-pointer border-none ${currentProfile === key ? "bg-accent text-white" : "bg-white text-muted hover:bg-surface"}`}>
                              {prof.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-muted uppercase">Stream:</span>
                        <div className="flex rounded-lg border border-border overflow-hidden">
                          <button onClick={() => switchStream(grp.id, "main")}
                            className={`py-1 px-3 text-[11px] font-semibold cursor-pointer border-none ${currentStream === "main" ? "bg-navy text-white" : "bg-white text-muted hover:bg-surface"}`}>
                            Main
                          </button>
                          <button onClick={() => switchStream(grp.id, "sub")}
                            className={`py-1 px-3 text-[11px] font-semibold cursor-pointer border-none ${currentStream === "sub" ? "bg-navy text-white" : "bg-white text-muted hover:bg-surface"}`}>
                            Sub
                          </button>
                        </div>
                      </div>
                    </div>

                    <SectionLabel text={`${currentStream === "sub" ? "Sub" : "Main"} Stream Settings`} />
                    <G cols={4}>
                      <F label="Codec"><Sel value={grp.codec} onChange={e => updGrp(setCameraGroups, grp.id, "codec", e.target.value)}>{CODECS.map(o => <option key={o}>{o}</option>)}</Sel></F>
                      <F label="Resolution"><Sel value={grp.resolution} onChange={e => updGrp(setCameraGroups, grp.id, "resolution", e.target.value)}>{RESS.map(o => <option key={o}>{o}</option>)}</Sel></F>
                      <F label="Lens"><Sel value={grp.lens} onChange={e => updGrp(setCameraGroups, grp.id, "lens", e.target.value)}>{LENSES.map(o => <option key={o}>{o}</option>)}</Sel></F>
                      <F label="Camera Type"><Sel value={grp.type} onChange={e => updGrp(setCameraGroups, grp.id, "type", e.target.value)}>{CAM_TYPES.map(o => <option key={o}>{o}</option>)}</Sel></F>
                      <F label="HTTP Port"><Inp value={grp.port} onChange={e => updGrp(setCameraGroups, grp.id, "port", e.target.value)} placeholder="80" /></F>
                      <F label="RTSP Port"><Inp value={grp.rtspPort} onChange={e => updGrp(setCameraGroups, grp.id, "rtspPort", e.target.value)} placeholder="554" /></F>
                      <F label="FPS"><Inp value={grp.fps} onChange={e => updGrp(setCameraGroups, grp.id, "fps", e.target.value)} placeholder="15" /></F>
                      <F label="Bitrate (kbps)"><Inp value={grp.bitrate} onChange={e => updGrp(setCameraGroups, grp.id, "bitrate", e.target.value)} placeholder="e.g. 4096" /></F>
                      <F label="Username"><Inp value={grp.username} onChange={e => updGrp(setCameraGroups, grp.id, "username", e.target.value)} /></F>
                      <F label="Password"><Inp value={grp.password} onChange={e => updGrp(setCameraGroups, grp.id, "password", e.target.value)} /></F>
                      <F label="VMS Platform"><Sel value={grp.platform || nvrInfo?.vmsSoftware || ""} onChange={e => updGrp(setCameraGroups, grp.id, "platform", e.target.value)}><option value="">Select...</option>{CCTV_PLATFORMS.map(o => <option key={o}>{o}</option>)}</Sel></F>
                      <F label="PTZ"><div className="pt-1.5"><Tog label="PTZ Enabled" val={grp.ptz} set={v => updGrp(setCameraGroups, grp.id, "ptz", v)} /></div></F>
                    </G>
                  </>
                )}
                <GenerateBar group={grp} setter={setCameraGroups} genFn={genCam} showIP={!hw} />
                <DevTable gid={grp.id} setter={setCameraGroups} noProgramming={hw} devices={grp.devices} newDevFn={(i) => mkCamDev("", i || grp.devices.length)}
                  onLog={(name, done) => addLog(done ? "programmed" : "unprogrammed", `${done ? "✓" : "○"} ${name} (Camera)`)}
                  onFieldLog={(key, oldVal, newVal) => { if (!newVal) return; if (key === "name") addLog("name_change", `"${oldVal || "—"}" → "${newVal}" (Camera)`); }}
                  cols={[
                    { key: "name", label: "Camera Name", ph: "e.g. NE Entry" },
                    { key: "cableId", label: "Device ID", ph: "e.g. FCAM-001" },
                    ...(!hw ? [
                      { key: "ip", label: "IP Address", ph: "192.168.x.x" },
                      { key: "mac", label: "MAC Address", ph: "AA:BB:CC..." },
                    ] : []),
                    { key: "serial", label: "Serial #", ph: "" },
                    { key: "notes", label: "Notes", ph: "" },
                  ]} />
              </GroupCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
