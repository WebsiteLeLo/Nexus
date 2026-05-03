import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Reminder } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Bell, Plus, Trash2, BellOff, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Reminders() {
  const [reminders, setReminders] = useLocalStorage<Reminder[]>('nexus-reminders', []);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ label: '', time: '19:00', daysOfWeek: [1, 2, 3, 4, 5] as number[] });

  const firedRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if ('Notification' in window) setNotifPerm(Notification.permission);
  }, []);

  /* ── Reminder scheduler — checks every 30 s ─────────────────────────── */
  useEffect(() => {
    function check() {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const dow = now.getDay();
      const dateKey = now.toDateString();

      reminders.forEach(r => {
        if (!r.enabled) return;
        if (r.time !== hhmm) return;
        if (!r.daysOfWeek.includes(dow)) return;
        const fireKey = `${r.id}|${hhmm}|${dateKey}`;
        if (firedRef.current[r.id] === fireKey) return;
        firedRef.current[r.id] = fireKey;
        new Notification('📚 Study Reminder', { body: r.label, icon: '/favicon.ico' });
      });
    }

    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [reminders]);

  async function requestPermission() {
    if ('Notification' in window) {
      const p = await Notification.requestPermission();
      setNotifPerm(p);
    }
  }

  function addReminder() {
    if (!form.label.trim()) return;
    setReminders(rs => [...rs, {
      id: generateId(),
      label: form.label.trim(),
      time: form.time,
      daysOfWeek: form.daysOfWeek,
      enabled: true
    }]);
    setForm({ label: '', time: '19:00', daysOfWeek: [1, 2, 3, 4, 5] });
    setShowAdd(false);
  }

  function toggleReminder(id: string) {
    setReminders(rs => rs.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  }

  function toggleDay(day: number) {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter(d => d !== day)
        : [...f.daysOfWeek, day]
    }));
  }

  function scheduleTest(reminder: Reminder) {
    if (notifPerm !== 'granted') { requestPermission(); return; }
    setTimeout(() => {
      new Notification('Study Reminder', {
        body: reminder.label,
        icon: '/favicon.ico'
      });
    }, 2000);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Study Reminders</h1>
          <p className="text-sm text-muted-foreground">Set browser notifications to keep your study schedule</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Add Reminder</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {notifPerm !== 'granted' && (
          <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Notifications not enabled</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {notifPerm === 'denied' ? 'Notifications are blocked. Please enable them in your browser settings.' : 'Enable notifications to receive study reminders.'}
                </p>
              </div>
            </div>
            {notifPerm !== 'denied' && (
              <Button size="sm" onClick={requestPermission} className="bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0">
                Enable
              </Button>
            )}
          </div>
        )}

        {reminders.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <BellOff className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No reminders set</p>
            <p className="text-sm mt-1">Add a reminder to stay on track with your study schedule</p>
          </div>
        )}

        <div className="max-w-xl space-y-3">
          {reminders.map(reminder => (
            <div key={reminder.id} className={cn(
              "flex items-center gap-4 p-4 rounded-lg border transition-colors",
              reminder.enabled ? 'bg-card border-border' : 'bg-muted/30 border-border opacity-60'
            )}>
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                reminder.enabled ? 'bg-primary/10' : 'bg-muted'
              )}>
                {reminder.enabled ? <BellRing className="w-5 h-5 text-primary" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{reminder.label}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm font-mono text-primary">{reminder.time}</span>
                  <div className="flex gap-1">
                    {DAYS.map((day, i) => (
                      <span key={day} className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        reminder.daysOfWeek.includes(i)
                          ? 'bg-primary/20 text-primary font-medium'
                          : 'text-muted-foreground'
                      )}>
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {notifPerm === 'granted' && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => scheduleTest(reminder)}>
                    Test
                  </Button>
                )}
                <Switch checked={reminder.enabled} onCheckedChange={() => toggleReminder(reminder.id)} />
                <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setReminders(rs => rs.filter(r => r.id !== reminder.id))}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Study Reminder</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Label</label>
              <Input
                placeholder="e.g. Study Physics at 7 PM"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Time</label>
              <Input
                type="time"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Repeat on days</label>
              <div className="flex gap-2">
                {DAYS.map((day, i) => (
                  <button
                    key={day}
                    className={cn(
                      "w-9 h-9 rounded-full text-sm font-medium transition-colors border",
                      form.daysOfWeek.includes(i)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-muted/50'
                    )}
                    onClick={() => toggleDay(i)}
                  >
                    {day.slice(0, 1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addReminder}>Add Reminder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
