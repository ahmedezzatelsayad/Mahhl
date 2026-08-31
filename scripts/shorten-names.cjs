/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Concise product NAMES for the 125 high-traffic products.
 * Long AliExpress-style titles ("مشترك الطاقة 3 مآخذ إلى 6 منافذ USB ... كابل 2 متر")
 * → clean, searchable, card-friendly names (≤ 60 chars target).
 * Keeps brand/model codes. slug/sku unchanged so links keep working.
 * Search works BETTER after this (suggest API matches on name).
 *
 * Usage:  node scripts/shorten-names.cjs
 *         node scripts/shorten-names.cjs --restore
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const fs = require('fs');

const BACKUP = path.join(__dirname, '..', 'download', 'names-backup-2026-08-31.json');
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

const SYSTEM = `أنت محرر كتالوج لمتجر كويتي. مهمتك: تقصير أسماء المنتجات الطويلة (بأسلوب علي إكسبريس) إلى أسماء متجر حقيقية.

القواعد:
1) احتفظ بنوع المنتج + أهم ميزة + كود الماركة/الموديل إن وجد (مثل F01, Q71, T3x).
2) طول الاسم النهائي: 20-60 حرف عربي. أقصى حد مطلق 70.
3) لا تحذف معلومة أساسية يحتاجها المشتري للتمييز (عدد القطع في الطقم، اللون إن كان وحيداً).
4) لا تضف كلمات تسويقية (رائع، ممتاز، احترافي) غير موجودة في الأصل.
5) احذف: تفاصيل الفولت/الأمبير الثانوية، الأوصاف المكررة، القياسات الدقيقة (تبقى في الوصف).

أمثلة:
"مشترك الطاقة 3 مآخذ إلى 6 منافذ USB للشحن الذكي 5 فولت ، محول شاحن عالمي ، كابل 2 متر" → "مشترك طاقة 3 مآخذ + 6 منافذ USB"
"نظارة F01 الشمسية الذكية - سماعات بلوتوث وعدسات UV400" → "نظارة F01 الشمسية الذكية بسماعات بلوتوث"`;

async function shortenBatch(items) {
  const client = await zai();
  const payload = items.map((it, idx) => ({ i: idx, n: it.name.slice(0, 200) }));
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
                'قصّر الأسماء. أرجع JSON فقط: [{"i":0,"n":"الاسم الجديد"}]. الأسماء:\n' + JSON.stringify(payload),
            },
          ],
          thinking: { type: 'disabled' },
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT-90s')), 90000)),
      ]);
      const raw = completion.choices[0]?.message?.content || '[]';
      const m = raw.match(/\[[\s\S]*\]/);
      const arr = JSON.parse(m ? m[0] : '[]');
      return arr.filter((r) => typeof r.n === 'string' && r.n.trim().length >= 10 && r.n.trim().length <= 75);
    } catch (e) {
      lastErr = e;
      const is429 = /429|Too many/i.test(e.message || '');
      const wait = is429 ? 15000 + Math.random() * 15000 : 4000;
      console.log(`  retry in ${Math.round(wait / 1000)}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr || new Error('shorten failed');
}

(async () => {
  if (RESTORE) {
    const backup = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
    console.log('restoring', backup.length, 'names...');
    for (const b of backup) {
      await p.product.update({ where: { id: b.id }, data: { name: b.before } });
    }
    console.log('✓ restored');
    return;
  }

  const targets = await p.product.findMany({
    where: { OR: [{ demandRank: { not: null } }, { isBestSeller: true }] },
    select: { id: true, name: true },
    orderBy: [{ demandRank: { sort: 'asc', nulls: 'last' } }, { soldCount: 'desc' }],
  });
  // top products with verbose names + ANY product with a very long name (>= 75 chars)
  const allNames = await p.product.findMany({ select: { id: true, name: true } });
  const todo = targets    .filter((t) => t.name.length > 55)
    .concat(allNames.filter((t) => t.name.length >= 75))
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);
  console.log('targets:', targets.length, '| long names to shorten:', todo.length);

  let backup = [];
  try {
    backup = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
  } catch {}

  const BATCH = 10;
  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));

  let done = 0;
  const queue = [...batches];
  const pending = [];

  async function worker(wid) {
    while (queue.length) {
      const batch = queue.shift();
      if (!batch) break;
      try {
        const results = await shortenBatch(batch);
        const map = new Map(results.map((r) => [r.i, r.n]));
        for (const [idx, it] of batch.entries()) {
          const nn = (map.get(idx) || '').replace(/^["'«]|["'»]$/g, '').trim();
          if (!nn || nn.length < 10) continue;
          await p.product.update({ where: { id: it.id }, data: { name: nn } });
          if (!backup.find((b) => b.id === it.id)) {
            backup.push({ id: it.id, before: it.name, after: nn });
          }
          done++;
        }
        fs.writeFileSync(BACKUP, JSON.stringify(backup));
        console.log(`worker${wid}: batch ok — ${done}/${todo.length}`);
      } catch (e) {
        console.log(`worker${wid}: FAILED — ${(e.message || '').slice(0, 70)}`);
      }
    }
  }

  await Promise.all([worker(1), worker(2)]);
  console.log(`\nDONE: ${done} names shortened. Backup: download/names-backup-2026-08-31.json`);
  await p.$disconnect();
})();
