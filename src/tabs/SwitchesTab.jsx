import { SWITCH_DB } from "../deviceDB";
import { mkSwGrp, mkSwDev, genSw, updGrp, remGrp } from "../models";
import { CardHead, Empty, G, F, Inp, SectionLabel } from "../components/ui";
import GroupCard from "../components/GroupCard";
import DevTable from "../components/DevTable";
import ModelSelector from "../components/ModelSelector";
import GenerateBar from "../components/GenerateBar";

export default function SwitchesTab({ switchGroups, setSwitchGroups, swCount, collapsed, toggleCollapse, addLog }) {
  return (
    <div>
      <div style={{ background: "#FFFFFF", borderRadius: 10, border: `1px solid #CBD5E1`, overflow: "hidden" }}>
        <CardHead icon="🔀" title="Network Switching" count={swCount} onAdd={() => { setSwitchGroups(g => [...g, mkSwGrp()]); addLog("group_added", "Switch group added"); }} addLabel="Add Switch Group" color="#0B1F3A" />
        <div style={{ padding: 18 }}>
          {switchGroups.length === 0 && <Empty icon="🔀" msg="No switch groups yet. Click + Add Switch Group." />}
          {switchGroups.map((grp, gi) => (
            <GroupCard key={grp.id} icon="🔀"
              title={grp.groupLabel || (grp.brand ? `${grp.brand} ${grp.model}`.trim() : null)}
              idx={gi} devCount={grp.devices.length}
              collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
              onRemove={() => remGrp(setSwitchGroups, grp.id)}>
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
              <GenerateBar group={grp} setter={setSwitchGroups} genFn={genSw} />
              <DevTable gid={grp.id} setter={setSwitchGroups} devices={grp.devices} newDevFn={(i) => mkSwDev("", i || grp.devices.length)}
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
