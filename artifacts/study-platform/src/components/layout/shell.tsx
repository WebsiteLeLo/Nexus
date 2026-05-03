import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { UserSettings } from "@/lib/types";

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [settings] = useLocalStorage<UserSettings>('nexus-settings', {
    theme: 'dark',
    fontSize: 'medium',
    focusMode: false
  });

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {!settings.focusMode && <Sidebar />}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
