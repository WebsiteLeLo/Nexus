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
  youtubePlaylistUrl?: string;
  videoIds: string[];
  createdAt: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'link' | 'drive';
  url: string;
  folderId?: string;
  tags: string[];
  addedAt: string;
}

export interface Folder {
  id: string;
  parentId?: string;
  name: string;
  order: number;
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

// Initial Mock Data
export const INITIAL_SUBJECTS: Subject[] = [
  { id: 'sub1', name: 'Physics', icon: 'Atom', color: '#6366f1', createdAt: new Date().toISOString() },
  { id: 'sub2', name: 'Mathematics', icon: 'Sigma', color: '#10b981', createdAt: new Date().toISOString() },
  { id: 'sub3', name: 'Computer Science', icon: 'Code', color: '#f59e0b', createdAt: new Date().toISOString() }
];

export const INITIAL_TOPICS: Topic[] = [
  { id: 'top1', subjectId: 'sub1', name: 'Mechanics', order: 1 },
  { id: 'top2', subjectId: 'sub1', name: 'Quantum Physics', order: 2 },
  { id: 'top3', subjectId: 'sub2', name: 'Calculus', order: 1 },
  { id: 'top4', subjectId: 'sub3', name: 'Algorithms', order: 1 }
];

export const INITIAL_SUBTOPICS: Subtopic[] = [
  { id: 'subt1', topicId: 'top1', name: 'Kinematics', order: 1 },
  { id: 'subt2', topicId: 'top1', name: 'Newton\'s Laws', order: 2 },
  { id: 'subt3', topicId: 'top2', name: 'Wave Functions', order: 1 },
  { id: 'subt4', topicId: 'top3', name: 'Derivatives', order: 1 },
  { id: 'subt5', topicId: 'top4', name: 'Sorting Algorithms', order: 1 }
];

export const INITIAL_VIDEOS: Video[] = [
  {
    id: 'v1',
    url: 'https://www.youtube.com/watch?v=ZM8ECpBuQYE',
    youtubeId: 'ZM8ECpBuQYE',
    title: 'Introduction to Kinematics',
    thumbnail: 'https://img.youtube.com/vi/ZM8ECpBuQYE/mqdefault.jpg',
    description: 'A complete introduction to kinematics and motion.',
    subtopicId: 'subt1',
    status: 'completed',
    progress: 100,
    lastTimestamp: 0,
    duration: 720,
    order: 1,
    addedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'v2',
    url: 'https://www.youtube.com/watch?v=kKKM8Y-u7ds',
    youtubeId: 'kKKM8Y-u7ds',
    title: 'Newton\'s Laws of Motion Explained',
    thumbnail: 'https://img.youtube.com/vi/kKKM8Y-u7ds/mqdefault.jpg',
    description: 'Deep dive into Newton\'s three laws of motion.',
    subtopicId: 'subt2',
    status: 'revise',
    progress: 65,
    lastTimestamp: 468,
    duration: 900,
    order: 1,
    addedAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'v3',
    url: 'https://www.youtube.com/watch?v=p_di4Zn4wz4',
    youtubeId: 'p_di4Zn4wz4',
    title: 'Derivatives from First Principles',
    thumbnail: 'https://img.youtube.com/vi/p_di4Zn4wz4/mqdefault.jpg',
    description: 'Understanding derivatives using limits.',
    subtopicId: 'subt4',
    status: 'important',
    progress: 30,
    lastTimestamp: 180,
    duration: 1200,
    order: 1,
    addedAt: new Date().toISOString()
  },
  {
    id: 'v4',
    url: 'https://www.youtube.com/watch?v=yKVmx2B7pPE',
    youtubeId: 'yKVmx2B7pPE',
    title: 'Quick Sort Algorithm',
    thumbnail: 'https://img.youtube.com/vi/yKVmx2B7pPE/mqdefault.jpg',
    description: 'Visual explanation of quicksort with complexity analysis.',
    subtopicId: 'subt5',
    status: 'pending',
    progress: 0,
    lastTimestamp: 0,
    duration: 600,
    order: 1,
    addedAt: new Date().toISOString()
  }
];

export const INITIAL_NOTES: Note[] = [
  {
    id: 'n1',
    videoId: 'v1',
    timestamp: 45,
    content: '**Key formula**: v = u + at\n\nRemember: u is initial velocity, a is acceleration, t is time.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'n2',
    videoId: 'v2',
    timestamp: 120,
    content: 'Newton\'s 1st Law: An object remains at rest or uniform motion unless acted upon by a net force.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
