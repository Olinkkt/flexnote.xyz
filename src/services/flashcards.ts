import { FlashcardItem, NoteItem } from '../types/notes';
import { checkRateLimit, recordRateLimitUsage } from './rateLimiter';
import { callGeminiApi } from './gemini';

/**
 * Robustly parses JSON from LLM response
 */
function parseFlashcardsOutput(content: string): FlashcardItem[] {
  let cleaned = content.trim();

  // Strip markdown code fence ```json ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    const items = Array.isArray(parsed) ? parsed : parsed.flashcards || [];
    if (!Array.isArray(items)) return [];

    return items
      .filter((item: any) => item && typeof item.front === 'string' && typeof item.back === 'string')
      .map((item: any, idx: number) => ({
        id: item.id || `card-${Date.now()}-${idx + 1}`,
        front: item.front.trim(),
        back: item.back.trim(),
        category: item.category || 'general',
        hint: item.hint || undefined,
      }));
  } catch (err) {
    console.warn('Failed to parse AI flashcards JSON:', err);
    return [];
  }
}

/**
 * Intelligent rule-based offline generator.
 * Extracts flashcards from KaTeX formulas, bold terms, blockquotes, and sections.
 * Guarantees that students get flashcards even without internet or API key.
 */
export function generateOfflineFlashcards(note: NoteItem): FlashcardItem[] {
  const cards: FlashcardItem[] = [];
  let cardIndex = 1;

  // 1. Extract Display Math blocks ($$ ... $$)
  const mathBlockRegex = /\$\$([\s\S]*?)\$\$/g;
  let match: RegExpExecArray | null;
  while ((match = mathBlockRegex.exec(note.markdown)) !== null) {
    const formula = match[1].trim();
    if (formula.length > 0) {
      // Look for a preceding line or heading to give context
      const textBefore = note.markdown.substring(0, match.index).trim();
      const lastHeadingMatch = textBefore.match(/#{1,3}\s+(.+)$/m);
      const topicContext = lastHeadingMatch ? lastHeadingMatch[1].trim() : note.title;

      cards.push({
        id: `card-${Date.now()}-${cardIndex++}`,
        front: `Jak zní matematický vzorec pro **${topicContext}**?`,
        back: `$$${formula}$$\n\n*Použití v tématu ${note.title}*`,
        category: 'formula',
      });
    }
  }

  // 2. Extract bold definitions (**Pojem**: definice or **Pojem** - definice)
  const boldDefRegex = /\*\*([^*]+)\*\*\s*[:–-]\s*([^\n]+)/g;
  while ((match = boldDefRegex.exec(note.markdown)) !== null) {
    const term = match[1].trim();
    const definition = match[2].trim();
    if (term.length > 2 && definition.length > 5) {
      cards.push({
        id: `card-${Date.now()}-${cardIndex++}`,
        front: `Co znamená pojem **${term}**?`,
        back: `${definition}\n\n*Předmět: ${note.subject}*`,
        category: 'concept',
      });
    }
  }

  // 3. Extract Blockquotes (> **Důležité:** ...)
  const quoteRegex = />\s*\*\*([^*]+)\*\*:?\s*([^\n]+)/g;
  while ((match = quoteRegex.exec(note.markdown)) !== null) {
    const label = match[1].trim();
    const content = match[2].trim();
    if (content.length > 10) {
      cards.push({
        id: `card-${Date.now()}-${cardIndex++}`,
        front: `Klíčové pravidlo / poučka (**${label}**):`,
        back: `${content}`,
        category: 'concept',
      });
    }
  }

  // 4. Extract bullet list key points (- **Pojem** ...)
  const listPointRegex = /[-*]\s+\*\*([^*]+)\*\*\s*([^\n]*)/g;
  while ((match = listPointRegex.exec(note.markdown)) !== null) {
    const key = match[1].trim();
    const detail = match[2].replace(/^[:–-]\s*/, '').trim();
    if (key.length > 2 && detail.length > 8 && !cards.some((c) => c.front.includes(key))) {
      cards.push({
        id: `card-${Date.now()}-${cardIndex++}`,
        front: `Co platí pro **${key}**?`,
        back: `${detail}`,
        category: 'fact',
      });
    }
  }

  // Fallback if note had no structured KaTeX or bold markers: generate summary cards
  if (cards.length === 0) {
    cards.push({
      id: `card-${Date.now()}-summary-1`,
      front: `O čem pojednává zápisek **${note.title}**?`,
      back: note.summary || 'Zápisek ze školního sešitu.',
      category: 'general',
    });

    const lines = note.markdown
      .split('\n')
      .map((l) => l.replace(/^[#\-*>\s]+/, '').trim())
      .filter((l) => l.length > 20 && !l.startsWith('$$'));

    if (lines.length > 0) {
      cards.push({
        id: `card-${Date.now()}-summary-2`,
        front: `Klíčový bod ze zápisku **${note.title}**:`,
        back: lines[0],
        category: 'concept',
      });
    }
  }

  return cards.slice(0, 10);
}

/**
 * Generates high-quality smart flashcards using Google Gemini API via secure /api/gemini backend.
 */
export async function generateFlashcardsForNote(note: NoteItem): Promise<FlashcardItem[]> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Pro vygenerování kartiček je vyžadováno připojení k internetu.');
  }

  // Rate limit check
  const rateCheck = checkRateLimit('generate_flashcards');
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.reason || 'Dosažen limit pro generování kartiček.');
  }

  try {
    const rawResult = await callGeminiApi('flashcards', {
      promptTitle: note.title,
      subject: note.subject,
      text: note.markdown,
    });

    const cards = parseFlashcardsOutput(typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult));
    if (cards.length > 0) {
      recordRateLimitUsage('generate_flashcards');
      return cards;
    }

    throw new Error('Nepodařilo se zpracovat vygenerované kartičky z AI. Zkuste to prosím znovu.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Generování kartiček selhalo: ${message}`);
  }
}

/**
 * Generate smart flashcards for an entire topic combining all notes via secure /api/gemini backend.
 */
export async function generateFlashcardsForTopic(
  topicName: string,
  subject: string,
  notes: NoteItem[]
): Promise<FlashcardItem[]> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Pro vygenerování kartiček je vyžadováno připojení k internetu.');
  }

  // Rate limit check
  const rateCheck = checkRateLimit('generate_flashcards');
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.reason || 'Dosažen limit pro generování kartiček.');
  }

  const combinedContent = notes
    .map((n, i) => `### Strana ${i + 1}: ${n.title}\n${n.markdown}`)
    .join('\n\n---\n\n');

  try {
    const rawResult = await callGeminiApi('flashcards', {
      promptTitle: topicName,
      subject,
      text: combinedContent,
    });

    const cards = parseFlashcardsOutput(typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult));
    if (cards.length > 0) {
      recordRateLimitUsage('generate_flashcards');
      return cards;
    }

    throw new Error('Nepodařilo se zpracovat vygenerované kartičky z AI. Zkuste to prosím znovu.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Generování kartiček selhalo: ${message}`);
  }
}
