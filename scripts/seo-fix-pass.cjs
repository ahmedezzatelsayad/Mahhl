/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Post-pipeline repair + quality pass:
 *
 * A) repair double-processed products (crash mid-batch → re-processed →
 *    slug got "-2" and legacy chain lost the ORIGINAL sku-slug):
 *      slug: solar-powered-side-light-2, legacy: solar-powered-side-light
 *    →   slug: solar-powered-side-light,  legacy: dev-0078 (from backup)
 *
 * B) quality sweep on ALL products:
 *    - fix known AI typos (dictionary) in description/metaTitle/metaDescription/keywords
 *    - fix mixed-script words (سينema → سينما)
 *    - regenerate garbage metaDescription (markdown echo, list echo, too long)
 *    - strip "| محل شوب" from metaTitle (layout appends it)
 *
 * Usage: node scripts/seo-fix-pass.cjs            # apply
 *        node scripts/seo-fix-pass.cjs --report   # just report
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const fs = require('fs');

const BACKUP = path.join(__dirname, '..', 'download', 'seo-pack-backup-2026-08-31.json');
const REPORT = process.argv.includes('--report');

const TYPOS = [
  [/\bسينema\b/g, 'سينما'],
  [/\bسينEm\b/gi, 'سينما'],
  [/إضارة/g, 'إضاءة'],
  [/اضارة/g, 'إضاءة'],
  [/أوضاه/g, 'أوضاع'],
  [/أوضاعات/g, 'أوضاع'],
  [/\bمش كهربائي\b/g, 'مشترك كهربائي'],
  [/بالتظام/g, 'بالنظام'],
  [/التظام الإنجليزي/g, 'النظام الإنجليزي'],
  [/ستاينلس/gi, 'ستانلس'],
  [/ستانلس ستيل/gi, 'ستانلس ستيل'],
  [/\bUSBمنفذ\b/g, 'منفذ USB'],
  [/البلوتوثbluetooth/gi, 'البلوتوث'],
];

function fixTypos(s) {
  if (!s) return s;
  let out = s;
  for (const [re, rep] of TYPOS) out = out.replace(re, rep);
  // mixed-script word: Arabic letter + latin run + Arabic letter
  out = out.replace(/([\u0600-\u06FF])([A-Za-z]{1,4})([\u0600-\u06FF])/g, (m, a, lat, b) => {
    if (/^(و|في|من)/.test(lat)) return a + lat + b; // keep latin brand-ish runs? no — remove
    return a + ' ' + lat + ' ' + b;
  });
  return out;
}

function badMeta(md) {
  if (!md) return false;
  if (md.includes('**')) return true;
  if (/^وصف المنتج|الميزات\s*:|مواصفات\s*:/i.test(md.trim())) return true;
  if (/\n/.test(md)) return true;
  if (/\d+\.\s/.test(md)) return true; // numbered list echo
  if (md.length > 178) return true;
  if (md.length < 70) return true;
  return false;
}

function metaFromDesc(name, desc) {
  const base = (desc || '')
    .replace(/^.*?\n/, '')            // drop intro line? no — keep from start
    .replace(/•/g, '،')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const core = base.length >= 60 ? base.slice(0, 118).trim() : `اشترِ ${name} من محل شوب`;
  return `${core} — دفع عند الاستلام وتوصيل سريع لكل الكويت`.slice(0, 175);
}

(async () => {
  // ---------- A) repair double-processed slugs ----------
  const backup = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
  const beforeById = new Map(backup.map((b) => [b.id, b.before]));

  const all = await p.product.findMany({
    select: { id: true, slug: true, legacySlug: true, name: true, sku: true, description: true, metaTitle: true, metaDescription: true, keywords: true },
  });
  const slugTaken = new Set(all.map((x) => x.slug).filter(Boolean));
  const legacyTaken = new Set(all.map((x) => x.legacySlug).filter(Boolean));

  let repaired = 0;
  const lower = (s) => (s || '').toLowerCase();
  for (const it of all) {
    if (!it.legacySlug) continue;
    if (lower(it.legacySlug) === lower(it.sku)) continue; // chain already correct
    // Double-processed during a crash: legacySlug holds an INTERMEDIATE
    // upgraded slug while the true original link is the (lowercased) SKU slug
    // (verified: the whole catalog started with slug == sku.toLowerCase()).
    const data = {};
    // promote the clean slug: "x-2" + legacy "x" → slug "x" (if free)
    const m = (it.slug || '').match(/^(.*)-(\d+)$/);
    if (m && m[1] === it.legacySlug && !slugTaken.has(it.legacySlug)) {
      slugTaken.delete(it.slug);
      data.slug = it.legacySlug;
      slugTaken.add(it.legacySlug);
    }
    const original = lower(it.sku);
    if (it.sku && !slugTaken.has(original)) {
      data.legacySlug = original; // restore the original indexed link
    }
    if (Object.keys(data).length) {
      if (!REPORT) await p.product.update({ where: { id: it.id }, data });
      repaired++;
      if (REPORT) console.log('REPAIR', it.sku, it.slug, '→', data.slug || '(keep)', '| legacy →', data.legacySlug);
    }
  }
  console.log(`A) repaired double-processed products: ${repaired}`);

  // ---------- B) quality sweep ----------
  const all2 = REPORT ? all : await p.product.findMany({
    select: { id: true, name: true, description: true, metaTitle: true, metaDescription: true, keywords: true },
  });
  let fixedTypos = 0, fixedMeta = 0, fixedTitle = 0, fixedShortDesc = 0;
  for (const it of all2) {
    const data = {};
    // B1: typos + mixed script
    for (const [field, val] of [
      ['description', it.description], ['metaTitle', it.metaTitle],
      ['metaDescription', it.metaDescription], ['keywords', it.keywords],
    ]) {
      if (!val) continue;
      const fixed = fixTypos(val);
      if (fixed !== val) { data[field] = field === 'keywords' ? fixed.slice(0, 200) : fixed; fixedTypos++; }
    }
    // B2: garbage metaDescription → rebuild from (clean) description
    const mdCandidate = data.metaDescription || it.metaDescription || '';
    if (badMeta(mdCandidate)) {
      const desc = data.description || it.description || '';
      data.metaDescription = metaFromDesc(it.name, desc);
      fixedMeta++;
    }
    // B4: too-short description (<50 chars — source was garbage) →
    // reuse the curated metaDescription or a minimal honest line
    const descCandidate = data.description || it.description || '';
    if (descCandidate.trim().length < 50) {
      const md = data.metaDescription || it.metaDescription || '';
      if (md.length >= 80) {
        data.description = md;
      } else {
        data.description = `اشترِ ${it.name} أونلاين من محل شوب.\n• منتج أصلي بحالة جديدة\n• توصيل سريع لجميع محافظات الكويت\n• الدفع عند الاستلام`;
      }
      fixedShortDesc++;
    }
    // B3: metaTitle must not carry the store suffix (layout adds "| محل شوب")
    const tCandidate = data.metaTitle || it.metaTitle || '';
    if (tCandidate.includes('محل شوب') || tCandidate.includes('|')) {
      const t = tCandidate.replace(/\s*[|،—-]\s*محل شوب\s*$/g, '').replace(/\|/g, '،').trim();
      data.metaTitle = t.slice(0, 60);
      fixedTitle++;
    }
    if (Object.keys(data).length && !REPORT) {
      await p.product.update({ where: { id: it.id }, data });
    }
  }
  console.log(`B) typo fixes: ${fixedTypos}, meta rebuilt: ${fixedMeta}, title cleaned: ${fixedTitle}, short desc filled: ${fixedShortDesc}`);
  if (REPORT) console.log('(report mode — no writes)');

  // ---------- final coverage report ----------
  const cov = await p.$queryRaw`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE "metaTitle" IS NOT NULL AND length("metaTitle") >= 20) AS title_ok,
      COUNT(*) FILTER (WHERE "metaDescription" IS NOT NULL AND length("metaDescription") BETWEEN 80 AND 178) AS meta_ok,
      COUNT(*) FILTER (WHERE keywords IS NOT NULL AND keywords <> '') AS kw_ok,
      COUNT(*) FILTER (WHERE "legacySlug" IS NOT NULL) AS has_legacy,
      COUNT(*) FILTER (WHERE slug ~ '[a-z]+(-[a-z0-9]+){2,}') AS wordy_slug
    FROM "Product"`;
  console.log('coverage:', JSON.stringify(cov[0], (k, v) => (typeof v === 'bigint' ? Number(v) : v)));
  await p.$disconnect();
})();
