import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  RotateCw,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Trophy,
  Loader2,
  BookOpen,
  AlertCircle,
  Brain
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FlashcardItem, NoteItem, SubjectMeta, TopicGroup, SubjectType } from '../types/notes';
import {
  playPopSound,
  playSuccessChime,
  playErrorSound,
  playComboChime,
  playStreakCelebrationSound,
} from '../utils/audio';
import { vibrateSuccess, vibrateCombo, vibrateError } from '../utils/haptics';
import { recordStudyActivity } from '../services/gamification';
import { useActiveStudyTracker } from '../services/studyTracker';
import { ComboBadge } from './DopamineBadge';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SubjectIcon } from './SubjectIcon';
import { generateFlashcardsForNote, generateFlashcardsForTopic } from '../services/flashcards';
import {
  CardWithNote,
  calculateNextSRS,
  calculateRetention,
  isTroublesome,
  SRSRating
} from '../services/srs';

interface FlashcardModalProps {
  note?: NoteItem;
  topicGroup?: TopicGroup;
  customCards?: CardWithNote[];
  customSessionTitle?: string;
  customSubjectId?: SubjectType;
  subjects: SubjectMeta[];
  userId?: string;
  onClose: () => void;
  onUpdateFlashcards: (noteId: string, flashcards: FlashcardItem[]) => Promise<void> | void;
}

export const FlashcardModal: React.FC<FlashcardModalProps> = ({
  note,
  topicGroup,
  customCards,
  customSessionTitle,
  customSubjectId,
  subjects,
  userId,
  onClose,
  onUpdateFlashcards,
}) => {
  const initialCards = customCards
    ? customCards.map((item) => item.card)
    : topicGroup
    ? topicGroup.notes.flatMap((n) => n.flashcards || [])
    : note?.flashcards || [];

  const [cards, setCards] = useState<FlashcardItem[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [comboCount, setComboCount] = useState(0);
  const [earnedDiamonds, setEarnedDiamonds] = useState(0);

  // Active study tracker for flashcard session
  useActiveStudyTracker(!isCompleted && !isGenerating, { userId, contextName: 'flashcards' });

  const subjectId = customSubjectId || topicGroup?.subject || note?.subject || 'czech';
  const subjectMeta = subjects.find((s) => s.id === subjectId) || subjects[0];
  const displayTitle = customSessionTitle || (topicGroup ? topicGroup.name : note?.title || 'Kartičky');

  const isFallbackCard = (c: FlashcardItem) => {
    return (
      c.id?.includes('summary-') ||
      c.back?.includes('*Použití v tématu ') ||
      c.back?.includes('*Předmět: ') ||
      c.front?.startsWith('Jak zní matematický vzorec pro **') ||
      c.front?.startsWith('Co znamená pojem **') ||
      c.front?.startsWith('O čem pojednává zápisek **')
    );
  };

  // If no cards exist initially or if note has old rule-based fallback cards, generate smart cards with AI
  useEffect(() => {
    const hasOnlyFallbackCards = cards.length > 0 && cards.every(isFallbackCard);
    if (!customCards && (cards.length === 0 || hasOnlyFallbackCards)) {
      handleGenerateCards();
    }
  }, []);

  const handleGenerateCards = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    playPopSound();
    try {
      let generated: FlashcardItem[] = [];
      if (topicGroup && topicGroup.notes.length > 0) {
        generated = await generateFlashcardsForTopic(topicGroup.name, topicGroup.subject, topicGroup.notes);
      } else if (note) {
        generated = await generateFlashcardsForNote(note);
      }

      if (generated && generated.length > 0) {
        setCards(generated);
        setCurrentIndex(0);
        setIsFlipped(false);
        setIsCompleted(false);
        setMasteredIds(new Set());
        if (note) {
          await onUpdateFlashcards(note.id, generated);
        } else if (topicGroup) {
          for (const n of topicGroup.notes) {
            await onUpdateFlashcards(n.id, generated);
          }
        }
        playSuccessChime();
      } else {
        throw new Error('Nepodařilo se vytvořit žádné kartičky z tohoto obsahu.');
      }
    } catch (err: any) {
      console.error('Failed to generate flashcards:', err);
      setGenerationError(err?.message || 'Při generování kartiček došlo k chybě. Zkontrolujte připojení k internetu.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFlip = useCallback(() => {
    playPopSound();
    setIsFlipped(prev => !prev);
  }, []);

  const handleNext = useCallback(() => {
    if (cards.length === 0) return;
    playPopSound();
    setIsFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Completed all cards!
      setIsCompleted(true);
      const rewardDiamonds = 10;
      setEarnedDiamonds(rewardDiamonds);
      recordStudyActivity({
        diamondsToAdd: rewardDiamonds,
        userId,
      });
      playStreakCelebrationSound();
      vibrateSuccess();
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#58cc02', '#1cb0f6', '#ff9600', '#ff4b4b', '#ffd900'],
        });
      } catch {}
    }
  }, [cards.length, currentIndex, userId]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      playPopSound();
      setIsFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleAnswerRating = async (rating: SRSRating) => {
    if (cards.length === 0) return;
    const currentCard = cards[currentIndex];
    const newSRS = calculateNextSRS(currentCard.srs, rating);
    const updatedCard: FlashcardItem = { ...currentCard, srs: newSRS };

    const newCards = [...cards];
    newCards[currentIndex] = updatedCard;
    setCards(newCards);

    const newMastered = new Set(masteredIds);
    if (rating === 'again') {
      newMastered.delete(currentCard.id);
      setComboCount(0);
      playErrorSound();
      vibrateError();
    } else {
      newMastered.add(currentCard.id);
      const nextCombo = comboCount + 1;
      setComboCount(nextCombo);
      playComboChime(nextCombo);
      if (nextCombo >= 3) {
        vibrateCombo();
      } else {
        vibrateSuccess();
      }
    }
    setMasteredIds(newMastered);

    try {
      if (customCards) {
        const item = customCards.find((ci) => ci.card.id === currentCard.id);
        if (item) {
          const parentNote = item.note;
          const updatedNoteCards = (parentNote.flashcards || []).map((c) =>
            c.id === currentCard.id ? updatedCard : c
          );
          await onUpdateFlashcards(parentNote.id, updatedNoteCards);
        }
      } else if (note) {
        await onUpdateFlashcards(note.id, newCards);
      } else if (topicGroup) {
        for (const n of topicGroup.notes) {
          if (n.flashcards?.some((c) => c.id === currentCard.id)) {
            const updatedNoteCards = (n.flashcards || []).map((c) =>
              c.id === currentCard.id ? updatedCard : c
            );
            await onUpdateFlashcards(n.id, updatedNoteCards);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to persist SRS update:', e);
    }

    handleNext();
  };

  const handleMarkMastered = () => handleAnswerRating('good');
  const handleMarkRepeat = () => handleAnswerRating('again');

  const handleRestart = () => {
    playPopSound();
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
    setMasteredIds(new Set());
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCompleted || isGenerating || generationError || cards.length === 0) return;
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleMarkMastered();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleMarkRepeat();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCompleted, isGenerating, generationError, cards.length, handleFlip, handleMarkMastered, handleMarkRepeat]);

  const currentCard = cards[currentIndex];
  const progressPercent = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full md:max-w-xl h-[92vh] max-h-[720px] bg-[#f7f7f7] rounded-t-[32px] md:rounded-3xl flex flex-col overflow-hidden shadow-2xl border-t-2 md:border-2 border-duoGray-border animate-in slide-in-from-bottom-6 duration-200">
        {/* Drag handle for mobile */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-2.5 md:hidden"></div>

        {/* Modal Header */}
        <div className="px-4 pb-2.5 bg-white border-b-2 border-duoGray-border flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-duo text-xs font-feather font-extrabold uppercase tracking-wide shrink-0"
              style={{
                backgroundColor: subjectMeta.bgTint,
                color: subjectMeta.color,
                border: `1.5px solid ${subjectMeta.borderColor}`,
              }}
            >
              <SubjectIcon subject={subjectMeta.id} size={14} />
              <span>{subjectMeta.czechName}</span>
            </span>
            <span className="font-feather font-black text-sm text-duoGray-charcoal truncate" title={displayTitle}>
              {displayTitle}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {!isCompleted && !isGenerating && (
              <button
                type="button"
                onClick={handleGenerateCards}
                title="Znovu vygenerovat kartičky pomocí AI"
                className="px-2.5 py-1.5 rounded-duo border-2 border-duoGray-border hover:border-sparkBlue hover:bg-sparkBlue/5 text-duoGray-charcoal hover:text-sparkBlue transition text-xs font-feather font-black flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Sparkles size={14} className="text-sparkBlue" />
                <span className="hidden sm:inline">AI Přegenerovat</span>
              </button>
            )}
            <button
              onClick={() => {
                playPopSound();
                onClose();
              }}
              className="p-2 rounded-duo border-2 border-duoGray-border hover:bg-gray-100 text-duoGray-charcoal transition active:scale-95 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Progress Bar Strip */}
        {cards.length > 0 && !isGenerating && !generationError && (
          <div className="px-4 py-2.5 bg-white border-b border-duoGray-border flex items-center justify-between gap-3">
            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden border border-gray-300/60 p-0.5">
              <div
                className="bg-eagerGreen h-full rounded-full transition-all duration-300 shadow-xs"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {comboCount >= 2 && !isCompleted && (
              <ComboBadge combo={comboCount} />
            )}
            <span className="text-xs font-feather font-black text-duoGray-pencil tracking-tight shrink-0">
              {currentIndex + 1} / {cards.length}
            </span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 p-4 flex flex-col justify-center items-center overflow-y-auto">
          {isGenerating ? (
            <div className="w-full max-w-[360px] bg-white border-2 border-duoGray-border border-b-4 rounded-3xl p-8 text-center shadow-md animate-pulse">
              <div className="w-16 h-16 rounded-2xl bg-sparkBlue/15 border-2 border-sparkBlue/30 text-sparkBlue flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Sparkles size={32} />
              </div>
              <h3 className="font-feather font-black text-base text-duoGray-charcoal mb-1.5">
                AI vytváří tvé kartičky...
              </h3>
              <p className="text-xs text-duoGray-pencil leading-relaxed">
                {topicGroup
                  ? `Vytváříme souhrnné kartičky pokrývající všech ${topicGroup.notes.length} stránek z tématu „${topicGroup.name}“.`
                  : 'Analyzuji zápisek, hledám KaTeX matematické vzorce a zvýrazněné pojmy.'}
              </p>
            </div>
          ) : generationError ? (
            <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-cardinalRed/10 text-cardinalRed flex items-center justify-center mb-4">
                <AlertCircle size={28} />
              </div>
              <h3 className="font-feather font-black text-base text-duoGray-charcoal mb-2">
                Kartičky se nepodařilo vytvořit
              </h3>
              <p className="text-xs text-duoGray-pencil max-w-sm mb-6 leading-relaxed">
                {generationError}
              </p>
              <button
                onClick={handleGenerateCards}
                className="duo-btn duo-btn-blue text-xs font-feather font-black uppercase tracking-wider py-2.5 px-6 flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw size={15} />
                <span>Zkusit znovu</span>
              </button>
            </div>
          ) : isCompleted ? (
            /* Duolingo Victory Screen */
            <div className="w-full max-w-[360px] bg-white border-2 border-duoGray-border border-b-[6px] border-b-eagerGreen rounded-3xl p-6 text-center shadow-lg animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-full bg-storybookGreen/40 border-4 border-eagerGreen flex items-center justify-center mx-auto mb-4 text-eagerGreen shadow-md">
                <Trophy size={40} className="stroke-[2.5]" />
              </div>
              <h2 className="font-feather font-black text-xl text-duoGray-charcoal mb-1">
                Skvělá práce! 🎉
              </h2>

              {/* Diamond Reward */}
              <div className="my-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-sparkBlue/10 border-2 border-sparkBlue/30 text-sparkBlue font-feather font-black text-xs shadow-xs animate-bounce">
                <Sparkles size={16} className="fill-sparkBlue" />
                <span>+{earnedDiamonds} Drahokamů získáno! 💎</span>
              </div>
              <p className="text-xs font-bold text-duoGray-pencil mb-4">
                Prošel(a) jsi všech {cards.length} kartiček z tématu „{displayTitle}“.
              </p>

              <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-duoGray-border rounded-2xl p-3.5 mb-5">
                <div className="flex items-center justify-around mb-2.5">
                  <div className="text-center">
                    <span className="block font-feather font-black text-lg text-eagerGreen">
                      {masteredIds.size}
                    </span>
                    <span className="text-[10px] font-feather font-bold text-duoGray-pencil uppercase tracking-wider">
                      Umím
                    </span>
                  </div>
                  <div className="w-px h-8 bg-gray-200" />
                  <div className="text-center">
                    <span className="block font-feather font-black text-lg text-[#ff4b4b]">
                      {cards.length - masteredIds.size}
                    </span>
                    <span className="text-[10px] font-feather font-bold text-duoGray-pencil uppercase tracking-wider">
                      Neumím
                    </span>
                  </div>
                </div>
                <div className="text-[11px] font-feather font-extrabold text-sparkBlue bg-white/80 py-1.5 px-2.5 rounded-xl border border-sparkBlue/20 flex items-center justify-center gap-1.5">
                  <Brain size={14} className="shrink-0" />
                  <span>Termíny opakování upraveny podle křivky zapomínání</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleRestart}
                  className="w-full duo-btn duo-btn-green py-3 px-4 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw size={16} />
                  <span>Procvičit znovu</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full duo-btn duo-btn-white py-2.5 px-4 text-xs font-feather font-black uppercase tracking-wider text-duoGray-charcoal cursor-pointer"
                >
                  {customCards ? 'Zpět do procvičování' : 'Zpět k zápisku'}
                </button>
              </div>
            </div>
          ) : cards.length === 0 ? (
            <div className="w-full max-w-[360px] bg-white border-2 border-duoGray-border border-b-4 rounded-3xl p-6 text-center shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-duoGray-pencil">
                <BookOpen size={28} />
              </div>
              <h3 className="font-feather font-black text-base text-duoGray-charcoal mb-1">
                Žádné kartičky k dispozici
              </h3>
              <p className="text-xs text-duoGray-pencil mb-4">
                Klikni níže pro automatické vygenerování kartiček z tohoto zápisku.
              </p>
              <button
                onClick={handleGenerateCards}
                className="w-full duo-btn duo-btn-green py-3 px-4 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={16} />
                <span>Vygenerovat kartičky z AI</span>
              </button>
            </div>
          ) : (
            /* 3D Duolingo Flip Card */
            <div className="w-full h-full max-h-[440px] perspective-1200 flex items-center justify-center">
              <div
                onClick={handleFlip}
                className={`duo-flashcard-3d w-full h-full max-w-[380px] max-h-[420px] cursor-pointer select-none transition-transform duration-500 ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* FRONT FACE (Otázka / Pojem) */}
                <div className="duo-flashcard-face bg-white border-2 border-duoGray-border border-b-[6px] border-b-[#cfcfcf] p-6 flex flex-col justify-between shadow-md hover:border-sparkBlue/60 transition-colors">
                  {/* Card Front Top Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-100 text-duoGray-charcoal text-[11px] font-feather font-black uppercase tracking-wider">
                      <HelpCircle size={13} className="text-sparkBlue" />
                      <span>{currentCard?.category === 'formula' ? 'Matematický vzorec' : 'Otázka / Pojem'}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {currentCard && isTroublesome(currentCard) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cardinalRed/10 text-cardinalRed text-[10px] font-feather font-black tracking-tight">
                          <AlertCircle size={11} />
                          <span>Dělá potíže{currentCard.srs?.lapses ? ` (${currentCard.srs.lapses}×)` : ''}</span>
                        </span>
                      ) : currentCard?.srs && currentCard.srs.repetition > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-eagerGreen/10 text-eagerGreen text-[10px] font-feather font-black tracking-tight">
                          <CheckCircle2 size={11} />
                          <span>Retence {calculateRetention(currentCard.srs)} %</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-feather font-extrabold text-duoGray-faded flex items-center gap-1">
                          <RotateCw size={12} />
                          3D Karta
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Front Center (Markdown & KaTeX) */}
                  <div className="my-auto py-4 overflow-y-auto max-h-[260px] text-center flex flex-col items-center justify-center">
                    <div className="w-full font-feather font-extrabold text-base md:text-lg text-duoGray-charcoal leading-snug">
                      <MarkdownRenderer content={currentCard?.front || ''} />
                    </div>
                  </div>

                  {/* Card Front Bottom Cue */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs font-feather font-extrabold text-sparkBlue">
                    <RotateCw size={14} className="animate-spin-slow" />
                    <span>Klepni pro otočení a odpověď</span>
                  </div>
                </div>

                {/* BACK FACE (Odpověď & Vysvětlení) */}
                <div className="duo-flashcard-face duo-flashcard-face-back bg-white border-2 border-sparkBlue/40 border-b-[6px] border-b-sparkBlue p-6 flex flex-col justify-between shadow-md">
                  {/* Card Back Top Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-blue-50">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sparkBlue/10 text-sparkBlue text-[11px] font-feather font-black uppercase tracking-wider">
                      <CheckCircle2 size={13} />
                      <span>Odpověď & Řešení</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {currentCard?.srs?.interval ? (
                        <span className="text-[10px] font-feather font-bold text-duoGray-pencil">
                          Interval: {currentCard.srs.interval} d.
                        </span>
                      ) : (
                        <span className="text-[11px] font-feather font-extrabold text-duoGray-faded flex items-center gap-1">
                          <RotateCw size={12} />
                          Rub
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Back Center (Markdown & KaTeX) */}
                  <div className="my-auto py-4 overflow-y-auto max-h-[260px] text-left w-full">
                    <div className="w-full font-sans text-[14px] leading-relaxed text-duoGray-charcoal">
                      <MarkdownRenderer content={currentCard?.back || ''} />
                    </div>
                  </div>

                  {/* Card Back Bottom Cue */}
                  <div className="pt-3 border-t border-blue-50 flex items-center justify-center gap-1.5 text-xs font-feather font-extrabold text-duoGray-pencil">
                    <RotateCw size={14} />
                    <span>Klepni pro otočení zpět</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Rating & Flip Actions */}
        {!isCompleted && !isGenerating && !generationError && cards.length > 0 && (
          <div className="p-3.5 pb-5 bg-white border-t-2 border-duoGray-border">
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleMarkRepeat}
                title="Neumím to!"
                className="flex-1 duo-btn duo-btn-red py-3 px-3 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <X size={16} className="stroke-[3]" />
                <span>Neumím to!</span>
              </button>

              <button
                onClick={handleFlip}
                title="Otočit kartičku (Mezerník)"
                className="duo-btn duo-btn-white py-3 px-3.5 text-xs font-feather font-black text-duoGray-charcoal border-2 border-duoGray-border cursor-pointer shadow-xs"
              >
                <RotateCw size={17} />
              </button>

              <button
                onClick={handleMarkMastered}
                title="Umím to!"
                className="flex-1 duo-btn duo-btn-green py-3 px-3 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle2 size={16} className="stroke-[2.5]" />
                <span>Umím to!</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
