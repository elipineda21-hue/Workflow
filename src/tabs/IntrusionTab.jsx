import { mkZoneGrp, mkZoneDev, genZone, updGrp, remGrp } from "../models";
import { CardHead, Empty, G, F, Inp, Sel, Tog, SectionLabel } from "../components/ui";
import GroupCard from "../components/GroupCard";
import DevTable from "../components/DevTable";
import GenerateBar from "../components/GenerateBar";

export default function IntrusionTab({ zoneGroups, setZoneGroups, zoneCount, collapsed, toggleCollapse, addLog, moveGroup, networkConfig, allGroupsTagged }) {
  return (
    <div>
      <div style={{ background: "#FFFFFF", borderRadius: 10, border: `1px solid #CBD5E1`, overflow: "hidden" }}>
        <CardHead icon="🔔" title="Intrusion Zone Programming" count={zoneCount} onAdd={() => { setZoneGroups(g => [...g, mkZoneGrp()]); addLog("group_added", "Intrusion zone group added"); }} addLabel="Add Zone Group" color="#0B1F3A" />
        <div style={{ padding: 18 }}>
          {zoneGroups.length === 0 && <Empty icon="🔔" msg="No zone groups yet. Click + Add Zone Group." />}
          {zoneGroups.map((grp, gi) => (
            <GroupCard key={grp.id} icon="🔔"
              title={grp.groupLabel || `${grp.zoneType} Zones`}
              idx={gi} devCount={grp.devices.length}
              collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
              onRemove={() => remGrp(setZoneGroups, grp.id)}
              onMove={cat => moveGroup(grp, "zone", cat)}
              currentCategory="zone">
              <SectionLabel text="Group Settings" />
              <G cols={4}>
                <F label="Group Label"><Inp value={grp.groupLabel} onChange={e => updGrp(setZoneGroups, grp.id, "groupLabel", e.target.value)} placeholder="e.g. Perimeter PIRs" /></F>
                <F label="Zone Type"><Sel value={grp.zoneType} onChange={e => updGrp(setZoneGroups, grp.id, "zoneType", e.target.value)}>{["Motion","Door Contact","Glass Break","Smoke","CO","Heat","Panic","Tamper"].map(o => <option key={o}>{o}</option>)}</Sel></F>
                <F label="Partitions"><Inp value={grp.partitions} onChange={e => updGrp(setZoneGroups, grp.id, "partitions", e.target.value)} placeholder="e.g. 1, 2" /></F>
                <F label="Start Zone #"><Inp type="number" value={grp.startNumber} onChange={e => updGrp(setZoneGroups, grp.id, "startNumber", e.target.value)} placeholder="1" /></F>
                <F label="Bypassable"><div style={{ paddingTop: 6 }}><Tog label="Bypassable" val={grp.bypassable} set={v => updGrp(setZoneGroups, grp.id, "bypassable", v)} /></div></F>
              </G>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, padding: "8px 12px", background: grp.noProgramming ? "#FEF3C7" : "#F0FDF4", borderRadius: 7, border: `1px solid ${grp.noProgramming ? "#FDE68A" : "#BBF7D0"}` }}>
                <Tog label={<span style={{ fontSize: 12, fontWeight: 600, color: grp.noProgramming ? "#92400E" : "#065F46" }}>{grp.noProgramming ? "No programming required — customer-provided or physical-only hardware" : "Programming required — devices need configuration"}</span>} val={grp.noProgramming} set={v => updGrp(setZoneGroups, grp.id, "noProgramming", v)} />
              </div>
              <GenerateBar group={grp} setter={setZoneGroups} genFn={genZone} showIP={false} />
              <DevTable gid={grp.id} setter={setZoneGroups} noProgramming={grp.noProgramming} devices={grp.devices} newDevFn={(i) => mkZoneDev(i || grp.devices.length, grp)}
                onLog={(name, done) => addLog(done ? "programmed" : "unprogrammed", `${done ? "✓" : "○"} ${name} (Intrusion)`)}
                onFieldLog={(key, oldVal, newVal) => { if (!newVal) return; if (key === "name") addLog("name_change", `"${oldVal || "—"}" → "${newVal}" (Intrusion)`); else if (key === "location") addLog("location_set", `Location "${newVal}" set (Intrusion)`); }}
                cols={[
                  { key: "zoneNumber", label: "Zone #", ph: "01" },
                  { key: "name", label: "Zone Name", ph: "e.g. Back Door PIR" },
                  { key: "location", label: "Location", ph: "" },
                  { key: "cableId", label: "Blueprint ID", ph: "e.g. CR-501" },
                  { key: "zoneType", label: "Type", ph: "" },
                  { key: "partitions", label: "Partitions", ph: "" },
                  { key: "notes", label: "Notes", ph: "EOL, wiring..." },
                ]} />
            </GroupCard>
          ))}
        </div>
      </div>
    </div>
  );
}
