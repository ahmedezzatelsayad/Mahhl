'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { ProductCard } from '@/components/store/product-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, SlidersHorizontal, X, Lock } from 'lucide-react';
import { formatKwd } from '@/lib/utils/format';
import { useT } from '@/lib/i18n';
import { readLang } from '@/lib/stores/lang-store';

interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice: number;
  thumb: string | null;
  images: string;
  quantity: number;
  isBestSeller: boolean;
  category: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

/** registration-gate contract returned by /api/products */
interface CatalogInfo {
  unlocked: boolean;
  locked: boolean;
  publicLimit: number;
  fullCatalog: number;
}

export function ShopView() {
  const { t } = useT();
  const lang = readLang();
  const {
    selectedCategoryId,
    searchQuery,
    priceMin,
    priceMax,
    filterBestSeller,
    openCategory,
    setSearch,
    setPriceFilter,
    toggleBestSellerFilter,
    resetFilters,
    setCategoryMap,
    affiliateToken,
    customerToken,
    setView,
  } = useAppStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [catalog, setCatalog] = useState<CatalogInfo | null>(null);
  const [sort, setSort] = useState('newest');
  const [perPage, setPerPage] = useState(24); // Amazon-grade standard: 24/48/72
  const [showFilters, setShowFilters] = useState(false);

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(perPage),
      sort,
    });
    if (readLang() === 'en') params.set('lang', 'en');
    if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
    if (searchQuery) params.set('search', searchQuery);
    if (filterBestSeller) params.set('bestSeller', 'true');
    if (priceMin !== null) params.set('minPrice', String(priceMin));
    if (priceMax !== null) params.set('maxPrice', String(priceMax));
    return params.toString();
  }, [page, perPage, sort, selectedCategoryId, searchQuery, filterBestSeller, priceMin, priceMax]);

  // logged-in (marketer or buyer) → auth header unlocks the full catalog
  const authHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    if (affiliateToken) h.Authorization = `Bearer ${affiliateToken}`;
    else if (customerToken) h.Authorization = `Bearer ${customerToken}`;
    return h;
  }, [affiliateToken, customerToken]);

  // Load categories once
  useEffect(() => {
    fetch(`/api/categories${lang === 'en' ? '?lang=en' : ''}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
          setCategoryMap(data); // slug->id map for back/forward navigation
        }
      })
      .catch(() => {});
  }, [setCategoryMap]);

  // Load products when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/products?${queryParams}`, { headers: authHeaders })
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.items || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.pages || 1);
        setCatalog(data.catalog || null);
      })
      .catch(() => {
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [queryParams, authHeaders]);

  // Reset page when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [selectedCategoryId, searchQuery, filterBestSeller, priceMin, priceMax, sort, perPage]);

  const slugOfCategory = (id: string | null) =>
    id ? categories.find((c) => c.id === id)?.slug ?? null : null;

  const locked = !!catalog?.locked;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* ===== registration gate banner (زائر يشوف التوب 200 فقط) ===== */}
      {locked && (
        <div className="mb-5 rounded-xl border-2 border-accent/40 bg-accent/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="font-extrabold text-sm sm:text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-gold-deep shrink-0" />
              {lang === 'en'
                ? `You're viewing the TOP ${catalog?.publicLimit ?? 200} products from every section 🔥`
                : `تشوف الآن أفضل ${catalog?.publicLimit ?? 200} منتج — التوب من كل الأقسام 🔥`}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {lang === 'en'
                ? `The full catalog (${(catalog?.fullCatalog ?? 2600).toLocaleString()}+ products) unlocks right after your FREE registration.`
                : `الكتالوج الكامل (${(catalog?.fullCatalog ?? 2600).toLocaleString()}+ منتج) يفتح لك مباشرة بعد التسجيل المجاني.`}
            </p>
          </div>
          <button
            onClick={() => setView('affiliate-login')}
            className="btn-gold rounded-lg px-5 py-2.5 text-sm font-extrabold shrink-0 cursor-pointer hover:scale-[1.02] transition-transform"
          >
            {lang === 'en' ? 'Register free — unlock all' : 'سجّل مجاناً وافتح الكل 🔓'}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">
            {searchQuery
              ? `${t('shop.results')}: "${searchQuery}"`
              : selectedCategoryId
                ? categories.find((c) => c.id === selectedCategoryId)?.name ||
                  t('shop.byCategory')
                : t('shop.all')}
          </h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString()} {t('shop.products')}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4 ml-2" />
            {t('shop.filter')}
          </Button>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('shop.sort')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t('shop.sort.newest')}</SelectItem>
              <SelectItem value="price-asc">{t('shop.sort.priceAsc')}</SelectItem>
              <SelectItem value="price-desc">{t('shop.sort.priceDesc')}</SelectItem>
              <SelectItem value="name-asc">{t('shop.sort.name')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <FilterPanel
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={(id) => openCategory(id, slugOfCategory(id))}
            searchQuery={searchQuery}
            onSearchChange={setSearch}
            priceMin={priceMin}
            priceMax={priceMax}
            onPriceChange={setPriceFilter}
            filterBestSeller={filterBestSeller}
            onToggleBestSeller={toggleBestSellerFilter}
            onReset={resetFilters}
          />
        </aside>

        {/* Mobile filters drawer */}
        {showFilters && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setShowFilters(false)}>
            <div
              className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-background p-4 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">{t('shop.filters')}</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <FilterPanel
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onCategoryChange={(id) => {
                  openCategory(id, slugOfCategory(id));
                  setShowFilters(false);
                }}
                searchQuery={searchQuery}
                onSearchChange={setSearch}
                priceMin={priceMin}
                priceMax={priceMax}
                onPriceChange={setPriceFilter}
                filterBestSeller={filterBestSeller}
                onToggleBestSeller={toggleBestSellerFilter}
                onReset={resetFilters}
              />
            </div>
          </div>
        )}

        {/* Products grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground mb-4">{t('shop.noMatch')}</p>
              <Button onClick={resetFilters}>{t('shop.reset')}</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8 gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    {t('shop.prev')}
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                    if (p > totalPages) return null;
                    return (
                      <Button
                        key={p}
                        variant={p === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    {t('shop.next')}
                  </Button>
                </div>
              )}

              {/* locked-catalog card after the grid — only on the unfiltered
                  "all products" browse (الفلترة النشطة تجيب نتائج داخل الـ200
                  فالرقم "الباقي" ما ينطبق عليها) */}
              {locked && !searchQuery && !selectedCategoryId && !filterBestSeller && priceMin === null && priceMax === null && (
                <div className="mt-8 rounded-2xl border bg-card p-6 text-center">
                  <p className="text-2xl mb-1">🔒</p>
                  <p className="font-extrabold">
                    {lang === 'en'
                      ? `${Math.max(0, (catalog?.fullCatalog ?? 2600) - total).toLocaleString()} more products are waiting for you`
                      : `باقي ${Math.max(0, (catalog?.fullCatalog ?? 2600) - total).toLocaleString()} منتج محتاجينك`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    {lang === 'en'
                      ? 'Register free as a marketer (or a buyer) and the whole catalog opens instantly — with commission and pricing study on every product.'
                      : 'سجّل مجاناً كمسوّق (أو مشتري) وينفتح لك الكتالوج كامل فوراً — مع العمولة ودراسة التسويق على كل منتج.'}
                  </p>
                  <button
                    onClick={() => setView('affiliate-login')}
                    className="btn-gold rounded-lg px-6 py-2.5 text-sm font-extrabold mt-4 cursor-pointer hover:scale-[1.02] transition-transform"
                  >
                    {lang === 'en' ? 'Free registration — open the catalog' : 'التسجيل المجاني — افتح الكتالوج'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface FilterPanelProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onCategoryChange: (id: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  priceMin: number | null;
  priceMax: number | null;
  onPriceChange: (min: number | null, max: number | null) => void;
  filterBestSeller: boolean;
  onToggleBestSeller: () => void;
  onReset: () => void;
}

function FilterPanel({
  categories,
  selectedCategoryId,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  priceMin,
  priceMax,
  onPriceChange,
  filterBestSeller,
  onToggleBestSeller,
  onReset,
}: FilterPanelProps) {
  const { t } = useT();
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearchChange(localSearch);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{t('shop.filters')}</h3>
        <Button variant="ghost" size="sm" onClick={onReset}>
          {t('shop.clearAll')}
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="space-y-2">
        <Label>{t('shop.searchLabel')}</Label>
        <div className="flex gap-2">
          <Input
            placeholder={t('shop.searchPh')}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
          <Button type="submit" size="icon">
            {t('shop.searchBtn')}
          </Button>
        </div>
      </form>

      {/* Categories */}
      <div>
        <Label className="mb-2 block">{t('shop.categories')}</Label>
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          <button
            className={`w-full text-right px-3 py-2 text-sm rounded-md transition-colors ${
              !selectedCategoryId
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent'
            }`}
            onClick={() => onCategoryChange(null)}
          >
            {t('shop.allCategories')}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`w-full text-right px-3 py-2 text-sm rounded-md transition-colors ${
                selectedCategoryId === c.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              }`}
              onClick={() => onCategoryChange(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Best Seller filter */}
      <div className="flex items-center space-x-2 space-x-reverse">
        <Checkbox
          id="bestseller"
          checked={filterBestSeller}
          onCheckedChange={onToggleBestSeller}
        />
        <Label htmlFor="bestseller" className="cursor-pointer">
          {t('shop.bestsellerOnly')}
        </Label>
      </div>

      {/* Price range */}
      <div>
        <Label className="mb-2 block">{t('shop.priceRange')}</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={t('shop.minPrice')}
              value={priceMin ?? ''}
              onChange={(e) =>
                onPriceChange(
                  e.target.value ? parseFloat(e.target.value) : null,
                  priceMax
                )
              }
              className="w-full"
            />
            <Input
              type="number"
              placeholder={t('shop.maxPrice')}
              value={priceMax ?? ''}
              onChange={(e) =>
                onPriceChange(
                  priceMin,
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              className="w-full"
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {priceMin !== null && formatKwd(priceMin)}
            {priceMin !== null && priceMax !== null && ' - '}
            {priceMax !== null && formatKwd(priceMax)}
          </p>
        </div>
      </div>
    </div>
  );
}
