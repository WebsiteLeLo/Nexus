import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Note, Video, INITIAL_NOTES, INITIAL_VIDEOS } from "@/lib/types";
import { formatTimestamp, formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Clock, PlayCircle, Trash2, Download } from "lucide-react";
import { Link } from "wouter";

export default function Notes() {
  const [notes, setNotes] = useLocalStorage<Note[]>('nexus-notes', INITIAL_NOTES);
  const [videos] = useLocalStorage<Video[]>('nexus-videos', INITIAL_VIDEOS);
  const [search, setSearch] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<string>('all');

  const videoMap = useMemo(() => {
    const m: Record<string, Video> = {};
    videos.forEach(v => { m[v.id] = v; });
    return m;
  }, [videos]);

  const filtered = useMemo(() => {
    return notes.filter(note => {
      const matchSearch = !search || note.content.toLowerCase().includes(search.toLowerCase());
      const matchVideo = selectedVideo === 'all' || note.videoId === selectedVideo;
      return matchSearch && matchVideo;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notes, search, selectedVideo]);

  const videosWithNotes = useMemo(() => {
    const ids = [...new Set(notes.map(n => n.videoId))];
    return ids.map(id => videoMap[id]).filter(Boolean);
  }, [notes, videoMap]);

  function deleteNote(id: string) {
    setNotes(ns => ns.filter(n => n.id !== id));
  }

  function exportNotes() {
    const text = filtered.map(note => {
      const video = videoMap[note.videoId];
      return `## ${video?.title || 'Unknown Video'} [${formatTimestamp(note.timestamp)}]\n${note.content}\n`;
    }).join('\n---\n\n');
    const blob = new Blob([text], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'study-notes.md';
    a.click();
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notes Hub</h1>
          <p className="text-sm text-muted-foreground">{notes.length} notes across {videosWithNotes.length} videos</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportNotes} className="flex-shrink-0">
          <Download className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Export</span>
        </Button>
      </div>

      {/* Mobile: horizontal scrollable video filter */}
      <div className="md:hidden flex items-center gap-2 px-3 py-2 overflow-x-auto border-b flex-shrink-0 scrollbar-none">
        <button
          className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full font-medium flex-shrink-0 transition-colors ${selectedVideo === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
          onClick={() => setSelectedVideo('all')}
        >
          All ({notes.length})
        </button>
        {videosWithNotes.map(video => (
          <button key={video.id}
            className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full font-medium flex-shrink-0 transition-colors max-w-[140px] truncate ${selectedVideo === video.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
            onClick={() => setSelectedVideo(video.id)}
          >
            {video.title}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar — desktop only */}
        <div className="hidden md:flex md:flex-col w-56 border-r flex-shrink-0 overflow-y-auto p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Filter by Video</p>
          <button
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${selectedVideo === 'all' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'}`}
            onClick={() => setSelectedVideo('all')}
          >
            All Notes <Badge variant="secondary" className="ml-1 text-xs">{notes.length}</Badge>
          </button>
          {videosWithNotes.map(video => (
            <button
              key={video.id}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 ${selectedVideo === video.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'}`}
              onClick={() => setSelectedVideo(video.id)}
            >
              <span className="line-clamp-1 flex-1">{video.title}</span>
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {notes.filter(n => n.videoId === video.id).length}
              </Badge>
            </button>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search notes..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No notes found</p>
              </div>
            )}
            {filtered.map(note => {
              const video = videoMap[note.videoId];
              return (
                <Card key={note.id} className="group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {video && (
                          <Link href={`/player/${video.id}?t=${note.timestamp}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <img src={video.thumbnail} alt={video.title} className="w-12 h-7 object-cover rounded flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium line-clamp-1">{video.title}</p>
                                <div className="flex items-center gap-1 text-xs text-primary">
                                  <Clock className="w-3 h-3" />
                                  <span className="font-mono">{formatTimestamp(note.timestamp)}</span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/player/${note.videoId}?t=${note.timestamp}`}>
                          <Button size="sm" variant="ghost" className="h-7 px-2">
                            <PlayCircle className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => deleteNote(note.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed border-l-2 border-primary/30 pl-3">
                      {note.content}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{formatDate(note.createdAt)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
