'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { Header } from '@/components/store/header';
import { Footer } from '@/components/store/footer';
import { CartDrawer } from '@/components/store/cart-drawer';
import { HomeView } from '@/components/store/home-view';
import { ShopView } from '@/components/store/shop-view';
import { ProductView } from '@/components/store/product-view';
import { CartView } from '@/components/store/cart-view';
import { CheckoutView, OrderSuccessView } from '@/components/store/checkout-view';
import { AdminLoginView } from '@/components/admin/admin-login-view';
import { AdminSidebar, AdminMobileNav } from '@/components/admin/admin-sidebar';
import { AdminDashboardView } from '@/components/admin/admin-dashboard-view';
import { AdminProductsView, AdminAddProductView, AdminEditProductView } from '@/components/admin/admin-products-view';
import { AdminInventoryView } from '@/components/admin/admin-inventory-view';
import { AdminOrdersView } from '@/components/admin/admin-orders-view';
import { AdminCategoriesView } from '@/components/admin/admin-categories-view';
import { AdminInsightsView } from '@/components/admin/admin-insights-view';

export default function Home() {
  const view = useAppStore((s) => s.view);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const setView = useAppStore((s) => s.setView);

  // Redirect away from admin pages if not logged in
  useEffect(() => {
    if (view.startsWith('admin-') && view !== 'admin-login' && !isAdmin) {
      setView('admin-login');
    }
  }, [view, isAdmin, setView]);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  const isAdminView = view.startsWith('admin-') && view !== 'admin-login' && isAdmin;

  // Render the correct view
  let content: React.ReactNode;
  if (view === 'home') content = <HomeView />;
  else if (view === 'shop') content = <ShopView />;
  else if (view === 'product') content = <ProductView />;
  else if (view === 'cart') content = <CartView />;
  else if (view === 'checkout') content = <CheckoutView />;
  else if (view === 'order-success') content = <OrderSuccessView />;
  else if (view === 'admin-login') content = <AdminLoginView />;
  else if (view === 'admin-dashboard' && isAdmin) content = <AdminDashboardView />;
  else if (view === 'admin-products' && isAdmin) content = <AdminProductsView />;
  else if (view === 'admin-add-product' && isAdmin) content = <AdminAddProductView />;
  else if (view === 'admin-edit-product' && isAdmin) content = <AdminEditProductView />;
  else if (view === 'admin-inventory' && isAdmin) content = <AdminInventoryView />;
  else if (view === 'admin-orders' && isAdmin) content = <AdminOrdersView />;
  else if (view === 'admin-categories' && isAdmin) content = <AdminCategoriesView />;
  else if (view === 'admin-insights' && isAdmin) content = <AdminInsightsView />;
  else content = <HomeView />;

  if (isAdminView) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex flex-1">
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <AdminMobileNav />
            <main className="flex-1">{content}</main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">{content}</main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
