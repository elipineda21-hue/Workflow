import { ACCESS_DB } from "../deviceDB";
import { mkDoorGrp, mkDoorDev, genDoor, updGrp, remGrp } from "../models";
import { CardHead, Empty, G, F, Inp, Sel, SectionLabel } from "../components/ui";
import GroupCard from "../components/GroupCard";
import DevTable from "../components/DevTable";
import ModelSelector from "../components/ModelSelector";
import GenerateBar from "../components/GenerateBar";

export default function AccessTab({ doorGroups, setDoorGroups, doorCount, collapsed, toggleCollapse, addLog }) {
  return (
    <div>
      <div style={{ background: "#FFFFFF", borderRadius: 10, border: `1px solid #CBD5E1`, overflow: "hidden" }}>
        <CardHead icon="🚪" title="Access Control Door Programming" count={doorCount} onAdd={() => { setDoorGroups(g => [...g, mkDoorGrp()]); addLog("group_added", "Access door group added"); }} addLabel="Add Door Group" color="#0B1F3A" />
        <div style={{ padding: 18 }}>
          {doorGroups.length === 0 && <Empty icon="🚪" msg="No door groups yet. Click + Add Door Group." />}
          {doorGroups.map((grp, gi) => (
            <GroupCard key={grp.id} icon="🚪"
              title={grp.groupLabel || (grp.brand ? `${grp.brand} ${grp.model}`.trim() : null)}
              idx={gi} devCount={grp.devices.length}
              collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
              onRemove={() => remGrp(setDoorGroups, grp.id)}>
              <ModelSelector db={ACCESS_DB} brand={grp.brand} model={grp.model}
                onBrand={v => updGrp(setDoorGroups, grp.id, "brand", v)}
                onModel={v => updGrp(setDoorGroups, grp.id, "model", v)}
                onApply={obj => setDoorGroups(gs => gs.map(g => g.id === grp.id ? {
                  ...g,
                  readerType: obj.readerType || g.readerType,
                  credentialType: obj.credentialType || g.credentialType,
                } : g))} />
              <SectionLabel text="Shared Settings" />
              <G cols={3}>
                <F label="Group Label"><Inp value={grp.groupLabel} onChange={e => updGrp(setDoorGroups, grp.id, "groupLabel", e.target.value)} placeholder="e.g. Interior Doors" /></F>
                <F label="Reader Type"><Sel value={grp.readerType} onChange={e => updGrp(setDoorGroups, grp.id, "readerType", e.target.value)}>{["Wiegand","OSDP","RS-485","Bluetooth","Biometric","Keypad","Multi-Tech"].map(o => <option key={o}>{o}</option>)}</Sel></F>
                <F label="Credential Type"><Sel value={grp.credentialType} onChange={e => updGrp(setDoorGroups, grp.id, "credentialType", e.target.value)}>{["Prox Card","Smart Card","Mobile","PIN","Biometric","Dual Auth"].map(o => <option key={o}>{o}</option>)}</Sel></F>
                <F label="Lock Type"><Sel value={grp.lockType} onChange={e => updGrp(setDoorGroups, grp.id, "lockType", e.target.value)}>{["Mag Lock","Electric Strike","Electronic Deadbolt","Other"].map(o => <option key={o}>{o}</option>)}</Sel></F>
                <F label="Card Format"><Inp value={grp.cardFormat} onChange={e => updGrp(setDoorGroups, grp.id, "cardFormat", e.target.value)} placeholder="e.g. 26-bit Wiegand" /></F>
                <F label="Facility Code"><Inp value={grp.facilityCode} onChange={e => updGrp(setDoorGroups, grp.id, "facilityCode", e.target.value)} /></F>
                <F label="Access Group"><Inp value={grp.accessGroup} onChange={e => updGrp(setDoorGroups, grp.id, "accessGroup", e.target.value)} /></F>
                <F label="Schedule"><Inp value={grp.schedule} onChange={e => updGrp(setDoorGroups, grp.id, "schedule", e.target.value)} placeholder="e.g. 24/7 or M-F 7a-6p" /></F>
              </G>
              <GenerateBar group={grp} setter={setDoorGroups} genFn={genDoor} showIP={false} />
              <DevTable gid={grp.id} setter={setDoorGroups} devices={grp.devices} newDevFn={(i) => mkDoorDev(i || grp.devices.length)}
                onLog={(name, done) => addLog(done ? "programmed" : "unprogrammed", `${done ? "✓" : "○"} ${name} (Access)`)}
                onFieldLog={(key, oldVal, newVal) => { if (!newVal) return; if (key === "name") addLog("name_change", `"${oldVal || "—"}" → "${newVal}" (Access)`); else if (key === "location") addLog("location_set", `Location "${newVal}" set (Access)`); }}
                cols={[
                  { key: "name", label: "Door Name", ph: "e.g. Main Entry" },
                  { key: "location", label: "Location", ph: "e.g. Lobby" },
                  { key: "cableId", label: "Blueprint ID", ph: "e.g. CR-401" },
                  { key: "controllerName", label: "Controller", ph: "" },
                  { key: "controllerIP", label: "Controller IP", ph: "192.168.x.x" },
                  { key: "controllerSerial", label: "Ctrl S/N", ph: "" },
                  { key: "readerSerial", label: "Reader S/N", ph: "" },
                  { key: "notes", label: "Notes", ph: "" },
                ]} />
            </GroupCard>
          ))}
        </div>
      </div>
    </div>
  );
}
