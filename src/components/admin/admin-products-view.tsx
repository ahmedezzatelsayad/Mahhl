'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatKwd } from '@/lib/utils/format';
import { Edit, Trash2, Search, Plus, Download, Loader2, ImagePlus, ArrowRight } from 'lucide-react';
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

interface CategoryOption {
  id: string;
  name: string;
}

export function useAdminAuth() {
  const adminToken = useAppStore((s) => s.adminToken);
  return {
    Authorization: `Bearer ${adminToken || ''}`,
  };
}

export function AdminProductsView() {
  const setView = useAppStore((s) => s.setView);
  const setEditProduct = useAppStore((s) => s.setEditProduct);
  const auth = useAdminAuth();
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
    fetch(`/api/admin/products?${params}`, { headers: auth })
      .then((r) => r.json())
      .then((data) => {
        if (data.items) {
          setProducts(data.items);
          setTotalPages(data.pagination?.pages || 1);
          setTotal(data.pagination?.total || 0);
        } else if (data.error === 'Unauthorized') {
          toast.error('انتهت جلستك — سجل دخول مرة ثانية');
          setView('admin-login');
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`هل أنت متأكد من حذف المنتج "${name}"؟`)) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: auth,
      });
      const data = await res.json();
      if (res.ok) {
        setProducts((p) => p.filter((x) => x.id !== id));
        toast.success(data.message || 'تم حذف المنتج');
      } else {
        toast.error(data.error || 'فشل الحذف');
      }
    } catch {
      toast.error('فشل الاتصال');
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/products/export', {
        headers: auth,
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
          <Button className="btn-gold border-0" onClick={() => setView('admin-add-product')}>
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
          className="pr-10 bg-white"
        />
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
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
                        <div className="w-10 h-10 flex-shrink-0 bg-white rounded-md overflow-hidden border">
                          {p.thumb && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={p.thumb}
                              alt={p.name}
                              className="h-full w-full img-contain p-0.5"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium line-clamp-1">{p.name}</p>
                          {p.isBestSeller && (
                            <Badge className="bg-yellow-500 text-xs mt-1 border-0">
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
                      {p.price > p.salePrice && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatKwd(p.price)}
                        </span>
                      )}
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
                          onClick={() => {
                            setEditProduct(p.id);
                            setView('admin-edit-product');
                          }}
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

/* ============================================================
   Product form — REAL add & edit (replaces the old placeholder)
   ============================================================ */

export function AdminAddProductView() {
  return <ProductForm mode="add" />;
}

export function AdminEditProductView() {
  return <ProductForm mode="edit" />;
}

function ProductForm({ mode }: { mode: 'add' | 'edit' }) {
  const setView = useAppStore((s) => s.setView);
  const editProductId = useAppStore((s) => s.editProductId);
  const auth = useAdminAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(mode === 'edit');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');

  const [form, setForm] = useState({
    name: '',
    sku: '',
    price: '',
    salePrice: '',
    quantity: '20',
    categoryId: '',
    description: '',
    isBestSeller: false,
    trackStock: false,
  });

  // categories (all — including empty, admin view)
  useEffect(() => {
    fetch('/api/categories?all=1')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setCategories(data))
      .catch(() => {});
  }, []);

  // load product for edit
  useEffect(() => {
    if (mode !== 'edit' || !editProductId) return;
    fetch(`/api/admin/products/${editProductId}`, { headers: auth })
      .then((r) => r.json())
      .then((data) => {
        if (data.product) {
          const p = data.product;
          setForm({
            name: p.name || '',
            sku: p.sku || '',
            price: String(p.price ?? ''),
            salePrice: String(p.salePrice ?? ''),
            quantity: String(p.quantity ?? 20),
            categoryId: p.categoryId || '',
            description: p.description || '',
            isBestSeller: !!p.isBestSeller,
            trackStock: !!p.trackStock,
          });
          const imgs = (p.images || '')
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          setImages(imgs.length ? imgs : p.thumb ? [p.thumb] : []);
        } else {
          toast.error('المنتج غير موجود');
          setView('admin-products');
        }
      })
      .finally(() => setLoadingProduct(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, editProductId]);

  // file upload → base64 data URL
  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files)
      .slice(0, 6 - images.length)
      .forEach((file) => {
        if (file.size > 1.5 * 1024 * 1024) {
          toast.error(`${file.name} أكبر من 1.5MB`);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          setImages((prev) => (prev.includes(String(reader.result)) ? prev : [...prev, String(reader.result)]));
        };
        reader.readAsDataURL(file);
      });
    e.target.value = '';
  }

  function addImageUrl() {
    const u = imageUrl.trim();
    if (!u) return;
    setImages((prev) => [...prev, u]);
    setImageUrl('');
  }

  const priceNum = parseFloat(form.price) || 0;
  const saleNum = parseFloat(form.salePrice) || 0;
  const discount =
    priceNum > 0 && saleNum > 0 && priceNum > saleNum
      ? Math.round(((priceNum - saleNum) / priceNum) * 100)
      : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('اكتب اسم المنتج');
    const price = parseFloat(form.price);
    const salePrice = form.salePrice ? parseFloat(form.salePrice) : price;
    if (isNaN(price) || price <= 0) return toast.error('اكتب سعراً صحيحاً');

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        price,
        salePrice,
        quantity: parseInt(form.quantity) || 0,
        categoryId: form.categoryId || null,
        description: form.description,
        isBestSeller: form.isBestSeller,
        trackStock: form.trackStock,
        thumb: images[0] || null,
        images: images.join(','),
      };

      const res = await fetch(
        mode === 'add' ? '/api/admin/products' : `/api/admin/products/${editProductId}`,
        {
          method: mode === 'add' ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json', ...auth },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (res.ok) {
        toast.success(mode === 'add' ? `تمت إضافة "${payload.name}" للمتجر ✅` : 'تم حفظ التعديلات ✅');
        setView('admin-products');
      } else {
        toast.error(data.error || 'فشل الحفظ');
      }
    } catch {
      toast.error('فشل الاتصال');
    } finally {
      setSaving(false);
    }
  }

  if (loadingProduct) {
    return (
      <div className="p-6 max-w-3xl space-y-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <button
        onClick={() => setView('admin-products')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 cursor-pointer"
      >
        <ArrowRight className="h-4 w-4" />
        رجوع للمنتجات
      </button>
      <h1 className="text-2xl font-bold mb-5">
        {mode === 'add' ? 'إضافة منتج جديد' : 'تعديل المنتج'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="p-5 space-y-4">
          <h2 className="font-bold text-sm">المعلومات الأساسية</h2>
          <div>
            <Label className="mb-1 block">اسم المنتج <span className="text-destructive">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="مثال: ساعة يد رجالية كلاسيك"
              className="bg-white"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block">SKU (اختياري — يتولد تلقائياً)</Label>
              <Input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="SKU-XXXX"
                dir="ltr"
                className="bg-white"
              />
            </div>
            <div>
              <Label className="mb-1 block">الفئة</Label>
              <Select
                value={form.categoryId || 'none'}
                onValueChange={(v) => setForm({ ...form, categoryId: v === 'none' ? '' : v })}
              >
                <SelectTrigger className="bg-white w-full">
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون فئة</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="mb-1 block">وصف المنتج</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="اكتب وصفاً واضحاً يظهر للعميل وفي نتائج البحث..."
              rows={4}
              className="bg-white"
            />
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-bold text-sm">السعر والمخزون (د.ك)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="mb-1 block">السعر الأصلي <span className="text-destructive">*</span></Label>
              <Input
                type="number" step="0.001" min="0" required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="10.000"
                dir="ltr"
                className="bg-white"
              />
            </div>
            <div>
              <Label className="mb-1 block">سعر البيع</Label>
              <Input
                type="number" step="0.001" min="0"
                value={form.salePrice}
                onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                placeholder="8.500 (اتركه فاضي = نفس الأصلي)"
                dir="ltr"
                className="bg-white"
              />
            </div>
            <div>
              <Label className="mb-1 block">الكمية</Label>
              <Input
                type="number" min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                dir="ltr"
                className="bg-white"
              />
            </div>
          </div>
          {discount > 0 && (
            <Badge className="bg-red-600 text-white border-0 w-fit">
              خصم {discount}% — يظهر على بطاقة المنتج
            </Badge>
          )}
          <div className="flex flex-wrap gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={form.isBestSeller}
                onCheckedChange={(v) => setForm({ ...form, isBestSeller: v })}
              />
              <span className="text-sm">الأكثر مبيعاً</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={form.trackStock}
                onCheckedChange={(v) => setForm({ ...form, trackStock: v })}
              />
              <span className="text-sm">تتبع المخزون (ينقص مع كل طلب)</span>
            </label>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-bold text-sm">الصور</h2>
          <p className="text-xs text-muted-foreground">
            ارفع صور من جهازك أو الصق رابط صورة — الصورة الأولى تكون الرئيسية
          </p>
          <div className="flex flex-wrap gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative group w-24 h-24 rounded-lg border overflow-hidden bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`صورة ${i + 1}`} className="h-full w-full img-contain p-1" />
                <button
                  type="button"
                  onClick={() => setImages(images.filter((_, j) => j !== i))}
                  className="absolute top-1 left-1 bg-red-600 text-white rounded-full h-6 w-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  aria-label="حذف الصورة"
                >
                  ✕
                </button>
                {i === 0 && (
                  <span className="absolute bottom-0 inset-x-0 bg-primary text-primary-foreground text-[10px] text-center py-0.5">
                    الرئيسية
                  </span>
                )}
              </div>
            ))}
            {images.length < 6 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-24 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-accent hover:text-accent transition-colors cursor-pointer"
              >
                <ImagePlus className="h-6 w-6" />
                <span className="text-[11px] mt-1">إضافة</span>
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
          <div className="flex gap-2">
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://... رابط صورة"
              dir="ltr"
              className="bg-white"
            />
            <Button type="button" variant="outline" onClick={addImageUrl}>
              إضافة رابط
            </Button>
          </div>
        </Card>

        <div className="flex justify-end gap-2 pb-6">
          <Button type="button" variant="outline" onClick={() => setView('admin-products')}>
            إلغاء
          </Button>
          <Button type="submit" className="btn-gold border-0 min-w-32" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" /> جاري الحفظ...
              </>
            ) : mode === 'add' ? (
              'إضافة المنتج'
            ) : (
              'حفظ التعديلات'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
