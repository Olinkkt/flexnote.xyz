import { SubjectType } from '../types/notes';

export interface ExtractedNoteResult {
  title: string;
  topic?: string;
  subject: SubjectType | 'uncertain';
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

  const systemPrompt = `Jsi Flexnote AI OCR engine specializovaný na převod fotografií školních sešitů do přehledného studijního Markdownu.

Pravidla přepisu a formátování:
1. PŘEPIS TEXTU:
   - Přepiš čitelný text a oprav zjevné překlepy z rychlého psaní v hodině.
   - Zcela ignoruj přeškrtnuté chyby a malůvky na okrajích.
2. MATEMATIKA A VZORCE (KaTeX):
   - Klíčové a samostatné rovnice vlož VŽDY do blokových závorek: $$...$$ (např. $$D = b^2 - 4ac$$).
   - Proměnné a krátké výrazy v textu vlož do: $...$ (např. pro $x > 0$).
   - U výpočtů s více kroky udržuj postup pod sebou.
3. STRUKTURA A PŘEHLEDNOST:
   - Používej nadpisy (# Hlavní téma, ## Podtémata).
   - Důležité definice a poučky vlož do citace: > **Důležité:** ... (vytvoří přehledný zvýrazněný rámeček).
   - Pokud jsou v sešitě srovnání, slovíčka nebo časové osy, zformátuj je do Markdown tabulky (| ... |).
4. KLASIFIKACE PŘEDMĚTU A TÉMATU:
   - Identifikuj širší studijní téma/kapitolu (např. "Kvadratické rovnice", "Druhá světová válka", "Fotosyntéza").
   - Předmět:
     - "maths" (matematika, geometrie)
     - "czech" (čeština, literatura, mluvnice)
     - "history" (dějepis, dějiny)
     - "science" (fyzika, chemie, biologie, zeměpis)
     - "uncertain" (pokud je text nejednoznačný nebo je ho příliš málo)

Výstup musí být VÝHRADNĚ validní JSON v tomto formátu (žádný další text okolo):
{
  "title": "Výstižný název stránky zápisku",
  "topic": "Název širšího tématu / kapitoly",
  "subject": "maths" | "czech" | "history" | "science" | "uncertain",
  "summary": "Stručné shrnutí 1-2 větami...",
  "markdown": "Kompletní strukturovaný zápisek v Markdownu s KaTeX vzorci"
}`;

async function callOpenRouterWithRetry(apiKey: string, body: unknown, retries = 1): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
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
        body: JSON.stringify(body),
      });

      // If server returned temporary 502/503/504 error and we have retries left, wait 1.5s and retry
      if (!response.ok && [502, 503, 504].includes(response.status) && attempt < retries) {
        clearTimeout(timeoutId);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }

      return response;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new OpenRouterError(
          'TIMEOUT',
          'Požadavek vypršel (35 s). Model neodpověděl včas. Zkus to prosím za chvíli znovu.'
        );
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new OpenRouterError(
        'NETWORK_ERROR',
        `Nelze se připojit k OpenRouter API: ${message}`
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw new OpenRouterError('NETWORK_ERROR', 'Nepodařilo se navázat spojení po opakovaném pokusu.');
}

  const response = await callOpenRouterWithRetry(
    apiKey,
    {
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
    },
    1
  );

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
      topic: parsed.topic ? String(parsed.topic).trim() : undefined,
      subject,
      summary: parsed.summary || 'Zápisky převedené pomocí AI modelu Dots3-Note-Preview.',
      markdown: parsed.markdown || content,
    };
  } catch {
    // If JSON parsing fails, salvage the content as markdown
    return {
      title: 'Digitalizovaný zápisek',
      subject: 'uncertain',
      summary: 'Automaticky rozpoznaný text ze sešitu.',
      markdown: content,
    };
  }
}
