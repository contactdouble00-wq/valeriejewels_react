import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Eye,
  ExternalLink,
  ShieldCheck,
  Truck,
  Sparkles,
  Star,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Flame,
  Check,
  RefreshCw,
  ShoppingBag,
  Tag,
  Zap,
  AlertCircle,
  Share2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { normalizeMediaUrl, isVideoMedia } from '../utils/mediaUtils';
import FormattedDescription from '../components/FormattedDescription';

export default function AdminProductPreviewModal({
  isOpen,
  onClose,
  product,
  onToggleLive,
  isTogglingLive = false,
  onEdit
}) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [actionNotice, setActionNotice] = useState('');
  const videoRef = useRef(null);

  useEffect(() => {
    setActiveMediaIndex(0);
    setIsPlaying(true);
    setIsMuted(true);
    setActionNotice('');
    if (product?.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
    } else {
      setSelectedVariant(null);
    }
  }, [product, isOpen]);

  // ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const isLive = Number(product.is_active) !== 0;

  // Build media gallery list
  let mediaList = [];
  if (Array.isArray(product.images) && product.images.length > 0) {
    mediaList = product.images.map((img, i) => {
      const rawUrl = typeof img === 'string' ? img : (img.image_url || img.url);
      const url = normalizeMediaUrl(rawUrl);
      const isVideo = (typeof img === 'object' && img.media_type === 'video') || isVideoMedia(rawUrl) || isVideoMedia(url);
      return {
        id: (typeof img === 'object' && img.id) || `media-${i}`,
        url,
        isVideo,
        isPrimary: typeof img === 'object' ? Boolean(img.is_primary) : i === 0,
        alt: (typeof img === 'object' && img.alt_text) || `${product.name} media ${i + 1}`,
      };
    });
  }

  // Ensure video_url reel is in list if not already present
  if (product.video_url) {
    const vidUrl = normalizeMediaUrl(product.video_url);
    if (!mediaList.some((m) => m.url === vidUrl)) {
      mediaList.unshift({
        id: 'video-reel-top',
        url: vidUrl,
        isVideo: true,
        isPrimary: false,
        alt: `${product.name} Showcase Reel`,
      });
    }
  }

  // Fallback single image if none found
  if (mediaList.length === 0) {
    const rawSingle = product.primary_image || 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80';
    const singleUrl = normalizeMediaUrl(rawSingle);
    mediaList.push({
      id: 'fallback-0',
      url: singleUrl,
      isVideo: isVideoMedia(singleUrl),
      isPrimary: true,
      alt: product.name,
    });
  }

  const activeItem = mediaList[activeMediaIndex] || mediaList[0];

  const triggerNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(''), 3000);
  };

  const currentPrice = selectedVariant?.price ? Number(selectedVariant.price) : Number(product.price || 0);
  const currentMrp = selectedVariant?.mrp ? Number(selectedVariant.mrp) : Number(product.mrp || currentPrice);
  const discountPct = currentMrp > currentPrice ? Math.round(((currentMrp - currentPrice) / currentMrp) * 100) : 0;
  const costPrice = Number(product.cost_price || 0);
  const marginAmt = costPrice > 0 ? (currentPrice - costPrice) : 0;
  const marginPct = costPrice > 0 ? Math.round((marginAmt / currentPrice) * 100) : 0;

  const isJhumka = (product.category_slug === 'jhumka-boxes') || (product.sku && product.sku.startsWith('VJ-JHM')) || (product.name && product.name.toLowerCase().includes('jhumka'));
  const pairsInside = product.pairs_count || (product.name && product.name.match(/(\d+)\s*Pair/i)?.[1]) || (isJhumka ? 6 : null);

  const storefrontUrl = `/#product-${product.slug || product.id}?preview=1`;

  const handleOpenStorefrontNewTab = () => {
    const origin = window.location.origin;
    window.open(`${origin}${storefrontUrl}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      {/* Toast Notice within Preview */}
      {actionNotice && (
        <div className="fixed top-6 right-6 z-60 bg-brand-tertiary text-white px-4 py-2.5 rounded-xl shadow-luxury text-xs font-semibold animate-in slide-in-from-top-2">
          {actionNotice}
        </div>
      )}

      <div className="bg-white rounded-3xl max-w-5xl w-full border border-brand-border shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95">
        {/* Top Control Bar */}
        <div className="bg-[#FAF8FC] border-b border-brand-border px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <span className="w-8 h-8 rounded-xl bg-brand-primary-light text-brand-primary flex items-center justify-center shadow-xs">
              <Eye className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-caps tracking-widest uppercase text-brand-primary font-bold">
                  Admin Storefront PDP Preview
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center space-x-1 ${
                    isLive
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span>{isLive ? 'Live on Store' : 'Hidden / Draft'}</span>
                </span>
              </div>
              <p className="text-xs font-semibold text-brand-tertiary truncate max-w-xs sm:max-w-md">
                {product.name}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Live Toggle Switch in Header */}
            {onToggleLive && (
              <button
                type="button"
                onClick={() => onToggleLive(product)}
                disabled={isTogglingLive}
                className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isLive
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                } ${isTogglingLive ? 'opacity-60 cursor-wait' : ''}`}
                title={isLive ? 'Click to unpublish (hide from storefront)' : 'Click to make live on storefront'}
              >
                {isTogglingLive ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : isLive ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>{isLive ? 'Live (Click to Hide)' : 'Make Live Now'}</span>
              </button>
            )}

            {/* Open in Storefront New Tab */}
            <button
              type="button"
              onClick={handleOpenStorefrontNewTab}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-brand-primary hover:text-white text-brand-primary border border-purple-200 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              title="Open storefront product link in new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Storefront URL</span>
            </button>

            {/* Edit Shortcut */}
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(product);
                }}
                className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-brand-tertiary text-xs font-semibold transition-colors"
                title="Edit Product Details"
              >
                Edit
              </button>
            )}

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-brand-muted hover:text-brand-tertiary rounded-xl hover:bg-gray-200 transition-colors"
              aria-label="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Warning Banner if Product is Hidden */}
        {!isLive && (
          <div className="bg-amber-600 text-white px-5 py-2.5 text-xs font-medium flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                <strong>Draft / Hidden Mode:</strong> This piece is currently <strong>NOT visible</strong> on the public storefront. Only administrators can preview it.
              </span>
            </div>
            {onToggleLive && (
              <button
                type="button"
                onClick={() => onToggleLive(product)}
                disabled={isTogglingLive}
                className="ml-3 px-3 py-1 bg-white text-amber-900 rounded-lg text-xs font-bold hover:bg-amber-50 active:scale-95 transition-all shadow-2xs shrink-0"
              >
                {isTogglingLive ? 'Publishing...' : 'Publish to Storefront'}
              </button>
            )}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left Column: Visual Media Showcase */}
            <div className="space-y-4">
              {/* Main Media Viewport */}
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#181420] border border-brand-border/60 shadow-inner group">
                {activeItem.isVideo ? (
                  <div className="w-full h-full relative flex items-center justify-center">
                    <video
                      ref={videoRef}
                      src={activeItem.url}
                      muted={isMuted}
                      loop
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    {/* Video Controls Overlay */}
                    <div className="absolute bottom-3 right-3 flex items-center space-x-2 z-20">
                      <button
                        type="button"
                        onClick={() => {
                          if (videoRef.current) {
                            if (isPlaying) videoRef.current.pause();
                            else videoRef.current.play();
                            setIsPlaying(!isPlaying);
                          }
                        }}
                        className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all backdrop-blur-xs"
                        title={isPlaying ? 'Pause Reel' : 'Play Reel'}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all backdrop-blur-xs"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-primary text-white tracking-wider">
                      🎬 VERTICAL REEL
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-full relative">
                    <img
                      src={activeItem.url}
                      alt={activeItem.alt || product.name}
                      onError={(e) => {
                        if (e.target.src.includes('/uploads/') && !e.target.src.includes('/api/uploads/')) {
                          e.target.src = e.target.src.replace('/uploads/', '/api/uploads/');
                        }
                      }}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {activeItem.isPrimary && (
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-primary text-white tracking-wider shadow-xs">
                        ⭐ PRIMARY PHOTO
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Thumbnails Carousel */}
              {mediaList.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {mediaList.map((m, idx) => (
                    <button
                      key={m.id || idx}
                      type="button"
                      onClick={() => setActiveMediaIndex(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                        activeMediaIndex === idx
                          ? 'border-brand-primary ring-2 ring-brand-primary/30 scale-105'
                          : 'border-gray-200 hover:border-brand-primary/50 opacity-70 hover:opacity-100'
                      }`}
                    >
                      {m.isVideo ? (
                        <div className="w-full h-full bg-[#181420] flex items-center justify-center text-white">
                          <Play className="w-4 h-4 fill-white" />
                          <span className="absolute bottom-0 inset-x-0 bg-brand-primary text-[7px] font-bold text-white uppercase text-center py-0.5">
                            REEL
                          </span>
                        </div>
                      ) : (
                        <img
                          src={m.url}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Assurance Trust Badges (Exact as storefront PDP) */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-brand-primary shrink-0" />
                  <div className="text-[11px] leading-tight text-brand-tertiary">
                    <span className="font-bold block">Anti-Tarnish Lifetime</span>
                    <span className="text-[10px] text-brand-muted">18K Pure Gold Plating</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="text-[11px] leading-tight text-brand-tertiary">
                    <span className="font-bold block">Free Express Delivery</span>
                    <span className="text-[10px] text-brand-muted">Dispatch in 24 Hours</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Product Commerce Details */}
            <div className="space-y-5">
              {/* Meta Pill & SKU */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-800">
                    {product.category_name || 'Jewelry Piece'}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs font-mono text-brand-muted">SKU: {product.sku}</span>
                </div>

                {isLive ? (
                  <span className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live on Storefront</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-800 flex items-center space-x-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                    <span>Hidden (Draft)</span>
                  </span>
                )}
              </div>

              {/* Title */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-editorial font-bold text-brand-tertiary leading-snug">
                  {product.name}
                </h2>
                {product.short_description && (
                  <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                    {product.short_description}
                  </p>
                )}
              </div>

              {/* Rating & Review Counter */}
              <div className="flex items-center space-x-2 text-xs">
                <div className="flex items-center text-amber-500 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500 mr-1" />
                  <span className="font-bold text-brand-tertiary">
                    {product.rating_avg ? Number(product.rating_avg).toFixed(1) : '4.9'}
                  </span>
                </div>
                <span className="text-brand-muted text-[11px]">
                  ({product.review_count || (Array.isArray(product.reviews) ? product.reviews.length : 128)} verified buyer reviews)
                </span>
                {Number(product.is_bestseller) === 1 && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <Flame className="w-3 h-3 text-amber-600" />
                    <span>★ Homepage Bestseller</span>
                  </span>
                )}
              </div>

              {/* Special Box Inside Counter */}
              {pairsInside && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Flame className="w-4 h-4 text-amber-600" />
                    <span className="font-bold">{pairsInside} Handcrafted Pairs Inside This Box</span>
                  </div>
                  <span className="font-mono text-[10px] text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded">
                    Ad Showcase Ready
                  </span>
                </div>
              )}

              {/* Price & Savings Display */}
              <div className="p-4 rounded-2xl bg-[#FAF8FC] border border-brand-border space-y-2">
                <div className="flex items-baseline space-x-3">
                  <span className="text-3xl font-editorial font-bold text-brand-tertiary">
                    ₹{currentPrice.toLocaleString('en-IN')}
                  </span>
                  {currentMrp > currentPrice && (
                    <>
                      <span className="text-sm font-light text-brand-muted line-through">
                        ₹{currentMrp.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                        SAVE {discountPct}% OFF
                      </span>
                    </>
                  )}
                </div>

                {/* Admin Confidential Margin Strip */}
                {costPrice > 0 && (
                  <div className="pt-2 border-t border-brand-border/80 flex items-center justify-between text-[11px] text-brand-muted">
                    <span className="font-mono">Cost: ₹{costPrice.toLocaleString('en-IN')}</span>
                    <span className="font-semibold text-emerald-700">
                      Profit Margin: ₹{marginAmt.toLocaleString('en-IN')} ({marginPct}%)
                    </span>
                    <span className="font-mono">Stock: {product.stock_quantity ?? 0}</span>
                  </div>
                )}
              </div>

              {/* Product Variants / Multi-Size Selector */}
              {product.variants && product.variants.length > 0 && (() => {
                const isMysteryJar =
                  product.category_slug === 'mystery-jar' ||
                  (product.category_name || '').toLowerCase().includes('mystery') ||
                  (product.name || '').toLowerCase().includes('mystery jar');

                return (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-caps uppercase tracking-wider font-bold text-brand-tertiary flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                        <span>{isMysteryJar ? 'Select Mystery Jar Size / Edition:' : `Select ${product.variants[0]?.option1_name || 'Size / Option'}:`}</span>
                      </label>
                      <span className="text-brand-primary font-bold text-xs bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        {selectedVariant?.title || selectedVariant?.option1_value}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {product.variants.map((v) => {
                        const isSelected = selectedVariant?.id === v.id;
                        const vPrice = Number(v.price || product.price || 0);
                        const vMrp = Number(v.mrp || product.mrp || 0);
                        const vDiscount = vMrp > vPrice && vMrp > 0 ? Math.round(((vMrp - vPrice) / vMrp) * 100) : 0;

                        return (
                          <div
                            key={v.id}
                            onClick={() => setSelectedVariant(v)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer select-none text-left relative ${
                              isSelected
                                ? 'bg-gradient-to-br from-[#FAF5FF] via-white to-purple-50/30 border-brand-primary ring-2 ring-brand-primary/25 shadow-xs'
                                : 'bg-white border-brand-border/80 hover:border-brand-primary/40 hover:bg-[#FAF8FC]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-brand-primary' : 'text-brand-tertiary'}`}>
                                {v.title || v.option1_value}
                              </span>
                              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                                isSelected ? 'bg-brand-primary border-brand-primary text-white' : 'border-gray-300 bg-white'
                              }`}>
                                {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                              </div>
                            </div>

                            <div className="flex items-baseline space-x-1.5">
                              <span className="text-sm font-bold text-brand-tertiary">
                                ₹{Math.round(vPrice).toLocaleString('en-IN')}
                              </span>
                              {vMrp > vPrice && (
                                <span className="text-[10px] text-brand-muted line-through font-light">
                                  ₹{Math.round(vMrp).toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>

                            {vDiscount > 0 && (
                              <div className="mt-1 flex items-center justify-between">
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  Save {vDiscount}%
                                </span>
                                {v.stock_quantity !== undefined && (
                                  <span className="text-[9px] text-brand-muted font-mono">
                                    Stock: {v.stock_quantity}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {isMysteryJar && (
                      <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/80 flex items-center space-x-2 text-[11px] text-purple-900">
                        <Sparkles className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                        <span>
                          <strong>Storefront Notice:</strong> Customers see these size cards and prices update in real-time when selected.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Simulated Customer Actions */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => triggerNotice('Simulated Fastrr 1-Click Checkout: In customer mode, this initiates instant payment.')}
                  className="w-full py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-wider uppercase font-bold shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Buy Now with Fastrr 1-Click Checkout</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerNotice('Simulated Add to Bag: In customer mode, this adds the item to the persistent cart.')}
                  className="w-full py-2.5 px-4 rounded-xl border border-brand-border hover:bg-gray-50 text-brand-tertiary text-xs font-semibold transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Add to Bag</span>
                </button>
                <p className="text-[10px] text-center text-brand-muted">
                  (Checkout actions are interactive simulations in Admin Preview mode)
                </p>
              </div>

              {/* Description & Specifications */}
              <div className="pt-4 border-t border-brand-border space-y-3">
                <h4 className="text-xs font-caps tracking-wider uppercase font-bold text-brand-tertiary">
                  Jewelry Story & Details
                </h4>
                <div className="text-xs text-brand-tertiary/90 leading-relaxed bg-[#FAF8FC] p-4 rounded-2xl border border-brand-border">
                  {product.description ? (
                    <FormattedDescription description={product.description} />
                  ) : (
                    <p className="italic text-brand-muted">No full description provided yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
