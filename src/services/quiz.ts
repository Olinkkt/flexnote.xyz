import { NoteItem, QuizQuestion, MultipleChoiceQuestion, FillInQuestion, MatchingQuestion } from '../types/notes';
import { checkRateLimit, recordRateLimitUsage } from './rateLimiter';

/**
 * Robustly parses JSON from LLM response into typed QuizQuestions
 */
function parseQuizOutput(content: string): QuizQuestion[] {
  let cleaned = content.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
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
        const rawPairs = Array.isArray(item.pairs) ? item.pairs : [];
        const pairs = rawPairs
          .filter((p: any) => p && typeof p.left === 'string' && typeof p.right === 'string')
          .map((p: any, pIdx: number) => ({
            id: p.id || `pair-${pIdx + 1}`,
            left: String(p.left).trim(),
            right: String(p.right).trim(),
          }));

        if (pairs.length >= 2) {
          questions.push({
            id: baseId,
            type: 'matching',
            instruction: item.instruction ? String(item.instruction).trim() : 'Spoj odpovídající pojmy:',
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
 * Generates an online practice test via OpenRouter AI.
 * Explicit requirement: No offline generation ("Nebude to offline").
 * Must throw clear Czech errors if offline or if API key is not configured.
 */
export async function generateQuizForNote(note: NoteItem): Promise<QuizQuestion[]> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Pro vygenerování cvičného testu je vyžadováno připojení k internetu.');
  }

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_openrouter_api_key_here')) {
    throw new Error('Chybí OpenRouter API klíč pro AI generování testu.');
  }

  const systemPrompt = `Jsi expertní pedagogický asistent aplikace Flexnote pro studenty středních a základních škol.
Tvým úkolem je vytvořit interaktivní cvičný test (Practice Quiz) ušitý na míru ze zápisků studenta.

PRAVIDLA A TYPY OTÁZEK:
Vytvoř 4 až 6 vysoce kvalitních otázek, které komplexně prověří látku.
Zahrň následující 3 typy otázek:
1. "multiple-choice" (výběr z možností A, B, C, D):
   - "question": text otázky (může obsahovat KaTeX $...$ nebo $$...$$)
   - "options": pole přesně 4 možností (žádná písmena A, B na začátku, jen čistý text/vzorec)
   - "correctIndex": číslo 0, 1, 2 nebo 3 odpovídající indexu správné možnosti
   - "explanation": přátelské 1-2 větné vysvětlení

2. "fill-in" (doplňování chybějícího slova nebo vzorce):
   - "sentenceBefore": text věty před doplňovaným výrazem
   - "blankAnswer": přesný výraz, který student doplňuje (slovo, letopočet, nebo vzorec např. "$b^2 - 4ac$")
   - "sentenceAfter": text věty za doplňovaným výrazem (např. "." nebo pokračování věty)
   - "options": pole 4 možností (jedna z nich je přesně blankAnswer, další 3 jsou věrohodné distraktory)
   - "explanation": vysvětlení

3. "matching" (spojování dvojic pojmů, vzorců nebo letopočtů):
   - "instruction": zadání (např. "Spoj pojmy s jejich správnou definicí:" nebo "Přiřaď vzorce k fyzikálním veličinám:")
   - "pairs": pole 3 až 4 dvojic ve tvaru:
     [
       { "id": "p1", "left": "Pojem 1", "right": "Vysvětlení 1" },
       { "id": "p2", "left": "Pojem 2", "right": "Vysvětlení 2" },
       { "id": "p3", "left": "Pojem 3", "right": "Vysvětlení 3" }
     ]
   - "explanation": vysvětlení

DŮLEŽITÉ:
- Všechny matematické, chemické či fyzikální výrazy a rovnice VŽDY uzavři do KaTeX syntaxe ($...$ nebo $$...$$).
- Texty piš v bezchybné spisovné češtině.
- Vrať VÝHRADNĚ čistý JSON pole bez jakéhokoliv dalšího úvodního či průvodního textu:
[
  {
    "type": "multiple-choice",
    "question": "Jaká je hodnota diskriminantu kvadratické rovnice?",
    "options": ["$$D = b^2 - 4ac$$", "$$D = b^2 + 4ac$$", "$$D = -b \\pm \\sqrt{ac}$$", "$$D = 4ac - b^2$$"],
    "correctIndex": 0,
    "explanation": "Diskriminant se počítá podle vzorce $D = b^2 - 4ac$."
  },
  {
    "type": "fill-in",
    "sentenceBefore": "Pokud je diskriminant",
    "blankAnswer": "větší než nula",
    "sentenceAfter": ", má kvadratická rovnice dva různé reálné kořeny.",
    "options": ["větší než nula", "menší než nula", "roven nule", "nedefinovaný"],
    "explanation": "Kladný diskriminant ($D > 0$) znamená dva reálné kořeny."
  },
  {
    "type": "matching",
    "instruction": "Přiřaď počet kořenů k hodnotě diskriminantu:",
    "pairs": [
      { "id": "p1", "left": "$D > 0$", "right": "Dva reálné kořeny" },
      { "id": "p2", "left": "$D = 0$", "right": "Jeden dvojnásobný kořen" },
      { "id": "p3", "left": "$D < 0$", "right": "Žádný reálný kořen v R" }
    ],
    "explanation": "Počet reálných kořenů přímo závisí na znaménku diskriminantu."
  }
]`;

  // Rate limit and spending cap check
  const rateCheck = checkRateLimit('generate_quiz');
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.reason || 'Dosažen limit pro generování cvičného testu.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
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
            content: `Vytvoř cvičný test ze zápisku:\n\nTitul: ${note.title}\nPředmět: ${note.subject}\n\nObsah zápisku:\n${note.markdown}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Generování testu přes AI selhalo (kód ${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error('AI nevrátila žádný obsah testu.');
    }

    const questions = parseQuizOutput(rawContent);
    if (questions.length === 0) {
      throw new Error('Nepodařilo se zpracovat vygenerovaný test z AI. Zkuste to prosím znovu.');
    }

    recordRateLimitUsage('generate_quiz');
    return questions;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Generování cvičného testu vypršelo (časový limit 35 s). AI model neodpověděl včas.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generates a comprehensive practice test covering an entire topic (combining multiple note pages).
 */
export async function generateQuizForTopic(
  topicName: string,
  subject: string,
  notes: NoteItem[]
): Promise<QuizQuestion[]> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Pro vygenerování cvičného testu je vyžadováno připojení k internetu.');
  }

  // Rate limit and spending cap check
  const rateCheck = checkRateLimit('generate_quiz');
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.reason || 'Dosažen limit pro generování cvičného testu.');
  }

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_openrouter_api_key_here')) {
    throw new Error('Chybí OpenRouter API klíč pro AI generování testu.');
  }

  const combinedContent = notes
    .map((n, i) => `### Strana ${i + 1}: ${n.title}\n${n.markdown}`)
    .join('\n\n---\n\n');

  const systemPrompt = `Jsi expertní pedagogický asistent aplikace Flexnote pro studenty středních a základních škol.
Tvým úkolem je vytvořit KOMPLEXNÍ souhrnný cvičný test (Comprehensive Practice Quiz) pro celé ucelené téma / kapitolu, které se skládá z ${notes.length} stránek zápisků.

PRAVIDLA A TYPY OTÁZEK:
Vytvoř 6 až 8 vysoce kvalitních otázek pokrývajících celé téma od základních definic po vzorce a praktické příklady.
Zahrň následující 3 typy otázek:
1. "multiple-choice" (výběr z možností A, B, C, D):
   - "question": text otázky (může obsahovat KaTeX $...$ nebo $$...$$)
   - "options": pole přesně 4 možností (žádná písmena A, B na začátku, jen čistý text/vzorec)
   - "correctIndex": číslo 0, 1, 2 nebo 3
   - "explanation": přátelské vysvětlení

2. "fill-in" (doplňování chybějícího slova nebo vzorce):
   - "sentenceBefore": text věty před doplňovaným výrazem
   - "blankAnswer": přesný výraz, který student doplňuje (slovo, letopočet, nebo vzorec např. "$b^2 - 4ac$")
   - "sentenceAfter": text věty za doplňovaným výrazem
   - "options": pole 4 možností (jedna z nich je přesně blankAnswer, další 3 jsou věrohodné distraktory)
   - "explanation": vysvětlení

3. "matching" (spojování dvojic pojmů, vzorců nebo letopočtů):
   - "instruction": zadání (např. "Spoj pojmy s jejich definicí:")
   - "pairs": pole 3 až 4 dvojic ve tvaru:
     [
       { "id": "p1", "left": "Pojem 1", "right": "Vysvětlení 1" },
       { "id": "p2", "left": "Pojem 2", "right": "Vysvětlení 2" },
       { "id": "p3", "left": "Pojem 3", "right": "Vysvětlení 3" }
     ]
   - "explanation": vysvětlení

DŮLEŽITÉ:
- Všechny matematické, chemické či fyzikální výrazy a rovnice VŽDY uzavři do KaTeX syntaxe ($...$ nebo $$...$$).
- Otázky musí testovat znalosti napříč všemi ${notes.length} stránkami zápisků.
- Vrať VÝHRADNĚ validní JSON pole bez jakéhokoliv dalšího textu okolo.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
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
            content: `Vytvoř souhrnný cvičný test pro celou kapitolu / téma:\n\nTéma: ${topicName}\nPředmět: ${subject}\nPočet stránek sešitu: ${notes.length}\n\nObsah všech stránek tématu:\n${combinedContent}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Generování testu z tématu selhalo (kód ${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error('AI nevrátila žádný obsah testu.');
    }

    const questions = parseQuizOutput(rawContent);
    if (questions.length === 0) {
      throw new Error('Nepodařilo se zpracovat test pro téma. Zkuste to prosím znovu.');
    }

    recordRateLimitUsage('generate_quiz');
    return questions;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Generování cvičného testu pro téma vypršelo (časový limit 35 s). AI model neodpověděl včas.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

