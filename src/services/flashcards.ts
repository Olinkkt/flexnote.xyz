import { FlashcardItem, NoteItem } from '../types/notes';

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

  // 2. Extract bold key definitions from list items or paragraphs: e.g. "- **Pojem**: Vysvětlení" or "1. **Pojem**: ..."
  const boldTermRegex = /^(?:[-*]|\d+\.)\s+\*\*([^*]+?)\*\*[:–—\-]\s*(.+)$/gm;
  while ((match = boldTermRegex.exec(note.markdown)) !== null) {
    const term = match[1].trim();
    const definition = match[2].trim();
    if (term.length > 2 && definition.length > 3) {
      cards.push({
        id: `card-${Date.now()}-${cardIndex++}`,
        front: `Co znamená nebo jaké pravidlo platí pro **${term}**?`,
        back: `**${term}**:\n${definition}`,
        category: 'concept',
      });
    }
  }

  // 3. Extract blockquotes: > **Důležité:** ... or > ...
  const blockquoteRegex = /^>\s+(?:\*\*([^*]+?)\*\*[:\s]*)?(.+)$/gm;
  while ((match = blockquoteRegex.exec(note.markdown)) !== null) {
    const label = match[1]?.trim() || 'Důležité pravidlo';
    const content = match[2].trim();
    if (content.length > 10) {
      cards.push({
        id: `card-${Date.now()}-${cardIndex++}`,
        front: `Jaké je klíčové pravidlo / poučka pro **${note.title}**?`,
        back: `> **${label}:**\n> ${content}`,
        category: 'fact',
      });
    }
  }

  // 4. Extract bullet points with dates or events (e.g. "- **1420**: Bitva na Vítkově")
  const dateRegex = /^(?:[-*]|\d+\.)\s+\*\*(\d{1,4}[^*]*)\*\*[:–—\-]\s*(.+)$/gm;
  while ((match = dateRegex.exec(note.markdown)) !== null) {
    const dateStr = match[1].trim();
    const event = match[2].trim();
    if (!cards.some(c => c.front.includes(dateStr) || c.front.includes(event))) {
      cards.push({
        id: `card-${Date.now()}-${cardIndex++}`,
        front: `K jaké události se váže datum nebo rok **${dateStr}**?`,
        back: `**${dateStr}**:\n${event}`,
        category: 'fact',
      });
    }
  }

  // 5. If we still have fewer than 3 cards, generate cards from sections (H2 / H3)
  if (cards.length < 3) {
    const sectionRegex = /^(?:##|###)\s+(.+)$/gm;
    let sectionMatch: RegExpExecArray | null;
    while ((sectionMatch = sectionRegex.exec(note.markdown)) !== null) {
      const sectionTitle = sectionMatch[1].trim();
      const startIndex = sectionMatch.index + sectionMatch[0].length;
      const nextHeadingIndex = note.markdown.indexOf('\n#', startIndex);
      const sectionContent = (
        nextHeadingIndex !== -1
          ? note.markdown.substring(startIndex, nextHeadingIndex)
          : note.markdown.substring(startIndex)
      ).trim();

      if (sectionContent.length > 15) {
        cards.push({
          id: `card-${Date.now()}-${cardIndex++}`,
          front: `Co patří k tématu **${sectionTitle}**?`,
          back: `**${sectionTitle}**:\n\n${sectionContent.substring(0, 260)}${sectionContent.length > 260 ? '...' : ''}`,
          category: 'general',
        });
      }
    }
  }

  // 6. If empty (very short note), create at least summary card
  if (cards.length === 0) {
    cards.push({
      id: `card-${Date.now()}-1`,
      front: `O čem pojednává zápisek **${note.title}**?`,
      back: note.summary || note.markdown.substring(0, 180),
      category: 'general',
    });
  }

  return cards.slice(0, 10);
}

/**
 * Generate smart flashcards using OpenRouter AI model, with seamless offline fallback.
 */
export async function generateFlashcardsForNote(note: NoteItem): Promise<FlashcardItem[]> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  // If no API key or offline, use smart offline extractor immediately
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_openrouter_api_key_here') || !navigator.onLine) {
    return generateOfflineFlashcards(note);
  }

  const systemPrompt = `Jsi výukový asistent aplikace Flexnote specializovaný na tvorbu chytrých oboustranných kartiček (Flashcards) ze školních zápisků studentů.

PRAVIDLA PRO TVORBU KARTIČEK:
1. Vygeneruj 4 až 8 nejlepších a nejefektivnějších kartiček pro zkoušení z daného textu.
2. FRONT (Přední strana):
   - Stručná a jasná otázka, výzva nebo název pojmu/vzorce (např. "Jak zní vzorec pro diskriminant?", "Co vyjadřuje sinová věta?", "Kdy proběhla bitva na Vítkově?").
   - Pokud se ptáš na vzorec nebo proměnnou, můžeš použít $...$ nebo $$...$$.
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
   - "general" (obecná otázka)

VÝSTUP MUSÍ BÝT VÝHRADNĚ VALIDNÍ JSON POLE BEZ DALŠÍHO TEXTU OKOLO:
[
  {
    "front": "Jak zní vzorec pro sinovou větu?",
    "back": "$$\\frac{a}{\\sin(\\alpha)} = \\frac{b}{\\sin(\\beta)} = \\frac{c}{\\sin(\\gamma)} = 2R$$\\n\\nPlatí pro libovolný obecný trojúhelník.",
    "category": "formula"
  }
]`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
        'HTTP-Referer': 'https://flexnote.xyz',
        'X-Title': 'Flexnote',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Vytvoř prosím výukové flashcards z tohoto zápisku:\n\nTéma: ${note.title}\nPředmět: ${note.subject}\n\n${note.markdown}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.warn(`OpenRouter flashcards request failed with ${response.status}, using offline fallback.`);
      return generateOfflineFlashcards(note);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      return generateOfflineFlashcards(note);
    }

    const cards = parseFlashcardsOutput(rawContent);
    return cards.length > 0 ? cards : generateOfflineFlashcards(note);
  } catch (err) {
    console.warn('Network error during AI flashcard generation, falling back to local extractor:', err);
    return generateOfflineFlashcards(note);
  }
}
