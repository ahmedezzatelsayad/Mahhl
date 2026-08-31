/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Kuwaiti-tone description rewrite for high-traffic products
 * (top-100 demand + bestsellers = 125 products that get most of the traffic).
 *
 * Resumable via progress file. 429-aware, concurrency 2, batch 10.
 * Keeps ONLY facts from source (honest-copy policy), softens medical claims,
 * output format: 1 short intro line + 3-5 "• " bullets (matches product page renderer).
 *
 * Usage:  node scripts/rewrite-kuwaiti.cjs           # run
 *         node scripts/rewrite-kuwaiti.cjs --restore # restore originals from backup
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.DATABASE_URL =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const fs = require('fs');

const PROGRESS = path.join(__dirname, 'rewrite-kuwaiti-progress.json');
const BACKUP = path.join(__dirname, '..', 'download', 'rewrite-kuwaiti-backup.json');
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

const SYSTEM = `أنت كاتب محتوى لمتجر إلكتروني كويتي اسمه "محل شوب"، تكتب أوصاف المنتجات بأسلوب بائع كويتي ودود وواقعي يتكلم مع الزبون مباشرة.

القواعد الصارمة:
1) الأمانة أولاً: استخدم فقط الحقائق الموجودة في الوصف الأصلي (المواد، المقاسات، الطاقة، الملحقات، الأرقام). ممنوع اختراع مواصفات أو مميزات غير موجودة.
2) اكتب بعربية فصيحة بسيطة ممزوجة بلمسة كويتية خفيفة (كلمات مثل: عميل، بيتك، يومك، بنفس الوقت). لا تفرط بالعامية ولا تستخدم كلمات غير مفهومة للخليجيين.
3) ابدأ بسطر افتتاحي قصير (جملة أو جملتين) يخاطب الزبون ويشرح شنو المنتج وفائدته.
4) بعدها 3 إلى 5 نقاط تبدأ كل واحدة بـ "• " — كل نقطة ميزة حقيقية من الوصف الأصلي بصياغة أوضح وأقصر.
5) للمنتجات الصحية والتجميلية: خفف الادعاءات — استخدم "يساعد" و"يدعم" بدل "يعالج" و"يشفي"، ولا تضِف وعود طبية.
6) لا تكرر اسم المنتج في البداية. لا تذكر السعر ولا الشحن ولا أي شيء عن المتجر.
7) الطول الكلي: 50-110 كلمة. بدون مقدمات طويلة، بدون خاتمة تسويقية.
8) الناتج: نص عربي فقط، الأسطر مفصولة بـ \\n، النقاط تبدأ بـ "• ".

مثال على الأسلوب المطلوب:
فرفة يد صغيرة تدور معك وين ما تروح — ثلاث سرعات وشمعة USB تشحنها مرة وتستخدمها طول اليوم.
• ثلاث سرعات قابلة للتعديل تناسب الجو الحار والمعتدل
• بطارية قابلة للشحن عبر USB
• حجم صغير يدخل شنطة الجامعة أو السيارة`;

async function rewriteBatch(items) {
  const client = await zai();
  const payload = items.map((it, idx) => ({
    i: idx,
    n: it.name.slice(0, 160),
    c: (it.categoryName || '').slice(0, 60),
    d: (it.description || '').slice(0, 900),
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
                'أعد كتابة وصف كل منتج بالأسلوب المطلوب. أرجع JSON فقط بالشكل: [{"i":0,"d":"الوصف الجديد"}] — كل وصف نص واحد فيه سطر الافتتاح ثم نقاط "• ". البيانات:\n' +
                JSON.stringify(payload),
            },
          ],
          thinking: { type: 'disabled' },
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT-90s')), 90000)),
      ]);
      const raw = completion.choices[0]?.message?.content || '[]';
      const m = raw.match(/\[[\s\S]*\]/);
      const arr = JSON.parse(m ? m[0] : '[]');
      return arr.filter((r) => typeof r.d === 'string' && r.d.trim().length > 40);
    } catch (e) {
      lastErr = e;
      const is429 = /429|Too many/i.test(e.message || '');
      const wait = is429 ? 15000 + Math.random() * 15000 : 4000;
      console.log(`  retry in ${Math.round(wait / 1000)}s (${(e.message || '').slice(0, 50)})`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr || new Error('rewrite failed');
}

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS, 'utf8'));
  } catch {
    return { done: {} };
  }
}
function saveProgress(prog) {
  fs.writeFileSync(PROGRESS, JSON.stringify(prog));
}

(async () => {
  if (RESTORE) {
    const backup = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
    console.log('restoring', backup.length, 'descriptions...');
    for (const b of backup) {
      await p.product.update({ where: { id: b.id }, data: { description: b.before } });
    }
    console.log('✓ restored');
    return;
  }

  const targets = await p.product.findMany({
    where: { OR: [{ demandRank: { not: null } }, { isBestSeller: true }] },
    select: {
      id: true, name: true, description: true,
      category: { select: { name: true } },
    },
    orderBy: [{ demandRank: { sort: 'asc', nulls: 'last' } }, { soldCount: 'desc' }],
  });
  console.log('targets:', targets.length);

  const prog = loadProgress();
  const todo = targets.filter((t) => !prog.done[t.id]);
  console.log('remaining:', todo.length, '(already done:', Object.keys(prog.done).length, ')');

  // backup ALL targets once (before/after pairs appended as processed)
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
        const results = await rewriteBatch(batch);
        const map = new Map(results.map((r) => [r.i, r.d]));
        for (const [idx, it] of batch.entries()) {
          const nd = map.get(idx);
          if (!nd) continue;
          // safety: strip any markdown the model might sneak in
          const clean = nd.replace(/\*\*/g, '').replace(/^["'«]|["'»]$/g, '').trim();
          if (clean.length < 50) continue;
          await p.product.update({ where: { id: it.id }, data: { description: clean } });
          prog.done[it.id] = 1;
          if (!backup.find((b) => b.id === it.id)) {
            backup.push({ id: it.id, name: it.name, before: it.description, after: clean });
          }
          done++;
        }
        saveProgress(prog);
        fs.writeFileSync(BACKUP, JSON.stringify(backup));
        console.log(`worker${wid}: batch ok — total ${done}/${todo.length}`);
      } catch (e) {
        console.log(`worker${wid}: batch FAILED — ${(e.message || '').slice(0, 80)}`);
      }
    }
  }

  await Promise.all([worker(1), worker(2)]);
  console.log(`\nDONE: ${done} rewritten this run. Progress file: scripts/rewrite-kuwaiti-progress.json`);
  await p.$disconnect();
})();
