import * as fs from 'fs'
const env = fs.readFileSync('/home/z/my-project/.env','utf8')
const url = env.split('\n').find(l=>l.startsWith('NEON_DATABASE_URL='))!.slice(18).trim()
process.env.DATABASE_URL = url
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

const EN = [
  {
    eyebrowEn: '🔥 Most wanted in Kuwait — #1',
    titleEn: 'Smart sunglasses',
    highlightEn: 'with built-in Bluetooth',
    subtitleEn: 'Take the road with you: music and calls without earbuds — a charge lasts your whole day. Order now for 8 KWD instead of 9.5.',
    chipsEn: ['Cash on delivery', 'FREE shipping over 30 KWD', 'Ordered 939+ times'],
    ctaLabelEn: 'Order now — 8 KWD',
    cta2LabelEn: 'See all most-wanted',
  },
  {
    eyebrowEn: '🔥 Most wanted in Kuwait — #2',
    titleEn: '3-in-1 blender & juicer',
    highlightEn: 'your complete kitchen machine',
    subtitleEn: 'Juice, blend and grind — one capable device at an unbeatable price. Cut your kitchen work in half and save 3 KWD today.',
    chipsEn: ['7-day replacement', 'Delivery to all governorates', 'Best seller'],
    ctaLabelEn: 'Order now — 14 KWD',
    cta2LabelEn: 'Shop kitchen appliances',
  },
  {
    eyebrowEn: '🔥 Most wanted in Kuwait — #3',
    titleEn: 'CYXG Q71 earbuds',
    highlightEn: 'wireless with digital charging case',
    subtitleEn: 'Clear sound and lasting battery — the case recharges them on the go. Over 1,400 customers ordered before you… don’t miss out.',
    chipsEn: ['Cash on delivery', '2–5 day delivery', 'Ordered 1,465+ times'],
    ctaLabelEn: 'Order now — 8 KWD',
    cta2LabelEn: 'All products',
  },
]

async function main() {
  const row = await p.siteSetting.findUnique({ where: { key: 'hero_slider' } })
  if (!row) { console.log('no slider setting'); process.exit(1) }
  const data = row.value as any
  let filled = 0
  data.slides = data.slides.map((s: any, i: number) => {
    const en = EN[i]
    if (!en) return s
    // idempotent: only fill what is missing — never overwrite founder edits
    const needs = !s.titleEn || !s.subtitleEn || (s.cta && !s.cta.labelEn)
    if (!needs) return s
    filled++
    return {
      ...s,
      eyebrowEn: s.eyebrowEn || en.eyebrowEn,
      titleEn: s.titleEn || en.titleEn,
      highlightEn: s.highlightEn || en.highlightEn,
      subtitleEn: s.subtitleEn || en.subtitleEn,
      chipsEn: s.chipsEn || en.chipsEn,
      cta: s.cta ? { ...s.cta, labelEn: s.cta.labelEn || en.ctaLabelEn } : s.cta,
      ctaSecondary: s.ctaSecondary ? { ...s.ctaSecondary, labelEn: s.ctaSecondary.labelEn || en.cta2LabelEn } : s.ctaSecondary,
    }
  })
  console.log('filled', filled, 'of', data.slides.length, 'slides')
  await p.siteSetting.update({ where: { key: 'hero_slider' }, data: { value: data } })
  console.log('saved')
  await p.$disconnect()
}
main().catch(e => { console.error(e.message); process.exit(1) })
