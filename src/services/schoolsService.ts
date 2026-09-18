import { supabase } from './supabase';

export type SchoolCategory = 'Základní škola' | 'Gymnázium' | 'Střední škola' | 'Konzervatoř' | 'VOŠ';

export interface SchoolItem {
  id: string; // RED_IZO or UUID
  name: string;
  fullName: string;
  city: string;
  district: string;
  region: string;
  category: SchoolCategory;
  isCustom?: boolean;
  status?: 'approved' | 'pending';
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
      // 1. Load static MŠMT schools
      const module = await import('../data/schools.json');
      const staticData = (module.default || module) as SchoolItem[];
      
      const staticItems: SchoolItemWithSearch[] = staticData.map((s) => ({
        ...s,
        searchKey: normalizeQuery(`${s.name} ${s.fullName} ${s.city} ${s.district || ''} ${s.region || ''} ${s.category}`)
      }));

      // 2. Fetch approved custom schools from Supabase
      try {
        const { data: approvedSchools, error } = await supabase
          .from('custom_schools')
          .select('*')
          .eq('status', 'approved');

        if (!error && approvedSchools && approvedSchools.length > 0) {
          const customItems: SchoolItemWithSearch[] = approvedSchools.map((cs) => {
            const cat = (cs.category as SchoolCategory) || 'Střední škola';
            const cityStr = cs.city || '';
            return {
              id: cs.id,
              name: cs.name,
              fullName: cs.name,
              city: cityStr,
              district: cityStr,
              region: '',
              category: cat,
              isCustom: true,
              status: 'approved',
              searchKey: normalizeQuery(`${cs.name} ${cityStr} ${cat}`)
            };
          });

          schoolsCache = [...customItems, ...staticItems];
          return schoolsCache;
        }
      } catch {
        // Offline or supabase issue - fallback to static
      }

      schoolsCache = staticItems;
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

/**
 * Submits a custom school to Supabase with status 'pending' for moderation.
 * Once approved by admin, it becomes available to everyone in autocomplete!
 */
export async function submitCustomSchool(
  name: string,
  city?: string,
  category?: SchoolCategory,
  userId?: string
): Promise<{ success: boolean; isNew: boolean }> {
  const cleanName = name.trim();
  if (!cleanName || cleanName.length < 3) {
    return { success: false, isNew: false };
  }

  // Check if school is already in static list
  const schools = await loadSchools();
  const existsStatic = schools.some(
    (s) => normalizeQuery(s.name) === normalizeQuery(cleanName)
  );

  if (existsStatic) {
    return { success: true, isNew: false };
  }

  try {
    // Insert into custom_schools with pending status
    const { error } = await supabase.from('custom_schools').insert({
      name: cleanName,
      city: city?.trim() || null,
      category: category || 'Střední škola',
      status: 'pending',
      submitted_by: userId || null
    });

    if (error) {
      // If error code is 23505 (unique violation), it means already submitted
      if (error.code === '23505') {
        return { success: true, isNew: false };
      }
      console.warn('Could not submit custom school to moderation queue:', error.message);
      return { success: false, isNew: false };
    }

    return { success: true, isNew: true };
  } catch (err) {
    console.warn('Network error while submitting custom school:', err);
    return { success: false, isNew: false };
  }
}
