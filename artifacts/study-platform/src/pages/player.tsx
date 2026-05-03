import { useState, useEffect, useRef } from "react";
import { useParams, useSearch } from "wouter";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Video, Note } from "@/lib/types";
import { generateId, formatTimestamp } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  SkipBack, SkipForward, Plus, Trash2, Clock, CheckCircle2,
  RotateCcw, Star, Circle, ChevronLeft, List, ExternalLink,
  AlertCircle, Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useConfirm } from "@/hooks/use-confirm";

/* ── YouTube IFrame API types ─────────────────────────────────────────── */
declare global {
  interface Window {
    YT: {
      Player: new (
        el: string | HTMLElement,
        config: {
          videoId?: string;
          host?: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number }) => void;
            onError?: (e: { data: number }) => void;
          };
        }
      ) => YTPlayer;
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
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setVolume(v: number): void;
  getVolume(): number;
  getPlayerState(): number;
  getPlaybackQuality(): string;
  setPlaybackQuality(q: string): void;
  getAvailableQualityLevels(): string[];
  destroy(): void;
}

const QUALITY_LABELS: Record<string, string> = {
  hd2160: '4K',
  hd1440: '1440p',
  hd1080: '1080p',
  hd720:  '720p',
  large:  '480p',
  medium: '360p',
  small:  '240p',
  tiny:   '144p',
  auto:   'Auto',
};

/* ── constants ─────────────────────────────────────────────────────────── */
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const STATUS_OPTIONS = [
  { value: "pending",   label: "Pending",      icon: Circle,       color: "text-muted-foreground" },
  { value: "completed", label: "Completed",    icon: CheckCircle2, color: "text-emerald-500" },
  { value: "revise",    label: "Revise Later", icon: RotateCcw,    color: "text-amber-500" },
  { value: "important", label: "Important",    icon: Star,         color: "text-violet-500" },
];

/* ── SeekBar ────────────────────────────────────────────────────────────── */
function SeekBar({ value, onSeek }: { value: number; onSeek: (v: number) => void }) {
  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  }
  return (
    <div
      className="relative group flex-1 flex items-center h-5 cursor-pointer"
      onClick={handleClick}
    >
      <div className="h-1 w-full rounded-full bg-white/20 overflow-visible group-hover:h-1.5 transition-all">
        <div className="h-full bg-primary rounded-full" style={{ width: `${value * 100}%` }} />
      </div>
      <div
        className="absolute w-3 h-3 bg-primary rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ left: `${value * 100}%`, transform: "translateX(-50%)" }}
      />
    </div>
  );
}

/* ── VolumeBar ──────────────────────────────────────────────────────────── */
function VolumeBar({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onChange(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  }
  return (
    <div className="relative flex items-center h-5 w-16 cursor-pointer" onClick={handleClick}>
      <div className="h-1 w-full rounded-full bg-white/20 overflow-hidden">
        <div className="h-full bg-white/80 rounded-full" style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Main Player
══════════════════════════════════════════════════════════════════════════ */
export default function Player() {
  const { videoId } = useParams<{ videoId: string }>();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const fromPage = searchParams.get("from") ?? "library";
  const fromPlaylistId = searchParams.get("playlistId") ?? "";
  const backHref =
    fromPage === "playlists" ? `/playlists?playlist=${fromPlaylistId}` :
    fromPage === "notes"     ? "/notes" :
    fromPage === "revision"  ? "/revision" :
    fromPage === "search"    ? "/search" :
    fromPage === "dashboard" ? "/" :
    "/library";
  const [videos, setVideos] = useLocalStorage<Video[]>("nexus-videos", []);
  const [notes, setNotes]   = useLocalStorage<Note[]>("nexus-notes",   []);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const video = videos.find(v => v.id === videoId);

  /* refs */
  const containerRef = useRef<HTMLDivElement>(null); // div that YT replaces with iframe
  const wrapRef      = useRef<HTMLDivElement>(null); // outer video wrapper for fullscreen
  const playerRef    = useRef<YTPlayer | null>(null);
  const tickRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef      = useRef<ReturnType<typeof setTimeout>  | null>(null);

  /* state */
  const [apiReady,       setApiReady]       = useState(false);
  const [playing,        setPlaying]        = useState(false);
  const [currentTime,    setCurrentTime]    = useState(0);
  const [duration,       setDuration]       = useState(0);
  const [volume,         setVolume]         = useState(1);
  const [muted,          setMuted]          = useState(false);
  const [speed,          setSpeed]          = useState(1);
  const [playerError,    setPlayerError]    = useState(false);
  const [ctrlVisible,    setCtrlVisible]    = useState(true);
  const [cssFullscreen,  setCssFullscreen]  = useState(false);
  const [nativeFs,       setNativeFs]       = useState(false);
  const [showRename,     setShowRename]     = useState(false);
  const [renameValue,    setRenameValue]    = useState("");
  const [quality,        setQuality]        = useState('auto');
  const [qualityLevels,  setQualityLevels]  = useState<string[]>([]);
  const [showQuality,    setShowQuality]    = useState(false);

  /* notes */
  const [noteText,  setNoteText]  = useState("");
  const [showNotes, setShowNotes] = useState(true);
  const videoNotes = notes
    .filter(n => n.videoId === videoId)
    .sort((a, b) => a.timestamp - b.timestamp);

  /* ── 1. Load YT script once ─────────────────────────────────────────── */
  useEffect(() => {
    function markReady() { setApiReady(true); }
    if (window.YT?.Player) { markReady(); return; }

    // If script already injected (e.g. HMR), just wait for callback
    window.onYouTubeIframeAPIReady = markReady;

    if (!document.getElementById("yt-api-script")) {
      const s = document.createElement("script");
      s.id  = "yt-api-script";
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
    return () => { /* leave script in DOM so it only loads once */ };
  }, []);

  /* ── 2. Init player when API + video are ready ──────────────────────── */
  useEffect(() => {
    if (!apiReady || !video || !containerRef.current) return;

    setPlayerError(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    // Clean up any previous instance
    if (tickRef.current) clearInterval(tickRef.current);
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch (_) {}
      playerRef.current = null;
    }

    // Reset the container div so YT can replace it with a fresh iframe
    containerRef.current.innerHTML = "";

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId:    video.youtubeId,
      host:       "https://www.youtube-nocookie.com", // privacy-enhanced, less embedding restrictions
      playerVars: {
        autoplay:       1,
        controls:       0,  // hide ALL native YouTube UI
        disablekb:      1,  // block YouTube keyboard shortcuts
        rel:            0,
        modestbranding: 1,
        iv_load_policy: 3,
        fs:             0,  // hide YouTube fullscreen button
        playsinline:    1,
        start:          Math.floor(video.lastTimestamp || 0),
        origin:         window.location.origin,
      },
      events: {
        onReady: (e) => {
          const p = e.target;
          try {
            p.setPlaybackRate(speed);
            setDuration(p.getDuration());
            setVolume(p.getVolume() / 100);
            setMuted(p.isMuted());
            // Populate quality levels after a short delay (levels aren't
            // always available at onReady on first load)
            setTimeout(() => {
              try {
                const levels = p.getAvailableQualityLevels();
                if (levels?.length) setQualityLevels(levels);
                setQuality(p.getPlaybackQuality() || 'auto');
              } catch (_) {}
            }, 1500);
          } catch (_) {}

          tickRef.current = setInterval(() => {
            if (!playerRef.current) return;
            try {
              const t   = playerRef.current.getCurrentTime();
              const dur = playerRef.current.getDuration();
              setCurrentTime(t);
              if (dur > 0) {
                setDuration(dur);
                setVideos(vs =>
                  vs.map(v =>
                    v.id === videoId
                      ? { ...v, lastTimestamp: t, progress: Math.round((t / dur) * 100) }
                      : v
                  )
                );
              }
            } catch (_) {}
          }, 500);
        },

        onStateChange: (e) => {
          const { PLAYING, BUFFERING, ENDED } = window.YT.PlayerState;
          const isPlaying = e.data === PLAYING || e.data === BUFFERING;
          setPlaying(isPlaying);
          // Refresh quality levels once buffering starts (most reliable time)
          if (e.data === BUFFERING || e.data === PLAYING) {
            try {
              const levels = playerRef.current?.getAvailableQualityLevels();
              if (levels?.length) setQualityLevels(levels);
              const q = playerRef.current?.getPlaybackQuality();
              if (q) setQuality(q);
            } catch (_) {}
          }
          if (e.data === ENDED) {
            setPlaying(false);
            setVideos(vs =>
              vs.map(v => v.id === videoId ? { ...v, status: "completed", progress: 100 } : v)
            );
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
      if (hideRef.current)  clearTimeout(hideRef.current);
      try { playerRef.current?.destroy(); } catch (_) {}
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiReady, video?.youtubeId]);

  /* ── Controls auto-hide ─────────────────────────────────────────────── */
  function showCtrl() {
    setCtrlVisible(true);
    if (hideRef.current) clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => {
      if (playerRef.current) {
        try {
          if (playerRef.current.getPlayerState() === window.YT?.PlayerState?.PLAYING) {
            setCtrlVisible(false);
          }
        } catch (_) {}
      }
    }, 3000);
  }

  /* ── Keyboard shortcuts ─────────────────────────────────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (!playerRef.current) return;
      try {
        if (e.code === "Space")      { e.preventDefault(); togglePlay(); }
        if (e.code === "ArrowLeft")  { e.preventDefault(); seek(playerRef.current.getCurrentTime() - 10); }
        if (e.code === "ArrowRight") { e.preventDefault(); seek(playerRef.current.getCurrentTime() + 10); }
        if (e.code === "KeyM")       { e.preventDefault(); toggleMute(); }
      } catch (_) {}
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted]);

  /* ── Actions ────────────────────────────────────────────────────────── */
  function togglePlay() {
    if (!playerRef.current) return;
    try {
      const state = playerRef.current.getPlayerState();
      if (state === window.YT.PlayerState.PLAYING) playerRef.current.pauseVideo();
      else playerRef.current.playVideo();
    } catch (_) {}
  }

  function seek(t: number) {
    try { playerRef.current?.seekTo(Math.max(0, t), true); setCurrentTime(Math.max(0, t)); }
    catch (_) {}
  }

  function changeVolume(v: number) {
    try {
      setVolume(v);
      playerRef.current?.setVolume(v * 100);
      if (v > 0 && muted) { playerRef.current?.unMute(); setMuted(false); }
    } catch (_) {}
  }

  function toggleMute() {
    try {
      if (muted) { playerRef.current?.unMute(); setMuted(false); }
      else       { playerRef.current?.mute();   setMuted(true);  }
    } catch (_) {}
  }

  function changeSpeed(s: number) {
    try { setSpeed(s); playerRef.current?.setPlaybackRate(s); } catch (_) {}
  }

  function changeQuality(q: string) {
    try { playerRef.current?.setPlaybackQuality(q); setQuality(q); } catch (_) {}
  }

  function toggleFullscreen() {
    if (nativeFs) {
      // Exit native fullscreen
      document.exitFullscreen().catch(() => {});
      return;
    }
    if (cssFullscreen) {
      // Exit CSS fullscreen
      setCssFullscreen(false);
      return;
    }
    // Try native fullscreen first; fall back to CSS overlay
    const el = wrapRef.current;
    const req = el?.requestFullscreen ?? (el as unknown as { webkitRequestFullscreen?: () => Promise<void> })?.webkitRequestFullscreen;
    if (req && document.fullscreenEnabled) {
      req.call(el).catch(() => setCssFullscreen(true));
    } else {
      setCssFullscreen(true);
    }
  }

  // Exit CSS fullscreen on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && cssFullscreen) setCssFullscreen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cssFullscreen]);

  // Track native fullscreen state changes
  useEffect(() => {
    function onFsChange() {
      const active = !!document.fullscreenElement;
      setNativeFs(active);
      if (!active && cssFullscreen) setCssFullscreen(false);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, [cssFullscreen]);

  function addNote() {
    if (!noteText.trim() || !video) return;
    let ts = 0;
    try { ts = Math.floor(playerRef.current?.getCurrentTime() ?? 0); } catch (_) {}
    setNotes(ns => [...ns, {
      id: generateId(), videoId: video.id, timestamp: ts,
      content: noteText.trim(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }]);
    setNoteText("");
  }

  function setStatus(status: Video["status"]) {
    setVideos(vs => vs.map(v => v.id === videoId ? { ...v, status } : v));
  }

  function confirmRename() {
    if (!renameValue.trim()) return;
    setVideos(vs => vs.map(v => v.id === videoId ? { ...v, title: renameValue.trim() } : v));
    setShowRename(false);
  }

  /* ── Guard ──────────────────────────────────────────────────────────── */
  if (!video) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Video not found</p>
        <Link href={backHref}><Button variant="outline">Go Back</Button></Link>
      </div>
    );
  }

  const currentStatus = STATUS_OPTIONS.find(s => s.value === video.status) ?? STATUS_OPTIONS[0];
  const StatusIcon = currentStatus.icon;
  const seekPct = duration > 0 ? currentTime / duration : 0;

  return (
    <>
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">

      {/* ── Video column ───────────────────────────────────────────────── */}
      <div className={cn("flex flex-col md:overflow-hidden", showNotes ? "md:flex-1" : "w-full")}>

        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b flex-shrink-0 min-w-0">
          <Link href={backHref}>
            <Button size="sm" variant="ghost" className="h-7 px-2 flex-shrink-0">
              <ChevronLeft className="w-4 h-4" />Back
            </Button>
          </Link>
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <h1 className="text-sm font-semibold line-clamp-1 min-w-0 flex-1">{video.title}</h1>
            <button
              className="flex-shrink-0 p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { setRenameValue(video.title); setShowRename(true); }}
              title="Rename video"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Status selector */}
          <Select value={video.status} onValueChange={v => setStatus(v as Video["status"])}>
            <SelectTrigger className="h-7 w-36 text-xs border-0 bg-muted/50 flex-shrink-0">
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

          <a href={video.url} target="_blank" rel="noopener noreferrer" title="Open on YouTube">
            <Button size="sm" variant="ghost" className="h-7 px-2"><ExternalLink className="w-4 h-4" /></Button>
          </a>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setShowNotes(s => !s)}>
            <List className="w-4 h-4" />
          </Button>
        </div>

        {/* ── Video area ────────────────────────────────────────────────── */}
        <div
          ref={wrapRef}
          className={cn(
            "relative bg-black flex-shrink-0 select-none",
            cssFullscreen && "fixed inset-0 z-[9999] w-full h-full"
          )}
          style={cssFullscreen ? undefined : { paddingBottom: "56.25%" }}
          onMouseMove={showCtrl}
          onMouseLeave={() => { if (playing) setCtrlVisible(false); }}
        >
          {/* YT replaces this div with an iframe */}
          <div ref={containerRef} className="absolute inset-0 w-full h-full" />

          {/* Transparent capture layer — blocks YouTube UI, forwards clicks */}
          <div
            className="absolute inset-0"
            style={{ cursor: ctrlVisible ? "default" : "none" }}
            onClick={e => { e.stopPropagation(); togglePlay(); showCtrl(); }}
          />

          {/* Centre play icon when paused */}
          {!playing && !playerError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-7 h-7 text-white ml-1" fill="white" />
              </div>
            </div>
          )}

          {/* Error overlay */}
          {playerError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 gap-4 p-6 text-center pointer-events-auto z-10">
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

          {/* ── Custom control bar ──────────────────────────────────────── */}
          <div
            className={cn(
              "absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent",
              "px-4 pt-8 pb-3 transition-opacity duration-300",
              ctrlVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            onClick={e => e.stopPropagation()}
          >
            {/* Seek bar */}
            <SeekBar value={seekPct} onSeek={v => seek(v * duration)} />

            {/* Controls row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">

              {/* Play / Pause */}
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

              {/* Mute */}
              <button className="text-white/80 hover:text-white transition-colors" onClick={toggleMute}>
                {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <VolumeBar value={muted ? 0 : volume} onChange={changeVolume} />

              {/* Time */}
              <span className="text-xs text-white/80 font-mono tabular-nums ml-1">
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
                        ? "bg-primary text-white"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Quality */}
              {qualityLevels.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowQuality(q => !q)}
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded transition-colors border border-white/20",
                      showQuality ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
                    )}
                  >
                    {QUALITY_LABELS[quality] ?? quality}
                  </button>
                  {showQuality && (
                    <div
                      className="absolute bottom-full mb-2 right-0 bg-black/95 backdrop-blur-sm rounded-lg overflow-hidden border border-white/15 min-w-[80px] z-30 shadow-xl"
                      onClick={e => e.stopPropagation()}
                    >
                      {qualityLevels.map(q => (
                        <button
                          key={q}
                          onClick={() => { changeQuality(q); setShowQuality(false); }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-xs transition-colors",
                            quality === q
                              ? "text-primary bg-white/10 font-medium"
                              : "text-white/75 hover:text-white hover:bg-white/10"
                          )}
                        >
                          {QUALITY_LABELS[q] ?? q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Fullscreen */}
              <button
                className="text-white/80 hover:text-white transition-colors ml-1"
                onClick={toggleFullscreen}
              >
                {(cssFullscreen || nativeFs) ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
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

      {/* ── Notes panel ────────────────────────────────────────────────── */}
      {showNotes && (
        <div className="flex-1 md:flex-none md:w-80 border-t md:border-t-0 md:border-l flex flex-col overflow-hidden min-h-0">
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
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
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
                    onClick={() => { seek(note.timestamp); try { playerRef.current?.playVideo(); } catch (_) {} }}
                  >
                    <Clock className="w-3 h-3" />{formatTimestamp(note.timestamp)}
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                    onClick={async () => { if (await confirm("Delete this note?")) setNotes(ns => ns.filter(n => n.id !== note.id)); }}
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
    </div>

    {/* ── Rename video dialog ─────────────────────────────────────────── */}
    <Dialog open={showRename} onOpenChange={setShowRename}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Rename Video</DialogTitle></DialogHeader>
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
    </>
  );
}
