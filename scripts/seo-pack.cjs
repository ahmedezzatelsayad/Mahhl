/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Full-catalog SEO pack pipeline — every product gets:
 *   1) description : Kuwaiti-tone rewrite (kept if already good)
 *   2) metaTitle   : 35-55 char Arabic SEO title (store name auto-appended by layout)
 *   3) metaDescription : 120-155 char selling snippet
 *   4) keywords    : 4-6 real Kuwaiti search phrases
 *   5) slug        : English keyword slug ("portable-steam-iron") — old slug
 *                    moves to legacySlug → 301 redirect keeps old links alive
 *
 * Resumable (progress file), 429-aware, concurrency 3, batch 10.
 * Deterministic fallback at the end for any product the AI missed → 100% coverage.
 *
 * Usage:  node scripts/seo-pack.cjs            # run
 *         node scripts/seo-pack.cjs --restore # restore everything from backup
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.DATABASE_URL =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const fs = require('fs');

const PROGRESS = path.join(__dirname, 'seo-pack-progress.json');
const BACKUP = path.join(__dirname, '..', 'download', 'seo-pack-backup-2026-08-31.json');
const RESTORE = process.argv.includes('--restore');

const ZAI_MOD = import('z-ai-web-dev-sdk');
let zaiP = null;
async function zai() {
  if (!zaiP) {
    const ZAI = (await ZAI_MOD).default;
    zaiP = ZAI.create();
  }
  return zaiP;
}

const SYSTEM = `أنت خبير SEO وكاتب محتوى لمتجر إلكتروني كويتي اسمه "محل شوب". لكل منتج تولّد حزمة SEO عربية عالية الجودة.

## الوصف d (إذا keep=false فقط):
اكتب بأسلوب بائع كويتي ودود وواقعي يتكلم مع الزبون مباشرة:
1) الأمانة أولاً: استخدم فقط الحقائق الموجودة في الوصف الأصلي (المواد، المقاسات، الطاقة، الملحقات، الأرقام). ممنوع اختراع مواصفات.
2) عربية فصيحة بسيطة بلمسة كويتية خفيفة (عميل، بيتك، يومك).
3) سطر افتتاحي قصير (جملة-جملتين) يشرح شنو المنتج وفائدته، ثم 3-5 نقاط كل واحدة تبدأ بـ "• " — كل نقطة ميزة حقيقية من الوصف الأصلي.
4) للمنتجات الصحية والتجميلية: استخدم "يساعد" و"يدعم" بدل "يعالج" و"يشفي".
5) لا تكرر اسم المنتج في البداية، لا تذكر السعر أو الشحن أو المتجر. الطول 50-110 كلمة. الأسطر مفصولة بـ \\n.

## عنوان SEO t:
- عربية، 30-55 حرف، بدون اسم المتجر (يُضاف تلقائياً).
- يبدأ باسم المنتج المختصر + فائدة أو كلمة مفتاحية: "مكواة بخار محمولة — تدور معك وين ما تروح" أو "مضخة مياه الجالون — بلمسة زر".
- ممنوع: الأرقام والأسعار، علامات |، علامات اقتباس.

## وصف الميتا md:
- عربية، 120-155 حرفاً (احسبها بدقة)، جملة أو جملتان تبيع المنتج: شنو هو + أبرز ميزة + في النهاية "دفع عند الاستلام وتوصيل سريع بالكويت" أو صياغة مشابهة قصيرة.
- بدون أسعار رقمية، بدون علامات اقتباس، بدون أسطر جديدة.

## الكلمات المفتاحية k:
- 4-6 عبارات عربية يبحث عنها الكويتيون فعلياً: اسم المنتج، نوعه، "سعر <منتج>"، "شراء <منتج> اونلاين"، "افضل <منتج>"، "<منتج> الكويت".
- كل عبارة 2-4 كلمات، بدون تكرار نفس الكلمة أكثر من مرة، بدون "محل شوب".

## الرابط sl:
- إنجليزي ASCII فقط، أحرف صغيرة، كلمات مفصولة بـ "-"، 3-5 كلمات، 10-45 حرفاً.
- ترجمة جوهر اسم المنتج: "portable-steam-iron"، "solar-power-bank-20000mah"، "kitchen-sink-spray-hose".
- ممنوع: أرقام فقط، "product"، "item"، أكثر من 45 حرفاً.

الناتج: JSON فقط بالشكل: [{"i":0,"d":"الوصف أو null","t":"...","md":"...","k":["...","..."],"sl":"..."}]
إذا keep=true اجعل d=null واستخدم الوصف الموجود.`;

// ---------- helpers ----------
function loadJSON(f, def) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; }
}
const saveProgress = (prog) => fs.writeFileSync(PROGRESS, JSON.stringify(prog));

const cleanText = (s) =>
  (s || '').replace(/\*\*/g, '').replace(/^["'«»]|["'«»]$/g, '').trim();

/** is this description already Kuwaiti-good (from earlier rewrite)? */
function isKwGood(d) {
  if (!d) return false;
  const hasBullets = d.includes('\n• ');
  const len = d.length;
  const badStart = /^(الميزات|الوصف|وصف المنتج|مواصفات|المواصفات)\s*[:：]?/.test(d.trim());
  return hasBullets && len >= 150 && len <= 900 && !badStart;
}

// ---------- slug bookkeeping ----------
let usedSlugs = new Set();      // current slugs (all products) — keeps uniqueness
let usedLegacy = new Set();     // all legacy slugs — avoid squatting

function normalizeSlug(raw, fallback) {
  let s = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!/^[a-z]/.test(s)) return null;
  if (s.length < 6 || s.length > 48) return null;
  if (/^(product|item|prod|new|test|the|for)\b/.test(s)) return null;
  if ((s.match(/[a-z]+/g) || []).length < 2) return null;
  return s;
}

function uniqueSlug(base) {
  if (!usedSlugs.has(base) && !usedLegacy.has(base)) return base;
  for (let n = 2; n < 60; n++) {
    const cand = `${base}-${n}`;
    if (!usedSlugs.has(cand) && !usedLegacy.has(cand)) return cand;
  }
  return null;
}

// ---------- AI batch ----------
async function seoBatch(items) {
  const client = await zai();
  const payload = items.map((it, idx) => ({
    i: idx,
    n: it.name.slice(0, 160),
    c: (it.categoryName || '').slice(0, 60),
    s: (it.slug || '').slice(0, 60),
    d: (it.description || '').slice(0, it.keep ? 500 : 900),
    keep: !!it.keep,
  }));
  let lastErr = null;
  for (let a = 0; a < 5; a++) {
    try {
      const completion = await Promise.race([
        client.chat.completions.create({
          messages: [
            { role: 'system', content: SYSTEM },
            {
              role: 'user',
              content:
                'ولّد حزمة SEO لكل منتج. أرجع JSON فقط بالشكل: [{"i":0,"d":"... أو null","t":"...","md":"...","k":["..."],"sl":"..."}]. البيانات:\n' +
                JSON.stringify(payload),
            },
          ],
          thinking: { type: 'disabled' },
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT-110s')), 110000)),
      ]);
      const raw = completion.choices[0]?.message?.content || '[]';
      const m = raw.match(/\[[\s\S]*\]/);
      const arr = JSON.parse(m ? m[0] : '[]');
      return arr.filter((r) => r && typeof r === 'object' && r.i !== undefined);
    } catch (e) {
      lastErr = e;
      const is429 = /429|Too many/i.test(e.message || '');
      const wait = is429 ? 18000 + Math.random() * 12000 : 4000;
      console.log(`  retry in ${Math.round(wait / 1000)}s (${(e.message || '').slice(0, 60)})`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr || new Error('seo batch failed');
}

// ---------- main ----------
(async () => {
  if (RESTORE) {
    const backup = loadJSON(BACKUP, []);
    console.log('restoring', backup.length, 'products...');
    for (const b of backup) {
      await p.product.update({ where: { id: b.id }, data: b.before });
    }
    console.log('✓ restored');
    await p.$disconnect();
    return;
  }

  const all = await p.product.findMany({
    select: {
      id: true, slug: true, name: true, sku: true,
      description: true, metaDescription: true, metaTitle: true, keywords: true,
      category: { select: { name: true } },
    },
    orderBy: { demandRank: { sort: 'asc', nulls: 'last' } },
  });
  console.log('total products:', all.length);

  // slug bookkeeping over the whole catalog (+ legacy slugs from re-runs)
  for (const it of all) {
    if (it.slug) usedSlugs.add(it.slug);
  }
  const legacyRows = await p.product.findMany({
    where: { legacySlug: { not: null } },
    select: { legacySlug: true },
  });
  for (const row of legacyRows) if (row.legacySlug) usedLegacy.add(row.legacySlug);

  const prog = loadJSON(PROGRESS, { done: {} });
  const backup = loadJSON(BACKUP, []);
  const backedIds = new Set(backup.map((b) => b.id));
  const backupPush = (it) => {
    if (!backedIds.has(it.id)) {
      backup.push({
        id: it.id, name: it.name,
        before: {
          slug: it.slug, description: it.description,
          metaDescription: it.metaDescription, metaTitle: it.metaTitle, keywords: it.keywords,
        },
      });
      backedIds.add(it.id);
    }
  };

  const todo = all.filter((t) => !prog.done[t.id]);
  // products whose description is already Kuwaiti-good (Task 15 rewrite)
  // keep their description; we only add the SEO pack + new slug
  for (const t of todo) t.keep = isKwGood(t.description);
  const keptCount = todo.filter((t) => t.keep).length;
  console.log('remaining:', todo.length, '(already done:', Object.keys(prog.done).length, ') — keep-description:', keptCount);

  const BATCH = 10;
  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));

  let done = 0;
  const failedIds = [];
  const queue = [...batches];

  async function worker(wid) {
    while (queue.length) {
      const batch = queue.shift();
      if (!batch) break;
      try {
        const results = await seoBatch(batch);
        const map = new Map(results.map((r) => [r.i, r]));
        for (const [idx, it] of batch.entries()) {
          const r = map.get(idx);
          const data = {};
          // 1) description
          if (!it.keep && typeof r.d === 'string' && r.d.trim().length > 50) {
            const d = cleanText(r.d);
            if (d.length > 50) data.description = d;
          }
          // 2) metaTitle
          if (typeof r.t === 'string') {
            const t = cleanText(r.t).slice(0, 60);
            if (t.length >= 20) data.metaTitle = t;
          }
          // 3) metaDescription
          if (typeof r.md === 'string') {
            let md = cleanText(r.md).replace(/\s+/g, ' ');
            if (md.length > 170) md = md.slice(0, 168).trim() + '…';
            if (md.length >= 80) data.metaDescription = md;
          }
          // 4) keywords
          if (Array.isArray(r.k) && r.k.length >= 3) {
            const ks = r.k
              .map((x) => cleanText(String(x)).replace(/,/g, ' ').trim())
              .filter((x) => x.length > 2 && x.length < 40)
              .slice(0, 7);
            if (ks.length >= 3) data.keywords = ks.join(', ');
          }
          // 5) slug (English keyword slug)
          const cand = normalizeSlug(r.sl);
          if (cand) {
            const uniq = uniqueSlug(cand);
            if (uniq && uniq !== it.slug) {
              data.slug = uniq;
              data.legacySlug = it.slug; // old link → 301
              usedSlugs.add(uniq);
            }
          }
          if (Object.keys(data).length === 0) {
            failedIds.push(it.id);
            continue; // nothing usable — fallback pass will fill
          }
          backupPush(it);
          await p.product.update({ where: { id: it.id }, data });
          prog.done[it.id] = 1;
          done++;
          saveProgress(prog); // crash-safe: per-product, not per-batch
        }
        saveProgress(prog);
        fs.writeFileSync(BACKUP, JSON.stringify(backup));
        console.log(`w${wid}: batch ok — ${done}/${todo.length}`);
      } catch (e) {
        console.log(`w${wid}: batch FAILED — ${(e.message || '').slice(0, 80)}`);
        for (const it of batch) failedIds.push(it.id);
      }
    }
  }

  await Promise.all([worker(1), worker(2), worker(3)]);
  console.log(`\nAI phase done: ${done} products. failed/missing: ${failedIds.length}`);

  // ---------- deterministic fallback → 100% coverage ----------
  const need = todo.filter((it) => !prog.done[it.id]);
  if (need.length) {
    console.log('fallback filling', need.length, 'products...');
    let fdone = 0;
    for (const it of need) {
      const data = {};
      if (!it.metaTitle || !it.metaTitle.trim()) {
        let t = `${it.name} — شراء أونلاين في الكويت`;
        if (t.length > 55) t = `${it.name}`.slice(0, 55);
        data.metaTitle = t.slice(0, 60);
      }
      if (!it.metaDescription || !it.metaDescription.trim()) {
        const base = cleanText((it.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '));
        const core = base.length >= 60 ? base.slice(0, 120).trim() : `اشترِ ${it.name} من محل شوب`;
        data.metaDescription = `${core} — دفع عند الاستلام وتوصيل سريع لكل الكويت.`.slice(0, 175);
      }
      if (!it.keywords || !it.keywords.trim()) {
        const cat = it.category?.name || '';
        const parts = [it.name, cat, `سعر ${it.name}`.slice(0, 40), 'شراء اونلاين الكويت'].filter(Boolean);
        data.keywords = parts.slice(0, 5).join(', ').slice(0, 200);
      }
      if (Object.keys(data).length) {
        backupPush(it);
        await p.product.update({ where: { id: it.id }, data });
        fdone++;
      }
      prog.done[it.id] = 1;
    }
    console.log(`fallback filled: ${fdone}`);
    saveProgress(prog);
    fs.writeFileSync(BACKUP, JSON.stringify(backup));
  }

  console.log('\nALL DONE. Progress file:', PROGRESS);
  await p.$disconnect();
})();
