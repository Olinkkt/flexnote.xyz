import { FlashcardItem, FlashcardSRS, NoteItem, SubjectType } from '../types/notes';

export const DEFAULT_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type SRSRating = 'again' | 'hard' | 'good' | 'easy';

export interface CardWithNote {
  card: FlashcardItem;
  note: NoteItem;
}

/**
 * Calculates current retention percentage according to Ebbinghaus forgetting curve:
 * R = e^(-t / S)
 * where t is elapsed days since last review and S is memory stability in days.
 */
export function calculateRetention(srs?: FlashcardSRS): number {
  if (!srs || !srs.lastReviewedAt) {
    return 100; // Freshly created or unseen
  }

  const elapsedDays = Math.max(0, (Date.now() - srs.lastReviewedAt) / ONE_DAY_MS);
  const stability = Math.max(0.5, srs.stability || srs.interval || 1);

  // Ebbinghaus formula
  const retention = Math.exp(-elapsedDays / stability);
  return Math.min(100, Math.max(10, Math.round(retention * 100)));
}

/**
 * Checks whether two millisecond timestamps fall on the exact same local calendar date.
 */
export function isSameCalendarDay(t1?: number, t2?: number): boolean {
  if (!t1 || !t2) return false;
  const d1 = new Date(t1);
  const d2 = new Date(t2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Calculates the next SRS interval, easeFactor, and dueDate based on rating.
 */
export function calculateNextSRS(
  currentSRS?: FlashcardSRS,
  rating: SRSRating = 'good'
): FlashcardSRS {
  const now = Date.now();
  const lapses = currentSRS?.lapses || 0;
  const currentRep = currentSRS?.repetition || 0;
  const currentEase = currentSRS?.easeFactor || DEFAULT_EASE_FACTOR;
  const currentInterval = currentSRS?.interval || 1;

  // Kontrola, zda již byla kartička dnes úspěšně procvičena
  const reviewedToday = isSameCalendarDay(now, currentSRS?.lastReviewedAt);

  if (rating === 'again') {
    // Student u pojmu selhal -> zaznamenat lapse a nastavit opakování na 1 den
    const newLapses = lapses + 1;
    const newEase = Math.max(MIN_EASE_FACTOR, Number((currentEase - 0.2).toFixed(2)));
    const interval = 1; // zítra

    return {
      interval,
      repetition: 0,
      easeFactor: newEase,
      dueDate: now + interval * ONE_DAY_MS,
      lastReviewedAt: now,
      lapses: newLapses,
      stability: 1,
    };
  }

  // Pokud již byla kartička dnes úspěšně zopakována (repetition > 0),
  // další procvičování v tomtéž dni NESMÍ uměle navyšovat interval ani posouvat termín dále!
  if (reviewedToday && currentRep > 0) {
    return {
      interval: currentInterval,
      repetition: currentRep,
      easeFactor: currentEase,
      dueDate: currentSRS ? currentSRS.dueDate : now + currentInterval * ONE_DAY_MS,
      lastReviewedAt: now,
      lapses: 0,
      stability: currentSRS?.stability || currentInterval,
    };
  }

  if (rating === 'hard') {
    // Recalled with difficulty
    const newEase = Math.max(MIN_EASE_FACTOR, Number((currentEase - 0.15).toFixed(2)));
    const interval = Math.max(1, Math.round(currentInterval * 1.2));

    return {
      interval,
      repetition: currentRep + 1,
      easeFactor: newEase,
      dueDate: now + interval * ONE_DAY_MS,
      lastReviewedAt: now,
      lapses: Math.max(0, lapses - 1),
      stability: interval,
    };
  }

  if (rating === 'easy') {
    // Recalled very easily -> bonus multiplier
    const newEase = Number((currentEase + 0.15).toFixed(2));
    let interval = 3;
    if (currentRep === 0) interval = 3;
    else if (currentRep === 1) interval = 6;
    else interval = Math.max(1, Math.round(currentInterval * newEase * 1.3));

    return {
      interval,
      repetition: currentRep + 1,
      easeFactor: newEase,
      dueDate: now + interval * ONE_DAY_MS,
      lastReviewedAt: now,
      lapses: 0, // Pojem byl úspěšně zvládnut
      stability: interval,
    };
  }

  // Standard 'good' / 'Umím to!'
  const rep = currentRep + 1;
  let interval = 1;
  if (rep === 1) interval = 1;
  else if (rep === 2) interval = 3;
  else interval = Math.max(1, Math.round(currentInterval * currentEase));

  return {
    interval,
    repetition: rep,
    easeFactor: currentEase,
    dueDate: now + interval * ONE_DAY_MS,
    lastReviewedAt: now,
    lapses: 0, // Pojem byl úspěšně zvládnut
    stability: interval,
  };
}

/**
 * Checks if a card is due for review today according to its SRS schedule.
 */
export function isDueForReview(card: FlashcardItem): boolean {
  if (!card.srs) return true; // Brand new cards are ready for first review
  return card.srs.dueDate <= Date.now();
}

/**
 * Identifies concepts that cause trouble to the student (unresolved failure or low retention).
 */
export function isTroublesome(card: FlashcardItem): boolean {
  if (!card.srs) return false;
  // Pokud student u posledního zkoušení selhal (repetition byla resetována na 0)
  if (card.srs.repetition === 0 && card.srs.lastReviewedAt) return true;
  // Pokud jsou aktivní lapses a pojem nebyl znovu úspěšně zopakován
  if (card.srs.lapses > 0 && card.srs.repetition === 0) return true;
  // Nebo pokud retence podle křivky zapomínání klesla pod kritickou mez (65 %)
  return calculateRetention(card.srs) < 65;
}

/**
 * Human-readable Czech interval formatted string
 */
export function formatInterval(days: number): string {
  if (days <= 0) return 'ihned';
  if (days === 1) return 'zítra';
  if (days >= 2 && days <= 4) return `za ${days} dny`;
  return `za ${days} dní`;
}

/**
 * Previews what interval will be set if this rating is chosen
 */
export function previewNextInterval(
  currentSRS?: FlashcardSRS,
  rating: SRSRating = 'good'
): string {
  const next = calculateNextSRS(currentSRS, rating);
  return formatInterval(next.interval);
}

/**
 * Extracts all cards due for repetition across notes, optionally filtered by subject.
 */
export function getDueCards(notes: NoteItem[], subject?: SubjectType): CardWithNote[] {
  const list: CardWithNote[] = [];

  notes.forEach((note) => {
    if (subject && subject !== 'all' && note.subject !== subject) return;
    const cards = note.flashcards || [];
    cards.forEach((card) => {
      if (isDueForReview(card)) {
        list.push({ card, note });
      }
    });
  });

  return list;
}

/**
 * Extracts troublesome cards across notes, sorted by lapses descending.
 */
export function getTroublesomeCards(notes: NoteItem[], subject?: SubjectType): CardWithNote[] {
  const list: CardWithNote[] = [];

  notes.forEach((note) => {
    if (subject && subject !== 'all' && note.subject !== subject) return;
    const cards = note.flashcards || [];
    cards.forEach((card) => {
      if (isTroublesome(card)) {
        list.push({ card, note });
      }
    });
  });

  // Sort by highest lapses first, then lowest retention
  return list.sort((a, b) => {
    const lapsesA = a.card.srs?.lapses || 0;
    const lapsesB = b.card.srs?.lapses || 0;
    if (lapsesB !== lapsesA) return lapsesB - lapsesA;
    return calculateRetention(a.card.srs) - calculateRetention(b.card.srs);
  });
}

/**
 * Aggregates overall SRS statistics across the given notes
 */
export function getSRSOverviewStats(notes: NoteItem[], subject?: SubjectType) {
  let totalCards = 0;
  let dueCount = 0;
  let troublesomeCount = 0;
  let masteredCount = 0;
  let retentionSum = 0;

  notes.forEach((note) => {
    if (subject && subject !== 'all' && note.subject !== subject) return;
    const cards = note.flashcards || [];
    cards.forEach((card) => {
      totalCards++;
      if (isDueForReview(card)) dueCount++;
      if (isTroublesome(card)) troublesomeCount++;
      if (card.srs && card.srs.repetition >= 3 && card.srs.interval >= 7) {
        masteredCount++;
      }
      retentionSum += calculateRetention(card.srs);
    });
  });

  const avgRetention = totalCards > 0 ? Math.round(retentionSum / totalCards) : 100;

  return {
    totalCards,
    dueCount,
    troublesomeCount,
    masteredCount,
    avgRetention,
  };
}
