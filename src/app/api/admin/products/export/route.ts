import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/admin/products/export — CSV export of all products.
 * Columns: SKU, Name, Category, Price, SalePrice, Stock, BestSeller, Active
 */
function csvEscape(v: unknown): string {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  return requirePermission(req, 'products', 'view', async () => {
    const products = await db.product.findMany({
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const header = [
      'SKU',
      'Name',
      'Category',
      'Price',
      'SalePrice',
      'Stock',
      'BestSeller',
      'Thumb',
    ];
    const rows = products.map((p) =>
      [
        p.sku,
        p.name,
        p.category?.name || '',
        p.price,
        p.salePrice,
        p.quantity,
        p.isBestSeller ? '1' : '0',
        p.thumb || '',
      ]
        .map(csvEscape)
        .join(',')
    );

    // BOM so Excel renders Arabic correctly
    const csv = '\uFEFF' + header.join(',') + '\n' + rows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="mahal-shop-products-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  });
}

export const dynamic = 'force-dynamic';
