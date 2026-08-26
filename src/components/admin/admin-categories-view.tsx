'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Tag, Folder } from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  slug: string;
  isSub: boolean;
  parentId: string | null;
  _count?: { products: number };
  children?: Category[];
}

export function AdminCategoriesView() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [parentId, setParentId] = useState('');

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, parentId: parentId || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setCategories((cs) => [...cs, data]);
        setNewName('');
        toast.success('تمت إضافة الفئة');
      } else {
        toast.error(data.error || 'فشل الإضافة');
      }
    } catch {
      toast.error('فشل الاتصال');
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">الفئات</h1>
        <p className="text-sm text-muted-foreground">{categories.length} فئة</p>
      </div>

      <Card className="p-4">
        <form onSubmit={handleAdd} className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-48">
            <Label className="mb-1 block">اسم الفئة الجديدة</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="مثال: إلكترونيات"
              required
            />
          </div>
          <div className="flex-1 min-w-48">
            <Label className="mb-1 block">الفئة الأم (اختياري)</Label>
            <select
              className="w-full px-3 py-2 border rounded-md bg-background"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">— فئة رئيسية —</option>
              {categories.filter((c) => !c.isSub).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">
            <Plus className="h-4 w-4 ml-1" />
            إضافة
          </Button>
        </form>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((c) => (
            <Card key={c.id} className="p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                {c.isSub ? <Tag className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{c.slug}</p>
              </div>
              <Badge variant="secondary">
                {c._count?.products || 0} منتج
              </Badge>
              <Badge variant={c.isSub ? 'outline' : 'secondary'}>
                {c.isSub ? 'فرعية' : 'رئيسية'}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
