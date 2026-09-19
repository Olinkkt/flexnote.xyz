import { GoogleGenAI, Type } from '@google/genai';
import { FlashcardItem, NoteItem } from '../types/notes';
import { checkRateLimit, recordRateLimitUsage } from './rateLimiter';
import { getGeminiApiKey } from './gemini';

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
 * Generates high-quality smart flashcards using Google Gemini API.
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

  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `Jsi výukový asistent aplikace Flexnote specializovaný na tvorbu chytrých oboustranných kartiček (Flashcards) ze školních zápisků studentů.

PRAVIDLA PRO TVORBU KARTIČEK:
1. Vygeneruj 4 až 8 nejlepších a nejefektivnějších kartiček pro zkoušení z daného textu.
2. FRONT (Přední strana):
   - Stručná a jasná otázka, výzva nebo název pojmu/vzorce (např. "Jak zní vzorec pro diskriminant?", "Co vyjadřuje sinová věta?", "Kdy proběhla bitva na Vítkově?").
   - Pokud se ptáš na vzorec nebo proměnnou, použij $...$ nebo $$...$$.
3. BACK (Zadní strana):
   - Přesná a srozumitelná odpověď.
   - VŽDY zformátuj matematické rovnice a výpočty do KaTeX syntaxe:
     - Důležité a samostatné vzorce: $$...$$ (např. $$D = b^2 - 4ac$$)
     - Krátké proměnné a výrazy v textu: $...$ (např. pro $a \\neq 0$)
   - Důležité pojmy a klíčová slova zvýrazni **tučně**.
4. KATEGORIE:
   - "formula" (matematický/fyzikální vzorec)
   - "concept" (definice, pojem, pravopisné pravidlo)
   - "fact" (datum, událost, autor, dílo)
   - "general" (obecná otázka)`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Vytvoř prosím výukové flashcards z tohoto zápisku:\n\nTéma: ${note.title}\nPředmět: ${note.subject}\n\n${note.markdown}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: {
                type: Type.STRING,
                description: 'Otázka na přední straně kartičky',
              },
              back: {
                type: Type.STRING,
                description: 'Odpověď na zadní straně kartičky (s KaTeXem)',
              },
              category: {
                type: Type.STRING,
                enum: ['formula', 'concept', 'fact', 'general'],
              },
              hint: {
                type: Type.STRING,
                description: 'Volitelná nápověda',
              },
            },
            required: ['front', 'back', 'category'],
          },
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('AI nevrátila žádný obsah kartiček.');
    }

    const cards = parseFlashcardsOutput(responseText);
    if (cards.length > 0) {
      recordRateLimitUsage('generate_flashcards');
      return cards;
    }

    throw new Error('Nepodařilo se zpracovat vygenerované kartičky z AI. Zkuste to prosím znovu.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('API_KEY_MISSING')) {
      throw err;
    }
    throw new Error(`Generování kartiček selhalo: ${message}`);
  }
}

/**
 * Generate smart flashcards for an entire topic combining all notes
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

  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const combinedContent = notes
    .map((n, i) => `### Strana ${i + 1}: ${n.title}\n${n.markdown}`)
    .join('\n\n---\n\n');

  const systemInstruction = `Jsi výukový asistent aplikace Flexnote specializovaný na tvorbu chytrých oboustranných kartiček (Flashcards) ze školních zápisků studentů.
Tvým úkolem je vytvořit komplexní balíček kartiček pokrývající celé téma „${topicName}“, které se skládá z ${notes.length} stránek zápisků.

PRAVIDLA PRO TVORBU KARTIČEK:
1. Vygeneruj 6 až 10 nejlepších kartiček pokrývajících celou kapitolu.
2. FRONT: stručná a jasná otázka nebo pojem.
3. BACK: přesná odpověď, matematické výrazy VŽDY v KaTeXu ($...$ nebo $$...$$), klíčové pojmy tučně (**bold**).`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Vytvoř souhrnné flashcards z tohoto tématu:\n\nTéma: ${topicName}\nPředmět: ${subject}\n\n${combinedContent}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: {
                type: Type.STRING,
                description: 'Otázka na přední straně kartičky',
              },
              back: {
                type: Type.STRING,
                description: 'Odpověď na zadní straně kartičky (s KaTeXem)',
              },
              category: {
                type: Type.STRING,
                enum: ['formula', 'concept', 'fact', 'general'],
              },
              hint: {
                type: Type.STRING,
                description: 'Volitelná nápověda',
              },
            },
            required: ['front', 'back', 'category'],
          },
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('AI nevrátila žádný obsah kartiček.');
    }

    const cards = parseFlashcardsOutput(responseText);
    if (cards.length > 0) {
      recordRateLimitUsage('generate_flashcards');
      return cards;
    }

    throw new Error('Nepodařilo se zpracovat vygenerované kartičky z AI. Zkuste to prosím znovu.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('API_KEY_MISSING')) {
      throw err;
    }
    throw new Error(`Generování kartiček selhalo: ${message}`);
  }
}
