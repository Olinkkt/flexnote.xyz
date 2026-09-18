export type SchoolCategory = 'Základní škola' | 'Gymnázium' | 'Střední škola' | 'Konzervatoř' | 'VOŠ';

export interface SchoolItem {
  id: string; // RED_IZO
  name: string;
  fullName: string;
  city: string;
  district: string;
  region: string;
  category: SchoolCategory;
}

interface SchoolItemWithSearch extends SchoolItem {
  searchKey: string;
}

let schoolsCache: SchoolItemWithSearch[] | null = null;
let loadPromise: Promise<SchoolItemWithSearch[]> | null = null;

export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function getStem(word: string): string {
  if (word.length > 4 && /[aeiyou]$/i.test(word)) {
    return word.slice(0, -1);
  }
  return word;
}

export async function loadSchools(): Promise<SchoolItemWithSearch[]> {
  if (schoolsCache) return schoolsCache;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const module = await import('../data/schools.json');
      const data = (module.default || module) as SchoolItem[];
      schoolsCache = data.map((s) => ({
        ...s,
        searchKey: normalizeQuery(`${s.name} ${s.fullName} ${s.city} ${s.district || ''} ${s.region || ''} ${s.category}`)
      }));
      return schoolsCache;
    } catch (err) {
      console.error('Failed to load schools database:', err);
      return [];
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export async function searchSchools(
  query: string,
  categoryFilter?: string,
  limit = 8
): Promise<SchoolItem[]> {
  const schools = await loadSchools();
  const clean = normalizeQuery(query);

  if (!clean && !categoryFilter) {
    return [];
  }

  const terms = clean.split(/\s+/).filter(Boolean);

  const results = schools.filter((s) => {
    if (categoryFilter && s.category !== categoryFilter) {
      return false;
    }
    if (terms.length === 0) return true;

    return terms.every((term) => {
      if (s.searchKey.includes(term)) return true;
      const stem = getStem(term);
      if (stem.length >= 4 && s.searchKey.includes(stem)) return true;
      return false;
    });
  });

  return results.slice(0, limit);
}
