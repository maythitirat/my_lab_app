#!/usr/bin/env node
/**
 * scripts/generate-thai-address.mjs
 *
 * Fetches the 3 relational JSON files from kongvut/thai-province-data,
 * joins them, and writes a compact flat array to:
 *   public/thai-address-data.json
 *
 * Each entry: { s: subDistrict_th, d: district_th, p: province_th, z: zipCode }
 *
 * Run once (or in CI):
 *   node scripts/generate-thai-address.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'public', 'thai-address-data.json');
const BASE = 'https://raw.githubusercontent.com/kongvut/thai-province-data/master/data/raw';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url} (${res.status})`);
  return res.json();
}

console.log('⏳  Fetching data from kongvut/thai-province-data …');

const [provinces, districts, subDistricts] = await Promise.all([
  fetchJson(`${BASE}/provinces.json`),
  fetchJson(`${BASE}/districts.json`),
  fetchJson(`${BASE}/sub_districts.json`),
]);

console.log(`   provinces: ${provinces.length}`);
console.log(`   districts: ${districts.length}`);
console.log(`   sub_districts: ${subDistricts.length}`);

// Build lookup maps for fast joining
const provinceById = new Map(provinces.map((p) => [p.id, { name_th: p.name_th, name_en: p.name_en }]));
const districtById = new Map(
  districts.map((d) => [d.id, { name_th: d.name_th, name_en: d.name_en, provinceId: d.province_id }]),
);

// Build flat array — filter out soft-deleted entries
const flat = subDistricts
  .filter((sd) => sd.deleted_at === null)
  .map((sd) => {
    const district = districtById.get(sd.district_id);
    if (!district) return null;
    const province = provinceById.get(district.provinceId);
    if (!province) return null;
    return {
      s: sd.name_th,               // subDistrict TH
      se: sd.name_en ?? '',        // subDistrict EN
      d: district.name_th,         // district TH
      de: district.name_en ?? '',  // district EN
      p: province.name_th,         // province TH
      pe: province.name_en ?? '',  // province EN
      z: String(sd.zip_code),      // postalCode (5-digit string)
    };
  })
  .filter(Boolean);

console.log(`   flattened entries: ${flat.length}`);

mkdirSync(join(__dirname, '..', 'public'), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(flat));

const kb = (Buffer.byteLength(JSON.stringify(flat)) / 1024).toFixed(1);
console.log(`✅  Written to public/thai-address-data.json (${kb} KB, ${flat.length} entries)`);
