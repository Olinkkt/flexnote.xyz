import { NoteItem, QuizQuestion, MultipleChoiceQuestion, FillInQuestion, MatchingQuestion } from '../types/notes';
import { checkRateLimit, recordRateLimitUsage } from './rateLimiter';
import { callGeminiApi } from './gemini';

/**
 * Robustly parses JSON from LLM response into typed QuizQuestions
 */
function parseQuizOutput(content: string): QuizQuestion[] {
  let cleaned = typeof content === 'string' ? content.trim() : JSON.stringify(content);

  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  try {
    const parsed = typeof content === 'object' && content !== null ? content : JSON.parse(cleaned);
    const rawItems = Array.isArray(parsed) ? parsed : parsed.questions || [];
    if (!Array.isArray(rawItems)) return [];

    const questions: QuizQuestion[] = [];

    rawItems.forEach((item: any, idx: number) => {
      if (!item || !item.type) return;
      const baseId = item.id || `quiz-q-${Date.now()}-${idx + 1}`;

      if (item.type === 'multiple-choice') {
        const options: string[] = Array.isArray(item.options) ? item.options.map(String) : [];
        if (options.length >= 2 && typeof item.question === 'string') {
          const correctIndex = typeof item.correctIndex === 'number' && item.correctIndex >= 0 && item.correctIndex < options.length
            ? item.correctIndex
            : 0;

          questions.push({
            id: baseId,
            type: 'multiple-choice',
            question: item.question.trim(),
            options: options.map((o: string) => o.trim()),
            correctIndex,
            explanation: item.explanation ? String(item.explanation).trim() : undefined,
          } as MultipleChoiceQuestion);
        }
      } else if (item.type === 'fill-in') {
        const blank = item.blankAnswer ? String(item.blankAnswer).trim() : '';
        if (blank) {
          let options: string[] = Array.isArray(item.options) ? item.options.map(String).map((s: string) => s.trim()) : [];
          // Ensure blankAnswer is in options
          if (!options.includes(blank)) {
            options.unshift(blank);
          }
          // Shuffle or deduplicate options
          options = Array.from(new Set(options));

          questions.push({
            id: baseId,
            type: 'fill-in',
            sentenceBefore: item.sentenceBefore ? String(item.sentenceBefore).trim() : '',
            blankAnswer: blank,
            sentenceAfter: item.sentenceAfter ? String(item.sentenceAfter).trim() : '',
            options,
            explanation: item.explanation ? String(item.explanation).trim() : undefined,
          } as FillInQuestion);
        }
      } else if (item.type === 'matching') {
        const pairs = Array.isArray(item.pairs)
          ? item.pairs
              .filter((p: any) => p && typeof p.left === 'string' && typeof p.right === 'string')
              .map((p: any, pIdx: number) => ({
                id: p.id || `pair-${pIdx + 1}`,
                left: String(p.left).trim(),
                right: String(p.right).trim(),
              }))
          : [];

        if (pairs.length >= 2) {
          questions.push({
            id: baseId,
            type: 'matching',
            instruction: item.instruction ? String(item.instruction).trim() : 'Přiřaď správné dvojice k sobě:',
            pairs,
            explanation: item.explanation ? String(item.explanation).trim() : undefined,
          } as MatchingQuestion);
        }
      }
    });

    return questions;
  } catch (err) {
    console.warn('Failed to parse AI quiz JSON:', err);
    return [];
  }
}

/**
 * Generates an online practice test via secure /api/gemini backend.
 */
export async function generateQuizForNote(note: NoteItem): Promise<QuizQuestion[]> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Pro vygenerování cvičného testu je vyžadováno připojení k internetu.');
  }

  // Rate limit check
  const rateCheck = checkRateLimit('generate_quiz');
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.reason || 'Dosažen limit pro generování cvičného testu.');
  }

  try {
    const rawResult = await callGeminiApi('quiz', {
      promptTitle: note.title,
      subject: note.subject,
      text: note.markdown,
      isTopic: false,
    });

    const questions = parseQuizOutput(rawResult);
    if (questions.length === 0) {
      throw new Error('Nepodařilo se zpracovat vygenerovaný test z AI. Zkuste to prosím znovu.');
    }

    recordRateLimitUsage('generate_quiz');
    return questions;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Generování testu selhalo: ${message}`);
  }
}

/**
 * Generates a comprehensive practice test covering an entire topic via secure /api/gemini backend.
 */
export async function generateQuizForTopic(
  topicName: string,
  subject: string,
  notes: NoteItem[]
): Promise<QuizQuestion[]> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Pro vygenerování cvičného testu je vyžadováno připojení k internetu.');
  }

  // Rate limit check
  const rateCheck = checkRateLimit('generate_quiz');
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.reason || 'Dosažen limit pro generování cvičného testu.');
  }

  const combinedContent = notes
    .map((n, i) => `### Strana ${i + 1}: ${n.title}\n${n.markdown}`)
    .join('\n\n---\n\n');

  try {
    const rawResult = await callGeminiApi('quiz', {
      promptTitle: topicName,
      subject,
      text: combinedContent,
      isTopic: true,
    });

    const questions = parseQuizOutput(rawResult);
    if (questions.length === 0) {
      throw new Error('Nepodařilo se zpracovat test pro téma. Zkuste to prosím znovu.');
    }

    recordRateLimitUsage('generate_quiz');
    return questions;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Generování testu z tématu selhalo: ${message}`);
  }
}
