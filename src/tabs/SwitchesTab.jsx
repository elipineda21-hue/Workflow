import { SWITCH_DB } from "../deviceDB";
import { mkSwGrp, mkSwDev, genSw, updGrp, remGrp, getNextIpStart } from "../models";
import { CardHead, Empty, G, F, Inp, Tog, SectionLabel } from "../components/ui";
import GroupCard from "../components/GroupCard";
import DevTable from "../components/DevTable";
import ModelSelector from "../components/ModelSelector";
import GenerateBar from "../components/GenerateBar";

export default function SwitchesTab({ switchGroups, setSwitchGroups, swCount, collapsed, toggleCollapse, addLog, moveGroup, networkConfig, allGroupsTagged, deviceCatalog }) {
  return (
    <div>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <CardHead icon="🔀" title="Network Switching" count={swCount} onAdd={() => { const ip = getNextIpStart("switch", networkConfig, allGroupsTagged); setSwitchGroups(g => [...g, { ...mkSwGrp(), ipStart: ip }]); addLog("group_added", "Switch group added"); }} addLabel="Add Switch Group" color="#0B1F3A" />
        <div className="p-4">
          {switchGroups.length === 0 && <Empty icon="🔀" msg="No switch groups yet. Click + Add Switch Group." />}
          {switchGroups.map((grp, gi) => {
            const hw = grp.noProgramming;
            return (
            <GroupCard key={grp.id} icon="🔀"
              title={grp.groupLabel || (grp.brand ? `${grp.brand} ${grp.model}`.trim() : null)}
              idx={gi} devCount={grp.devices.length}
              collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
              onRemove={() => remGrp(setSwitchGroups, grp.id)}
              onMove={cat => moveGroup(grp, "switch", cat)}
              currentCategory="switch">
              <ModelSelector db={SWITCH_DB} brand={grp.brand} model={grp.model}
                catalog={(deviceCatalog || []).filter(c => c.category === "switch")}
                onBrand={v => updGrp(setSwitchGroups, grp.id, "brand", v)}
                onModel={v => updGrp(setSwitchGroups, grp.id, "model", v)}
                onApply={() => {}} />
              {/* Hardware-only toggle — right after model selection */}
              <div className={`flex items-center gap-2.5 mt-2.5 p-2 px-3 rounded-[7px] border ${hw ? "bg-[#FEF3C7] border-[#FDE68A]" : "bg-[#F0FDF4] border-[#BBF7D0]"}`}>
                <Tog label={<span className={`text-xs font-semibold ${hw ? "text-[#92400E]" : "text-[#065F46]"}`}>{hw ? "Hardware only — no programming required" : "Programming required — devices need configuration"}</span>} val={hw} set={v => updGrp(setSwitchGroups, grp.id, "noProgramming", v)} />
              </div>
              {/* Only show config fields when programming is required */}
              {!hw && (
                <>
                  <SectionLabel text="Group Settings" />
                  <G cols={3}>
                    <F label="VLAN Config"><Inp value={grp.vlan} onChange={e => updGrp(setSwitchGroups, grp.id, "vlan", e.target.value)} placeholder="e.g. VLAN 10 CCTV, 20 AC" /></F>
                    <F label="Uplink Port / Speed"><Inp value={grp.uplink} onChange={e => updGrp(setSwitchGroups, grp.id, "uplink", e.target.value)} placeholder="e.g. G1 1Gbps to core" /></F>
                  </G>
                </>
              )}
              {/* Group label always visible */}
              <G cols={3}>
                <F label="Group Label"><Inp value={grp.groupLabel} onChange={e => updGrp(setSwitchGroups, grp.id, "groupLabel", e.target.value)} placeholder="e.g. CCTV Switches" /></F>
              </G>
              <GenerateBar group={grp} setter={setSwitchGroups} genFn={genSw} showIP={!hw} />
              <DevTable gid={grp.id} setter={setSwitchGroups} noProgramming={hw} devices={grp.devices} newDevFn={(i) => mkSwDev("", i || grp.devices.length)}
                onLog={(name, done) => addLog(done ? "programmed" : "unprogrammed", `${done ? "✓" : "○"} ${name} (Switch)`)}
                onFieldLog={(key, oldVal, newVal) => { if (!newVal) return; if (key === "name") addLog("name_change", `"${oldVal || "—"}" → "${newVal}" (Switch)`); }}
                cols={[
                  { key: "name", label: "Switch Name", ph: "e.g. CCTV-SW-01" },
                  { key: "cableId", label: "Device ID", ph: "e.g. NSW-001" },
                  ...(!hw ? [
                    { key: "ip", label: "IP Address", ph: "192.168.x.x" },
                    { key: "mac", label: "MAC", ph: "AA:BB:CC..." },
                  ] : []),
                  { key: "serial", label: "Serial #", ph: "" },
                  { key: "ports", label: "Port Count", ph: "24" },
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
