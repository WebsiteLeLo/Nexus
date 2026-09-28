import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Library, PlaySquare, BookOpen, Repeat,
  ListVideo, FolderOpen, Search, CalendarDays, Bell, Settings, X, ExternalLink, Menu
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",          label: "Dashboard", icon: LayoutDashboard },
  { href: "/playlists", label: "Playlists", icon: ListVideo },
  { href: "/notes",     label: "Notes Hub", icon: BookOpen },
  { href: "/revision",  label: "Revision",  icon: Repeat },
  { href: "/files",     label: "Files",     icon: FolderOpen },
  { href: "/search",    label: "Search",    icon: Search },
  { href: "/planner",   label: "Planner",   icon: CalendarDays },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "https://pwxstudy.site/", label: "PWX Study", icon: ExternalLink, isExternal: true },
];

export function Sidebar({ onClose, isCollapsed, onToggleCollapse }: { onClose?: () => void; isCollapsed?: boolean; onToggleCollapse?: () => void }) {
  const [location] = useLocation();

  function handleNav() {
    onClose?.();
  }

  return (
    <aside className="w-full border-r bg-sidebar text-sidebar-foreground flex flex-col h-full transition-all duration-300">
      <div className={cn("h-14 flex items-center border-b font-semibold text-lg tracking-tight flex-shrink-0", isCollapsed ? "justify-center px-0" : "justify-between px-5")}>
        {!isCollapsed ? (
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo-192x192.jpg" alt="Nexus Study Logo" className="w-8 h-8 rounded-md object-cover shadow-sm flex-shrink-0" />
            <span className="truncate">Nexus Study</span>
          </div>
        ) : (
          <div 
            className="flex items-center justify-center w-full h-full cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={onToggleCollapse} 
            title="Expand sidebar"
          >
            <img src="/logo-192x192.jpg" alt="Nexus Study Logo" className="w-8 h-8 rounded-md object-cover shadow-sm" />
          </div>
        )}
        
        {!isCollapsed && (
          <button
            className="p-1 rounded hover:bg-muted/50 transition-colors flex-shrink-0"
            onClick={onToggleCollapse || onClose}
            aria-label="Toggle menu"
          >
            {onToggleCollapse ? <Menu className="w-5 h-5 hidden md:block text-muted-foreground" /> : null}
            <X className="w-5 h-5 md:hidden" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          if (item.isExternal) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="pwxstudy_tab"
                rel="noopener"
                onClick={handleNav}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors cursor-pointer text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  isCollapsed ? "justify-center py-3" : "px-3 py-2.5"
                )}
              >
                <Icon className={cn(isCollapsed ? "w-5 h-5" : "w-4 h-4 mr-3", "flex-shrink-0")} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </a>
            );
          }

          const isActive =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href} onClick={handleNav}>
              <div
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  isCollapsed ? "justify-center py-3" : "px-3 py-2.5"
                )}
              >
                <Icon className={cn(isCollapsed ? "w-5 h-5" : "w-4 h-4 mr-3", isActive ? "text-primary" : "text-muted-foreground", "flex-shrink-0")} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </div>

      <div className={cn("border-t flex-shrink-0", isCollapsed ? "p-3" : "p-4")}>
        <Link href="/settings" onClick={handleNav}>
          <div
            title={isCollapsed ? "Settings" : undefined}
            className={cn(
              "flex items-center rounded-md text-sm font-medium transition-colors cursor-pointer",
              location.startsWith("/settings")
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              isCollapsed ? "justify-center py-3" : "px-3 py-2.5"
            )}
          >
            <Settings className={cn(isCollapsed ? "w-5 h-5" : "w-4 h-4 mr-3", "text-muted-foreground flex-shrink-0")} />
            {!isCollapsed && <span className="truncate">Settings</span>}
          </div>
        </Link>
      </div>
    </aside>
  );
}
