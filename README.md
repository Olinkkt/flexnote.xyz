# 📓 Flexnote (`flexnote.oliverseidl.dev`)

> Moderní studijní platforma pro studenty, která převádí fotky sešitů do přehledného Markdownu s KaTeX vzorci, kartičkami a interaktivními kvízy.

---

## 🛠️ Part 1: Developer Documentation

Tato sekce je určena vývojářům, přispěvatelům a správcům infrastruktury projektu.

### 🏛️ Architektura a Tech Stack

| Vrstva | Technologie | Popis |
|---|---|---|
| **Frontend Framework** | **React 19 + TypeScript + Vite** | Bleskový build, moderní komponentová architektura a přísná typová kontrola. |
| **Styling & UI Design** | **Tailwind CSS + Lucide Icons** | Vlastní hravý 3D design systém inspirovaný Duolingem (`duo-btn`, `duo-card`). |
| **Matematika & Vzorce** | **KaTeX (`katex`)** | Rychlé klientské renderování inline (`$...$`) i blokových (`$$...$$`) matematických rovnic. |
| **AI Engine (Vision & Text)** | **Google Gemini 3.8 Flash (`@google/genai`)** | Multimodální OCR z fotek, KaTeX formátování, generování výukových flashcards a testů. |
| **Backend & Security** | **Vercel Serverless Functions (`/api/gemini`)** | Bezpečné volání Gemini API bez úniku API klíčů do klientského JavaScriptu. |
| **Databáze & Úložiště** | **Supabase (PostgreSQL + Auth + Storage)** | Ukládání zápisků, uživatelských profilů, školních leaderboardů a fotek sešitů. |
| **Offline-First & PWA** | **Custom Service Worker (`sw.js`)** | Kompletní offline funkčnost, offline fronta změn a instalace na mobilní zařízení. |

---

### 📂 Struktura repozitáře

```text
flexnote/
├── api/                     # Vercel Serverless funkce
│   └── gemini.ts            # Privátní backend proxy pro Google Gemini API
├── public/                  # Statické assety a Service Worker
│   ├── sw.js                # Offline PWA Service Worker
│   ├── manifest.json        # Manifest pro instalaci aplikace
│   └── icons/               # PWA a webové ikony
├── src/
│   ├── components/          # React komponenty (Navbar, ScanModal, NoteDetail, Flashcards...)
│   ├── services/            # Komunikace s API a úložištěm
│   │   ├── gemini.ts        # Klientský klient pro /api/gemini & fallback
│   │   ├── supabase.ts      # Auth, databáze a Storage operace
│   │   ├── flashcards.ts    # Pravidlový i AI generátor kartiček
│   │   ├── quiz.ts          # Generátor testů (multiple-choice, fill-in, matching)
│   │   └── rateLimiter.ts   # Klientská ochrana kvót a limitů
│   ├── types/               # TypeScript interface pro poznámky, uživatele, kvízy
│   ├── utils/               # Pomocné utility (komprese fotek, audio efekty, datum)
│   ├── App.tsx              # Hlavní router a správa aplikačního stavu
│   └── main.tsx             # Vstupní bod aplikace
├── vite.config.ts           # Konfigurace Vite + lokální dev middleware pro /api/gemini
├── tailwind.config.js       # Vlastní barvy (storybookGreen, sparkBlue...) a fonty
└── tsconfig.json            # Nastavení TypeScript kompilátoru
```

---

### 🚀 Lokální spuštění projektu (Quickstart)

#### 1. Klonování repozitáře
```bash
git clone https://github.com/Olinkkt/flexnote.xyz.git
cd flexnote
```

#### 2. Instalace závislostí
```bash
npm install
```

#### 3. Nastavení proměnných prostředí (`.env.local`)
Vytvoř v kořeni projektu soubor `.env.local` a vyplň potřebné klíče (šablonu najdeš v `.env.example`):

```env
# Google Gemini API klíč (získej zdarma na https://aistudio.google.com/apikey)
GEMINI_API_KEY=AIzaSyTvujKlicZGoogleAiStudio...

# Supabase konfigurace projektu
VITE_SUPABASE_URL=https://twoj-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

#### 4. Spuštění vývojového serveru
```bash
npm run dev
```
Aplikace běží na `http://localhost:5173` (lokální Vite server automaticky routuje požadavky na `/api/gemini`).

#### 5. Otestování produkčního buildu
```bash
npm run build
npm run preview
```

---

### 🔐 Bezpečnost a Vercel Deployment

- **Žádné úniky API klíče:** Proměnná pro Gemini API se jmenuje **`GEMINI_API_KEY`** (bez prefixu `VITE_`). Na Vercelu je uložena jako chráněný **Secret** v Environment Variables a nikdy se nedostane do klientského bundle v prohlížeči.
- **Serverless Endpoint:** Klientská aplikace komunikuje výhradně přes relativní URL `/api/gemini`, kde běží node runtime s `maxDuration: 60s`.
- **CORS & Omezení:** V produkci doporučujeme v Google Cloud Console / AI Studiu omezit API klíč pouze na doménu `flexnote.oliverseidl.dev`.

---

<br/>

## 🎓 Part 2: O projektu Flexnote (Pro studenty a veřejnost)

**Flexnote** je moderní webová a mobilní aplikace vyvinutá přímo pro studenty základních a středních škol. Zbavuje studenty chaosu v sešitech a pomáhá jim zvládat učivo rychle, přehledně a hravou formou.

---

### ✨ Hlavní funkce aplikace

#### 📸 1. Chytrá digitalizace sešitů (OCR)
- Stačí vzít telefon, namířit na popsanou stránku v sešitě a vyfotit ji.
- Špičkový multimodální model **Google Gemini 3.8 Flash** přečte rukopis, opraví zjevné překlepy a vytvoří strukturovaný zápisek s nadpisy, odrážkami a zvýrazněnými definicemi.
- Automaticky rozpozná školní předmět (Matematika, Čeština, Dějepis, Přírodní vědy) a zařadí zápisek do správného bloku.

#### 📐 2. Bezchybné matematické vzorce (KaTeX)
- Už žádné nečitelné rovnice – zlomky, mocniny, integrály i geometrické vzorce (např. $$D = b^2 - 4ac$$ nebo $\sin(\alpha) = \frac{a}{c}$) jsou vykresleny v čisté matematické typografii.

#### 📴 3. 100% Offline-First (Funguje i bez signálu)
- Nemáš ve třídě Wi-Fi nebo ti v metru vypadl signál? Žádný problém.
- Všechny tvé zápisky máš neustále uložené v paměti telefonu.
- Můžeš si zápisky prohlížet, číst a vytvářet nové – jakmile se telefon připojí k internetu, vše se automaticky sesynchronizuje do cloudu.

#### 🃏 4. Automatické kartičky (Flashcards)
- Z každého zápisku ti aplikace jedním kliknutím připraví sadu oboustranných výukových kartiček na zkoušení pojmů a vzorců.
- Zahrnuje i chytrý offline generátor, který z matematických vzorců a tučných pojmů vytvoří kartičky i bez internetu.

#### 📝 5. Cvičné testy a zkoušení
- Připrav se na písemku formou interaktivního testu.
- Vyzkouší tě výběrem z možností (A, B, C, D), doplňováním slov i spojováním pojmů se správným vysvětlením.

#### 🏆 6. Žebříčky a spolužáci
- Zvol si svou školu v profilu, získávej body za digitalizaci a učení a sleduj, jak si vede tvá škola a spolužáci v celorepublikovém žebříčku.

---

### 📱 Jak nainstalovat na mobil (PWA)

Flexnote nemusíš stahovat z Google Play ani App Store:
1. Otevři **[flexnote.oliverseidl.dev](https://flexnote.oliverseidl.dev)** v Safari (iOS) nebo Chrome (Android).
2. **iOS:** Klikni na tlačítko *Sdílet* a zvol **Přidat na plochu**.
3. **Android:** Klikni na nabídku prohlížeče (tři tečky) a zvol **Instalovat aplikaci**.
4. Flexnote se otevře na celé obrazovce bez adresního řádku přesně jako nativní mobilní aplikace.

---

### 📄 Licence
Tento projekt je licencován pod licencí [MIT](LICENSE).
