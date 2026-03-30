import { SWITCH_DB } from "../deviceDB";
import { mkSwGrp, mkSwDev, genSw, updGrp, remGrp, getNextIpStart } from "../models";
import { CardHead, Empty, G, F, Inp, Tog, SectionLabel } from "../components/ui";
import GroupCard from "../components/GroupCard";
import DevTable from "../components/DevTable";
import ModelSelector from "../components/ModelSelector";
import GenerateBar from "../components/GenerateBar";

export default function SwitchesTab({ switchGroups, setSwitchGroups, swCount, collapsed, toggleCollapse, addLog, moveGroup, networkConfig, allGroupsTagged }) {
  return (
    <div>
      <div style={{ background: "#FFFFFF", borderRadius: 10, border: `1px solid #CBD5E1`, overflow: "hidden" }}>
        <CardHead icon="🔀" title="Network Switching" count={swCount} onAdd={() => { const ip = getNextIpStart("switch", networkConfig, allGroupsTagged); setSwitchGroups(g => [...g, { ...mkSwGrp(), ipStart: ip }]); addLog("group_added", "Switch group added"); }} addLabel="Add Switch Group" color="#0B1F3A" />
        <div style={{ padding: 18 }}>
          {switchGroups.length === 0 && <Empty icon="🔀" msg="No switch groups yet. Click + Add Switch Group." />}
          {switchGroups.map((grp, gi) => (
            <GroupCard key={grp.id} icon="🔀"
              title={grp.groupLabel || (grp.brand ? `${grp.brand} ${grp.model}`.trim() : null)}
              idx={gi} devCount={grp.devices.length}
              collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
              onRemove={() => remGrp(setSwitchGroups, grp.id)}
              onMove={cat => moveGroup(grp, "switch", cat)}
              currentCategory="switch">
              <ModelSelector db={SWITCH_DB} brand={grp.brand} model={grp.model}
                onBrand={v => updGrp(setSwitchGroups, grp.id, "brand", v)}
                onModel={v => updGrp(setSwitchGroups, grp.id, "model", v)}
                onApply={() => {}} />
              <SectionLabel text="Group Settings" />
              <G cols={3}>
                <F label="Group Label"><Inp value={grp.groupLabel} onChange={e => updGrp(setSwitchGroups, grp.id, "groupLabel", e.target.value)} placeholder="e.g. CCTV Switches" /></F>
                <F label="VLAN Config"><Inp value={grp.vlan} onChange={e => updGrp(setSwitchGroups, grp.id, "vlan", e.target.value)} placeholder="e.g. VLAN 10 CCTV, 20 AC" /></F>
                <F label="Uplink Port / Speed"><Inp value={grp.uplink} onChange={e => updGrp(setSwitchGroups, grp.id, "uplink", e.target.value)} placeholder="e.g. G1 1Gbps to core" /></F>
              </G>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, padding: "8px 12px", background: grp.noProgramming ? "#FEF3C7" : "#F0FDF4", borderRadius: 7, border: `1px solid ${grp.noProgramming ? "#FDE68A" : "#BBF7D0"}` }}>
                <Tog label={<span style={{ fontSize: 12, fontWeight: 600, color: grp.noProgramming ? "#92400E" : "#065F46" }}>{grp.noProgramming ? "No programming required — customer-provided or physical-only hardware" : "Programming required — devices need configuration"}</span>} val={grp.noProgramming} set={v => updGrp(setSwitchGroups, grp.id, "noProgramming", v)} />
              </div>
              <GenerateBar group={grp} setter={setSwitchGroups} genFn={genSw} />
              <DevTable gid={grp.id} setter={setSwitchGroups} noProgramming={grp.noProgramming} devices={grp.devices} newDevFn={(i) => mkSwDev("", i || grp.devices.length)}
                onLog={(name, done) => addLog(done ? "programmed" : "unprogrammed", `${done ? "✓" : "○"} ${name} (Switch)`)}
                onFieldLog={(key, oldVal, newVal) => { if (!newVal) return; if (key === "name") addLog("name_change", `"${oldVal || "—"}" → "${newVal}" (Switch)`); else if (key === "location") addLog("location_set", `Location "${newVal}" set (Switch)`); }}
                cols={[
                  { key: "name", label: "Switch Name", ph: "e.g. CCTV-SW-01" },
                  { key: "location", label: "Location", ph: "e.g. IDF Room B" },
                  { key: "cableId", label: "Blueprint ID", ph: "e.g. CR-301" },
                  { key: "ip", label: "IP Address", ph: "192.168.x.x" },
                  { key: "mac", label: "MAC", ph: "AA:BB:CC..." },
                  { key: "serial", label: "Serial #", ph: "" },
                  { key: "ports", label: "Port Count", ph: "24" },
                  { key: "notes", label: "Notes", ph: "" },
                ]} />
            </GroupCard>
          ))}
        </div>
      </div>
    </div>
  );
}
