import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Playlist, Video, INITIAL_VIDEOS } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ListVideo, PlayCircle, X, GripVertical } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const INITIAL_PLAYLISTS: Playlist[] = [
  { id: 'pl1', name: 'Physics Fundamentals', videoIds: ['v1', 'v2'], createdAt: new Date().toISOString() }
];

export default function Playlists() {
  const [playlists, setPlaylists] = useLocalStorage<Playlist[]>('nexus-playlists', INITIAL_PLAYLISTS);
  const [videos] = useLocalStorage<Video[]>('nexus-videos', INITIAL_VIDEOS);
  const [selected, setSelected] = useState<string | null>(playlists[0]?.id || null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [videoSearch, setVideoSearch] = useState('');

  const videoMap = useMemo(() => {
    const m: Record<string, Video> = {};
    videos.forEach(v => { m[v.id] = v; });
    return m;
  }, [videos]);

  const currentPlaylist = playlists.find(p => p.id === selected);
  const playlistVideos = currentPlaylist?.videoIds.map(id => videoMap[id]).filter(Boolean) || [];
  const completed = playlistVideos.filter(v => v?.status === 'completed').length;
  const progress = playlistVideos.length > 0 ? Math.round((completed / playlistVideos.length) * 100) : 0;

  const filteredVideos = videos.filter(v =>
    (!videoSearch || v.title.toLowerCase().includes(videoSearch.toLowerCase())) &&
    !(currentPlaylist?.videoIds.includes(v.id))
  );

  function createPlaylist() {
    if (!newName.trim()) return;
    const pl: Playlist = { id: generateId(), name: newName.trim(), videoIds: [], createdAt: new Date().toISOString() };
    setPlaylists(ps => [...ps, pl]);
    setSelected(pl.id);
    setNewName('');
    setShowCreate(false);
  }

  function deletePlaylist(id: string) {
    setPlaylists(ps => ps.filter(p => p.id !== id));
    if (selected === id) setSelected(playlists.find(p => p.id !== id)?.id || null);
  }

  function addVideo(videoId: string) {
    setPlaylists(ps => ps.map(p => p.id === selected ? { ...p, videoIds: [...p.videoIds, videoId] } : p));
  }

  function removeVideo(videoId: string) {
    setPlaylists(ps => ps.map(p => p.id === selected ? { ...p, videoIds: p.videoIds.filter(id => id !== videoId) } : p));
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Playlists</h1>
          <p className="text-sm text-muted-foreground">Organize videos into custom playlists</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />New Playlist
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-60 border-r flex-shrink-0 overflow-y-auto p-3 space-y-1">
          {playlists.map(pl => {
            const plVideos = pl.videoIds.map(id => videoMap[id]).filter(Boolean);
            const plCompleted = plVideos.filter(v => v?.status === 'completed').length;
            return (
              <div
                key={pl.id}
                className={cn(
                  "flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group",
                  selected === pl.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                )}
                onClick={() => setSelected(pl.id)}
              >
                <ListVideo className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{pl.name}</p>
                  <p className="text-xs text-muted-foreground">{plVideos.length} videos · {plVideos.length > 0 ? Math.round((plCompleted / plVideos.length) * 100) : 0}%</p>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive"
                  onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
          {playlists.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-4">No playlists yet</p>
          )}
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!currentPlaylist ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <ListVideo className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Select a playlist or create one</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{currentPlaylist.name}</h2>
                    <p className="text-sm text-muted-foreground">{playlistVideos.length} videos · {completed} completed</p>
                  </div>
                  <Button size="sm" onClick={() => { setVideoSearch(''); setShowAddVideo(true); }}>
                    <Plus className="w-4 h-4 mr-1.5" />Add Video
                  </Button>
                </div>
                {playlistVideos.length > 0 && (
                  <div className="flex items-center gap-3 mt-3">
                    <Progress value={progress} className="flex-1 h-2" />
                    <span className="text-sm font-medium">{progress}%</span>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {playlistVideos.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <p className="text-sm">No videos in this playlist</p>
                    <p className="text-xs mt-1">Click "Add Video" to add videos</p>
                  </div>
                )}
                <div className="space-y-2">
                  {playlistVideos.map((video, i) => video && (
                    <div key={video.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/30 transition-colors group">
                      <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                      <span className="text-xs text-muted-foreground w-6 text-right">{i + 1}</span>
                      <img src={video.thumbnail} alt={video.title} className="w-20 h-11 object-cover rounded flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{video.title}</p>
                        {video.progress > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={video.progress} className="h-1 w-20" />
                            <span className="text-xs text-muted-foreground">{video.progress}%</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <Link href={`/player/${video.id}`}>
                          <Button size="sm" variant="outline" className="h-7 px-2">
                            <PlayCircle className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => removeVideo(video.id)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Playlist</DialogTitle></DialogHeader>
          <Input placeholder="Playlist name" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createPlaylist()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createPlaylist}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddVideo} onOpenChange={setShowAddVideo}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Video to Playlist</DialogTitle></DialogHeader>
          <Input placeholder="Search videos..." value={videoSearch} onChange={e => setVideoSearch(e.target.value)} />
          <div className="max-h-64 overflow-y-auto space-y-2 mt-2">
            {filteredVideos.map(video => (
              <div key={video.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => { addVideo(video.id); }}>
                <img src={video.thumbnail} alt={video.title} className="w-14 h-8 object-cover rounded flex-shrink-0" />
                <span className="text-sm line-clamp-1">{video.title}</span>
              </div>
            ))}
            {filteredVideos.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No videos to add</p>}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowAddVideo(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
