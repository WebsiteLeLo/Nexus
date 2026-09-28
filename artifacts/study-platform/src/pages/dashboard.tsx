import { useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Video, Playlist, PlannerTask } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, CheckCircle2, Clock, Flame, ListVideo, Plus, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { todayStr } from "@/lib/utils";

export default function Dashboard() {
  const [videos] = useLocalStorage<Video[]>('nexus-videos', []);
  const [playlists] = useLocalStorage<Playlist[]>('nexus-playlists', []);
  const [tasks] = useLocalStorage<PlannerTask[]>('nexus-planner', []);

  const completed = videos.filter(v => v.status === 'completed').length;
  const pending = videos.filter(v => v.status === 'pending' || v.status === 'revise').length;
  const todayTasks = tasks.filter(t => t.date === todayStr());
  const todayCompleted = todayTasks.filter(t => t.completed).length;

  const streak = useMemo(() => {
    if (!tasks.length) return 0;
    let count = 0;
    const d = new Date();
    for (let i = 0; i < 60; i++) {
      const ds = d.toISOString().slice(0, 10);
      const dayTasks = tasks.filter(t => t.date === ds);
      if (dayTasks.length > 0 && dayTasks.every(t => t.completed)) {
        count++;
        d.setDate(d.getDate() - 1);
      } else if (i === 0 && dayTasks.length === 0) {
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [tasks]);

  const recentVideos = useMemo(() =>
    [...videos].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()).slice(0, 5),
    [videos]
  );

  const isEmpty = videos.length === 0 && playlists.length === 0;

  if (isEmpty) {
    return (
      <div className="p-4 sm:p-8 max-w-3xl mx-auto w-full overflow-y-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Nexus Study</h1>
          <p className="text-muted-foreground mt-2">Your distraction-free learning platform. Get started by importing a YouTube playlist or creating your own.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/playlists">
            <Card className="cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all group">
              <CardContent className="pt-6 pb-5">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
                  <ListVideo className="w-5 h-5 text-violet-500" />
                </div>
                <h3 className="font-semibold mb-1">Playlists</h3>
                <p className="text-sm text-muted-foreground">Import any YouTube playlist URL or create a custom playlist.</p>
                <div className="flex items-center gap-1 mt-4 text-sm text-violet-500 font-medium">
                  Get Started <ChevronRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/planner">
            <Card className="cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all group">
              <CardContent className="pt-6 pb-5">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="font-semibold mb-1">Plan Your Day</h3>
                <p className="text-sm text-muted-foreground">Add tasks to the daily planner and build a consistent study streak.</p>
                <div className="flex items-center gap-1 mt-4 text-sm text-amber-500 font-medium">
                  Open Planner <ChevronRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/reminders">
            <Card className="cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all group">
              <CardContent className="pt-6 pb-5">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                  <Flame className="w-5 h-5 text-emerald-500" />
                </div>
                <h3 className="font-semibold mb-1">Set Reminders</h3>
                <p className="text-sm text-muted-foreground">Schedule browser notifications so you never miss a study session.</p>
                <div className="flex items-center gap-1 mt-4 text-sm text-emerald-500 font-medium">
                  Set Up <ChevronRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here's your study overview.</p>
        </div>
        <Link href="/playlists">
          <Button>
            <Plus className="w-4 h-4 mr-2" />Add Content
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Videos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completed}</div>
            <p className="text-xs text-muted-foreground mt-1">of {videos.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending}</div>
            <p className="text-xs text-muted-foreground mt-1">videos remaining</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streak} {streak === 1 ? 'day' : 'days'}</div>
            <p className="text-xs text-muted-foreground mt-1">keep it going!</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Playlists</CardTitle>
            <ListVideo className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{playlists.length}</div>
            <p className="text-xs text-muted-foreground mt-1">in your collection</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Videos</CardTitle>
            <CardDescription>Pick up where you left off</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            {recentVideos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                No recent videos.
              </div>
            ) : recentVideos.map(video => (
              <Link key={video.id} href={`/player/${video.id}?from=dashboard`}>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer group">
                  <div className="w-20 aspect-video bg-muted rounded overflow-hidden flex-shrink-0 relative">
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <PlayCircle className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-1">{video.title}</h4>
                    {video.progress > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={video.progress} className="h-1 flex-1" />
                        <span className="text-xs text-muted-foreground">{video.progress}%</span>
                      </div>
                    )}
                  </div>
                  <Badge variant={video.status === 'completed' ? 'default' : 'secondary'} className="flex-shrink-0 text-xs">
                    {video.status === 'completed' ? 'Done' : video.status === 'revise' ? 'Revise' : video.status === 'important' ? '★' : 'Pending'}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Tasks</CardTitle>
            <CardDescription>{todayTasks.length > 0 ? `${todayCompleted} of ${todayTasks.length} completed` : 'Your plan for the day'}</CardDescription>
          </CardHeader>
          <CardContent>
            {todayTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                No tasks for today.{' '}
                <Link href="/planner">
                  <span className="text-primary hover:underline cursor-pointer">Go to Planner</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.map(task => (
                  <div key={task.id} className={`flex items-center gap-3 p-2 rounded-lg ${task.completed ? 'opacity-50' : ''}`}>
                    <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${task.completed ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                    <span className={`text-sm flex-1 ${task.completed ? 'line-through' : ''}`}>{task.text}</span>
                  </div>
                ))}
                {todayTasks.length > 0 && (
                  <div className="mt-3">
                    <Progress value={todayTasks.length > 0 ? (todayCompleted / todayTasks.length) * 100 : 0} className="h-1.5" />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
