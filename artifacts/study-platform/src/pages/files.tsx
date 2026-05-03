import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { FileItem, Folder } from "@/lib/types";
import { generateId, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FolderOpen, File, FileImage, Link as LinkIcon, ExternalLink, Trash2, Eye, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";

const INITIAL_FOLDERS: Folder[] = [
  { id: 'f1', name: 'Physics Notes', order: 1 },
  { id: 'f2', name: 'Math Resources', order: 2 }
];

const INITIAL_FILES: FileItem[] = [
  { id: 'fi1', name: 'Kinematics Cheat Sheet', type: 'link', url: 'https://example.com/kinematics.pdf', folderId: 'f1', tags: ['formula', 'revision'], addedAt: new Date().toISOString() }
];

const TAG_OPTIONS = ['formula', 'revision', 'important', 'reference', 'summary', 'exercise'];

export default function Files() {
  const [files, setFiles] = useLocalStorage<FileItem[]>('nexus-files', INITIAL_FILES);
  const [folders, setFolders] = useLocalStorage<Folder[]>('nexus-folders', INITIAL_FOLDERS);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [showAdd, setShowAdd] = useState(false);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [newFolder, setNewFolder] = useState('');
  const [form, setForm] = useState({ name: '', url: '', type: 'link' as FileItem['type'], tags: [] as string[], folderId: '' });

  const displayedFiles = useMemo(() => {
    return files.filter(f => {
      const matchFolder = selectedFolder === null || f.folderId === selectedFolder;
      const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
      const matchTag = !tagFilter || f.tags.includes(tagFilter);
      return matchFolder && matchSearch && matchTag;
    });
  }, [files, selectedFolder, search, tagFilter]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    files.forEach(f => f.tags.forEach(t => s.add(t)));
    return [...s];
  }, [files]);

  function addFile() {
    if (!form.name.trim() || !form.url.trim()) return;
    setFiles(fs => [...fs, {
      id: generateId(),
      name: form.name.trim(),
      url: form.url.trim(),
      type: form.type,
      folderId: form.folderId || undefined,
      tags: form.tags,
      addedAt: new Date().toISOString()
    }]);
    setForm({ name: '', url: '', type: 'link', tags: [], folderId: '' });
    setShowAdd(false);
  }

  function addFolder() {
    if (!newFolder.trim()) return;
    setFolders(fs => [...fs, { id: generateId(), name: newFolder.trim(), order: fs.length + 1 }]);
    setNewFolder('');
    setShowAddFolder(false);
  }

  function getFileIcon(type: FileItem['type']) {
    switch (type) {
      case 'pdf': return <File className="w-4 h-4 text-red-400" />;
      case 'image': return <FileImage className="w-4 h-4 text-blue-400" />;
      case 'drive': return <FolderOpen className="w-4 h-4 text-yellow-400" />;
      default: return <LinkIcon className="w-4 h-4 text-muted-foreground" />;
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">File Manager</h1>
          <p className="text-sm text-muted-foreground">Organize PDFs, links, and resources</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddFolder(true)}>
            <FolderOpen className="w-4 h-4 mr-2" />New Folder
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" />Add File
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-52 border-r flex-shrink-0 overflow-y-auto p-3">
          <button
            className={cn("w-full text-left px-3 py-2 rounded text-sm mb-1 transition-colors flex items-center gap-2",
              selectedFolder === null ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'
            )}
            onClick={() => setSelectedFolder(null)}
          >
            <File className="w-4 h-4" />All Files
            <Badge variant="secondary" className="ml-auto text-xs">{files.length}</Badge>
          </button>
          {folders.map(folder => (
            <div key={folder.id} className="group flex items-center">
              <button
                className={cn("flex-1 text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2",
                  selectedFolder === folder.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'
                )}
                onClick={() => setSelectedFolder(folder.id)}
              >
                <FolderOpen className="w-4 h-4" />
                <span className="flex-1 line-clamp-1">{folder.name}</span>
                <Badge variant="secondary" className="text-xs">{files.filter(f => f.folderId === folder.id).length}</Badge>
              </button>
              <button className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive" onClick={() => setFolders(fs => fs.filter(f => f.id !== folder.id))}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {allTags.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Tags</p>
              <div className="flex flex-wrap gap-1 px-2">
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={tagFilter === tag ? 'default' : 'secondary'}
                    className="cursor-pointer text-xs"
                    onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b flex-shrink-0">
            <div className="relative">
              <Input placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} className="pr-8" />
              {search && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}><X className="w-4 h-4 text-muted-foreground" /></button>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {displayedFiles.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <File className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No files found</p>
              </div>
            )}
            <div className="space-y-2">
              {displayedFiles.map(file => (
                <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors group">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {file.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs py-0">{tag}</Badge>
                      ))}
                      <span className="text-xs text-muted-foreground">{formatDate(file.addedAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    {(file.type === 'pdf' || file.type === 'image') && (
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setPreview(file)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="h-7 px-2">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setFiles(fs => fs.filter(f => f.id !== file.id))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl h-[80vh]">
          <DialogHeader><DialogTitle>{preview?.name}</DialogTitle></DialogHeader>
          {preview?.type === 'pdf' && (
            <iframe src={preview.url} className="flex-1 w-full h-full rounded" title={preview.name} />
          )}
          {preview?.type === 'image' && (
            <img src={preview.url} alt={preview.name} className="max-h-full mx-auto object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>

      {/* Add File Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add File / Link</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input placeholder="URL or link" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as FileItem['type'] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="drive">Google Drive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.folderId || '__none__'} onValueChange={v => setForm(f => ({ ...f, folderId: v === '__none__' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Select folder (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No folder</SelectItem>
                {folders.map(folder => <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div>
              <p className="text-sm font-medium mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {TAG_OPTIONS.map(tag => (
                  <Badge
                    key={tag}
                    variant={form.tags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }))}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addFile}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Folder Dialog */}
      <Dialog open={showAddFolder} onOpenChange={setShowAddFolder}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Folder</DialogTitle></DialogHeader>
          <Input placeholder="Folder name" value={newFolder} onChange={e => setNewFolder(e.target.value)} onKeyDown={e => e.key === 'Enter' && addFolder()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFolder(false)}>Cancel</Button>
            <Button onClick={addFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
