import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

export async function GET(req: NextRequest) {
  return requirePermission(req, 'dashboard', 'view', async () => {
  const [
    totalProducts,
    totalOrders,
    totalCustomers,
    totalCategories,
    pendingOrders,
    confirmedOrders,
    lowStockProducts,
    bestSellersCount,
    revenue,
    recentOrders,
  ] = await Promise.all([
    db.product.count(),
    db.order.count(),
    db.customer.count(),
    db.category.count(),
    db.order.count({ where: { status: 'pending' } }),
    db.order.count({ where: { status: 'confirmed' } }),
    db.product.count({ where: { quantity: { lt: 10 } } }),
    db.product.count({ where: { isBestSeller: true } }),
    db.order.aggregate({ _sum: { total: true } }),
    db.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { customer: true, items: true },
    }),
  ]);

  return NextResponse.json({
    totalProducts,
    totalOrders,
    totalCustomers,
    totalCategories,
    pendingOrders,
    confirmedOrders,
    lowStockProducts,
    bestSellersCount,
    totalRevenue: revenue._sum.total || 0,
    recentOrders,
  });
  });
}
