/**
 * Kuwaiti catalog content cleanup — deterministic, no AI.
 * Fixes:
 *  1. "وصف المنتج :" lazy prefix (494 products)
 *  2. Literal **markdown bold** (562 products)
 *  3. Crammed "1. X 2. Y 3. Z" lists → real bullet lines (615 products)
 *  4. Known AliExpress boilerplate lines (أداء لا مثيل له، معبأة مع الميزات...)
 *  5. Spacing/punctuation hygiene
 *
 * Usage:
 *   node scripts/clean-descriptions.mjs            # DRY RUN (default) → samples + counts
 *   node scripts/clean-descriptions.mjs --apply    # backup to download/ then update DB
 *   node scripts/clean-descriptions.mjs --restore  # restore from backup
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const NEON_URL =
  process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')
    ? process.env.DATABASE_URL
    : 'postgresql://neondb_owner:npg_9ozjdwE8rAqc@ep-bitter-base-axq48ptq-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
process.env.DATABASE_URL = NEON_URL;

const prisma = new PrismaClient();
const BACKUP = '/home/z/my-project/download/description-backup-2026-08-31.json';
const APPLY = process.argv.includes('--apply');
const RESTORE = process.argv.includes('--restore');

// Boilerplate lines dropped entirely (exact match after strip)
const BOILERPLATE = new Set([
  'أداء لا مثيل له',
  'اداء لا مثيل له',
  'معبأة مع الميزات',
  'معبأة بالميزات',
  'سيكون هذا المنتج اختيارًا ممتازًا لك',
  'سيكون هذا المنتج اختيارا ممتازا لك',
  'هذا المنتج اختيار ممتاز لك',
  'جودة عالية',
  'جودة ممتازة',
  'مواد منتقاة',
  'سعة كبيرة',
  'تصميم عصري',
  'سهل الحمل',
  'سهل الاستخدام',
  'منتج ممتاز',
  'منتج رائع',
  'شحن سريع',
  'بشكل عام',
  'الوصف',
  'المواصفات',
  'مميزات المنتج',
]);

function stripBold(s) {
  return s.replace(/\*\*+/g, '').replace(/\*+/g, '');
}

function normalizeSpaces(s) {
  return s
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([،,؛:!؟.])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\.{2,}/g, '.')
    .replace(/،\s*$/g, '')
    .trim();
}

// mojibake / junk chars from scraped listings — mostly mangled bullets and icons
function stripJunk(s) {
  return s
    .replace(/¡ô|â€[\u0080-\u00BF]?|Â+|ï¼|â€/g, '\n')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '') // stray emoji artifacts only (kept out of descriptions)
    .replace(/：/g, ':')
    .replace(/，/g, '، ')
    .replace(/！/g, '!')
    .replace(/？/g, '؟');
}

/**
 * Split crammed numbered lists like:
 *  "...نص1. **X:** body2. **Y:** body3. Z"
 * into lines starting with "• ".
 * Handles Arabic + Western digits, with/without bold, with "4.الوصف" no-space cases.
 */
function splitNumbered(s) {
  // insert newlines before number-dot boundaries that are NOT at line start
  // prev must be non-digit so "304." "10.5" measurements never split
  let out = s.replace(
    /([^\n\d])\s*(\d{1,2})\s*\.\s*(?=[\u0600-\u06FF\*A-Za-z])/g,
    (m, prev, num) => `\n${num}. `
  );
  return out;
}

function toBullets(s) {
  return s
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // remove leading numbering "1." "2)" — only when a letter follows (protects "5.2 متر")
      // also strip pre-existing bullet glyphs so we never double them
      const stripped = line
        .replace(/^\d{1,2}\s*[.)]\s*(?=[\u0600-\u06FFA-Za-z])/, '')
        .replace(/^[•·▪◦\-*\u2022\u25CF\u2023\u25E6\u2043]+\s*/, '')
        .trim();
      if (!stripped) return null;
      if (BOILERPLATE.has(stripped)) return null;
      const clean = normalizeSpaces(stripped);
      if (!clean || clean.length < 3) return null;
      return clean;
    })
    .filter(Boolean)
    .map((line) => `• ${line}`)
    .join('\n');
}

function hasList(s) {
  return (
    /^\s*\d{1,2}\s*[.)]/.test(s) ||
    /\d{1,2}\s*\.\s*(?=[\u0600-\u06FF])/.test(s) ||
    /\n\s*\d{1,2}\s*[.)]/.test(s)
  );
}

function cleanDescription(raw) {
  if (!raw) return raw;
  let s = raw;

  // 1. lazy prefix
  s = s.replace(/^\s*وصف\s*المنتج\s*:?\s*/u, '');
  s = s.replace(/^\s*الوصف\s*:?\s*/u, '');

  // 1.5 mojibake junk → separators
  s = stripJunk(s);

  // 2. markdown bold (before splitting so **X:** anchors survive)
  s = stripBold(s);

  // 3. split crammed lists → lines
  if (hasList(s)) {
    s = splitNumbered(s);
    s = toBullets(s);
  } else {
    // still may contain glued boilerplate fragments → split by known phrases
    s = s
      .replace('أداء لا مثيل له', '\nأداء لا مثيل له')
      .replace('معبأة مع الميزات', '\nمعبأة مع الميزات')
      .replace('سيكون هذا المنتج اختيارًا ممتازًا لك', '\nسيكون هذا المنتج اختيارًا ممتازًا لك');
    const lines = s
      .split('\n')
      .map((l) => normalizeSpaces(l.replace(/^[•·▪◦\-*\u2022\u25CF]+\s*/, '')))
      .filter((l) => l && !BOILERPLATE.has(l));
    s = lines.length ? lines.join('\n') : normalizeSpaces(s);
  }

  // 4. final hygiene: collapse 3+ newlines, trim each line
  s = s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');

  // 5. never return something much shorter/empty — safety
  if (!s || s.replace(/\s/g, '').length < 10) return raw;
  return s;
}

const run = async () => {
  if (RESTORE) {
    if (!fs.existsSync(BACKUP)) {
      console.log('no backup file at', BACKUP);
      return;
    }
    const data = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
    console.log('restoring', data.length, 'descriptions...');
    for (const { id, description } of data) {
      await prisma.product.update({ where: { id }, data: { description } });
    }
    console.log('✓ restored');
    return;
  }

  const products = await prisma.product.findMany({
    select: { id: true, name: true, description: true },
  });
  console.log('scanning', products.length, 'products (mode:', APPLY ? 'APPLY' : 'DRY RUN', ')');

  const changed = [];
  let stats = { prefix: 0, bold: 0, list: 0, boiler: 0 };
  for (const p of products) {
    const orig = p.description || '';
    if (!orig.trim()) continue;
    const cleaned = cleanDescription(orig);
    if (cleaned !== orig) {
      changed.push({ id: p.id, name: p.name, before: orig, after: cleaned });
      if (/^\s*وصف\s*المنتج/.test(orig)) stats.prefix++;
      if (orig.includes('**')) stats.bold++;
      if (hasList(orig)) stats.list++;
    }
  }

  console.log('products to change:', changed.length);
  console.log('stats:', JSON.stringify(stats));

  // show 5 samples
  for (const c of changed.slice(0, 5)) {
    console.log('\n===== ' + c.name + ' =====');
    console.log('--- BEFORE:\n' + c.before.slice(0, 350));
    console.log('--- AFTER:\n' + c.after.slice(0, 350));
  }

  if (APPLY) {
    fs.writeFileSync(BACKUP, JSON.stringify(changed.map(({ id, before }) => ({ id, description: before }))));
    console.log('\nbackup saved →', BACKUP);
    let done = 0;
    for (const c of changed) {
      await prisma.product.update({ where: { id: c.id }, data: { description: c.after } });
      if (++done % 500 === 0) console.log(`  ...${done}/${changed.length}`);
    }
    console.log('✓ applied', done, 'updates');
  } else {
    console.log('\n(dry run — pass --apply to write)');
  }
};

run()
  .catch((e) => {
    console.error('FAILED:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
