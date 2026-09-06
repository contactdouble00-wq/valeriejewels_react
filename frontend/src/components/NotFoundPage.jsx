import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Search,
  Compass,
  Home,
  ShoppingBag,
  Flame,
  MessageCircle,
  Phone,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export default function NotFoundPage({ onNavigateHome, onSelectCategory, onSearch }) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    } else if (onNavigateHome) {
      onNavigateHome();
      window.location.hash = '#catalog';
    }
  };

  const categories = [
    { name: 'Jhumka Boxes', slug: 'jhumka-boxes', desc: 'Viral 4 Signature Boxes', badge: 'Bestseller' },
    { name: 'Necklaces', slug: 'necklaces', desc: 'Everyday Pendants & Chokers' },
    { name: 'Earrings', slug: 'earrings', desc: 'Waterproof Huggies & Drops' },
    { name: 'Rings', slug: 'rings', desc: 'Stackable Bands & Solitaires' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFBFE] text-brand-tertiary antialiased">
      {/* Top Editorial Luxury Ribbon */}
      <div className="bg-[#FAF7FC] border-b border-brand-border text-brand-tertiary text-[11px] font-medium py-2 px-4 text-center tracking-widest uppercase flex items-center justify-center space-x-2">
        <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
        <span>Valerie Jewels Concierge • Need Assistance? WhatsApp +91 70163 47945</span>
      </div>

      {/* Brand Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-brand-border px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={onNavigateHome}
            className="flex items-center space-x-2 group text-left focus:outline-hidden"
          >
            <span className="font-serif tracking-[0.2em] font-bold text-lg sm:text-xl text-brand-tertiary group-hover:text-brand-primary transition-colors">
              VALERIE JEWELS
            </span>
          </button>

          <button
            onClick={onNavigateHome}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-caps tracking-wider uppercase font-semibold hover:bg-brand-primary-hover shadow-sm transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Boutique</span>
          </button>
        </div>
      </header>

      {/* Main 404 Hero Experience */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16 max-w-4xl mx-auto w-full text-center space-y-8">
        {/* Animated Visual Gem Badge */}
        <div className="relative inline-flex items-center justify-center">
          {/* Ambient background glows */}
          <div className="absolute w-44 h-44 sm:w-56 sm:h-56 bg-brand-primary/10 rounded-full blur-2xl animate-pulse pointer-events-none"></div>
          <div className="absolute w-32 h-32 bg-brand-gold/15 rounded-full blur-xl pointer-events-none"></div>

          <div className="relative z-10 w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-tr from-[#FAF6FD] via-white to-[#F5EDFD] border-2 border-brand-primary/25 shadow-luxury flex flex-col items-center justify-center space-y-1">
            <Compass className="w-10 h-10 sm:w-12 sm:h-12 text-brand-primary animate-spin-slow" />
            <div className="flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
              <span className="text-[10px] font-caps uppercase tracking-widest text-brand-muted font-bold">Lost Gem</span>
            </div>
          </div>
        </div>

        {/* 404 Numerical & Editorial Typography */}
        <div className="space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[11px] font-caps uppercase tracking-[0.2em] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-ping"></span>
            <span>Error 404 • Destination Unreachable</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-editorial font-bold text-brand-tertiary tracking-tight leading-tight">
            This Piece Seems to Have <br />
            <span className="italic font-normal text-brand-primary">Wandered Out of Sight</span>
          </h1>

          <p className="text-xs sm:text-sm text-brand-muted font-light leading-relaxed max-w-lg mx-auto">
            The page or curated collection you requested may have been moved, renamed, or retired. Let us guide you back to our sparkling fine jewelry collection.
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-md mx-auto">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="w-4 h-4 text-brand-muted absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jhumka boxes, necklaces, earrings..."
              className="w-full bg-white border border-brand-border rounded-2xl py-3 pl-11 pr-24 text-xs text-brand-tertiary placeholder:text-brand-muted/70 focus:outline-none focus:border-brand-primary shadow-xs transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1.5 px-4 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-[11px] font-caps tracking-wider uppercase font-bold rounded-xl transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              if (onNavigateHome) onNavigateHome();
              window.location.hash = '';
            }}
            className="px-6 py-3 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold shadow-md hover:shadow-luxury-hover transition-all flex items-center space-x-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Explore Entire Boutique</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (onNavigateHome) onNavigateHome();
              if (onSelectCategory) onSelectCategory('jhumka-boxes');
              window.location.hash = '#jhumka-boxes';
            }}
            className="px-5 py-3 rounded-xl bg-white border border-brand-border text-brand-tertiary hover:border-brand-primary hover:text-brand-primary text-xs font-caps tracking-wider uppercase font-semibold shadow-2xs transition-colors flex items-center space-x-2"
          >
            <Flame className="w-3.5 h-3.5 text-brand-gold" />
            <span>Shop 4 Viral Jhumka Boxes</span>
          </button>
        </div>

        {/* Curated Category Exploration Grid */}
        <div className="w-full pt-6 border-t border-brand-border/60">
          <div className="text-center mb-4">
            <span className="text-[10px] font-caps uppercase tracking-[0.2em] text-brand-muted font-bold">
              Popular Collections
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => {
                  if (onNavigateHome) onNavigateHome();
                  if (onSelectCategory) onSelectCategory(cat.slug);
                  window.location.hash = `#catalog`;
                }}
                className="p-3.5 rounded-2xl bg-white border border-brand-border hover:border-brand-primary/50 hover:shadow-luxury transition-all group relative text-left"
              >
                {cat.badge && (
                  <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold text-[9px] font-bold uppercase tracking-wider">
                    {cat.badge}
                  </span>
                )}
                <div className="font-editorial font-bold text-sm text-brand-tertiary group-hover:text-brand-primary transition-colors flex items-center justify-between">
                  <span>{cat.name}</span>
                  <ChevronRight className="w-3 h-3 text-brand-muted group-hover:text-brand-primary transition-colors" />
                </div>
                <p className="text-[10px] text-brand-muted mt-0.5 font-light leading-tight">
                  {cat.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Concierge & Personal Assistance */}
        <div className="w-full p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#FAF7FC] to-[#F5EFFC] border border-brand-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-brand-primary text-white shadow-xs">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-editorial font-bold text-brand-tertiary">
                Can't find a specific piece or link?
              </h4>
              <p className="text-[11px] text-brand-muted font-light mt-0.5">
                Our bespoke styling team is on WhatsApp 7 days a week from 8:00 AM – 4:00 PM.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href="https://wa.me/917016347945"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-caps tracking-wider uppercase font-semibold flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Us</span>
            </a>
            <a
              href="tel:+919023422392"
              className="px-3.5 py-2 rounded-xl bg-white border border-brand-border hover:border-brand-primary text-brand-tertiary text-[11px] font-caps tracking-wider uppercase font-semibold flex items-center space-x-1.5 shadow-2xs transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Us</span>
            </a>
          </div>
        </div>
      </main>

      {/* Simple Luxury Footer */}
      <footer className="border-t border-brand-border bg-white py-6 px-4 text-center text-xs text-brand-muted space-y-2">
        <div className="flex items-center justify-center space-x-6 text-[11px] uppercase tracking-wider text-brand-muted">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />
            <span>100% Anti-Tarnish</span>
          </span>
          <span>•</span>
          <span>Shower-Safe & Waterproof</span>
          <span>•</span>
          <span>Pan-India Insured Dispatch</span>
        </div>
        <p className="text-[11px] text-brand-muted/70">
          © {new Date().getFullYear()} VALERIE JEWELS. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
