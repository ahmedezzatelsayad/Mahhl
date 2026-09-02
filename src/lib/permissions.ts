/**
 * permissions.ts — single source of truth for the staff permission system.
 * PURE module (no db / no server imports) so BOTH client components and
 * server API routes can import it safely.
 *
 * Model:  Role x Module -> Access ('none' | 'view' | 'manage')
 * The API layer ENFORCES the same matrix via requirePermission() in auth.ts —
 * the client-side gating is UX only, the server is the real wall.
 */

export const ROLES = ['owner', 'admin', 'manager', 'support', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const MODULES = [
  'dashboard',
  'orders',
  'products',
  'inventory',
  'categories',
  'reviews',
  'reports',
  'top100',
  'insights',
  'seo',
  'slider',
  'landing',
  'facebook',
  'settings',
  'staff',
  'affiliates',
  'commissions',
  'withdrawals',
] as const;
export type Module = (typeof MODULES)[number];

export type Access = 'none' | 'view' | 'manage';

/** Arabic labels for UI. */
export const ROLE_LABELS_AR: Record<Role, string> = {
  owner: 'المالك',
  admin: 'مدير عام',
  manager: 'مدير عمليات',
  support: 'دعم العملاء',
  viewer: 'مشاهد',
};

export const MODULE_LABELS_AR: Record<Module, string> = {
  dashboard: 'الرئيسية',
  orders: 'الطلبات',
  products: 'المنتجات',
  inventory: 'المخزون',
  categories: 'الفئات',
  reviews: 'التقييمات',
  reports: 'التقارير',
  top100: 'الأكثر طلباً',
  insights: 'محرك الذكاء',
  seo: 'SEO والبحث',
  slider: 'السلايدر',
  landing: 'صفحات الهبوط',
  facebook: 'التتبع والتحليلات',
  settings: 'الإعدادات',
  staff: 'المستخدمون والصلاحيات',
  affiliates: 'المسوقون',
  commissions: 'العمولات والمحاسبة',
  withdrawals: 'طلبات السحب',
};

export const ACCESS_LABELS_AR: Record<Access, string> = {
  none: '—',
  view: 'عرض',
  manage: 'إدارة',
};

/**
 * The permission matrix.
 * owner    : everything (only role that can manage staff)
 * admin    : everything except staff management
 * manager  : operations (orders/products/inventory/categories/reviews + read reports)
 * support  : customer service (orders + reviews + read reports)
 * viewer   : read-only storefront/back-office data, no integrations
 */
export const ROLE_MATRIX: Record<Role, Record<Module, Access>> = {
  owner: {
    dashboard: 'manage', orders: 'manage', products: 'manage', inventory: 'manage',
    categories: 'manage', reviews: 'manage', reports: 'manage', top100: 'manage',
    insights: 'manage', seo: 'manage', slider: 'manage', landing: 'manage',
    facebook: 'manage', settings: 'manage', staff: 'manage',
    affiliates: 'manage', commissions: 'manage', withdrawals: 'manage',
  },
  admin: {
    dashboard: 'manage', orders: 'manage', products: 'manage', inventory: 'manage',
    categories: 'manage', reviews: 'manage', reports: 'manage', top100: 'manage',
    insights: 'manage', seo: 'manage', slider: 'manage', landing: 'manage',
    facebook: 'manage', settings: 'manage', staff: 'none',
    affiliates: 'manage', commissions: 'manage', withdrawals: 'manage',
  },
  manager: {
    dashboard: 'manage', orders: 'manage', products: 'manage', inventory: 'manage',
    categories: 'manage', reviews: 'manage', reports: 'view', top100: 'view',
    insights: 'view', seo: 'none', slider: 'view', landing: 'none',
    facebook: 'none', settings: 'none', staff: 'none',
    affiliates: 'view', commissions: 'view', withdrawals: 'manage',
  },
  support: {
    dashboard: 'view', orders: 'manage', products: 'none', inventory: 'none',
    categories: 'none', reviews: 'manage', reports: 'view', top100: 'view',
    insights: 'none', seo: 'none', slider: 'none', landing: 'none',
    facebook: 'none', settings: 'none', staff: 'none',
    affiliates: 'view', commissions: 'view', withdrawals: 'view',
  },
  viewer: {
    dashboard: 'view', orders: 'view', products: 'view', inventory: 'view',
    categories: 'view', reviews: 'view', reports: 'view', top100: 'view',
    insights: 'view', seo: 'view', slider: 'view', landing: 'view',
    facebook: 'none', settings: 'none', staff: 'none',
    affiliates: 'view', commissions: 'view', withdrawals: 'view',
  },
};

/** Normalize any stored role value (handles legacy "staff", unknown -> viewer). */
export function normalizeRole(raw: unknown): Role {
  if (raw === 'staff') return 'viewer'; // legacy value from the old schema
  return (ROLES as readonly string[]).includes(String(raw)) ? (raw as Role) : 'viewer';
}

const LEVEL_ORDER: Record<Access, number> = { none: 0, view: 1, manage: 2 };

/** Does `role` have at least `level` access to `module`? */
export function can(role: unknown, module: Module, level: Exclude<Access, 'none'> = 'view'): boolean {
  const r = normalizeRole(role);
  const have = ROLE_MATRIX[r][module];
  return LEVEL_ORDER[have] >= LEVEL_ORDER[level];
}

/** Map an admin view name -> its module (admin views only). */
export const VIEW_MODULE: Record<string, Module> = {
  'admin-dashboard': 'dashboard',
  'admin-reports': 'reports',
  'admin-landing': 'landing',
  'admin-slider': 'slider',
  'admin-reviews': 'reviews',
  'admin-seo': 'seo',
  'admin-products': 'products',
  'admin-add-product': 'products',
  'admin-edit-product': 'products',
  'admin-top100': 'top100',
  'admin-inventory': 'inventory',
  'admin-orders': 'orders',
  'admin-categories': 'categories',
  'admin-insights': 'insights',
  'admin-facebook': 'facebook',
  'admin-settings': 'settings',
  'admin-staff': 'staff',
  'admin-affiliates': 'affiliates',
  'admin-commissions': 'commissions',
  'admin-withdrawals': 'withdrawals',
};

/**
 * May `role` open this admin view?
 * Plain data views need "view"; write screens (add/edit product) need "manage".
 */
export function canAccessView(role: unknown, view: string): boolean {
  const m = VIEW_MODULE[view];
  if (!m) return false;
  const level: Exclude<Access, 'none'> =
    view === 'admin-add-product' || view === 'admin-edit-product' ? 'manage' : 'view';
  return can(role, m, level);
}

/** First admin view this role may open — used for post-login redirect. */
export function firstPermittedAdminView(role: unknown): string {
  const r = normalizeRole(role);
  for (const m of MODULES) {
    if (ROLE_MATRIX[r][m] !== 'none') {
      const view = Object.keys(VIEW_MODULE).find((v) => VIEW_MODULE[v] === m);
      if (view) return view;
    }
  }
  return 'admin-dashboard';
}

/** Sidebar/panel helper: all modules the role can at least view. */
export function permittedModules(role: unknown): Module[] {
  const r = normalizeRole(role);
  return MODULES.filter((m) => ROLE_MATRIX[r][m] !== 'none');
}
