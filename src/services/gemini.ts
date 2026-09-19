import { GoogleGenAI, Type } from '@google/genai';
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

/**
 * Get Gemini API Key from Vite env variables
 */
export function getGeminiApiKey(): string {
  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_GOOGLE_API_KEY ||
    '';

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key_here')) {
    throw new GeminiServiceError(
      'API_KEY_MISSING',
      'API klíč pro Google Gemini není nastaven. Nastav prosím VITE_GEMINI_API_KEY v souboru .env.local (klíč vytvoříš na aistudio.google.com/apikey).'
    );
  }

  return apiKey.trim();
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
 * OCR note extraction directly using Google Gemini 2.5 Flash with structured JSON output
 */
export async function extractNoteFromImage(
  imageBase64: string
): Promise<ExtractedNoteResult> {
  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });

  // Separate mimeType and raw base64 data
  let mimeType = 'image/jpeg';
  let base64Data = imageBase64;
  if (imageBase64.includes(';base64,')) {
    const parts = imageBase64.split(';base64,');
    mimeType = parts[0].replace('data:', '') || 'image/jpeg';
    base64Data = parts[1];
  }

  const systemInstruction = `Jsi Flexnote AI OCR engine specializovaný na převod fotografií školních sešitů do přehledného studijního Markdownu.

Pravidla přepisu a formátování:
1. PŘEPIS TEXTU:
   - Přepiš čitelný text a oprav zjevné překlepy z rychlého psaní v hodině.
   - Zcela ignoruj přeškrtnuté chyby a malůvky na okrajích.
2. MATEMATIKA A VZORCE (KaTeX):
   - Samostatné a klíčové vzorce vlož VŽDY do blokových závorek: $$...$$ (např. $$D = b^2 - 4ac$$).
   - Proměnné a krátké výrazy v textu vlož do: $...$ (např. pro $x > 0$).
   - U výpočtů udržuj postup pod sebou.
3. STRUKTURA A PŘEHLEDNOST:
   - Používej nadpisy (# Hlavní téma, ## Podtémata).
   - Důležité definice a poučky vlož do citace: > **Důležité:** ...
   - Pokud jsou v sešitě srovnání, slovíčka nebo časové osy, zformátuj je do Markdown tabulky (| ... |).
4. KLASIFIKACE PŘEDMĚTU:
   - "maths" (matematika, geometrie)
   - "czech" (čeština, literatura, mluvnice)
   - "history" (dějepis, dějiny)
   - "science" (fyzika, chemie, biologie, zeměpis)
   - "uncertain" (pokud je text nejednoznačný nebo je ho málo)`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: 'Převeď prosím tento zápisek ze sešitu do strukturovaného Markdownu s KaTeX vzorci a identifikuj předmět a širší téma.',
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Výstižný název stránky zápisku ze sešitu',
            },
            topic: {
              type: Type.STRING,
              description: 'Název širšího tématu / kapitoly (např. Kvadratické rovnice)',
            },
            subject: {
              type: Type.STRING,
              enum: ['maths', 'czech', 'history', 'science', 'uncertain'],
              description: 'Předmět',
            },
            summary: {
              type: Type.STRING,
              description: 'Stručné shrnutí zápisku 1-2 větami',
            },
            markdown: {
              type: Type.STRING,
              description: 'Kompletní strukturovaný zápisek v Markdownu s KaTeX vzorci',
            },
          },
          required: ['title', 'subject', 'summary', 'markdown'],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new GeminiServiceError(
        'EMPTY_RESPONSE',
        'Model nevrátil žádný obsah. Zkus vyfotit sešit z větší blízkosti a za lepšího světla.'
      );
    }

    const parsed = JSON.parse(responseText);
    const validSubjects: SubjectType[] = ['czech', 'maths', 'history', 'science'];
    const subject = validSubjects.includes(parsed.subject) ? (parsed.subject as SubjectType) : 'uncertain';

    return {
      title: parsed.title || 'Digitalizovaný zápisek',
      topic: parsed.topic ? String(parsed.topic).trim() : undefined,
      subject,
      summary: parsed.summary || 'Zápisky převedené pomocí Google Gemini AI.',
      markdown: parsed.markdown || '',
    };
  } catch (err: unknown) {
    if (err instanceof GeminiServiceError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('API_KEY_INVALID') || message.includes('403') || message.includes('401')) {
      throw new GeminiServiceError(
        'AUTH_ERROR',
        'Neplatný nebo neautorizovaný Google Gemini API klíč. Ověř klíč v .env.local.'
      );
    }
    if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
      throw new GeminiServiceError(
        'RATE_LIMITED',
        'Dosažen limit bezplatných požadavků Google Gemini (15 RPM). Počkej chvíli a zkus to znovu.'
      );
    }
    throw new GeminiServiceError('API_ERROR', `Chyba Google Gemini: ${message}`);
  }
}
