import { useLocalStorage } from "@/hooks/use-local-storage";
import { INITIAL_VIDEOS, INITIAL_SUBJECTS, Video, Subject } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, CheckCircle2, Clock, Flame } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const [videos] = useLocalStorage<Video[]>('nexus-videos', INITIAL_VIDEOS);
  const [subjects] = useLocalStorage<Subject[]>('nexus-subjects', INITIAL_SUBJECTS);

  const completed = videos.filter(v => v.status === 'completed').length;
  const pending = videos.filter(v => v.status === 'pending').length;
  
  return (
    <div className="p-8 max-w-6xl mx-auto w-full overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here's your study overview.</p>
        </div>
        <Button>Add New Content</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Videos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Videos</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4 days</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
            <PlayCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subjects.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Videos</CardTitle>
            <CardDescription>Pick up where you left off</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {videos.slice(0, 5).map(video => (
              <Link key={video.id} href={`/player/${video.id}`}>
                <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer group">
                  <div className="w-32 aspect-video bg-muted rounded overflow-hidden flex-shrink-0 relative">
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <PlayCircle className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium line-clamp-2">{video.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{video.description}</p>
                  </div>
                </div>
              </Link>
            ))}
            {videos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No videos added yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Today's Tasks</CardTitle>
            <CardDescription>Your plan for the day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
              No tasks for today. <Link href="/planner"><span className="text-primary hover:underline cursor-pointer">Go to Planner</span></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
