import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { PlannerTask } from "@/lib/types";
import { generateId, todayStr } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Trash2, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  const today = todayStr();
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  if (dateStr === tomorrow) return 'Tomorrow';
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function Planner() {
  const [tasks, setTasks] = useLocalStorage<PlannerTask[]>('nexus-planner', []);
  const [currentDate, setCurrentDate] = useState(todayStr());
  const [newTask, setNewTask] = useState('');

  const today = todayStr();
  const dayTasks = useMemo(() => tasks.filter(t => t.date === currentDate).sort((a, b) => a.order - b.order), [tasks, currentDate]);
  const completed = dayTasks.filter(t => t.completed).length;

  function calcStreak(): number {
    let streak = 0;
    let d = today;
    while (true) {
      const dayT = tasks.filter(t => t.date === d);
      if (dayT.length > 0 && dayT.every(t => t.completed)) {
        streak++;
        d = addDays(d, -1);
      } else break;
    }
    return streak;
  }

  function addTask() {
    if (!newTask.trim()) return;
    setTasks(ts => [...ts, {
      id: generateId(),
      date: currentDate,
      text: newTask.trim(),
      completed: false,
      order: ts.filter(t => t.date === currentDate).length + 1
    }]);
    setNewTask('');
  }

  function toggleTask(id: string) {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }

  function deleteTask(id: string) {
    setTasks(ts => ts.filter(t => t.id !== id));
  }

  const streak = calcStreak();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Study Planner</h1>
          <p className="text-sm text-muted-foreground">Plan and track your daily study goals</p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-2 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-full px-3 py-1.5">
            <Flame className="w-4 h-4" />
            <span className="text-sm font-semibold">{streak} day streak</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto p-6">
          {/* Date navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(d => addDays(d, -1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <h2 className="font-semibold text-lg">{formatDisplayDate(currentDate)}</h2>
              <p className="text-xs text-muted-foreground">{new Date(currentDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(d => addDays(d, 1))} disabled={currentDate >= today}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress */}
          {dayTasks.length > 0 && (
            <div className="mb-6 p-4 rounded-lg bg-card border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Today's Progress</span>
                <span className="text-sm text-muted-foreground">{completed}/{dayTasks.length}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all rounded-full"
                  style={{ width: `${dayTasks.length > 0 ? (completed / dayTasks.length) * 100 : 0}%` }}
                />
              </div>
              {completed === dayTasks.length && dayTasks.length > 0 && (
                <p className="text-xs text-emerald-500 mt-2 font-medium">All tasks complete!</p>
              )}
            </div>
          )}

          {/* Add task */}
          {currentDate <= today && (
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Add a task... (e.g. Watch 3 videos)"
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                data-testid="input-new-task"
              />
              <Button onClick={addTask} data-testid="button-add-task">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Tasks */}
          <div className="space-y-2">
            {dayTasks.map(task => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  task.completed ? "bg-muted/30 border-border" : "bg-card border-border"
                )}
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => toggleTask(task.id)}
                  data-testid={`checkbox-task-${task.id}`}
                />
                <span className={cn("flex-1 text-sm", task.completed && "line-through text-muted-foreground")}>
                  {task.text}
                </span>
                <Button
                  size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive opacity-50 hover:opacity-100"
                  onClick={() => deleteTask(task.id)}
                  data-testid={`button-delete-task-${task.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            {dayTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                <p className="text-sm">No tasks for {formatDisplayDate(currentDate).toLowerCase()}</p>
                {currentDate <= today && (
                  <p className="text-xs mt-1">Add a task above to get started</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
