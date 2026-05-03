import { useState, useMemo, useCallback } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { FileItem, FileItemType, Folder } from "@/lib/types";
import { generateId, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, FolderOpen, Folder as FolderIcon, File, FileImage, Link as LinkIcon,
  ExternalLink, Trash2, Eye, X, ChevronRight, ChevronDown, Search,
  FileText, FileVideo, FileSpreadsheet, Presentation, Download,
  HardDrive, Loader2, AlertCircle, Home, LayoutGrid, List, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
const TAG_OPTIONS = ['formula', 'revision', 'important', 'reference', 'summary', 'exercise'];

/* ── Drive helpers ──────────────────────────────────────────────────────── */
function extractDriveFolderId(url: string): string | null {
  const m = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim()) ? url.trim() : null);
}

function mimeToType(mime: string): FileItemType {
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/') || mime === 'application/vnd.google-apps.video') return 'video';
  if (mime === 'application/vnd.google-apps.document') return 'doc';
  if (mime === 'application/vnd.google-apps.spreadsheet') return 'sheet';
  if (mime === 'application/vnd.google-apps.presentation') return 'slide';
  return 'drive';
}

function getPreviewUrl(file: FileItem): string {
  if (!file.driveFileId) return file.url;
  const id = file.driveFileId;
  const m = file.mimeType ?? '';
  if (m === 'application/vnd.google-apps.document')     return `https://docs.google.com/document/d/${id}/preview`;
  if (m === 'application/vnd.google-apps.spreadsheet')  return `https://docs.google.com/spreadsheets/d/${id}/preview`;
  if (m === 'application/vnd.google-apps.presentation') return `https://docs.google.com/presentation/d/${id}/preview`;
  return `https://drive.google.com/file/d/${id}/preview`;
}

function canPreviewInline(file: FileItem): boolean {
  const t = file.type;
  return t === 'pdf' || t === 'image' || t === 'video' || t === 'doc' || t === 'sheet' || t === 'slide' ||
    (t === 'drive' && !!file.driveFileId);
}

async function fetchDriveContents(
  folderId: string, apiKey: string
): Promise<{ id: string; name: string; mimeType: string; webViewLink: string }[]> {
  const items: { id: string; name: string; mimeType: string; webViewLink: string }[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', `'${folderId}' in parents and trashed=false`);
    url.searchParams.set('fields', 'nextPageToken,files(id,name,mimeType,webViewLink)');
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('key', apiKey);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? `Drive API error ${res.status}`);
    }
    const data = await res.json();
    items.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return items;
}

async function importDriveFolder(
  driveId: string,
  apiKey: string,
  parentLocalId: string | undefined,
  depth: number,
  onStatus: (msg: string) => void,
  accFolders: Folder[],
  accFiles: FileItem[]
): Promise<string /* localId */> {
  // get folder name
  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${driveId}?fields=name&key=${apiKey}`
  );
  if (!metaRes.ok) throw new Error(`Cannot access folder. Make sure it is shared publicly.`);
  const { name: folderName } = await metaRes.json();

  const localId = generateId();
  accFolders.push({
    id: localId, parentId: parentLocalId, name: folderName,
    order: accFolders.filter(f => f.parentId === parentLocalId).length,
    driveId, importedAt: new Date().toISOString(),
  });

  onStatus(`Scanning "${folderName}"…`);
  const items = await fetchDriveContents(driveId, apiKey);
  const FOLDER_MIME = 'application/vnd.google-apps.folder';

  for (const item of items) {
    if (item.mimeType === FOLDER_MIME) {
      if (depth < 6) {
        await importDriveFolder(item.id, apiKey, localId, depth + 1, onStatus, accFolders, accFiles);
      }
    } else {
      accFiles.push({
        id: generateId(), name: item.name,
        type: mimeToType(item.mimeType),
        url: item.webViewLink ?? '',
        folderId: localId, tags: [],
        addedAt: new Date().toISOString(),
        driveFileId: item.id, mimeType: item.mimeType,
      });
    }
  }
  return localId;
}

/* ── File icon ──────────────────────────────────────────────────────────── */
function FileIcon({ type, className }: { type: FileItemType; className?: string }) {
  const cls = cn("w-5 h-5", className);
  switch (type) {
    case 'pdf':   return <FileText className={cn(cls, "text-red-400")} />;
    case 'image': return <FileImage className={cn(cls, "text-blue-400")} />;
    case 'video': return <FileVideo className={cn(cls, "text-purple-400")} />;
    case 'doc':   return <FileText className={cn(cls, "text-blue-500")} />;
    case 'sheet': return <FileSpreadsheet className={cn(cls, "text-emerald-500")} />;
    case 'slide': return <Presentation className={cn(cls, "text-amber-500")} />;
    case 'drive': return <HardDrive className={cn(cls, "text-yellow-400")} />;
    default:      return <LinkIcon className={cn(cls, "text-muted-foreground")} />;
  }
}

function typeBadgeColor(type: FileItemType) {
  const map: Record<string, string> = {
    pdf: 'bg-red-500/10 text-red-400',
    image: 'bg-blue-500/10 text-blue-400',
    video: 'bg-purple-500/10 text-purple-400',
    doc: 'bg-blue-600/10 text-blue-500',
    sheet: 'bg-emerald-500/10 text-emerald-500',
    slide: 'bg-amber-500/10 text-amber-500',
  };
  return map[type] ?? 'bg-muted text-muted-foreground';
}

/* ── Count files in a folder including all descendant subfolders ─────────── */
function countFilesRecursive(folderId: string, folders: Folder[], files: FileItem[]): number {
  const direct = files.filter(f => f.folderId === folderId).length;
  const children = folders.filter(f => f.parentId === folderId);
  return direct + children.reduce((sum, c) => sum + countFilesRecursive(c.id, folders, files), 0);
}

/* ── Recursive sidebar folder tree ──────────────────────────────────────── */
function FolderNode({
  folder, folders, files, currentId, expanded, onSelect, onToggle, onDelete, depth,
}: {
  folder: Folder;
  folders: Folder[];
  files: FileItem[];
  currentId: string | null;
  expanded: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  depth: number;
}) {
  const children = folders.filter(f => f.parentId === folder.id);
  const fileCount = countFilesRecursive(folder.id, folders, files);
  const isOpen = expanded.has(folder.id);
  const isSelected = currentId === folder.id;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 rounded text-sm cursor-pointer group transition-colors",
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <button
          className="p-0.5 flex-shrink-0"
          onClick={e => { e.stopPropagation(); onToggle(folder.id); }}
        >
          {children.length > 0
            ? (isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)
            : <span className="w-3.5 h-3.5 block" />
          }
        </button>
        <button
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
          onClick={() => onSelect(folder.id)}
        >
          {folder.driveId
            ? <HardDrive className="w-3.5 h-3.5 flex-shrink-0 text-yellow-400" />
            : <FolderIcon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
          }
          <span className="truncate">{folder.name}</span>
          <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">{fileCount}</span>
        </button>
        <button
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive flex-shrink-0"
          onClick={e => { e.stopPropagation(); onDelete(folder.id); }}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      {isOpen && children.map(child => (
        <FolderNode
          key={child.id}
          folder={child} folders={folders} files={files}
          currentId={currentId} expanded={expanded}
          onSelect={onSelect} onToggle={onToggle} onDelete={onDelete}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Main page
══════════════════════════════════════════════════════════════════════════ */
export default function Files() {
  const [files,   setFiles]   = useLocalStorage<FileItem[]>('nexus-files',   []);
  const [folders, setFolders] = useLocalStorage<Folder[]>('nexus-folders', []);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search,    setSearch]    = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [viewMode,  setViewMode]  = useState<'grid' | 'list'>('grid');
  const [preview,   setPreview]   = useState<FileItem | null>(null);

  /* ── add-file form ── */
  const [showAdd,    setShowAdd]    = useState(false);
  const [showAddDir, setShowAddDir] = useState(false);
  const [newDirName, setNewDirName] = useState('');
  const [form, setForm] = useState<{ name: string; url: string; type: FileItemType; tags: string[]; folderId: string }>({
    name: '', url: '', type: 'link', tags: [], folderId: '',
  });

  /* ── drive import ── */
  const [showImport,    setShowImport]    = useState(false);
  const [importUrl,     setImportUrl]     = useState('');
  const [importing,     setImporting]     = useState(false);
  const [importStatus,  setImportStatus]  = useState('');
  const [importError,   setImportError]   = useState('');
  const [importPreview, setImportPreview] = useState<{ name: string; id: string } | null>(null);

  /* ── derived ── */
  const rootFolders = useMemo(() => folders.filter(f => !f.parentId), [folders]);

  const breadcrumb = useMemo(() => {
    const crumbs: Folder[] = [];
    let id = currentFolderId;
    while (id) {
      const f = folders.find(x => x.id === id);
      if (!f) break;
      crumbs.unshift(f);
      id = f.parentId ?? null;
    }
    return crumbs;
  }, [currentFolderId, folders]);

  const subfolders = useMemo(
    () => folders.filter(f => f.parentId === currentFolderId),
    [folders, currentFolderId]
  );

  const displayedFiles = useMemo(() => {
    return files.filter(f => {
      const matchFolder = currentFolderId === null
        ? true
        : f.folderId === currentFolderId;
      const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
      const matchTag = !tagFilter || f.tags.includes(tagFilter);
      return matchFolder && matchSearch && matchTag;
    });
  }, [files, currentFolderId, search, tagFilter]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    files.forEach(f => f.tags.forEach(t => s.add(t)));
    return [...s];
  }, [files]);

  /* ── actions ── */
  function toggleExpanded(id: string) {
    setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function deleteFolder(id: string) {
    const collectIds = (fid: string): string[] => {
      const children = folders.filter(f => f.parentId === fid).flatMap(f => collectIds(f.id));
      return [fid, ...children];
    };
    const ids = collectIds(id);
    setFiles(fs => fs.filter(f => !ids.includes(f.folderId ?? '')));
    setFolders(fs => fs.filter(f => !ids.includes(f.id)));
    if (ids.includes(currentFolderId ?? '')) setCurrentFolderId(null);
  }

  function addFile() {
    if (!form.name.trim() || !form.url.trim()) return;
    setFiles(fs => [...fs, {
      id: generateId(), name: form.name.trim(), url: form.url.trim(),
      type: form.type, folderId: form.folderId || currentFolderId || undefined,
      tags: form.tags, addedAt: new Date().toISOString(),
    }]);
    setForm({ name: '', url: '', type: 'link', tags: [], folderId: '' });
    setShowAdd(false);
  }

  function addDir() {
    if (!newDirName.trim()) return;
    setFolders(fs => [...fs, {
      id: generateId(), name: newDirName.trim(),
      parentId: currentFolderId ?? undefined,
      order: fs.filter(f => f.parentId === currentFolderId).length,
    }]);
    setNewDirName('');
    setShowAddDir(false);
  }

  /* ── Drive import ── */
  async function handleCheckImport() {
    if (!importUrl.trim() || !API_KEY) return;
    const id = extractDriveFolderId(importUrl.trim());
    if (!id) { setImportError('Could not find a folder ID in that URL.'); return; }
    setImporting(true); setImportError(''); setImportPreview(null);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=name,id&key=${API_KEY}`);
      if (!res.ok) throw new Error('Folder not found or not publicly shared.');
      const data = await res.json();
      setImportPreview({ name: data.name, id });
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : 'Failed to fetch folder.');
    } finally { setImporting(false); }
  }

  async function handleImport() {
    if (!importPreview || !API_KEY) return;
    setImporting(true); setImportError('');
    const newFolders: Folder[] = [];
    const newFiles: FileItem[] = [];
    try {
      const rootId = await importDriveFolder(
        importPreview.id, API_KEY,
        currentFolderId ?? undefined, 0,
        msg => setImportStatus(msg),
        newFolders, newFiles,
      );
      setFolders(fs => [...fs, ...newFolders]);
      setFiles(fs => [...fs, ...newFiles]);
      // expand the root and navigate into it
      setExpanded(s => { const n = new Set(s); n.add(rootId); return n; });
      setCurrentFolderId(rootId);
      setShowImport(false); setImportUrl(''); setImportPreview(null); setImportStatus('');
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : 'Import failed.');
    } finally { setImporting(false); }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">File Manager</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">Organize resources, import Google Drive folders</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => { setImportUrl(''); setImportError(''); setImportPreview(null); setShowImport(true); }}>
            <HardDrive className="w-4 h-4 sm:mr-2 text-yellow-400" /><span className="hidden sm:inline">Import Drive</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAddDir(true)}>
            <FolderIcon className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">New Folder</span>
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Add File</span>
          </Button>
        </div>
      </div>

      {/* Mobile: horizontal folder pills */}
      <div className="md:hidden flex items-center gap-2 px-3 py-2 overflow-x-auto border-b flex-shrink-0 scrollbar-none">
        <button
          className={`flex items-center gap-1.5 whitespace-nowrap text-xs px-3 py-1.5 rounded-full font-medium flex-shrink-0 transition-colors ${currentFolderId === null ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
          onClick={() => setCurrentFolderId(null)}
        >
          <Home className="w-3.5 h-3.5" />All
        </button>
        {rootFolders.map(f => (
          <button key={f.id}
            className={`flex items-center gap-1.5 whitespace-nowrap text-xs px-3 py-1.5 rounded-full font-medium flex-shrink-0 transition-colors max-w-[130px] truncate ${currentFolderId === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
            onClick={() => setCurrentFolderId(f.id)}
          >
            {f.driveId ? <HardDrive className="w-3 h-3 flex-shrink-0" /> : <FolderIcon className="w-3 h-3 flex-shrink-0" />}
            <span className="truncate">{f.name}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* ── Sidebar — desktop only ──────────────────────────────────── */}
        <div className="hidden md:flex md:flex-col w-56 border-r flex-shrink-0 overflow-y-auto">
          <div className="p-2">
            {/* All Files */}
            <button
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors",
                currentFolderId === null ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
              )}
              onClick={() => setCurrentFolderId(null)}
            >
              <Home className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">All Files</span>
              <Badge variant="secondary" className="text-xs">{files.length}</Badge>
            </button>

            {/* Folder tree */}
            <div className="mt-1 space-y-0.5">
              {rootFolders.map(f => (
                <FolderNode
                  key={f.id}
                  folder={f} folders={folders} files={files}
                  currentId={currentFolderId} expanded={expanded}
                  onSelect={setCurrentFolderId}
                  onToggle={toggleExpanded}
                  onDelete={deleteFolder}
                  depth={0}
                />
              ))}
            </div>

            {/* Tags */}
            {allTags.length > 0 && (
              <div className="mt-4 px-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {allTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={tagFilter === tag ? 'default' : 'secondary'}
                      className="cursor-pointer text-xs"
                      onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                    >{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar: breadcrumb + search + view toggle */}
          <div className="px-4 py-2.5 border-b flex-shrink-0 flex items-center gap-3">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-sm flex-1 min-w-0">
              <button
                className="hover:text-primary transition-colors flex-shrink-0"
                onClick={() => setCurrentFolderId(null)}
              >
                <Home className="w-4 h-4" />
              </button>
              {breadcrumb.map((crumb, i) => (
                <span key={crumb.id} className="flex items-center gap-1 min-w-0">
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <button
                    className={cn(
                      "hover:text-primary transition-colors truncate",
                      i === breadcrumb.length - 1 ? "font-medium" : "text-muted-foreground"
                    )}
                    onClick={() => setCurrentFolderId(crumb.id)}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search files…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-7 text-sm w-44"
                />
                {search && <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}><X className="w-3 h-3 text-muted-foreground" /></button>}
              </div>
              <button
                className={cn("p-1.5 rounded transition-colors", viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50')}
                onClick={() => setViewMode('grid')}
              ><LayoutGrid className="w-4 h-4" /></button>
              <button
                className={cn("p-1.5 rounded transition-colors", viewMode === 'list' ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50')}
                onClick={() => setViewMode('list')}
              ><List className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Files + subfolders */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Back button when inside a folder */}
            {currentFolderId && (
              <button
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                onClick={() => {
                  const cur = folders.find(f => f.id === currentFolderId);
                  setCurrentFolderId(cur?.parentId ?? null);
                }}
              >
                <ArrowLeft className="w-4 h-4" />Back
              </button>
            )}

            {/* Subfolders */}
            {subfolders.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Folders</p>
                <div className={cn(
                  viewMode === 'grid'
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                    : "space-y-1"
                )}>
                  {subfolders.map(sub => {
                    const cnt = countFilesRecursive(sub.id, folders, files);
                    return (
                      <div
                        key={sub.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border cursor-pointer hover:bg-muted/40 transition-colors group",
                          viewMode === 'grid' ? "flex-col p-4 text-center" : "px-3 py-2"
                        )}
                        onClick={() => { setCurrentFolderId(sub.id); setExpanded(s => { const n = new Set(s); n.add(sub.id); return n; }); }}
                      >
                        {sub.driveId
                          ? <HardDrive className={cn("text-yellow-400", viewMode === 'grid' ? "w-8 h-8 mb-1" : "w-5 h-5 flex-shrink-0")} />
                          : <FolderOpen className={cn("text-amber-400", viewMode === 'grid' ? "w-8 h-8 mb-1" : "w-5 h-5 flex-shrink-0")} />
                        }
                        <div className={cn("min-w-0", viewMode === 'grid' ? "w-full text-center" : "flex-1")}>
                          <p className={cn("text-sm font-medium", viewMode === 'grid' ? "line-clamp-2 break-words" : "truncate")}>{sub.name}</p>
                          <p className="text-xs text-muted-foreground">{cnt} files</p>
                        </div>
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive flex-shrink-0"
                          onClick={e => { e.stopPropagation(); deleteFolder(sub.id); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Files */}
            {displayedFiles.length === 0 && subfolders.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <File className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">
                  {files.length === 0 ? 'No files yet' : 'No files match your filter'}
                </p>
                {files.length === 0 && (
                  <p className="text-xs mt-1">Import a Google Drive folder or add files manually.</p>
                )}
              </div>
            ) : displayedFiles.length > 0 && (
              <>
                {subfolders.length > 0 && (
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Files</p>
                )}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {displayedFiles.map(file => (
                      <div
                        key={file.id}
                        className="group relative rounded-lg border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors bg-card"
                        onClick={() => canPreviewInline(file) ? setPreview(file) : window.open(file.url, '_blank')}
                      >
                        {/* Thumbnail */}
                        <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                          {(file.type === 'image' || file.type === 'pdf') && file.driveFileId ? (
                            <img
                              src={`https://drive.google.com/thumbnail?id=${file.driveFileId}&sz=w200`}
                              alt={file.name}
                              className="w-full h-full object-cover"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <FileIcon type={file.type} className="w-10 h-10 opacity-60" />
                          )}
                        </div>
                        {/* Name + actions */}
                        <div className="p-2">
                          <p className="text-xs font-medium line-clamp-2 leading-snug">{file.name}</p>
                          <span className={cn("inline-block text-xs px-1.5 py-0.5 rounded mt-1 font-medium", typeBadgeColor(file.type))}>
                            {file.type.toUpperCase()}
                          </span>
                        </div>
                        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canPreviewInline(file) && (
                            <button
                              className="p-1 bg-black/60 rounded hover:bg-black/80 text-white"
                              onClick={e => { e.stopPropagation(); setPreview(file); }}
                            ><Eye className="w-3.5 h-3.5" /></button>
                          )}
                          <a href={file.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                            <button className="p-1 bg-black/60 rounded hover:bg-black/80 text-white">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </a>
                          <button
                            className="p-1 bg-black/60 rounded hover:bg-red-500/80 text-white"
                            onClick={e => { e.stopPropagation(); setFiles(fs => fs.filter(f => f.id !== file.id)); }}
                          ><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {displayedFiles.map(file => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer group"
                        onClick={() => canPreviewInline(file) ? setPreview(file) : window.open(file.url, '_blank')}
                      >
                        <FileIcon type={file.type} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">{file.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {file.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs py-0">{tag}</Badge>
                            ))}
                            <span className="text-xs text-muted-foreground">{formatDate(file.addedAt)}</span>
                          </div>
                        </div>
                        <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0", typeBadgeColor(file.type))}>
                          {file.type.toUpperCase()}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                          {canPreviewInline(file) && (
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={e => { e.stopPropagation(); setPreview(file); }}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <a href={file.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" className="h-7 px-2"><ExternalLink className="w-3.5 h-3.5" /></Button>
                          </a>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive"
                            onClick={e => { e.stopPropagation(); setFiles(fs => fs.filter(f => f.id !== file.id)); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ════════════ Dialogs ════════════ */}

      {/* Preview */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center gap-3">
              {preview && <FileIcon type={preview.type} />}
              <DialogTitle className="text-sm font-semibold line-clamp-1 flex-1">{preview?.name}</DialogTitle>
              <a href={preview?.url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />Open in Drive
                </Button>
              </a>
            </div>
          </DialogHeader>
          {preview && (
            <div className="flex-1 overflow-hidden">
              {preview.type === 'image' && preview.driveFileId ? (
                <div className="flex items-center justify-center h-full bg-muted/20 p-4">
                  <img
                    src={`https://drive.google.com/thumbnail?id=${preview.driveFileId}&sz=w1200`}
                    alt={preview.name}
                    className="max-h-full max-w-full object-contain rounded"
                  />
                </div>
              ) : (
                <iframe
                  src={getPreviewUrl(preview)}
                  className="w-full h-full border-0"
                  title={preview.name}
                  allow="autoplay"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Drive folder */}
      <Dialog open={showImport} onOpenChange={v => { if (!importing) setShowImport(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-yellow-400" />Import Google Drive Folder
            </DialogTitle>
            <DialogDescription>
              Paste a public Google Drive folder URL. All files and subfolders will be imported.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="https://drive.google.com/drive/folders/…"
                value={importUrl}
                onChange={e => { setImportUrl(e.target.value); setImportError(''); setImportPreview(null); }}
                disabled={importing}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleCheckImport} disabled={importing || !importUrl.trim() || !API_KEY}>
                {importing && !importPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
              </Button>
            </div>

            {importError && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{importError}
              </div>
            )}

            {importPreview && !importing && (
              <div className="bg-muted/50 rounded-lg px-4 py-3">
                <p className="font-medium text-sm">{importPreview.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">All files and subfolders will be imported recursively.</p>
              </div>
            )}

            {importing && importStatus && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />{importStatus}
              </div>
            )}

            {!API_KEY && (
              <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                No API key found. Add <code className="font-mono text-xs mx-1">VITE_GOOGLE_API_KEY</code> to your secrets.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)} disabled={importing}>Cancel</Button>
            <Button onClick={handleImport} disabled={!importPreview || importing}>
              {importing && importPreview
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</>
                : <><Download className="w-4 h-4 mr-2" />Import</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add file */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add File / Link</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            <Input placeholder="URL or link" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as FileItemType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
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
                  <Badge key={tag} variant={form.tags.includes(tag) ? 'default' : 'outline'} className="cursor-pointer"
                    onClick={() => setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }))}>
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addFile} disabled={!form.name.trim() || !form.url.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New folder */}
      <Dialog open={showAddDir} onOpenChange={setShowAddDir}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Folder{currentFolderId ? ` inside "${folders.find(f => f.id === currentFolderId)?.name}"` : ''}</DialogTitle></DialogHeader>
          <Input placeholder="Folder name" value={newDirName} onChange={e => setNewDirName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDir()} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDir(false)}>Cancel</Button>
            <Button onClick={addDir} disabled={!newDirName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
