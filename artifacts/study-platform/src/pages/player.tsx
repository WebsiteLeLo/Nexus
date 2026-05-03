import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Video, Note, INITIAL_VIDEOS, INITIAL_NOTES } from "@/lib/types";
import { generateId, formatTimestamp } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  SkipBack, SkipForward, Plus, Trash2, Clock, CheckCircle2,
  RotateCcw, Star, Circle, ChevronLeft, ChevronRight, Play, List
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

declare global {
  interface Window {
    YT: {
      Player: new (id: string, config: {
        playerVars?: Record<string, unknown>;
        events?: {
          onReady?: (e: { target: YTPlayer }) => void;
          onStateChange?: (e: { data: number }) => void;
        };
      }) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setPlaybackRate(rate: number): void;
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
}

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', icon: Circle, color: 'text-muted-foreground' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-emerald-500' },
  { value: 'revise', label: 'Revise Later', icon: RotateCcw, color: 'text-amber-500' },
  { value: 'important', label: 'Important', icon: Star, color: 'text-violet-500' },
];

export default function Player() {
  const params = useParams<{ videoId: string }>();
  const [, setLocation] = useLocation();
  const [videos, setVideos] = useLocalStorage<Video[]>('nexus-videos', INITIAL_VIDEOS);
  const [notes, setNotes] = useLocalStorage<Note[]>('nexus-notes', INITIAL_NOTES);

  const video = videos.find(v => v.id === params.videoId);
  const playerRef = useRef<YTPlayer | null>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const [apiReady, setApiReady] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showNotes, setShowNotes] = useState(true);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const videoNotes = notes.filter(n => n.videoId === params.videoId)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT) { setApiReady(true); return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => setApiReady(true);
    return () => { window.onYouTubeIframeAPIReady = () => {}; };
  }, []);

  // Init player
  useEffect(() => {
    if (!apiReady || !video || !playerDivRef.current) return;
    if (playerRef.current) { playerRef.current.destroy(); }

    playerRef.current = new window.YT.Player('yt-player', {
      playerVars: {
        autoplay: 1,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        start: video.lastTimestamp || 0,
        enablejsapi: 1
      },
      events: {
        onReady: (e) => {
          e.target.setPlaybackRate(speed);
          progressInterval.current = setInterval(() => {
            if (playerRef.current) {
              const t = playerRef.current.getCurrentTime();
              const dur = playerRef.current.getDuration();
              setCurrentTime(t);
              if (dur > 0) {
                const prog = Math.round((t / dur) * 100);
                setVideos(vs => vs.map(v =>
                  v.id === params.videoId ? { ...v, lastTimestamp: t, progress: prog } : v
                ));
              }
            }
          }, 2000);
        },
        onStateChange: (e) => {
          if (e.data === window.YT.PlayerState.ENDED) {
            setVideos(vs => vs.map(v => v.id === params.videoId ? { ...v, status: 'completed', progress: 100 } : v));
          }
        }
      }
    });

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; }
    };
  }, [apiReady, video?.youtubeId]);

  useEffect(() => {
    if (playerRef.current) playerRef.current.setPlaybackRate(speed);
  }, [speed]);

  function seekTo(seconds: number) {
    if (playerRef.current) playerRef.current.seekTo(seconds, true);
  }

  function skip(delta: number) {
    if (playerRef.current) {
      const t = playerRef.current.getCurrentTime();
      seekTo(t + delta);
    }
  }

  function addNote() {
    if (!noteText.trim() || !video) return;
    const ts = playerRef.current ? playerRef.current.getCurrentTime() : 0;
    setNotes(ns => [...ns, {
      id: generateId(),
      videoId: video.id,
      timestamp: Math.floor(ts),
      content: noteText.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]);
    setNoteText('');
  }

  function deleteNote(id: string) {
    setNotes(ns => ns.filter(n => n.id !== id));
  }

  function setStatus(status: Video['status']) {
    setVideos(vs => vs.map(v => v.id === params.videoId ? { ...v, status } : v));
  }

  if (!video) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Video not found</p>
        <Link href="/library"><Button variant="outline">Go to Library</Button></Link>
      </div>
    );
  }

  const currentStatus = STATUS_OPTIONS.find(s => s.value === video.status) || STATUS_OPTIONS[0];
  const StatusIcon = currentStatus.icon;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Player + controls */}
      <div className={cn("flex flex-col overflow-hidden", showNotes ? "flex-1" : "w-full")}>
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0">
          <Link href="/library">
            <Button size="sm" variant="ghost" className="h-7 px-2">
              <ChevronLeft className="w-4 h-4" />Back
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold line-clamp-1">{video.title}</h1>
          </div>
          <Select value={video.status} onValueChange={v => setStatus(v as Video['status'])}>
            <SelectTrigger className="h-7 w-36 text-xs border-0 bg-muted/50">
              <div className="flex items-center gap-1.5">
                <StatusIcon className={cn("w-3.5 h-3.5", currentStatus.color)} />
                <span>{currentStatus.label}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <Icon className={cn("w-3.5 h-3.5", opt.color)} />
                      {opt.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setShowNotes(s => !s)}>
            <List className="w-4 h-4" />
          </Button>
        </div>

        {/* YouTube player */}
        <div className="relative bg-black flex-shrink-0" style={{ paddingBottom: '56.25%' }}>
          <div ref={playerDivRef} id="yt-player" className="absolute inset-0 w-full h-full" />
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/20 flex-shrink-0 flex-wrap">
          <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => skip(-10)}>
            <SkipBack className="w-3.5 h-3.5 mr-1" />10s
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => skip(10)}>
            10s<SkipForward className="w-3.5 h-3.5 ml-1" />
          </Button>

          <div className="flex items-center gap-1 flex-wrap">
            {SPEED_OPTIONS.map(s => (
              <button
                key={s}
                className={cn(
                  "text-xs px-2 py-1 rounded transition-colors",
                  speed === s ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/70 text-muted-foreground'
                )}
                onClick={() => setSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>

          <div className="ml-auto text-xs text-muted-foreground font-mono">
            {formatTimestamp(currentTime)}
          </div>
        </div>

        {/* Progress */}
        {video.progress > 0 && (
          <div className="px-4 py-1.5 border-b flex-shrink-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Progress value={video.progress} className="flex-1 h-1" />
              <span>{video.progress}%</span>
            </div>
          </div>
        )}

        {/* Description */}
        {video.description && (
          <div className="px-4 py-3 flex-shrink-0">
            <p className="text-sm text-muted-foreground">{video.description}</p>
          </div>
        )}
      </div>

      {/* Notes panel */}
      {showNotes && (
        <div className="w-80 border-l flex flex-col overflow-hidden flex-shrink-0">
          <div className="px-4 py-3 border-b flex-shrink-0">
            <h3 className="font-semibold text-sm">Notes</h3>
            <p className="text-xs text-muted-foreground">{videoNotes.length} notes for this video</p>
          </div>

          {/* Add note */}
          <div className="p-3 border-b flex-shrink-0">
            <Textarea
              placeholder="Take a note at current timestamp..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={3}
              className="text-sm resize-none mb-2"
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addNote(); } }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-primary font-mono">
                <Clock className="w-3 h-3 inline mr-1" />
                {formatTimestamp(currentTime)}
              </span>
              <Button size="sm" className="h-7 px-3 text-xs" onClick={addNote}>
                <Plus className="w-3.5 h-3.5 mr-1" />Add Note
              </Button>
            </div>
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {videoNotes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">No notes yet</p>
                <p className="text-xs">Start watching and take notes!</p>
              </div>
            )}
            {videoNotes.map(note => (
              <div key={note.id} className="p-3 rounded-lg bg-card border group">
                <div className="flex items-center justify-between mb-1.5">
                  <button
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-mono font-medium"
                    onClick={() => seekTo(note.timestamp)}
                  >
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(note.timestamp)}
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                    onClick={() => deleteNote(note.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
