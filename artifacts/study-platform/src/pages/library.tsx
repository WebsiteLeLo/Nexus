import { useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Subject, Topic, Subtopic, Video, INITIAL_SUBJECTS, INITIAL_TOPICS, INITIAL_SUBTOPICS, INITIAL_VIDEOS } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronRight, ChevronDown, Plus, Trash2, Edit2, Video as VideoIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export default function Library() {
  const [subjects, setSubjects] = useLocalStorage<Subject[]>('nexus-subjects', INITIAL_SUBJECTS);
  const [topics, setTopics] = useLocalStorage<Topic[]>('nexus-topics', INITIAL_TOPICS);
  const [subtopics, setSubtopics] = useLocalStorage<Subtopic[]>('nexus-subtopics', INITIAL_SUBTOPICS);
  const [videos, setVideos] = useLocalStorage<Video[]>('nexus-videos', INITIAL_VIDEOS);

  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set(['sub1']));
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set(['top1']));
  const [expandedSubtopics, setExpandedSubtopics] = useState<Set<string>>(new Set());

  const [addDialog, setAddDialog] = useState<{ type: 'subject' | 'topic' | 'subtopic' | 'video'; parentId?: string } | null>(null);
  const [inputName, setInputName] = useState('');
  const [inputUrl, setInputUrl] = useState('');

  function toggleSubject(id: string) {
    setExpandedSubjects(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleTopic(id: string) {
    setExpandedTopics(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleSubtopic(id: string) {
    setExpandedSubtopics(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function getSubjectProgress(subjectId: string) {
    const subjectTopics = topics.filter(t => t.subjectId === subjectId);
    const subjectSubtopics = subtopics.filter(st => subjectTopics.some(t => t.id === st.topicId));
    const subjectVideos = videos.filter(v => subjectSubtopics.some(st => st.id === v.subtopicId));
    if (!subjectVideos.length) return 0;
    const completed = subjectVideos.filter(v => v.status === 'completed').length;
    return Math.round((completed / subjectVideos.length) * 100);
  }

  function getTopicProgress(topicId: string) {
    const topicSubtopics = subtopics.filter(st => st.topicId === topicId);
    const topicVideos = videos.filter(v => topicSubtopics.some(st => st.id === v.subtopicId));
    if (!topicVideos.length) return 0;
    return Math.round((topicVideos.filter(v => v.status === 'completed').length / topicVideos.length) * 100);
  }

  function getSubtopicProgress(subtopicId: string) {
    const vs = videos.filter(v => v.subtopicId === subtopicId);
    if (!vs.length) return 0;
    return Math.round((vs.filter(v => v.status === 'completed').length / vs.length) * 100);
  }

  function handleAdd() {
    if (!addDialog) return;
    if (addDialog.type === 'subject' && inputName.trim()) {
      setSubjects(s => [...s, { id: generateId(), name: inputName.trim(), icon: 'Book', color: '#6366f1', createdAt: new Date().toISOString() }]);
    } else if (addDialog.type === 'topic' && inputName.trim() && addDialog.parentId) {
      setTopics(t => [...t, { id: generateId(), subjectId: addDialog.parentId!, name: inputName.trim(), order: t.filter(x => x.subjectId === addDialog.parentId).length + 1 }]);
    } else if (addDialog.type === 'subtopic' && inputName.trim() && addDialog.parentId) {
      setSubtopics(s => [...s, { id: generateId(), topicId: addDialog.parentId!, name: inputName.trim(), order: s.filter(x => x.topicId === addDialog.parentId).length + 1 }]);
    } else if (addDialog.type === 'video' && inputUrl.trim() && addDialog.parentId) {
      const urlStr = inputUrl.trim();
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
        /^([A-Za-z0-9_-]{11})$/
      ];
      let ytId = urlStr.slice(0, 11);
      for (const p of patterns) { const m = urlStr.match(p); if (m) { ytId = m[1]; break; } }
      setVideos(vs => [...vs, {
        id: generateId(), url: inputUrl.trim(), youtubeId: ytId,
        title: inputName.trim() || 'Untitled Video',
        thumbnail: `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
        description: '', subtopicId: addDialog.parentId!,
        status: 'pending', progress: 0, lastTimestamp: 0, duration: 0,
        order: vs.filter(v => v.subtopicId === addDialog.parentId).length + 1,
        addedAt: new Date().toISOString()
      }]);
    }
    setInputName(''); setInputUrl('');
    setAddDialog(null);
  }

  function deleteSubject(id: string) {
    const tIds = topics.filter(t => t.subjectId === id).map(t => t.id);
    const stIds = subtopics.filter(st => tIds.includes(st.topicId)).map(st => st.id);
    setVideos(vs => vs.filter(v => !stIds.includes(v.subtopicId || '')));
    setSubtopics(s => s.filter(st => !tIds.includes(st.topicId)));
    setTopics(t => t.filter(t => t.subjectId !== id));
    setSubjects(s => s.filter(s => s.id !== id));
  }

  const STATUS_COLORS: Record<string, string> = { completed: 'text-emerald-500', revise: 'text-amber-500', important: 'text-violet-500', pending: 'text-muted-foreground' };
  const STATUS_LABELS: Record<string, string> = { completed: 'Done', revise: 'Revise', important: 'Important', pending: 'Pending' };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Library</h1>
          <p className="text-sm text-muted-foreground">Organize your study materials by subject, topic, and subtopic</p>
        </div>
        <Button size="sm" onClick={() => { setInputName(''); setAddDialog({ type: 'subject' }); }}>
          <Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Add Subject</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {subjects.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <VideoIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No subjects yet</p>
            <p className="text-sm mt-1">Add a subject to start organizing your study materials</p>
          </div>
        )}
        <div className="space-y-2">
          {subjects.map(subject => {
            const subjectTopics = topics.filter(t => t.subjectId === subject.id);
            const prog = getSubjectProgress(subject.id);
            const expanded = expandedSubjects.has(subject.id);
            return (
              <div key={subject.id} className="rounded-lg border border-border overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSubject(subject.id)}
                >
                  {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subject.color }} />
                  <span className="font-semibold flex-1">{subject.name}</span>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{subjectTopics.length} topics</span>
                    <div className="flex items-center gap-2 w-24">
                      <Progress value={prog} className="h-1.5 flex-1" />
                      <span className="text-xs w-8">{prog}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setInputName(''); setAddDialog({ type: 'topic', parentId: subject.id }); }}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => deleteSubject(subject.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-border">
                    {subjectTopics.map(topic => {
                      const topicSubtopics = subtopics.filter(st => st.topicId === topic.id);
                      const topicProg = getTopicProgress(topic.id);
                      const topicExpanded = expandedTopics.has(topic.id);
                      return (
                        <div key={topic.id}>
                          <div
                            className="flex items-center gap-3 px-6 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => toggleTopic(topic.id)}
                          >
                            {topicExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                            <span className="font-medium flex-1 text-sm">{topic.name}</span>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{topicSubtopics.length} subtopics</span>
                              <div className="flex items-center gap-2 w-20">
                                <Progress value={topicProg} className="h-1 flex-1" />
                                <span className="w-8">{topicProg}%</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
                              <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => { setInputName(''); setAddDialog({ type: 'subtopic', parentId: topic.id }); }}>
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-destructive hover:text-destructive" onClick={() => setTopics(ts => ts.filter(t => t.id !== topic.id))}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {topicExpanded && (
                            <div className="bg-muted/10">
                              {topicSubtopics.map(subtopic => {
                                const subVideos = videos.filter(v => v.subtopicId === subtopic.id);
                                const stProg = getSubtopicProgress(subtopic.id);
                                const stExpanded = expandedSubtopics.has(subtopic.id);
                                return (
                                  <div key={subtopic.id}>
                                    <div
                                      className="flex items-center gap-3 px-10 py-2 cursor-pointer hover:bg-muted/20 transition-colors"
                                      onClick={() => toggleSubtopic(subtopic.id)}
                                    >
                                      {stExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                                      <span className="text-sm flex-1 text-muted-foreground">{subtopic.name}</span>
                                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span>{subVideos.length} videos</span>
                                        <div className="flex items-center gap-2 w-16">
                                          <Progress value={stProg} className="h-1 flex-1" />
                                          <span className="w-6">{stProg}%</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
                                        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => { setInputName(''); setInputUrl(''); setAddDialog({ type: 'video', parentId: subtopic.id }); }}>
                                          <Plus className="w-3 h-3" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-6 px-2 text-destructive hover:text-destructive" onClick={() => setSubtopics(s => s.filter(st => st.id !== subtopic.id))}>
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    {stExpanded && (
                                      <div className="px-14 pb-2 space-y-1">
                                        {subVideos.map(video => (
                                          <Link key={video.id} href={`/player/${video.id}?from=library`}>
                                            <div className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted/30 transition-colors cursor-pointer group">
                                              <img src={video.thumbnail} alt={video.title} className="w-14 h-8 object-cover rounded flex-shrink-0" />
                                              <span className="text-sm flex-1 line-clamp-1">{video.title}</span>
                                              <span className={cn("text-xs font-medium", STATUS_COLORS[video.status])}>
                                                {STATUS_LABELS[video.status]}
                                              </span>
                                              <Progress value={video.progress} className="h-1 w-12" />
                                              <Button
                                                size="sm" variant="ghost" className="h-6 px-1 opacity-0 group-hover:opacity-100"
                                                onClick={e => { e.preventDefault(); setVideos(vs => vs.filter(v => v.id !== video.id)); }}
                                              >
                                                <Trash2 className="w-3 h-3 text-destructive" />
                                              </Button>
                                            </div>
                                          </Link>
                                        ))}
                                        {subVideos.length === 0 && (
                                          <p className="text-xs text-muted-foreground px-3 py-2">No videos yet.</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {subjectTopics.length === 0 && (
                      <p className="text-xs text-muted-foreground px-6 py-3">No topics yet.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!addDialog} onOpenChange={() => { setAddDialog(null); setInputName(''); setInputUrl(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {addDialog?.type === 'subject' ? 'Subject' : addDialog?.type === 'topic' ? 'Topic' : addDialog?.type === 'subtopic' ? 'Subtopic' : 'Video'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder={addDialog?.type === 'video' ? 'Video title (optional)' : 'Name'} value={inputName} onChange={e => setInputName(e.target.value)} />
            {addDialog?.type === 'video' && (
              <Input placeholder="YouTube URL or Video ID" value={inputUrl} onChange={e => setInputUrl(e.target.value)} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialog(null); setInputName(''); setInputUrl(''); }}>Cancel</Button>
            <Button onClick={handleAdd}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
