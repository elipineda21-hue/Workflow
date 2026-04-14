import { useState } from "react";
import { ChevronLeft, ChevronRight, Zap, LogOut, RefreshCw } from "lucide-react";
import { loadWorkOrder } from "../supabase";

const STATUS_DOT = {
  "Active":        "bg-success",
  "Pending Start": "bg-warn",
  "Paused/Stuck":  "bg-danger",
  "Closeout Req":  "bg-accent",
  "Complete":      "bg-muted",
};

export default function Sidebar({
  projects, selectedProject, collapsed: sidebarCollapsed, onToggle,
  onSelectProject, user, signOut, onRefresh,
}) {
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try { await onRefresh(); } catch {}
    setRefreshing(false);
  };

  const filtered = projects.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.projectId || "").toLowerCase().includes(search.toLowerCase())
  );

  if (sidebarCollapsed) {
    return (
      <div className="w-12 bg-dark flex flex-col items-center py-3 shrink-0 border-r border-white/[0.06]">
        <button onClick={onToggle} className="bg-transparent text-white/40 hover:text-white border-none cursor-pointer mb-4 p-1">
          <ChevronRight size={16} />
        </button>
        <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center mb-4">
          <Zap size={14} className="text-accent" />
        </div>
        <div className="flex flex-col gap-1.5 mt-2 w-full px-1.5 overflow-y-auto flex-1">
          {projects.slice(0, 20).map(p => (
            <button key={p.id}
              onClick={() => onSelectProject(p)}
              title={p.name}
              className={`w-full h-7 rounded-md border-none cursor-pointer text-[9px] font-bold flex items-center justify-center ${selectedProject?.id === p.id ? 'bg-accent/30 text-accent' : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/40'}`}>
              {p.name?.substring(0, 2).toUpperCase()}
            </button>
          ))}
        </div>
        {user && signOut && (
          <div className="px-1.5 py-2 border-t border-white/[0.06]">
            <button
              onClick={signOut}
              title={`Sign out ${user.email}`}
              className="w-full h-7 rounded-md border-none cursor-pointer bg-white/[0.04] hover:bg-danger/20 text-white/30 hover:text-danger flex items-center justify-center transition-colors"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-60 bg-dark flex flex-col shrink-0 border-r border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
            <Zap size={14} className="text-accent" />
          </div>
          <span className="text-white/80 font-bold text-xs tracking-tight">ProjectPal</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleRefresh} disabled={refreshing} title="Refresh projects from Monday.com"
            className="bg-transparent text-white/30 hover:text-white/60 border-none cursor-pointer p-1">
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button onClick={onToggle} className="bg-transparent text-white/30 hover:text-white/60 border-none cursor-pointer p-1">
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2.5 py-2">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="w-full py-1.5 px-2.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-white/80 text-[11px] outline-none placeholder:text-white/20"
        />
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-3">
        <div className="px-2 py-1.5 text-[9px] font-semibold text-white/25 uppercase tracking-wider">
          Projects ({filtered.length})
        </div>
        {filtered.map(p => {
          const isActive = selectedProject?.id === p.id;
          const dotClass = STATUS_DOT[p.projectStatus] || "bg-muted/50";
          return (
            <button key={p.id}
              onClick={() => onSelectProject(p)}
              className={`w-full text-left px-2.5 py-2 rounded-lg border-none cursor-pointer mb-0.5 flex items-start gap-2 group transition-colors ${isActive ? 'bg-accent/15' : 'bg-transparent hover:bg-white/[0.04]'}`}>
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dotClass}`} />
              <div className="min-w-0 flex-1">
                <div className={`text-[11px] font-semibold truncate ${isActive ? 'text-accent' : 'text-white/70 group-hover:text-white/90'}`}>
                  {p.name}
                </div>
                <div className="text-[9px] text-white/25 mt-0.5 truncate">
                  {p.projectId || "No ID"}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* User info + sign out */}
      {user && signOut && (
        <div className="px-3 py-2.5 border-t border-white/[0.06] flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            <span className="text-accent text-[9px] font-bold">
              {(user.email || "?")[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white/50 text-[10px] font-medium truncate" title={user.email}>
              {user.email}
            </div>
          </div>
          <button
            onClick={signOut}
            title="Sign Out"
            className="bg-transparent hover:bg-danger/20 text-white/25 hover:text-danger border-none rounded-md p-1 cursor-pointer transition-colors shrink-0"
          >
            <LogOut size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
