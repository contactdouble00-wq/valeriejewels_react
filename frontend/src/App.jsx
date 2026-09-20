import UnderDevelopmentGate, { DevPreviewFloatingBadge } from './components/UnderDevelopmentGate';
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
import { SiteContentProvider, useSiteContent } from './context/SiteContentContext';
import { WishlistProvider, useWishlist } from './context/WishlistContext';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import FestivalOfferSection from './components/FestivalOfferSection';
import TrustStrip from './components/TrustStrip';
import FaqSection from './components/FaqSection';
import CartDrawer from './components/CartDrawer';
import WishlistDrawer from './components/WishlistDrawer';
import WishlistToast from './components/WishlistToast';
import MobileSidebarDrawer from './components/MobileSidebarDrawer';
import AuthModal from './components/AuthModal';
import CheckoutModal from './components/CheckoutModal';
import OrderTrackingModal from './components/OrderTrackingModal';
import JhumkaBoxHeroSection from './components/JhumkaBoxHeroSection';
import NotFoundPage from './components/NotFoundPage';
import PolicyPage from './components/PolicyPage';
import FaqPage from './components/FaqPage';
import MobileHeroSlider from './components/MobileHeroSlider';

const AdminPortal = React.lazy(() => import('./admin/AdminPortal'));

function StorefrontContent({ onOpenAdmin, initialCategory = 'all', initialSearchQuery = '', onOpenPolicy, onOpenFaqs }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [jhumkaBoxes, setJhumkaBoxes] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'all');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [selectedSort, setSelectedSort] = useState('popular');
  const [productsLoading, setProductsLoading] = useState(true);
  const [activePdpSlug, setActivePdpSlug] = useState(null);
  const [activePdpProduct, setActivePdpProduct] = useState(null);
  const [apiHealth, setApiHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [activeTrackingOrderNumber, setActiveTrackingOrderNumber] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const openTracking = (orderNumber = '') => {
    setActiveTrackingOrderNumber(orderNumber);
    setIsTrackingOpen(true);
  };

  // Sync PDP opening with URL Hash and history for native mobile back navigation
  const openPdp = (slug, productObj = null) => {
    setActivePdpSlug(slug);
    setActivePdpProduct(productObj);
    if (window.location.hash !== `#product-${slug}`) {
      window.history.pushState({ pdp: slug }, '', `#product-${slug}`);
    }
  };

  const closePdp = () => {
    setActivePdpSlug(null);
    setActivePdpProduct(null);
    if (window.history.state?.pdp) {
      window.history.back();
    } else if (window.location.hash.startsWith('#product-')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#product-')) {
        const slug = hash.replace('#product-', '');
        setActivePdpSlug(slug);
      } else {
        setActivePdpSlug(null);
      }
    };

    // On mount check if URL already has a product hash
    if (window.location.hash && window.location.hash.startsWith('#product-')) {
      const slug = window.location.hash.replace('#product-', '');
      setActivePdpSlug(slug);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);


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

  // Dynamic Site Content from context
  const { content } = useSiteContent();

  // Wishlist actions from context
  const {
    openWishlist,
    wishlistCount
  } = useWishlist();

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

  // Gracefully fallback selectedCategory to 'all' if active category was deleted, renamed, or disabled
  useEffect(() => {
    if (
      selectedCategory !== 'all' &&
      categories.length > 0 &&
      !categories.some((c) => c.slug === selectedCategory)
    ) {
      setSelectedCategory('all');
    }
  }, [categories, selectedCategory]);

  // Sync initialCategory & initialSearchQuery if passed from parent
  useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (initialSearchQuery !== undefined) setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  // Fetch products on category / sort / search change
  useEffect(() => {
    let isMounted = true;
    async function loadProducts() {
      setProductsLoading(true);
      try {
        const data = await apiService.getProducts({
          category: selectedCategory,
          sort: selectedSort,
          search: searchQuery,
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
  }, [selectedCategory, selectedSort, searchQuery]);

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
      {content?.topRibbon?.enabled !== false && (
        <div className="bg-[#FAF7FC] border-b border-brand-border text-brand-tertiary text-[10px] sm:text-[11px] font-medium py-1.5 sm:py-2 px-3 sm:px-4 text-center tracking-wider sm:tracking-widest uppercase flex items-center justify-center space-x-1.5 sm:space-x-2">
          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand-primary shrink-0" />
          <span className="truncate sm:overflow-visible">
            {content?.topRibbon?.text || 'FREE DELIVERY ACROSS ALL INDIA (5-7 WORKING DAYS) • FREE ZIRCON NECKLACE ON PREPAID'}{' '}
            <span className="font-bold text-brand-primary">{content?.topRibbon?.highlightAmount || '+ ₹50 OFF'}</span>{' '}
            {content?.topRibbon?.suffix || '• 18K GOLD PVD ANTI-TARNISH'}
          </span>
        </div>
      )}

      {/* Main Luxury Header (Two-tier on desktop, 3-column symmetrical on mobile inspired by Everlasting) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-brand-border">
        {/* Tier 1: Main Brand & Action Cluster */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 lg:h-16 relative">

            {/* Mobile Left: Hamburger Menu */}
            <div className="flex lg:hidden items-center w-12 shrink-0">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 -ml-2 text-brand-tertiary hover:text-brand-primary transition-colors focus:outline-none"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5 stroke-[1.75]" />
              </button>
            </div>

            {/* Desktop Left: Luxury Promise / Tagline */}
            <div className="hidden lg:flex items-center space-x-2 text-xs text-brand-tertiary/75 tracking-wide shrink-0 min-w-[220px]">
              <Sparkles className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span className="font-caps tracking-[0.14em] uppercase text-[10.5px]">18K PVD Anti-Tarnish Luxury</span>
            </div>

            {/* Center: Brand Logo (Optimized & Balanced Proportions) */}
            <div className="flex-1 lg:flex-initial flex items-center justify-center">
              <a href="#" className="flex items-center justify-center group py-1">
                <img
                  src="/valerie.png"
                  alt="VALERIÉ"
                  className="h-[18px] sm:h-5 lg:h-6 xl:h-[26px] w-auto object-contain transition-transform group-hover:scale-[1.02]"
                />
              </a>
            </div>

            {/* Actions Cluster (Mobile: Search | Wishlist | Bag; Desktop: Search | Wishlist | Track | Account | Bag) */}
            <div className="flex items-center justify-end shrink-0 min-w-[48px] lg:min-w-[220px]">
              
              {/* Search Button */}
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 text-brand-tertiary hover:text-brand-primary transition-colors flex items-center space-x-1.5"
                aria-label="Search jewelry"
                title="Search"
              >
                <Search className="w-4.5 h-4.5 lg:w-4 lg:h-4 stroke-[1.6]" />
                <span className="hidden lg:inline text-[11px] font-caps uppercase tracking-wider text-brand-tertiary/80 hover:text-brand-primary">Search</span>
              </button>

              {/* Mobile Wishlist Button */}
              <button
                onClick={openWishlist}
                className="flex lg:hidden p-2 text-brand-tertiary hover:text-brand-primary transition-colors relative items-center justify-center"
                aria-label={`Wishlist (${wishlistCount})`}
                title="Wishlist"
              >
                <Heart className={`w-4.5 h-4.5 stroke-[1.6] transition-colors ${wishlistCount > 0 ? 'fill-brand-primary text-brand-primary' : ''}`} />
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-brand-primary text-white text-[8px] font-bold flex items-center justify-center shadow-xs">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* Vertical divider */}
              <span className="hidden lg:block h-3.5 w-px bg-brand-border mx-1" />

              {/* Desktop Wishlist */}
              <button
                onClick={openWishlist}
                className="hidden lg:flex p-2 text-brand-tertiary hover:text-brand-primary transition-colors relative items-center justify-center group"
                aria-label={`Wishlist (${wishlistCount})`}
                title={`Saved Pieces (${wishlistCount})`}
              >
                <Heart className={`w-4 h-4 stroke-[1.6] transition-colors ${wishlistCount > 0 ? 'fill-brand-primary text-brand-primary' : 'group-hover:text-brand-primary'}`} />
                {wishlistCount > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-primary text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                    {wishlistCount}
                  </span>
                ) : (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-brand-primary/40 rounded-full group-hover:bg-brand-primary transition-colors"></span>
                )}
              </button>

              {/* Vertical divider */}
              <span className="hidden lg:block h-3.5 w-px bg-brand-border mx-1" />

              {/* Desktop Track Order */}
              <button
                onClick={() => openTracking()}
                className="hidden lg:flex p-2 text-brand-tertiary hover:text-brand-primary transition-colors relative items-center space-x-1.5"
                aria-label="Track Order"
                title="Track Order (Shiprocket)"
              >
                <Truck className="w-4 h-4 stroke-[1.6]" />
                <span className="hidden xl:inline text-[11px] font-caps uppercase tracking-wider text-brand-tertiary/80">Track</span>
              </button>

              {/* Vertical divider */}
              <span className="hidden lg:block h-3.5 w-px bg-brand-border mx-1" />

              {/* Desktop User Account Trigger */}
              <button
                onClick={() => openAuthModal('login')}
                className="hidden lg:flex p-2 text-brand-tertiary hover:text-brand-primary transition-colors relative items-center justify-center"
                aria-label="Account"
                title={isAuthenticated ? `Signed in as ${user.name}` : "Sign In / Account (Optional)"}
              >
                {isAuthenticated ? (
                  <span className="w-6 h-6 rounded-full bg-brand-primary-light border border-brand-primary/40 text-brand-primary text-[11px] font-bold flex items-center justify-center shadow-2xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'V'}
                  </span>
                ) : (
                  <User className="w-4 h-4 stroke-[1.6]" />
                )}
              </button>

              {/* Vertical divider (desktop only) */}
              <span className="hidden lg:block h-3.5 w-px bg-brand-border mx-1" />

              {/* Shopping Bag / Cart (Always visible) */}
              <button
                onClick={openCart}
                className="p-2 text-brand-tertiary hover:text-brand-primary transition-colors relative flex items-center"
                aria-label="Open Cart"
                title="Shopping Bag"
              >
                <ShoppingBag className="w-4.5 h-4.5 lg:w-4 lg:h-4 stroke-[1.6]" />
                {itemCount > 0 ? (
                  <span className="ml-1 text-[10px] sm:text-[11px] font-bold text-white bg-brand-primary rounded-full px-1.5 min-w-[17px] text-center leading-4 shadow-xs">
                    {itemCount}
                  </span>
                ) : (
                  <span className="hidden lg:inline ml-1 text-xs font-semibold text-brand-tertiary/60 font-mono">0</span>
                )}
              </button>

            </div>

          </div>
        </div>

        {/* Tier 2: Desktop Centered Category Navigation Strip */}
        <nav className="hidden lg:block border-t border-brand-border/60 bg-[#FAF7FC]/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center space-x-6 xl:space-x-8 h-10 text-[11px] font-caps tracking-[0.14em] uppercase text-brand-tertiary/80 whitespace-nowrap">
              {/* Highlighted Featured Pill matching Everlasting (uses dynamic category name) */}
              {(() => {
                const featuredCat = categories.find((cat) => cat.slug.includes('jhumk') || cat.id === 1) || categories[0];
                if (!featuredCat) return null;
                return (
                  <a
                    href="#jhumka-boxes"
                    onClick={() => setSelectedCategory(featuredCat.slug)}
                    className={`transition-all px-3 py-1 rounded-full flex items-center space-x-1.5 whitespace-nowrap ${
                      selectedCategory === featuredCat.slug
                        ? 'bg-brand-primary text-white font-bold shadow-xs'
                        : 'bg-[#F4ECFA] text-brand-primary font-semibold hover:bg-brand-primary/15'
                    }`}
                  >
                    <span>✨ {featuredCat.name}</span>
                  </a>
                );
              })()}

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
                .filter((cat) => {
                  const featuredCat = categories.find((c) => c.slug.includes('jhumk') || c.id === 1) || categories[0];
                  return cat.id !== featuredCat?.id;
                })
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

              {content?.festivalOffer?.enabled !== false && content?.festivalOffer?.enabled !== 'false' && (
                <a
                  href="#festive-offers"
                  className="transition-colors py-1 whitespace-nowrap hover:text-brand-primary text-[#C5A25D] hover:text-[#B38F49] font-semibold flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-[#C5A25D] animate-pulse" />
                  <span>Festive Offers</span>
                </a>
              )}
            </div>
          </div>
        </nav>

        {/* Search Input Bar (Dropdown toggle) */}
        {isSearchOpen && (
          <div className="border-t border-brand-border bg-white px-4 py-3 shadow-md animate-in slide-in-from-top-1 duration-200">
            <div className="max-w-2xl mx-auto flex items-center space-x-3">
              <Search className="w-4 h-4 text-brand-primary shrink-0" />
              <input
                type="text"
                placeholder="Search jhumka boxes, necklaces, anti-tarnish jewelry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const catalogEl = document.getElementById('catalog');
                    if (catalogEl) catalogEl.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                autoFocus
                className="w-full text-xs sm:text-sm bg-transparent border-none outline-none text-brand-tertiary placeholder:text-brand-tertiary/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] font-caps tracking-wider uppercase text-brand-tertiary/60 hover:text-brand-primary px-1.5 py-0.5"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1 text-brand-tertiary/60 hover:text-brand-primary rounded-full hover:bg-brand-primary-light/50 transition-colors"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-2.5 sm:pt-12 pb-28 sm:pb-12 space-y-7 sm:space-y-16">

        {/* Mobile View: Tanishq-Style Luxury Poster Slider (Replaces Curated everyday jewelry banner on mobile) */}
        {content?.mobileSlider?.enabled !== false && (
          <div className="md:hidden">
            <MobileHeroSlider
              slides={content?.mobileSlider?.slides}
              autoPlay={content?.mobileSlider?.autoPlay ?? true}
              interval={content?.mobileSlider?.interval ?? 4500}
              onSelectCategory={setSelectedCategory}
            />
          </div>
        )}

        {/* Desktop View: Fast Fashion Hero Banner */}
        <section className="hidden md:block relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#FAF7FD] via-white to-[#F6F2FA] border border-brand-border p-8 sm:p-14">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Desktop-Only Creatively Faded Hero Photograph */}
          {Boolean(content?.heroBanner?.rightImageUrl ?? '/hero-jewelry-model.jpg') && (
            <div className="hidden md:block absolute top-0 right-0 w-[65%] lg:w-[60%] xl:w-[56%] h-full pointer-events-none select-none overflow-hidden z-0">
              <img
                src={content?.heroBanner?.rightImageUrl || '/hero-jewelry-model.jpg'}
                alt="Valerie Everyday Luxury Jewelry"
                className="w-full h-full object-cover object-[center_15%]"
                style={{
                  maskImage: 'linear-gradient(to right, transparent 0%, transparent 4%, rgba(0,0,0,0.12) 10%, rgba(0,0,0,0.55) 16%, #000 22%, #000 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 4%, rgba(0,0,0,0.12) 10%, rgba(0,0,0,0.55) 16%, #000 22%, #000 100%)',
                }}
                loading="eager"
              />
            </div>
          )}

          <div className="relative z-10 max-w-2xl space-y-5">
            <div className="inline-flex max-w-full items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1 rounded-full bg-brand-primary-light border border-brand-primary/20 text-brand-primary text-[10px] sm:text-[11px] font-caps uppercase tracking-wide sm:tracking-[0.18em]">
              <Sparkles className="w-3 h-3 text-brand-primary shrink-0" />
              <span className="whitespace-normal leading-tight text-left">{content?.heroBanner?.badgeText || '18K PVD Anti-Tarnish Everyday Luxury'}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-editorial font-normal leading-[1.08] text-brand-tertiary tracking-tight">
              {content?.heroBanner?.headline || 'Curated everyday jewelry,'} <br />
              <span className="italic font-light text-brand-primary">{content?.heroBanner?.accentText || 'designed to shine forever.'}</span>
            </h1>

            <p className="text-xs sm:text-sm text-brand-muted font-light leading-relaxed max-w-lg">
              {content?.heroBanner?.subtitle || 'Waterproof, shower-safe, and hypoallergenic accessories crafted in premium 316L stainless steel and 18K gold. Priced honestly from ₹500 to ₹1,500.'}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href={content?.heroBanner?.primaryBtnLink || '#jhumka-boxes'}
                onClick={() => {
                  if ((content?.heroBanner?.primaryBtnLink || '#jhumka-boxes') === '#jhumka-boxes') {
                    setSelectedCategory('jhumka-boxes');
                  }
                }}
                className="px-6 py-3 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold shadow-md hover:shadow-luxury-hover transition-all flex items-center space-x-2"
              >
                <span>{content?.heroBanner?.primaryBtnText || 'Shop 4 Jhumka Boxes'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a
                href={content?.heroBanner?.secondaryBtnLink || '#catalog'}
                onClick={() => {
                  if ((content?.heroBanner?.secondaryBtnLink || '#catalog') === '#catalog') {
                    setSelectedCategory('all');
                  }
                }}
                className="px-5 py-3 rounded-xl bg-white border border-brand-border text-brand-tertiary hover:border-brand-primary text-xs font-caps tracking-wider uppercase font-semibold transition-colors"
              >
                {content?.heroBanner?.secondaryBtnText || 'All Everyday Jewelry'}
              </a>
            </div>
          </div>
        </section>

        {/* Ad Campaign Hero Section: The 4 Signature Jhumka Boxes (only if category is active and has products) */}
        {categories.some((c) => c.slug === 'jhumka-boxes') && jhumkaBoxes.length > 0 && (
          <div id="jhumka-boxes" className="scroll-mt-28">
            <JhumkaBoxHeroSection
              products={jhumkaBoxes}
              onOpenPdp={(slug, box) => openPdp(slug, box)}
              onOpenCheckout={() => setIsCheckoutOpen(true)}
            />
          </div>
        )}

        {/* Live System Telemetry Strip (Toggleable from Admin) */}
        {content?.telemetryBanner?.enabled && (
          <section className="bg-white rounded-2xl p-5 border border-brand-border shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <DbIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-caps uppercase tracking-wider font-bold text-brand-tertiary">
                      {content?.telemetryBanner?.title || 'Phase 4 Authentication & Guest Mode Active'}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Auth Verified
                    </span>
                  </div>
                  <p className="text-xs text-brand-muted font-light mt-0.5">
                    {content?.telemetryBanner?.subtitle || 'Guest checkout supported • Customer JWT optional • Secure staff role partitioning active.'}
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
        )}

        {/* Dynamic Product Catalog Section */}
        <section id="catalog" className="space-y-8 scroll-mt-28">

          {/* Header & Category Tabs */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-caps uppercase tracking-[0.2em] text-brand-primary font-bold">
                  {content?.catalogHeader?.eyebrow || 'Curated Catalog'}
                </span>
                <h2 className="text-2xl sm:text-4xl font-editorial font-bold text-brand-tertiary mt-1">
                  {content?.catalogHeader?.title || 'Discover Everyday Fine Jewelry'}
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

            {searchQuery && (
              <div className="flex items-center space-x-2 pt-1">
                <span className="text-xs text-brand-muted font-light">Filtered by:</span>
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-medium">
                  <span>"{searchQuery}"</span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="hover:text-brand-tertiary transition-colors ml-1 font-bold text-sm"
                    title="Clear search"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
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
                  onQuickView={(p) => openPdp(p.slug, p)}
                  onAddToCart={(p) => addToCart(p, null, 1, true)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Festival Offer Panel (Grand Celebrations) */}
        {content?.festivalOffer?.enabled !== false && content?.festivalOffer?.enabled !== 'false' && (
          <section id="festive-offers" className="scroll-mt-28">
            <FestivalOfferSection
              products={products}
              onQuickView={(p) => openPdp(p.slug, p)}
              onAddToCart={(p) => addToCart(p, null, 1, true)}
            />
          </section>
        )}

        {/* Trust Badges Strip */}
        <TrustStrip />

        {/* Expandable FAQs Block */}
        <FaqSection onOpenFaqs={onOpenFaqs} />

      </main>

      {/* Product Detail Modal (PDP) */}
      {activePdpSlug && (
        <ProductDetailModal
          productSlug={activePdpSlug}
          initialProduct={activePdpProduct}
          onClose={closePdp}
          onAddToCart={(product, variant) => {
            addToCart(product, variant, 1, true);
          }}
          onBuyNow={(product, variant) => {
            addToCart(product, variant, 1, false);
            setIsCheckoutOpen(true);
          }}
        />
      )}

      {/* Slide-out Cart Drawer */}
      <CartDrawer onProceedToCheckout={() => setIsCheckoutOpen(true)} />

      {/* Slide-out Wishlist Drawer */}
      <WishlistDrawer onSelectProduct={(item) => openPdp(item.slug, item)} />

      {/* Slide-out Mobile Navigation Drawer (Everlasting Style) */}
      <MobileSidebarDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={(slug) => {
          setSelectedCategory(slug);
          const catalogEl = document.getElementById('catalog');
          if (catalogEl) catalogEl.scrollIntoView({ behavior: 'smooth' });
        }}
        openWishlist={openWishlist}
        wishlistCount={wishlistCount}
        openTracking={openTracking}
        openAuthModal={openAuthModal}
        isAuthenticated={isAuthenticated}
        user={user}
        onOpenPolicy={onOpenPolicy}
        onOpenFaqs={onOpenFaqs}
      />

      {/* Wishlist Toast Notification */}
      <WishlistToast />

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

      {/* Mobile Sticky CTA Bar (hidden when full-screen PDP is active to avoid overlapping bars) */}
      {!activePdpSlug && (
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
      )}

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
              <a
                href="/shipping-policy"
                onClick={(e) => { e.preventDefault(); if (onOpenPolicy) onOpenPolicy('shipping'); }}
                className="hover:text-brand-primary transition-colors font-medium text-brand-tertiary"
              >
                Shipping &amp; Delivery (5-7 Days)
              </a>
              <a
                href="/refund-policy"
                onClick={(e) => { e.preventDefault(); if (onOpenPolicy) onOpenPolicy('refund'); }}
                className="hover:text-brand-primary transition-colors font-medium text-brand-tertiary"
              >
                Returns &amp; Refunds
              </a>
              <a
                href="/privacy-policy"
                onClick={(e) => { e.preventDefault(); if (onOpenPolicy) onOpenPolicy('privacy'); }}
                className="hover:text-brand-primary transition-colors"
              >
                Privacy Policy (DPDP 2023)
              </a>
              <a
                href="/terms-and-conditions"
                onClick={(e) => { e.preventDefault(); if (onOpenPolicy) onOpenPolicy('terms'); }}
                className="hover:text-brand-primary transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="/faqs"
                onClick={(e) => { e.preventDefault(); if (onOpenFaqs) onOpenFaqs(); }}
                className="hover:text-brand-primary transition-colors font-medium cursor-pointer"
              >
                FAQs
              </a>
              <a
                href="#track-order"
                onClick={(e) => { e.preventDefault(); openTracking(); }}
                className="hover:text-brand-primary transition-colors cursor-pointer font-medium text-brand-tertiary"
              >
                Track Order
              </a>
              <button
                onClick={(e) => { e.preventDefault(); openWishlist(); }}
                className="hover:text-brand-primary transition-colors cursor-pointer font-medium text-brand-tertiary"
              >
                Wishlist {wishlistCount > 0 ? `(${wishlistCount})` : ''}
              </button>
            </div>
          </div>

          {/* Contact Strip — dynamically loaded from site settings */}
          {(() => {
            const support = content?.customerSupport || {};
            const phone = support.phone || '+91 90234 22392';
            const cleanPhone = phone.replace(/\s+/g, '');
            const waNum = support.whatsappNumber || '+91 70163 47945';
            const cleanWa = (waNum || '917016347945').replace(/\D/g, '');
            const email = support.email || 'orders@valeriejewels.in';
            const address = support.address || 'Patel Chowk, Rajkot, Gujarat';
            const hours = support.hours || '7 days a week, 8:00 AM – 4:00 PM';
            const waMsg = encodeURIComponent(support.whatsappMessage || 'Hello Valerie Jewels, I have an inquiry about my order / jewelry.');

            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2 text-xs text-brand-muted">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-brand-tertiary">📍</span>
                    <span>{address}</span>
                  </div>
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-semibold text-brand-tertiary">📞</span>
                    <a href={`tel:${cleanPhone}`} className="hover:text-brand-primary transition-colors">{phone}</a>
                    <span className="text-brand-border">·</span>
                    <a href={`https://wa.me/${cleanWa}?text=${waMsg}`} target="_blank" rel="noreferrer" className="hover:text-brand-primary transition-colors">
                      WA: {waNum}
                    </a>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-brand-tertiary">✉️</span>
                    <a href={`mailto:${email}`} className="hover:text-brand-primary transition-colors">{email}</a>
                  </div>
                </div>

                {/* Copyright */}
                <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-brand-muted font-light gap-4 pt-4 border-t border-brand-border">
                  <div>© {new Date().getFullYear()} VALERIÉ. All rights reserved. Open hours: {hours}.</div>
                  <div className="text-[11px] tracking-wider uppercase">Hostinger Premium • React + PHP REST • Fastrr Checkout Ready</div>
                </div>
              </>
            );
          })()}

        </div>
      </footer>

    </div>
  );
}

export default function App() {
  const checkIsPreview = () => {
    try {
      if (typeof window === 'undefined') return false;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return true;
      }
      const urlParams = new URLSearchParams(window.location.search);
      if (
        urlParams.get('preview') === 'vj2026' ||
        urlParams.get('preview') === 'true' ||
        urlParams.get('bypass') === 'true' ||
        urlParams.get('preview') === 'valerie'
      ) {
        localStorage.setItem('vj_preview_mode', 'true');
        return true;
      }
      if (window.location.hash.includes('preview')) {
        localStorage.setItem('vj_preview_mode', 'true');
        return true;
      }
      if (localStorage.getItem('valerie_admin_token')) {
        return true;
      }
      return localStorage.getItem('vj_preview_mode') === 'true';
    } catch {
      return false;
    }
  };

  const [isPreview, setIsPreview] = useState(checkIsPreview);
  const evaluateRoute = () => {
    const rawPath = window.location.pathname.replace(/\/+$/, '') || '/';
    const hash = window.location.hash;

    // 1. Admin Route (/admin, #admin, /vj-manage-x1126, or #vj-manage-x1126)
    if (
      rawPath === '/admin' ||
      rawPath.startsWith('/admin/') ||
      hash === '#admin' ||
      hash.startsWith('#admin') ||
      rawPath.startsWith('/vj-manage-x1126') ||
      hash.startsWith('#vj-manage-x1126')
    ) {
      return 'admin';
    }

    // 2. Legal Policy Routes
    if (rawPath === '/shipping-policy' || rawPath === '/shipping' || hash === '#shipping-policy' || hash === '#shipping') {
      return 'policy-shipping';
    }
    if (rawPath === '/refund-policy' || rawPath === '/return-and-refund-policy' || rawPath === '/return-policy' || hash === '#refund-policy' || hash === '#return-policy' || hash === '#refund') {
      return 'policy-refund';
    }
    if (rawPath === '/privacy-policy' || hash === '#privacy-policy' || hash === '#privacy') {
      return 'policy-privacy';
    }
    if (rawPath === '/terms-and-conditions' || rawPath === '/terms' || hash === '#terms-and-conditions' || hash === '#terms') {
      return 'policy-terms';
    }
    if (rawPath === '/policies' || hash === '#policies') {
      return 'policy-shipping';
    }

    // 3. FAQs Route
    if (rawPath === '/faqs' || rawPath === '/faq' || hash === '#faqs' || hash === '#faq' || hash === '#faqs-page') {
      return 'faqs';
    }

    // 4. Explicit 404 hash or trigger
    if (hash === '#404' || hash === '#/404' || hash === '#not-found') {
      return '404';
    }

    // 5. Known valid routes in this Single Page Application (note: /admin is now treated as 404)
    const validPaths = [
      '/', '', '/shop', '/index.html',
      '/admin', '/vj-manage-x1126',
      '/shipping-policy', '/shipping',
      '/refund-policy', '/return-and-refund-policy', '/return-policy',
      '/privacy-policy',
      '/terms-and-conditions', '/terms',
      '/policies',
      '/faqs', '/faq'
    ];
    if (!validPaths.includes(rawPath) && !rawPath.startsWith('/api')) {
      return '404';
    }

    return 'store';
  };

  const [currentRoute, setCurrentRoute] = useState(evaluateRoute);
  const [initialCategory, setInitialCategory] = useState('all');
  const [initialSearchQuery, setInitialSearchQuery] = useState('');

  useEffect(() => {
    const handleRouteChange = () => {
      setCurrentRoute(evaluateRoute());
    };
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  if (currentRoute !== 'admin' && !isPreview) {
    return React.createElement(UnderDevelopmentGate, { onUnlock: () => setIsPreview(true) });
  }

  if (currentRoute === 'admin') {
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#0F0D15] text-white">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#8366B0] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs uppercase tracking-widest text-[#A19DAA]">Loading Management Portal...</p>
            </div>
          </div>
        }
      >
        <AdminPortal
          onReturnToStore={() => {
            window.location.hash = '';
            if (window.location.pathname.startsWith('/vj-manage-x1126')) {
              window.history.pushState(null, '', '/');
            }
            setCurrentRoute('store');
          }}
        />
      </React.Suspense>
    );
  }

  if (currentRoute.startsWith('policy-')) {
    const policyTab = currentRoute.replace('policy-', '') || 'shipping';
    return (
      <PolicyPage
        initialTab={policyTab}
        onNavigateTab={(tab) => {
          const slugMap = {
            shipping: 'shipping-policy',
            refund: 'refund-policy',
            privacy: 'privacy-policy',
            terms: 'terms-and-conditions',
          };
          const slug = slugMap[tab] || 'shipping-policy';
          window.history.pushState(null, '', `/${slug}`);
          window.location.hash = `#${slug}`;
          setCurrentRoute(`policy-${tab}`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onReturnToStore={() => {
          window.history.pushState(null, '', '/');
          window.location.hash = '';
          setCurrentRoute('store');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  if (currentRoute === 'faqs') {
    return (
      <FaqPage
        onReturnToStore={() => {
          window.history.pushState(null, '', '/');
          window.location.hash = '';
          setCurrentRoute('store');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigatePolicy={(tab) => {
          const slugMap = {
            shipping: 'shipping-policy',
            refund: 'refund-policy',
            privacy: 'privacy-policy',
            terms: 'terms-and-conditions',
          };
          const slug = slugMap[tab] || 'shipping-policy';
          window.history.pushState(null, '', `/${slug}`);
          window.location.hash = `#${slug}`;
          setCurrentRoute(`policy-${tab}`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  if (currentRoute === '404') {
    return (
      <NotFoundPage
        onNavigateHome={() => {
          window.history.pushState(null, '', '/');
          window.location.hash = '';
          setCurrentRoute('store');
        }}
        onSelectCategory={(catSlug) => {
          setInitialCategory(catSlug);
          window.history.pushState(null, '', '/');
          window.location.hash = '#catalog';
          setCurrentRoute('store');
        }}
        onSearch={(query) => {
          setInitialSearchQuery(query);
          window.history.pushState(null, '', '/');
          window.location.hash = '#catalog';
          setCurrentRoute('store');
        }}
      />
    );
  }

  return (
    <SiteContentProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            {isPreview && React.createElement(DevPreviewFloatingBadge, {
              onLock: () => {
                try { localStorage.removeItem('vj_preview_mode'); } catch (e) {}
                setIsPreview(false);
              }
            })}
            <StorefrontContent
              initialCategory={initialCategory}
              initialSearchQuery={initialSearchQuery}
              onOpenAdmin={() => {
                window.location.hash = '#vj-manage-x1126';
                setCurrentRoute('admin');
              }}
              onOpenPolicy={(tab) => {
                const slugMap = {
                  shipping: 'shipping-policy',
                  refund: 'refund-policy',
                  privacy: 'privacy-policy',
                  terms: 'terms-and-conditions',
                };
                const slug = slugMap[tab] || 'shipping-policy';
                window.history.pushState(null, '', `/${slug}`);
                window.location.hash = `#${slug}`;
                setCurrentRoute(`policy-${tab}`);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenFaqs={() => {
                window.history.pushState(null, '', '/faqs');
                window.location.hash = '#faqs';
                setCurrentRoute('faqs');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </SiteContentProvider>
  );
}
