'use client';

/**
 * SearchBox — search input with live autocomplete (products + categories),
 * recent-search history, and full keyboard navigation.
 *
 * Global best practice: site-search users convert up to 6.4x more
 * (Salesforce); autocomplete with product thumbnails funnels shoppers
 * straight to the product page in one tap.
 */

import { useT } from '@/lib/i18n';
import { Search, Clock, X, TrendingUp, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/stores/app-store';
import { trackFB } from '@/lib/facebook-pixel';
import { trackGA4 } from '@/lib/ga4';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';

interface SuggestProduct {
  slug: string;
  name: string;
  salePrice: number;
  originalPrice: number | null;
  thumb: string | null;
  isBestSeller: boolean;
}
interface SuggestCategory {
  name: string;
  slug: string;
}
interface SuggestData {
  products: SuggestProduct[];
  categories: SuggestCategory[];
}

const RECENT_KEY = 'mahhl_recent_searches';
const MAX_RECENT = 5;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}
function saveRecent(q: string) {
  try {
    const list = [q, ...loadRecent().filter((x) => x !== q)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* private mode */
  }
}

function fmtPrice(n: number, lang: 'ar' | 'en') {
  return `${n.toFixed(n % 1 === 0 ? 0 : 3)} ${lang === 'en' ? 'KWD' : 'د.ك'}`;
}

// popular starting points when the box is focused but empty
const DEFAULT_TERMS = ['ساعة', 'عطر', 'سماعة', 'لعبة', 'خلاط', 'شاحن'];
const DEFAULT_TERMS_EN = ['watch', 'perfume', 'earbuds', 'toy', 'blender', 'charger'];

export function SearchBox({
  autoFocusOnMount = false,
  onNavigate,
}: {
  autoFocusOnMount?: boolean;
  onNavigate?: () => void;
}) {
  const { t, lang } = useT();
  const setSearch = useAppStore((s) => s.setSearch);
  const openProduct = useAppStore((s) => s.openProduct);
  const openCategory = useAppStore((s) => s.openCategory);

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SuggestData>({ products: [], categories: [] });
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState(-1); // keyboard highlight index

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // localStorage is client-only — load history after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecent(loadRecent());
    if (autoFocusOnMount) inputRef.current?.focus();
  }, [autoFocusOnMount]);

  // close on outside click / Escape
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const fetchSuggest = useCallback((term: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    fetch(`/api/search/suggest?q=${encodeURIComponent(term)}&lang=${lang}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: SuggestData) => {
        setData({ products: d.products || [], categories: d.categories || [] });
        setLoading(false);
      })
      .catch(() => {
        if (ctrl.signal.reason !== 'abort') setLoading(false);
      });
  }, [lang]);

  function onChange(v: string) {
    setQ(v);
    setActive(-1);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 2) {
      setData({ products: [], categories: [] });
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggest(v.trim()), 220);
  }

  function commitSearch(term: string) {
    const t = term.trim();
    if (!t) return;
    saveRecent(t);
    setRecent(loadRecent());
    setOpen(false);
    trackFB('Search', { search_string: t });
    trackGA4('search', { search_term: t });
    setSearch(t);
    onNavigate?.();
  }

  function goProduct(slug: string) {
    setOpen(false);
    openProduct(slug);
    onNavigate?.();
  }

  function goCategory(slug: string, name: string) {
    const id = useAppStore.getState().categoryMap[slug];
    if (id) {
      setOpen(false);
      openCategory(id, slug);
      onNavigate?.();
    } else {
      // no id mapped yet — fall back to searching the category name
      commitSearch(name);
    }
  }

  // flattened list of actionable rows for keyboard nav
  const rows: Array<
    | { type: 'product'; p: SuggestProduct }
    | { type: 'category'; c: SuggestCategory }
  > = [
    ...data.categories.map((c) => ({ type: 'category' as const, c })),
    ...data.products.map((p) => ({ type: 'product' as const, p })),
  ];

  function onKeydown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || rows.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % rows.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + rows.length) % rows.length);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      const row = rows[active];
      if (row.type === 'product') goProduct(row.p.slug);
      else goCategory(row.c.slug, row.c.name);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (active >= 0 && rows[active]) {
      const row = rows[active];
      if (row.type === 'product') return goProduct(row.p.slug);
      return goCategory(row.c.slug, row.c.name);
    }
    if (q.trim()) commitSearch(q);
  }

  const showRecent = q.trim().length < 2;
  const hasResults = !showRecent && (rows.length > 0 || !loading);
  const emptyResult = !showRecent && !loading && rows.length === 0;

  return (
    <div ref={rootRef} className="relative w-full">
      <form onSubmit={submit}>
        <div className="relative">
          <Input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            placeholder={t('hdr.searchPh')}
            value={q}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeydown}
            className="w-full pl-10 bg-white text-foreground border-input"
          />
          <button
            type="submit"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent cursor-pointer"
            aria-label={t('sb.searchAria')}
          >
            <Search className="h-4 w-4" />
          </button>
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ('');
                setData({ products: [], categories: [] });
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label={t('sb.clear')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {open && (showRecent || hasResults) && (
        <div
          className="absolute top-full mt-1.5 w-full z-50 rounded-xl border bg-white shadow-xl overflow-hidden text-right"
          role="listbox"
        >
          {/* recent / popular terms */}
          {showRecent && (
            <div className="py-1.5">
              {recent.length > 0 && (
                <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {t('sb.recent')}
                </p>
              )}
              {recent.map((t) => (
                <button
                  key={`r-${t}`}
                  type="button"
                  onClick={() => {
                    setQ(t);
                    onChange(t);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/70 text-right cursor-pointer"
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{t}</span>
                  <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground/60" />
                </button>
              ))}
              <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> {t('sb.popular')}
              </p>
              <div className="flex flex-wrap gap-1.5 px-3 pb-2.5 pt-1">
                {(lang === 'en' ? DEFAULT_TERMS_EN : DEFAULT_TERMS).map((term) => (
                  <button
                    key={`p-${term}`}
                    type="button"
                    onClick={() => {
                      setQ(term);
                      onChange(term);
                    }}
                    className="rounded-full border bg-muted/50 px-3 py-1 text-xs hover:bg-muted cursor-pointer"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* live suggestions */}
          {!showRecent && (
            <div className="max-h-[65vh] overflow-y-auto py-1.5">
              {loading && rows.length === 0 && (
                <p className="px-3 py-3 text-sm text-muted-foreground">{t('sb.searching')}</p>
              )}
              {emptyResult && (
                <p className="px-3 py-3 text-sm text-muted-foreground">
                  {t('sb.noResultsFor', { q })}
                </p>
              )}
              {rows.map((row, i) =>
                row.type === 'category' ? (
                  <button
                    key={`c-${row.c.slug}`}
                    type="button"
                    onClick={() => goCategory(row.c.slug, row.c.name)}
                    onMouseEnter={() => setActive(i)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-right cursor-pointer ${
                      active === i ? 'bg-muted' : 'hover:bg-muted/70'
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                      {t('sb.categories')}
                    </span>
                    <span className="flex-1 truncate text-sm font-medium">
                      {row.c.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{t('sb.browseCat')}</span>
                  </button>
                ) : (
                  <button
                    key={`p-${row.p.slug}`}
                    type="button"
                    onClick={() => goProduct(row.p.slug)}
                    onMouseEnter={() => setActive(i)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-right cursor-pointer ${
                      active === i ? 'bg-muted' : 'hover:bg-muted/70'
                    }`}
                    role="option"
                    aria-selected={active === i}
                  >
                    {row.p.thumb ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={row.p.thumb}
                        alt=""
                        className="h-9 w-9 rounded-lg object-cover border bg-muted/40 shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <span className="h-9 w-9 rounded-lg bg-muted/60 shrink-0" />
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-sm font-medium">{row.p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.p.isBestSeller && (
                          <span className="text-gold-deep font-semibold">{t('sb.bestseller')} · </span>
                        )}
                        {fmtPrice(row.p.salePrice, lang)}
                      </span>
                    </span>
                    <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  </button>
                )
              )}
              {!showRecent && q.trim().length >= 2 && (
                <button
                  type="button"
                  onClick={() => commitSearch(q)}
                  className="w-full border-t px-3 py-2.5 text-sm font-semibold text-primary hover:bg-muted/60 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Search className="h-3.5 w-3.5" />
                  {t('sb.allResultsFor', { q: q.trim() })}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
