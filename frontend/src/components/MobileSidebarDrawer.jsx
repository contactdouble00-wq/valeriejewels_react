import React, { useEffect } from 'react';
import {
  X,
  ChevronRight,
  Sparkles,
  Heart,
  Truck,
  User,
  ShieldCheck,
  Flame,
  MessageCircle,
  Tag,
  Gift,
  ArrowRight,
  FileText,
  RotateCcw,
  HelpCircle
} from 'lucide-react';

export default function MobileSidebarDrawer({
  isOpen,
  onClose,
  categories = [],
  selectedCategory = 'all',
  onSelectCategory,
  openWishlist,
  wishlistCount = 0,
  openTracking,
  openAuthModal,
  isAuthenticated = false,
  user = null,
  onOpenPolicy,
  onOpenFaqs,
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCategoryClick = (catSlug) => {
    if (onSelectCategory) {
      onSelectCategory(catSlug);
    }
    onClose();
  };

  const handleScrollToSection = (sectionId) => {
    onClose();
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
      />

      {/* Slide-out Sidebar Drawer from Left */}
      <div className="fixed inset-y-0 left-0 max-w-full flex pr-10">
        <div className="w-[85vw] max-w-sm bg-white shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-out">
          
          {/* Top Section: Brand Header */}
          <div className="p-4 border-b border-brand-border/70 flex items-center justify-between bg-brand-surface/60">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onClose();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center space-x-2"
            >
              <img
                src="/valerie.png"
                alt="VALERIÉ"
                className="h-5 w-auto object-contain"
              />
            </a>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-brand-surface hover:bg-brand-primary-light border border-brand-border/60 flex items-center justify-center text-brand-tertiary hover:text-brand-primary transition-colors"
              aria-label="Close navigation menu"
            >
              <X className="w-4 h-4 stroke-[2]" />
            </button>
          </div>

          {/* Scrollable Navigation Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

            {/* 1. Viral Hero Feature: 4 Jhumka Boxes Spotlight (Everlasting Top Feature Style) */}
            <div
              onClick={() => {
                handleCategoryClick('jhumka-boxes');
                handleScrollToSection('jhumka-boxes');
              }}
              className="group p-3 rounded-2xl bg-gradient-to-r from-[#FAF4FF] to-[#FFF0F5] border border-brand-primary/20 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-xs">
                  <Flame className="w-4 h-4 fill-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-sans text-xs font-bold text-brand-tertiary group-hover:text-brand-primary transition-colors">
                      The 4 Jhumka Boxes
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-bold bg-rose-500 text-white leading-none">
                      BESTSELLER
                    </span>
                  </div>
                  <p className="text-[10.5px] text-brand-muted font-light mt-0.5">
                    Curated sets • Anti-tarnish gold polish
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-brand-primary group-hover:translate-x-0.5 transition-transform" />
            </div>

            {/* 2. Main Jewelry Collections Menu (Clean Plus Jakarta Sans, Normal Spacing) */}
            <div className="space-y-1">
              <div className="px-3 pb-1.5 text-[10.5px] font-caps uppercase tracking-wider text-brand-muted/80 font-bold">
                Collections
              </div>

              {/* All Jewelry */}
              <button
                onClick={() => handleCategoryClick('all')}
                className={`w-full px-3 py-2.5 rounded-xl text-left font-sans text-sm font-semibold flex items-center justify-between transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-brand-primary-light text-brand-primary font-bold'
                    : 'text-brand-tertiary hover:bg-brand-surface hover:text-brand-primary'
                }`}
              >
                <span>All Everyday Jewelry</span>
                <ChevronRight className="w-4 h-4 text-brand-muted/50" />
              </button>

              {/* Dynamic Categories */}
              {categories
                .filter((c) => c.slug !== 'jhumka-boxes')
                .map((cat) => {
                  const isSelected = selectedCategory === cat.slug;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.slug)}
                      className={`w-full px-3 py-2.5 rounded-xl text-left font-sans text-sm font-semibold flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-brand-primary-light text-brand-primary font-bold'
                          : 'text-brand-tertiary hover:bg-brand-surface hover:text-brand-primary'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <ChevronRight className="w-4 h-4 text-brand-muted/50" />
                    </button>
                  );
                })}

              {/* Combo Duos Special Feature */}
              <button
                onClick={() => {
                  onClose();
                  handleScrollToSection('combos');
                }}
                className="w-full px-3 py-2.5 rounded-xl text-left font-sans text-sm font-semibold text-brand-primary hover:bg-brand-primary-light/50 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center space-x-2">
                  <Gift className="w-4 h-4 text-brand-primary" />
                  <span>Curated Combo Sets</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300/60">
                  SAVE UP TO 45%
                </span>
              </button>
            </div>

            {/* 3. Account & Orders Section (Clean D2C Utility List) */}
            <div className="pt-3 border-t border-brand-border/70 space-y-1">
              <div className="px-3 pb-1.5 text-[10.5px] font-caps uppercase tracking-wider text-brand-muted/80 font-bold">
                My Valerie Vault
              </div>

              {/* Wishlist */}
              <button
                onClick={() => {
                  onClose();
                  if (openWishlist) openWishlist();
                }}
                className="w-full px-3 py-2.5 rounded-xl text-left font-sans text-sm font-medium text-brand-tertiary hover:bg-brand-surface hover:text-brand-primary flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'text-rose-500 fill-rose-500' : 'text-brand-primary'}`} />
                  <span>Saved Pieces</span>
                </div>
                {wishlistCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-primary text-white">
                    {wishlistCount} saved
                  </span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-brand-muted/50" />
                )}
              </button>

              {/* Order Tracking */}
              <button
                onClick={() => {
                  onClose();
                  if (openTracking) openTracking();
                }}
                className="w-full px-3 py-2.5 rounded-xl text-left font-sans text-sm font-medium text-brand-tertiary hover:bg-brand-surface hover:text-brand-primary flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <Truck className="w-4 h-4 text-brand-primary" />
                  <span>Track Order</span>
                </div>
                <span className="text-[10px] text-brand-muted font-light">Shiprocket</span>
              </button>

              {/* Customer Account */}
              <button
                onClick={() => {
                  onClose();
                  if (openAuthModal) openAuthModal('login');
                }}
                className="w-full px-3 py-2.5 rounded-xl text-left font-sans text-sm font-medium text-brand-tertiary hover:bg-brand-surface hover:text-brand-primary flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <User className="w-4 h-4 text-brand-primary" />
                  <span>{isAuthenticated ? user?.name || 'My Account' : 'Sign In / Register'}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-brand-muted/50" />
              </button>
            </div>

            {/* 4. Customer Policies & Legal Section */}
            <div className="pt-3 border-t border-brand-border/70 space-y-1">
              <div className="px-3 pb-1.5 text-[10.5px] font-caps uppercase tracking-wider text-brand-muted/80 font-bold">
                Policies &amp; Legal
              </div>

              {/* Shipping & Delivery */}
              <button
                onClick={() => {
                  onClose();
                  if (onOpenPolicy) onOpenPolicy('shipping');
                }}
                className="w-full px-3 py-2 rounded-xl text-left font-sans text-xs font-medium text-brand-tertiary hover:bg-brand-surface hover:text-brand-primary flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <Truck className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Shipping &amp; Delivery</span>
                </div>
                <span className="text-[10px] text-brand-primary font-bold">5-7 Days</span>
              </button>

              {/* Returns & Refunds */}
              <button
                onClick={() => {
                  onClose();
                  if (onOpenPolicy) onOpenPolicy('refund');
                }}
                className="w-full px-3 py-2 rounded-xl text-left font-sans text-xs font-medium text-brand-tertiary hover:bg-brand-surface hover:text-brand-primary flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <RotateCcw className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Returns &amp; Refunds</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-brand-muted/50" />
              </button>

              {/* Privacy Policy */}
              <button
                onClick={() => {
                  onClose();
                  if (onOpenPolicy) onOpenPolicy('privacy');
                }}
                className="w-full px-3 py-2 rounded-xl text-left font-sans text-xs font-medium text-brand-tertiary hover:bg-brand-surface hover:text-brand-primary flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-3.5 h-3.5 text-brand-muted" />
                  <span>Privacy Policy (DPDP)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-brand-muted/50" />
              </button>

              {/* Terms of Service */}
              <button
                onClick={() => {
                  onClose();
                  if (onOpenPolicy) onOpenPolicy('terms');
                }}
                className="w-full px-3 py-2 rounded-xl text-left font-sans text-xs font-medium text-brand-tertiary hover:bg-brand-surface hover:text-brand-primary flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-3.5 h-3.5 text-brand-muted" />
                  <span>Terms &amp; Conditions</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-brand-muted/50" />
              </button>

              {/* FAQs */}
              <button
                onClick={() => {
                  onClose();
                  if (onOpenFaqs) onOpenFaqs();
                }}
                className="w-full px-3 py-2 rounded-xl text-left font-sans text-xs font-medium text-brand-tertiary hover:bg-brand-surface hover:text-brand-primary flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <HelpCircle className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Frequently Asked Questions</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-brand-muted/50" />
              </button>
            </div>

          </div>

          {/* Bottom Footer: Reassurance & Direct WhatsApp Support (Like Everlasting) */}
          <div className="p-4 border-t border-brand-border bg-brand-surface/80 space-y-3">
            {/* WhatsApp Quick Assistance */}
            <a
              href="https://wa.me/917016347945"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600 fill-emerald-600/20" />
              <span>Customer Care: +91 70163 47945</span>
            </a>

            {/* Quality Seals */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-brand-muted font-light pt-1">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                <span>18K PVD Anti-Tarnish</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Free Delivery Across India</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
