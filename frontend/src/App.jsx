import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShoppingBag,
  Heart,
  Search,
  Menu,
  X,
  User,
  Server,
  Database as DbIcon,
  RefreshCw,
  ChevronDown,
  ArrowRight,
  Check,
  Tag,
  Truck
} from 'lucide-react';
import { apiService } from './services/api';
import { CartProvider, useCart } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import BundleSection from './components/BundleSection';
import TrustStrip from './components/TrustStrip';
import FaqSection from './components/FaqSection';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';
import CheckoutModal from './components/CheckoutModal';
import OrderTrackingModal from './components/OrderTrackingModal';
import JhumkaBoxHeroSection from './components/JhumkaBoxHeroSection';
import AdminPortal from './admin/AdminPortal';

function StorefrontContent({ onOpenAdmin }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [jhumkaBoxes, setJhumkaBoxes] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('popular');
  const [productsLoading, setProductsLoading] = useState(true);
  const [activePdpSlug, setActivePdpSlug] = useState(null);
  const [apiHealth, setApiHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [activeTrackingOrderNumber, setActiveTrackingOrderNumber] = useState('');

  const openTracking = (orderNumber = '') => {
    setActiveTrackingOrderNumber(orderNumber);
    setIsTrackingOpen(true);
  };


  // Cart actions from context
  const {
    itemCount,
    openCart,
    addToCart,
    addBundleToCart,
    grandTotal
  } = useCart();

  // Auth actions from context
  const {
    user,
    isAuthenticated,
    openAuthModal
  } = useAuth();

  const reloadData = async () => {
    try {
      const [cats, bnds, health, jBoxes] = await Promise.all([
        apiService.getCategories().catch(() => []),
        apiService.getBundles().catch(() => []),
        apiService.getHealth().catch(() => null),
        apiService.getProducts({ category: 'jhumka-boxes' }).then(res => res.products || []).catch(() => []),
      ]);
      setCategories(cats || []);
      setBundles(bnds || []);
      setApiHealth(health);
      setJhumkaBoxes(jBoxes || []);
    } catch (err) {
      console.warn('Refresh data error:', err);
    }
  };

  // Initial load
  useEffect(() => {
    reloadData();
  }, []);

  // Listen for admin changes across tabs or inside the same window
  useEffect(() => {
    const handleUpdate = () => {
      reloadData();
    };

    const handleStorage = (e) => {
      if (e.key === 'valerie_categories_updated' || e.key === 'valerie_catalog_updated') {
        reloadData();
      }
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        reloadData();
      }
    };

    window.addEventListener('valerie_categories_updated', handleUpdate);
    window.addEventListener('valerie_catalog_updated', handleUpdate);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('valerie_categories_updated', handleUpdate);
      window.removeEventListener('valerie_catalog_updated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  // Gracefully fallback selectedCategory to 'all' if active category was deleted or renamed in admin
  useEffect(() => {
    if (
      selectedCategory !== 'all' &&
      selectedCategory !== 'jhumka-boxes' &&
      categories.length > 0 &&
      !categories.some((c) => c.slug === selectedCategory)
    ) {
      setSelectedCategory('all');
    }
  }, [categories, selectedCategory]);

  // Fetch products on category / sort change
  useEffect(() => {
    let isMounted = true;
    async function loadProducts() {
      setProductsLoading(true);
      try {
        const data = await apiService.getProducts({
          category: selectedCategory,
          sort: selectedSort,
        });
        if (isMounted) {
          setProducts(data.products || []);
        }
      } catch (err) {
        console.warn('Error loading products:', err);
        if (isMounted) setProducts([]);
      } finally {
        if (isMounted) setProductsLoading(false);
      }
    }
    loadProducts();
    return () => { isMounted = false; };
  }, [selectedCategory, selectedSort]);

  const refreshHealth = async () => {
    setHealthLoading(true);
    try {
      const data = await apiService.getHealth();
      setApiHealth(data);
    } catch (err) {
      console.warn('Health refresh error:', err);
    } finally {
      setHealthLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFBFE] text-brand-tertiary antialiased">

      {/* Top Editorial Ribbon */}
      <div className="bg-[#FAF7FC] border-b border-brand-border text-brand-tertiary text-[11px] font-medium py-2 px-4 text-center tracking-widest uppercase flex items-center justify-center space-x-2">
        <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
        <span>
          COMPLIMENTARY EXPRESS DELIVERY ON ALL ORDERS ABOVE <span className="font-bold text-brand-primary">₹999</span> • 18K GOLD PVD ANTI-TARNISH
        </span>
      </div>

      {/* Main Luxury Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 sm:h-24 gap-4">

            {/* Left: Mobile Hamburger & Official Brand Logo */}
            <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-brand-tertiary hover:text-brand-primary transition-colors focus:outline-none"
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <a href="#" className="flex items-center group py-1">
                <img
                  src="/valerie.png"
                  alt="VALERIÉ"
                  className="h-7 sm:h-8 lg:h-9 w-auto object-contain transition-transform group-hover:scale-[1.02]"
                />
              </a>
            </div>

            {/* Center: Desktop Category Navigation (Refined, Compact, Clean Luxury Font) */}
            <nav className="hidden lg:flex items-center justify-center space-x-5 xl:space-x-7 text-[11px] font-caps tracking-[0.12em] uppercase text-brand-tertiary/80 whitespace-nowrap">
              {/* Highlighted Featured Hero Pill matching reference */}
              <a
                href="#jhumka-boxes"
                onClick={() => setSelectedCategory('jhumka-boxes')}
                className={`transition-all px-3 py-1 rounded-full flex items-center space-x-1.5 whitespace-nowrap ${
                  selectedCategory === 'jhumka-boxes'
                    ? 'bg-brand-primary text-white font-bold shadow-xs'
                    : 'bg-[#F4ECFA] text-brand-primary font-semibold hover:bg-brand-primary/15'
                }`}
              >
                <span>✨ 4 Jhumka Boxes</span>
              </a>

              <a
                href="#catalog"
                onClick={() => setSelectedCategory('all')}
                className={`transition-colors py-1 whitespace-nowrap relative ${
                  selectedCategory === 'all' ? 'text-brand-primary font-bold' : 'hover:text-brand-primary'
                }`}
              >
                All Jewelry
              </a>

              {categories
                .filter((cat) => cat.slug !== 'jhumka-boxes')
                .map((cat) => (
                  <a
                    key={cat.id}
                    href="#catalog"
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`transition-colors py-1 whitespace-nowrap relative ${
                      selectedCategory === cat.slug ? 'text-brand-primary font-bold' : 'hover:text-brand-primary'
                    }`}
                  >
                    {cat.name}
                  </a>
                ))}

              <a
                href="#combos"
                className="transition-colors py-1 whitespace-nowrap hover:text-brand-primary text-brand-primary font-semibold"
              >
                Combo Offers
              </a>
            </nav>

            {/* Right: Quick Actions */}
            <div className="flex items-center space-x-1 sm:space-x-3 text-brand-tertiary shrink-0">
              <button
                className="min-h-[44px] min-w-[44px] p-2 hover:text-brand-primary transition-colors flex items-center justify-center"
                aria-label="Search"
              >
                <Search className="w-5 h-5 stroke-[1.5]" />
              </button>

              <button
                className="min-h-[44px] min-w-[44px] p-2 hover:text-brand-primary transition-colors relative flex items-center justify-center"
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5 stroke-[1.5]" />
                <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-brand-primary rounded-full"></span>
              </button>

              {/* Order Tracking Button (Desktop only, mobile accesses via drawer) */}
              <button
                onClick={() => openTracking()}
                className="hidden sm:flex min-h-[44px] min-w-[44px] p-2 hover:text-brand-primary transition-colors relative items-center justify-center"
                aria-label="Track Order"
                title="Track Order (Shiprocket)"
              >
                <Truck className="w-5 h-5 stroke-[1.5]" />
              </button>

              {/* User Account Trigger (Desktop only, mobile accesses via drawer) */}
              <button
                onClick={() => openAuthModal('login')}
                className="hidden sm:flex min-h-[44px] min-w-[44px] p-2 hover:text-brand-primary transition-colors relative items-center justify-center"
                aria-label="Account"
                title={isAuthenticated ? `Signed in as ${user.name}` : "Sign In / Account (Optional)"}
              >
                {isAuthenticated ? (
                  <span className="w-7 h-7 rounded-full bg-brand-primary-light border border-brand-primary/40 text-brand-primary text-xs font-bold flex items-center justify-center shadow-2xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'V'}
                  </span>
                ) : (
                  <User className="w-5 h-5 stroke-[1.5]" />
                )}
              </button>

              {/* Shopping Bag / Cart */}
              <button
                onClick={openCart}
                className="min-h-[44px] min-w-[44px] p-2 hover:text-brand-primary transition-colors relative flex items-center justify-center"
                aria-label="Open Cart"
              >
                <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
                {itemCount > 0 && (
                  <span className="ml-1 text-[11px] font-bold text-white bg-brand-primary rounded-full px-1.5 py-0.2">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Slide Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-brand-border bg-white px-6 py-5 space-y-3 animate-in slide-in-from-top-2 duration-200 shadow-xl">
            <a
              href="#jhumka-boxes"
              onClick={() => { setSelectedCategory('jhumka-boxes'); setMobileMenuOpen(false); }}
              className="flex items-center justify-between text-xs font-caps tracking-[0.2em] uppercase py-2.5 text-brand-primary font-bold border-b border-brand-border/40"
            >
              <span>✨ 4 Jhumka Boxes</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-rose-500 text-white font-bold tracking-normal">BESTSELLER</span>
            </a>
            <a
              href="#catalog"
              onClick={() => { setSelectedCategory('all'); setMobileMenuOpen(false); }}
              className="block text-xs font-caps tracking-[0.2em] uppercase py-2 text-brand-tertiary hover:text-brand-primary"
            >
              All Jewelry
            </a>
            {categories
              .filter((c) => c.slug !== 'jhumka-boxes')
              .map((c) => (
                <a
                  key={c.id}
                  href="#catalog"
                  onClick={() => { setSelectedCategory(c.slug); setMobileMenuOpen(false); }}
                  className="block text-xs font-caps tracking-[0.2em] uppercase py-2 text-brand-tertiary hover:text-brand-primary"
                >
                  {c.name}
                </a>
              ))}
            <a
              href="#combos"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-caps tracking-[0.2em] uppercase py-2 text-brand-primary font-bold"
            >
              Combo Duos
            </a>

            {/* Mobile Tracking Action */}
            <button
              onClick={() => { openTracking(); setMobileMenuOpen(false); }}
              className="w-full text-left text-xs font-caps tracking-[0.2em] uppercase py-2 text-brand-tertiary hover:text-brand-primary flex items-center space-x-2"
            >
              <Truck className="w-4 h-4 text-brand-primary" />
              <span>Track Order (Shiprocket)</span>
            </button>


            {/* Mobile Account Action */}
            <div className="pt-3 border-t border-brand-border">
              <button
                onClick={() => { openAuthModal('login'); setMobileMenuOpen(false); }}
                className="w-full text-left text-xs font-caps tracking-[0.18em] uppercase py-2 text-brand-tertiary hover:text-brand-primary flex items-center justify-between"
              >
                <span>{isAuthenticated ? `Account (${user.name})` : 'Sign In / Account (Optional)'}</span>
                <User className="w-4 h-4 text-brand-primary" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 space-y-12 sm:space-y-16 pb-28 sm:pb-12">

        {/* Fast Fashion Hero Banner */}
        <section className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#FAF7FD] via-white to-[#F6F2FA] border border-brand-border p-8 sm:p-14">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl space-y-5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-primary-light border border-brand-primary/20 text-brand-primary text-[11px] font-caps uppercase tracking-[0.18em]">
              <Sparkles className="w-3 h-3 text-brand-primary" />
              <span>18K PVD Anti-Tarnish Everyday Luxury</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-editorial font-normal leading-[1.08] text-brand-tertiary tracking-tight">
              Curated everyday jewelry, <br />
              <span className="italic font-light text-brand-primary">designed to shine forever.</span>
            </h1>

            <p className="text-xs sm:text-sm text-brand-muted font-light leading-relaxed max-w-lg">
              Waterproof, shower-safe, and hypoallergenic accessories crafted in premium 316L stainless steel and 18K gold. Priced honestly from ₹500 to ₹1,500.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href="#jhumka-boxes"
                onClick={() => setSelectedCategory('jhumka-boxes')}
                className="px-6 py-3 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold shadow-md hover:shadow-luxury-hover transition-all flex items-center space-x-2"
              >
                <span>Shop 4 Jhumka Boxes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a
                href="#catalog"
                onClick={() => setSelectedCategory('all')}
                className="px-5 py-3 rounded-xl bg-white border border-brand-border text-brand-tertiary hover:border-brand-primary text-xs font-caps tracking-wider uppercase font-semibold transition-colors"
              >
                All Everyday Jewelry
              </a>
            </div>
          </div>
        </section>

        {/* Ad Campaign Hero Section: The 4 Signature Jhumka Boxes */}
        <div id="jhumka-boxes" className="scroll-mt-28">
          <JhumkaBoxHeroSection
            products={jhumkaBoxes.length > 0 ? jhumkaBoxes : products}
            onOpenPdp={(slug) => setActivePdpSlug(slug)}
            onOpenCheckout={() => setIsCheckoutOpen(true)}
          />
        </div>

        {/* Live System Telemetry Strip */}
        <section className="bg-white rounded-2xl p-5 border border-brand-border shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <DbIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-caps uppercase tracking-wider font-bold text-brand-tertiary">
                    Phase 4 Authentication & Guest Mode Active
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Auth Verified
                  </span>
                </div>
                <p className="text-xs text-brand-muted font-light mt-0.5">
                  Guest checkout supported • Customer JWT optional • Secure staff role partitioning active.
                </p>
              </div>
            </div>

            <button
              onClick={refreshHealth}
              disabled={healthLoading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#FAF7FC] text-brand-primary border border-brand-border text-xs font-semibold hover:bg-brand-primary-light transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
              <span>{healthLoading ? 'Syncing...' : 'Sync Status'}</span>
            </button>
          </div>
        </section>

        {/* Dynamic Product Catalog Section */}
        <section id="catalog" className="space-y-8 scroll-mt-28">

          {/* Header & Category Tabs */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-caps uppercase tracking-[0.2em] text-brand-primary font-bold">
                  Curated Catalog
                </span>
                <h2 className="text-2xl sm:text-4xl font-editorial font-bold text-brand-tertiary mt-1">
                  Discover Everyday Fine Jewelry
                </h2>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-brand-muted font-light">Sort by:</span>
                <div className="relative">
                  <select
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value)}
                    className="appearance-none bg-white border border-brand-border rounded-xl px-3.5 py-1.5 pr-8 text-xs font-medium text-brand-tertiary focus:outline-none focus:border-brand-primary cursor-pointer shadow-sm"
                  >
                    <option value="popular">Most Popular</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="newest">Newest First</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-brand-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-xl text-xs font-caps tracking-wider uppercase whitespace-nowrap transition-all ${selectedCategory === 'all'
                  ? 'bg-brand-primary text-white font-bold shadow-sm'
                  : 'bg-white border border-brand-border text-brand-tertiary hover:border-brand-primary/40'
                  }`}
              >
                All Pieces ({categories.reduce((acc, c) => acc + Number(c.products_count || 0), 0) || products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`px-4 py-2 rounded-xl text-xs font-caps tracking-wider uppercase whitespace-nowrap transition-all ${selectedCategory === cat.slug
                    ? 'bg-brand-primary text-white font-bold shadow-sm'
                    : 'bg-white border border-brand-border text-brand-tertiary hover:border-brand-primary/40'
                    }`}
                >
                  {cat.name} ({cat.products_count || 0})
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid (2-column on mobile matching Glomo/Everlasting D2C best practice) */}
          {productsLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="luxury-card rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-3 sm:space-y-4 animate-pulse">
                  <div className="aspect-square rounded-lg sm:rounded-xl bg-gray-200"></div>
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-2.5 sm:h-3 bg-gray-100 rounded w-1/2"></div>
                  <div className="h-7 sm:h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-brand-border space-y-3">
              <p className="font-editorial text-xl font-bold text-brand-tertiary">No jewelry found in this category</p>
              <p className="text-xs text-brand-muted">Try selecting "All Pieces" to view the full collection.</p>
              <button
                onClick={() => setSelectedCategory('all')}
                className="px-4 py-2 bg-brand-primary text-white text-xs rounded-xl"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickView={(p) => setActivePdpSlug(p.slug)}
                  onAddToCart={(p) => addToCart(p, null, 1, true)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Curated Combo Sets Section */}
        <section id="combos" className="scroll-mt-28">
          <BundleSection
            bundles={bundles}
            onSelectBundle={(bundle) => addBundleToCart(bundle, 1, true)}
          />
        </section>

        {/* Trust Badges Strip */}
        <TrustStrip />

        {/* Expandable FAQs Block */}
        <FaqSection />

      </main>

      {/* Product Detail Modal (PDP) */}
      {activePdpSlug && (
        <ProductDetailModal
          productSlug={activePdpSlug}
          onClose={() => setActivePdpSlug(null)}
          onAddToCart={(product, variant) => {
            addToCart(product, variant, 1, true);
          }}
        />
      )}

      {/* Slide-out Cart Drawer */}
      <CartDrawer onProceedToCheckout={() => setIsCheckoutOpen(true)} />

      {/* Fastrr 1-Click Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onTrackOrder={(orderNum) => openTracking(orderNum)}
      />

      {/* Authentication Modal */}
      <AuthModal onOpenTracking={(orderNum) => openTracking(orderNum)} />

      {/* Shiprocket Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        initialOrderNumber={activeTrackingOrderNumber}
      />

      {/* Mobile Sticky CTA Bar */}
      <div className="sm:hidden sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-brand-border px-4 py-3 text-brand-tertiary flex items-center justify-between shadow-2xl">
        <div>
          <span className="text-[10px] font-caps uppercase tracking-wider text-brand-primary block font-semibold">Shopping Bag</span>
          <span className="text-base font-bold text-brand-tertiary">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} • ₹{Math.round(grandTotal).toLocaleString('en-IN')}
          </span>
        </div>
        <button
          onClick={openCart}
          className="px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-caps tracking-widest uppercase font-bold shadow-sm hover:bg-brand-primary-hover active:scale-95 transition-all flex items-center space-x-1.5"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>View Bag</span>
        </button>
      </div>

      {/* Global Luxury Footer */}
      <footer className="bg-white border-t border-brand-border mt-16 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

          {/* Brand + Links row */}
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 pb-8 border-b border-brand-border">
            <div className="flex flex-col items-center md:items-start">
              <img src="/valerie.png" alt="VALERIÉ" className="h-7 w-auto object-contain" />
              <p className="text-xs text-brand-muted mt-2 max-w-sm text-center md:text-left font-light">
                Curated everyday luxury jewelry. Engineered with 18K PVD gold plating for lifetime anti-tarnish elegance.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-xs text-brand-muted font-light">
              <a href="#" className="hover:text-brand-primary transition-colors">Privacy Policy (DPDP)</a>
              <a href="#" className="hover:text-brand-primary transition-colors">Returns &amp; Refunds</a>
              <a href="#" className="hover:text-brand-primary transition-colors">Terms of Service</a>
              <a href="#faqs" className="hover:text-brand-primary transition-colors font-medium">FAQs</a>
              <a
                href="#track-order"
                onClick={(e) => { e.preventDefault(); openTracking(); }}
                className="hover:text-brand-primary transition-colors cursor-pointer font-medium text-brand-tertiary"
              >
                Track Order
              </a>
              <a
                href="#admin"
                onClick={(e) => { e.preventDefault(); if (onOpenAdmin) onOpenAdmin(); else window.location.hash = '#admin'; }}
                className="hover:text-brand-primary transition-colors cursor-pointer font-semibold text-brand-primary"
              >
                Admin Portal
              </a>
            </div>
          </div>

          {/* Contact Strip — sourced from valeriejewels.in */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2 text-xs text-brand-muted">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-brand-tertiary">📍</span>
              <span>Patel Chowk, Rajkot, Gujarat</span>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <span className="font-semibold text-brand-tertiary">📞</span>
              <a href="tel:+919023422392" className="hover:text-brand-primary transition-colors">+91 90234 22392</a>
              <span className="text-brand-border">·</span>
              <a href="https://wa.me/917016347945" target="_blank" rel="noreferrer" className="hover:text-brand-primary transition-colors">WA: +91 70163 47945</a>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-brand-tertiary">✉️</span>
              <a href="mailto:orders@valeriejewels.in" className="hover:text-brand-primary transition-colors">orders@valeriejewels.in</a>
            </div>
          </div>

          {/* Copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-brand-muted font-light gap-4 pt-4 border-t border-brand-border">
            <div>© {new Date().getFullYear()} VALERIÉ. All rights reserved. Open hours: 7 days a week, 8:00 AM – 4:00 PM.</div>
            <div className="text-[11px] tracking-wider uppercase">Hostinger Premium • React + PHP REST • Fastrr Checkout Ready</div>
          </div>

        </div>
      </footer>

    </div>
  );
}

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(
    window.location.pathname.startsWith('/admin') || window.location.hash.startsWith('#admin')
  );

  useEffect(() => {
    const handleHashChange = () => {
      setIsAdminRoute(
        window.location.pathname.startsWith('/admin') || window.location.hash.startsWith('#admin')
      );
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  if (isAdminRoute) {
    return (
      <AdminPortal
        onReturnToStore={() => {
          setIsAdminRoute(false);
          window.location.hash = '';
          if (window.location.pathname.startsWith('/admin')) {
            window.history.pushState(null, '', '/');
          }
        }}
      />
    );
  }

  return (
    <AuthProvider>
      <CartProvider>
        <StorefrontContent
          onOpenAdmin={() => {
            setIsAdminRoute(true);
            window.location.hash = '#admin';
          }}
        />
      </CartProvider>
    </AuthProvider>
  );
}
