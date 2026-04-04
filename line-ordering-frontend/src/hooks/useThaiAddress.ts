'use client';

/**
 * Thai address autocomplete using the kongvut/thai-province-data dataset,
 * pre-processed into a compact flat JSON at public/thai-address-data.json.
 *
 * The JSON (~773 KB) is fetched once then cached in module scope so that
 * repeated renders do not re-fetch.  All matching is done client-side — no
 * API key required, works completely offline after the first load.
 *
 * Data source (MIT licence):
 *   https://github.com/kongvut/thai-province-data
 *
 * Regenerate the local file:
 *   node scripts/generate-thai-address.mjs
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThaiAddressEntry {
  subDistrict: string;      // แขวง / ตำบล (TH)
  subDistrictEn: string;    // แขวง / ตำบล (EN)
  district: string;         // เขต / อำเภอ (TH)
  districtEn: string;       // เขต / อำเภอ (EN)
  province: string;         // จังหวัด (TH)
  provinceEn: string;       // จังหวัด (EN)
  postalCode: string;       // รหัสไปรษณีย์
}

// ─── Raw DB format (kongvut flat export) ─────────────────────────────────────
interface RawEntry {
  s: string;    // sub-district TH
  se: string;   // sub-district EN
  d: string;    // district TH
  de: string;   // district EN
  p: string;    // province TH
  pe: string;   // province EN
  z: string;    // zip code
}

// ─── Module-level cache ───────────────────────────────────────────────────────
let cachedDb: ThaiAddressEntry[] | null = null;
let fetchPromise: Promise<ThaiAddressEntry[]> | null = null;

const DB_URL = '/thai-address-data.json';

async function loadDb(): Promise<ThaiAddressEntry[]> {
  if (cachedDb) return cachedDb;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch(DB_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load Thai address DB: ${r.status}`);
      return r.json() as Promise<RawEntry[]>;
    })
    .then((raw) => {
      const db: ThaiAddressEntry[] = raw.map((e) => ({
        subDistrict: e.s,
        subDistrictEn: e.se,
        district: e.d,
        districtEn: e.de,
        province: e.p,
        provinceEn: e.pe,
        postalCode: e.z,
      }));
      cachedDb = db;
      return db;
    });

  return fetchPromise;
}

// ─── Helper: normalize Thai / Latin for fuzzy matching ───────────────────────
function normalize(s: string) {
  return s.trim().toLowerCase();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseThaiAddressReturn {
  /** true while the DB is being fetched the first time */
  isLoading: boolean;
  /** suggestions matching the current query */
  suggestions: ThaiAddressEntry[];
  /** call with partial text to get suggestions; pass filter for cascading */
  search: (field: keyof ThaiAddressEntry, query: string, filter?: Partial<Pick<ThaiAddressEntry, 'province' | 'district'>>) => void;
  /** call once user selects a suggestion */
  select: (entry: ThaiAddressEntry) => void;
  /** currently selected entry (null until user picks one) */
  selected: ThaiAddressEntry | null;
  clearSuggestions: () => void;
}

const MAX_SUGGESTIONS: Record<keyof ThaiAddressEntry, number> = {
  province: 77,
  provinceEn: 77,
  district: 50,    // some provinces have up to 50 districts
  districtEn: 50,
  subDistrict: 150, // some districts have many sub-districts
  subDistrictEn: 150,
  postalCode: 10,
};

export function useThaiAddress(
  onSelect?: (entry: ThaiAddressEntry) => void,
): UseThaiAddressReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ThaiAddressEntry[]>([]);
  const [selected, setSelected] = useState<ThaiAddressEntry | null>(null);
  const dbRef = useRef<ThaiAddressEntry[] | null>(null);

  // Pre-load DB in the background when the hook mounts
  useEffect(() => {
    if (cachedDb) {
      dbRef.current = cachedDb;
      return;
    }
    setIsLoading(true);
    loadDb()
      .then((db) => {
        dbRef.current = db;
      })
      .finally(() => setIsLoading(false));
  }, []);

  const search = useCallback((
    field: keyof ThaiAddressEntry,
    query: string,
    filter?: Partial<Pick<ThaiAddressEntry, 'province' | 'district'>>,
  ) => {
    const db = dbRef.current ?? cachedDb;
    if (!db) {
      setSuggestions([]);
      return;
    }
    // Allow empty query for province (all 77) or when a parent filter is active
    const hasFilter = !!(filter?.province || filter?.district);
    if (!query.trim() && field !== 'province' && !hasFilter) {
      setSuggestions([]);
      return;
    }
    const q = normalize(query);
    const fp = filter?.province ? normalize(filter.province) : null;
    const fd = filter?.district ? normalize(filter.district) : null;
    const results: ThaiAddressEntry[] = [];
    const seen = new Set<string>();
    for (const entry of db) {
      if (fp && normalize(entry.province) !== fp) continue;
      if (fd && normalize(entry.district) !== fd) continue;
      if (!normalize(entry[field]).includes(q)) continue;
      // Deduplicate: province/district names repeat across many sub-districts
      const key =
        field === 'subDistrict'
          ? `${entry.subDistrict}|${entry.district}|${entry.province}`
          : field === 'district'
          ? `${entry.district}|${entry.province}`
          : entry.province;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(entry);
      if (results.length >= MAX_SUGGESTIONS[field]) break;
    }
    setSuggestions(results);
  }, []);

  const select = useCallback(
    (entry: ThaiAddressEntry) => {
      setSelected(entry);
      setSuggestions([]);
      onSelect?.(entry);
    },
    [onSelect],
  );

  const clearSuggestions = useCallback(() => setSuggestions([]), []);

  return { isLoading, suggestions, search, select, selected, clearSuggestions };
}
