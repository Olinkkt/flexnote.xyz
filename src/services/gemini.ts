import { SubjectType } from '../types/notes';

export interface ExtractedNoteResult {
  title: string;
  topic?: string;
  subject: SubjectType | 'uncertain';
  summary: string;
  markdown: string;
}

export class GeminiServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'GeminiServiceError';
    this.code = code;
  }
}

async function callClientOpenAi(apiKey: string, body: Record<string, any>) {
  const endpoint = 'https://api.openai.com/v1/chat/completions';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey.trim()}`,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenAI request failed (${response.status}): ${errorText || response.statusText}`);
  }

  const data = (await response.json()) as any;
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('Model nevrátil žádný obsah.');
  }

  let cleaned = rawContent.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  return JSON.parse(cleaned);
}

/**
 * Generic caller for /api/gemini serverless endpoint
 */
export async function callGeminiApi(action: 'ocr' | 'flashcards' | 'quiz', payload: Record<string, any>): Promise<any> {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, payload }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.result;
    }

    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error || `Chyba serveru (${response.status})`);
  } catch (err: any) {
    // If client has a local VITE API key, fallback to client-side call
    const clientKey =
      import.meta.env.VITE_OPENAI_API_KEY ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.VITE_OPENROUTER_API_KEY ||
      import.meta.env.VITE_GOOGLE_API_KEY;
    if (clientKey && !clientKey.includes('your_gemini_api_key_here') && !clientKey.includes('your_openrouter_api_key_here')) {
      console.warn('Backend /api/gemini failed, using direct client-side fallback:', err.message);
      return callGeminiClientDirect(action, payload, clientKey);
    }
    throw new GeminiServiceError('API_ERROR', err?.message || 'Chyba při volání AI API.');
  }
}

/**
 * Client-side direct call fallback if running purely statically without serverless function
 */
async function callGeminiClientDirect(
  action: 'ocr' | 'flashcards' | 'quiz',
  payload: Record<string, any>,
  apiKey: string
): Promise<any> {
  if (action === 'ocr') {
    const { imageBase64 } = payload;
    const systemInstruction = `Jsi Flexnote AI OCR engine specializovaný na převod fotografií školních sešitů do přehledného studijního Markdownu.
Pravidla přepisu a formátování:
1. PŘEPIS TEXTU: Přepiš čitelný text a oprav zjevné překlepy z rychlého psaní v hodině. Zcela ignoruj přeškrtnuté chyby a malůvky na okrajích.
2. MATEMATIKA A VZORCE (KaTeX): Samostatné vzorce do $$...$$, proměnné v textu do $...$.
3. STRUKTURA A PŘEHLEDNOST: Používej nadpisy (#, ##), citace (> **Důležité:**), tabulky.
4. KLASIFIKACE PŘEDMĚTU: "maths" | "czech" | "history" | "science" | "uncertain".
VÝSTUP MUSÍ BÝT VÝHRADNĚ VALIDNÍ JSON:
{
  "title": "Výstižný název stránky zápisku",
  "topic": "Název širšího tématu / kapitoly",
  "subject": "maths" | "czech" | "history" | "science" | "uncertain",
  "summary": "Stručné shrnutí 1-2 větami",
  "markdown": "Kompletní strukturovaný zápisek v Markdownu s KaTeX vzorci"
}`;

    return callClientOpenAi(apiKey, {
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: systemInstruction },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Převeď prosím tento zápisek ze sešitu do strukturovaného Markdownu s KaTeX vzorci a identifikuj předmět a širší téma.' },
            { type: 'image_url', image_url: { url: imageBase64 } },
          ],
        },
      ],
      reasoning_effort: 'low',
      max_completion_tokens: 3500,
    });
  }

  if (action === 'flashcards') {
    const { text, promptTitle, subject } = payload;
    const systemInstruction = `Jsi výukový asistent aplikace Flexnote pro kartičky (Flashcards). Vytvoř 4 až 8 kartiček. Vzorce v KaTeXu ($...$, $$...$$). Validní JSON pole: [{ "front": "...", "back": "...", "category": "formula"|"concept"|"fact"|"general", "hint": "..." }]`;

    return callClientOpenAi(apiKey, {
      model: 'gpt-5.6-luna',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Vytvoř výukové flashcards ze zápisků:\nTéma: ${promptTitle}\nPředmět: ${subject}\n\n${text}` },
      ],
      temperature: 0.3,
      max_completion_tokens: 2500,
    });
  }

  if (action === 'quiz') {
    const { text, promptTitle, subject, isTopic } = payload;
    const systemInstruction = `Jsi pedagogický asistent Flexnote. Vytvoř ${isTopic ? '6 až 8' : '4 až 6'} otázek pokrývajících látku. Typy: multiple-choice, fill-in, matching. Vzorce v KaTeXu. Validní JSON pole.`;

    return callClientOpenAi(apiKey, {
      model: 'gpt-5.6-luna',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Vytvoř cvičný test:\nTitul: ${promptTitle}\nPředmět: ${subject}\n\n${text}` },
      ],
      temperature: 0.3,
      max_completion_tokens: 2500,
    });
  }

  throw new Error(`Neznámá akce: ${action}`);
}

/**
 * Helper to convert file to base64 data URL
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
 * OCR note extraction via secure /api/gemini backend
 */
export async function extractNoteFromImage(
  imageBase64: string
): Promise<ExtractedNoteResult> {
  try {
    const parsed = await callGeminiApi('ocr', { imageBase64 });

    const validSubjects: SubjectType[] = ['czech', 'maths', 'history', 'science'];
    const subject = validSubjects.includes(parsed.subject) ? (parsed.subject as SubjectType) : 'uncertain';

    return {
      title: parsed.title || 'Digitalizovaný zápisek',
      topic: parsed.topic ? String(parsed.topic).trim() : undefined,
      subject,
      summary: parsed.summary || 'Zápisky převedené pomocí Flexnote AI.',
      markdown: parsed.markdown || '',
    };
  } catch (err: unknown) {
    if (err instanceof GeminiServiceError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new GeminiServiceError('API_ERROR', message);
  }
}
