import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { GoogleGenAI, Type } from '@google/genai';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

  return {
    plugins: [
      react(),
      {
        name: 'local-api-gemini-middleware',
        configureServer(server) {
          server.middlewares.use('/api/gemini', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: 'GEMINI_API_KEY is not set. Add GEMINI_API_KEY to your .env.local',
                })
              );
              return;
            }

            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });

            req.on('end', async () => {
              try {
                const { action, payload } = JSON.parse(body || '{}');
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

                  const systemInstruction = `Jsi Flexnote AI OCR engine specializovaný na převod fotografií školních sešitů do přehledného studijního Markdownu.
Pravidla přepisu a formátování:
1. PŘEPIS TEXTU: Přepiš čitelný text a oprav zjevné překlepy.
2. MATEMATIKA A VZORCE (KaTeX): Samostatné vzorce do $$...$$, proměnné v textu do $...$.
3. STRUKTURA: Používej nadpisy (#, ##), citace (> **Důležité:**), tabulky.
4. PŘEDMĚT: maths, czech, history, science, uncertain.`;

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
                          title: { type: Type.STRING },
                          topic: { type: Type.STRING },
                          subject: {
                            type: Type.STRING,
                            enum: ['maths', 'czech', 'history', 'science', 'uncertain'],
                          },
                          summary: { type: Type.STRING },
                          markdown: { type: Type.STRING },
                        },
                        required: ['title', 'subject', 'summary', 'markdown'],
                      },
                    },
                  });

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ result: JSON.parse(response.text || '{}') }));
                  return;
                }

                if (action === 'flashcards') {
                  const { text, promptTitle, subject } = payload;
                  const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
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
                      systemInstruction: `Jsi výukový asistent aplikace Flexnote pro flashcards. Vytvoř 4 až 8 kartiček. Vzorce v KaTeXu ($...$ nebo $$...$$).`,
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

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ result: JSON.parse(response.text || '[]') }));
                  return;
                }

                if (action === 'quiz') {
                  const { text, promptTitle, subject, isTopic } = payload;
                  const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
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
                      systemInstruction: `Jsi expertní pedagogický asistent Flexnote. Vytvoř ${isTopic ? '6 až 8' : '4 až 6'} otázek pokrývajících látku. Typy: multiple-choice, fill-in, matching. Vzorce v KaTeXu. Spisovná čeština. Validní JSON pole.`,
                      temperature: 0.3,
                      responseMimeType: 'application/json',
                    },
                  });

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ result: JSON.parse(response.text || '[]') }));
                  return;
                }

                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: `Unknown action: ${action}` }));
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err?.message || 'Server error' }));
              }
            });
          });
        },
      },
    ],
  };
});

