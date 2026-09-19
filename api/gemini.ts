import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get secret server-side API key (never exposed to browser)
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY in your Vercel Environment Variables.',
    });
  }

  const { action, payload } = req.body || {};

  if (!action || !payload) {
    return res.status(400).json({ error: 'Missing action or payload in request body.' });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    if (action === 'ocr') {
      const { imageBase64 } = payload;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Missing imageBase64 in payload.' });
      }

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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
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

      const parsed = JSON.parse(response.text || '{}');
      return res.status(200).json({ result: parsed });
    }

    if (action === 'flashcards') {
      const { text, promptTitle, subject } = payload;

      const systemInstruction = `Jsi výukový asistent aplikace Flexnote specializovaný na tvorbu chytrých oboustranných kartiček (Flashcards) ze školních zápisků studentů.

PRAVIDLA PRO TVORBU KARTIČEK:
1. Vygeneruj 4 až 8 nejlepších a nejefektivnějších kartiček pro zkoušení z daného textu.
2. FRONT: stručná a jasná otázka, výzva nebo název pojmu/vzorce. Pro proměnné nebo vzorce použij $...$ nebo $$...$$.
3. BACK: přesná a srozumitelná odpověď. Vzorce VŽDY v KaTeXu ($...$ nebo $$...$$), klíčové pojmy tučně (**bold**).
4. KATEGORIE: "formula", "concept", "fact", "general"`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Vytvoř výukové flashcards ze zápisků:\nTéma: ${promptTitle}\nPředmět: ${subject}\n\n${text}`,
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
                front: { type: Type.STRING },
                back: { type: Type.STRING },
                category: {
                  type: Type.STRING,
                  enum: ['formula', 'concept', 'fact', 'general'],
                },
                hint: { type: Type.STRING },
              },
              required: ['front', 'back', 'category'],
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '[]');
      return res.status(200).json({ result: parsed });
    }

    if (action === 'quiz') {
      const { text, promptTitle, subject, isTopic } = payload;

      const systemInstruction = `Jsi expertní pedagogický asistent aplikace Flexnote pro studenty středních a základních škol.
Tvým úkolem je vytvořit cvičný test ze studijních zápisků.
Vytvoř ${isTopic ? '6 až 8' : '4 až 6'} vysoce kvalitních otázek pokrývajících látku.
Zahrň typy:
1. "multiple-choice" (options: 4 možnosti, correctIndex: 0-3, explanation: vysvětlení)
2. "fill-in" (sentenceBefore, blankAnswer, sentenceAfter, options: 4 možnosti, explanation: vysvětlení)
3. "matching" (instruction, pairs: pole objektů { id, left, right }, explanation: vysvětlení)
DŮLEŽITÉ:
- Všechny vzorce a rovnice VŽDY v KaTeXu ($...$ nebo $$...$$).
- Bezchybná spisovná čeština.
- Vrať VÝHRADNĚ validní JSON pole.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Vytvoř cvičný test:\nTitul: ${promptTitle}\nPředmět: ${subject}\n\n${text}`,
              },
            ],
          },
        ],
        config: {
          systemInstruction,
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '[]');
      return res.status(200).json({ result: parsed });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error: any) {
    console.error('Error in /api/gemini handler:', error);
    return res.status(500).json({
      error: error?.message || 'Chyba při komunikaci s Google Gemini API.',
    });
  }
}
