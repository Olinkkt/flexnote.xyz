import { SubjectMeta } from '../types/notes';

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
