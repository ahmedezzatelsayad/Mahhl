/**
 * migrate-sqlite-to-neon.ts
 *
 * Reads data from the existing SQLite DB (db/custom.db) and inserts it
 * into the Neon PostgreSQL DB via Prisma. Also seeds the founder admin
 * account (ahmedezzatelsayad@gmail.com / Ahmed2050A@).
 */
import 'dotenv/config';
import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import path from 'node:path';

// Force the env to the Neon URL (in case shell preset overrides .env)
const NEON_URL =
  process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')
    ? process.env.DATABASE_URL
    : 'postgresql://neondb_owner:npg_9ozjdwE8rAqc@ep-bitter-base-axq48ptq-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
process.env.DATABASE_URL = NEON_URL;

const SQLITE_PATH = path.resolve(process.cwd(), 'db/custom.db');

const prisma = new PrismaClient();

type SqliteCategory = {
  id: string;
  name: string;
  parentId: string | null;
  slug: string;
  isSub: number;
  createdAt: string;
  updatedAt: string;
};

type SqliteProduct = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  description: string;
  metaDescription: string | null;
  price: number;
  salePrice: number;
  quantity: number;
  trackStock: number;
  disableOOS: number;
  thumb: string | null;
  images: string;
  categoryId: string | null;
  isBestSeller: number;
  variations: string | null;
  supplier: string | null;
  originalPrice: number | null;
  createdAt: string;
  updatedAt: string;
};

function bool(n: number) {
  return !!n;
}

function parseDate(value: string | null | undefined): Date {
  if (!value) return new Date();
  // SQLite stores ISO strings via Prisma
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

async function main() {
  console.log('→ Opening SQLite at', SQLITE_PATH);
  const sqlite = new Database(SQLITE_PATH, { readonly: true });

  // ---- 1. Categories ----
  const categories = sqlite
    .prepare(
      `SELECT id, name, parentId, slug, isSub, createdAt, updatedAt FROM Category`
    )
    .all() as SqliteCategory[];

  console.log(`  Categories: ${categories.length}`);
  // insert without parent first, then update parent references
  for (const c of categories) {
    await prisma.category.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        isSub: bool(c.isSub),
        parentId: c.parentId ?? null,
        createdAt: parseDate(c.createdAt),
        updatedAt: parseDate(c.updatedAt),
      },
      update: {
        name: c.name,
        slug: c.slug,
        isSub: bool(c.isSub),
        parentId: c.parentId ?? null,
        updatedAt: parseDate(c.updatedAt),
      },
    });
  }

  // ---- 2. Products ----
  const products = sqlite
    .prepare(
      `SELECT id, slug, name, sku, description, metaDescription, price, salePrice, quantity,
              trackStock, disableOOS, thumb, images, categoryId, isBestSeller, variations,
              supplier, originalPrice, createdAt, updatedAt FROM Product`
    )
    .all() as SqliteProduct[];

  console.log(`  Products: ${products.length}`);
  // Batch insert in chunks of 100 using createMany with skipDuplicates
  const BATCH = 100;
  let prodInserted = 0;
  let prodFailed = 0;
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    try {
      const r = await prisma.product.createMany({
        data: batch.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          sku: p.sku,
          description: p.description ?? '',
          metaDescription: p.metaDescription ?? null,
          price: p.price ?? 0,
          salePrice: p.salePrice ?? p.price ?? 0,
          quantity: p.quantity ?? 20,
          trackStock: bool(p.trackStock),
          disableOOS: bool(p.disableOOS),
          thumb: p.thumb ?? null,
          images: p.images ?? '',
          categoryId: p.categoryId ?? null,
          isBestSeller: bool(p.isBestSeller),
          variations: p.variations ?? null,
          supplier: p.supplier ?? null,
          originalPrice: p.originalPrice ?? null,
          createdAt: parseDate(p.createdAt),
          updatedAt: parseDate(p.updatedAt),
        })),
        skipDuplicates: true,
      });
      prodInserted += r.count;
      if (i % 500 === 0) console.log(`    ✓ batch ${i}/${products.length} (inserted ${prodInserted})`);
    } catch (e: any) {
      prodFailed += batch.length;
      console.error(`    ! Batch ${i} failed:`, e.message);
    }
  }
  console.log(`    ✓ inserted ${prodInserted}, failed ${prodFailed}`);

  // ---- 3. Founder account ----
  const founderEmail = process.env.FOUNDER_EMAIL || 'ahmedezzatelsayad@gmail.com';
  const founderPassword = process.env.FOUNDER_PASSWORD || 'Ahmed2050A@';
  const hash = await bcrypt.hash(founderPassword, 10);
  await prisma.adminUser.upsert({
    where: { email: founderEmail },
    create: {
      email: founderEmail,
      passwordHash: hash,
      name: 'Founder',
      role: 'owner',
    },
    update: {
      passwordHash: hash,
      name: 'Founder',
      role: 'owner',
    },
  });
  console.log(`  ✓ Seeded founder: ${founderEmail}`);

  sqlite.close();
}

main()
  .then(() => prisma.$disconnect())
  .then(() => {
    console.log('✓ Migration complete');
    process.exit(0);
  })
  .catch((e) => {
    console.error('✗ Migration failed:', e);
    prisma.$disconnect().finally(() => process.exit(1));
  });
