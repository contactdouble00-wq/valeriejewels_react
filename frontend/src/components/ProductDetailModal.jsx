import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronLeft,
  Share2,
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Film,
  Zap
} from 'lucide-react';
import { apiService } from '../services/api';
import { SEED_PRODUCTS } from '../data/seedCatalog';
import { useWishlist } from '../context/WishlistContext';

export default function ProductDetailModal({ productSlug, initialProduct, onClose, onAddToCart, onBuyNow }) {
  const { isInWishlist, toggleWishlist } = useWishlist();

  // Find synchronous fallback from seed catalog to prevent empty screen or loading jump
  const fallbackProduct = initialProduct || SEED_PRODUCTS.find((p) => p.slug === productSlug) || null;

  const [product, setProduct] = useState(fallbackProduct);
  const [loading, setLoading] = useState(!fallbackProduct);
  const [error, setError] = useState(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(fallbackProduct?.variants?.[0] || null);
  const [addedNotice, setAddedNotice] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const videoRefMobile = useRef(null);
  const videoRefDesktop = useRef(null);

  // Touch swipe detection for mobile gallery
  const [touchStartX, setTouchStartX] = useState(null);
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };
  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 45 && mediaItems.length > 1) {
      setSelectedMediaIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
    } else if (diff < -45 && mediaItems.length > 1) {
      setSelectedMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
    }
    setTouchStartX(null);
  };

  const wishlisted = isInWishlist(product?.id);

  // Sync state when productSlug changes or when initialProduct is passed
  useEffect(() => {
    setSelectedMediaIndex(0);
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

  const handleBuyNow = () => {
    if (!product) return;
    if (onBuyNow) {
      onBuyNow(product, selectedVariant);
    } else if (onAddToCart) {
      onAddToCart(product, selectedVariant);
    }
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

  // Build unified media items (High-Res 3:4 Images + 9:16 Vertical Video Reels)
  const mediaItems = useMemo(() => {
    let list = [];
    if (product?.images && product.images.length > 0) {
      list = product.images.map((img, idx) => {
        const url = typeof img === 'string' ? img : (img.image_url || img.url);
        const isVideo = img.media_type === 'video' || (typeof url === 'string' && /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url));
        return {
          id: img.id || `media-${idx}`,
          url,
          alt: img.alt_text || product.name,
          type: isVideo ? 'video' : 'image',
          is_primary: img.is_primary ?? (idx === 0 ? 1 : 0),
        };
      });
    } else if (product?.primary_image) {
      list = [
        {
          id: 'primary-0',
          url: product.primary_image,
          alt: product.name,
          type: 'image',
          is_primary: 1,
        },
      ];
    }

    // Seamlessly include product video_url if not already in list
    if (product?.video_url && !list.some((m) => m.url === product.video_url)) {
      const vidObj = {
        id: 'product-reel',
        url: product.video_url,
        alt: `${product.name} Reel Showcase`,
        type: 'video',
        is_primary: 0,
      };
      if (list.length > 1) {
        list.splice(1, 0, vidObj);
      } else {
        list.push(vidObj);
      }
    }

    return list.length > 0
      ? list
      : [
          {
            id: 'fallback-0',
            url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&h=1600&q=85',
            alt: product?.name,
            type: 'image',
            is_primary: 1,
          },
        ];
  }, [product]);

  const activeMedia = mediaItems[selectedMediaIndex] || mediaItems[0];

  const toggleMute = (e) => {
    e?.stopPropagation?.();
    const next = !isMuted;
    setIsMuted(next);
    if (videoRefMobile.current) videoRefMobile.current.muted = next;
    if (videoRefDesktop.current) videoRefDesktop.current.muted = next;
  };

  const togglePlay = (e) => {
    e?.stopPropagation?.();
    const activeVid = videoRefMobile.current || videoRefDesktop.current;
    if (!activeVid) return;
    if (activeVid.paused) {
      activeVid.play();
      setIsPlaying(true);
    } else {
      activeVid.pause();
      setIsPlaying(false);
    }
  };

  // Sync autoplay when switching media slides
  useEffect(() => {
    setIsPlaying(true);
    if (activeMedia?.type === 'video') {
      const timer = setTimeout(() => {
        if (videoRefMobile.current) {
          videoRefMobile.current.currentTime = 0;
          videoRefMobile.current.play().catch(() => {});
        }
        if (videoRefDesktop.current) {
          videoRefDesktop.current.currentTime = 0;
          videoRefDesktop.current.play().catch(() => {});
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [selectedMediaIndex, activeMedia]);

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
            
            {/* Edge-to-Edge Hero Media Stage: 1:1 Square Aspect Ratio */}
            <div className="w-full px-4 pt-3 pb-1 flex flex-col items-center">
              <div 
                className="relative w-full max-w-[400px] sm:max-w-[440px] aspect-square rounded-2xl sm:rounded-3xl overflow-hidden bg-[#FAF7FC] shadow-sm border border-brand-border/60 select-none"
                style={{ aspectRatio: '1 / 1', minHeight: '320px' }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {activeMedia.type === 'video' ? (
                  <div 
                    onClick={togglePlay}
                    className="absolute inset-0 w-full h-full flex items-center justify-center cursor-pointer select-none bg-black overflow-hidden"
                  >
                    {/* Full-bleed Vertical Video Reel that fills the square player */}
                    <video
                      ref={videoRefMobile}
                      src={activeMedia.url}
                      muted={isMuted}
                      autoPlay
                      loop
                      playsInline
                      className="w-full h-full object-cover rounded-2xl"
                    />

                    {/* Floating REEL / Try-on Tag */}
                    <div className="absolute top-3 left-3 z-20 pointer-events-none">
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-caps tracking-wider uppercase font-bold bg-black/60 backdrop-blur-md text-white border border-white/20 flex items-center gap-1 shadow-lg">
                        <Film className="w-3 h-3 text-amber-300" />
                        <span>Live Try-On Reel</span>
                      </span>
                    </div>

                    {/* Audio Mute/Unmute Toggle */}
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="absolute bottom-3 left-3 z-20 p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white transition-all shadow-md active:scale-90"
                      title={isMuted ? 'Unmute video audio' : 'Mute audio'}
                      aria-label="Toggle audio mute"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-white/90" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                    </button>

                    {/* Play/Pause Overlay */}
                    {!isPlaying && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-2xs pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-white/90 text-brand-tertiary flex items-center justify-center shadow-xl">
                          <Play className="w-6 h-6 fill-current ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    onClick={() => setLightboxOpen(true)}
                    className="absolute inset-0 w-full h-full bg-[#FAF7FC] cursor-zoom-in group overflow-hidden flex items-center justify-center"
                  >
                    <img
                      src={activeMedia.url}
                      alt={activeMedia.alt || product.name}
                      className="w-full h-full object-cover object-center transition-all duration-300 select-none"
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

                    {/* Tap to Zoom indicator */}
                    <div className="absolute bottom-3 left-3 px-2 py-1 rounded-full bg-black/50 backdrop-blur-xs text-white text-[9px] flex items-center gap-1 font-medium pointer-events-none">
                      <Maximize2 className="w-3 h-3" />
                      <span>Tap to zoom</span>
                    </div>
                  </div>
                )}

                {/* Left & Right Circular Arrow Buttons (Matching Reference) */}
                {mediaItems.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
                      }}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-brand-tertiary shadow-md flex items-center justify-center border border-brand-border/40 transition-all active:scale-90 cursor-pointer z-20"
                      title="Previous media"
                      aria-label="Previous slide"
                    >
                      <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMediaIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-brand-tertiary shadow-md flex items-center justify-center border border-brand-border/40 transition-all active:scale-90 cursor-pointer z-20"
                      title="Next media"
                      aria-label="Next slide"
                    >
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </>
                )}
              </div>

              {/* Centered Pagination Dots (Matching Reference: Elongated Active Pill) */}
              {mediaItems.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-3 pb-1">
                  {mediaItems.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedMediaIndex(idx)}
                      className={`transition-all duration-300 rounded-full cursor-pointer ${
                        selectedMediaIndex === idx
                          ? 'w-6 h-1.5 bg-[#26153D]'
                          : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Horizontal Thumbnail Selector Track: 1:1 Square Thumbnails */}
            {mediaItems.length > 1 && (
              <div className="flex items-center gap-2.5 px-4 py-2 overflow-x-auto no-scrollbar bg-brand-surface border-b border-brand-border/60">
                {mediaItems.map((item, idx) => {
                  const isSelected = selectedMediaIndex === idx;
                  const isVideo = item.type === 'video';
                  return (
                    <button
                      key={item.id || idx}
                      type="button"
                      onClick={() => setSelectedMediaIndex(idx)}
                      className={`relative w-14 h-14 aspect-square rounded-xl p-0.5 transition-all shrink-0 cursor-pointer bg-white outline-none select-none ${
                        isSelected
                          ? 'border-2 border-brand-primary shadow-sm ring-2 ring-brand-primary/20'
                          : 'border border-brand-border/80 opacity-65 hover:opacity-100'
                      }`}
                      aria-label={`View media ${idx + 1}`}
                    >
                      <div className="w-full h-full rounded-[9px] overflow-hidden bg-[#1f1b26] flex items-center justify-center relative">
                        {isVideo ? (
                          <>
                            <video src={item.url} muted className="w-full h-full object-cover pointer-events-none" />
                            <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                              <div className="w-4 h-4 rounded-full bg-white/90 text-brand-tertiary flex items-center justify-center shadow-xs">
                                <Play className="w-2 h-2 fill-current ml-0.5" />
                              </div>
                            </div>
                            <span className="absolute bottom-0.5 inset-x-0 text-center text-[7px] font-extrabold bg-brand-primary text-white tracking-wider">
                              REEL
                            </span>
                          </>
                        ) : (
                          <img
                            src={item.url}
                            alt={item.alt || product.name}
                            className="w-full h-full object-cover object-center pointer-events-none select-none"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
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
          <div className="shrink-0 bg-white/95 backdrop-blur-md border-t border-brand-border p-3 flex flex-col gap-2 shadow-lg z-20">
            <div className="flex items-center gap-2">
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
                onClick={handleBuyNow}
                className="flex-1 py-3 px-4 rounded-xl bg-brand-tertiary hover:bg-brand-tertiary-hover active:scale-[0.98] text-white flex flex-col items-center justify-center shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-caps tracking-wider uppercase font-bold text-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-current" />
                  <span>ORDER NOW - CASH ON DELIVERY</span>
                </div>
                <span className="text-[9.5px] text-purple-200 font-medium">
                  ◆ Pay online → save ₹50 + free luxury gift
                </span>
              </button>

              <button
                onClick={handleAdd}
                className="p-3 rounded-xl border border-brand-border bg-brand-surface hover:bg-brand-primary hover:text-white text-brand-tertiary transition-all shrink-0"
                title="Add to Bag"
              >
                <ShoppingBag className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP FULL-SCREEN PDP EXPERIENCE (>= md screens)                     */}
      {/* Edge-to-edge flagship layout utilizing 100% of the desktop screen         */}
      {/* ========================================================================= */}
      <div className="hidden md:flex fixed inset-0 z-50 bg-white flex-col overflow-hidden animate-fade-in">
        
        {/* Desktop Sticky Header across 100% width */}
        <header className="shrink-0 h-16 bg-white/95 backdrop-blur-md border-b border-brand-border px-8 flex items-center justify-between z-20">
          <div className="flex items-center space-x-4 min-w-[240px]">
            <button
              onClick={onClose}
              className="flex items-center space-x-2 py-1.5 px-3 rounded-xl bg-brand-surface hover:bg-brand-primary-light text-brand-tertiary hover:text-brand-primary transition-all border border-brand-border/60 text-xs font-semibold cursor-pointer group"
              aria-label="Back to catalog"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Store</span>
            </button>
            
            {product && (
              <div className="hidden lg:flex items-center space-x-1.5 text-xs text-brand-muted">
                <span>/</span>
                <span className="capitalize">{product.category_name || 'Jewelry'}</span>
                <span>/</span>
                <span className="text-brand-tertiary font-medium truncate max-w-[200px]">{product.name}</span>
              </div>
            )}
          </div>

          {/* Center Brand Logo */}
          <div className="flex items-center justify-center">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onClose();
              }}
              className="group py-1"
            >
              <img
                src="/valerie.png"
                alt="VALERIÉ"
                className="h-7 w-auto object-contain"
              />
            </a>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center space-x-2.5 min-w-[240px] justify-end">
            <button
              onClick={handleShare}
              className="px-3.5 py-1.5 rounded-xl border border-brand-border text-xs font-semibold text-brand-tertiary hover:text-brand-primary hover:bg-brand-surface transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Share piece"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            <button
              onClick={() => product && toggleWishlist(product)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                wishlisted
                  ? 'border-rose-300 bg-rose-50 text-rose-500'
                  : 'border-brand-border text-brand-tertiary hover:text-rose-500 hover:bg-brand-surface'
              }`}
              title={wishlisted ? 'Saved in Wishlist' : 'Save to Wishlist'}
            >
              <Heart className={`w-4 h-4 ${wishlisted ? 'fill-rose-500 stroke-rose-500' : 'stroke-[1.8]'}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-brand-surface hover:bg-brand-primary-light border border-brand-border/60 text-brand-tertiary hover:text-brand-primary transition-all flex items-center justify-center cursor-pointer"
              title="Close Preview (Esc)"
              aria-label="Close full screen preview"
            >
              <X className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        </header>

        {/* Desktop Full-Screen Body */}
        {loading && !product ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-16">
            <div className="w-12 h-12 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
            <p className="text-xs font-caps uppercase tracking-wider text-brand-muted font-bold">Loading Jewelry Details...</p>
          </div>
        ) : error && !product ? (
          <div className="flex-1 p-16 flex flex-col items-center justify-center text-center space-y-4">
            <p className="text-base text-red-600 font-semibold">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-brand-primary text-white text-xs font-caps uppercase tracking-wider font-bold rounded-xl shadow-md"
            >
              Back to Catalog
            </button>
          </div>
        ) : product ? (
          <div className="flex-1 overflow-hidden grid grid-cols-12 min-h-0">
            
            {/* Left Stage (7 cols on 12-col grid): Gallery Stage with High-Res Zoom & Thumbnails */}
            <div className="col-span-7 p-6 lg:p-10 overflow-y-auto bg-[#FAF8FC] border-r border-brand-border flex flex-col items-center justify-start space-y-5">
              
              {/* Main 1:1 Square Stage with High-Definition Framing */}
              <div className="w-full max-w-[480px] lg:max-w-[540px] flex flex-col items-center space-y-3">
                <div 
                  className="relative w-full aspect-square rounded-3xl overflow-hidden bg-[#FAF7FC] shadow-luxury border border-brand-border group select-none"
                  style={{ aspectRatio: '1 / 1', minHeight: '380px' }}
                >
                  {activeMedia.type === 'video' ? (
                    <div 
                      onClick={togglePlay}
                      className="absolute inset-0 w-full h-full flex items-center justify-center cursor-pointer select-none bg-black overflow-hidden"
                    >
                      {/* Full-bleed Vertical Reel Player */}
                      <video
                        ref={videoRefDesktop}
                        src={activeMedia.url}
                        muted={isMuted}
                        autoPlay
                        loop
                        playsInline
                        className="w-full h-full object-cover rounded-3xl shadow-xl"
                      />

                      {/* Floating REEL Tag */}
                      <div className="absolute top-4 left-4 z-20 pointer-events-none">
                        <span className="px-3 py-1 rounded-full text-[10px] font-caps tracking-wider uppercase font-bold bg-black/60 backdrop-blur-md text-white border border-white/20 flex items-center gap-1.5 shadow-lg">
                          <Film className="w-3.5 h-3.5 text-amber-300" />
                          <span>Live Try-On Reel</span>
                        </span>
                      </div>

                      {/* Audio Mute/Unmute Toggle */}
                      <button
                        type="button"
                        onClick={toggleMute}
                        className="absolute bottom-4 left-4 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
                        title={isMuted ? 'Unmute video audio' : 'Mute audio'}
                        aria-label="Toggle audio mute"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4 text-white/90" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                      </button>

                      {/* Play/Pause Overlay */}
                      {!isPlaying && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-2xs pointer-events-none">
                          <div className="w-14 h-14 rounded-full bg-white/95 text-brand-tertiary flex items-center justify-center shadow-xl">
                            <Play className="w-7 h-7 fill-current ml-0.5" />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div 
                      onClick={() => setLightboxOpen(true)}
                      className="absolute inset-0 w-full h-full bg-[#FAF7FC] cursor-zoom-in overflow-hidden group flex items-center justify-center"
                    >
                      <img
                        src={activeMedia.url}
                        alt={activeMedia.alt || product.name}
                        className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105 select-none"
                      />

                      {/* Badges */}
                      <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10 pointer-events-none">
                        {product.discount_percentage > 0 && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm w-fit">
                            {product.discount_percentage}% OFF
                          </span>
                        )}
                        {Boolean(product.is_bestseller) && (
                          <span className="px-3 py-1 rounded-full text-[10px] font-caps uppercase tracking-wider font-bold bg-brand-tertiary text-white shadow-sm w-fit">
                            Best Seller
                          </span>
                        )}
                        {Boolean(product.is_anti_tarnish) && (
                          <span className="px-3 py-1 rounded-full text-[10px] font-caps uppercase tracking-wider font-semibold bg-white/95 text-brand-tertiary backdrop-blur-sm shadow-sm flex items-center gap-1.5 w-fit">
                            <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />
                            18K Anti-Tarnish
                          </span>
                        )}
                      </div>

                      {/* Click to zoom badge */}
                      <div className="absolute bottom-4 left-4 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-xs text-white text-[10px] flex items-center gap-1.5 font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Click to expand high-res view</span>
                      </div>
                    </div>
                  )}

                  {/* Prev / Next Nav Buttons (Circular white buttons matching reference) */}
                  {mediaItems.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
                        }}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-brand-tertiary shadow-md flex items-center justify-center border border-brand-border/40 transition-all hover:scale-110 active:scale-95 cursor-pointer z-20"
                        title="Previous media"
                        aria-label="Previous slide"
                      >
                        <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMediaIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
                        }}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-brand-tertiary shadow-md flex items-center justify-center border border-brand-border/40 transition-all hover:scale-110 active:scale-95 cursor-pointer z-20"
                        title="Next media"
                        aria-label="Next slide"
                      >
                        <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                      </button>
                    </>
                  )}
                </div>

                {/* Centered Pagination Dots Row (Matching Reference: Elongated Active Pill) */}
                {mediaItems.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    {mediaItems.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedMediaIndex(idx)}
                        className={`transition-all duration-300 rounded-full cursor-pointer ${
                          selectedMediaIndex === idx
                            ? 'w-7 h-2 bg-[#26153D]'
                            : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                        }`}
                        aria-label={`Go to photo ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop 1:1 Square Thumbnails Row */}
              {mediaItems.length > 1 && (
                <div className="w-full max-w-md flex flex-wrap items-center justify-center gap-3 py-1 px-2">
                  {mediaItems.map((item, idx) => {
                    const isSelected = selectedMediaIndex === idx;
                    const isVideo = item.type === 'video';
                    return (
                      <button
                        key={item.id || idx}
                        type="button"
                        onClick={() => setSelectedMediaIndex(idx)}
                        className={`relative w-16 h-16 aspect-square rounded-2xl p-1 transition-all shrink-0 cursor-pointer bg-white outline-none select-none ${
                          isSelected
                            ? 'border-2 border-brand-primary ring-2 ring-brand-primary/20 shadow-md'
                            : 'border border-brand-border/80 opacity-60 hover:opacity-100 hover:border-brand-primary/50'
                        }`}
                        title={isVideo ? 'Watch try-on reel' : `View photo ${idx + 1}`}
                        aria-label={`View media ${idx + 1}`}
                      >
                        <div className="w-full h-full rounded-xl overflow-hidden bg-[#1b1822] flex items-center justify-center relative">
                          {isVideo ? (
                            <>
                              <video src={item.url} muted className="w-full h-full object-cover pointer-events-none" />
                              <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                                <div className="w-5 h-5 rounded-full bg-white/95 text-brand-tertiary flex items-center justify-center shadow-xs">
                                  <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                                </div>
                              </div>
                              <span className="absolute bottom-1 inset-x-0 text-center text-[7.5px] font-bold bg-brand-primary text-white tracking-wider">
                                REEL
                              </span>
                            </>
                          ) : (
                            <img
                              src={item.url}
                              alt={item.alt || product.name}
                              className="w-full h-full object-cover object-center pointer-events-none select-none"
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Quality & Trust Badges Strip (matching policies) */}
              <div className="w-full max-w-xl pt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-white border border-brand-border/70 flex items-center space-x-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-brand-primary flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-brand-tertiary block text-xs">Free Delivery (5–7 Days)</span>
                    <span className="text-[10.5px] text-brand-muted font-light">All 29,000+ Indian pincodes</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-brand-border/70 flex items-center space-x-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-brand-tertiary block text-xs">18K PVD Anti-Tarnish</span>
                    <span className="text-[10.5px] text-brand-muted font-light">Waterproof &amp; sweat-resistant</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Stage (5 cols on 12-col grid): Product Information, Variants & Actions */}
            <div className="col-span-5 p-8 lg:p-12 overflow-y-auto space-y-6">
              <div className="max-w-xl space-y-6">
                
                {/* Category & Rating */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-caps uppercase tracking-[0.2em] text-brand-primary font-bold">
                    {product.category_name || 'Everyday Luxury'}
                  </span>
                  <div className="flex items-center space-x-1.5 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                    <span className="text-xs text-brand-muted ml-1 font-medium">
                      ({product.rating_summary?.reviews_count || 120} reviews)
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h1 className="font-editorial text-3xl font-bold text-brand-tertiary leading-tight">
                  {product.name}
                </h1>

                {/* Price Row */}
                <div className="space-y-1 pb-4 border-b border-brand-border">
                  <div className="flex items-baseline space-x-3">
                    <span className="text-3xl font-bold text-brand-tertiary">
                      ₹{Math.round(activePrice).toLocaleString('en-IN')}
                    </span>
                    {activeMrp > activePrice && (
                      <span className="text-base text-brand-muted line-through font-light">
                        ₹{Math.round(activeMrp).toLocaleString('en-IN')}
                      </span>
                    )}
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Free Express Delivery
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-muted font-light">
                    Inclusive of all taxes • Zero hidden shipping fees across India
                  </p>
                </div>

                {/* Prepaid Bonus Perk Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FAF5FF] via-white to-[#FFF5F8] border border-brand-primary/20 shadow-2xs space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-bold text-brand-primary">
                    <Sparkles className="w-4 h-4 text-brand-primary" />
                    <span>Complimentary Gift on 1-Click Fastrr Prepaid</span>
                  </div>
                  <p className="text-xs text-brand-tertiary font-medium">
                    Get a <strong>Free Zircon Necklace</strong> + extra <strong>₹50 instant discount</strong> when paying via UPI or Card.
                  </p>
                </div>

                {/* Variant Selector */}
                {product.variants && product.variants.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-caps uppercase tracking-wider font-bold text-brand-tertiary">
                        Select {product.variants[0]?.option1_name || 'Size / Option'}:
                      </span>
                      <span className="text-brand-primary font-semibold">
                        {selectedVariant?.option1_value || selectedVariant?.title}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {product.variants.map((v) => {
                        const isSelected = selectedVariant?.id === v.id;
                        return (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVariant(v)}
                            className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                              isSelected
                                ? 'border-brand-primary bg-brand-primary text-white font-bold shadow-sm'
                                : 'border-brand-border bg-white text-brand-tertiary hover:border-brand-primary/40 hover:bg-brand-surface'
                            }`}
                          >
                            {v.option1_value || v.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Primary Fastrr 1-Click Order & Add to Bag CTAs (MadeWidLove Format) */}
                <div className="pt-2 space-y-3">
                  {/* High-Converting 1-Click Fastrr Button */}
                  <button
                    onClick={handleBuyNow}
                    className="w-full py-4 px-6 rounded-2xl bg-brand-tertiary hover:bg-brand-tertiary-hover active:scale-[0.99] text-white flex flex-col items-center justify-center shadow-luxury transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 font-caps tracking-widest uppercase font-bold text-xs sm:text-sm">
                      <Zap className="w-4 h-4 text-amber-300 fill-current group-hover:scale-110 transition-transform" />
                      <span>ORDER NOW - CASH ON DELIVERY</span>
                    </div>
                    <span className="text-[10.5px] text-purple-200 font-medium mt-0.5">
                      ◆ Pay online → save ₹50 + free complimentary gift
                    </span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleAdd}
                      className="flex-1 py-3.5 px-6 rounded-xl border border-brand-border bg-white hover:bg-brand-surface active:scale-[0.99] text-brand-tertiary text-xs font-caps tracking-wider uppercase font-bold shadow-2xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {addedNotice ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span>Added to Bag!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4 text-brand-primary" />
                          <span>Add to Bag • ₹{Math.round(activePrice).toLocaleString('en-IN')}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => product && toggleWishlist(product)}
                      aria-label={wishlisted ? 'Remove from saved pieces' : 'Save to wishlist'}
                      title={wishlisted ? 'Saved in Wishlist' : 'Save to Wishlist'}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                        wishlisted
                          ? 'border-rose-300 bg-rose-50 text-rose-500 shadow-sm scale-105'
                          : 'border-brand-border hover:border-brand-primary text-brand-tertiary hover:text-rose-500 bg-white'
                      }`}
                    >
                      <Heart className={`w-5 h-5 transition-colors ${wishlisted ? 'fill-rose-500 stroke-rose-500' : 'stroke-[1.8]'}`} />
                    </button>
                  </div>

                  <p className="text-[11px] text-center text-brand-muted font-light flex items-center justify-center gap-1.5">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>Fastrr 1-Click Checkout • UPI, Cards, NetBanking & Cash on Delivery Available</span>
                  </p>
                </div>

                {/* Material & Description Cards */}
                <div className="space-y-3 pt-2">
                  <div className="p-4 rounded-2xl bg-brand-surface/70 border border-brand-border space-y-1.5">
                    <span className="text-[10.5px] font-caps uppercase tracking-wider text-brand-tertiary font-bold block">
                      Material Specification
                    </span>
                    <p className="text-xs text-brand-tertiary font-medium">
                      {product.material || '18K Gold Plated 316L Stainless Steel'}
                    </p>
                    <p className="text-[11px] text-brand-muted font-light leading-relaxed">
                      Safe for water, perfume, and daily wear without fading, rusting, or causing green skin marks.
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs text-brand-tertiary/90 leading-relaxed font-light">
                    <div className="font-caps uppercase tracking-wider text-brand-muted text-[10px] font-bold">
                      About This Piece
                    </div>
                    <p>{product.description || product.short_description}</p>
                  </div>
                </div>

                {/* Policy Reassurance Accordion Cards */}
                <div className="pt-2 border-t border-brand-border space-y-2 text-xs">
                  <div className="p-3.5 rounded-xl border border-brand-border bg-white flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <Truck className="w-4 h-4 text-brand-primary shrink-0" />
                      <div>
                        <span className="font-semibold text-brand-tertiary block">Free All-India Delivery</span>
                        <span className="text-[10.5px] text-brand-muted font-light">Arrives in 5–7 working days via Shiprocket</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-brand-border bg-white flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-semibold text-brand-tertiary block">5–7 Days Easy Returns</span>
                        <span className="text-[10.5px] text-brand-muted font-light">Uncut continuous 360° unboxing video required</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Concierge Assistance */}
                <div className="pt-2">
                  <a
                    href="https://wa.me/917016347945"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                  >
                    <span>Need sizing or styling advice? Chat on WhatsApp (+91 70163 47945)</span>
                  </a>
                </div>

              </div>
            </div>

          </div>
        ) : null}

        {/* Desktop Link Copied Toast */}
        {copiedNotice && (
          <div className="fixed top-20 right-8 z-40 bg-brand-tertiary text-white text-xs px-5 py-2.5 rounded-xl shadow-2xl animate-fade-in flex items-center space-x-2">
            <span>✨ Link copied to clipboard!</span>
          </div>
        )}

      </div>

      {/* Full-Screen High-Resolution Inspection Lightbox */}
      {lightboxOpen && activeMedia.type !== 'video' && (
        <div 
          className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 right-5 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer z-50 shadow-lg"
            title="Close zoom view (Esc)"
            aria-label="Close high-res lightbox"
          >
            <X className="w-6 h-6 stroke-[2]" />
          </button>

          {mediaItems.filter(m => m.type !== 'video').length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
                }}
                className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all hover:scale-105 active:scale-95 cursor-pointer z-50 shadow-lg"
                title="Previous photo"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2]" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMediaIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all hover:scale-105 active:scale-95 cursor-pointer z-50 shadow-lg"
                title="Next photo"
              >
                <ChevronRight className="w-6 h-6 stroke-[2]" />
              </button>
            </>
          )}

          <div 
            className="relative max-w-4xl max-h-[88vh] flex flex-col items-center justify-center select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeMedia.url}
              alt={activeMedia.alt || product.name}
              className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl"
            />
            <div className="mt-3 text-center text-xs text-white/75 font-mono tracking-wider">
              {product.name} • {selectedMediaIndex + 1} of {mediaItems.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
