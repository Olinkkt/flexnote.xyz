import React, { useState, useMemo } from 'react';
import {
  Brain,
  Layers,
  ChevronDown,
  Search,
  X,
  FileQuestion,
  Trophy,
  Files,
  AlertCircle,
  Flame,
  RotateCw
} from 'lucide-react';
import { NoteItem, SubjectMeta, FlashcardItem, QuizData, SubjectType, TopicGroup } from '../types/notes';
import { playPopSound } from '../utils/audio';
import { SubjectIcon } from './SubjectIcon';
import { FlashcardModal } from './FlashcardModal';
import { QuizModal } from './QuizModal';
import {
  CardWithNote,
  getDueCards,
  getTroublesomeCards,
  isDueForReview,
  isTroublesome
} from '../services/srs';

interface PracticeViewProps {
  notes: NoteItem[];
  allNotes: NoteItem[];
  subjects: SubjectMeta[];
  selectedSubject: SubjectType;
  userId?: string;
  onUpdateFlashcards: (noteId: string, flashcards: FlashcardItem[]) => Promise<void> | void;
  onUpdateQuiz: (noteId: string, quiz: QuizData) => Promise<void> | void;
  onOpenScan: () => void;
}

export const PracticeView: React.FC<PracticeViewProps> = ({
  notes,
  subjects,
  selectedSubject,
  userId,
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

  const dueCards = useMemo(() => {
    return getDueCards(notes, selectedSubject);
  }, [notes, selectedSubject]);

  const troublesomeCards = useMemo(() => {
    return getTroublesomeCards(notes, selectedSubject);
  }, [notes, selectedSubject]);

  // Combined unique cards to review (troublesome first, then remaining due)
  const srsCardsToReview = useMemo(() => {
    const map = new Map<string, CardWithNote>();
    troublesomeCards.forEach((item) => map.set(item.card.id, item));
    dueCards.forEach((item) => {
      if (!map.has(item.card.id)) {
        map.set(item.card.id, item);
      }
    });
    return Array.from(map.values());
  }, [troublesomeCards, dueCards]);

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
    if (!searchQuery.trim()) return topicGroups;
    const q = searchQuery.toLowerCase();
    return topicGroups.filter(
      (group) =>
        group.name.toLowerCase().includes(q) ||
        group.notes.some((n) => n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q))
    );
  }, [topicGroups, searchQuery]);

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
      {/* Clean Page Header */}
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="font-feather font-black text-xl text-duoGray-charcoal flex items-center gap-2">
          <Brain size={22} className="text-sparkBlue" />
          <span>Procvičování</span>
        </h2>
      </div>

      {/* SRS Reminder Card - Only shown when there are cards to repeat */}
      {srsCardsToReview.length > 0 && (
        <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Flame size={20} className="stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="font-feather font-black text-sm text-duoGray-charcoal leading-tight">
                {troublesomeCards.length > 0 ? 'Problematické pojmy' : 'Dnešní opakování'}
              </div>
              <div className="text-xs text-duoGray-pencil font-bold truncate">
                {troublesomeCards.length > 0
                  ? `${troublesomeCards.length} ${troublesomeCards.length === 1 ? 'pojem ti dělá potíže' : troublesomeCards.length < 5 ? 'pojmy ti dělají potíže' : 'pojmů ti dělá potíže'}`
                  : `${dueCards.length} ${dueCards.length === 1 ? 'pojem k zopakování' : dueCards.length < 5 ? 'pojmy k zopakování' : 'pojmů k zopakování'}`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playPopSound();
              const isTrouble = troublesomeCards.length > 0;
              setCustomSRSSession({
                cards: srsCardsToReview,
                title: isTrouble ? 'Problematické pojmy & opakování' : 'Dnešní opakování',
              });
            }}
            className="duo-btn duo-btn-green py-2 px-3.5 text-xs font-feather font-black uppercase tracking-wider shrink-0 cursor-pointer shadow-xs"
          >
            Procvičit ({srsCardsToReview.length})
          </button>
        </div>
      )}

      {/* Search Input Bar (only if more than 2 topics) */}
      {topicGroups.length > 2 && (
        <div className="relative mb-3.5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-duoGray-faded" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hledat téma..."
            className="w-full pl-9 pr-8 py-2 rounded-2xl bg-white border-2 border-duoGray-border focus:border-sparkBlue focus:outline-hidden text-xs font-bold text-duoGray-charcoal placeholder:text-duoGray-faded shadow-xs transition-colors"
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
      )}

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
              : 'Nejdříve si vyfoť sešit, ze kterého AI vytvoří kartičky a testy.'}
          </p>
          {!searchQuery.trim() && (
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
                {/* Top Row: Subject Badge + Page count (if multi-page) */}
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

                  {pageCount > 1 && (
                    <button
                      type="button"
                      onClick={() => toggleTopicExpand(group.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-feather font-black text-duoGray-pencil hover:text-duoGray-charcoal bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Files size={12} className="text-sparkBlue" />
                      <span>{pageCount} {pageCount < 5 ? 'stránky' : 'stránek'}</span>
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  )}
                </div>

                {/* Topic Title */}
                <div>
                  <h3 className="font-feather font-black text-[16px] text-duoGray-charcoal leading-snug">
                    {group.name}
                  </h3>
                </div>

                {/* Collapsible Pages list if topic has multiple notes and expanded */}
                {isExpanded && pageCount > 1 && (
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

                {/* Status & Action Buttons Row */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {topicTroubleCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-cardinalRed text-[11px] font-feather font-black">
                        <AlertCircle size={12} />
                        <span>{topicTroubleCount} k procvičení</span>
                      </span>
                    ) : topicDueCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 text-[11px] font-feather font-black">
                        <RotateCw size={12} />
                        <span>{topicDueCount} k opakování</span>
                      </span>
                    ) : null}

                    {bestScore !== undefined && (
                      <span className="inline-flex items-center gap-1 text-amber-600 text-[11px] font-feather font-black">
                        <Trophy size={11} />
                        <span>{bestScore}%</span>
                      </span>
                    )}
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex items-center gap-2">
                    {/* Flashcards Button */}
                    <button
                      type="button"
                      onClick={() => handleStartTopicCards(group)}
                      className={`duo-btn text-xs font-feather font-black uppercase tracking-wider py-1.5 px-3 flex items-center gap-1.5 cursor-pointer ${
                        cardCount > 0 ? 'duo-btn-blue' : 'border-2 border-duoGray-border border-b-4 bg-white text-duoGray-charcoal hover:bg-gray-50'
                      }`}
                    >
                      <Layers size={13} />
                      <span>{cardCount > 0 ? `Kartičky (${cardCount})` : 'Vytvořit'}</span>
                    </button>

                    {/* Quiz Button */}
                    <button
                      type="button"
                      onClick={() => handleStartTopicQuiz(group)}
                      className={`duo-btn text-xs font-feather font-black uppercase tracking-wider py-1.5 px-3 flex items-center gap-1.5 cursor-pointer ${
                        quizCount > 0 ? 'duo-btn-green' : 'duo-btn-white border-2 border-duoGray-border text-duoGray-charcoal hover:bg-gray-50'
                      }`}
                    >
                      <FileQuestion size={13} />
                      <span>{quizCount > 0 ? 'Test' : 'Test'}</span>
                    </button>
                  </div>
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
          userId={userId}
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
          userId={userId}
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
          userId={userId}
          onClose={() => setActiveTopicForQuiz(null)}
          onUpdateQuiz={async (quiz) => {
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
