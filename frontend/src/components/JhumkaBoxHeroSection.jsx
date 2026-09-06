import React, { useState } from 'react';
import { Sparkles, ShoppingBag, Eye, Star, Flame, ShieldCheck, Gift, Check, Copy, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSiteContent } from '../context/SiteContentContext';
import { useWishlist } from '../context/WishlistContext';

export default function JhumkaBoxHeroSection({ products = [], onOpenPdp, onOpenCheckout }) {
  const { addToCart } = useCart();
  const { content } = useSiteContent();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [copiedCode, setCopiedCode] = useState(false);
  const jHero = content?.jhumkaHero || {};

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('VALERIE10');
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

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
    <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-b from-[#FAF6FD] via-[#F6F0FC] to-[#FAF7FD] border border-brand-primary/25 sm:border-2 sm:border-brand-primary/20 p-3 sm:p-8 lg:p-12 shadow-md sm:shadow-luxury space-y-4 sm:space-y-8">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-brand-gold/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Hero Ad Header Banner */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-6 border-b border-brand-border/60 pb-4 sm:pb-6">
        <div className="space-y-2 sm:space-y-3 max-w-2xl">
          {/* Badge */}
          <div className="inline-flex max-w-full items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1 rounded-full bg-brand-primary text-white text-[9.5px] sm:text-[11px] font-caps uppercase tracking-wide sm:tracking-[0.16em] shadow-sm">
            <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand-gold animate-pulse shrink-0" />
            <span className="font-bold whitespace-normal leading-tight text-left">
              {jHero.badgeText || '#1 Ad Bestseller Collection • 12,000+ Delivered'}
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-editorial font-bold text-brand-tertiary tracking-tight leading-[1.12]">
            {jHero.titleLine1 || 'The 4 Signature'} <br className="sm:hidden" />
            <span className="italic font-light sm:font-normal text-brand-primary">{jHero.titleLine2 || 'Jhumka Treasure Boxes'}</span>
          </h2>

          <p className="text-xs sm:text-sm text-brand-muted font-light leading-relaxed">
            {jHero.subtitle || 'Our most viral handcrafted collections. Each box brings 5 to 6 curated jhumka pairs inside a luxury keepsake box with anti-tarnish micro gold polish and lightweight comfort.'}
          </p>
        </div>

        {/* Mobile-Specific Micro Feature Strip (Compact & High Impact) */}
        <div className="grid grid-cols-3 gap-1.5 pt-1 sm:hidden w-full">
          <div className="bg-white/90 backdrop-blur-xs px-2 py-1.5 rounded-xl border border-brand-primary/15 text-center shadow-2xs flex flex-col items-center justify-center">
            <Gift className="w-3.5 h-3.5 text-brand-primary mb-0.5 shrink-0" />
            <span className="text-[10px] font-bold text-brand-tertiary leading-tight">5–6 Pairs</span>
            <span className="text-[8px] text-brand-muted">Per Box</span>
          </div>
          <div className="bg-white/90 backdrop-blur-xs px-2 py-1.5 rounded-xl border border-brand-primary/15 text-center shadow-2xs flex flex-col items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mb-0.5 shrink-0" />
            <span className="text-[10px] font-bold text-brand-tertiary leading-tight">Zero Earache</span>
            <span className="text-[8px] text-brand-muted">Featherlight</span>
          </div>
          <div className="bg-white/90 backdrop-blur-xs px-2 py-1.5 rounded-xl border border-brand-primary/15 text-center shadow-2xs flex flex-col items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-brand-gold mb-0.5 shrink-0" />
            <span className="text-[10px] font-bold text-brand-tertiary leading-tight">Save 50%</span>
            <span className="text-[8px] text-brand-muted">vs Singles</span>
          </div>
        </div>

        {/* Desktop Feature Badges (Preserved Exactly) */}
        <div className="hidden sm:flex sm:flex-col gap-2.5 text-xs text-brand-tertiary font-medium shrink-0">
          <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-brand-border shadow-2xs">
            <Gift className="w-4 h-4 text-brand-primary shrink-0" />
            <span>{jHero.pill1 || '5–6 Curated Pairs Per Box'}</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-brand-border shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{jHero.pill2 || 'Zero Earache • Featherlight'}</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-brand-border shadow-2xs">
            <Sparkles className="w-4 h-4 text-brand-gold shrink-0" />
            <span>{jHero.pill3 || 'Save up to 50% vs Single Pairs'}</span>
          </div>
        </div>
      </div>

      {/* The 4 Jhumka Boxes Showcase Grid: 2 columns on Mobile, 4 columns on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 relative z-10">
        {jhumkaBoxes.slice(0, 4).map((box, idx) => {
          const wishlisted = isInWishlist(box.id);
          const discount = Math.round(((Number(box.mrp) - Number(box.price)) / Number(box.mrp)) * 100);
          const pairsMatch = box.name.match(/(\d+)\s*Pair/i);
          const pairsNumber = pairsMatch ? Number(pairsMatch[1]) : 6;
          const pairsCount = `${pairsNumber} Pairs Inside`;
          const pricePerPair = Math.round(Number(box.price) / pairsNumber);

          return (
            <div
              key={box.id}
              className="group luxury-card bg-white rounded-2xl overflow-hidden border border-brand-border/90 hover:border-brand-primary/50 transition-all duration-300 hover:shadow-luxury-hover flex flex-col justify-between relative shadow-2xs sm:shadow-sm"
            >
              {/* Badges on Image */}
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 flex flex-col gap-1 items-start pointer-events-none">
                <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[8.5px] sm:text-[10px] font-caps tracking-wider uppercase font-bold bg-brand-primary text-white shadow-sm flex items-center space-x-1">
                  <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white text-white" />
                  <span>Box #{idx + 1}</span>
                </span>
                {/* Prominently visible pairs count badge on mobile and desktop */}
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold bg-white/95 text-brand-primary border border-brand-primary/20 shadow-xs backdrop-blur-xs">
                  {pairsCount}
                </span>
                {discount > 0 && (
                  <span className="bg-rose-500 text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                    -{discount}%
                  </span>
                )}
              </div>

              {/* Floating Wishlist Heart Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWishlist(box);
                }}
                aria-label={wishlisted ? "Remove from saved pieces" : "Save to wishlist"}
                title={wishlisted ? "Saved" : "Add to wishlist"}
                className={`absolute top-2 right-2 sm:top-3 sm:right-3 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                  wishlisted
                    ? 'bg-white text-rose-500 shadow-md scale-105'
                    : 'bg-white/85 backdrop-blur-sm text-brand-tertiary/70 hover:text-rose-500 hover:bg-white hover:scale-110 shadow-sm'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${wishlisted ? 'fill-rose-500 stroke-rose-500' : 'stroke-[1.8]'}`} />
              </button>

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

                {/* Mobile Trust & Per-Pair Value Overlay on Image */}
                <div className="sm:hidden absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-1.5 pt-3 flex items-center justify-between text-white text-[8.5px]">
                  <span className="flex items-center space-x-0.5 text-amber-300 font-bold">
                    <Star className="w-2.5 h-2.5 fill-amber-300" />
                    <span>4.9</span>
                    <span className="text-white/80 font-normal">(1.2k)</span>
                  </span>
                  <span className="text-white font-bold bg-white/20 backdrop-blur-xs px-1.5 py-0.5 rounded text-[8px]">
                    ₹{pricePerPair}/pair
                  </span>
                </div>

                {/* Desktop hover overlay */}
                <div className="absolute inset-0 bg-brand-tertiary/10 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center">
                  <span className="px-3 py-1.5 rounded-xl bg-white/95 text-brand-tertiary text-xs font-semibold shadow-md flex items-center space-x-1.5 transform translate-y-2 group-hover:translate-y-0 transition-all">
                    <Eye className="w-3.5 h-3.5 text-brand-primary" />
                    <span>View Box & Pairs</span>
                  </span>
                </div>
              </div>

              {/* Details & Action */}
              <div className="p-2 sm:p-4 lg:p-5 flex-1 flex flex-col justify-between space-y-2 sm:space-y-4">
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="text-[8.5px] sm:text-[10px] font-caps tracking-widest uppercase text-brand-primary font-bold flex items-center space-x-1">
                    <Sparkles className="w-2.5 h-2.5 text-brand-gold shrink-0 sm:hidden" />
                    <span>Signature Gift Box</span>
                  </div>
                  <h3
                    onClick={() => onOpenPdp && onOpenPdp(box.slug)}
                    className="font-sans text-xs sm:text-[14.5px] font-semibold text-brand-tertiary line-clamp-2 hover:text-brand-primary cursor-pointer leading-snug"
                    title={box.name}
                  >
                    {box.name}
                  </h3>
                  <p className="hidden sm:block text-[11px] text-brand-muted line-clamp-2 font-light leading-relaxed">
                    {box.short_description}
                  </p>
                </div>

                {/* Pricing & CTA */}
                <div className="space-y-2 sm:space-y-3 pt-1.5 sm:pt-2 border-t border-brand-border/60">
                  <div className="flex flex-wrap items-baseline justify-between sm:justify-start gap-1 sm:gap-2">
                    <div className="flex items-baseline space-x-1 sm:space-x-1.5">
                      <span className="text-sm sm:text-lg font-bold text-brand-tertiary">
                        ₹{Number(box.price).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] sm:text-xs text-brand-muted line-through">
                        ₹{Number(box.mrp).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <span className="text-[8.5px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                      Save ₹{(Number(box.mrp) - Number(box.price)).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Mobile High-Impact Full-Width Button */}
                  <div className="sm:hidden pt-0.5">
                    <button
                      onClick={() => addToCart(box)}
                      className="w-full py-2 px-2 rounded-xl bg-gradient-to-r from-brand-primary via-[#6C3E8A] to-brand-primary hover:opacity-95 active:scale-[0.97] text-white text-[10.5px] font-caps tracking-wider uppercase font-bold shadow-xs flex items-center justify-center space-x-1.5 transition-all"
                    >
                      <ShoppingBag className="w-3 h-3 shrink-0" />
                      <span>ADD BOX</span>
                    </button>
                  </div>

                  {/* Desktop Actions (Preserved Exactly) */}
                  <div className="hidden sm:flex items-center gap-1.5 pt-0.5">
                    <button
                      onClick={() => onOpenPdp && onOpenPdp(box.slug)}
                      className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-white border border-brand-border hover:border-brand-primary text-brand-tertiary text-[11px] font-semibold transition-colors flex items-center justify-center shrink-0"
                      title="View Details"
                      aria-label="View Details"
                    >
                      <Eye className="w-3.5 h-3.5 text-brand-primary" />
                      <span className="ml-1">Details</span>
                    </button>
                    <button
                      onClick={() => addToCart(box)}
                      className="flex-1 py-2 px-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-[11px] font-caps tracking-wider uppercase font-bold transition-all shadow-sm flex items-center justify-center space-x-1"
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

      {/* Ad Guarantee Callout Footer (Interactive Voucher on Mobile) */}
      <div className="relative z-10 bg-white/95 backdrop-blur-xs rounded-2xl p-3 sm:p-4 border border-brand-primary/20 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 text-xs text-brand-tertiary shadow-2xs">
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0"></div>
            <span className="font-semibold text-[11px] sm:text-xs text-emerald-900">
              Buy 2 Boxes → Extra 10% Off with Code <span className="font-bold text-brand-primary">VALERIE10</span>
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className="sm:hidden px-2 py-1 rounded-lg bg-brand-primary-light text-brand-primary text-[10px] font-bold border border-brand-primary/25 flex items-center space-x-1 shrink-0 active:scale-95 transition-all"
            title="Copy promo code"
          >
            {copiedCode ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="text-brand-muted text-[10px] sm:text-[11px] flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-1.5 sm:pt-0 border-brand-border/60">
          <span>✨ Free Luxury Keepsake Box</span>
          <span>•</span>
          <span>🚀 Express Dispatch in 24h</span>
        </div>
      </div>
    </section>
  );
}
