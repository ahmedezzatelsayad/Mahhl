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
import { Loader2, SlidersHorizontal, X } from 'lucide-react';
import { formatKwd } from '@/lib/utils/format';

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

export function ShopView() {
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
  } = useAppStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: '24',
      sort,
    });
    if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
    if (searchQuery) params.set('search', searchQuery);
    if (filterBestSeller) params.set('bestSeller', 'true');
    if (priceMin !== null) params.set('minPrice', String(priceMin));
    if (priceMax !== null) params.set('maxPrice', String(priceMax));
    return params.toString();
  }, [page, sort, selectedCategoryId, searchQuery, filterBestSeller, priceMin, priceMax]);

  // Load categories once
  useEffect(() => {
    fetch('/api/categories')
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
    fetch(`/api/products?${queryParams}`)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.items || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.pages || 1);
      })
      .catch(() => {
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [queryParams]);

  // Reset page when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [selectedCategoryId, searchQuery, filterBestSeller, priceMin, priceMax, sort]);

  const slugOfCategory = (id: string | null) =>
    id ? categories.find((c) => c.id === id)?.slug ?? null : null;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">
            {searchQuery
              ? `نتائج البحث عن: "${searchQuery}"`
              : selectedCategoryId
                ? categories.find((c) => c.id === selectedCategoryId)?.name ||
                  'تسوق حسب الفئة'
                : 'كل المنتجات'}
          </h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString()} منتج</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4 ml-2" />
            فلتر
          </Button>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="ترتيب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">الأحدث</SelectItem>
              <SelectItem value="price-asc">السعر: تصاعدي</SelectItem>
              <SelectItem value="price-desc">السعر: تنازلي</SelectItem>
              <SelectItem value="name-asc">الاسم</SelectItem>
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
                <h3 className="font-bold">الفلاتر</h3>
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
              <p className="text-muted-foreground mb-4">لا توجد منتجات مطابقة</p>
              <Button onClick={resetFilters}>إعادة ضبط الفلاتر</Button>
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
                    السابق
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
                    التالي
                  </Button>
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
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearchChange(localSearch);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">الفلاتر</h3>
        <Button variant="ghost" size="sm" onClick={onReset}>
          مسح الكل
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="space-y-2">
        <Label>البحث</Label>
        <div className="flex gap-2">
          <Input
            placeholder="اسم المنتج..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
          <Button type="submit" size="icon">
            ابحث
          </Button>
        </div>
      </form>

      {/* Categories */}
      <div>
        <Label className="mb-2 block">الفئات</Label>
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          <button
            className={`w-full text-right px-3 py-2 text-sm rounded-md transition-colors ${
              !selectedCategoryId
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent'
            }`}
            onClick={() => onCategoryChange(null)}
          >
            كل الفئات
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
          الأكثر مبيعاً فقط
        </Label>
      </div>

      {/* Price range */}
      <div>
        <Label className="mb-2 block">نطاق السعر</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="أقل سعر"
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
              placeholder="أعلى سعر"
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
