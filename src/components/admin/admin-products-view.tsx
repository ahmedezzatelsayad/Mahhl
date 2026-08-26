'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatKwd } from '@/lib/utils/format';
import { Edit, Trash2, Search, Plus, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  salePrice: number;
  quantity: number;
  thumb: string | null;
  isBestSeller: boolean;
  category: { name: string } | null;
}

export function AdminProductsView() {
  const setView = useAppStore((s) => s.setView);
  const adminToken = useAppStore((s) => s.adminToken);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: '20',
    });
    if (search) params.set('search', search);
    fetch(`/api/admin/products?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.items || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotal(data.pagination?.total || 0);
      })
      .finally(() => setLoading(false));
  }, [search, page]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`هل أنت متأكد من حذف المنتج "${name}"؟`)) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts((p) => p.filter((x) => x.id !== id));
        toast.success('تم حذف المنتج');
      } else {
        toast.error('فشل الحذف');
      }
    } catch (e) {
      toast.error('فشل الاتصال');
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/products/export', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error('export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mahal-shop-products-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`تم تصدير ${total.toLocaleString()} منتج بصيغة CSV`);
    } catch {
      toast.error('فشل تصدير المنتجات');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">إدارة المنتجات</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} منتج في المتجر
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 ml-2" />
            {exporting ? 'جاري التصدير...' : 'تصدير CSV'}
          </Button>
          <Button onClick={() => setView('admin-add-product')}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة منتج
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ابحث بالاسم أو SKU..."
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
                <th className="text-right p-3 font-medium hidden md:table-cell">SKU</th>
                <th className="text-right p-3 font-medium">السعر</th>
                <th className="text-right p-3 font-medium">الكمية</th>
                <th className="text-right p-3 font-medium hidden sm:table-cell">الفئة</th>
                <th className="text-center p-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="p-3">
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    لا توجد منتجات
                  </td>
                </tr>
              ) : (
                products.map((p) => (
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
                          {p.isBestSeller && (
                            <Badge className="bg-yellow-500 text-xs mt-1">
                              الأكثر مبيعاً
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs hidden md:table-cell">{p.sku}</td>
                    <td className="p-3">
                      <div>
                        <span className="font-bold text-primary">
                          {formatKwd(p.salePrice)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground line-through">
                        {formatKwd(p.price)}
                      </span>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={p.quantity > 10 ? 'secondary' : p.quantity > 0 ? 'outline' : 'destructive'}
                      >
                        {p.quantity}
                      </Badge>
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {p.category?.name || '—'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setView('admin-edit-product')}
                          title="تعديل"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(p.id, p.name)}
                          className="text-destructive"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
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

export function AdminAddProductView() {
  return <ProductForm title="إضافة منتج جديد" />;
}

export function AdminEditProductView() {
  return <ProductForm title="تعديل المنتج" />;
}

function ProductForm({ title }: { title: string }) {
  const setView = useAppStore((s) => s.setView);
  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-5">{title}</h1>
      <Card className="p-6">
        <p className="text-center text-muted-foreground py-8">
          نموذج إضافة المنتج - يمكن تطويره لاحقاً
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setView('admin-products')}>
            إلغاء
          </Button>
          <Button onClick={() => setView('admin-products')}>حفظ</Button>
        </div>
      </Card>
    </div>
  );
}
