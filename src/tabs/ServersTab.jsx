import { SERVER_DB } from "../deviceDB";
import { SERVER_ROLES } from "../constants";
import { mkSrvGrp, mkSrvDev, genSrv, updGrp, remGrp } from "../models";
import { CardHead, Empty, G, F, Inp, Sel, SectionLabel } from "../components/ui";
import GroupCard from "../components/GroupCard";
import DevTable from "../components/DevTable";
import ModelSelector from "../components/ModelSelector";
import GenerateBar from "../components/GenerateBar";

export default function ServersTab({ serverGroups, setServerGroups, srvCount, collapsed, toggleCollapse, addLog }) {
  return (
    <div>
      <div style={{ background: "#FFFFFF", borderRadius: 10, border: `1px solid #CBD5E1`, overflow: "hidden" }}>
        <CardHead icon="🖥" title="Servers & Computing" count={srvCount} onAdd={() => { setServerGroups(g => [...g, mkSrvGrp()]); addLog("group_added", "Server group added"); }} addLabel="Add Server Group" color="#0B1F3A" />
        <div style={{ padding: 18 }}>
          {serverGroups.length === 0 && <Empty icon="🖥" msg="No server groups yet. Click + Add Server Group." />}
          {serverGroups.map((grp, gi) => (
            <GroupCard key={grp.id} icon="🖥"
              title={grp.groupLabel || (grp.brand ? `${grp.brand} ${grp.model}`.trim() : null)}
              idx={gi} devCount={grp.devices.length}
              collapsed={!!collapsed[grp.id]} onToggle={() => toggleCollapse(grp.id)}
              onRemove={() => remGrp(setServerGroups, grp.id)}>
              <ModelSelector db={SERVER_DB} brand={grp.brand} model={grp.model}
                onBrand={v => updGrp(setServerGroups, grp.id, "brand", v)}
                onModel={v => updGrp(setServerGroups, grp.id, "model", v)}
                onApply={obj => setServerGroups(gs => gs.map(g => g.id === grp.id ? { ...g, os: obj.os || g.os } : g))} />
              <SectionLabel text="Group Settings" />
              <G cols={3}>
                <F label="Group Label"><Inp value={grp.groupLabel} onChange={e => updGrp(setServerGroups, grp.id, "groupLabel", e.target.value)} placeholder="e.g. VMS Servers" /></F>
                <F label="Role">
                  <Sel value={grp.role} onChange={e => updGrp(setServerGroups, grp.id, "role", e.target.value)}>
                    {SERVER_ROLES.map(r => <option key={r}>{r}</option>)}
                  </Sel>
                </F>
                <F label="OS / Platform"><Inp value={grp.os} onChange={e => updGrp(setServerGroups, grp.id, "os", e.target.value)} placeholder="e.g. Windows Server 2022" /></F>
                <F label="Storage Config"><Inp value={grp.storage} onChange={e => updGrp(setServerGroups, grp.id, "storage", e.target.value)} placeholder="e.g. RAID 5 / 8TB" /></F>
              </G>
              <GenerateBar group={grp} setter={setServerGroups} genFn={genSrv} />
              <DevTable gid={grp.id} setter={setServerGroups} devices={grp.devices} newDevFn={(i) => mkSrvDev("", i || grp.devices.length)}
                onLog={(name, done) => addLog(done ? "programmed" : "unprogrammed", `${done ? "✓" : "○"} ${name} (Server)`)}
                onFieldLog={(key, oldVal, newVal) => { if (!newVal) return; if (key === "name") addLog("name_change", `"${oldVal || "—"}" → "${newVal}" (Server)`); else if (key === "location") addLog("location_set", `Location "${newVal}" set (Server)`); }}
                cols={[
                  { key: "name", label: "Server Name", ph: "e.g. VMS-01" },
                  { key: "location", label: "Location", ph: "e.g. Server Room" },
                  { key: "cableId", label: "Blueprint ID", ph: "e.g. CR-201" },
                  { key: "ip", label: "IP Address", ph: "192.168.x.x" },
                  { key: "mac", label: "MAC", ph: "AA:BB:CC..." },
                  { key: "serial", label: "Serial #", ph: "" },
                  { key: "notes", label: "Notes", ph: "" },
                ]} />
            </GroupCard>
          ))}
        </div>
      </div>
    </div>
  );
}
