'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { formatKwd } from '@/lib/utils/format';
import { Search, Save, AlertTriangle, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  salePrice: number;
  quantity: number;
  trackStock: boolean;
  isBestSeller: boolean;
  thumb: string | null;
  category: { name: string } | null;
}

export function AdminInventoryView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, number>>({});

  // Stats
  const stats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter((p) => p.quantity > 10).length;
    const lowStock = products.filter((p) => p.quantity > 0 && p.quantity <= 10).length;
    const outOfStock = products.filter((p) => p.quantity === 0).length;
    return { total, inStock, lowStock, outOfStock };
  }, [products]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: '25',
    });
    if (search) params.set('search', search);
    fetch(`/api/admin/products?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.items || []);
        setTotalPages(data.pagination?.pages || 1);
      })
      .finally(() => setLoading(false));
  }, [search, page]);

  async function updateQuantity(id: string, qty: number) {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty }),
      });
      if (res.ok) {
        setProducts((ps) =>
          ps.map((p) => (p.id === id ? { ...p, quantity: qty } : p))
        );
        toast.success('تم تحديث الكمية');
      }
    } catch {
      toast.error('فشل التحديث');
    }
  }

  async function toggleTrackStock(id: string, value: boolean) {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackStock: value }),
      });
      if (res.ok) {
        setProducts((ps) =>
          ps.map((p) => (p.id === id ? { ...p, trackStock: value } : p))
        );
      }
    } catch {}
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">إدارة المخزون</h1>
        <p className="text-sm text-muted-foreground">تحكم في كميات المنتجات</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">المنتجات المعروضة</p>
          <p className="text-xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">متوفر</p>
          <p className="text-xl font-bold text-green-600">{stats.inStock}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">مخزون منخفض</p>
          <p className="text-xl font-bold text-orange-600">{stats.lowStock}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">نفذ المخزون</p>
          <p className="text-xl font-bold text-red-600">{stats.outOfStock}</p>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ابحث عن منتج..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pr-10"
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="text-right p-3 font-medium">المنتج</th>
                <th className="text-right p-3 font-medium">الحالة</th>
                <th className="text-center p-3 font-medium">الكمية</th>
                <th className="text-center p-3 font-medium hidden sm:table-cell">تتبع المخزون</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    جاري التحميل...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    لا توجد منتجات
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const editingQty = editing[p.id] ?? p.quantity;
                  const status =
                    p.quantity === 0
                      ? 'out'
                      : p.quantity <= 10
                        ? 'low'
                        : 'in';
                  return (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 flex-shrink-0 bg-muted/30 rounded-md overflow-hidden">
                            {p.thumb && (
                               
                              <img
                                src={p.thumb}
                                alt={p.name}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium line-clamp-1">{p.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            status === 'in'
                              ? 'secondary'
                              : status === 'low'
                                ? 'outline'
                                : 'destructive'
                          }
                          className={
                            status === 'in'
                              ? 'bg-green-100 text-green-800'
                              : status === 'low'
                                ? 'bg-orange-100 text-orange-800'
                                : ''
                          }
                        >
                          {status === 'in'
                            ? 'متوفر'
                            : status === 'low'
                              ? 'منخفض'
                              : 'نفذ'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <Input
                            type="number"
                            value={editingQty}
                            onChange={(e) =>
                              setEditing((prev) => ({
                                ...prev,
                                [p.id]: parseInt(e.target.value) || 0,
                              }))
                            }
                            className="w-20 text-center"
                            min={0}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => updateQuantity(p.id, editingQty)}
                            title="حفظ"
                          >
                            <Save className="h-4 w-4 text-green-600" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-3 text-center hidden sm:table-cell">
                        <Switch
                          checked={p.trackStock}
                          onCheckedChange={(v) => toggleTrackStock(p.id, v)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            السابق
          </Button>
          <span className="px-3 py-1 text-sm">
            صفحة {page} من {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  );
}
