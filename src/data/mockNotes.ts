import { NoteItem, SubjectMeta, LearningUnit, UserStats, SubjectType } from '../types/notes';

export const SUBJECTS: SubjectMeta[] = [
  {
    id: 'all',
    name: 'Všechny předměty',
    czechName: 'Vše',
    flag: '',
    icon: 'Sparkles',
    color: '#58cc02',
    borderColor: '#46a302',
    bgTint: '#d7ffb8',
    accent: '#58cc02',
    description: 'Všechny tvé zdigitalizované zápisky pohromadě'
  },
  {
    id: 'czech',
    name: 'Český jazyk & Literatura',
    czechName: 'Čeština',
    flag: '',
    icon: 'BookOpen',
    color: '#ff4b4b',
    borderColor: '#ea2b2b',
    bgTint: '#ffdada',
    accent: '#ff4b4b',
    description: 'Větné členy, pravopis, stylistika a literární historie'
  },
  {
    id: 'maths',
    name: 'Matematika',
    czechName: 'Matematika',
    flag: '',
    icon: 'Calculator',
    color: '#1cb0f6',
    borderColor: '#1899d6',
    bgTint: '#ddf4ff',
    accent: '#1cb0f6',
    description: 'Kvadratické rovnice, funkce, planimetrie a derivace'
  },
  {
    id: 'history',
    name: 'Dějepis',
    czechName: 'Dějepis',
    flag: '',
    icon: 'Landmark',
    color: '#ff9600',
    borderColor: '#e58500',
    bgTint: '#ffeed6',
    accent: '#ff9600',
    description: 'České i světové dějiny, významné bitvy a panovníci'
  },
];

export const INITIAL_STATS: UserStats = {
  streakDays: 7,
  gems: 350,
  xp: 1420,
  notesScannedToday: 2,
  dailyGoal: 3,
  hearts: 5,
};

export const INITIAL_NOTES: NoteItem[] = [
  {
    id: 'note-math-1',
    title: 'Kvadratické rovnice a diskriminant',
    subject: 'maths',
    date: 'Dnes, 11:15',
    timestamp: Date.now() - 1000 * 60 * 95,
    thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop&q=80',
    readingTime: '3 min',
    accuracy: 99,
    status: 'learning',
    summary: 'Kompletní postup řešení kvadratických rovnic pomocí diskriminantu D = b² - 4ac a Vietových vzorců.',
    keyFormulas: ['D = b^2 - 4ac', 'x_{1,2} = (-b \\pm \\sqrt{D}) / 2a'],
    tags: ['Algebra', 'Rovnice', 'Diskriminant', 'Střední škola'],
    markdown: `# Kvadratické rovnice a diskriminant

Zápisky z hodiny matematiky (pan profesor Novák)

---

## 1. Základní tvar rovnice
Každá kvadratická rovnice má obecný tvar:

$$a \\cdot x^2 + b \\cdot x + c = 0 \\quad (\\text{kde } a \\neq 0)$$

- **a** = kvadratický koeficient
- **b** = lineární koeficient
- **c** = absolutní člen

---

## 2. Diskriminant ($D$)
Pro určení počtu a hodnoty reálných kořenů počítáme diskriminant:

$$D = b^2 - 4ac$$

### Podmínky pro řešení:

1. **Pro $D > 0$** — Rovnice má **2 různé reálné kořeny**:

$$x_{1,2} = \\frac{-b \\pm \\sqrt{D}}{2a}$$

2. **Pro $D = 0$** — Rovnice má **1 dvojnásobný reálný kořen**:

$$x = -\\frac{b}{2a}$$

3. **Pro $D < 0$** — Rovnice **nemá řešení** v oboru reálných čísel $\\mathbb{R}$ (má řešení v $\\mathbb{C}$).

---

## 3. Příklad z tabule
> **Zadání:** Řešte v $\\mathbb{R}$: $2x^2 + 5x - 3 = 0$
> - $a = 2, b = 5, c = -3$
> - $D = 5^2 - 4 \\cdot 2 \\cdot (-3) = 25 + 24 = 49$
> - $\\sqrt{D} = \\sqrt{49} = 7$
> - $x_1 = \\frac{-5 + 7}{4} = \\frac{2}{4} = \\mathbf{0.5}$
> - $x_2 = \\frac{-5 - 7}{4} = \\frac{-12}{4} = \\mathbf{-3}$

Výsledek: $K = \\{-3; 0.5\\}$`
  },
  {
    id: 'note-czech-1',
    title: 'Větné členy: Příslovečné určení (PU)',
    subject: 'czech',
    date: 'Včera, 16:40',
    timestamp: Date.now() - 1000 * 60 * 60 * 26,
    thumbnailUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=500&auto=format&fit=crop&q=80',
    readingTime: '2 min',
    accuracy: 97,
    status: 'mastered',
    summary: 'Přehled druhů příslovečného určení (času, místa, způsobu, příčiny a podmínky) s otázkami.',
    tags: ['Skladba', 'Větné členy', 'Gramatika'],
    markdown: `# Větné členy: Příslovečné určení (PU)

Zápisky ze skladby (Syntax) českého jazyka.

---

## Co je příslovečné určení?
- Rozvíjející větný člen.
- Závisí nejčastěji na **slovese**, méně na přídavném jménu nebo příslovci.
- Ptáme se otázkami: *Kde? Kdy? Jak? Proč? Za jaké podmínky?*

---

## Základní druhy PU:

| Zkratka | Název | Otázka | Příklad |
| :--- | :--- | :--- | :--- |
| **PUČ** | Času | *Kdy? Odkdy? Dokdy?* | Přijel **včera večer**. |
| **PUM** | Místa | *Kde? Kam? Odkud?* | Seděl **v parku na lavičce**. |
| **PUZ** | Způsobu | *Jak? Jakým způsobem?* | Zpíval **velmi hlasitě**. |
| **PUP** | Příčiny | *Proč? Z jakého důvodu?* | Zbledl **leknutím**. |
| **PUÚ** | Účelu | *Za jakým účelem?* | Šel **na nákup**. |
| **PUPod** | Podmínky | *Za jaké podmínky?* | **Při dešti** nikam nechoď. |

---

> **Tip pro test:** Pozor na záměnu PU příčiny a účelu:
> - Příčina nastala *před* dějem (nešel do školy **pro nemoc**).
> - Účel nastane *až po* ději (přišel se **omluvit**).`
  },
  {
    id: 'note-history-1',
    title: 'Karel IV. a zlatá éra českých zemí',
    subject: 'history',
    date: 'Předevčírem',
    timestamp: Date.now() - 1000 * 60 * 60 * 52,
    thumbnailUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=500&auto=format&fit=crop&q=80',
    readingTime: '4 min',
    accuracy: 98,
    status: 'mastered',
    summary: 'Vláda Karla IV. (1346–1378), založení Karlovy univerzity (1348), Karlštejn a Zlatá bula 1356.',
    tags: ['Středověk', 'Lucemburkové', 'Praha', 'Karel IV.'],
    markdown: `# Karel IV. — Otec vlasti (1316–1378)

Poznámky z hodiny dějepisu: Vláda Lucemburků.

---

## Základní fakta
- **Narozen:** 1316 v Praze (původní jméno *Václav*, biřmován na Karla ve Francii).
- **Rodiče:** Jan Lucemburský + Eliška Přemyslovna.
- **Tituly:** Český král (od 1346) a císař Svaté říše římské (od 1355).

---

## Klíčové milníky vlády:
- **1344**: Povýšení pražského biskupství na **arcibiskupství** (první arcibiskup: Arnošt z Pardubic) a zahájení stavby katedrály sv. Víta (Matyáš z Arrasu, Petr Parléř).
- **1348**:
  - Založení **Karlovy univerzity** (první ve střední Evropě).
  - Založení **Nového Města pražského**.
  - Zahájení stavby hradu **Karlštejn** (k uložení říšských korunovačních klenotů).
- **1356**: Vydání **Zlaté buly** — základního ústavního zákona Svaté říše římské, potvrzující výsadní postavení českého krále.
- **1357**: Položení základního kamene **Karlových mostů** (nahradil zničený Juditin most).

---

## Shrnutí pro zkoušení
Karel IV. udělal z Prahy politické a kulturní centrum Evropy. Byl 4x ženatý (Blanka z Valois, Anna Falcká, Anna Svídnická, Alžběta Pomořanská).`
  }
];

export const LEARNING_UNITS: Record<SubjectType, LearningUnit[]> = {
  all: [
    {
      id: 'unit-all-1',
      subject: 'all',
      unitNumber: 1,
      title: 'Týdenní sprint: Klíčová témata',
      description: 'Projdi své nejnovější zápisky a získej 50 drahokamů!',
      color: '#58cc02',
      badge: 'Sparkles',
      nodes: [
        { id: 'node-1', title: 'Kvadratické rovnice', type: 'lesson', status: 'completed', stars: 3, maxStars: 3, noteId: 'note-math-1' },
        { id: 'node-2', title: 'Větné členy PU', type: 'lesson', status: 'completed', stars: 3, maxStars: 3, noteId: 'note-czech-1' },
        { id: 'node-3', title: 'Rychlý bleskový kvíz', type: 'quiz', status: 'current', stars: 1, maxStars: 3 },
        { id: 'node-4', title: 'Truhla s XP', type: 'chest', status: 'locked', stars: 0, maxStars: 1 },
        { id: 'node-5', title: 'Karel IV. a Lucemburkové', type: 'trophy', status: 'locked', stars: 0, maxStars: 3, noteId: 'note-history-1' },
      ]
    }
  ],
  maths: [
    {
      id: 'unit-math-1',
      subject: 'maths',
      unitNumber: 1,
      title: 'Kvadratické rovnice a funkce',
      description: 'Ovládni diskriminant a grafy parabol',
      color: '#1cb0f6',
      badge: 'Calculator',
      nodes: [
        { id: 'node-m-1', title: 'Diskriminant D = b² - 4ac', type: 'lesson', status: 'completed', stars: 3, maxStars: 3, noteId: 'note-math-1' },
        { id: 'node-m-2', title: 'Vietovy vzorce', type: 'lesson', status: 'current', stars: 2, maxStars: 3 },
        { id: 'node-m-3', title: 'Parabola a vrchol', type: 'quiz', status: 'locked', stars: 0, maxStars: 3 },
        { id: 'node-m-4', title: 'Bonusová truhla', type: 'chest', status: 'locked', stars: 0, maxStars: 1 },
      ]
    }
  ],
  czech: [
    {
      id: 'unit-cz-1',
      subject: 'czech',
      unitNumber: 1,
      title: 'Skladba & Větné rozbory',
      description: 'Příslovečná určení a druhy vedlejších vět',
      color: '#ff4b4b',
      badge: 'BookOpen',
      nodes: [
        { id: 'node-cz-1', title: 'Druhy PU (čas, místo...)', type: 'lesson', status: 'completed', stars: 3, maxStars: 3, noteId: 'note-czech-1' },
        { id: 'node-cz-2', title: 'Doplněk vs. Přívlastek', type: 'lesson', status: 'current', stars: 1, maxStars: 3 },
        { id: 'node-cz-3', title: 'Větný rozbor grafem', type: 'quiz', status: 'locked', stars: 0, maxStars: 3 },
      ]
    }
  ],
  history: [
    {
      id: 'unit-hi-1',
      subject: 'history',
      unitNumber: 1,
      title: 'České země ve středověku',
      description: 'Zlatý věk za Karla IV. a nástup husitství',
      color: '#ff9600',
      badge: 'Landmark',
      nodes: [
        { id: 'node-hi-1', title: 'Karel IV. a založení UK', type: 'lesson', status: 'completed', stars: 3, maxStars: 3, noteId: 'note-history-1' },
        { id: 'node-hi-2', title: 'Zlatá bula sicilská & 1356', type: 'lesson', status: 'current', stars: 2, maxStars: 3 },
        { id: 'node-hi-3', title: 'Stavitelské památky', type: 'quiz', status: 'locked', stars: 0, maxStars: 3 },
      ]
    }
  ],
  science: [
    {
      id: 'unit-sc-1',
      subject: 'science',
      unitNumber: 1,
      title: 'Newtonovy pohybové zákony',
      description: 'Síla, setrvačnost a akce & reakce',
      color: '#58cc02',
      badge: 'FlaskConical',
      nodes: [
        { id: 'node-sc-1', title: '1. Newtonův zákon', type: 'lesson', status: 'current', stars: 1, maxStars: 3 },
        { id: 'node-sc-2', title: 'F = m · a', type: 'lesson', status: 'locked', stars: 0, maxStars: 3 },
      ]
    }
  ]
};

// Preset samples for quick testing the Camera / OCR flow
export const SCAN_PRESETS = [
  {
    subject: 'maths' as const,
    title: 'Goniometrické funkce & Sinová věta',
    tags: ['Trigonometrie', 'Trojúhelníky', 'Goniometrie'],
    readingTime: '2 min',
    previewUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&auto=format&fit=crop&q=80',
    markdown: `# Goniometrické funkce a sinová věta

Zápisky z matematiky — Planimetrie a trigonometrie.

## 1. Základní vztahy v pravoúhlém trojúhelníku
- $\\sin(\\alpha) = \\frac{\\text{protilehlá}}{\\text{přepona}}$
- $\\cos(\\alpha) = \\frac{\\text{přilehlá}}{\\text{přepona}}$
- $\\text{tg}(\\alpha) = \\frac{\\sin(\\alpha)}{\\cos(\\alpha)} = \\frac{\\text{protilehlá}}{\\text{přilehlá}}$

## 2. Sinová věta
Platí pro libovolný obecný trojúhelník $ABC$:
$$\\frac{a}{\\sin(\\alpha)} = \\frac{b}{\\sin(\\beta)} = \\frac{c}{\\sin(\\gamma)} = 2R$$
*(kde $R$ je poloměr kružnice opsané)*

### Použití:
Když známe:
1. Dva úhly a jednu stranu (SÚÚ, ÚSÚ)
2. Dvě strany a úhel naproti větší z nich (SsÚ)`
  },
  {
    subject: 'czech' as const,
    title: 'Pravopis: Psaní s/z a bě/bje, pě, vě/vje',
    tags: ['Pravopis', 'Morfologie', 'Čeština'],
    readingTime: '3 min',
    previewUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=500&auto=format&fit=crop&q=80',
    markdown: `# Pravopisná pravidla: Předpony s- a z-

Český jazyk — Rychlé taháky a pravidla.

## Předpona S-
Píšeme ve významech:
1. **Směřování dohromady**: *shromáždit se, sbalit, stlouci*
2. **Směřování shora dolů**: *sletět, spadnout, seskočit*
3. **Zmenšení objemu/zánik**: *scvrknout se, shořet*

## Předpona Z-
Píšeme ve významech:
1. **Dokončení děje / výsledek**: *zničit, zlomit, zorganizovat*
2. **Změna stavu (stát se nějakým)**: *zčervenat, ztloustnout, zklidnit se*

> **Pozor na páry s rozdílným významem:**
> - *spravit* (opravit boty) vs. *zpravit* (podat zprávu)
> - *sběh* (lidí na náměstí) vs. *zběh* (uprchlík z armády)
> - *slevit* (dát slevu) vs. *zlevnit* (udělat levnějším)`
  },
  {
    subject: 'history' as const,
    title: 'Husitské hnutí a Jan Žižka z Trocnova',
    tags: ['Husité', 'Středověk', 'Bitvy', 'České dějiny'],
    readingTime: '4 min',
    previewUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=500&auto=format&fit=crop&q=80',
    markdown: `# Husitské války (1419–1434)

Historie a vojenské inovace husitů.

## 1. Příčiny a počátek
- **6. 7. 1415**: Upálení Mistra Jana Husa v Kostnici.
- **1419**: První pražská defenestrace (vyhození konšelů z Novoměstské radnice).
- **Čtyři artikuly pražské**:
  1. Svobodné kázání slova Božího
  2. Přijímání podobojí způsobou (chléb a víno i pro laiky)
  3. Zákaz světského panování kněží
  4. Trestání smrtelných hříchů bez rozdílu stavu

## 2. Vojenská taktika Jana Žižky
- **Vozová hradba** spojená řetězy — nedobytná pevnost v terénu.
- Využití upravených selských nástrojů: **okované cepy, sudlice, řemdihy**.
- Rané střelné zbraně: **píšťaly, houfnice, tarasnice**.
- **1420**: Slavná bitva na Vítkově a u Sudoměře.`
  }
];
