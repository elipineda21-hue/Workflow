import { mkZoneGrp, mkZoneDev, genZone, updGrp, remGrp } from "../models";
import { CardHead, Empty, G, F, Inp, Sel, Tog, SectionLabel } from "../components/ui";
import GroupCard from "../components/GroupCard";
import DevTable from "../components/DevTable";
import GenerateBar from "../components/GenerateBar";

export default function IntrusionTab({ zoneGroups, setZoneGroups, zoneCount, collapsed, toggleCollapse, addLog, moveGroup, networkConfig, allGroupsTagged }) {
  return (
    <div>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <CardHead icon="🔔" title="Intrusion Zone Programming" count={zoneCount} onAdd={() => { setZoneGroups(g => [...g, mkZoneGrp()]); addLog("group_added", "Intrusion zone group added"); }} addLabel="Add Zone Group" color="#0B1F3A" />
        <div className="p-4">
          {zoneGroups.length === 0 && <Empty icon="🔔" msg="No zone groups yet. Click + Add Zone Group." />}
          {zoneGroups.map((grp, gi) => {
            const hw = grp.noProgramming;
            return (
            <GroupCard key={grp.id} icon="🔔"
              title={grp.groupLabel || `${grp.zoneType} Zones`}
              idx={gi} devCount={grp.devices.length}
              collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
              onRemove={() => remGrp(setZoneGroups, grp.id)}
              onMove={cat => moveGroup(grp, "zone", cat)}
              currentCategory="zone">
              {/* Hardware-only toggle — right after group card header */}
              <div className={`flex items-center gap-2.5 mt-2.5 p-2 px-3 rounded-[7px] border ${hw ? "bg-[#FEF3C7] border-[#FDE68A]" : "bg-[#F0FDF4] border-[#BBF7D0]"}`}>
                <Tog label={<span className={`text-xs font-semibold ${hw ? "text-[#92400E]" : "text-[#065F46]"}`}>{hw ? "Hardware only — no programming required" : "Programming required — devices need configuration"}</span>} val={hw} set={v => updGrp(setZoneGroups, grp.id, "noProgramming", v)} />
              </div>
              {/* Only show config fields when programming is required */}
              {!hw && (
                <>
                  <SectionLabel text="Group Settings" />
                  <G cols={4}>
                    <F label="Zone Type"><Sel value={grp.zoneType} onChange={e => updGrp(setZoneGroups, grp.id, "zoneType", e.target.value)}>{["Motion","Door Contact","Glass Break","Smoke","CO","Heat","Panic","Tamper"].map(o => <option key={o}>{o}</option>)}</Sel></F>
                    <F label="Partitions"><Inp value={grp.partitions} onChange={e => updGrp(setZoneGroups, grp.id, "partitions", e.target.value)} placeholder="e.g. 1, 2" /></F>
                    <F label="Start Zone #"><Inp type="number" value={grp.startNumber} onChange={e => updGrp(setZoneGroups, grp.id, "startNumber", e.target.value)} placeholder="1" /></F>
                    <F label="Bypassable"><div className="pt-1.5"><Tog label="Bypassable" val={grp.bypassable} set={v => updGrp(setZoneGroups, grp.id, "bypassable", v)} /></div></F>
                  </G>
                </>
              )}
              {/* Group label always visible */}
              <G cols={4}>
                <F label="Group Label"><Inp value={grp.groupLabel} onChange={e => updGrp(setZoneGroups, grp.id, "groupLabel", e.target.value)} placeholder="e.g. Perimeter PIRs" /></F>
              </G>
              <GenerateBar group={grp} setter={setZoneGroups} genFn={genZone} showIP={false} />
              <DevTable gid={grp.id} setter={setZoneGroups} noProgramming={hw} devices={grp.devices} newDevFn={(i) => mkZoneDev(i || grp.devices.length, grp)}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
