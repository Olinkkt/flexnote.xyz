import { SubjectType } from '../types/notes';

export interface ExtractedNoteResult {
  title: string;
  subject: SubjectType | 'uncertain';
  confidence: number;
  summary: string;
  markdown: string;
}

export class OpenRouterError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'OpenRouterError';
    this.code = code;
  }
}

/**
 * Helper to compress or validate base64 image data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Chyba při čtení souboru'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Call dots-studio/dots-3-note-preview:free model on OpenRouter
 */
export async function extractNoteFromImage(
  imageBase64: string
): Promise<ExtractedNoteResult> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_openrouter_api_key_here')) {
    throw new OpenRouterError(
      'API_KEY_MISSING',
      'API klíč OpenRouter není nastaven. Nastav prosím VITE_OPENROUTER_API_KEY v souboru .env.local.'
    );
  }

  const systemPrompt = `Jsi Flexnote AI OCR engine specializovaný na digitalizaci školních zápisků a sešitů do čistého Markdownu.
Tvým úkolem je:
1. Přečíst ručně psaný nebo tištěný text ze sešitu / fotografie.
2. Všechny matematické, fyzikální a chemické vzorce převést do LaTeX / KaTeX notace (inline: $...$, blokové: $$...$$).
3. Určit školní předmět: "maths" (matematika), "czech" (český jazyk / literatura), "history" (dějepis), "science" (přírodní vědy / fyzika / chemie), nebo "uncertain" pokud si nejsi jistý (např. málo textu, nejednoznačné).
4. Vytvořit výstižný název (title) a krátké 1-2 věté shrnutí (summary) v češtině.
5. Zformátovat celý obsah do přehledného Markdownu s nadpisy (#, ##, ###), odrážkami a zvýrazněním.

Odpověz VÝHRADNĚ ve formátu JSON s následující strukturou (bez dalšího balastního textu okolo):
{
  "title": "Název zápisku",
  "subject": "maths" | "czech" | "history" | "science" | "uncertain",
  "confidence": 95,
  "summary": "Stručné shrnutí obsahu...",
  "markdown": "# Název\\n\\nStrukturovaný text zápisků s KaTeX $vzorečky$..."
}`;

  let response: Response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
        'HTTP-Referer': 'https://flexnote.xyz',
        'X-Title': 'Flexnote',
      },
      body: JSON.stringify({
        model: 'dots-studio/dots-3-note-preview:free',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Převeď prosím tento zápisek ze sešitu do strukturovaného Markdownu s KaTeX vzorci a identifikuj předmět.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64,
                },
              },
            ],
          },
        ],
        temperature: 0.2,
      }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new OpenRouterError(
      'NETWORK_ERROR',
      `Nelze se připojit k OpenRouter API: ${message}`
    );
  }

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson?.error?.message || response.statusText;
    } catch {
      errorDetail = response.statusText;
    }

    if (response.status === 401) {
      throw new OpenRouterError(
        'AUTH_ERROR',
        'Neplatný OpenRouter API klíč (401). Zkontroluj prosím VITE_OPENROUTER_API_KEY.'
      );
    }
    if (response.status === 429) {
      throw new OpenRouterError(
        'RATE_LIMITED',
        'Dosažen limit bezplatného modelu Dots3-Note-Preview (429 Rate Limit). Počkej chvíli a zkus to znovu.'
      );
    }
    throw new OpenRouterError(
      'API_ERROR',
      `OpenRouter chyba (${response.status}): ${errorDetail}`
    );
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;

  if (!rawContent || typeof rawContent !== 'string') {
    throw new OpenRouterError(
      'EMPTY_RESPONSE',
      'Model nevrátil žádný obsah. Zkus vyfotit sešit z větší blízkosti.'
    );
  }

  return parseModelOutput(rawContent);
}

/**
 * Robustly parses JSON from LLM output (even if wrapped in markdown codeblocks)
 */
function parseModelOutput(content: string): ExtractedNoteResult {
  let cleaned = content.trim();

  // Strip markdown ```json ... ``` code fence if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    const validSubjects: SubjectType[] = ['czech', 'maths', 'history', 'science'];
    const subject = validSubjects.includes(parsed.subject) ? parsed.subject : 'uncertain';

    return {
      title: parsed.title || 'Digitalizovaný zápisek',
      subject,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 85,
      summary: parsed.summary || 'Zápisky převedené pomocí AI modelu Dots3-Note-Preview.',
      markdown: parsed.markdown || content,
    };
  } catch {
    // If JSON parsing fails, salvage the content as markdown
    return {
      title: 'Digitalizovaný zápisek',
      subject: 'uncertain',
      confidence: 60,
      summary: 'Automaticky rozpoznaný text ze sešitu.',
      markdown: content,
    };
  }
}
