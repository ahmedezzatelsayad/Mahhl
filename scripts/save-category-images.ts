/**
 * Save category images into SiteSetting "site_identity".categoryImages
 * (merges with existing identity, never overwrites other fields)
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';

const db = new PrismaClient();

const MAP: Record<string, string> = {
  'cat-4': 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/740274ebcf9e.jpg', // الصحة والجمال
  'cat-9': 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/440435571298.jpg', // الرياضة
};

// fill from the fetched .url files
const files: Record<string, string> = {
  'cat-6': '/tmp/catimg/cat-6.url',
  'cat-2': '/tmp/catimg/cat-2.url',
  'cat-7': '/tmp/catimg/cat-7.url',
  'cat-13': '/tmp/catimg/cat-13.url',
  'cat-5': '/tmp/catimg/cat-5.url',
  'cat-1': '/tmp/catimg/cat-1.url',
  'cat-14': '/tmp/catimg/cat-14.url',
  'cat-8': '/tmp/catimg/cat-8.url',
  'cat-10': '/tmp/catimg/cat-10.url',
  'cat-11': '/tmp/catimg/cat-11.url',
};
for (const [slug, path] of Object.entries(files)) {
  if (existsSync(path)) {
    const url = readFileSync(path, 'utf-8').trim();
    if (url.startsWith('http')) MAP[slug] = url;
  }
}

async function main() {
  const existing = await db.siteSetting.findUnique({ where: { key: 'site_identity' } });
  const current = (existing?.value as Record<string, unknown>) || {};
  const identity = {
    siteName: 'محل شوب',
    tagline: 'متجرك الكويتي الذكي',
    announcement: 'توصيل لجميع محافظات الكويت — دفع عند الاستلام',
    whatsapp: '66046358',
    logo: (current.logo as string) || '',
    favicon: (current.favicon as string) || '',
    categoryImages: MAP,
  };
  await db.siteSetting.upsert({
    where: { key: 'site_identity' },
    update: { value: identity as any },
    create: { key: 'site_identity', value: identity as any },
  });
  console.log(`Saved ${Object.keys(MAP).length} category images:`);
  for (const [slug, url] of Object.entries(MAP)) console.log(`  ${slug} → ${url}`);
}

main().finally(() => db.$disconnect());
