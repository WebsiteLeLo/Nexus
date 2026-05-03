import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Playlist, Video } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, ListVideo, PlayCircle, X, GripVertical, Download, AlertCircle, Loader2, Youtube, Pencil } from "lucide-react";
import { Link, useSearch } from "wouter";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/hooks/use-confirm";

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

function extractPlaylistId(input: string): string | null {
  const patterns = [
    /[?&]list=([A-Za-z0-9_-]+)/,
    /^([A-Za-z0-9_-]{18,})[&?]?$/,
  ];
  for (const p of patterns) {
    const m = input.trim().match(p);
    if (m) return m[1];
  }
  return null;
}

async function fetchAllPlaylistItems(playlistId: string, apiKey: string): Promise<{
  playlistTitle: string;
  items: { videoId: string; title: string; description: string; thumbnail: string }[];
}> {
  const plRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`
  );
  if (!plRes.ok) throw new Error(`YouTube API error: ${plRes.status}`);
  const plData = await plRes.json();
  if (!plData.items?.length) throw new Error('Playlist not found or is private.');
  const playlistTitle: string = plData.items[0].snippet.title;

  const items: { videoId: string; title: string; description: string; thumbnail: string }[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('playlistId', playlistId);
    url.searchParams.set('key', apiKey);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
    const data = await res.json();

    for (const item of data.items || []) {
      const sn = item.snippet;
      const vid = sn?.resourceId?.videoId;
      if (!vid || sn?.title === 'Deleted video' || sn?.title === 'Private video') continue;
      items.push({
        videoId: vid,
        title: sn.title || 'Untitled',
        description: sn.description?.slice(0, 200) || '',
        thumbnail: sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url || `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return { playlistTitle, items };
}

export default function Playlists() {
  const [playlists, setPlaylists] = useLocalStorage<Playlist[]>('nexus-playlists', []);
  const [videos, setVideos] = useLocalStorage<Video[]>('nexus-videos', []);
  const urlSearch = useSearch();
  const urlPlaylistId = new URLSearchParams(urlSearch).get('playlist');
  const [selected, setSelected] = useState<string | null>(
    urlPlaylistId ?? playlists[0]?.id ?? null
  );

  const { confirm, dialog: confirmDialog } = useConfirm();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importPreview, setImportPreview] = useState<{ playlistTitle: string; count: number; id: string } | null>(null);

  const [showAddVideo, setShowAddVideo] = useState(false);
  const [videoSearch, setVideoSearch] = useState('');

  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function handleDragStart(i: number) {
    setDragIndex(i);
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    setOverIndex(i);
  }

  function handleDrop(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i || !currentPlaylist) return;
    const ids = [...currentPlaylist.videoIds];
    const [moved] = ids.splice(dragIndex, 1);
    ids.splice(i, 0, moved);
    setPlaylists(ps => ps.map(p => p.id === currentPlaylist.id ? { ...p, videoIds: ids } : p));
    setDragIndex(null);
    setOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setOverIndex(null);
  }

  function openRename() {
    if (!currentPlaylist) return;
    setRenameValue(currentPlaylist.name);
    setShowRename(true);
  }

  function confirmRename() {
    if (!renameValue.trim() || !currentPlaylist) return;
    setPlaylists(ps => ps.map(p => p.id === currentPlaylist.id ? { ...p, name: renameValue.trim() } : p));
    setShowRename(false);
  }

  const videoMap = useMemo(() => {
    const m: Record<string, Video> = {};
    videos.forEach(v => { m[v.id] = v; });
    return m;
  }, [videos]);

  const currentPlaylist = playlists.find(p => p.id === selected);
  const playlistVideos = currentPlaylist?.videoIds.map(id => videoMap[id]).filter(Boolean) as Video[] || [];
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

  async function deletePlaylist(id: string) {
    if (!(await confirm("Delete this playlist? The videos in your library won't be affected."))) return;
    setPlaylists(ps => ps.filter(p => p.id !== id));
    if (selected === id) setSelected(playlists.find(p => p.id !== id)?.id || null);
  }

  function addVideo(videoId: string) {
    setPlaylists(ps => ps.map(p => p.id === selected ? { ...p, videoIds: [...p.videoIds, videoId] } : p));
  }

  async function removeVideo(videoId: string) {
    if (!(await confirm("Remove this video from the playlist?"))) return;
    setPlaylists(ps => ps.map(p => p.id === selected ? { ...p, videoIds: p.videoIds.filter(id => id !== videoId) } : p));
  }

  async function handleFetchPreview() {
    if (!importUrl.trim()) return;
    if (!API_KEY) { setImportError('No Google API key configured. Please add VITE_GOOGLE_API_KEY in secrets.'); return; }
    const plId = extractPlaylistId(importUrl);
    if (!plId) { setImportError('Could not find a playlist ID in that URL.'); return; }
    setImporting(true);
    setImportError('');
    setImportPreview(null);
    try {
      const plRes = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${plId}&key=${API_KEY}`);
      const plData = await plRes.json();
      if (!plData.items?.length) throw new Error('Playlist not found or is private/unavailable.');
      setImportPreview({
        playlistTitle: plData.items[0].snippet.title,
        count: plData.items[0].contentDetails?.itemCount ?? '?',
        id: plId,
      });
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : 'Failed to fetch playlist info.');
    } finally {
      setImporting(false);
    }
  }

  async function handleImport() {
    if (!importPreview || !API_KEY) return;
    setImporting(true);
    setImportError('');
    try {
      const { playlistTitle, items } = await fetchAllPlaylistItems(importPreview.id, API_KEY);
      const now = new Date().toISOString();
      const newVideos: Video[] = items.map((item, i) => ({
        id: generateId(),
        url: `https://www.youtube.com/watch?v=${item.videoId}`,
        youtubeId: item.videoId,
        title: item.title,
        thumbnail: item.thumbnail,
        description: item.description,
        status: 'pending' as const,
        progress: 0,
        lastTimestamp: 0,
        duration: 0,
        order: i + 1,
        addedAt: now,
      }));
      const playlist: Playlist = {
        id: generateId(),
        name: playlistTitle,
        youtubePlaylistId: importPreview.id,
        youtubePlaylistUrl: importUrl.trim(),
        videoIds: newVideos.map(v => v.id),
        createdAt: now,
      };
      setVideos(vs => [...vs, ...newVideos]);
      setPlaylists(ps => [...ps, playlist]);
      setSelected(playlist.id);
      setShowImport(false);
      setImportUrl('');
      setImportPreview(null);
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  }

  function openImport() {
    setImportUrl('');
    setImportError('');
    setImportPreview(null);
    setShowImport(true);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Playlists</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">Organize videos or import entire YouTube playlists</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openImport}>
            <Youtube className="w-4 h-4 sm:mr-2 text-red-500" /><span className="hidden sm:inline">Import YouTube</span>
          </Button>
          <Button size="sm" onClick={() => { setNewName(''); setShowCreate(true); }}>
            <Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">New Playlist</span>
          </Button>
        </div>
      </div>

      {/* Mobile: horizontal playlist selector */}
      <div className="md:hidden flex items-center gap-2 px-3 py-2 overflow-x-auto border-b flex-shrink-0 scrollbar-none">
        {playlists.length === 0 ? (
          <span className="text-xs text-muted-foreground px-1">No playlists yet</span>
        ) : playlists.map(pl => (
          <button key={pl.id}
            className={`flex items-center gap-1.5 whitespace-nowrap text-xs px-3 py-1.5 rounded-full font-medium flex-shrink-0 transition-colors max-w-[140px] truncate ${selected === pl.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
            onClick={() => setSelected(pl.id)}
          >
            <ListVideo className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{pl.name}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar — desktop only */}
        <div className="hidden md:flex md:flex-col w-60 border-r flex-shrink-0 overflow-y-auto p-3 space-y-1">
          {playlists.length === 0 && (
            <div className="px-3 py-6 text-center">
              <ListVideo className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No playlists yet.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Import a YouTube playlist or create one manually.</p>
            </div>
          )}
          {playlists.map(pl => {
            const plVideos = pl.videoIds.map(id => videoMap[id]).filter(Boolean) as Video[];
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
                  <p className="text-xs text-muted-foreground">
                    {plVideos.length} videos · {plVideos.length > 0 ? Math.round((plCompleted / plVideos.length) * 100) : 0}%
                  </p>
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
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!currentPlaylist ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-xs">
                <ListVideo className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
                <p className="font-medium text-muted-foreground">No playlist selected</p>
                <p className="text-sm text-muted-foreground mt-1">Import a YouTube playlist or create a new one to get started.</p>
                <Button className="mt-4" onClick={openImport}>
                  <Youtube className="w-4 h-4 mr-2 text-red-500" />Import YouTube Playlist
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className="text-lg font-semibold truncate min-w-0">{currentPlaylist.name}</h2>
                      <button
                        className="flex-shrink-0 p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={openRename}
                        title="Rename playlist"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {currentPlaylist.youtubePlaylistId && (
                        <a href={currentPlaylist.youtubePlaylistUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                          <Badge variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-red-500/10">
                            <Youtube className="w-3 h-3 text-red-500" />YouTube
                          </Badge>
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{playlistVideos.length} videos · {completed} completed</p>
                  </div>
                  <Button size="sm" className="flex-shrink-0" onClick={() => { setVideoSearch(''); setShowAddVideo(true); }}>
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
                {playlistVideos.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <p className="text-sm">No videos in this playlist</p>
                    <p className="text-xs mt-1">Click "Add Video" to add videos from your library</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {playlistVideos.map((video, i) => video && (
                      <div
                        key={video.id}
                        draggable
                        onDragStart={() => handleDragStart(i)}
                        onDragOver={e => handleDragOver(e, i)}
                        onDrop={e => handleDrop(e, i)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg border transition-colors group select-none",
                          dragIndex === i ? "opacity-40" : "hover:bg-muted/30",
                          overIndex === i && dragIndex !== i ? "border-primary bg-primary/5" : ""
                        )}
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                        <span className="text-xs text-muted-foreground w-6 text-right flex-shrink-0">{i + 1}</span>
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
                        <Badge variant={video.status === 'completed' ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                          {video.status === 'completed' ? 'Done' : video.status === 'revise' ? 'Revise' : video.status === 'important' ? '★' : 'Pending'}
                        </Badge>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          <Link href={`/player/${video.id}?from=playlists&playlistId=${selected}`}>
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
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create playlist dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Playlist</DialogTitle></DialogHeader>
          <Input placeholder="Playlist name" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createPlaylist()} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createPlaylist}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* YouTube import dialog */}
      <Dialog open={showImport} onOpenChange={v => { if (!importing) { setShowImport(v); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-500" />Import YouTube Playlist
            </DialogTitle>
            <DialogDescription>
              Paste a YouTube playlist URL to import all videos at once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="https://www.youtube.com/playlist?list=..."
                value={importUrl}
                onChange={e => { setImportUrl(e.target.value); setImportError(''); setImportPreview(null); }}
                disabled={importing}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleFetchPreview} disabled={importing || !importUrl.trim()}>
                {importing && !importPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
              </Button>
            </div>

            {importError && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {importError}
              </div>
            )}

            {importPreview && (
              <div className="bg-muted/50 rounded-lg px-4 py-3 space-y-1">
                <p className="font-medium text-sm line-clamp-1">{importPreview.playlistTitle}</p>
                <p className="text-xs text-muted-foreground">{importPreview.count} videos will be imported into your library</p>
              </div>
            )}

            {!API_KEY && (
              <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                No Google API key found. Add <code className="font-mono text-xs">VITE_GOOGLE_API_KEY</code> to your secrets to enable import.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)} disabled={importing}>Cancel</Button>
            <Button onClick={handleImport} disabled={!importPreview || importing}>
              {importing && importPreview ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" />Import Playlist</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename playlist dialog */}
      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename Playlist</DialogTitle></DialogHeader>
          <Input
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && confirmRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRename(false)}>Cancel</Button>
            <Button onClick={confirmRename} disabled={!renameValue.trim()}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {confirmDialog}

      {/* Add video dialog */}
      <Dialog open={showAddVideo} onOpenChange={setShowAddVideo}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Video to Playlist</DialogTitle></DialogHeader>
          <Input placeholder="Search videos..." value={videoSearch} onChange={e => setVideoSearch(e.target.value)} autoFocus />
          <div className="max-h-64 overflow-y-auto space-y-1 mt-1">
            {filteredVideos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {videos.length === 0 ? 'No videos in your library yet.' : 'No more videos to add.'}
              </p>
            ) : filteredVideos.map(video => (
              <div key={video.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => addVideo(video.id)}>
                <img src={video.thumbnail} alt={video.title} className="w-14 h-8 object-cover rounded flex-shrink-0" />
                <span className="text-sm line-clamp-1 flex-1">{video.title}</span>
                <Plus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowAddVideo(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
