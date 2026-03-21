import { CAM_DB } from "../deviceDB";
import { mkCamGroup, mkCamDev, genCam, updGrp, remGrp } from "../models";
import { CardHead, Empty, G, F, Inp, Sel, Tog, SectionLabel } from "../components/ui";
import GroupCard from "../components/GroupCard";
import DevTable from "../components/DevTable";
import ModelSelector from "../components/ModelSelector";
import GenerateBar from "../components/GenerateBar";

export default function CamerasTab({ cameraGroups, setCameraGroups, camCount, collapsed, toggleCollapse, addLog }) {
  return (
    <div>
      <div style={{ background: "#FFFFFF", borderRadius: 10, border: `1px solid #CBD5E1`, overflow: "hidden" }}>
        <CardHead icon="📷" title="CCTV Camera Programming" count={camCount} onAdd={() => { setCameraGroups(g => [...g, mkCamGroup()]); addLog("group_added", "Camera group added"); }} addLabel="Add Camera Group" color="#0B1F3A" />
        <div style={{ padding: 18 }}>
          {cameraGroups.length === 0 && <Empty icon="📷" msg="No camera groups yet. Click + Add Camera Group to get started." />}
          {cameraGroups.map((grp, gi) => {
            const grpTitle = grp.groupLabel || (grp.brand ? `${grp.brand}${grp.model ? " — " + grp.model : ""}` : null);
            return (
              <GroupCard key={grp.id} icon="📷"
                title={grpTitle} idx={gi} devCount={grp.devices.length}
                collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
                onRemove={() => remGrp(setCameraGroups, grp.id)}>
                <SectionLabel text="Model" />
                <ModelSelector db={CAM_DB} brand={grp.brand} model={grp.model}
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
                <SectionLabel text="Shared Settings (applied to all cameras in this group)" />
                <G cols={4}>
                  <F label="Codec"><Sel value={grp.codec} onChange={e => updGrp(setCameraGroups, grp.id, "codec", e.target.value)}>{["H.264","H.265","H.265+","MJPEG"].map(o => <option key={o}>{o}</option>)}</Sel></F>
                  <F label="Resolution"><Sel value={grp.resolution} onChange={e => updGrp(setCameraGroups, grp.id, "resolution", e.target.value)}>{["1MP (720p)","2MP (1080p)","4MP","5MP","6MP","8MP (4K)","12MP"].map(o => <option key={o}>{o}</option>)}</Sel></F>
                  <F label="Lens"><Sel value={grp.lens} onChange={e => updGrp(setCameraGroups, grp.id, "lens", e.target.value)}>{["2.8mm","4mm","6mm","8mm","2.8–12mm VF","Motorized VF","Other"].map(o => <option key={o}>{o}</option>)}</Sel></F>
                  <F label="Camera Type"><Sel value={grp.type} onChange={e => updGrp(setCameraGroups, grp.id, "type", e.target.value)}>{["Indoor Dome","Outdoor Dome","Bullet","PTZ","Fisheye","Multi-Sensor","Box"].map(o => <option key={o}>{o}</option>)}</Sel></F>
                  <F label="HTTP Port"><Inp value={grp.port} onChange={e => updGrp(setCameraGroups, grp.id, "port", e.target.value)} placeholder="80" /></F>
                  <F label="RTSP Port"><Inp value={grp.rtspPort} onChange={e => updGrp(setCameraGroups, grp.id, "rtspPort", e.target.value)} placeholder="554" /></F>
                  <F label="FPS"><Inp value={grp.fps} onChange={e => updGrp(setCameraGroups, grp.id, "fps", e.target.value)} placeholder="15" /></F>
                  <F label="Bitrate (kbps)"><Inp value={grp.bitrate} onChange={e => updGrp(setCameraGroups, grp.id, "bitrate", e.target.value)} placeholder="e.g. 4096" /></F>
                  <F label="Username"><Inp value={grp.username} onChange={e => updGrp(setCameraGroups, grp.id, "username", e.target.value)} /></F>
                  <F label="Password"><Inp value={grp.password} onChange={e => updGrp(setCameraGroups, grp.id, "password", e.target.value)} /></F>
                  <F label="Storage Group"><Inp value={grp.storageGroup} onChange={e => updGrp(setCameraGroups, grp.id, "storageGroup", e.target.value)} /></F>
                  <F label="Group Label"><Inp value={grp.groupLabel} onChange={e => updGrp(setCameraGroups, grp.id, "groupLabel", e.target.value)} placeholder="e.g. Perimeter Cameras" /></F>
                  <F label="PTZ"><div style={{ paddingTop: 6 }}><Tog label="PTZ Enabled" val={grp.ptz} set={v => updGrp(setCameraGroups, grp.id, "ptz", v)} /></div></F>
                </G>
                <GenerateBar group={grp} setter={setCameraGroups} genFn={genCam} />
                <DevTable gid={grp.id} setter={setCameraGroups} devices={grp.devices} newDevFn={(i) => mkCamDev("", i || grp.devices.length)}
                  onLog={(name, done) => addLog(done ? "programmed" : "unprogrammed", `${done ? "✓" : "○"} ${name} (Camera)`)}
                  onFieldLog={(key, oldVal, newVal) => { if (!newVal) return; if (key === "name") addLog("name_change", `"${oldVal || "—"}" → "${newVal}" (Camera)`); else if (key === "location") addLog("location_set", `Location "${newVal}" set (Camera)`); }}
                  cols={[
                    { key: "name", label: "Camera Name", ph: "e.g. NE Entry" },
                    { key: "location", label: "Location", ph: "e.g. NE Corner Lobby" },
                    { key: "cableId", label: "Blueprint ID", ph: "e.g. CR-101" },
                    { key: "ip", label: "IP Address", ph: "192.168.x.x" },
                    { key: "mac", label: "MAC Address", ph: "AA:BB:CC..." },
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
