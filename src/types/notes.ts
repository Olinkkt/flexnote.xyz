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

export interface FlashcardSRS {
  interval: number; // Interval do příštího opakování ve dnech
  repetition: number; // Počet po sobě jdoucích úspěšných zkoušení
  easeFactor: number; // Multiplikátor snadnosti (výchozí 2.5, min 1.3)
  dueDate: number; // Timestamp v ms, kdy má student pojem zopakovat
  lastReviewedAt?: number; // Timestamp posledního zkoušení
  lapses: number; // Počet selhání ("Neumím to!") – indikátor potíží
  stability: number; // Odhadovaná stabilita paměťové stopy (ve dnech)
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  category?: 'formula' | 'concept' | 'fact' | 'general';
  hint?: string;
  srs?: FlashcardSRS;
}

export type QuizQuestionType = 'multiple-choice' | 'fill-in' | 'matching';

export interface MultipleChoiceQuestion {
  id: string;
  type: 'multiple-choice';
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface FillInQuestion {
  id: string;
  type: 'fill-in';
  sentenceBefore: string;
  blankAnswer: string;
  sentenceAfter: string;
  options?: string[];
  explanation?: string;
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface MatchingQuestion {
  id: string;
  type: 'matching';
  instruction: string;
  pairs: MatchingPair[];
  explanation?: string;
}

export type QuizQuestion = MultipleChoiceQuestion | FillInQuestion | MatchingQuestion;

export interface QuizData {
  questions: QuizQuestion[];
  bestScore?: number;
  lastAttemptAt?: number;
}

export interface NoteItem {
  id: string;
  title: string;
  topic?: string;
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
  flashcards?: FlashcardItem[];
  quiz?: QuizData;
}

export interface TopicGroup {
  id: string;
  name: string;
  subject: SubjectType;
  notes: NoteItem[];
  combinedMarkdown: string;
  totalFlashcards: number;
  bestScore?: number;
  quiz?: QuizData;
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
