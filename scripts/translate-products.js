/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * AI backfill: English names + descriptions for all products (categories done).
 * Resumable, 429-aware (waits 15-30s), concurrency 2, batch 12.
 * Usage: node scripts/translate-products.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const ZAI_MOD = import('z-ai-web-dev-sdk');
let zaiP = null;
async function zai() {
  if (!zaiP) {
    const ZAI = (await ZAI_MOD).default;
    zaiP = ZAI.create();
  }
  return zaiP;
}

async function translateBatch(items) {
  const client = await zai();
  const payload = items.map((it, idx) => ({ i: idx, n: it.name.slice(0, 200), d: (it.description || '').slice(0, 600) }));
  let lastErr = null;
  for (let a = 0; a < 5; a++) {
    try {
      const completion = await Promise.race([
        client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content:
              'You are a professional e-commerce translator for a Kuwaiti online store. Translate Arabic product data to concise, natural, saleable English (Amazon listing style). Keep brand names/model codes as-is. If the source is already English, polish it slightly. NEVER invent facts.',
          },
          {
            role: 'user',
            content:
              'Translate each product to English. Return STRICT JSON only: [{"i":0,"n":"english name","d":"english description"}]. Source JSON:\n' +
              JSON.stringify(payload),
          },
        ],
        thinking: { type: 'disabled' },
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT-60s')), 60000)),
      ]);
      const raw = completion.choices[0]?.message?.content || '[]';
      const m = raw.match(/\[[\s\S]*\]/);
      return JSON.parse(m ? m[0] : '[]');
    } catch (e) {
      lastErr = e;
      const is429 = /429|Too many/i.test(e.message || '');
      const wait = is429 ? 15000 + Math.random() * 15000 : 3000;
      console.log(`retry in ${Math.round(wait / 1000)}s (${(e.message || '').slice(0, 60)})`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr || new Error('translate failed');
}

(async () => {
  const t0 = Date.now();
  const products = await p.product.findMany({
    where: { nameEn: null },
    select: { id: true, name: true, description: true },
    orderBy: { id: 'asc' },
  });
  console.log('products to translate:', products.length);

  const BATCH = 12;
  const batches = [];
  for (let i = 0; i < products.length; i += BATCH) batches.push(products.slice(i, i + BATCH));
  console.log('batches:', batches.length);

  let done = 0, failed = 0;
  const queue = [...batches];
  const pending = [];

  async function flush() {
    while (pending.length) {
      const take = pending.splice(0, 200);
      if (!take.length) break;
      const values = take.map((r) => `('${r.id}', '${r.n}', '${r.d}')`).join(',');
      try {
        await p.$executeRawUnsafe(
          `UPDATE "Product" p SET "nameEn" = v.n, "descriptionEn" = v.d FROM (VALUES ${values}) AS v(id, n, d) WHERE p.id = v.id`
        );
      } catch (e) {
        console.error('flush failed:', (e.message || '').slice(0, 120));
      }
    }
  }

  async function worker(wid) {
    console.log(`w${wid} started`);
    while (queue.length) {
      const batch = queue.shift();
      if (!batch) return;
      console.log(`w${wid} batch of ${batch.length}…`);
      try {
        const arr = await translateBatch(batch);
        console.log(`w${wid} got ${arr.length} rows`);
        const rows = [];
        for (const r of arr) {
          const src = batch[r.i];
          if (!src || typeof r.n !== 'string') continue;
          rows.push({
            id: src.id,
            n: r.n.replace(/'/g, "''").slice(0, 250),
            d: typeof r.d === 'string' ? r.d.replace(/'/g, "''").slice(0, 1200) : '',
          });
        }
        pending.push(...rows);
        await flush(); // flush immediately — process may die between batches
      } catch (e) {
        failed += batch.length;
        console.error(`w${wid} batch failed:`, (e.message || '').slice(0, 80));
      }
      done++;
      console.log(`progress: ${done}/${batches.length}`);
    }
  }

  await Promise.all([worker(1), worker(2)]);
  await flush();
  const remaining = await p.product.count({ where: { nameEn: null } });
  console.log(`DONE in ${Math.round((Date.now() - t0) / 1000)}s — failed: ${failed}, remaining: ${remaining}`);
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
