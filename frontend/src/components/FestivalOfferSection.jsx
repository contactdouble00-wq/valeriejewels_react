import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Clock,
  Copy,
  Check,
  Gift,
  Truck,
  Tag,
  Zap,
  ArrowRight,
  ShoppingBag,
  Eye,
  Percent
} from 'lucide-react';
import { useSiteContent } from '../context/SiteContentContext';

export default function FestivalOfferSection({
  products = [],
  onQuickView,
  onAddToCart,
}) {
  const { content } = useSiteContent();
  const fOffer = content?.festivalOffer || {};

  // If explicitly disabled by admin, don't render anything
  const isEnabled = fOffer.enabled !== false && fOffer.enabled !== 'false' && fOffer.enabled !== 0 && fOffer.enabled !== '0';
  if (!isEnabled) return null;

  // Defaults aligned with Valerie Jewels brand copy
  const badgeText = fOffer.badgeText || '✨ GRAND FESTIVE CELEBRATION • LIMITED EDITION';
  const headline = fOffer.headline || 'The Royal Festive Edit';
  const subtitle = fOffer.subtitle || 'Celebrate auspicious traditions with 18K gold PVD anti-tarnish jewelry. Handcrafted for festivities, weddings, and every luminous moment.';
  const couponCode = fOffer.couponCode || 'FESTIVE20';
  const couponDiscount = fOffer.couponDiscount || 'FLAT 20% OFF';
  const couponDesc = fOffer.couponDescription || 'Applicable on all handcrafted festive jhumka boxes & fine jewelry above ₹999.';
  
  const perk1Title = fOffer.perk1Title || 'Free Velvet Keepsake Box';
  const perk1Desc = fOffer.perk1Desc || 'Luxury royal unboxing packaging included complimentary with all festive orders.';
  const perk2Title = fOffer.perk2Title || 'Extra ₹50 OFF + Free Gift';
  const perk2Desc = fOffer.perk2Desc || 'Instant discount & complimentary zircon necklace on 1-Click Fastrr Prepaid.';
  const perk3Title = fOffer.perk3Title || 'Shiprocket Priority Express';
  const perk3Desc = fOffer.perk3Desc || 'Priority dispatch & insured delivery across 29,000+ Indian pincodes.';

  const countdownEnabled = fOffer.countdownEnabled !== false && fOffer.countdownEnabled !== 'false';
  const countdownEndDate = fOffer.countdownEndDate || '2026-11-15T23:59:59';
  const countdownLabel = fOffer.countdownLabel || 'FESTIVE CELEBRATION OFFERS END IN:';

  // Live countdown state
  const [timeLeft, setTimeLeft] = useState({ days: '00', hours: '00', minutes: '00', seconds: '00' });
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  useEffect(() => {
    if (!countdownEnabled) return;

    const calculateTime = () => {
      const target = new Date(countdownEndDate).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, target - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        days: String(days).padStart(2, '0'),
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [countdownEnabled, countdownEndDate]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(couponCode);
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 2500);
  };

  // Select spotlight items (prefer bestsellers or festive boxes)
  const spotlightProducts = products
    .filter((p) => p.is_bestseller || (p.category_name && p.category_name.toLowerCase().includes('jhumka')) || p.pairs_count)
    .slice(0, 3);
  const displayProducts = spotlightProducts.length >= 2 ? spotlightProducts : products.slice(0, 3);

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-[#C5A25D]/40 bg-gradient-to-br from-[#26153D] via-[#1E0F33] to-[#150A24] text-white p-6 sm:p-10 lg:p-12 animate-fade-in">
      
      {/* Decorative Brand Champagne & Mauve Ambient Halos */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#C5A25D]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#8366B0]/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 space-y-10">
        
        {/* 1. Header & Live Countdown Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-white/10 pb-8">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-[11px] font-caps uppercase tracking-widest font-bold bg-[#C5A25D]/15 text-[#E7CF9B] border border-[#C5A25D]/30 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A25D] animate-pulse" />
              <span>{badgeText}</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-editorial font-bold text-white tracking-wide">
              {headline}
            </h2>
            
            <p className="text-sm sm:text-base text-[#D8CEE8] font-light leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Live Countdown Timer */}
          {countdownEnabled && (
            <div className="bg-white/[0.04] border border-[#C5A25D]/30 backdrop-blur-md rounded-2xl p-4 sm:p-5 flex flex-col items-center sm:items-end space-y-2.5 shrink-0 shadow-lg">
              <span className="text-[10px] font-caps uppercase tracking-wider text-[#E7CF9B] font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#C5A25D]" />
                <span>{countdownLabel}</span>
              </span>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-13 h-14 sm:w-14 sm:h-15 rounded-xl bg-[#180A28] border border-[#C5A25D]/40 flex items-center justify-center font-mono text-xl sm:text-2xl font-extrabold text-[#F2DFB8] shadow-inner">
                    {timeLeft.days}
                  </div>
                  <span className="text-[9px] font-caps tracking-wider text-[#C4B6D8] mt-1">Days</span>
                </div>

                <span className="text-[#C5A25D]/60 font-bold text-lg pb-4">:</span>

                <div className="flex flex-col items-center">
                  <div className="w-13 h-14 sm:w-14 sm:h-15 rounded-xl bg-[#180A28] border border-[#C5A25D]/40 flex items-center justify-center font-mono text-xl sm:text-2xl font-extrabold text-[#F2DFB8] shadow-inner">
                    {timeLeft.hours}
                  </div>
                  <span className="text-[9px] font-caps tracking-wider text-[#C4B6D8] mt-1">Hours</span>
                </div>

                <span className="text-[#C5A25D]/60 font-bold text-lg pb-4">:</span>

                <div className="flex flex-col items-center">
                  <div className="w-13 h-14 sm:w-14 sm:h-15 rounded-xl bg-[#180A28] border border-[#C5A25D]/40 flex items-center justify-center font-mono text-xl sm:text-2xl font-extrabold text-[#F2DFB8] shadow-inner">
                    {timeLeft.minutes}
                  </div>
                  <span className="text-[9px] font-caps tracking-wider text-[#C4B6D8] mt-1">Mins</span>
                </div>

                <span className="text-[#C5A25D]/60 font-bold text-lg pb-4">:</span>

                <div className="flex flex-col items-center">
                  <div className="w-13 h-14 sm:w-14 sm:h-15 rounded-xl bg-[#180A28] border border-[#C5A25D]/40 flex items-center justify-center font-mono text-xl sm:text-2xl font-extrabold text-[#F2DFB8] shadow-inner">
                    {timeLeft.seconds}
                  </div>
                  <span className="text-[9px] font-caps tracking-wider text-[#C4B6D8] mt-1">Secs</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Interactive Festive Voucher Card & 3 Brand Pillars */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Festive Voucher Promo Box */}
          <div className="lg:col-span-1 rounded-2xl p-6 bg-gradient-to-br from-[#2E1848] via-[#24123A] to-[#1A0B2C] border border-[#C5A25D]/40 relative overflow-hidden flex flex-col justify-between shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A25D]/10 rounded-full blur-2xl"></div>

            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-caps uppercase tracking-wider font-bold text-[#E7CF9B] bg-[#C5A25D]/15 px-2.5 py-0.5 rounded-full border border-[#C5A25D]/30">
                  Special Festive Offer
                </span>
                <span className="text-xs font-bold text-[#6EE7B7] flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  <span>{couponDiscount}</span>
                </span>
              </div>

              <div>
                <h3 className="text-xl font-editorial font-bold text-white">
                  Unlock Festive Discount
                </h3>
                <p className="text-xs text-[#D8CEE8] font-light mt-1 leading-relaxed">
                  {couponDesc}
                </p>
              </div>
            </div>

            {/* Coupon Code Strip */}
            <div className="mt-5 pt-4 border-t border-[#C5A25D]/25 flex items-center justify-between gap-3 relative z-10">
              <div className="px-3.5 py-2 bg-[#140822] border border-dashed border-[#C5A25D]/60 rounded-xl font-mono text-base font-black tracking-widest text-[#F2DFB8] select-all">
                {couponCode}
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C5A25D] to-[#B38F49] hover:from-[#D4AF37] hover:to-[#C5A25D] text-[#1F1033] text-xs font-caps tracking-wider uppercase font-bold shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shrink-0"
              >
                {copiedCoupon ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#1F1033]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#1F1033]" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3 Festive Perks Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Perk 1 */}
            <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm flex flex-col justify-between space-y-4 hover:border-[#C5A25D]/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#C5A25D]/15 border border-[#C5A25D]/30 flex items-center justify-center text-[#E7CF9B]">
                <Gift className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">{perk1Title}</h4>
                <p className="text-xs text-[#D8CEE8] font-light leading-relaxed">
                  {perk1Desc}
                </p>
              </div>
              <span className="text-[10px] font-caps uppercase tracking-wider text-[#C5A25D]/90 font-semibold">
                ✓ Included with order
              </span>
            </div>

            {/* Perk 2 */}
            <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm flex flex-col justify-between space-y-4 hover:border-[#C5A25D]/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#C5A25D]/15 border border-[#C5A25D]/30 flex items-center justify-center text-[#E7CF9B]">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">{perk2Title}</h4>
                <p className="text-xs text-[#D8CEE8] font-light leading-relaxed">
                  {perk2Desc}
                </p>
              </div>
              <span className="text-[10px] font-caps uppercase tracking-wider text-emerald-400 font-semibold">
                ⚡ Fastrr 1-Click
              </span>
            </div>

            {/* Perk 3 */}
            <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm flex flex-col justify-between space-y-4 hover:border-[#C5A25D]/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#C5A25D]/15 border border-[#C5A25D]/30 flex items-center justify-center text-[#E7CF9B]">
                <Truck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">{perk3Title}</h4>
                <p className="text-xs text-[#D8CEE8] font-light leading-relaxed">
                  {perk3Desc}
                </p>
              </div>
              <span className="text-[10px] font-caps uppercase tracking-wider text-[#C5A25D]/90 font-semibold">
                ✓ 29,000+ Pincodes
              </span>
            </div>

          </div>
        </div>

        {/* 3. Festive Spotlight Product Showcase */}
        {displayProducts.length > 0 && (
          <div className="space-y-5 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-caps uppercase tracking-widest text-[#E7CF9B] font-bold">
                  Handcrafted For Celebrations
                </span>
                <h3 className="text-xl sm:text-2xl font-editorial font-bold text-white mt-0.5">
                  Festive Spotlight Pieces
                </h3>
              </div>
              <a
                href="#catalog"
                className="text-xs font-semibold text-[#E7CF9B] hover:text-[#C5A25D] flex items-center gap-1 transition-colors"
              >
                <span>View All Jewelry</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayProducts.map((product) => {
                const img = product.primary_image || (product.images && product.images[0]?.image_url) || '/hero-jewelry-model.jpg';
                const discount = product.mrp > product.price
                  ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
                  : 0;

                return (
                  <div
                    key={product.id}
                    className="group relative rounded-2xl bg-white/[0.04] border border-white/10 hover:border-[#C5A25D]/50 p-4 transition-all duration-300 flex flex-col justify-between backdrop-blur-md shadow-md hover:shadow-2xl"
                  >
                    <div>
                      {/* Image Frame */}
                      <div 
                        onClick={() => onQuickView && onQuickView(product)}
                        className="relative aspect-square rounded-xl overflow-hidden bg-black/30 cursor-pointer"
                      >
                        <img
                          src={img}
                          alt={product.name}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                        
                        {/* Festive Badges */}
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start">
                          <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-caps uppercase tracking-wider font-bold bg-[#C5A25D] text-[#1F1033] shadow-sm flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-[#1F1033]" />
                            <span>Festive Pick</span>
                          </span>
                          {product.pairs_count && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/95 text-[#26153D] backdrop-blur-xs shadow-xs">
                              {product.pairs_count} Pairs Inside
                            </span>
                          )}
                        </div>

                        {discount > 0 && (
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-sm">
                            {discount}% OFF
                          </span>
                        )}

                        {/* Quick View Button on Hover */}
                        <button
                          type="button"
                          onClick={() => onQuickView && onQuickView(product)}
                          className="absolute inset-x-3 bottom-3 py-2 rounded-xl bg-white/95 hover:bg-white text-[#26153D] text-xs font-semibold shadow-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-primary" />
                          <span>Quick View & Details</span>
                        </button>
                      </div>

                      {/* Title & Short Details */}
                      <div className="mt-3.5 space-y-1">
                        <h4 
                          onClick={() => onQuickView && onQuickView(product)}
                          className="font-medium text-sm text-white hover:text-[#E7CF9B] transition-colors line-clamp-1 cursor-pointer"
                        >
                          {product.name}
                        </h4>
                        <p className="text-[11px] text-[#D8CEE8] font-light line-clamp-1">
                          {product.short_description || '18K Gold Plated • 100% Anti-Tarnish & Waterproof'}
                        </p>
                      </div>
                    </div>

                    {/* Price & Action */}
                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold text-white">
                            ₹{Math.round(product.price).toLocaleString('en-IN')}
                          </span>
                          {product.mrp > product.price && (
                            <span className="text-xs text-[#C4B6D8]/60 line-through font-light">
                              ₹{Math.round(product.mrp).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-emerald-400 font-semibold block">
                          Save ₹{Math.round((product.mrp || product.price) - product.price)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onAddToCart && onAddToCart(product)}
                        className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#C5A25D] to-[#B38F49] hover:from-[#D4AF37] hover:to-[#C5A25D] text-[#1F1033] text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        title="Add to Bag"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
