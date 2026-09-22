import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Eye,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Edit2,
  Package,
  Layers,
  Flame,
  Tag,
  ShoppingBag,
  Maximize2
} from 'lucide-react';
import { normalizeMediaUrl, isVideoMedia } from '../utils/mediaUtils';

export default function ProductAssuranceModal({ isOpen, onClose, item, onEdit }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [copiedSku, setCopiedSku] = useState(false);
  const imageContainerRef = useRef(null);

  // Reset states when item or open state changes
  useEffect(() => {
    setActiveImageIndex(0);
    setIsZoomed(false);
    setCopiedSku(false);
  }, [item, isOpen]);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  // Derive all available images
  let images = [];
  if (Array.isArray(item.images) && item.images.length > 0) {
    images = item.images.map((img) => {
      if (typeof img === 'string') return { url: normalizeMediaUrl(img), isVideo: isVideoMedia(img) };
      const rawUrl = img.image_url || img.url;
      const cleanUrl = normalizeMediaUrl(rawUrl);
      return {
        url: cleanUrl,
        isVideo: img.media_type === 'video' || isVideoMedia(cleanUrl),
        isPrimary: !!img.is_primary,
      };
    });
  } else {
    const rawSingle = item.primary_image || item.image_url || item.image || item.first_item_image;
    if (rawSingle) {
      const clean = normalizeMediaUrl(rawSingle);
      images = [{ url: clean, isVideo: isVideoMedia(clean), isPrimary: true }];
    }
  }

  // Fallback if no images found
  if (images.length === 0) {
    images = [{
      url: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80',
      isVideo: false,
      isPrimary: true
    }];
  }

  const activeMedia = images[activeImageIndex] || images[0];

  // Mouse move handler for interactive zoom lens
  const handleMouseMove = (e) => {
    if (!isZoomed || !imageContainerRef.current) return;
    const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));
    setZoomPosition({ x, y });
  };

  const handleCopySku = (skuText) => {
    if (!skuText) return;
    navigator.clipboard?.writeText(skuText);
    setCopiedSku(true);
    setTimeout(() => setCopiedSku(false), 2000);
  };

  // Extract display values
  const productName = item.product_name || item.name || 'Jewelry Product';
  const sku = item.sku || item.first_item_sku || 'VJ-PROD';
  const slug = item.slug || item.first_item_slug || '';
  const categoryName = item.category_name || (item.category_slug ? item.category_slug.replace('-', ' ') : 'Luxury Jewelry');
  const price = item.price !== undefined ? item.price : item.unit_price;
  const mrp = item.mrp;
  const stock = item.stock_quantity;
  const isJhumka = item.is_jhumka_box || (item.sku && item.sku.startsWith('VJ-JHM')) || (item.category_slug === 'jhumka-boxes');
  const isAntiTarnish = item.is_anti_tarnish;
  const isBestseller = item.is_bestseller;
  const pairsCount = item.pairs_count || (productName.match(/(\d+)\s*Pair/i)?.[1]);

  // Order-specific contexts
  const isOrderContext = item.order_number || item.order_id || item.quantity !== undefined;
  const orderNumber = item.order_number;
  const customerName = item.customer_name;
  const quantity = item.quantity;
  const variantTitle = item.variant_title;
  const itemTotalPrice = item.total_price;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-brand-border/80 w-full max-w-4xl overflow-hidden my-auto flex flex-col md:flex-row relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-white/90 hover:bg-white text-gray-700 hover:text-black shadow-md transition-all border border-gray-100 cursor-pointer"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ─── LEFT COLUMN: Visual Media Stage ─────────────────────────── */}
        <div className="md:w-7/12 bg-[#FAF8FC] p-5 sm:p-6 border-b md:border-b-0 md:border-r border-brand-border flex flex-col justify-between">
          <div>
            {/* Header Badge */}
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-[10px] font-bold tracking-wider uppercase">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Visual Assurance Mode</span>
              </div>
              
              {!activeMedia.isVideo && (
                <button
                  type="button"
                  onClick={() => setIsZoomed(!isZoomed)}
                  className={`inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-xl font-medium border transition-colors cursor-pointer ${
                    isZoomed
                      ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                      : 'bg-white text-brand-tertiary border-brand-border hover:border-brand-primary'
                  }`}
                  title={isZoomed ? "Exit zoom" : "Click to zoom 2x lens"}
                >
                  {isZoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                  <span>{isZoomed ? 'Reset Zoom' : '2x Zoom Lens'}</span>
                </button>
              )}
            </div>

            {/* Main Stage Media */}
            <div
              ref={imageContainerRef}
              onMouseMove={handleMouseMove}
              onClick={() => !activeMedia.isVideo && setIsZoomed(!isZoomed)}
              className={`relative w-full aspect-square rounded-2xl overflow-hidden bg-white border border-brand-border shadow-xs group select-none ${
                activeMedia.isVideo ? '' : isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
              }`}
            >
              {activeMedia.isVideo ? (
                <div className="w-full h-full bg-[#181420] flex items-center justify-center relative">
                  <video
                    src={activeMedia.url}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute top-3 left-3 bg-brand-primary text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                    Try-on Reel
                  </span>
                </div>
              ) : (
                <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                  <img
                    src={activeMedia.url}
                    alt={productName}
                    style={
                      isZoomed
                        ? {
                            transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                            transform: 'scale(2.4)',
                            transition: 'transform 0.08s ease-out',
                          }
                        : {
                            transform: 'scale(1)',
                            transition: 'transform 0.25s ease-out',
                          }
                    }
                    className="w-full h-full object-contain pointer-events-none"
                    onError={(e) => {
                      if (e.target.src.includes('/uploads/') && !e.target.src.includes('/api/uploads/')) {
                        e.target.src = e.target.src.replace('/uploads/', '/api/uploads/');
                      } else {
                        e.target.src = 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80';
                      }
                    }}
                  />

                  {/* Hover hint if not zoomed */}
                  {!isZoomed && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center space-x-1.5">
                      <Maximize2 className="w-3 h-3" />
                      <span>Click image to zoom 2.4x</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Thumbnails Gallery Bar (if multiple angles available) */}
          {images.length > 1 && (
            <div className="mt-4 pt-3 border-t border-brand-border/60">
              <div className="text-[10px] font-caps tracking-wider uppercase text-brand-muted font-bold mb-2">
                Available Views & Angles ({images.length})
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveImageIndex(idx);
                      setIsZoomed(false);
                    }}
                    className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      activeImageIndex === idx
                        ? 'border-brand-primary ring-2 ring-brand-primary/30 shadow-xs scale-105'
                        : 'border-brand-border opacity-70 hover:opacity-100 hover:border-brand-primary/50'
                    }`}
                  >
                    {img.isVideo ? (
                      <div className="w-full h-full bg-[#181420] flex items-center justify-center text-white text-[8px] font-bold uppercase">
                        Reel
                      </div>
                    ) : (
                      <img
                        src={img.url}
                        alt={`Angle ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          if (e.target.src.includes('/uploads/') && !e.target.src.includes('/api/uploads/')) {
                            e.target.src = e.target.src.replace('/uploads/', '/api/uploads/');
                          }
                        }}
                      />
                    )}
                    {img.isPrimary && (
                      <span className="absolute bottom-0 inset-x-0 bg-brand-primary text-white text-[6px] text-center font-bold uppercase py-0.2">
                        Primary
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT COLUMN: Assurance Specifications & Actions ──────── */}
        <div className="md:w-5/12 p-6 sm:p-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Top Tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 uppercase tracking-wider">
                {categoryName}
              </span>
              {isJhumka && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <Flame className="w-3 h-3 text-amber-600" />
                  <span>Jhumka Box</span>
                </span>
              )}
              {Boolean(Number(isAntiTarnish)) && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Anti-Tarnish 316L</span>
                </span>
              )}
              {Boolean(Number(isBestseller)) && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-50 text-yellow-800 border border-yellow-300">
                  <span>★ Bestseller</span>
                </span>
              )}
            </div>

            {/* Product Title */}
            <div>
              <h2 className="text-xl sm:text-2xl font-editorial font-bold text-brand-tertiary leading-snug">
                {productName}
              </h2>

              {/* SKU Pill with One-Click Copy */}
              <div className="flex items-center space-x-2 mt-2">
                <button
                  type="button"
                  onClick={() => handleCopySku(sku)}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-brand-tertiary font-mono text-xs font-semibold transition-colors cursor-pointer"
                  title="Click to copy SKU"
                >
                  <Tag className="w-3 h-3 text-brand-muted" />
                  <span>SKU: {sku}</span>
                  {copiedSku ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 ml-1" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-brand-muted ml-1" />
                  )}
                </button>
                {copiedSku && (
                  <span className="text-[11px] text-emerald-600 font-semibold animate-in fade-in">
                    Copied!
                  </span>
                )}
              </div>
            </div>

            {/* Context-Specific Details Card */}
            {isOrderContext ? (
              <div className="bg-[#FAF8FC] border border-brand-border rounded-2xl p-4 space-y-3 text-xs">
                <div className="font-caps tracking-wider uppercase text-[10px] text-brand-muted font-bold flex items-center justify-between">
                  <span>Order Context Information</span>
                  {orderNumber && <span className="font-mono text-brand-primary font-bold">#{orderNumber}</span>}
                </div>

                {customerName && (
                  <div className="flex justify-between items-center py-1 border-b border-brand-border/60">
                    <span className="text-brand-muted">Recipient Customer:</span>
                    <span className="font-semibold text-brand-tertiary">{customerName}</span>
                  </div>
                )}

                {quantity !== undefined && (
                  <div className="flex justify-between items-center py-1 border-b border-brand-border/60">
                    <span className="text-brand-muted">Ordered Quantity:</span>
                    <span className="font-bold text-brand-tertiary font-mono bg-white px-2 py-0.5 rounded border border-brand-border">
                      {quantity} {Number(quantity) === 1 ? 'unit' : 'units'}
                    </span>
                  </div>
                )}

                {variantTitle && (
                  <div className="flex justify-between items-center py-1 border-b border-brand-border/60">
                    <span className="text-brand-muted">Variant / Combo:</span>
                    <span className="font-semibold text-brand-tertiary">{variantTitle}</span>
                  </div>
                )}

                {price !== undefined && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-brand-muted">Price Per Item:</span>
                    <span className="font-bold text-brand-tertiary font-mono">
                      ₹{Number(price).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {itemTotalPrice !== undefined && (
                  <div className="flex justify-between items-center pt-1 border-t border-brand-border/80 text-sm font-bold text-brand-tertiary">
                    <span>Item Total:</span>
                    <span className="font-mono text-brand-primary">
                      ₹{Number(itemTotalPrice).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#FAF8FC] border border-brand-border rounded-2xl p-4 space-y-3 text-xs">
                <div className="font-caps tracking-wider uppercase text-[10px] text-brand-muted font-bold">
                  Catalog Inventory & Pricing
                </div>

                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-bold font-mono text-brand-tertiary">
                    ₹{Number(price || 0).toLocaleString('en-IN')}
                  </span>
                  {mrp && Number(mrp) > Number(price || 0) && (
                    <span className="text-xs text-brand-muted line-through font-mono">
                      ₹{Number(mrp).toLocaleString('en-IN')}
                    </span>
                  )}
                  {mrp && Number(mrp) > Number(price || 0) && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {Math.round(((mrp - price) / mrp) * 100)}% OFF
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-brand-border/60">
                  <span className="text-brand-muted">Inventory Available:</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                    Number(stock) <= 0
                      ? 'bg-rose-100 text-rose-800'
                      : Number(stock) <= 25
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {stock !== undefined ? `${stock} in stock` : 'Active'}
                  </span>
                </div>

                {pairsCount && (
                  <div className="flex items-center justify-between pt-1 border-t border-brand-border/60">
                    <span className="text-brand-muted">Pairs in Box:</span>
                    <span className="font-bold text-brand-tertiary">{pairsCount} Pairs Combo</span>
                  </div>
                )}
              </div>
            )}

            {/* Quality Checklist Tip */}
            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 text-[11px] text-purple-950 space-y-1">
              <div className="font-bold flex items-center space-x-1 text-purple-900">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />
                <span>Dispatch Verification Tip</span>
              </div>
              <p className="text-purple-900/80 leading-relaxed">
                Confirm stone placement, polish finish, and anti-tarnish micro-polish seal before packing to maintain Valerie's luxury standard.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-brand-border/80">
            <div className="flex items-center gap-2">
              {slug ? (
                <a
                  href={`/product/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold transition-all shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View on Storefront</span>
                </a>
              ) : null}

              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(item);
                  }}
                  className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-brand-primary-light border border-brand-border hover:border-brand-primary text-brand-tertiary text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Edit Product</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full text-center py-2 text-xs font-semibold text-brand-muted hover:text-brand-tertiary transition-colors cursor-pointer"
            >
              Close Assurance Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
