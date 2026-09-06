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
  Share2
} from 'lucide-react';
import { apiService } from '../services/api';

export default function ProductDetailModal({ productSlug, onClose, onAddToCart }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [addedNotice, setAddedNotice] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDetail() {
      setLoading(true);
      try {
        const data = await apiService.getProductDetail(productSlug);
        if (isMounted) {
          setProduct(data);
          if (data.variants && data.variants.length > 0) {
            setSelectedVariant(data.variants[0]);
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (productSlug) {
      loadDetail();
    }
    return () => { isMounted = false; };
  }, [productSlug]);

  if (!productSlug) return null;

  const handleAdd = () => {
    if (!product) return;
    if (onAddToCart) {
      onAddToCart(product, selectedVariant);
    }
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2200);
  };

  const activePrice = selectedVariant?.price || product?.price || 0;
  const activeMrp = selectedVariant?.mrp || product?.mrp || 0;
  const images = product?.images && product.images.length > 0
    ? product.images
    : [{ image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80', alt_text: product?.name }];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-tertiary/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-brand-border flex flex-col max-h-[90vh]"
      >
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 hover:bg-brand-surface text-brand-tertiary hover:text-brand-primary transition-colors border border-brand-border shadow-sm"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-3 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div>
            <p className="text-xs font-caps uppercase tracking-wider text-brand-muted">Loading Jewelry Details...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-red-600 font-semibold">{error}</p>
            <button onClick={onClose} className="px-4 py-2 bg-brand-primary text-white text-xs rounded-xl">
              Close Window
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12">
            
            {/* Left: Gallery Column */}
            <div className="md:col-span-6 p-6 sm:p-8 bg-[#FAF7FC] flex flex-col justify-between border-b md:border-b-0 md:border-r border-brand-border">
              <div className="space-y-4">
                {/* Main Selected Image */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-sm border border-brand-border flex items-center justify-center">
                  <img
                    src={images[selectedImage]?.image_url}
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
                        className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                          selectedImage === idx ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-brand-border opacity-70 hover:opacity-100'
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
                  <ShieldCheck className="w-4 h-4 text-brand-primary flex-shrink-0" />
                  <span>Lifetime Color Guarantee</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-brand-primary flex-shrink-0" />
                  <span>Shiprocket Express 2–4 Days</span>
                </div>
              </div>
            </div>

            {/* Right: Product Info & Purchase Options */}
            <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                
                {/* Category & Ratings */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-caps uppercase tracking-[0.2em] text-brand-primary font-bold">
                    {product.category_name}
                  </span>
                  <div className="flex items-center space-x-1 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                    <span className="text-xs text-brand-muted ml-1 font-medium">
                      ({product.rating_summary?.reviews_count || 5} reviews)
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
                    {product.material}
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

              {/* Action Buttons */}
              <div className="pt-4 border-t border-brand-border space-y-3">
                <button
                  onClick={handleAdd}
                  className="w-full py-3 px-6 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold shadow-md hover:shadow-luxury-hover transition-all flex items-center justify-center space-x-2"
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

            </div>

          </div>
        )}
      </div>
    </div>
  );
}
