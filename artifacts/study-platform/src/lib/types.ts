export type VideoStatus = 'pending' | 'completed' | 'revise' | 'important';

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  order: number;
}

export interface Subtopic {
  id: string;
  topicId: string;
  name: string;
  order: number;
}

export interface Video {
  id: string;
  url: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
  description: string;
  subtopicId?: string;
  playlistId?: string;
  status: VideoStatus;
  progress: number;
  lastTimestamp: number;
  duration: number;
  order: number;
  addedAt: string;
}

export interface Note {
  id: string;
  videoId: string;
  timestamp: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  youtubePlaylistId?: string;
  youtubePlaylistUrl?: string;
  videoIds: string[];
  createdAt: string;
}

export type FileItemType = 'pdf' | 'image' | 'link' | 'video' | 'doc' | 'sheet' | 'slide' | 'drive';

export interface FileItem {
  id: string;
  name: string;
  type: FileItemType;
  url: string;
  folderId?: string;
  tags: string[];
  addedAt: string;
  driveFileId?: string;
  mimeType?: string;
}

export interface Folder {
  id: string;
  parentId?: string;
  name: string;
  order: number;
  driveId?: string;
  importedAt?: string;
}

export interface PlannerTask {
  id: string;
  date: string;
  text: string;
  completed: boolean;
  order: number;
}

export interface Reminder {
  id: string;
  label: string;
  time: string;
  daysOfWeek: number[];
  enabled: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  focusMode: boolean;
}

export const INITIAL_SUBJECTS: Subject[] = [];
export const INITIAL_TOPICS: Topic[] = [];
export const INITIAL_SUBTOPICS: Subtopic[] = [];
export const INITIAL_VIDEOS: Video[] = [];
export const INITIAL_NOTES: Note[] = [];
