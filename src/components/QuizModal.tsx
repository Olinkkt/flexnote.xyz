import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  Loader2,
  ArrowRight,
  HelpCircle,
  Award,
  AlertCircle,
  Flame,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { NoteItem, SubjectMeta, QuizQuestion, QuizData, TopicGroup } from '../types/notes';
import {
  playPopSound,
  playSuccessChime,
  playStreakSound,
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
import { generateQuizForNote, generateQuizForTopic } from '../services/quiz';

interface QuizModalProps {
  note?: NoteItem;
  topicGroup?: TopicGroup;
  subjects: SubjectMeta[];
  userId?: string;
  onClose: () => void;
  onUpdateQuiz: (quiz: QuizData) => Promise<void> | void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  note,
  topicGroup,
  subjects,
  userId,
  onClose,
  onUpdateQuiz,
}) => {
  const existingQuiz = topicGroup?.quiz || note?.quiz;
  const [questions, setQuestions] = useState<QuizQuestion[]>(existingQuiz?.questions || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Score & Combo tracking
  const [correctCount, setCorrectCount] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [earnedDiamonds, setEarnedDiamonds] = useState(0);

  // Active study tracker for quiz practice session
  useActiveStudyTracker(!isCompleted && !isGenerating, { userId, contextName: 'quiz' });

  // Answer state for current question
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [selectedFillInAnswer, setSelectedFillInAnswer] = useState<string | null>(null);

  // Matching question state
  const [matchedPairIds, setMatchedPairIds] = useState<Set<string>>(new Set());
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<string | null>(null);
  const [mismatchIds, setMismatchIds] = useState<Set<string>>(new Set());

  // Checking and feedback state
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);

  const activeSubject = topicGroup?.subject || note?.subject || 'czech';
  const activeTitle = topicGroup ? `Téma: ${topicGroup.name}` : note?.title || 'Cvičný test';
  const existingBestScore = existingQuiz?.bestScore || 0;

  const subjectMeta = subjects.find((s) => s.id === activeSubject) || subjects[0];
  const currentQuestion: QuizQuestion | undefined = questions[currentIndex];

  // Shuffled options for right column of matching question
  const shuffledRightPairs = useMemo(() => {
    if (!currentQuestion || currentQuestion.type !== 'matching') return [];
    const pairs = [...currentQuestion.pairs];
    // Deterministic or pseudo-random shuffle based on IDs
    return pairs.sort(() => Math.random() - 0.5);
  }, [currentQuestion?.id]);

  // Load or generate quiz on mount if empty
  useEffect(() => {
    if (!existingQuiz?.questions || existingQuiz.questions.length === 0) {
      handleGenerateQuiz();
    }
  }, []);

  const handleGenerateQuiz = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    playPopSound();

    try {
      let generated: QuizQuestion[] = [];
      if (topicGroup && topicGroup.notes.length > 0) {
        generated = await generateQuizForTopic(topicGroup.name, topicGroup.subject, topicGroup.notes);
      } else if (note) {
        generated = await generateQuizForNote(note);
      }

      if (generated && generated.length > 0) {
        setQuestions(generated);
        setCurrentIndex(0);
        setCorrectCount(0);
        setIsCompleted(false);
        resetQuestionState();

        const newQuizData: QuizData = {
          questions: generated,
          bestScore: existingBestScore,
          lastAttemptAt: Date.now(),
        };
        await onUpdateQuiz(newQuizData);
        playSuccessChime();
      }
    } catch (err: any) {
      console.error('Failed to generate quiz:', err);
      setGenerationError(err?.message || 'Při generování testu došlo k chybě. Zkontrolujte připojení k internetu.');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetQuestionState = () => {
    setSelectedChoice(null);
    setSelectedFillInAnswer(null);
    setMatchedPairIds(new Set());
    setSelectedLeftId(null);
    setSelectedRightId(null);
    setMismatchIds(new Set());
    setIsAnswerChecked(false);
    setIsAnswerCorrect(false);
  };

  // Multiple Choice option click
  const handleSelectOption = (index: number) => {
    if (isAnswerChecked) return;
    playPopSound();
    setSelectedChoice(index);
  };

  // Fill-in word bank click
  const handleSelectFillInWord = (word: string) => {
    if (isAnswerChecked) return;
    playPopSound();
    setSelectedFillInAnswer(word);
  };

  // Matching pair selection
  const handleMatchingLeftClick = (pairId: string) => {
    if (matchedPairIds.has(pairId)) return;
    playPopSound();

    if (selectedLeftId === pairId) {
      setSelectedLeftId(null);
      return;
    }

    setSelectedLeftId(pairId);

    // If a right item was already selected, check match
    if (selectedRightId) {
      checkMatchingPair(pairId, selectedRightId);
    }
  };

  const handleMatchingRightClick = (pairId: string) => {
    if (matchedPairIds.has(pairId)) return;
    playPopSound();

    if (selectedRightId === pairId) {
      setSelectedRightId(null);
      return;
    }

    setSelectedRightId(pairId);

    // If a left item was already selected, check match
    if (selectedLeftId) {
      checkMatchingPair(selectedLeftId, pairId);
    }
  };

  const checkMatchingPair = (leftId: string, rightId: string) => {
    if (leftId === rightId) {
      // It's a match!
      playPopSound();
      const updated = new Set(matchedPairIds);
      updated.add(leftId);
      setMatchedPairIds(updated);
      setSelectedLeftId(null);
      setSelectedRightId(null);

      // Check if all pairs are now matched
      if (currentQuestion?.type === 'matching' && updated.size === currentQuestion.pairs.length) {
        setIsAnswerChecked(true);
        setIsAnswerCorrect(true);
        setCorrectCount((prev) => prev + 1);
        const nextCombo = comboCount + 1;
        setComboCount(nextCombo);
        playComboChime(nextCombo);
        if (nextCombo >= 3) {
          vibrateCombo();
          try {
            confetti({
              particleCount: 30,
              spread: 60,
              origin: { y: 0.7 },
              colors: ['#58cc02', '#1cb0f6', '#ff9600'],
            });
          } catch {}
        } else {
          vibrateSuccess();
        }
      }
    } else {
      // Mismatch!
      setComboCount(0);
      playErrorSound();
      vibrateError();
      const mismatchSet = new Set<string>([leftId, rightId]);
      setMismatchIds(mismatchSet);
      setTimeout(() => {
        setMismatchIds(new Set());
        setSelectedLeftId(null);
        setSelectedRightId(null);
      }, 500);
    }
  };

  // Check the answer for multiple-choice or fill-in
  const handleCheckAnswer = () => {
    if (!currentQuestion || isAnswerChecked) return;

    let correct = false;

    if (currentQuestion.type === 'multiple-choice') {
      if (selectedChoice === null) return;
      correct = selectedChoice === currentQuestion.correctIndex;
    } else if (currentQuestion.type === 'fill-in') {
      if (!selectedFillInAnswer) return;
      correct = selectedFillInAnswer.trim().toLowerCase() === currentQuestion.blankAnswer.trim().toLowerCase();
    } else if (currentQuestion.type === 'matching') {
      // Handled interactively during pairs connection
      return;
    }

    setIsAnswerChecked(true);
    setIsAnswerCorrect(correct);

    if (correct) {
      setCorrectCount((prev) => prev + 1);
      const nextCombo = comboCount + 1;
      setComboCount(nextCombo);
      playComboChime(nextCombo);
      if (nextCombo >= 3) {
        vibrateCombo();
        if (nextCombo === 3 || nextCombo === 5 || nextCombo === 10) {
          try {
            confetti({
              particleCount: 35,
              spread: 65,
              origin: { y: 0.7 },
              colors: ['#58cc02', '#1cb0f6', '#ff9600', '#ffd900'],
            });
          } catch {}
        }
      } else {
        vibrateSuccess();
      }
    } else {
      setComboCount(0);
      playErrorSound();
      vibrateError();
    }
  };

  // Advance to next question or complete test
  const handleContinue = useCallback(() => {
    playPopSound();

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      resetQuestionState();
    } else {
      // Finished all questions!
      const totalScorePercent = Math.round((correctCount / questions.length) * 100);
      const newBestScore = Math.max(existingBestScore, totalScorePercent);

      onUpdateQuiz({
        questions,
        bestScore: newBestScore,
        lastAttemptAt: Date.now(),
      });

      const diamondsAwarded = totalScorePercent === 100 ? 25 : totalScorePercent >= 70 ? 15 : 10;
      setEarnedDiamonds(diamondsAwarded);

      recordStudyActivity({
        diamondsToAdd: diamondsAwarded,
        userId,
      });

      setIsCompleted(true);
      playStreakCelebrationSound();
      vibrateSuccess();
      try {
        confetti({
          particleCount: 110,
          spread: 85,
          origin: { y: 0.6 },
          colors: ['#58cc02', '#1cb0f6', '#ff9600', '#ff4b4b', '#ffd900'],
        });
      } catch {}
    }
  }, [currentIndex, questions.length, correctCount, existingBestScore, onUpdateQuiz, userId]);

  // Can the user submit their answer?
  const canCheck = useMemo(() => {
    if (!currentQuestion || isAnswerChecked) return false;
    if (currentQuestion.type === 'multiple-choice') return selectedChoice !== null;
    if (currentQuestion.type === 'fill-in') return selectedFillInAnswer !== null;
    if (currentQuestion.type === 'matching') {
      return matchedPairIds.size === currentQuestion.pairs.length;
    }
    return false;
  }, [currentQuestion, isAnswerChecked, selectedChoice, selectedFillInAnswer, matchedPairIds]);

  const progressPercent = questions.length > 0 ? ((currentIndex + (isAnswerChecked ? 1 : 0)) / questions.length) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-duoGray-charcoal/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl border-2 border-duoGray-border border-b-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Top Header */}
        <div className="px-5 py-4 border-b-2 border-duoGray-border flex items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                playPopSound();
                onClose();
              }}
              title="Zavřít test"
              className="p-1.5 rounded-xl text-duoGray-pencil hover:text-duoGray-charcoal hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            {/* Duolingo style animated progress bar */}
            <div className="flex-1 min-w-[100px] sm:min-w-[180px]">
              <div className="w-full h-3.5 bg-gray-200 rounded-full overflow-hidden p-0.5 border border-gray-300">
                <div
                  className="h-full bg-eagerGreen rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(progressPercent, 4)}%` }}
                />
              </div>
            </div>

            {/* Combo Badge in Header */}
            {comboCount >= 2 && !isCompleted && !isGenerating && (
              <ComboBadge combo={comboCount} />
            )}
          </div>

          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-duo text-xs font-feather font-extrabold uppercase tracking-wider"
              style={{
                backgroundColor: subjectMeta.bgTint,
                color: subjectMeta.color,
                border: `1.5px solid ${subjectMeta.borderColor}`,
              }}
            >
              <SubjectIcon subject={subjectMeta.id} size={14} />
              <span className="hidden sm:inline">{subjectMeta.czechName}</span>
            </span>

            {questions.length > 0 && !isGenerating && (
              <span className="text-xs font-feather font-extrabold text-duoGray-pencil px-1">
                {currentIndex + 1}/{questions.length}
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* Loading State */}
          {isGenerating && (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-2xl bg-sparkBlue/10 flex items-center justify-center text-sparkBlue animate-bounce">
                  <Sparkles size={32} />
                </div>
                <Loader2 size={24} className="animate-spin text-sparkBlue absolute -bottom-2 -right-2" />
              </div>
              <h3 className="font-feather font-black text-lg text-duoGray-charcoal mb-1">
                AI připravuje cvičný test...
              </h3>
              <p className="text-xs text-duoGray-pencil max-w-sm">
                {topicGroup
                  ? `Vytváříme souhrnný test pokrývající všech ${topicGroup.notes.length} stránek z tématu „${topicGroup.name}“.`
                  : 'Vytváříme interaktivní otázky A/B/C/D, doplňovačky vzorců a spojování pojmů přesně podle tvého sešitu.'}
              </p>
            </div>
          )}

          {/* Error State */}
          {!isGenerating && generationError && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-cardinalRed/10 text-cardinalRed flex items-center justify-center mb-4">
                <AlertCircle size={28} />
              </div>
              <h3 className="font-feather font-black text-base text-duoGray-charcoal mb-2">
                Test se nepodařilo vytvořit
              </h3>
              <p className="text-xs text-duoGray-pencil max-w-sm mb-6 leading-relaxed">
                {generationError}
              </p>
              <button
                onClick={handleGenerateQuiz}
                className="duo-btn duo-btn-blue text-xs font-feather font-black uppercase tracking-wider py-2.5 px-6 flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw size={15} />
                <span>Zkusit znovu</span>
              </button>
            </div>
          )}

          {/* Quiz Completed Screen */}
          {!isGenerating && !generationError && isCompleted && (
            <div className="py-8 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 mb-4 shadow-inner">
                <Trophy size={42} />
              </div>

              <h2 className="font-feather font-black text-2xl text-duoGray-charcoal mb-1">
                Test dokončen!
              </h2>

              {/* Diamond Reward Pill */}
              <div className="my-2 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-sparkBlue/10 border-2 border-sparkBlue/30 text-sparkBlue font-feather font-black text-sm shadow-xs animate-bounce">
                <Sparkles size={18} className="fill-sparkBlue" />
                <span>+{earnedDiamonds} Drahokamů získáno! 💎</span>
              </div>

              {/* Score Display */}
              <div className="my-5 p-4 rounded-2xl bg-gradient-to-br from-green-50 to-blue-50 border-2 border-duoGray-border w-full max-w-xs text-center">
                <div className="text-[11px] font-feather font-extrabold uppercase tracking-wider text-duoGray-pencil">
                  Tvůj výsledek
                </div>
                <div className="font-feather font-black text-4xl text-eagerGreen my-1">
                  {Math.round((correctCount / questions.length) * 100)} %
                </div>
                <div className="text-xs font-bold text-duoGray-charcoal">
                  {correctCount} z {questions.length} otázek správně
                </div>
              </div>

              <p className="text-xs text-duoGray-pencil max-w-xs mb-8 leading-relaxed">
                {Math.round((correctCount / questions.length) * 100) === 100
                  ? 'Fantastický výkon! Tento zápisek a všechny jeho pojmy ovládáš naprosto suverénně. 🌟'
                  : Math.round((correctCount / questions.length) * 100) >= 60
                  ? 'Skvělá práce! Máš v učivu velmi dobrý přehled, stačí doladit pár detailů. 🚀'
                  : 'Dobrý první pokus! Doporučujeme ještě jednou projít zápisek a zkusit test znovu. 💪'}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                <button
                  onClick={() => {
                    playPopSound();
                    setCurrentIndex(0);
                    setCorrectCount(0);
                    setIsCompleted(false);
                    resetQuestionState();
                  }}
                  className="flex-1 duo-btn text-xs font-feather font-black uppercase tracking-wider py-3 border-2 border-duoGray-border border-b-4 bg-white text-duoGray-charcoal hover:bg-gray-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw size={15} />
                  <span>Znovu</span>
                </button>

                <button
                  onClick={() => {
                    playPopSound();
                    onClose();
                  }}
                  className="flex-1 duo-btn duo-btn-green text-xs font-feather font-black uppercase tracking-wider py-3 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Award size={16} />
                  <span>Hotovo</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Question Screen */}
          {!isGenerating && !generationError && !isCompleted && currentQuestion && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-150">
              
              {/* Question Badge & Instruction */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-feather font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-duoGray-pencil">
                    {currentQuestion.type === 'multiple-choice' && 'Výběr z možností'}
                    {currentQuestion.type === 'fill-in' && 'Doplňování výrazu'}
                    {currentQuestion.type === 'matching' && 'Spojování pojmů'}
                  </span>
                </div>

                {/* Question / Instruction title */}
                <div className="font-feather font-black text-lg text-duoGray-charcoal leading-snug">
                  {currentQuestion.type === 'multiple-choice' && (
                    <MarkdownRenderer content={currentQuestion.question} />
                  )}
                  {currentQuestion.type === 'fill-in' && (
                    <span>Doplň chybějící slovo nebo vzorec:</span>
                  )}
                  {currentQuestion.type === 'matching' && (
                    <span>{currentQuestion.instruction}</span>
                  )}
                </div>
              </div>

              {/* TYPE 1: Multiple Choice (A/B/C/D) */}
              {currentQuestion.type === 'multiple-choice' && (
                <div className="grid grid-cols-1 gap-3 mt-1">
                  {currentQuestion.options.map((option, idx) => {
                    const letters = ['A', 'B', 'C', 'D'];
                    const isSelected = selectedChoice === idx;
                    const isCorrect = idx === currentQuestion.correctIndex;

                    let btnClass = 'border-duoGray-border bg-white text-duoGray-charcoal hover:border-sparkBlue hover:bg-sparkBlue/5';

                    if (isAnswerChecked) {
                      if (isCorrect) {
                        btnClass = 'border-eagerGreen bg-eagerGreen/15 text-eagerGreen font-extrabold';
                      } else if (isSelected && !isCorrect) {
                        btnClass = 'border-cardinalRed bg-cardinalRed/15 text-cardinalRed';
                      } else {
                        btnClass = 'border-duoGray-border bg-gray-50 text-duoGray-pencil opacity-60';
                      }
                    } else if (isSelected) {
                      btnClass = 'border-sparkBlue bg-sparkBlue/10 text-sparkBlue font-extrabold';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isAnswerChecked}
                        onClick={() => handleSelectOption(idx)}
                        className={`duo-card duo-card-interactive p-3.5 flex items-center justify-between text-left transition-all cursor-pointer ${btnClass}`}
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-feather font-black text-xs shrink-0 border-2 ${
                              isAnswerChecked
                                ? isCorrect
                                  ? 'border-eagerGreen bg-eagerGreen text-white'
                                  : isSelected
                                  ? 'border-cardinalRed bg-cardinalRed text-white'
                                  : 'border-duoGray-border bg-gray-100 text-duoGray-pencil'
                                : isSelected
                                ? 'border-sparkBlue bg-sparkBlue text-white'
                                : 'border-duoGray-border bg-gray-100 text-duoGray-charcoal'
                            }`}
                          >
                            {letters[idx] || idx + 1}
                          </span>
                          <div className="flex-1 text-sm font-bold leading-snug">
                            <MarkdownRenderer content={option} />
                          </div>
                        </div>

                        {isAnswerChecked && isCorrect && (
                          <CheckCircle2 size={18} className="text-eagerGreen shrink-0 ml-2" />
                        )}
                        {isAnswerChecked && isSelected && !isCorrect && (
                          <XCircle size={18} className="text-cardinalRed shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* TYPE 2: Fill-In with Word Bank */}
              {currentQuestion.type === 'fill-in' && (
                <div className="flex flex-col gap-6 mt-1">
                  {/* Sentence with interactive blank */}
                  <div className="p-4 bg-gray-50/80 border-2 border-duoGray-border rounded-2xl text-sm sm:text-base font-bold text-duoGray-charcoal leading-relaxed">
                    <span>{currentQuestion.sentenceBefore} </span>

                    {selectedFillInAnswer ? (
                      <button
                        type="button"
                        disabled={isAnswerChecked}
                        onClick={() => {
                          playPopSound();
                          setSelectedFillInAnswer(null);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 border-b-4 font-extrabold text-sm mx-1 align-baseline transition-transform active:scale-95 cursor-pointer ${
                          isAnswerChecked
                            ? isAnswerCorrect
                              ? 'border-eagerGreen bg-eagerGreen/15 text-eagerGreen'
                              : 'border-cardinalRed bg-cardinalRed/15 text-cardinalRed'
                            : 'border-sparkBlue bg-sparkBlue/10 text-sparkBlue'
                        }`}
                      >
                        <MarkdownRenderer content={selectedFillInAnswer} />
                        {!isAnswerChecked && <X size={13} className="text-sparkBlue" />}
                      </button>
                    ) : (
                      <span className="inline-block w-28 h-8 align-middle border-b-2 border-dashed border-sparkBlue mx-1.5 bg-sparkBlue/5 rounded-lg animate-pulse" />
                    )}

                    <span> {currentQuestion.sentenceAfter}</span>
                  </div>

                  {/* Word Bank options */}
                  <div>
                    <div className="text-xs font-feather font-extrabold uppercase tracking-wider text-duoGray-pencil mb-2.5">
                      Banka slov a vzorců:
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {currentQuestion.options?.map((option, idx) => {
                        const isUsed = selectedFillInAnswer === option;

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={isAnswerChecked || isUsed}
                            onClick={() => handleSelectFillInWord(option)}
                            className={`duo-btn py-2 px-3.5 text-xs font-feather font-extrabold border-2 border-b-4 rounded-xl transition-all cursor-pointer ${
                              isUsed
                                ? 'opacity-30 border-dashed border-gray-300 bg-gray-100 text-transparent pointer-events-none'
                                : 'border-duoGray-border bg-white text-duoGray-charcoal hover:border-sparkBlue active:scale-95'
                            }`}
                          >
                            <MarkdownRenderer content={option} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TYPE 3: Matching Pairs */}
              {currentQuestion.type === 'matching' && (
                <div className="mt-1">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {/* Left Column */}
                    <div className="flex flex-col gap-2.5">
                      <div className="text-[11px] font-feather font-extrabold uppercase tracking-wider text-duoGray-pencil text-center">
                        Pojem
                      </div>
                      {currentQuestion.pairs.map((pair) => {
                        const isMatched = matchedPairIds.has(pair.id);
                        const isSelected = selectedLeftId === pair.id;
                        const isMismatch = mismatchIds.has(pair.id);

                        let styleClass = 'border-duoGray-border bg-white text-duoGray-charcoal hover:border-sparkBlue';
                        if (isMatched) {
                          styleClass = 'border-eagerGreen bg-eagerGreen/10 text-eagerGreen opacity-80 cursor-default';
                        } else if (isMismatch) {
                          styleClass = 'border-cardinalRed bg-cardinalRed/20 text-cardinalRed animate-shake';
                        } else if (isSelected) {
                          styleClass = 'border-sparkBlue bg-sparkBlue/15 text-sparkBlue font-extrabold scale-[1.02] shadow-sm';
                        }

                        return (
                          <button
                            key={`left-${pair.id}`}
                            type="button"
                            disabled={isMatched}
                            onClick={() => handleMatchingLeftClick(pair.id)}
                            className={`p-3 rounded-2xl border-2 border-b-4 text-xs sm:text-sm font-bold text-center min-h-[56px] flex items-center justify-center transition-all cursor-pointer ${styleClass}`}
                          >
                            <MarkdownRenderer content={pair.left} />
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Column (Shuffled) */}
                    <div className="flex flex-col gap-2.5">
                      <div className="text-[11px] font-feather font-extrabold uppercase tracking-wider text-duoGray-pencil text-center">
                        Význam / Hodnota
                      </div>
                      {shuffledRightPairs.map((pair) => {
                        const isMatched = matchedPairIds.has(pair.id);
                        const isSelected = selectedRightId === pair.id;
                        const isMismatch = mismatchIds.has(pair.id);

                        let styleClass = 'border-duoGray-border bg-white text-duoGray-charcoal hover:border-sparkBlue';
                        if (isMatched) {
                          styleClass = 'border-eagerGreen bg-eagerGreen/10 text-eagerGreen opacity-80 cursor-default';
                        } else if (isMismatch) {
                          styleClass = 'border-cardinalRed bg-cardinalRed/20 text-cardinalRed animate-shake';
                        } else if (isSelected) {
                          styleClass = 'border-sparkBlue bg-sparkBlue/15 text-sparkBlue font-extrabold scale-[1.02] shadow-sm';
                        }

                        return (
                          <button
                            key={`right-${pair.id}`}
                            type="button"
                            disabled={isMatched}
                            onClick={() => handleMatchingRightClick(pair.id)}
                            className={`p-3 rounded-2xl border-2 border-b-4 text-xs sm:text-sm font-bold text-center min-h-[56px] flex items-center justify-center transition-all cursor-pointer ${styleClass}`}
                          >
                            <MarkdownRenderer content={pair.right} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {matchedPairIds.size === currentQuestion.pairs.length && (
                    <div className="mt-4 p-3 rounded-2xl bg-eagerGreen/10 border-2 border-eagerGreen/30 text-eagerGreen text-xs font-bold text-center flex items-center justify-center gap-2">
                      <CheckCircle2 size={16} />
                      <span>Všechny dvojice úspěšně spojeny!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Duolingo Feedback & Action Bar */}
        {!isGenerating && !generationError && !isCompleted && currentQuestion && (
          <div
            className={`p-4 sm:p-5 border-t-2 transition-colors duration-200 flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isAnswerChecked
                ? isAnswerCorrect
                  ? 'bg-[#d7ffb8] border-eagerGreen/40'
                  : 'bg-[#ffdfe0] border-cardinalRed/40'
                : 'bg-white border-duoGray-border'
            }`}
          >
            {/* Feedback Message */}
            <div className="w-full sm:w-auto flex-1 min-w-0">
              {isAnswerChecked ? (
                <div className="flex items-start gap-3 animate-in zoom-in-95 duration-150">
                  {isAnswerCorrect ? (
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-eagerGreen shadow-xs shrink-0">
                      <CheckCircle2 size={24} />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-cardinalRed shadow-xs shrink-0">
                      <XCircle size={24} />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h4
                      className={`font-feather font-black text-base leading-tight ${
                        isAnswerCorrect ? 'text-eagerGreen' : 'text-cardinalRed'
                      }`}
                    >
                      {isAnswerCorrect ? 'Výborně! Správně!' : 'Správná odpověď:'}
                    </h4>

                    {!isAnswerCorrect && (
                      <div className="text-xs font-extrabold text-duoGray-charcoal mt-0.5">
                        {currentQuestion.type === 'multiple-choice' && (
                          <MarkdownRenderer content={currentQuestion.options[currentQuestion.correctIndex]} />
                        )}
                        {currentQuestion.type === 'fill-in' && (
                          <MarkdownRenderer content={currentQuestion.blankAnswer} />
                        )}
                      </div>
                    )}

                    {currentQuestion.explanation && (
                      <p className="text-[11px] font-bold text-duoGray-pencil mt-1 line-clamp-2">
                        {currentQuestion.explanation}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs font-feather font-bold text-duoGray-pencil hidden sm:block">
                  {currentQuestion.type === 'matching'
                    ? 'Propoj kliknutím odpovídající položky z obou sloupců.'
                    : 'Vyber odpověď a klikni na Zkontrolovat.'}
                </div>
              )}
            </div>

            {/* Action CTA Button */}
            <div className="w-full sm:w-auto">
              {!isAnswerChecked ? (
                <button
                  type="button"
                  disabled={!canCheck}
                  onClick={handleCheckAnswer}
                  className={`w-full sm:w-auto duo-btn text-xs font-feather font-black uppercase tracking-wider py-3 px-7 cursor-pointer ${
                    canCheck ? 'duo-btn-green' : 'opacity-40 bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Zkontrolovat
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleContinue}
                  className={`w-full sm:w-auto duo-btn text-xs font-feather font-black uppercase tracking-wider py-3 px-8 flex items-center justify-center gap-2 cursor-pointer ${
                    isAnswerCorrect ? 'duo-btn-green' : 'duo-btn-red'
                  }`}
                >
                  <span>Pokračovat</span>
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
