import React from 'react';
import { Sparkles, ShoppingBag, Eye, Star, Flame, ShieldCheck, Gift, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSiteContent } from '../context/SiteContentContext';

export default function JhumkaBoxHeroSection({ products = [], onOpenPdp, onOpenCheckout }) {
  const { addToCart } = useCart();
  const { content } = useSiteContent();
  const jHero = content?.jhumkaHero || {};

  // Filter for the 4 Jhumka Boxes
  const jhumkaBoxes = products.filter(
    (p) =>
      p.category_slug === 'jhumka-boxes' ||
      (p.sku && p.sku.startsWith('VJ-JHM')) ||
      (p.name && p.name.toLowerCase().includes('jhumka box'))
  );

  if (!jhumkaBoxes || jhumkaBoxes.length === 0) {
    return null;
  }

  return (
    <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-b from-[#FAF6FD] via-[#F6F0FC] to-[#FAF7FD] border-2 border-brand-primary/20 p-3.5 sm:p-8 lg:p-12 shadow-luxury space-y-6 sm:space-y-8">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-brand-gold/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Hero Ad Header Banner */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 border-b border-brand-border/60 pb-5 sm:pb-6">
        <div className="space-y-2 sm:space-y-3 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-primary text-white text-[10px] sm:text-[11px] font-caps uppercase tracking-[0.16em] sm:tracking-[0.18em] shadow-sm">
            <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand-gold animate-pulse shrink-0" />
            <span className="font-bold truncate">{jHero.badgeText || '#1 Ad Bestseller Collection • 12,000+ Delivered'}</span>
          </div>

          <h2 className="text-xl sm:text-4xl lg:text-5xl font-editorial font-bold text-brand-tertiary tracking-tight leading-tight">
            {jHero.titleLine1 || 'The 4 Signature'} <br />
            <span className="italic font-normal text-brand-primary">{jHero.titleLine2 || 'Jhumka Treasure Boxes'}</span>
          </h2>

          <p className="text-xs sm:text-sm text-brand-muted font-light leading-relaxed">
            {jHero.subtitle || 'Our most viral handcrafted collections. Each box brings 5 to 6 curated jhumka pairs inside a luxury keepsake box with anti-tarnish micro gold polish and lightweight comfort.'}
          </p>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap sm:flex-col gap-2 sm:gap-2.5 text-[11px] sm:text-xs text-brand-tertiary font-medium">
          <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-xs px-3 sm:px-3.5 py-1.5 rounded-xl border border-brand-border shadow-2xs">
            <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-primary shrink-0" />
            <span>{jHero.pill1 || '5–6 Curated Pairs Per Box'}</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-xs px-3 sm:px-3.5 py-1.5 rounded-xl border border-brand-border shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
            <span>{jHero.pill2 || 'Zero Earache • Featherlight'}</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-xs px-3 sm:px-3.5 py-1.5 rounded-xl border border-brand-border shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-gold shrink-0" />
            <span>{jHero.pill3 || 'Save up to 50% vs Single Pairs'}</span>
          </div>
        </div>
      </div>

      {/* The 4 Jhumka Boxes Showcase Grid: 2 columns on Mobile, 4 columns on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6 relative z-10">
        {jhumkaBoxes.slice(0, 4).map((box, idx) => {
          const discount = Math.round(((Number(box.mrp) - Number(box.price)) / Number(box.mrp)) * 100);
          const pairsMatch = box.name.match(/(\d+)\s*Pair/i);
          const pairsCount = pairsMatch ? `${pairsMatch[1]} Pairs Inside` : 'Multi-Pair Box';

          return (
            <div
              key={box.id}
              className="group luxury-card bg-white rounded-2xl overflow-hidden border border-brand-border hover:border-brand-primary/50 transition-all duration-300 hover:shadow-luxury-hover flex flex-col justify-between relative"
            >
              {/* Top Bestseller Badge */}
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 flex flex-col gap-1">
                <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-caps tracking-wider uppercase font-bold bg-brand-primary text-white shadow-sm flex items-center space-x-1">
                  <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white text-white" />
                  <span>Box #{idx + 1}</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-primary-light text-brand-primary border border-brand-primary/30">
                  {pairsCount}
                </span>
              </div>

              {/* Discount Ribbon */}
              {discount > 0 && (
                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 bg-rose-500 text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-sm">
                  {discount}% OFF
                </div>
              )}

              {/* Box Image */}
              <div
                onClick={() => onOpenPdp && onOpenPdp(box.slug)}
                className="relative aspect-square overflow-hidden bg-brand-primary-light/20 cursor-pointer"
              >
                <img
                  src={box.primary_image || 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80'}
                  alt={box.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-brand-tertiary/10 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center">
                  <span className="px-3 py-1.5 rounded-xl bg-white/95 text-brand-tertiary text-xs font-semibold shadow-md flex items-center space-x-1.5 transform translate-y-2 group-hover:translate-y-0 transition-all">
                    <Eye className="w-3.5 h-3.5 text-brand-primary" />
                    <span>View Box & Pairs</span>
                  </span>
                </div>
              </div>

              {/* Details & Action */}
              <div className="p-2.5 sm:p-4 lg:p-5 flex-1 flex flex-col justify-between space-y-2 sm:space-y-4">
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="text-[9px] sm:text-[10px] font-caps tracking-widest uppercase text-brand-primary font-bold">
                    Signature Gift Box
                  </div>
                  <h3
                    onClick={() => onOpenPdp && onOpenPdp(box.slug)}
                    className="font-editorial text-xs sm:text-base lg:text-lg font-bold text-brand-tertiary line-clamp-2 hover:text-brand-primary cursor-pointer leading-tight sm:leading-snug"
                    title={box.name}
                  >
                    {box.name}
                  </h3>
                  <p className="hidden sm:block text-[11px] text-brand-muted line-clamp-2 font-light leading-relaxed">
                    {box.short_description}
                  </p>
                </div>

                {/* Pricing & CTA */}
                <div className="space-y-2 sm:space-y-3 pt-2 border-t border-brand-border/60">
                  <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
                    <span className="text-sm sm:text-lg font-editorial font-bold text-brand-tertiary">
                      ₹{Number(box.price).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] sm:text-xs text-brand-muted line-through">
                      ₹{Number(box.mrp).toLocaleString('en-IN')}
                    </span>
                    <span className="hidden sm:inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Save ₹{(Number(box.mrp) - Number(box.price)).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      onClick={() => onOpenPdp && onOpenPdp(box.slug)}
                      className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-white border border-brand-border hover:border-brand-primary text-brand-tertiary text-[11px] font-semibold transition-colors flex items-center justify-center shrink-0"
                      title="View Details"
                      aria-label="View Details"
                    >
                      <Eye className="w-3.5 h-3.5 text-brand-primary" />
                      <span className="hidden sm:inline ml-1">Details</span>
                    </button>
                    <button
                      onClick={() => {
                        addToCart(box);
                      }}
                      className="flex-1 py-2 px-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-[10px] sm:text-[11px] font-caps tracking-wider uppercase font-bold transition-all shadow-sm flex items-center justify-center space-x-1"
                    >
                      <ShoppingBag className="w-3 h-3 shrink-0" />
                      <span className="truncate">Add Box</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ad Guarantee Callout Footer */}
      <div className="relative z-10 bg-white/90 backdrop-blur-xs rounded-2xl p-4 border border-brand-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-brand-tertiary">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
          <span className="font-semibold text-emerald-800">
            Ad Special: Buy 2 Jhumka Boxes & Get Extra 10% Off with Code <span className="underline font-bold text-brand-primary">VALERIE10</span>
          </span>
        </div>
        <div className="text-brand-muted text-[11px]">
          Free Luxury Packaging + Express Dispatch in 24h
        </div>
      </div>
    </section>
  );
}
