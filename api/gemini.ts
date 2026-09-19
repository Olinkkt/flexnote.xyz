import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 60,
};

async function callOpenAi(apiKey: string, body: Record<string, any>) {
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const endpoint = `${baseUrl}/chat/completions`;

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
    throw new Error(`OpenAI API request failed (${response.status}): ${errorText || response.statusText}`);
  }

  const data = await response.json();
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Support whichever env variable the user has configured
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.VITE_OPENAI_API_KEY ||
    process.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return res.status(500).json({
      error: 'API klíč není nastaven. Zadej prosím klíč v proměnných prostředí Vercelu.',
    });
  }

  const { action, payload } = req.body || {};

  if (!action || !payload) {
    return res.status(400).json({ error: 'Missing action or payload in request body.' });
  }

  try {
    if (action === 'ocr') {
      const { imageBase64 } = payload;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Missing imageBase64 in payload.' });
      }

      const systemInstruction = `Jsi Flexnote AI OCR engine specializovaný na převod fotografií školních sešitů do přehledného studijního Markdownu.

Pravidla přepisu a formátování:
1. PŘEPIS TEXTU: Přepiš čitelný text a oprav zjevné překlepy z rychlého psaní v hodině. Zcela ignoruj přeškrtnuté chyby a malůvky na okrajích.
2. MATEMATIKA A VZORCE (KaTeX):
   - Samostatné a klíčové vzorce vlož VŽDY do blokových závorek: $$...$$ (např. $$D = b^2 - 4ac$$).
   - Proměnné a krátké výrazy v textu vlož do: $...$ (např. pro $x > 0$).
   - U výpočtů udržuj postup pod sebou.
3. STRUKTURA A PŘEHLEDNOST: Používej nadpisy (# Hlavní téma, ## Podtémata), citace (> **Důležité:**), tabulky.
4. KLASIFIKACE PŘEDMĚTU: "maths" | "czech" | "history" | "science" | "uncertain".

VÝSTUP MUSÍ BÝT VÝHRADNĚ VALIDNÍ JSON BEZ TEXTU OKOLO:
{
  "title": "Výstižný název stránky zápisku",
  "topic": "Název širšího tématu / kapitoly",
  "subject": "maths" | "czech" | "history" | "science" | "uncertain",
  "summary": "Stručné shrnutí 1-2 větami",
  "markdown": "Kompletní strukturovaný zápisek v Markdownu s KaTeX vzorci"
}`;

      const result = await callOpenAi(apiKey, {
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Převeď prosím tento zápisek ze sešitu do strukturovaného Markdownu s KaTeX vzorci a identifikuj předmět a širší téma.',
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
        reasoning_effort: 'low',
        max_completion_tokens: 3500,
      });

      return res.status(200).json({ result });
    }

    if (action === 'flashcards') {
      const { text, promptTitle, subject } = payload;

      const systemInstruction = `Jsi výukový asistent aplikace Flexnote specializovaný na tvorbu chytrých oboustranných kartiček (Flashcards) ze studijních zápisků.
1. Vygeneruj 4 až 8 nejlepších a nejefektivnějších kartiček pro zkoušení z daného textu.
2. FRONT: stručná a jasná otázka, výzva nebo název pojmu/vzorce. Pro proměnné nebo vzorce použij $...$ nebo $$...$$.
3. BACK: přesná a srozumitelná odpověď. Vzorce VŽDY v KaTeXu ($...$ nebo $$...$$), klíčové pojmy tučně (**bold**).
4. KATEGORIE: "formula", "concept", "fact", "general"

VÝSTUP MUSÍ BÝT VÝHRADNĚ VALIDNÍ JSON POLE:
[
  {
    "front": "...",
    "back": "...",
    "category": "formula" | "concept" | "fact" | "general",
    "hint": "volitelná nápověda"
  }
]`;

      const result = await callOpenAi(apiKey, {
        model: 'gpt-5.6-luna',
        messages: [
          { role: 'system', content: systemInstruction },
          {
            role: 'user',
            content: `Vytvoř výukové flashcards ze zápisků:\nTéma: ${promptTitle}\nPředmět: ${subject}\n\n${text}`,
          },
        ],
        temperature: 0.3,
        max_completion_tokens: 2500,
      });

      return res.status(200).json({ result });
    }

    if (action === 'quiz') {
      const { text, promptTitle, subject, isTopic } = payload;

      const systemInstruction = `Jsi expertní pedagogický asistent aplikace Flexnote pro studenty středních a základních škol.
Tvým úkolem je vytvořit cvičný test ze studijních zápisků.
Vytvoř ${isTopic ? '6 až 8' : '4 až 6'} vysoce kvalitních otázek pokrývajících látku.
Zahrň typy:
1. "multiple-choice" (question, options: 4 možnosti, correctIndex: 0-3, explanation: vysvětlení)
2. "fill-in" (sentenceBefore, blankAnswer, sentenceAfter, options: 4 možnosti, explanation: vysvětlení)
3. "matching" (instruction, pairs: pole objektů { id, left, right }, explanation: vysvětlení)
DŮLEŽITÉ:
- Všechny vzorce a rovnice VŽDY v KaTeXu ($...$ nebo $$...$$).
- Bezchybná spisovná čeština.
- Vrať VÝHRADNĚ validní JSON pole.`;

      const result = await callOpenAi(apiKey, {
        model: 'gpt-5.6-luna',
        messages: [
          { role: 'system', content: systemInstruction },
          {
            role: 'user',
            content: `Vytvoř cvičný test:\nTitul: ${promptTitle}\nPředmět: ${subject}\n\n${text}`,
          },
        ],
        temperature: 0.3,
        max_completion_tokens: 2500,
      });

      return res.status(200).json({ result });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error: any) {
    console.error('Error in /api/gemini handler:', error);
    return res.status(500).json({
      error: error?.message || 'Chyba při komunikaci s AI API.',
    });
  }
}

