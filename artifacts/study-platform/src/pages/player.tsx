import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Video, Note } from "@/lib/types";
import { generateId, formatTimestamp } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  SkipBack, SkipForward, Plus, Trash2, Clock, CheckCircle2,
  RotateCcw, Star, Circle, ChevronLeft, List, ExternalLink,
  AlertCircle, Play, Pause, Volume2, VolumeX, Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

/* ── YouTube IFrame API types ─────────────────────────────────────────── */
declare global {
  interface Window {
    YT: {
      Player: new (el: HTMLIFrameElement, config: {
        events?: {
          onReady?: (e: { target: YTPlayer }) => void;
          onStateChange?: (e: { data: number }) => void;
          onError?: (e: { data: number }) => void;
        };
      }) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}
interface YTPlayer {
  seekTo(s: number, allow: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setPlaybackRate(r: number): void;
  getPlaybackRate(): number;
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setVolume(v: number): void;
  getVolume(): number;
  getPlayerState(): number;
  destroy(): void;
}

/* ── constants ─────────────────────────────────────────────────────────── */
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const STATUS_OPTIONS = [
  { value: 'pending',   label: 'Pending',      icon: Circle,       color: 'text-muted-foreground' },
  { value: 'completed', label: 'Completed',    icon: CheckCircle2, color: 'text-emerald-500' },
  { value: 'revise',    label: 'Revise Later', icon: RotateCcw,    color: 'text-amber-500' },
  { value: 'important', label: 'Important',    icon: Star,         color: 'text-violet-500' },
];

/* ── custom seekbar ────────────────────────────────────────────────────── */
function SeekBar({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative group flex-1 flex items-center h-5 cursor-pointer"
      onClick={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        onChange(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
      }}
    >
      <div className="h-1 w-full rounded-full bg-white/20 overflow-hidden group-hover:h-1.5 transition-all">
        <div className="h-full bg-primary rounded-full" style={{ width: `${value * 100}%` }} />
      </div>
      <div
        className="absolute w-3 h-3 bg-primary rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2"
        style={{ left: `${value * 100}%` }}
      />
    </div>
  );
}

/* ── volume bar ─────────────────────────────────────────────────────────── */
function VolumeBar({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative flex items-center h-5 w-16 cursor-pointer"
      onClick={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        onChange(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
      }}
    >
      <div className="h-1 w-full rounded-full bg-white/20 overflow-hidden">
        <div className="h-full bg-white/80 rounded-full" style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════════════ */
export default function Player() {
  const { videoId } = useParams<{ videoId: string }>();
  const [videos, setVideos] = useLocalStorage<Video[]>('nexus-videos', []);
  const [notes, setNotes] = useLocalStorage<Note[]>('nexus-notes', []);

  const video = videos.find(v => v.id === videoId);

  /* player state */
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [apiReady, setApiReady] = useState(!!window.YT?.Player);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [playerError, setPlayerError] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* notes state */
  const [noteText, setNoteText] = useState('');
  const [showNotes, setShowNotes] = useState(true);
  const videoNotes = notes
    .filter(n => n.videoId === videoId)
    .sort((a, b) => a.timestamp - b.timestamp);

  /* ── Load YT IFrame API ───────────────────────────────────────────────── */
  useEffect(() => {
    if (window.YT?.Player) { setApiReady(true); return; }
    if (!document.getElementById('yt-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    window.onYouTubeIframeAPIReady = () => setApiReady(true);
    return () => { window.onYouTubeIframeAPIReady = () => {}; };
  }, []);

  /* ── Init player ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!apiReady || !video || !iframeRef.current) return;

    setPlayerError(false);
    if (playerRef.current) { try { playerRef.current.destroy(); } catch (_) {} playerRef.current = null; }

    playerRef.current = new window.YT.Player(iframeRef.current, {
      events: {
        onReady: (e) => {
          const p = e.target;
          p.setPlaybackRate(speed);
          setDuration(p.getDuration());
          setVolume(p.getVolume() / 100);
          setMuted(p.isMuted());
          // Start tick
          tickRef.current = setInterval(() => {
            if (!playerRef.current) return;
            try {
              const t = playerRef.current.getCurrentTime();
              const dur = playerRef.current.getDuration();
              setCurrentTime(t);
              if (!duration && dur > 0) setDuration(dur);
              if (dur > 0) {
                const prog = Math.round((t / dur) * 100);
                setVideos(vs => vs.map(v =>
                  v.id === videoId ? { ...v, lastTimestamp: t, progress: prog } : v
                ));
              }
            } catch (_) {}
          }, 500);
        },
        onStateChange: (e) => {
          const YT = window.YT;
          setPlaying(e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.BUFFERING);
          if (e.data === YT.PlayerState.ENDED) {
            setPlaying(false);
            setVideos(vs => vs.map(v =>
              v.id === videoId ? { ...v, status: 'completed', progress: 100 } : v
            ));
          }
        },
        onError: () => {
          setPlayerError(true);
          if (tickRef.current) clearInterval(tickRef.current);
        },
      },
    });

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      try { playerRef.current?.destroy(); } catch (_) {}
      playerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiReady, video?.youtubeId]);

  /* ── Controls auto-hide ──────────────────────────────────────────────── */
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, [playing]);

  useEffect(() => { showControls(); }, [playing]);

  /* ── Keyboard shortcuts ──────────────────────────────────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!playerRef.current) return;
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
      const p = playerRef.current;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.code === 'ArrowLeft')  { e.preventDefault(); seek(p.getCurrentTime() - 10); }
      if (e.code === 'ArrowRight') { e.preventDefault(); seek(p.getCurrentTime() + 10); }
      if (e.code === 'ArrowUp')   { e.preventDefault(); changeVolume(Math.min(1, volume + 0.1)); }
      if (e.code === 'ArrowDown') { e.preventDefault(); changeVolume(Math.max(0, volume - 0.1)); }
      if (e.code === 'KeyM') { e.preventDefault(); toggleMute(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, playing]);

  /* ── Player controls ─────────────────────────────────────────────────── */
  function togglePlay() {
    if (!playerRef.current) return;
    try {
      const state = playerRef.current.getPlayerState();
      if (state === window.YT.PlayerState.PLAYING) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } catch (_) {}
  }

  function seek(t: number) {
    try {
      playerRef.current?.seekTo(Math.max(0, t), true);
      setCurrentTime(Math.max(0, t));
    } catch (_) {}
  }

  function changeVolume(v: number) {
    try {
      setVolume(v);
      playerRef.current?.setVolume(v * 100);
      if (v > 0 && muted) {
        playerRef.current?.unMute();
        setMuted(false);
      }
    } catch (_) {}
  }

  function toggleMute() {
    try {
      if (muted) { playerRef.current?.unMute(); setMuted(false); }
      else       { playerRef.current?.mute();   setMuted(true);  }
    } catch (_) {}
  }

  function changeSpeed(s: number) {
    try {
      setSpeed(s);
      playerRef.current?.setPlaybackRate(s);
    } catch (_) {}
  }

  function addNote() {
    if (!noteText.trim() || !video) return;
    let ts = 0;
    try { ts = Math.floor(playerRef.current?.getCurrentTime() ?? 0); } catch (_) {}
    setNotes(ns => [...ns, {
      id: generateId(), videoId: video.id, timestamp: ts,
      content: noteText.trim(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }]);
    setNoteText('');
  }

  function seekToNote(ts: number) {
    seek(ts);
    try { playerRef.current?.playVideo(); } catch (_) {}
  }

  function fullscreen() {
    const el = document.getElementById('player-wrap');
    if (el?.requestFullscreen) el.requestFullscreen();
  }

  function setStatus(status: Video['status']) {
    setVideos(vs => vs.map(v => v.id === videoId ? { ...v, status } : v));
  }

  /* ── Guard ───────────────────────────────────────────────────────────── */
  if (!video) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Video not found</p>
        <Link href="/library"><Button variant="outline">Go to Library</Button></Link>
      </div>
    );
  }

  const currentStatus = STATUS_OPTIONS.find(s => s.value === video.status) ?? STATUS_OPTIONS[0];
  const StatusIcon = currentStatus.icon;
  const progress = duration > 0 ? currentTime / duration : 0;

  /* build nocookie embed URL — controls=0 hides all native YouTube UI */
  const embedUrl = (() => {
    const p = new URLSearchParams({
      enablejsapi: '1',
      controls:    '0',      // ← hides YouTube controls
      disablekb:   '1',      // ← disables YouTube keyboard shortcuts
      rel:         '0',
      modestbranding: '1',
      iv_load_policy: '3',
      fs:          '0',      // ← hide YouTube fullscreen btn (we have our own)
      playsinline: '1',
      start:       String(Math.floor(video.lastTimestamp || 0)),
      origin:      window.location.origin,
    });
    return `https://www.youtube-nocookie.com/embed/${video.youtubeId}?${p}`;
  })();

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* ── Left: Video + Controls ──────────────────────────────────────── */}
      <div className={cn("flex flex-col overflow-hidden", showNotes ? "flex-1" : "w-full")}>

        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b flex-shrink-0 min-w-0">
          <Link href="/library">
            <Button size="sm" variant="ghost" className="h-7 px-2 flex-shrink-0">
              <ChevronLeft className="w-4 h-4" />Back
            </Button>
          </Link>
          <h1 className="text-sm font-semibold line-clamp-1 flex-1 min-w-0">{video.title}</h1>
          <Select value={video.status} onValueChange={v => setStatus(v as Video['status'])}>
            <SelectTrigger className="h-7 w-36 text-xs border-0 bg-muted/50 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <StatusIcon className={cn("w-3.5 h-3.5 flex-shrink-0", currentStatus.color)} />
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
          <a href={video.url} target="_blank" rel="noopener noreferrer" title="Open on YouTube">
            <Button size="sm" variant="ghost" className="h-7 px-2 flex-shrink-0">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
          <Button size="sm" variant="ghost" className="h-7 px-2 flex-shrink-0" onClick={() => setShowNotes(s => !s)}>
            <List className="w-4 h-4" />
          </Button>
        </div>

        {/* Video area */}
        <div
          id="player-wrap"
          className="relative bg-black flex-shrink-0 select-none"
          style={{ paddingBottom: '56.25%' }}
          onMouseMove={showControls}
          onMouseLeave={() => { if (playing) setControlsVisible(false); }}
        >
          {/* YouTube iframe — NO native controls */}
          <iframe
            ref={iframeRef}
            src={embedUrl}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
            title={video.title}
          />

          {/* ── Transparent interaction layer ─────────────────────────── */}
          {/* Covers the whole video to block YouTube's click-to-YouTube and
              related-video overlays; forwards click to our play/pause. */}
          <div
            className="absolute inset-0"
            style={{ cursor: controlsVisible ? 'default' : 'none' }}
            onClick={togglePlay}
          />

          {/* ── Centre play/pause pulse ──────────────────────────────── */}
          {!playing && !playerError && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                <Play className="w-7 h-7 text-white ml-1" fill="white" />
              </div>
            </div>
          )}

          {/* ── Error overlay ────────────────────────────────────────── */}
          {playerError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 gap-4 p-6 text-center pointer-events-auto">
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <div>
                <p className="font-semibold text-white">This video can't be embedded</p>
                <p className="text-sm text-white/60 mt-1">The uploader has disabled playback outside YouTube.</p>
              </div>
              <a href={video.url} target="_blank" rel="noopener noreferrer">
                <Button><ExternalLink className="w-4 h-4 mr-2" />Watch on YouTube</Button>
              </a>
              <p className="text-xs text-white/40">You can still take notes — they will be saved.</p>
            </div>
          )}

          {/* ── Custom control bar (slides in/out) ───────────────────── */}
          <div
            className={cn(
              "absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pt-8 pb-3 transition-opacity duration-300 pointer-events-none",
              controlsVisible ? "opacity-100 pointer-events-auto" : "opacity-0"
            )}
            onClick={e => e.stopPropagation()}
          >
            {/* Seek bar */}
            <SeekBar
              value={progress}
              onChange={v => seek(v * duration)}
            />

            {/* Buttons row */}
            <div className="flex items-center gap-2 mt-2">
              {/* Play/Pause */}
              <button
                className="w-8 h-8 flex items-center justify-center text-white hover:text-primary transition-colors"
                onClick={togglePlay}
              >
                {playing
                  ? <Pause className="w-5 h-5" fill="currentColor" />
                  : <Play  className="w-5 h-5 ml-0.5" fill="currentColor" />
                }
              </button>

              {/* Skip back */}
              <button
                className="flex items-center gap-0.5 text-white/80 hover:text-white text-xs transition-colors"
                onClick={() => seek(currentTime - 10)}
              >
                <SkipBack className="w-4 h-4" />10
              </button>

              {/* Skip forward */}
              <button
                className="flex items-center gap-0.5 text-white/80 hover:text-white text-xs transition-colors"
                onClick={() => seek(currentTime + 10)}
              >
                10<SkipForward className="w-4 h-4" />
              </button>

              {/* Volume */}
              <button
                className="text-white/80 hover:text-white transition-colors"
                onClick={toggleMute}
              >
                {muted || volume === 0
                  ? <VolumeX className="w-4 h-4" />
                  : <Volume2 className="w-4 h-4" />
                }
              </button>
              <VolumeBar value={muted ? 0 : volume} onChange={changeVolume} />

              {/* Time */}
              <span className="text-xs text-white/80 font-mono ml-1 tabular-nums">
                {formatTimestamp(currentTime)}
                {duration > 0 && <span className="text-white/50"> / {formatTimestamp(duration)}</span>}
              </span>

              <div className="flex-1" />

              {/* Speed */}
              <div className="flex items-center gap-0.5">
                {SPEED_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => changeSpeed(s)}
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded transition-colors",
                      speed === s
                        ? 'bg-primary text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Fullscreen */}
              <button
                className="text-white/80 hover:text-white transition-colors ml-1"
                onClick={fullscreen}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        {video.description && (
          <div className="px-4 py-2.5 border-b flex-shrink-0">
            <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>
          </div>
        )}
      </div>

      {/* ── Right: Notes panel ─────────────────────────────────────────── */}
      {showNotes && (
        <div className="w-80 border-l flex flex-col overflow-hidden flex-shrink-0">
          <div className="px-4 py-3 border-b flex-shrink-0">
            <h3 className="font-semibold text-sm">Notes</h3>
            <p className="text-xs text-muted-foreground">{videoNotes.length} notes for this video</p>
          </div>

          {/* Add note */}
          <div className="p-3 border-b flex-shrink-0">
            <Textarea
              placeholder="Take a note at current timestamp…"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={3}
              className="text-sm resize-none mb-2"
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault(); addNote();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-primary font-mono">
                <Clock className="w-3 h-3 inline mr-1" />
                {formatTimestamp(currentTime)}
              </span>
              <Button size="sm" className="h-7 px-3 text-xs" onClick={addNote} disabled={!noteText.trim()}>
                <Plus className="w-3.5 h-3.5 mr-1" />Add Note
              </Button>
            </div>
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {videoNotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">No notes yet</p>
                <p className="text-xs">Start watching and take notes!</p>
              </div>
            ) : videoNotes.map(note => (
              <div key={note.id} className="p-3 rounded-lg bg-card border group">
                <div className="flex items-center justify-between mb-1.5">
                  <button
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-mono font-medium"
                    onClick={() => seekToNote(note.timestamp)}
                  >
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(note.timestamp)}
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                    onClick={() => setNotes(ns => ns.filter(n => n.id !== note.id))}
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
