import React from 'react';
import { Sparkles, ShoppingBag, Eye, Star, Flame, ShieldCheck, Gift, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function JhumkaBoxHeroSection({ products = [], onOpenPdp, onOpenCheckout }) {
  const { addToCart } = useCart();

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
    <section className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#FAF6FD] via-[#F6F0FC] to-[#FAF7FD] border-2 border-brand-primary/20 p-6 sm:p-10 lg:p-12 shadow-luxury space-y-8">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-brand-gold/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Hero Ad Header Banner */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-brand-border/60 pb-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-brand-primary text-white text-[11px] font-caps uppercase tracking-[0.18em] shadow-sm">
            <Flame className="w-3.5 h-3.5 text-brand-gold animate-pulse" />
            <span className="font-bold">#1 Ad Bestseller Collection • 12,000+ Delivered</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-editorial font-bold text-brand-tertiary tracking-tight leading-tight">
            The 4 Signature <br />
            <span className="italic font-normal text-brand-primary">Jhumka Treasure Boxes</span>
          </h2>

          <p className="text-xs sm:text-sm text-brand-muted font-light leading-relaxed">
            Our most viral handcrafted collections. Each box brings 5 to 6 curated jhumka pairs inside a luxury keepsake box with anti-tarnish micro gold polish and lightweight comfort.
          </p>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap sm:flex-col gap-2.5 text-xs text-brand-tertiary font-medium">
          <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-brand-border shadow-2xs">
            <Gift className="w-4 h-4 text-brand-primary" />
            <span>5–6 Curated Pairs Per Box</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-brand-border shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero Earache • Featherlight</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-brand-border shadow-2xs">
            <Sparkles className="w-4 h-4 text-brand-gold" />
            <span>Save up to 50% vs Single Pairs</span>
          </div>
        </div>
      </div>

      {/* The 4 Jhumka Boxes Showcase Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
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
              <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-caps tracking-wider uppercase font-bold bg-brand-primary text-white shadow-sm flex items-center space-x-1">
                  <Star className="w-3 h-3 fill-white text-white" />
                  <span>Box #{idx + 1}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-primary-light text-brand-primary border border-brand-primary/30">
                  {pairsCount}
                </span>
              </div>

              {/* Discount Ribbon */}
              {discount > 0 && (
                <div className="absolute top-3 right-3 z-10 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
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
                <div className="absolute inset-0 bg-brand-tertiary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="px-3 py-1.5 rounded-xl bg-white/95 text-brand-tertiary text-xs font-semibold shadow-md flex items-center space-x-1.5 transform translate-y-2 group-hover:translate-y-0 transition-all">
                    <Eye className="w-3.5 h-3.5 text-brand-primary" />
                    <span>View Box & Pairs</span>
                  </span>
                </div>
              </div>

              {/* Details & Action */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-caps tracking-widest uppercase text-brand-primary font-bold">
                    Signature Gift Box
                  </div>
                  <h3
                    onClick={() => onOpenPdp && onOpenPdp(box.slug)}
                    className="font-editorial text-base sm:text-lg font-bold text-brand-tertiary line-clamp-2 hover:text-brand-primary cursor-pointer leading-snug"
                    title={box.name}
                  >
                    {box.name}
                  </h3>
                  <p className="text-[11px] text-brand-muted line-clamp-2 font-light leading-relaxed">
                    {box.short_description}
                  </p>
                </div>

                {/* Pricing & CTA */}
                <div className="space-y-3 pt-2 border-t border-brand-border/60">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-lg font-editorial font-bold text-brand-tertiary">
                      ₹{Number(box.price).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-brand-muted line-through">
                      ₹{Number(box.mrp).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Save ₹{(Number(box.mrp) - Number(box.price)).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onOpenPdp && onOpenPdp(box.slug)}
                      className="px-2.5 py-2 rounded-xl bg-white border border-brand-border hover:border-brand-primary text-brand-tertiary text-[11px] font-semibold transition-colors flex items-center justify-center space-x-1"
                    >
                      <Eye className="w-3 h-3 text-brand-primary" />
                      <span>Details</span>
                    </button>
                    <button
                      onClick={() => {
                        addToCart(box);
                      }}
                      className="px-2.5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-[11px] font-caps tracking-wider uppercase font-bold transition-all shadow-sm flex items-center justify-center space-x-1"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      <span>Add Box</span>
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
