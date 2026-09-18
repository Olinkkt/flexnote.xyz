import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  Layers,
  ChevronRight,
  Camera,
  Search,
  X,
  Loader2,
  CheckCircle2,
  FileQuestion,
  Trophy,
  Award
} from 'lucide-react';
import { NoteItem, SubjectMeta, FlashcardItem, QuizData, SubjectType } from '../types/notes';
import { playPopSound, playSuccessChime } from '../utils/audio';
import { SubjectIcon } from './SubjectIcon';
import { FlashcardModal } from './FlashcardModal';
import { QuizModal } from './QuizModal';
import { generateFlashcardsForNote } from '../services/flashcards';

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
  const [activeDeckNote, setActiveDeckNote] = useState<NoteItem | null>(null);
  const [activeQuizNote, setActiveQuizNote] = useState<NoteItem | null>(null);
  const [generatingNoteId, setGeneratingNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'flashcards' | 'quiz'>('all');

  // Total flashcards across all user's notes
  const totalCardsCount = allNotes.reduce(
    (sum, n) => sum + (n.flashcards ? n.flashcards.length : 0),
    0
  );

  // Total quizzes created
  const totalQuizzesCount = allNotes.filter(
    (n) => n.quiz && n.quiz.questions && n.quiz.questions.length > 0
  ).length;

  const totalDecksWithCards = allNotes.filter(
    (n) => n.flashcards && n.flashcards.length > 0
  ).length;

  const getSubjectMeta = (subjectId: string) => {
    return subjects.find((s) => s.id === subjectId) || subjects[0];
  };

  const filteredNotes = notes.filter((n) => {
    if (filterMode === 'flashcards' && (!n.flashcards || n.flashcards.length === 0)) return false;
    if (filterMode === 'quiz' && (!n.quiz || !n.quiz.questions || n.quiz.questions.length === 0)) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.summary.toLowerCase().includes(q) ||
      (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  const handleStartDeck = async (note: NoteItem) => {
    playPopSound();
    if (note.flashcards && note.flashcards.length > 0) {
      setActiveDeckNote(note);
      return;
    }

    setGeneratingNoteId(note.id);
    try {
      const generated = await generateFlashcardsForNote(note);
      if (generated && generated.length > 0) {
        await onUpdateFlashcards(note.id, generated);
        playSuccessChime();
        setActiveDeckNote({ ...note, flashcards: generated });
      }
    } catch (err) {
      console.error('Failed to generate cards for deck:', err);
    } finally {
      setGeneratingNoteId(null);
    }
  };

  const handleStartQuiz = (note: NoteItem) => {
    playPopSound();
    setActiveQuizNote(note);
  };

  return (
    <div className="px-4 py-3 select-none">
      {/* Page Header */}
      <div className="mb-3.5">
        <h2 className="font-feather font-black text-[20px] text-duoGray-charcoal leading-tight flex items-center gap-2">
          <Brain size={22} className="text-sparkBlue" />
          <span>Procvičování</span>
        </h2>
        <p className="text-[12px] font-bold text-duoGray-pencil mt-0.5">
          Chytré 3D kartičky, vzorce a klíčové pojmy ze zápisků
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
          <div className="font-feather font-black text-lg text-eagerGreen">
            {totalQuizzesCount}
          </div>
          <div className="text-[10px] font-feather font-bold text-duoGray-pencil uppercase tracking-wider">
            Cvičných testů
          </div>
        </div>

        <div className="w-px h-8 bg-gray-200" />

        <div className="text-center">
          <div className="font-feather font-black text-lg text-duoGray-charcoal">
            {allNotes.length}
          </div>
          <div className="text-[10px] font-feather font-bold text-duoGray-pencil uppercase tracking-wider">
            Témat celkem
          </div>
        </div>
      </div>

      {/* Activity Filter Tabs */}
      <div className="flex items-center gap-2 mb-3.5">
        <button
          type="button"
          onClick={() => {
            playPopSound();
            setFilterMode('all');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-feather font-black uppercase tracking-wider border-2 border-b-4 transition-all cursor-pointer ${
            filterMode === 'all'
              ? 'border-sparkBlue bg-sparkBlue text-white'
              : 'border-duoGray-border bg-white text-duoGray-pencil hover:text-duoGray-charcoal'
          }`}
        >
          Vše
        </button>
        <button
          type="button"
          onClick={() => {
            playPopSound();
            setFilterMode('flashcards');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-feather font-black uppercase tracking-wider border-2 border-b-4 transition-all cursor-pointer flex items-center gap-1.5 ${
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
          className={`px-3 py-1.5 rounded-xl text-xs font-feather font-black uppercase tracking-wider border-2 border-b-4 transition-all cursor-pointer flex items-center gap-1.5 ${
            filterMode === 'quiz'
              ? 'border-sparkBlue bg-sparkBlue text-white'
              : 'border-duoGray-border bg-white text-duoGray-pencil hover:text-duoGray-charcoal'
          }`}
        >
          <FileQuestion size={13} />
          <span>Cvičné testy</span>
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

      {/* Decks List */}
      {filteredNotes.length === 0 ? (
        <div className="duo-card p-8 text-center bg-white">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-duoGray-pencil">
            <Layers size={24} />
          </div>
          <h3 className="font-feather font-black text-sm text-duoGray-charcoal mb-1">
            Žádné studijní materiály
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
          {filteredNotes.map((note) => {
            const meta = getSubjectMeta(note.subject);
            const cardCount = note.flashcards ? note.flashcards.length : 0;
            const quizCount = note.quiz?.questions ? note.quiz.questions.length : 0;
            const bestScore = note.quiz?.bestScore;
            const isGenerating = generatingNoteId === note.id;

            return (
              <div
                key={note.id}
                className="duo-card p-4 transition-all bg-white flex flex-col justify-between gap-3 border-2 border-duoGray-border hover:border-duoGray-charcoal/30"
              >
                {/* Top Row: Subject Badge + Date */}
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

                  <span className="text-[11px] font-bold text-duoGray-pencil">
                    {note.date}
                  </span>
                </div>

                {/* Deck Title & Summary */}
                <div>
                  <h3 className="font-feather font-black text-[15px] text-duoGray-charcoal leading-snug">
                    {note.title}
                  </h3>
                  <p className="text-[12px] text-duoGray-pencil line-clamp-2 mt-1 leading-snug">
                    {note.summary || 'Materiál pro zkoušení a opakování ze školního sešitu.'}
                  </p>
                </div>

                {/* Status Badges Row */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {cardCount > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sparkBlue/10 text-sparkBlue text-[11px] font-feather font-black">
                      <Layers size={12} />
                      <span>{cardCount} {cardCount === 1 ? 'kartička' : cardCount < 5 ? 'kartičky' : 'kartiček'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-duoGray-pencil text-[11px] font-bold">
                      Bez kartiček
                    </span>
                  )}

                  {quizCount > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-eagerGreen/10 text-eagerGreen text-[11px] font-feather font-black">
                      <FileQuestion size={12} />
                      <span>{quizCount} {quizCount === 1 ? 'otázka' : quizCount < 5 ? 'otázky' : 'otázek'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-duoGray-pencil text-[11px] font-bold">
                      Bez testu
                    </span>
                  )}

                  {bestScore !== undefined && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 text-[11px] font-feather font-black">
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
                    disabled={isGenerating}
                    onClick={() => handleStartDeck(note)}
                    className={`duo-btn text-xs font-feather font-black uppercase tracking-wider py-1.5 px-3 flex items-center gap-1.5 cursor-pointer ${
                      cardCount > 0 ? 'duo-btn-blue' : 'border-2 border-duoGray-border border-b-4 bg-white text-duoGray-charcoal hover:bg-gray-50'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Vytvářím...</span>
                      </>
                    ) : (
                      <>
                        <Layers size={13} />
                        <span>{cardCount > 0 ? 'Kartičky' : 'Vytvořit kartičky'}</span>
                      </>
                    )}
                  </button>

                  {/* Quiz Button */}
                  <button
                    type="button"
                    onClick={() => handleStartQuiz(note)}
                    className={`duo-btn text-xs font-feather font-black uppercase tracking-wider py-1.5 px-3.5 flex items-center gap-1.5 cursor-pointer ${
                      quizCount > 0 ? 'duo-btn-green' : 'duo-btn-green'
                    }`}
                  >
                    <FileQuestion size={13} />
                    <span>{quizCount > 0 ? 'Cvičný test' : 'Vytvořit test'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3D Duolingo Flashcard Modal */}
      {activeDeckNote && (
        <FlashcardModal
          note={activeDeckNote}
          subjects={subjects}
          onClose={() => setActiveDeckNote(null)}
          onUpdateFlashcards={async (noteId, flashcards) => {
            await onUpdateFlashcards(noteId, flashcards);
            setActiveDeckNote((prev) => (prev && prev.id === noteId ? { ...prev, flashcards } : prev));
          }}
        />
      )}

      {/* Interactive Practice Quiz Modal */}
      {activeQuizNote && (
        <QuizModal
          note={activeQuizNote}
          subjects={subjects}
          onClose={() => setActiveQuizNote(null)}
          onUpdateQuiz={async (noteId, quiz) => {
            await onUpdateQuiz(noteId, quiz);
            setActiveQuizNote((prev) => (prev && prev.id === noteId ? { ...prev, quiz } : prev));
          }}
        />
      )}
    </div>
  );
};
