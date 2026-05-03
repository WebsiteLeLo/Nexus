import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Library, 
  PlaySquare, 
  BookOpen, 
  Repeat, 
  ListVideo, 
  FolderOpen, 
  Search, 
  CalendarDays, 
  Bell, 
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/library", label: "Library", icon: Library },
  { href: "/notes", label: "Notes Hub", icon: BookOpen },
  { href: "/revision", label: "Revision", icon: Repeat },
  { href: "/playlists", label: "Playlists", icon: ListVideo },
  { href: "/files", label: "Files", icon: FolderOpen },
  { href: "/search", label: "Search", icon: Search },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/reminders", label: "Reminders", icon: Bell },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 border-r bg-sidebar text-sidebar-foreground flex flex-col min-h-screen">
      <div className="h-14 flex items-center px-6 border-b font-semibold text-lg tracking-tight">
        <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center mr-3">
          <PlaySquare className="w-5 h-5" />
        </div>
        Nexus Study
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}>
                <Icon className={cn("w-4 h-4 mr-3", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t">
        <Link href="/settings">
          <div className={cn(
            "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
            location.startsWith("/settings") 
              ? "bg-sidebar-accent text-sidebar-accent-foreground" 
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}>
            <Settings className="w-4 h-4 mr-3 text-muted-foreground" />
            Settings
          </div>
        </Link>
      </div>
    </aside>
  );
}
