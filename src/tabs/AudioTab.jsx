import { mkSpkGrp, mkSpkDev, genSpk, updGrp, remGrp } from "../models";
import { CardHead, Empty, G, F, Inp, SectionLabel } from "../components/ui";
import GroupCard from "../components/GroupCard";
import DevTable from "../components/DevTable";
import GenerateBar from "../components/GenerateBar";

export default function AudioTab({ speakerGroups, setSpeakerGroups, spkCount, collapsed, toggleCollapse, addLog }) {
  return (
    <div>
      <div style={{ background: "#FFFFFF", borderRadius: 10, border: `1px solid #CBD5E1`, overflow: "hidden" }}>
        <CardHead icon="🔊" title="Audio Zone Programming" count={spkCount} onAdd={() => { setSpeakerGroups(g => [...g, mkSpkGrp()]); addLog("group_added", "Audio group added"); }} addLabel="Add Audio Group" color="#0B1F3A" />
        <div style={{ padding: 18 }}>
          {speakerGroups.length === 0 && <Empty icon="🔊" msg="No audio groups yet. Click + Add Audio Group." />}
          {speakerGroups.map((grp, gi) => (
            <GroupCard key={grp.id} icon="🔊"
              title={grp.groupLabel || (grp.brand ? `${grp.brand} ${grp.model}`.trim() : null)}
              idx={gi} devCount={grp.devices.length}
              collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
              onRemove={() => remGrp(setSpeakerGroups, grp.id)}>
              <SectionLabel text="Group Settings" />
              <G cols={4}>
                <F label="Group Label"><Inp value={grp.groupLabel} onChange={e => updGrp(setSpeakerGroups, grp.id, "groupLabel", e.target.value)} placeholder="e.g. Lobby PA" /></F>
                <F label="Brand"><Inp value={grp.brand} onChange={e => updGrp(setSpeakerGroups, grp.id, "brand", e.target.value)} placeholder="e.g. Bogen" /></F>
                <F label="Model"><Inp value={grp.model} onChange={e => updGrp(setSpeakerGroups, grp.id, "model", e.target.value)} placeholder="e.g. TB8008" /></F>
                <F label="Zone Group"><Inp value={grp.zoneGroup} onChange={e => updGrp(setSpeakerGroups, grp.id, "zoneGroup", e.target.value)} /></F>
                <F label="Amp Zone / Tap"><Inp value={grp.ampZone} onChange={e => updGrp(setSpeakerGroups, grp.id, "ampZone", e.target.value)} placeholder="e.g. Amp 1 Zone A" /></F>
                <F label="Volume (%)"><Inp type="number" min="0" max="100" value={grp.volume} onChange={e => updGrp(setSpeakerGroups, grp.id, "volume", e.target.value)} /></F>
              </G>
              <GenerateBar group={grp} setter={setSpeakerGroups} genFn={genSpk} />
              <DevTable gid={grp.id} setter={setSpeakerGroups} devices={grp.devices} newDevFn={(i) => mkSpkDev("", i || grp.devices.length)}
                onLog={(name, done) => addLog(done ? "programmed" : "unprogrammed", `${done ? "✓" : "○"} ${name} (Audio)`)}
                onFieldLog={(key, oldVal, newVal) => { if (!newVal) return; if (key === "name") addLog("name_change", `"${oldVal || "—"}" → "${newVal}" (Audio)`); else if (key === "location") addLog("location_set", `Location "${newVal}" set (Audio)`); }}
                cols={[
                  { key: "name", label: "Speaker / Zone", ph: "e.g. Lobby 01" },
                  { key: "location", label: "Location", ph: "" },
                  { key: "cableId", label: "Blueprint ID", ph: "e.g. CR-601" },
                  { key: "ip", label: "IP / Address", ph: "192.168.x.x" },
                  { key: "notes", label: "Notes", ph: "" },
                ]} />
            </GroupCard>
          ))}
        </div>
      </div>
    </div>
  );
}
