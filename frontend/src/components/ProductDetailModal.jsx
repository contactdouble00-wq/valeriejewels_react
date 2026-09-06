import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  ShieldCheck,
  Truck,
  Sparkles,
  ShoppingBag,
  Check,
  Heart,
  ChevronRight,
  Share2,
  ArrowLeft
} from 'lucide-react';
import { apiService } from '../services/api';
import { SEED_PRODUCTS } from '../data/seedCatalog';
import { useWishlist } from '../context/WishlistContext';

export default function ProductDetailModal({ productSlug, initialProduct, onClose, onAddToCart }) {
  const { isInWishlist, toggleWishlist } = useWishlist();

  // Find synchronous fallback from seed catalog to prevent empty screen or loading jump
  const fallbackProduct = initialProduct || SEED_PRODUCTS.find((p) => p.slug === productSlug) || null;

  const [product, setProduct] = useState(fallbackProduct);
  const [loading, setLoading] = useState(!fallbackProduct);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(fallbackProduct?.variants?.[0] || null);
  const [addedNotice, setAddedNotice] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const wishlisted = isInWishlist(product?.id);

  // Sync state when productSlug changes or when initialProduct is passed
  useEffect(() => {
    if (initialProduct) {
      setProduct(initialProduct);
      if (initialProduct.variants && initialProduct.variants.length > 0) {
        setSelectedVariant(initialProduct.variants[0]);
      }
      setLoading(false);
    } else {
      const found = SEED_PRODUCTS.find((p) => p.slug === productSlug);
      if (found) {
        setProduct(found);
        if (found.variants && found.variants.length > 0) {
          setSelectedVariant(found.variants[0]);
        }
        setLoading(false);
      }
    }
  }, [productSlug, initialProduct]);

  // Fetch full details from API in the background
  useEffect(() => {
    let isMounted = true;
    async function loadDetail() {
      if (!fallbackProduct) {
        setLoading(true);
      }
      try {
        const data = await apiService.getProductDetail(productSlug);
        if (isMounted && data) {
          setProduct(data);
          if (data.variants && data.variants.length > 0) {
            setSelectedVariant((prev) => {
              if (prev) {
                const match = data.variants.find((v) => v.id === prev.id);
                return match || data.variants[0];
              }
              return data.variants[0];
            });
          }
        }
      } catch (err) {
        if (isMounted && !fallbackProduct) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (productSlug) {
      loadDetail();
    }
    return () => {
      isMounted = false;
    };
  }, [productSlug]);

  // Lock background body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // ESC key listener for desktop
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!productSlug) return null;

  const handleAdd = () => {
    if (!product) return;
    if (onAddToCart) {
      onAddToCart(product, selectedVariant);
    }
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2200);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#product-${product?.slug || productSlug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name || 'Valerie Jewels',
          text: `Check out ${product?.name} at Valerie Jewels:`,
          url: shareUrl,
        });
      } catch {
        // Silent cancel
      }
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2200);
    }
  };

  const activePrice = selectedVariant?.price || product?.price || 0;
  const activeMrp = selectedVariant?.mrp || product?.mrp || 0;
  const images =
    product?.images && product.images.length > 0
      ? product.images
      : [
          {
            image_url:
              product?.primary_image ||
              'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
            alt_text: product?.name,
          },
        ];

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. MOBILE FULL-SCREEN PDP EXPERIENCE (< md screens)                      */}
      {/* 3-tier architecture: Pinned Header, Momentum Scroll Body, Pinned Footer   */}
      {/* ========================================================================= */}
      <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
        
        {/* Sticky Mobile Header */}
        <header className="shrink-0 h-14 bg-white/95 backdrop-blur-md border-b border-brand-border px-4 flex items-center justify-between z-20">
          <button
            onClick={onClose}
            className="flex items-center space-x-1.5 py-2 px-2 -ml-2 text-brand-tertiary hover:text-brand-primary active:scale-95 transition-all"
            aria-label="Back to catalog"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
            <span className="text-xs font-semibold">Back</span>
          </button>

          {/* Center Brand Logo */}
          <img
            src="/valerie.png"
            alt="VALERIÉ"
            className="h-6 w-auto object-contain"
          />

          {/* Action Cluster (Share + Wishlist) */}
          <div className="flex items-center space-x-1 -mr-1">
            <button
              onClick={handleShare}
              className="p-2 text-brand-tertiary hover:text-brand-primary active:scale-90 transition-all rounded-full"
              title="Share piece"
              aria-label="Share product"
            >
              <Share2 className="w-4 h-4 stroke-[1.8]" />
            </button>
            <button
              onClick={() => product && toggleWishlist(product)}
              className={`p-2 rounded-full transition-all active:scale-90 ${
                wishlisted ? 'text-rose-500' : 'text-brand-tertiary hover:text-brand-primary'
              }`}
              title={wishlisted ? 'Saved' : 'Save to Wishlist'}
              aria-label="Wishlist toggle"
            >
              <Heart className={`w-4 h-4 ${wishlisted ? 'fill-rose-500 stroke-rose-500' : 'stroke-[1.8]'}`} />
            </button>
          </div>
        </header>

        {/* Scrollable Body Content */}
        {loading && !product ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-12">
            <div className="w-10 h-10 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
            <p className="text-xs font-caps uppercase tracking-wider text-brand-muted">Loading Piece Details...</p>
          </div>
        ) : error && !product ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
            <p className="text-sm text-red-600 font-semibold">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-brand-primary text-white text-xs font-caps uppercase tracking-wider font-bold rounded-xl shadow-md"
            >
              Return to Catalog
            </button>
          </div>
        ) : product ? (
          <div className="flex-1 overflow-y-auto overscroll-contain">
            
            {/* Edge-to-Edge Hero Image Stage */}
            <div className="relative w-full aspect-square bg-[#FAF7FC] overflow-hidden">
              <img
                src={images[selectedImage]?.image_url || product.primary_image}
                alt={images[selectedImage]?.alt_text || product.name}
                className="w-full h-full object-cover object-center transition-all duration-300"
              />

              {/* Badges Overlay */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
                {product.discount_percentage > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-600 text-white shadow-sm w-fit">
                    {product.discount_percentage}% OFF
                  </span>
                )}
                {Boolean(product.is_bestseller) && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-caps uppercase tracking-wider font-bold bg-brand-tertiary text-white shadow-sm w-fit">
                    Best Seller
                  </span>
                )}
                {Boolean(product.is_anti_tarnish) && (
                  <span className="px-2 py-0.5 rounded-full text-[8.5px] font-caps uppercase tracking-wider font-semibold bg-white/95 text-brand-tertiary shadow-sm flex items-center gap-1 w-fit">
                    <ShieldCheck className="w-3 h-3 text-brand-primary" />
                    18K Anti-Tarnish
                  </span>
                )}
              </div>

              {/* Photo Indicator Dot Pills */}
              {images.length > 1 && (
                <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-mono font-medium tracking-wider">
                  {selectedImage + 1} / {images.length}
                </div>
              )}
            </div>

            {/* Horizontal Thumbnail Selector Track */}
            {images.length > 1 && (
              <div className="flex items-center gap-2.5 px-4 py-3 overflow-x-auto bg-brand-surface border-b border-brand-border/60">
                {images.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      selectedImage === idx
                        ? 'border-brand-primary ring-2 ring-brand-primary/20 scale-105'
                        : 'border-brand-border opacity-70'
                    }`}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Product Body Information */}
            <div className="px-4 py-5 space-y-5 pb-6">
              
              {/* Category & Rating */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-caps uppercase tracking-[0.16em] text-brand-primary font-bold">
                  {product.category_name || 'Everyday Luxury'}
                </span>
                <div className="flex items-center space-x-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                  <span className="text-xs text-brand-muted ml-1 font-medium">
                    ({product.rating_summary?.reviews_count || 120} reviews)
                  </span>
                </div>
              </div>

              {/* Title */}
              <h1 className="font-sans text-xl font-bold text-brand-tertiary leading-snug">
                {product.name}
              </h1>

              {/* Price Row */}
              <div className="flex items-baseline space-x-2.5 pb-4 border-b border-brand-border/80">
                <span className="text-2xl font-bold text-brand-tertiary">
                  ₹{Math.round(activePrice).toLocaleString('en-IN')}
                </span>
                {activeMrp > activePrice && (
                  <span className="text-sm text-brand-muted line-through font-light">
                    ₹{Math.round(activeMrp).toLocaleString('en-IN')}
                  </span>
                )}
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Free Express Shipping
                </span>
              </div>

              {/* Variant Selector (if variants exist) */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-caps uppercase tracking-wider font-bold text-brand-tertiary">
                      Select {product.variants[0]?.option1_name || 'Finish / Size'}:
                    </span>
                    <span className="text-brand-primary font-semibold">
                      {selectedVariant?.option1_value || selectedVariant?.title}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id;

                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${
                            isSelected
                              ? 'border-brand-primary bg-brand-primary-light text-brand-primary font-bold shadow-sm'
                              : 'border-brand-border bg-white text-brand-tertiary hover:border-brand-primary/40'
                          }`}
                        >
                          {v.option1_value || v.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Material & Craftsmanship Specification Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-brand-surface to-[#F9F5FD] border border-brand-border/90 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-caps uppercase tracking-wider text-brand-tertiary font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Quality Specification</span>
                  </span>
                  <span className="text-[10px] font-semibold text-brand-primary bg-brand-primary-light px-2 py-0.5 rounded">
                    100% Anti-Tarnish
                  </span>
                </div>
                <p className="text-xs text-brand-tertiary font-medium">
                  {product.material || '18K Gold Plated 316L Stainless Steel'}
                </p>
                <p className="text-[11px] text-brand-muted font-light leading-relaxed">
                  Engineered with Physical Vapor Deposition (PVD) vacuum coating. Waterproof, shower-safe, and perfume-proof with zero green skin residue.
                </p>
              </div>

              {/* Description Content */}
              <div className="space-y-1.5 text-xs text-brand-tertiary/90 leading-relaxed font-light">
                <div className="font-caps uppercase tracking-wider text-brand-muted text-[10px] font-bold">
                  About This Piece
                </div>
                <p>{product.description || product.short_description}</p>
              </div>

              {/* Value & Reassurance Pillars */}
              <div className="grid grid-cols-1 gap-2 pt-2 border-t border-brand-border/70 text-xs">
                <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-brand-surface border border-brand-border/60">
                  <Truck className="w-4 h-4 text-brand-primary shrink-0" />
                  <div>
                    <span className="font-semibold text-brand-tertiary block text-[11.5px]">Shiprocket Express Delivery</span>
                    <span className="text-[10px] text-brand-muted font-light">Dispatched within 24 hours with real-time SMS updates.</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-brand-surface border border-brand-border/60">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-brand-tertiary block text-[11.5px]">Lifetime Color Guarantee</span>
                    <span className="text-[10px] text-brand-muted font-light">Guaranteed not to fade, rust, or tarnish through daily wear.</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Mobile Link Copied Toast */}
            {copiedNotice && (
              <div className="fixed top-16 inset-x-4 z-40 bg-brand-tertiary text-white text-xs px-4 py-2.5 rounded-xl text-center shadow-2xl animate-fade-in">
                Link copied to clipboard! ✨
              </div>
            )}

          </div>
        ) : null}

        {/* Mobile Pinned Bottom CTA Bar */}
        {product && (
          <div className="shrink-0 bg-white/95 backdrop-blur-md border-t border-brand-border p-3 flex items-center gap-2.5 shadow-lg z-20">
            <button
              onClick={() => toggleWishlist(product)}
              className={`p-3 rounded-xl border transition-all shrink-0 ${
                wishlisted
                  ? 'border-rose-300 bg-rose-50 text-rose-500'
                  : 'border-brand-border text-brand-tertiary hover:text-rose-500 bg-white'
              }`}
              title={wishlisted ? 'Saved' : 'Save'}
              aria-label="Save piece"
            >
              <Heart className={`w-5 h-5 ${wishlisted ? 'fill-rose-500 stroke-rose-500' : 'stroke-[1.8]'}`} />
            </button>

            <button
              onClick={handleAdd}
              className="flex-1 py-3.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.98] text-white text-xs font-caps tracking-widest uppercase font-bold shadow-md transition-all flex items-center justify-center space-x-2"
            >
              {addedNotice ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Added to Bag!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Bag • ₹{Math.round(activePrice).toLocaleString('en-IN')}</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP FLOATING POPUP MODAL (>= md screens)                           */}
      {/* Centered luxury modal popup with backdrop blur as requested by the user   */}
      {/* ========================================================================= */}
      <div 
        onClick={onClose}
        className="hidden md:flex fixed inset-0 z-50 overflow-y-auto bg-brand-tertiary/60 backdrop-blur-sm items-center justify-center p-6 animate-fade-in"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-brand-border flex flex-col max-h-[90vh]"
        >
          {/* Modal Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/90 hover:bg-brand-surface text-brand-tertiary hover:text-brand-primary transition-all border border-brand-border shadow-sm hover:scale-105"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 stroke-[1.8]" />
          </button>

          {loading && !product ? (
            <div className="p-16 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
              <p className="text-xs font-caps uppercase tracking-wider text-brand-muted">Loading Jewelry Details...</p>
            </div>
          ) : error && !product ? (
            <div className="p-12 text-center space-y-3">
              <p className="text-sm text-red-600 font-semibold">{error}</p>
              <button onClick={onClose} className="px-4 py-2 bg-brand-primary text-white text-xs rounded-xl">
                Close Window
              </button>
            </div>
          ) : product ? (
            <div className="overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12">
              
              {/* Left Column: Gallery */}
              <div className="md:col-span-6 p-6 sm:p-8 bg-[#FAF7FC] flex flex-col justify-between border-r border-brand-border">
                <div className="space-y-4">
                  {/* Main Selected Image */}
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-sm border border-brand-border flex items-center justify-center">
                    <img
                      src={images[selectedImage]?.image_url || product.primary_image}
                      alt={images[selectedImage]?.alt_text || product.name}
                      className="w-full h-full object-cover object-center transition-all duration-300"
                    />
                    {product.discount_percentage > 0 && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shadow-sm">
                        {product.discount_percentage}% OFF
                      </span>
                    )}
                    {Boolean(product.is_anti_tarnish) && (
                      <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-caps uppercase tracking-wider font-semibold bg-white/90 text-brand-tertiary backdrop-blur-sm shadow-sm flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />
                        100% Anti-Tarnish
                      </span>
                    )}
                  </div>

                  {/* Thumbnails Row */}
                  {images.length > 1 && (
                    <div className="flex items-center gap-3 overflow-x-auto pb-1">
                      {images.map((img, idx) => (
                        <button
                          key={img.id || idx}
                          onClick={() => setSelectedImage(idx)}
                          className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                            selectedImage === idx
                              ? 'border-brand-primary ring-2 ring-brand-primary/20'
                              : 'border-brand-border opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Guarantees Strip */}
                <div className="pt-6 grid grid-cols-2 gap-3 text-[11px] text-brand-muted">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-brand-primary shrink-0" />
                    <span>Lifetime Color Guarantee</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-brand-primary shrink-0" />
                    <span>Shiprocket Express 2–4 Days</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Product Info & Actions */}
              <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  
                  {/* Category & Ratings (with pr-12 to prevent overlap with top-right X button) */}
                  <div className="flex items-center justify-between pr-12">
                    <span className="text-xs font-caps uppercase tracking-[0.2em] text-brand-primary font-bold">
                      {product.category_name}
                    </span>
                    <div className="flex items-center space-x-1 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                      <span className="text-xs text-brand-muted ml-1 font-medium">
                        ({product.rating_summary?.reviews_count || 120} reviews)
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="font-sans text-xl sm:text-2xl font-bold text-brand-tertiary leading-snug">
                    {product.name}
                  </h2>

                  {/* Pricing Block */}
                  <div className="flex items-baseline space-x-3 pb-2 border-b border-brand-border">
                    <span className="text-2xl font-bold text-brand-tertiary">
                      ₹{Math.round(activePrice).toLocaleString('en-IN')}
                    </span>
                    {activeMrp > activePrice && (
                      <span className="text-sm text-brand-muted line-through font-light">
                        ₹{Math.round(activeMrp).toLocaleString('en-IN')}
                      </span>
                    )}
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Free Express Delivery
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-brand-muted font-light leading-relaxed">
                    {product.description || product.short_description}
                  </p>

                  {/* Material Specification */}
                  <div className="p-3.5 rounded-xl bg-[#FAF7FC] border border-brand-border space-y-1">
                    <span className="text-[10px] font-caps uppercase tracking-wider text-brand-tertiary font-bold block">
                      Material Specification
                    </span>
                    <p className="text-xs text-brand-tertiary font-medium">
                      {product.material || '18K Gold Plated 316L Stainless Steel'}
                    </p>
                    <p className="text-[11px] text-brand-muted font-light">
                      Safe for water, perfume, and daily wear without discoloration.
                    </p>
                  </div>

                  {/* Variants Selection */}
                  {product.variants && product.variants.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-caps uppercase tracking-wider font-bold text-brand-tertiary">
                          Select {product.variants[0]?.option1_name || 'Size'}:
                        </span>
                        <span className="text-brand-primary font-medium">
                          {selectedVariant?.option1_value || selectedVariant?.title}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {product.variants.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVariant(v)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                              selectedVariant?.id === v.id
                                ? 'border-brand-primary bg-brand-primary-light text-brand-primary font-bold shadow-sm'
                                : 'border-brand-border hover:border-brand-primary/40 text-brand-tertiary'
                            }`}
                          >
                            {v.option1_value || v.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop Action Buttons */}
                <div className="pt-4 border-t border-brand-border space-y-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handleAdd}
                      className="flex-1 py-3 px-6 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold shadow-md hover:shadow-luxury-hover transition-all flex items-center justify-center space-x-2"
                    >
                      {addedNotice ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-300" />
                          <span>Added to Bag!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4" />
                          <span>Add to Bag • ₹{Math.round(activePrice).toLocaleString('en-IN')}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => toggleWishlist(product)}
                      aria-label={wishlisted ? 'Remove from saved pieces' : 'Save to wishlist'}
                      title={wishlisted ? 'In Wishlist' : 'Save to Wishlist'}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-center shrink-0 ${
                        wishlisted
                          ? 'border-rose-200 bg-rose-50 text-rose-500 shadow-sm scale-105'
                          : 'border-brand-border hover:border-brand-primary text-brand-tertiary/80 hover:text-rose-500 bg-white'
                      }`}
                    >
                      <Heart className={`w-5 h-5 transition-colors ${wishlisted ? 'fill-rose-500 stroke-rose-500' : 'stroke-[1.75]'}`} />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
