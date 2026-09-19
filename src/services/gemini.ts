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
    // If client has a local VITE_GEMINI_API_KEY, fallback to client-side call
    const clientKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY;
    if (clientKey && !clientKey.includes('your_gemini_api_key_here')) {
      console.warn('Backend /api/gemini failed, using direct client-side fallback with local VITE_GEMINI_API_KEY:', err.message);
      return callGeminiClientDirect(action, payload, clientKey);
    }
    throw new GeminiServiceError('API_ERROR', err?.message || 'Chyba při volání Gemini API.');
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
  const ai = new GoogleGenAI({ apiKey });

  if (action === 'ocr') {
    const { imageBase64 } = payload;
    let mimeType = 'image/jpeg';
    let base64Data = imageBase64;
    if (imageBase64.includes(';base64,')) {
      const parts = imageBase64.split(';base64,');
      mimeType = parts[0].replace('data:', '') || 'image/jpeg';
      base64Data = parts[1];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: 'Převeď prosím tento zápisek ze sešitu do strukturovaného Markdownu s KaTeX vzorci a identifikuj předmět a širší téma.' },
          ],
        },
      ],
      config: {
        systemInstruction: `Jsi Flexnote AI OCR engine. Převeď sešit do Markdownu s KaTeX vzorci ($$, $). Předmět: maths, czech, history, science, uncertain.`,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            topic: { type: Type.STRING },
            subject: { type: Type.STRING, enum: ['maths', 'czech', 'history', 'science', 'uncertain'] },
            summary: { type: Type.STRING },
            markdown: { type: Type.STRING },
          },
          required: ['title', 'subject', 'summary', 'markdown'],
        },
      },
    });
    return JSON.parse(response.text || '{}');
  }

  if (action === 'flashcards') {
    const { text, promptTitle, subject } = payload;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `Vytvoř výukové flashcards:\nTéma: ${promptTitle}\nPředmět: ${subject}\n\n${text}` }] }],
      config: {
        systemInstruction: `Jsi výukový asistent aplikace Flexnote. Vytvoř 4 až 8 kartiček. Vzorce v KaTeXu.`,
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING },
              category: { type: Type.STRING, enum: ['formula', 'concept', 'fact', 'general'] },
              hint: { type: Type.STRING },
            },
            required: ['front', 'back', 'category'],
          },
        },
      },
    });
    return JSON.parse(response.text || '[]');
  }

  if (action === 'quiz') {
    const { text, promptTitle, subject, isTopic } = payload;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `Vytvoř cvičný test:\nTitul: ${promptTitle}\nPředmět: ${subject}\n\n${text}` }] }],
      config: {
        systemInstruction: `Jsi expertní pedagogický asistent Flexnote. Vytvoř ${isTopic ? '6 až 8' : '4 až 6'} otázek. Typy: multiple-choice, fill-in, matching. Vzorce v KaTeXu. Validní JSON pole.`,
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });
    return JSON.parse(response.text || '[]');
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
      summary: parsed.summary || 'Zápisky převedené pomocí Google Gemini AI.',
      markdown: parsed.markdown || '',
    };
  } catch (err: unknown) {
    if (err instanceof GeminiServiceError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new GeminiServiceError('API_ERROR', message);
  }
}
