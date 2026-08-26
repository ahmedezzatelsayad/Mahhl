/**
 * Seed script - imports all 2638 products from EasyOrder Excel + categories + best sellers
 */
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const db = new PrismaClient();

function slugify(text: string): string {
  if (!text) return '';
  if (/^[a-zA-Z0-9\-]+$/.test(text)) return text.toLowerCase();
  return text
    .replace(/[^\w\s\-]/g, '')
    .replace(/[\s\-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);
}

async function main() {
  const xlsxPath = '/home/z/my-project/download/ecomerg_easyorder_import.xlsx';
  const workbook = XLSX.readFile(xlsxPath, { cellDates: false });

  // -------- Parse Products sheet --------
  const productsSheet = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets['Products']);
  console.log(`Loaded ${productsSheet.length} products from Products sheet`);

  // -------- Parse Categories sheet --------
  const categoriesSheet = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets['Categories']);
  console.log(`Loaded ${categoriesSheet.length} categories`);

  // -------- Parse Best Sellers sheet --------
  const bestSellersSheet = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets['Best Sellers']);
  console.log(`Loaded ${bestSellersSheet.length} best sellers`);
  const bestSellerSkus = new Set(bestSellersSheet.map(r => r.code).filter(Boolean));

  // -------- Insert Categories first --------
  // First pass: parents (rows where is_subcategory = No)
  const parents = categoriesSheet.filter(r => String(r.is_subcategory).toLowerCase() === 'no');
  const subs = categoriesSheet.filter(r => String(r.is_subcategory).toLowerCase() === 'yes');

  // Reset DB
  console.log('Cleaning existing data...');
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.customer.deleteMany();
  await db.adminUser.deleteMany();

  const categoryMap = new Map<string, string>(); // name -> id

  console.log('Inserting parent categories...');
  let parentIdx = 0;
  for (const c of parents) {
    const name = String(c.name || '').trim();
    if (!name) continue;
    const slug = slugify(name) || `cat-${c.category_id || parentIdx}`;
    const id = `parent-${parentIdx++}`;
    try {
      const created = await db.category.create({
        data: {
          id,
          name,
          slug,
          isSub: false,
        },
      });
      categoryMap.set(name, created.id);
    } catch (e: any) {
      if (e.code !== 'P2002') throw e;
      // duplicate slug - append random
      const created = await db.category.create({
        data: {
          id: `${id}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
          isSub: false,
        },
      });
      categoryMap.set(name, created.id);
    }
  }

  console.log('Inserting sub-categories...');
  let subIdx = 0;
  for (const c of subs) {
    const name = String(c.name || '').trim();
    if (!name) continue;
    const slug = slugify(name) || `subcat-${c.category_id || subIdx}`;
    const id = `sub-${subIdx++}`;
    // Attach to first parent as fallback
    const parentIds = Object.values(categoryMap);
    const parentId = parentIds.length > 0 ? (parentIds[0] as string) : null;
    try {
      await db.category.create({
        data: {
          id,
          name,
          slug,
          isSub: true,
          parentId,
        },
      });
      categoryMap.set(name, id);
    } catch (e: any) {
      if (e.code !== 'P2002') throw e;
      const newId = `${id}-${Math.random().toString(36).slice(2, 6)}`;
      const created = await db.category.create({
        data: {
          id: newId,
          name,
          slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
          isSub: true,
          parentId,
        },
      });
      categoryMap.set(name, newId);
    }
  }

  // -------- Insert Products --------
  console.log('Inserting products...');
  let inserted = 0;
  const BATCH = 100;
  for (let i = 0; i < productsSheet.length; i += BATCH) {
    const batch = productsSheet.slice(i, i + BATCH);
    await Promise.all(batch.map(async (p) => {
      const slug = String(p.slug || `product-${i}`).trim();
      const name = String(p.name || '').trim();
      const sku = String(p.sku || slug).trim();
      if (!name) return;

      // Parse categories - look up by name, fallback to creating parent cat
      let categoryId: string | null = null;
      const catStr = String(p.categories || '').trim();
      if (catStr) {
        const parts = catStr.split(',').map(s => s.trim()).filter(Boolean);
        for (const part of parts) {
          if (categoryMap.has(part)) {
            categoryId = categoryMap.get(part)!;
            break;
          }
        }
        if (!categoryId && parts.length > 0) {
          // Create missing parent category
          const newSlug = slugify(parts[0]) || `cat-${Math.random().toString(36).slice(2, 8)}`;
          try {
            const created = await db.category.create({
              data: { name: parts[0], slug: newSlug, isSub: false },
            });
            categoryMap.set(parts[0], created.id);
            categoryId = created.id;
          } catch (e) {
            // slug collision - skip
          }
        }
      }

      // Parse variations into JSON
      const variations: any[] = [];
      for (let v = 1; v <= 6; v++) {
        const vStr = String(p[`variation${v}`] || '').trim();
        if (!vStr) continue;
        // Format: "اللون(color): أسود=#000000, أبيض=#FFFFFF" or "المقاس(dropdown): S, M, L"
        const colonIdx = vStr.indexOf(':');
        if (colonIdx === -1) continue;
        const labelPart = vStr.substring(0, colonIdx).trim();
        const valuesPart = vStr.substring(colonIdx + 1).trim();
        // Extract type from parentheses
        const typeMatch = labelPart.match(/\(([^)]+)\)/);
        const type = typeMatch ? typeMatch[1] : 'dropdown';
        const label = labelPart.replace(/\([^)]+\)/, '').trim();
        const values = valuesPart.split(',').map(v => v.trim()).filter(Boolean);
        variations.push({ label, type, values });
      }

      // Parse images
      const thumb = String(p.thumb || '').trim();
      const imagesStr = String(p.images || '').trim();
      const images = imagesStr ? imagesStr.split(',').map(s => s.trim()).filter(Boolean) : [];

      // Prices
      const price = parseFloat(p.price) || 0;
      const salePrice = parseFloat(p.sale_price) || 0;
      const quantity = parseInt(p.quantity as string) || 20;
      const trackStock = p.track_stock === true || p.track_stock === 'true' || p.track_stock === 'TRUE';
      const disableOOS = p.disable_orders_for_no_stock === true || p.disable_orders_for_no_stock === 'true';

      try {
        await db.product.create({
          data: {
            slug,
            name,
            sku,
            description: String(p.description || '').trim(),
            metaDescription: String(p.meta_description || '').trim() || null,
            price,
            salePrice,
            quantity,
            trackStock,
            disableOOS,
            thumb: thumb || (images[0] || null),
            images: images.join(','),
            categoryId,
            isBestSeller: bestSellerSkus.has(sku),
            variations: variations.length > 0 ? JSON.stringify(variations) : null,
            originalPrice: price,
          },
        });
        inserted++;
      } catch (e: any) {
        // console.error('Failed to insert product', slug, e.message);
      }
    }));
    if ((i + BATCH) % 500 === 0 || i + BATCH >= productsSheet.length) {
      console.log(`  progress: ${Math.min(i + BATCH, productsSheet.length)}/${productsSheet.length} (inserted ${inserted})`);
    }
  }

  // -------- Create default admin --------
  console.log('Creating default admin user (admin/admin123)...');
  await db.adminUser.create({
    data: {
      username: 'admin',
      passwordHash: 'admin123', // plain text for demo
      name: 'مدير المتجر',
    },
  });

  // -------- Final stats --------
  const totalProducts = await db.product.count();
  const totalCategories = await db.category.count();
  const totalBestSellers = await db.product.count({ where: { isBestSeller: true } });
  console.log('\n=== Seed Complete ===');
  console.log(`Products: ${totalProducts}`);
  console.log(`Categories: ${totalCategories}`);
  console.log(`Best Sellers: ${totalBestSellers}`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await db.$disconnect();
    process.exit(1);
  });
