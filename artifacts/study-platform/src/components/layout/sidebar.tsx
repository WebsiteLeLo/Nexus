import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Library, PlaySquare, BookOpen, Repeat,
  ListVideo, FolderOpen, Search, CalendarDays, Bell, Settings, X, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",          label: "Dashboard", icon: LayoutDashboard },
  { href: "/playlists", label: "Playlists", icon: ListVideo },
  { href: "/library",   label: "Library",   icon: Library },
  { href: "/notes",     label: "Notes Hub", icon: BookOpen },
  { href: "/revision",  label: "Revision",  icon: Repeat },
  { href: "/files",     label: "Files",     icon: FolderOpen },
  { href: "/search",    label: "Search",    icon: Search },
  { href: "/planner",   label: "Planner",   icon: CalendarDays },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "https://pwxstudy.site/", label: "PWX Study", icon: ExternalLink, isExternal: true },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();

  function handleNav() {
    onClose?.();
  }

  return (
    <aside className="w-64 border-r bg-sidebar text-sidebar-foreground flex flex-col h-full">
      <div className="h-14 flex items-center justify-between px-5 border-b font-semibold text-lg tracking-tight flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo-192x192.jpg" alt="Nexus Study Logo" className="w-8 h-8 rounded-md object-cover shadow-sm" />
          Nexus Study
        </div>
        {/* X button only visible on mobile */}
        <button
          className="md:hidden p-1 rounded hover:bg-muted/50 transition-colors"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
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
                className="flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              >
                <Icon className="w-4 h-4 mr-3 text-muted-foreground" />
                {item.label}
              </a>
            );
          }

          const isActive =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href} onClick={handleNav}>
              <div
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className={cn("w-4 h-4 mr-3", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t flex-shrink-0">
        <Link href="/settings" onClick={handleNav}>
          <div
            className={cn(
              "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
              location.startsWith("/settings")
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <Settings className="w-4 h-4 mr-3 text-muted-foreground" />
            Settings
          </div>
        </Link>
      </div>
    </aside>
  );
}
