import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Video, Note, Subject, Topic, Subtopic, INITIAL_VIDEOS, INITIAL_NOTES, INITIAL_SUBJECTS, INITIAL_TOPICS, INITIAL_SUBTOPICS } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, Video as VideoIcon, FileText, BookOpen, X } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

type Filter = 'all' | 'videos' | 'notes' | 'topics';
type StatusFilter = 'all' | 'completed' | 'pending' | 'revise' | 'important';

export default function Search() {
  const [videos] = useLocalStorage<Video[]>('nexus-videos', INITIAL_VIDEOS);
  const [notes] = useLocalStorage<Note[]>('nexus-notes', INITIAL_NOTES);
  const [subjects] = useLocalStorage<Subject[]>('nexus-subjects', INITIAL_SUBJECTS);
  const [topics] = useLocalStorage<Topic[]>('nexus-topics', INITIAL_TOPICS);
  const [subtopics] = useLocalStorage<Subtopic[]>('nexus-subtopics', INITIAL_SUBTOPICS);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const videoMap = useMemo(() => {
    const m: Record<string, Video> = {};
    videos.forEach(v => { m[v.id] = v; });
    return m;
  }, [videos]);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return { videos: [], notes: [], topics: [] };

    const matchedVideos = (filter === 'all' || filter === 'videos')
      ? videos.filter(v => {
        const matchQ = v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'all' || v.status === statusFilter;
        return matchQ && matchStatus;
      })
      : [];

    const matchedNotes = (filter === 'all' || filter === 'notes')
      ? notes.filter(n => n.content.toLowerCase().includes(q))
      : [];

    const matchedTopics = (filter === 'all' || filter === 'topics')
      ? [
        ...subjects.filter(s => s.name.toLowerCase().includes(q)).map(s => ({ type: 'subject' as const, id: s.id, name: s.name })),
        ...topics.filter(t => t.name.toLowerCase().includes(q)).map(t => ({ type: 'topic' as const, id: t.id, name: t.name })),
        ...subtopics.filter(st => st.name.toLowerCase().includes(q)).map(st => ({ type: 'subtopic' as const, id: st.id, name: st.name }))
      ]
      : [];

    return { videos: matchedVideos, notes: matchedNotes, topics: matchedTopics };
  }, [query, filter, statusFilter, videos, notes, subjects, topics, subtopics]);

  const total = results.videos.length + results.notes.length + results.topics.length;

  const STATUS_COLORS: Record<string, string> = {
    completed: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
    revise: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    important: 'bg-violet-500/15 text-violet-500 border-violet-500/30',
    pending: 'bg-muted text-muted-foreground border-border'
  };

  function highlight(text: string, q: string) {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary/20 text-primary rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight mb-3">Search</h1>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search videos, notes, topics..."
            className="pl-10 h-10 text-base"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            data-testid="input-search"
          />
          {query && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setQuery('')}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {query && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <div className="flex gap-1.5">
              {(['all', 'videos', 'notes', 'topics'] as Filter[]).map(f => (
                <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="h-7 text-xs capitalize">
                  {f}
                </Button>
              ))}
            </div>
            {(filter === 'all' || filter === 'videos') && (
              <div className="flex gap-1.5">
                {(['all', 'completed', 'pending', 'revise', 'important'] as StatusFilter[]).map(s => (
                  <Button key={s} size="sm" variant={statusFilter === s ? 'secondary' : 'ghost'} onClick={() => setStatusFilter(s)} className="h-7 text-xs capitalize">
                    {s}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!query && (
          <div className="text-center py-16 text-muted-foreground">
            <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">Start typing to search</p>
            <p className="text-sm mt-1">Search across videos, notes, and topics</p>
          </div>
        )}

        {query && total === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-medium">No results for "{query}"</p>
          </div>
        )}

        {results.videos.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <VideoIcon className="w-4 h-4" />Videos ({results.videos.length})
            </h3>
            <div className="space-y-2">
              {results.videos.map(video => (
                <Link key={video.id} href={`/player/${video.id}?from=search`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                    <img src={video.thumbnail} alt={video.title} className="w-20 h-11 object-cover rounded flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{highlight(video.title, query)}</p>
                      {video.description && <p className="text-xs text-muted-foreground line-clamp-1">{highlight(video.description, query)}</p>}
                    </div>
                    <Badge className={cn("text-xs border", STATUS_COLORS[video.status])}>{video.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {results.notes.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />Notes ({results.notes.length})
            </h3>
            <div className="space-y-2">
              {results.notes.map(note => {
                const video = videoMap[note.videoId];
                return (
                  <Link key={note.id} href={`/player/${note.videoId}?t=${note.timestamp}`}>
                    <div className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                      {video && <p className="text-xs text-primary mb-1 font-medium">{video.title} · {formatTimestamp(note.timestamp)}</p>}
                      <p className="text-sm text-muted-foreground line-clamp-2">{highlight(note.content, query)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {results.topics.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />Topics ({results.topics.length})
            </h3>
            <div className="space-y-2">
              {results.topics.map(item => (
                <Link key={item.id} href="/library">
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                    <Badge variant="secondary" className="text-xs capitalize">{item.type}</Badge>
                    <span className="text-sm">{highlight(item.name, query)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
