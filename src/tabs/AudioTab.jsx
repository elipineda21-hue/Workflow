import { mkSpkGrp, mkSpkDev, genSpk, updGrp, remGrp, getNextIpStart } from "../models";
import { CardHead, Empty, G, F, Inp, Tog, SectionLabel } from "../components/ui";
import GroupCard from "../components/GroupCard";
import DevTable from "../components/DevTable";
import GenerateBar from "../components/GenerateBar";

export default function AudioTab({ speakerGroups, setSpeakerGroups, spkCount, collapsed, toggleCollapse, addLog, moveGroup, networkConfig, allGroupsTagged }) {
  return (
    <div>
      <div style={{ background: "#FFFFFF", borderRadius: 10, border: `1px solid #CBD5E1`, overflow: "hidden" }}>
        <CardHead icon="🔊" title="Audio Zone Programming" count={spkCount} onAdd={() => { const ip = getNextIpStart("speaker", networkConfig, allGroupsTagged); setSpeakerGroups(g => [...g, { ...mkSpkGrp(), ipStart: ip }]); addLog("group_added", "Audio group added"); }} addLabel="Add Audio Group" color="#0B1F3A" />
        <div style={{ padding: 18 }}>
          {speakerGroups.length === 0 && <Empty icon="🔊" msg="No audio groups yet. Click + Add Audio Group." />}
          {speakerGroups.map((grp, gi) => (
            <GroupCard key={grp.id} icon="🔊"
              title={grp.groupLabel || (grp.brand ? `${grp.brand} ${grp.model}`.trim() : null)}
              idx={gi} devCount={grp.devices.length}
              collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
              onRemove={() => remGrp(setSpeakerGroups, grp.id)}
              onMove={cat => moveGroup(grp, "speaker", cat)}
              currentCategory="speaker">
              <SectionLabel text="Group Settings" />
              <G cols={4}>
                <F label="Group Label"><Inp value={grp.groupLabel} onChange={e => updGrp(setSpeakerGroups, grp.id, "groupLabel", e.target.value)} placeholder="e.g. Lobby PA" /></F>
                <F label="Brand"><Inp value={grp.brand} onChange={e => updGrp(setSpeakerGroups, grp.id, "brand", e.target.value)} placeholder="e.g. Bogen" /></F>
                <F label="Model"><Inp value={grp.model} onChange={e => updGrp(setSpeakerGroups, grp.id, "model", e.target.value)} placeholder="e.g. TB8008" /></F>
                <F label="Zone Group"><Inp value={grp.zoneGroup} onChange={e => updGrp(setSpeakerGroups, grp.id, "zoneGroup", e.target.value)} /></F>
                <F label="Amp Zone / Tap"><Inp value={grp.ampZone} onChange={e => updGrp(setSpeakerGroups, grp.id, "ampZone", e.target.value)} placeholder="e.g. Amp 1 Zone A" /></F>
                <F label="Volume (%)"><Inp type="number" min="0" max="100" value={grp.volume} onChange={e => updGrp(setSpeakerGroups, grp.id, "volume", e.target.value)} /></F>
              </G>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, padding: "8px 12px", background: grp.noProgramming ? "#FEF3C7" : "#F0FDF4", borderRadius: 7, border: `1px solid ${grp.noProgramming ? "#FDE68A" : "#BBF7D0"}` }}>
                <Tog label={<span style={{ fontSize: 12, fontWeight: 600, color: grp.noProgramming ? "#92400E" : "#065F46" }}>{grp.noProgramming ? "No programming required — customer-provided or physical-only hardware" : "Programming required — devices need configuration"}</span>} val={grp.noProgramming} set={v => updGrp(setSpeakerGroups, grp.id, "noProgramming", v)} />
              </div>
              <GenerateBar group={grp} setter={setSpeakerGroups} genFn={genSpk} />
              <DevTable gid={grp.id} setter={setSpeakerGroups} noProgramming={grp.noProgramming} devices={grp.devices} newDevFn={(i) => mkSpkDev("", i || grp.devices.length)}
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
