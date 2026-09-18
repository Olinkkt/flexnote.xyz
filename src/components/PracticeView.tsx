import React, { useState, useMemo } from 'react';
import {
  Brain,
  Sparkles,
  Layers,
  ChevronRight,
  ChevronDown,
  Camera,
  Search,
  X,
  Loader2,
  CheckCircle2,
  FileQuestion,
  Trophy,
  Award,
  BookOpen,
  Files,
  AlertCircle,
  Flame,
  RotateCw
} from 'lucide-react';
import { NoteItem, SubjectMeta, FlashcardItem, QuizData, SubjectType, TopicGroup } from '../types/notes';
import { playPopSound, playSuccessChime } from '../utils/audio';
import { SubjectIcon } from './SubjectIcon';
import { FlashcardModal } from './FlashcardModal';
import { QuizModal } from './QuizModal';
import { generateFlashcardsForNote } from '../services/flashcards';
import {
  CardWithNote,
  getDueCards,
  getTroublesomeCards,
  getSRSOverviewStats,
  isDueForReview,
  isTroublesome
} from '../services/srs';

interface PracticeViewProps {
  notes: NoteItem[];
  allNotes: NoteItem[];
  subjects: SubjectMeta[];
  selectedSubject: SubjectType;
  onUpdateFlashcards: (noteId: string, flashcards: FlashcardItem[]) => Promise<void> | void;
  onUpdateQuiz: (noteId: string, quiz: QuizData) => Promise<void> | void;
  onOpenScan: () => void;
}

export const PracticeView: React.FC<PracticeViewProps> = ({
  notes,
  allNotes,
  subjects,
  selectedSubject,
  onUpdateFlashcards,
  onUpdateQuiz,
  onOpenScan,
}) => {
  const [activeTopicForCards, setActiveTopicForCards] = useState<TopicGroup | null>(null);
  const [activeTopicForQuiz, setActiveTopicForQuiz] = useState<TopicGroup | null>(null);
  const [customSRSSession, setCustomSRSSession] = useState<{
    cards: CardWithNote[];
    title: string;
  } | null>(null);
  const [expandedTopicIds, setExpandedTopicIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'due' | 'troublesome' | 'flashcards' | 'quiz'>('all');

  // SRS calculations
  const srsStats = useMemo(() => {
    return getSRSOverviewStats(allNotes, selectedSubject);
  }, [allNotes, selectedSubject]);

  const dueCards = useMemo(() => {
    return getDueCards(notes, selectedSubject);
  }, [notes, selectedSubject]);

  const troublesomeCards = useMemo(() => {
    return getTroublesomeCards(notes, selectedSubject);
  }, [notes, selectedSubject]);

  // Total flashcards across all user's notes
  const totalCardsCount = allNotes.reduce(
    (sum, n) => sum + (n.flashcards ? n.flashcards.length : 0),
    0
  );

  // Total quizzes created
  const totalQuizzesCount = allNotes.filter(
    (n) => n.quiz && n.quiz.questions && n.quiz.questions.length > 0
  ).length;

  // Total unique topics
  const totalTopicsCount = useMemo(() => {
    const set = new Set(allNotes.map((n) => `${n.subject}:${(n.topic?.trim() || n.title.trim()).toLowerCase()}`));
    return set.size;
  }, [allNotes]);

  const getSubjectMeta = (subjectId: string) => {
    return subjects.find((s) => s.id === subjectId) || subjects[0];
  };

  // Group filtered notes into TopicGroups
  const topicGroups: TopicGroup[] = useMemo(() => {
    const map = new Map<string, TopicGroup>();

    notes.forEach((note) => {
      const topicName = note.topic?.trim() || note.title.trim();
      const key = `${note.subject}:${topicName.toLowerCase()}`;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: topicName,
          subject: note.subject,
          notes: [note],
          combinedMarkdown: note.markdown,
          totalFlashcards: (note.flashcards || []).length,
          bestScore: note.quiz?.bestScore,
          quiz: note.quiz,
        });
      } else {
        const group = map.get(key)!;
        group.notes.push(note);
        group.combinedMarkdown += `\n\n---\n\n${note.markdown}`;
        group.totalFlashcards += (note.flashcards || []).length;
        if (note.quiz?.bestScore !== undefined) {
          group.bestScore = Math.max(group.bestScore || 0, note.quiz.bestScore);
        }
        if (note.quiz?.questions && note.quiz.questions.length > 0 && (!group.quiz || !group.quiz.questions?.length)) {
          group.quiz = note.quiz;
        }
      }
    });

    return Array.from(map.values());
  }, [notes]);

  const filteredTopicGroups = useMemo(() => {
    return topicGroups.filter((group) => {
      if (filterMode === 'due') {
        const hasDue = group.notes.some((n) => (n.flashcards || []).some(isDueForReview));
        if (!hasDue) return false;
      }
      if (filterMode === 'troublesome') {
        const hasTrouble = group.notes.some((n) => (n.flashcards || []).some(isTroublesome));
        if (!hasTrouble) return false;
      }
      if (filterMode === 'flashcards' && group.totalFlashcards === 0) return false;
      if (filterMode === 'quiz' && (!group.quiz?.questions || group.quiz.questions.length === 0)) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        group.name.toLowerCase().includes(q) ||
        group.notes.some((n) => n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q))
      );
    });
  }, [topicGroups, filterMode, searchQuery]);

  const toggleTopicExpand = (topicId: string) => {
    playPopSound();
    setExpandedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const handleStartTopicCards = (group: TopicGroup) => {
    playPopSound();
    setActiveTopicForCards(group);
  };

  const handleStartTopicQuiz = (group: TopicGroup) => {
    playPopSound();
    setActiveTopicForQuiz(group);
  };

  return (
    <div className="px-4 py-3 select-none">
      {/* Page Header */}
      <div className="mb-3.5">
        <h2 className="font-feather font-black text-[20px] text-duoGray-charcoal leading-tight flex items-center gap-2">
          <Brain size={22} className="text-sparkBlue" />
          <span>Procvičování témat</span>
        </h2>
        <p className="text-[12px] font-bold text-duoGray-pencil mt-0.5">
          Souhrnné cvičné testy a kartičky propojené napříč celými tématy
        </p>
      </div>

      {/* Overview Statistics Strip */}
      <div className="duo-card p-3.5 mb-3.5 bg-gradient-to-r from-blue-50/70 via-green-50/40 to-white border-2 border-sparkBlue/30 flex items-center justify-around">
        <div className="text-center">
          <div className="font-feather font-black text-lg text-sparkBlue">
            {totalCardsCount}
          </div>
          <div className="text-[10px] font-feather font-bold text-duoGray-pencil uppercase tracking-wider">
            Kartiček celkem
          </div>
        </div>

        <div className="w-px h-8 bg-gray-200" />

        <div className="text-center">
          <div className={`font-feather font-black text-lg ${dueCards.length > 0 ? 'text-amber-600' : 'text-duoGray-charcoal'}`}>
            {dueCards.length}
          </div>
          <div className="text-[10px] font-feather font-bold text-duoGray-pencil uppercase tracking-wider">
            K opakování
          </div>
        </div>

        <div className="w-px h-8 bg-gray-200" />

        <div className="text-center">
          <div className={`font-feather font-black text-lg ${troublesomeCards.length > 0 ? 'text-cardinalRed' : 'text-duoGray-charcoal'}`}>
            {troublesomeCards.length}
          </div>
          <div className="text-[10px] font-feather font-bold text-duoGray-pencil uppercase tracking-wider">
            Dělá potíže
          </div>
        </div>

        <div className="w-px h-8 bg-gray-200" />

        <div className="text-center">
          <div className="font-feather font-black text-lg text-eagerGreen">
            {totalQuizzesCount}
          </div>
          <div className="text-[10px] font-feather font-bold text-duoGray-pencil uppercase tracking-wider">
            Testů
          </div>
        </div>
      </div>

      {/* SRS Reminder Card according to Ebbinghaus forgetting curve */}
      {(dueCards.length > 0 || troublesomeCards.length > 0) && (
        <div className="mb-3.5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-red-500/5 to-white border-2 border-amber-500/30 border-b-4 shadow-xs">
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                <Flame size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-feather font-black text-sm text-duoGray-charcoal flex items-center gap-1.5">
                  <span>Chytré opakování (SRS)</span>
                  <span className="text-[10px] uppercase font-feather font-extrabold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md">
                    Ebbinghaus
                  </span>
                </h3>
                <p className="text-[11.5px] font-bold text-duoGray-pencil leading-tight mt-0.5">
                  {troublesomeCards.length > 0
                    ? `Máš ${troublesomeCards.length} pojmů, které ti dělají potíže, a ${dueCards.length} připravených k zopakování.`
                    : `Podle křivky zapomínání je dnes optimální čas zopakovat ${dueCards.length} pojmů.`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {dueCards.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  playPopSound();
                  setCustomSRSSession({
                    cards: dueCards,
                    title: `Dnešní opakování (${dueCards.length})`,
                  });
                }}
                className="duo-btn duo-btn-green py-2 px-3 text-xs font-feather font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RotateCw size={14} />
                <span>Zopakovat dnešní ({dueCards.length})</span>
              </button>
            )}

            {troublesomeCards.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  playPopSound();
                  setCustomSRSSession({
                    cards: troublesomeCards,
                    title: `Problematické pojmy (${troublesomeCards.length})`,
                  });
                }}
                className="duo-btn duo-btn-red py-2 px-3 text-xs font-feather font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <AlertCircle size={14} />
                <span>Procvičit problematické ({troublesomeCards.length})</span>
              </button>
            )}
          </div>

          {/* List of top troublesome concepts if any */}
          {troublesomeCards.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-amber-500/20">
              <div className="text-[10.5px] font-feather font-black uppercase tracking-wider text-duoGray-pencil mb-1.5 flex items-center justify-between">
                <span>Pojmy vyžadující pozornost:</span>
                <span className="text-[10px] font-mono text-cardinalRed font-extrabold">
                  {troublesomeCards.length} celkem
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {troublesomeCards.slice(0, 4).map(({ card, note }) => (
                  <span
                    key={card.id}
                    title={`Předmět: ${note.title}, chyb: ${card.srs?.lapses || 1}×`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-cardinalRed/30 text-duoGray-charcoal text-[11px] font-feather font-bold shadow-2xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cardinalRed" />
                    <span className="truncate max-w-[130px]">{card.front}</span>
                    <span className="text-[10px] text-cardinalRed font-black">
                      {card.srs?.lapses ? `${card.srs.lapses}×` : '1×'}
                    </span>
                  </span>
                ))}
                {troublesomeCards.length > 4 && (
                  <span className="text-[11px] font-feather font-bold text-duoGray-pencil self-center px-1">
                    +{troublesomeCards.length - 4} dalších
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Filter Tabs */}
      <div className="flex items-center gap-2 mb-3.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => {
            playPopSound();
            setFilterMode('all');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-feather font-black uppercase tracking-wider border-2 border-b-4 transition-all cursor-pointer shrink-0 ${
            filterMode === 'all'
              ? 'border-sparkBlue bg-sparkBlue text-white'
              : 'border-duoGray-border bg-white text-duoGray-pencil hover:text-duoGray-charcoal'
          }`}
        >
          Vše ({topicGroups.length})
        </button>

        {dueCards.length > 0 && (
          <button
            type="button"
            onClick={() => {
              playPopSound();
              setFilterMode('due');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-feather font-black uppercase tracking-wider border-2 border-b-4 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              filterMode === 'due'
                ? 'border-eagerGreen bg-eagerGreen text-white'
                : 'border-duoGray-border bg-white text-duoGray-pencil hover:text-duoGray-charcoal'
            }`}
          >
            <RotateCw size={12} />
            <span>K opakování ({dueCards.length})</span>
          </button>
        )}

        {troublesomeCards.length > 0 && (
          <button
            type="button"
            onClick={() => {
              playPopSound();
              setFilterMode('troublesome');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-feather font-black uppercase tracking-wider border-2 border-b-4 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              filterMode === 'troublesome'
                ? 'border-cardinalRed bg-cardinalRed text-white'
                : 'border-duoGray-border bg-white text-duoGray-pencil hover:text-duoGray-charcoal'
            }`}
          >
            <AlertCircle size={12} />
            <span>Dělá potíže ({troublesomeCards.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            playPopSound();
            setFilterMode('flashcards');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-feather font-black uppercase tracking-wider border-2 border-b-4 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            filterMode === 'flashcards'
              ? 'border-sparkBlue bg-sparkBlue text-white'
              : 'border-duoGray-border bg-white text-duoGray-pencil hover:text-duoGray-charcoal'
          }`}
        >
          <Layers size={13} />
          <span>Kartičky</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playPopSound();
            setFilterMode('quiz');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-feather font-black uppercase tracking-wider border-2 border-b-4 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            filterMode === 'quiz'
              ? 'border-sparkBlue bg-sparkBlue text-white'
              : 'border-duoGray-border bg-white text-duoGray-pencil hover:text-duoGray-charcoal'
          }`}
        >
          <FileQuestion size={13} />
          <span>Testy</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-duoGray-faded" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Hledat téma podle názvu nebo klíčových slov..."
          className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-white border-2 border-duoGray-border focus:border-sparkBlue focus:outline-hidden text-xs font-bold text-duoGray-charcoal placeholder:text-duoGray-faded shadow-xs transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => {
              playPopSound();
              setSearchQuery('');
            }}
            title="Vymazat hledání"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-duoGray-faded hover:text-duoGray-charcoal cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Topic Groups List */}
      {filteredTopicGroups.length === 0 ? (
        <div className="duo-card p-8 text-center bg-white">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-duoGray-pencil">
            <Layers size={24} />
          </div>
          <h3 className="font-feather font-black text-sm text-duoGray-charcoal mb-1">
            Žádná témata k procvičování
          </h3>
          <p className="text-xs text-duoGray-pencil mb-4 max-w-[240px] mx-auto">
            {searchQuery.trim()
              ? `Pro dotaz „${searchQuery}“ jsme nenašli žádné téma.`
              : filterMode !== 'all'
              ? 'Pro tento filtr zatím nemáš vytvořené žádné materiály.'
              : 'Nejdříve si vyfoť sešit, ze kterého AI vytvoří kartičky a cvičné testy.'}
          </p>
          {!searchQuery.trim() && filterMode === 'all' && (
            <button
              onClick={() => {
                playPopSound();
                onOpenScan();
              }}
              className="duo-btn duo-btn-green py-2.5 px-4 text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              Vyfotit první sešit
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredTopicGroups.map((group) => {
            const meta = getSubjectMeta(group.subject);
            const cardCount = group.totalFlashcards;
            const quizCount = group.quiz?.questions ? group.quiz.questions.length : 0;
            const bestScore = group.bestScore;
            const isExpanded = expandedTopicIds.has(group.id);
            const pageCount = group.notes.length;
            const topicDueCount = group.notes.reduce(
              (sum, n) => sum + (n.flashcards || []).filter(isDueForReview).length,
              0
            );
            const topicTroubleCount = group.notes.reduce(
              (sum, n) => sum + (n.flashcards || []).filter(isTroublesome).length,
              0
            );

            return (
              <div
                key={group.id}
                className="duo-card p-4 transition-all bg-white flex flex-col justify-between gap-3 border-2 border-duoGray-border hover:border-duoGray-charcoal/30"
              >
                {/* Top Row: Subject Badge + Page count */}
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-duo text-[11px] font-feather font-extrabold uppercase tracking-wide"
                    style={{
                      backgroundColor: meta.bgTint,
                      color: meta.color,
                      border: `1.5px solid ${meta.borderColor}`,
                    }}
                  >
                    <SubjectIcon subject={meta.id} size={13} />
                    <span>{meta.czechName}</span>
                  </span>

                  {/* Multi-page badge */}
                  <button
                    type="button"
                    onClick={() => toggleTopicExpand(group.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-feather font-black text-duoGray-pencil hover:text-duoGray-charcoal bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Files size={12} className="text-sparkBlue" />
                    <span>
                      {pageCount} {pageCount === 1 ? 'stránka' : pageCount < 5 ? 'stránky' : 'stránek'}
                    </span>
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>

                {/* Topic Title & Summary */}
                <div>
                  <h3 className="font-feather font-black text-[16px] text-duoGray-charcoal leading-snug">
                    {group.name}
                  </h3>
                  <p className="text-[12px] text-duoGray-pencil line-clamp-2 mt-1 leading-snug">
                    {group.notes[0]?.summary || `Ucelená kapitola s ${pageCount} částmi ze školního sešitu.`}
                  </p>
                </div>

                {/* Collapsible Pages list if topic has multiple notes or expanded */}
                {isExpanded && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col gap-2 animate-in fade-in duration-150">
                    <div className="text-[10px] font-feather font-black uppercase text-duoGray-pencil tracking-wider">
                      Stránky v této kapitole:
                    </div>
                    {group.notes.map((n, idx) => (
                      <div
                        key={n.id}
                        className="flex items-center justify-between text-xs py-1 border-b border-gray-200 last:border-0"
                      >
                        <span className="font-bold text-duoGray-charcoal truncate flex-1 pr-2">
                          {idx + 1}. {n.title}
                        </span>
                        <span className="text-[10px] text-duoGray-pencil font-medium shrink-0">
                          {n.date}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Status Badges Row */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {cardCount > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sparkBlue/10 text-sparkBlue text-[11px] font-feather font-black">
                      <Layers size={12} />
                      <span>{cardCount} {cardCount === 1 ? 'kartička' : cardCount < 5 ? 'kartičky' : 'kartiček'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-duoGray-pencil text-[11px] font-bold">
                      Bez kartiček
                    </span>
                  )}

                  {topicTroubleCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cardinalRed/10 text-cardinalRed text-[11px] font-feather font-black">
                      <AlertCircle size={11} />
                      <span>{topicTroubleCount} {topicTroubleCount === 1 ? 'problémový' : topicTroubleCount < 5 ? 'problémové' : 'problémových'}</span>
                    </span>
                  )}

                  {topicDueCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 text-[11px] font-feather font-black">
                      <RotateCw size={11} />
                      <span>{topicDueCount} k opakování</span>
                    </span>
                  )}

                  {quizCount > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-eagerGreen/10 text-eagerGreen text-[11px] font-feather font-black">
                      <FileQuestion size={12} />
                      <span>Souhrnný test ({quizCount} otázek)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-duoGray-pencil text-[11px] font-bold">
                      Bez testu
                    </span>
                  )}

                  {bestScore !== undefined && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 text-[11px] font-feather font-black">
                      <Trophy size={11} />
                      <span>{bestScore}%</span>
                    </span>
                  )}
                </div>

                {/* Action Buttons Row */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                  {/* Flashcards Button */}
                  <button
                    type="button"
                    onClick={() => handleStartTopicCards(group)}
                    className={`duo-btn text-xs font-feather font-black uppercase tracking-wider py-1.5 px-3 flex items-center gap-1.5 cursor-pointer ${
                      cardCount > 0 ? 'duo-btn-blue' : 'border-2 border-duoGray-border border-b-4 bg-white text-duoGray-charcoal hover:bg-gray-50'
                    }`}
                  >
                    <Layers size={13} />
                    <span>{cardCount > 0 ? 'Kartičky tématu' : 'Vytvořit kartičky'}</span>
                  </button>

                  {/* Quiz Button */}
                  <button
                    type="button"
                    onClick={() => handleStartTopicQuiz(group)}
                    className="duo-btn duo-btn-green text-xs font-feather font-black uppercase tracking-wider py-1.5 px-3.5 flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileQuestion size={13} />
                    <span>{quizCount > 0 ? 'Souhrnný test' : 'Vytvořit test'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3D Duolingo Flashcard Modal for Custom SRS Session (Due / Troublesome) */}
      {customSRSSession && (
        <FlashcardModal
          customCards={customSRSSession.cards}
          customSessionTitle={customSRSSession.title}
          customSubjectId={selectedSubject !== 'all' ? selectedSubject : undefined}
          subjects={subjects}
          onClose={() => setCustomSRSSession(null)}
          onUpdateFlashcards={async (noteId, flashcards) => {
            await onUpdateFlashcards(noteId, flashcards);
          }}
        />
      )}

      {/* 3D Duolingo Flashcard Modal for Topic */}
      {activeTopicForCards && (
        <FlashcardModal
          topicGroup={activeTopicForCards}
          subjects={subjects}
          onClose={() => setActiveTopicForCards(null)}
          onUpdateFlashcards={async (noteId, flashcards) => {
            await onUpdateFlashcards(noteId, flashcards);
          }}
        />
      )}

      {/* Interactive Practice Quiz Modal for Topic */}
      {activeTopicForQuiz && (
        <QuizModal
          topicGroup={activeTopicForQuiz}
          subjects={subjects}
          onClose={() => setActiveTopicForQuiz(null)}
          onUpdateQuiz={async (quiz) => {
            // Persist the unified quiz to all notes belonging to this topic
            for (const note of activeTopicForQuiz.notes) {
              await onUpdateQuiz(note.id, quiz);
            }
            setActiveTopicForQuiz((prev) => (prev ? { ...prev, quiz, bestScore: quiz.bestScore } : null));
          }}
        />
      )}
    </div>
  );
};
