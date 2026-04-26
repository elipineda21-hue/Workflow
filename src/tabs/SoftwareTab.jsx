import { SOFTWARE_TYPES } from "../constants";
import { mkSoftGrp, mkSoftDev, genSoft, updGrp, remGrp } from "../models";
import { CardHead, Empty, G, F, Inp, Sel, Tog, SectionLabel } from "../components/ui";
import GroupCard from "../components/GroupCard";
import DevTable from "../components/DevTable";
import GenerateBar from "../components/GenerateBar";

export default function SoftwareTab({ softwareGroups, setSoftwareGroups, softCount, collapsed, toggleCollapse, addLog, moveGroup }) {
  return (
    <div>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <CardHead icon="💿" title="Software & Licenses" count={softCount} onAdd={() => { setSoftwareGroups(g => [...g, mkSoftGrp()]); addLog("group_added", "Software group added"); }} addLabel="Add Software Group" color="#0B1F3A" />
        <div className="p-4">
          {softwareGroups.length === 0 && <Empty icon="💿" msg="No software groups yet. Click + Add Software Group." />}
          {softwareGroups.map((grp, gi) => {
            const hw = grp.noProgramming;
            return (
            <GroupCard key={grp.id} icon="💿"
              title={grp.groupLabel || (grp.brand ? `${grp.brand} ${grp.model}`.trim() : null)}
              idx={gi} devCount={grp.devices.length}
              collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
              onRemove={() => remGrp(setSoftwareGroups, grp.id)}
              onMove={cat => moveGroup(grp, "software", cat)}
              currentCategory="software">
              <SectionLabel text="Brand & Product" />
              <G cols={4}>
                <F label="Brand / Manufacturer"><Inp value={grp.brand} onChange={e => updGrp(setSoftwareGroups, grp.id, "brand", e.target.value)} placeholder="e.g. Milestone" /></F>
                <F label="Model / Product"><Inp value={grp.model} onChange={e => updGrp(setSoftwareGroups, grp.id, "model", e.target.value)} placeholder="e.g. XProtect Essential+" /></F>
              </G>
              {/* Hardware-only toggle */}
              <div className={`flex items-center gap-2.5 mt-2.5 p-2 px-3 rounded-[7px] border ${hw ? "bg-[#FEF3C7] border-[#FDE68A]" : "bg-[#F0FDF4] border-[#BBF7D0]"}`}>
                <Tog label={<span className={`text-xs font-semibold ${hw ? "text-[#92400E]" : "text-[#065F46]"}`}>{hw ? "Hardware only — no programming required" : "Programming required — devices need configuration"}</span>} val={hw} set={v => updGrp(setSoftwareGroups, grp.id, "noProgramming", v)} />
              </div>
              <SectionLabel text="Group Settings" />
              <G cols={4}>
                <F label="Software Type">
                  <Sel value={grp.softwareType} onChange={e => updGrp(setSoftwareGroups, grp.id, "softwareType", e.target.value)}>
                    {SOFTWARE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </Sel>
                </F>
                <F label="License Key"><Inp value={grp.licenseKey} onChange={e => updGrp(setSoftwareGroups, grp.id, "licenseKey", e.target.value)} placeholder="e.g. XXXX-XXXX-XXXX" /></F>
                <F label="Seats"><Inp type="number" min="1" value={grp.seats} onChange={e => updGrp(setSoftwareGroups, grp.id, "seats", e.target.value)} /></F>
                <F label="Subscription">
                  <Tog label="Recurring subscription" val={grp.subscription} set={v => updGrp(setSoftwareGroups, grp.id, "subscription", v)} />
                </F>
              </G>
              <G cols={4}>
                <F label="Renewal Date"><Inp type="date" value={grp.renewalDate} onChange={e => updGrp(setSoftwareGroups, grp.id, "renewalDate", e.target.value)} /></F>
                <F label="Group Label"><Inp value={grp.groupLabel} onChange={e => updGrp(setSoftwareGroups, grp.id, "groupLabel", e.target.value)} placeholder="e.g. VMS Licenses" /></F>
              </G>
              <GenerateBar group={grp} setter={setSoftwareGroups} genFn={genSoft} showIP={false} />
              <DevTable gid={grp.id} setter={setSoftwareGroups} noProgramming={hw} devices={grp.devices} newDevFn={(i) => mkSoftDev(i || grp.devices.length)}
                onLog={(name, done) => addLog(done ? "programmed" : "unprogrammed", `${done ? "✓" : "○"} ${name} (Software)`)}
                onFieldLog={(key, oldVal, newVal) => { if (!newVal) return; if (key === "name") addLog("name_change", `"${oldVal || "—"}" → "${newVal}" (Software)`); }}
                cols={[
                  { key: "name", label: "Name", ph: "e.g. License 01" },
                  { key: "cableId", label: "Device ID", ph: "e.g. SFT-001" },
                  { key: "licenseKey", label: "License Key", ph: "e.g. XXXX-XXXX" },
                  { key: "activationDate", label: "Activation Date", ph: "YYYY-MM-DD", type: "date" },
                  { key: "expiryDate", label: "Expiry Date", ph: "YYYY-MM-DD", type: "date" },
                  { key: "assignedTo", label: "Assigned To", ph: "e.g. NVR-01" },
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
