export type SubjectType = 'all' | 'czech' | 'maths' | 'history' | 'science';

export interface SubjectMeta {
  id: SubjectType;
  name: string;
  czechName: string;
  flag: string;
  icon: string;
  color: string;
  borderColor: string;
  bgTint: string;
  accent: string;
  description: string;
}

export interface NoteItem {
  id: string;
  title: string;
  subject: SubjectType;
  date: string;
  timestamp: number;
  thumbnailUrl: string;
  markdown: string;
  tags: string[];
  readingTime: string;
  accuracy: number;
  status: 'mastered' | 'learning' | 'new';
  summary: string;
  keyFormulas?: string[];
}

export interface LearningNode {
  id: string;
  title: string;
  type: 'lesson' | 'quiz' | 'chest' | 'trophy';
  status: 'completed' | 'current' | 'locked';
  stars: number;
  maxStars: number;
  noteId?: string;
}

export interface LearningUnit {
  id: string;
  subject: SubjectType;
  unitNumber: number;
  title: string;
  description: string;
  color: string;
  badge: string;
  nodes: LearningNode[];
}

export interface UserStats {
  streakDays: number;
  gems: number;
  xp: number;
  notesScannedToday: number;
  dailyGoal: number;
  hearts: number;
}
