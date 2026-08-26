'use client';

/**
 * ProductPicker — debounced product search used across the slider dashboard:
 * pick a product to (a) write its AI copy, (b) use its photo, (c) link a CTA.
 */

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

export interface PickedProduct {
  id: string;
  slug: string;
  name: string;
  salePrice: number;
  price: number;
  thumb: string | null;
  images?: string | null;
  categoryName?: string | null;
}

export function firstImageOf(p: { thumb: string | null; images?: string | null }): string | null {
  if (p.thumb) return p.thumb;
  if (p.images) {
    const first = p.images.split(',')[0]?.trim();
    if (first) return first;
  }
  return null;
}

export function ProductPicker({
  onPick,
  placeholder = 'ابحث عن منتج بالاسم…',
  value,
  onClear,
}: {
  onPick: (p: PickedProduct) => void;
  placeholder?: string;
  /** currently selected product name (display chip) */
  value?: string | null;
  onClear?: () => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PickedProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) return; // a product is already selected — hide search until cleared
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/products?search=${encodeURIComponent(q.trim())}&limit=8`
        );
        const data = await res.json();
        setResults(
          (data.items || []).map((p: Record<string, unknown>) => ({
            id: String(p.id),
            slug: String(p.slug),
            name: String(p.name),
            salePrice: Number(p.salePrice ?? 0),
            price: Number(p.price ?? 0),
            thumb: (p.thumb as string) || null,
            images: (p.images as string) || null,
            categoryName:
              p.category && typeof p.category === 'object'
                ? String((p.category as Record<string, unknown>).name || '')
                : null,
          }))
        );
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q, value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
        <span className="text-sm font-semibold truncate">📦 {value}</span>
        <button
          type="button"
          onClick={() => {
            onClear?.();
            setQ('');
            setResults([]);
          }}
          className="text-muted-foreground hover:text-destructive"
          aria-label="إزالة المنتج"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder}
          className="pr-9"
        />
      </div>
      {open && (loading || results.length > 0) && (
        <div className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border bg-popover shadow-lg">
          {loading && <p className="p-3 text-sm text-muted-foreground">جاري البحث…</p>}
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onPick(p);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 p-2 text-right hover:bg-accent transition-colors"
            >
              {firstImageOf(p) ? (
                 
                <img
                  src={firstImageOf(p) as string}
                  alt=""
                  className="h-10 w-10 rounded object-cover border"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs font-bold">
                  {p.name.charAt(0)}
                </div>
              )}
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold truncate">{p.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {p.salePrice} د.ك
                  {p.price > p.salePrice ? ` · بدل ${p.price}` : ''}
                  {p.categoryName ? ` · ${p.categoryName}` : ''}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
