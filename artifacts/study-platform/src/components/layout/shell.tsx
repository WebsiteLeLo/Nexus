import { useState } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./sidebar";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { UserSettings } from "@/lib/types";
import { Menu, PlaySquare } from "lucide-react";
import { cn } from "@/lib/utils";

export function Shell({ children }: { children: React.ReactNode }) {
  const [settings] = useLocalStorage<UserSettings>("nexus-settings", {
    theme: "light", fontSize: "medium", focusMode: false,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useLocalStorage("nexus-sidebar-collapsed", false);
  const [location] = useLocation();
  const showSidebar = !settings.focusMode;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {showSidebar && (
        <>
          {/* Mobile backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar — fixed overlay on mobile, static on desktop */}
          <div
            className={cn(
              "fixed inset-y-0 left-0 z-50 flex flex-col bg-background",
              "md:relative md:z-auto md:translate-x-0",
              "transition-all duration-300 ease-in-out",
              sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0",
              !sidebarOpen && desktopCollapsed ? "md:w-[72px]" : "md:w-64"
            )}
          >
            <Sidebar 
              onClose={() => setSidebarOpen(false)} 
              isCollapsed={!sidebarOpen && desktopCollapsed}
              onToggleCollapse={() => setDesktopCollapsed(!desktopCollapsed)}
            />
          </div>
        </>
      )}

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        {showSidebar && (
          <div className="md:hidden flex items-center gap-3 px-4 h-12 border-b flex-shrink-0 bg-background z-10">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 rounded hover:bg-muted/50 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <img src="/logo-192x192.jpg" alt="Nexus Study Logo" className="w-6 h-6 rounded object-cover shadow-sm" />
              <span className="font-semibold text-sm tracking-tight">Nexus Study</span>
            </div>
          </div>
        )}
        <div key={location} className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}
