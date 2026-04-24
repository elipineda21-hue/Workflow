import { SERVER_DB } from "../deviceDB";
import { SERVER_ROLES, CCTV_PLATFORMS } from "../constants";
import { mkSrvGrp, mkSrvDev, genSrv, updGrp, remGrp, getNextIpStart } from "../models";
import { CardHead, Empty, G, F, Inp, Sel, Tog, SectionLabel } from "../components/ui";
import GroupCard from "../components/GroupCard";
import DevTable from "../components/DevTable";
import ModelSelector from "../components/ModelSelector";
import GenerateBar from "../components/GenerateBar";

export default function ServersTab({ serverGroups, setServerGroups, srvCount, collapsed, toggleCollapse, addLog, moveGroup, networkConfig, allGroupsTagged, deviceCatalog }) {
  return (
    <div>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <CardHead icon="🖥" title="Servers & Computing" count={srvCount} onAdd={() => { const ip = getNextIpStart("server", networkConfig, allGroupsTagged); setServerGroups(g => [...g, { ...mkSrvGrp(), ipStart: ip }]); addLog("group_added", "Server group added"); }} addLabel="Add Server Group" color="#0B1F3A" />
        <div className="p-4">
          {serverGroups.length === 0 && <Empty icon="🖥" msg="No server groups yet. Click + Add Server Group." />}
          {serverGroups.map((grp, gi) => {
            const hw = grp.noProgramming;
            return (
            <GroupCard key={grp.id} icon="🖥"
              title={grp.groupLabel || (grp.brand ? `${grp.brand} ${grp.model}`.trim() : null)}
              idx={gi} devCount={grp.devices.length}
              collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
              onRemove={() => remGrp(setServerGroups, grp.id)}
              onMove={cat => moveGroup(grp, "server", cat)}
              currentCategory="server">
              <ModelSelector db={SERVER_DB} brand={grp.brand} model={grp.model}
                catalog={(deviceCatalog || []).filter(c => c.category === "server")}
                onBrand={v => updGrp(setServerGroups, grp.id, "brand", v)}
                onModel={v => updGrp(setServerGroups, grp.id, "model", v)}
                onApply={obj => setServerGroups(gs => gs.map(g => g.id === grp.id ? { ...g, os: obj.os || g.os } : g))} />
              {/* Hardware-only toggle — right after model selection */}
              <div className={`flex items-center gap-2.5 mt-2.5 p-2 px-3 rounded-[7px] border ${hw ? "bg-[#FEF3C7] border-[#FDE68A]" : "bg-[#F0FDF4] border-[#BBF7D0]"}`}>
                <Tog label={<span className={`text-xs font-semibold ${hw ? "text-[#92400E]" : "text-[#065F46]"}`}>{hw ? "Hardware only — no programming required" : "Programming required — devices need configuration"}</span>} val={hw} set={v => updGrp(setServerGroups, grp.id, "noProgramming", v)} />
              </div>
              {/* Only show config fields when programming is required */}
              {!hw && (
                <>
                  <SectionLabel text="Group Settings" />
                  <G cols={3}>
                    <F label="Role">
                      <Sel value={grp.role} onChange={e => updGrp(setServerGroups, grp.id, "role", e.target.value)}>
                        {SERVER_ROLES.map(r => <option key={r}>{r}</option>)}
                      </Sel>
                    </F>
                    <F label="OS / Platform"><Inp value={grp.os} onChange={e => updGrp(setServerGroups, grp.id, "os", e.target.value)} placeholder="e.g. Windows Server 2022" /></F>
                    <F label="Storage Config"><Inp value={grp.storage} onChange={e => updGrp(setServerGroups, grp.id, "storage", e.target.value)} placeholder="e.g. RAID 5 / 8TB" /></F>
                  </G>
                </>
              )}
              {/* Group label always visible */}
              <G cols={3}>
                <F label="Group Label"><Inp value={grp.groupLabel} onChange={e => updGrp(setServerGroups, grp.id, "groupLabel", e.target.value)} placeholder="e.g. VMS Servers" /></F>
                <F label="VMS Platform"><Sel value={grp.platform || ""} onChange={e => updGrp(setServerGroups, grp.id, "platform", e.target.value)}><option value="">Select...</option>{CCTV_PLATFORMS.map(o => <option key={o}>{o}</option>)}</Sel></F>
              </G>
              <GenerateBar group={grp} setter={setServerGroups} genFn={genSrv} showIP={!hw} />
              <DevTable gid={grp.id} setter={setServerGroups} noProgramming={hw} devices={grp.devices} newDevFn={(i) => mkSrvDev("", i || grp.devices.length)}
                onLog={(name, done) => addLog(done ? "programmed" : "unprogrammed", `${done ? "✓" : "○"} ${name} (Server)`)}
                onFieldLog={(key, oldVal, newVal) => { if (!newVal) return; if (key === "name") addLog("name_change", `"${oldVal || "—"}" → "${newVal}" (Server)`); }}
                cols={[
                  { key: "name", label: "Server Name", ph: "e.g. VMS-01" },
                  { key: "cableId", label: "Device ID", ph: "e.g. SVR-001" },
                  ...(!hw ? [
                    { key: "ip", label: "IP Address", ph: "192.168.x.x" },
                    { key: "mac", label: "MAC", ph: "AA:BB:CC..." },
                  ] : []),
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
