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
  CheckCircle2
} from 'lucide-react';
import { NoteItem, SubjectMeta, FlashcardItem, SubjectType } from '../types/notes';
import { playPopSound, playSuccessChime } from '../utils/audio';
import { SubjectIcon } from './SubjectIcon';
import { FlashcardModal } from './FlashcardModal';
import { generateFlashcardsForNote } from '../services/flashcards';

interface PracticeViewProps {
  notes: NoteItem[];
  allNotes: NoteItem[];
  subjects: SubjectMeta[];
  selectedSubject: SubjectType;
  onUpdateFlashcards: (noteId: string, flashcards: FlashcardItem[]) => Promise<void> | void;
  onOpenScan: () => void;
}

export const PracticeView: React.FC<PracticeViewProps> = ({
  notes,
  allNotes,
  subjects,
  selectedSubject,
  onUpdateFlashcards,
  onOpenScan,
}) => {
  const [activeDeckNote, setActiveDeckNote] = useState<NoteItem | null>(null);
  const [generatingNoteId, setGeneratingNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Total flashcards across all user's notes
  const totalCardsCount = allNotes.reduce(
    (sum, n) => sum + (n.flashcards ? n.flashcards.length : 0),
    0
  );

  const totalDecksWithCards = allNotes.filter(
    (n) => n.flashcards && n.flashcards.length > 0
  ).length;

  const getSubjectMeta = (subjectId: string) => {
    return subjects.find((s) => s.id === subjectId) || subjects[0];
  };

  const filteredNotes = notes.filter((n) => {
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
    // If cards already exist, open modal immediately
    if (note.flashcards && note.flashcards.length > 0) {
      setActiveDeckNote(note);
      return;
    }

    // Otherwise, generate them first with visual feedback
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
      <div className="duo-card p-3.5 mb-4 bg-gradient-to-r from-blue-50/70 via-green-50/40 to-white border-2 border-sparkBlue/30 flex items-center justify-around">
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
            {totalDecksWithCards}
          </div>
          <div className="text-[10px] font-feather font-bold text-duoGray-pencil uppercase tracking-wider">
            Aktivních balíčků
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

      {/* Search Input Bar */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-duoGray-faded" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Hledat balíček podle tématu..."
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
            Žádné studijní balíčky
          </h3>
          <p className="text-xs text-duoGray-pencil mb-4 max-w-[240px] mx-auto">
            {searchQuery.trim()
              ? `Pro dotaz „${searchQuery}“ jsme nenašli žádné téma.`
              : 'Nejdříve si vyfoť sešit, ze kterého AI vytvoří kartičky.'}
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
          {filteredNotes.map((note) => {
            const meta = getSubjectMeta(note.subject);
            const cardCount = note.flashcards ? note.flashcards.length : 0;
            const isGenerating = generatingNoteId === note.id;

            return (
              <div
                key={note.id}
                onClick={() => !isGenerating && handleStartDeck(note)}
                className="duo-card duo-card-interactive p-4 cursor-pointer hover:border-sparkBlue group transition-all bg-white flex flex-col justify-between gap-3"
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
                  <h3 className="font-feather font-black text-[15px] text-duoGray-charcoal group-hover:text-sparkBlue transition-colors leading-snug">
                    {note.title}
                  </h3>
                  <p className="text-[12px] text-duoGray-pencil line-clamp-2 mt-1 leading-snug">
                    {note.summary || 'Kartičky pro opakování látky z tohoto sešitu.'}
                  </p>
                </div>

                {/* Bottom Action Row: Count + CTA Button */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {cardCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sparkBlue/10 text-sparkBlue text-[11px] font-feather font-black">
                        <Sparkles size={12} />
                        <span>{cardCount} {cardCount === 1 ? 'kartička' : cardCount < 5 ? 'kartičky' : 'kartiček'}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-duoGray-pencil">
                        Zatím nevygenerováno
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartDeck(note);
                    }}
                    className={`duo-btn text-xs font-feather font-black uppercase tracking-wider py-1.5 px-3.5 flex items-center gap-1.5 cursor-pointer ${
                      cardCount > 0 ? 'duo-btn-blue' : 'duo-btn-green'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Vytvářím...</span>
                      </>
                    ) : cardCount > 0 ? (
                      <>
                        <span>Procvičit</span>
                        <ChevronRight size={14} />
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Vytvořit z AI</span>
                      </>
                    )}
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
    </div>
  );
};
