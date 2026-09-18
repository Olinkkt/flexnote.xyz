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
  notesScannedToday: 0,
  dailyGoal: 3,
  hearts: 5,
};

export const INITIAL_NOTES: NoteItem[] = [];

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
      nodes: []
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
      nodes: []
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
      nodes: []
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
      nodes: []
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
      nodes: []
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
