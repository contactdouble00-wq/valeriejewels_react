import React, { useState } from 'react';
import { Sparkles, ShoppingBag, Eye, Star, Flame, ShieldCheck, Gift, Check, Copy, Heart, ExternalLink } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSiteContent } from '../context/SiteContentContext';
import { useWishlist } from '../context/WishlistContext';
import { OriginalAmazonLogo, DEFAULT_AMAZON_STORE_URL } from './AmazonTrustBadge';

const DEFAULT_STRIP = {
  enabled: true,
  showPulseDot: true,
  pulseDotColor: 'emerald',
  promoPrefix: 'Buy 2 or More → Extra 10% Off with Code',
  couponCode: 'VALERIE10',
  copyButtonText: 'Copy',
  perk1Text: '✨ Free Luxury Keepsake Box',
  perk1Enabled: true,
  separator: '•',
  perk2Text: '🚀 Express Dispatch in 24h',
  perk2Enabled: true,
  perk3Text: '',
  perk3Enabled: false,
};

export default function JhumkaBoxHeroSection({ products = [], onOpenPdp, onOpenCheckout }) {
  const { addToCart } = useCart();
  const { content } = useSiteContent();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [copiedCode, setCopiedCode] = useState(false);
  const jHero = content?.jhumkaHero || {};
  const strip = { ...DEFAULT_STRIP, ...(jHero.guaranteeStrip || {}) };

  // Header element visibility checks (strictly driven by Admin Panel; hidden if empty)
  const hasBadge = Boolean(jHero.badgeText?.trim());
  const hasTitle1 = Boolean(jHero.titleLine1?.trim());
  const hasTitle2 = Boolean(jHero.titleLine2?.trim());
  const hasTitle = hasTitle1 || hasTitle2;
  const hasSubtitle = Boolean(jHero.subtitle?.trim());
  const hasPill1 = Boolean(jHero.pill1?.trim());
  const hasPill2 = Boolean(jHero.pill2?.trim());
  const hasPill3 = Boolean(jHero.pill3?.trim());
  const showAmazon = content?.amazonStore?.enabled !== false;
  const hasDesktopBadges = hasPill1 || hasPill2 || hasPill3 || showAmazon;
  const hasMobileBadges = hasPill1 || hasPill2 || hasPill3;
  const hasHeaderContent = hasBadge || hasTitle || hasSubtitle || hasDesktopBadges || hasMobileBadges;

  // Guarantee strip visibility checks (hidden if empty)
  const hasOfferPrefix = Boolean(strip.promoPrefix?.trim());
  const hasCouponCode = Boolean(strip.couponCode?.trim());
  const hasLeftOffer = hasOfferPrefix || hasCouponCode;
  const hasPerk1 = strip.perk1Enabled !== false && Boolean(strip.perk1Text?.trim());
  const hasPerk2 = strip.perk2Enabled !== false && Boolean(strip.perk2Text?.trim());
  const hasPerk3 = Boolean(strip.perk3Enabled) && Boolean(strip.perk3Text?.trim());
  const hasPerks = hasPerk1 || hasPerk2 || hasPerk3;
  const hasStripContent = hasLeftOffer || hasPerks;

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(strip.couponCode || 'VALERIE10');
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const getDotClass = (color) => {
    switch (color) {
      case 'gold':
        return 'bg-amber-500';
      case 'purple':
        return 'bg-purple-600';
      case 'rose':
        return 'bg-rose-500';
      default:
        return 'bg-emerald-500';
    }
  };

  const getTextColorClass = (color) => {
    switch (color) {
      case 'gold':
        return 'text-amber-950';
      case 'purple':
        return 'text-purple-950';
      case 'rose':
        return 'text-rose-950';
      default:
        return 'text-emerald-900';
    }
  };

  // Any product passed in as a bestseller
  const displayProducts = Array.isArray(products) && products.length > 0 ? products : [];

  if (!displayProducts || displayProducts.length === 0) {
    return null;
  }

  return (
    <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-b from-[#FAF6FD] via-[#F6F0FC] to-[#FAF7FD] border border-brand-primary/25 sm:border-2 sm:border-brand-primary/20 p-3 sm:p-8 lg:p-12 shadow-md sm:shadow-luxury space-y-4 sm:space-y-8">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-brand-gold/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Hero Ad Header Banner (Driven directly by Admin Panel; hidden if empty) */}
      {hasHeaderContent && (
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-6 border-b border-brand-border/60 pb-4 sm:pb-6">
          {(hasBadge || hasTitle || hasSubtitle) && (
            <div className="space-y-2 sm:space-y-3 max-w-2xl">
              {/* Badge */}
              {hasBadge && (
                <div className="inline-flex max-w-full items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1 rounded-full bg-brand-primary text-white text-[9.5px] sm:text-[11px] font-caps uppercase tracking-wide sm:tracking-[0.16em] shadow-sm">
                  <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand-gold animate-pulse shrink-0" />
                  <span className="font-bold whitespace-normal leading-tight text-left">
                    {jHero.badgeText.trim()}
                  </span>
                </div>
              )}

              {/* Heading */}
              {hasTitle && (
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-editorial font-bold text-brand-tertiary tracking-tight leading-[1.12]">
                  {hasTitle1 && <span>{jHero.titleLine1.trim()}</span>}
                  {hasTitle1 && hasTitle2 && (
                    <>
                      {' '}
                      <br className="sm:hidden" />
                    </>
                  )}
                  {hasTitle2 && (
                    <span className="italic font-light sm:font-normal text-brand-primary">
                      {jHero.titleLine2.trim()}
                    </span>
                  )}
                </h2>
              )}

              {/* Subtitle */}
              {hasSubtitle && (
                <p className="text-xs sm:text-sm text-brand-muted font-light leading-relaxed">
                  {jHero.subtitle.trim()}
                </p>
              )}
            </div>
          )}

          {/* Mobile Micro Feature Strip (Only if pills are configured in admin) */}
          {hasMobileBadges && (() => {
            const mobilePills = [
              hasPill1 ? { icon: Gift, text: jHero.pill1.trim(), iconColor: 'text-brand-primary' } : null,
              hasPill2 ? { icon: ShieldCheck, text: jHero.pill2.trim(), iconColor: 'text-emerald-600' } : null,
              hasPill3 ? { icon: Sparkles, text: jHero.pill3.trim(), iconColor: 'text-brand-gold' } : null,
            ].filter(Boolean);

            const gridColsClass = mobilePills.length === 1 ? 'grid-cols-1' : mobilePills.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

            return (
              <div className={`grid ${gridColsClass} gap-1.5 pt-1 sm:hidden w-full`}>
                {mobilePills.map((pill, pIdx) => {
                  const IconComp = pill.icon;
                  return (
                    <div key={pIdx} className="bg-white/90 backdrop-blur-xs px-2 py-1.5 rounded-xl border border-brand-primary/15 text-center shadow-2xs flex flex-col items-center justify-center">
                      <IconComp className={`w-3.5 h-3.5 ${pill.iconColor} mb-0.5 shrink-0`} />
                      <span className="text-[9.5px] font-bold text-brand-tertiary leading-tight line-clamp-2">{pill.text}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Desktop Feature Badges */}
          {hasDesktopBadges && (
            <div className="hidden sm:flex sm:flex-col gap-2.5 text-xs text-brand-tertiary font-medium shrink-0">
              {hasPill1 && (
                <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-brand-border shadow-2xs">
                  <Gift className="w-4 h-4 text-brand-primary shrink-0" />
                  <span>{jHero.pill1.trim()}</span>
                </div>
              )}
              {hasPill2 && (
                <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-brand-border shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{jHero.pill2.trim()}</span>
                </div>
              )}
              {hasPill3 && (
                <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-brand-border shadow-2xs">
                  <Sparkles className="w-4 h-4 text-brand-gold shrink-0" />
                  <span>{jHero.pill3.trim()}</span>
                </div>
              )}
              {showAmazon && (
                <a
                  href={content?.amazonStore?.url || DEFAULT_AMAZON_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between space-x-2 bg-gradient-to-r from-amber-50/70 to-white hover:from-amber-100/70 px-3.5 py-1.5 rounded-xl border border-amber-200/80 hover:border-amber-400 shadow-2xs transition-all group cursor-pointer"
                  title="Also Available on Amazon India (HOUSE OF VJ)"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-[10.5px] text-brand-muted font-light">Also on</span>
                    <div className="bg-white px-2 py-0.5 rounded border border-amber-200/60 shadow-2xs flex items-center">
                      <OriginalAmazonLogo className="h-2.5 w-auto" />
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-brand-muted group-hover:text-brand-primary transition-colors" />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* The Bestsellers Showcase Grid: 2 cols on Mobile, up to 4 cols on Desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 relative z-10">
        {displayProducts.map((box, idx) => {
          const wishlisted = isInWishlist(box.id);
          const discount = Math.round(((Number(box.mrp) - Number(box.price)) / Number(box.mrp)) * 100);
          const pairsMatch = box.name?.match(/(\d+)\s*Pair/i);
          const pairsNumber = Number(box.pairs_count) || (pairsMatch ? Number(pairsMatch[1]) : 0);
          const pairsSuffix = jHero.pairsBadgeSuffix || 'Pairs Inside';
          const pairsCount = pairsNumber > 0 ? `${pairsNumber} ${pairsSuffix}` : null;
          const pricePerPair = pairsNumber > 0 ? Math.round(Number(box.price) / pairsNumber) : null;

          return (
            <div
              key={box.id}
              className="group luxury-card bg-white rounded-2xl overflow-hidden border border-brand-border/90 hover:border-brand-primary/50 transition-all duration-300 hover:shadow-luxury-hover flex flex-col justify-between relative shadow-2xs sm:shadow-sm"
            >


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

              {/* Product Image: 1:1 Balanced Square Ratio */}
              <div
                onClick={() => onOpenPdp && onOpenPdp(box.slug, box)}
                className="relative aspect-square overflow-hidden bg-brand-primary-light/20 cursor-pointer"
              >
                <img
                  src={box.primary_image || 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=800&q=80'}
                  alt={box.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />

                {/* Mobile Rating on Image */}
                <div className="sm:hidden absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-1.5 pt-3 flex items-center text-white text-[8.5px]">
                  <span className="flex items-center space-x-0.5 text-amber-300 font-bold">
                    <Star className="w-2.5 h-2.5 fill-amber-300" />
                    <span>4.9</span>
                  </span>
                </div>

                {/* Desktop hover overlay */}
                <div className="absolute inset-0 bg-brand-tertiary/10 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center">
                  <span className="px-3 py-1.5 rounded-xl bg-white/95 text-brand-tertiary text-xs font-semibold shadow-md flex items-center space-x-1.5 transform translate-y-2 group-hover:translate-y-0 transition-all">
                    <Eye className="w-3.5 h-3.5 text-brand-primary" />
                    <span>View Piece Details</span>
                  </span>
                </div>
              </div>

              {/* Details & Action */}
              <div className="p-2 sm:p-4 lg:p-5 flex-1 flex flex-col justify-between space-y-2 sm:space-y-4">
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="text-[8.5px] sm:text-[10px] font-caps tracking-widest uppercase text-brand-primary font-bold flex items-center space-x-1">
                    <Sparkles className="w-2.5 h-2.5 text-brand-gold shrink-0 sm:hidden" />
                    <span>{box.category_name || 'Curated Signature Set'}</span>
                  </div>
                  <h3
                    onClick={() => onOpenPdp && onOpenPdp(box.slug, box)}
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
                      <span>ADD TO BAG</span>
                    </button>
                  </div>

                  {/* Desktop Actions (Preserved Exactly) */}
                  <div className="hidden sm:flex items-center gap-1.5 pt-0.5">
                    <button
                      onClick={() => onOpenPdp && onOpenPdp(box.slug, box)}
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
                      <span className="truncate">Add to Bag</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ad Guarantee Callout Footer (Interactive Voucher on Mobile; hidden if empty or disabled) */}
      {strip.enabled !== false && hasStripContent && (
        <div className="relative z-10 bg-white/95 backdrop-blur-xs rounded-2xl p-3 sm:p-4 border border-brand-primary/20 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 text-xs text-brand-tertiary shadow-2xs">
          {hasLeftOffer && (
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center space-x-2">
                {strip.showPulseDot !== false && (
                  <div className={`w-2 h-2 rounded-full shrink-0 animate-ping ${getDotClass(strip.pulseDotColor)}`}></div>
                )}
                <span className={`font-semibold text-[11px] sm:text-xs ${getTextColorClass(strip.pulseDotColor)}`}>
                  {hasOfferPrefix && (
                    <span>{strip.promoPrefix.trim()}{hasCouponCode ? ' ' : ''}</span>
                  )}
                  {hasCouponCode && (
                    <span className="font-bold text-brand-primary">{strip.couponCode.trim()}</span>
                  )}
                </span>
              </div>
              {hasCouponCode && (
                <button
                  onClick={handleCopyCode}
                  className="sm:hidden px-2 py-1 rounded-lg bg-brand-primary-light text-brand-primary text-[10px] font-bold border border-brand-primary/25 flex items-center space-x-1 shrink-0 active:scale-95 transition-all cursor-pointer"
                  title={`Copy promo code ${strip.couponCode.trim()}`}
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{strip.copyButtonText || 'Copy'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
          {hasPerks && (
            <div className={`text-brand-muted text-[10px] sm:text-[11px] flex items-center space-x-2 w-full sm:w-auto ${hasLeftOffer ? 'justify-between sm:justify-end border-t sm:border-t-0 pt-1.5 sm:pt-0 border-brand-border/60' : 'justify-center sm:justify-end'}`}>
              {hasPerk1 && (
                <span>{strip.perk1Text.trim()}</span>
              )}
              {hasPerk1 && hasPerk2 && (
                <span>{strip.separator || '•'}</span>
              )}
              {hasPerk2 && (
                <span>{strip.perk2Text.trim()}</span>
              )}
              {hasPerk3 && (
                <>
                  {(hasPerk1 || hasPerk2) && <span>{strip.separator || '•'}</span>}
                  <span>{strip.perk3Text.trim()}</span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
