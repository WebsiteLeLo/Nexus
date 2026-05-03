import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Video, INITIAL_VIDEOS } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Shuffle, RotateCcw, Check, Clock, Star } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export default function Revision() {
  const [videos, setVideos] = useLocalStorage<Video[]>('nexus-videos', INITIAL_VIDEOS);
  const [shuffle, setShuffle] = useState(false);
  const [filter, setFilter] = useState<'all' | 'revise' | 'important'>('all');
  const [sessionCompleted, setSessionCompleted] = useState<Set<string>>(new Set());

  const revisionVideos = useMemo(() => {
    let vs = videos.filter(v => v.status === 'revise' || v.status === 'important');
    if (filter === 'revise') vs = vs.filter(v => v.status === 'revise');
    if (filter === 'important') vs = vs.filter(v => v.status === 'important');
    if (shuffle) vs = [...vs].sort(() => Math.random() - 0.5);
    return vs;
  }, [videos, filter, shuffle]);

  function markDone(id: string) {
    setSessionCompleted(s => { const n = new Set(s); n.add(id); return n; });
    setVideos(vs => vs.map(v => v.id === id ? { ...v, status: 'completed' } : v));
  }

  function resetSession() {
    setSessionCompleted(new Set());
  }

  const sessionProgress = revisionVideos.length > 0
    ? Math.round((sessionCompleted.size / (revisionVideos.length + sessionCompleted.size)) * 100)
    : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revision Mode</h1>
          <p className="text-sm text-muted-foreground">Focus on videos marked for revision or as important</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={shuffle ? 'default' : 'outline'} size="sm" onClick={() => setShuffle(s => !s)}>
            <Shuffle className="w-4 h-4 mr-2" />Shuffle
          </Button>
          <Button variant="outline" size="sm" onClick={resetSession}>
            <RotateCcw className="w-4 h-4 mr-2" />Reset
          </Button>
        </div>
      </div>

      <div className="px-6 py-3 border-b flex-shrink-0 flex items-center gap-4">
        <div className="flex gap-2">
          {(['all', 'revise', 'important'] as const).map(f => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="capitalize">
              {f === 'all' ? 'All' : f === 'revise' ? 'Revise Later' : 'Important'}
            </Button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{sessionCompleted.size} done · {revisionVideos.length} remaining</span>
          <div className="w-32">
            <Progress value={sessionProgress} className="h-2" />
          </div>
          <span className="font-medium text-foreground">{sessionProgress}%</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {revisionVideos.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Star className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No videos in revision queue</p>
            <p className="text-sm mt-1">Mark videos as "Revise Later" or "Important" in the player</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {revisionVideos.map(video => {
            const done = sessionCompleted.has(video.id);
            return (
              <Card key={video.id} className={cn("overflow-hidden transition-opacity", done && "opacity-40")}>
                <div className="relative">
                  <img src={video.thumbnail} alt={video.title} className="w-full aspect-video object-cover" />
                  {video.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                      <div className="h-full bg-primary" style={{ width: `${video.progress}%` }} />
                    </div>
                  )}
                  <Badge
                    className={cn("absolute top-2 right-2 text-xs font-medium",
                      video.status === 'revise' ? 'bg-amber-500/90 text-white' : 'bg-violet-500/90 text-white'
                    )}
                  >
                    {video.status === 'revise' ? 'Revise Later' : 'Important'}
                  </Badge>
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium text-sm line-clamp-2 mb-3">{video.title}</h3>
                  <div className="flex gap-2">
                    <Link href={`/player/${video.id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full">
                        <Clock className="w-3.5 h-3.5 mr-1.5" />
                        {video.lastTimestamp > 0 ? 'Resume' : 'Watch'}
                      </Button>
                    </Link>
                    {!done && (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => markDone(video.id)}>
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {sessionCompleted.size > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Completed this session</h3>
            <div className="space-y-2">
              {[...sessionCompleted].map(id => {
                const video = videos.find(v => v.id === id);
                if (!video) return null;
                return (
                  <div key={id} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground line-through">{video.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
