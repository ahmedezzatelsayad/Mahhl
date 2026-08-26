import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // body: { customer, items[], shipping, total, paymentMethod, ... }
    const items = body.items || [];
    if (!items.length) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // 1. Create or find customer by phone (phone is not unique-constrained — use findFirst)
    let customer = await db.customer.findFirst({
      where: { phone: body.phone || '' },
    });
    if (!customer) {
      customer = await db.customer.create({
        data: {
          name: body.customerName || 'عميل',
          phone: body.phone || '',
          email: body.email || null,
          city: body.city || null,
          address: body.address || null,
        },
      });
    }

    // 2. Generate order number
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    // 3. Calculate subtotal from items
    const subtotal = items.reduce(
      (sum: number, i: any) => sum + i.price * i.quantity,
      0
    );
    const shipping = parseFloat(body.shipping || '0');
    const total = subtotal + shipping;

    // 4. Create order
    const order = await db.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        subtotal,
        shipping,
        total,
        status: 'pending',
        paymentMethod: body.paymentMethod || 'cod',
        notes: body.notes || null,
        governorate: body.governorate || null,
        area: body.area || null,
        address: body.address || null,
        phone: body.phone || null,
        customerName: body.customerName || customer.name,
        items: {
          create: items.map((i: any) => ({
            productId: i.productId,
            name: i.name,
            sku: i.sku,
            price: i.price,
            quantity: i.quantity,
            image: i.image || null,
            variations: i.variations || null,
          })),
        },
      },
      include: { items: true, customer: true },
    });

    // 5. Decrement stock for each product (if trackStock)
    for (const i of items) {
      try {
        const product = await db.product.findUnique({ where: { id: i.productId } });
        if (product && product.trackStock) {
          await db.product.update({
            where: { id: i.productId },
            data: { quantity: Math.max(0, product.quantity - i.quantity) },
          });
        }
      } catch (e) {
        // ignore
      }
    }

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (e: any) {
    console.error('Order creation failed:', e);
    return NextResponse.json(
      { error: e.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const orders = await db.order.findMany({
    include: {
      items: true,
      customer: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json(orders);
}
