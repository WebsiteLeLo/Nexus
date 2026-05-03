import { useRef } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { UserSettings } from "@/lib/types";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sun, Moon, Monitor, Download, Upload, Trash2, AlertTriangle } from "lucide-react";

const STORAGE_KEYS = ['nexus-subjects', 'nexus-topics', 'nexus-subtopics', 'nexus-videos', 'nexus-notes', 'nexus-playlists', 'nexus-files', 'nexus-folders', 'nexus-planner', 'nexus-reminders', 'nexus-settings'];

export default function Settings() {
  const [settings, setSettings] = useLocalStorage<UserSettings>('nexus-settings', {
    theme: 'dark', fontSize: 'medium', focusMode: false
  });
  const { setTheme, theme } = useTheme();
  const importRef = useRef<HTMLInputElement>(null);

  function exportData() {
    const data: Record<string, unknown> = {};
    STORAGE_KEYS.forEach(key => {
      const val = localStorage.getItem(key);
      if (val) data[key] = JSON.parse(val);
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nexus-study-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        Object.entries(data).forEach(([key, val]) => {
          localStorage.setItem(key, JSON.stringify(val));
        });
        window.location.reload();
      } catch {
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  }

  function clearData() {
    if (!confirm('This will permanently delete all your study data. Are you sure?')) return;
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    window.location.reload();
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Customize your study environment</p>
      </div>

      <div className="flex-1 p-4 sm:p-6 max-w-xl space-y-8">
        {/* Appearance */}
        <section>
          <h2 className="text-base font-semibold mb-4">Appearance</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-xs text-muted-foreground">Choose your preferred color scheme</p>
              </div>
              <div className="flex gap-2">
                {(['light', 'dark', 'system'] as const).map(t => {
                  const Icon = t === 'light' ? Sun : t === 'dark' ? Moon : Monitor;
                  return (
                    <button
                      key={t}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${theme === t ? 'bg-primary/10 border-primary/40 text-primary' : 'border-border hover:bg-muted/50'}`}
                      onClick={() => { setTheme(t); setSettings(s => ({ ...s, theme: t })); }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="capitalize">{t}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Font Size</p>
                <p className="text-xs text-muted-foreground">Adjust the text size</p>
              </div>
              <Select value={settings.fontSize} onValueChange={v => setSettings(s => ({ ...s, fontSize: v as UserSettings['fontSize'] }))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Focus Mode</p>
                <p className="text-xs text-muted-foreground">Hide the sidebar for distraction-free studying</p>
              </div>
              <Switch
                checked={settings.focusMode}
                onCheckedChange={v => setSettings(s => ({ ...s, focusMode: v }))}
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Data Management */}
        <section>
          <h2 className="text-base font-semibold mb-1">Data Management</h2>
          <p className="text-xs text-muted-foreground mb-4">All your data is stored locally in your browser</p>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Export Backup</p>
                <p className="text-xs text-muted-foreground">Download all your data as JSON</p>
              </div>
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="w-4 h-4 mr-2" />Export
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Import Backup</p>
                <p className="text-xs text-muted-foreground">Restore data from a JSON backup file</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />Import
              </Button>
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={importData} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Clear All Data</p>
                  <p className="text-xs text-muted-foreground">Permanently delete all study data</p>
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={clearData}>
                <Trash2 className="w-4 h-4 mr-2" />Clear
              </Button>
            </div>
          </div>
        </section>

        <Separator />

        {/* About */}
        <section>
          <h2 className="text-base font-semibold mb-2">About</h2>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Nexus Study</span> — Distraction-free YouTube learning platform</p>
            <p>All data is stored locally in your browser. No account required.</p>
            <p className="text-xs mt-2">Version 1.0.0</p>
          </div>
        </section>
      </div>
    </div>
  );
}
