import React from 'react';
import { Star, ShoppingBag, Eye, Heart, Layers, Sparkles } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { normalizeMediaUrl } from '../utils/mediaUtils';

export default function ProductCard({ product, onQuickView, onAddToCart }) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const wishlisted = isInWishlist(product?.id);

  const {
    name,
    mrp,
    price,
    discount_percentage,
    is_bestseller,
    is_anti_tarnish,
    primary_image,
    video_url,
    material,
    short_description,
    variants,
    min_variant_price,
  } = product;

  const hasMultiVariants = Boolean(variants && variants.length > 1);
  const displayPrice = hasMultiVariants && min_variant_price ? min_variant_price : price;
  const displayMrp = hasMultiVariants && variants[0]?.mrp ? variants[0].mrp : mrp;

  const isMystery = Boolean(
    product?.category_slug === 'mystery-jar' ||
    product?.category_slug === 'mystery-box' ||
    (product?.category_name || '').toLowerCase().includes('mystery') ||
    (name || '').toLowerCase().includes('mystery') ||
    (product?.slug || '').toLowerCase().includes('mystery')
  );

  const cardVideoUrl = React.useMemo(() => {
    if (video_url) return normalizeMediaUrl(video_url);
    if (Array.isArray(product?.images)) {
      const vid = product.images.find(img => img.media_type === 'video' || (typeof (img.image_url || img.url) === 'string' && /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(img.image_url || img.url)));
      if (vid) return normalizeMediaUrl(vid.image_url || vid.url);
    }
    return null;
  }, [video_url, product?.images]);

  const hasVideo = Boolean(cardVideoUrl);

  const productHref = isMystery
    ? '/mystery-jewellery-jar'
    : `#product-${product?.slug || product?.id}`;

  const handleStageClick = (e) => {
    if (e && (e.metaKey || e.ctrlKey || e.button === 1)) return;
    if (e) e.preventDefault();
    if (onQuickView) {
      onQuickView(product);
    }
  };

  return (
    <div className="luxury-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col justify-between group h-full relative">
      <div>
        {/* Product Image Stage: Crisp 1:1 Square Ratio - clicking views product */}
        <a 
          href={productHref}
          onClick={handleStageClick}
          className="relative aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-[#FAF7FC] cursor-pointer group/stage select-none block"
          title={`View ${name}`}
        >
          {/* Main Photo */}
          <img
            src={normalizeMediaUrl(primary_image) || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80'}
            alt={isMystery ? 'Valerie Mystery Jewellery Jar - Curated Surprise Fine Jewelry' : name}
            onError={(e) => {
              if (e.target.src.includes('/uploads/') && !e.target.src.includes('/api/uploads/')) {
                e.target.src = e.target.src.replace('/uploads/', '/api/uploads/');
              } else {
                e.target.src = 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80';
              }
            }}
            className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />

          {/* Floating Wishlist Heart Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(product);
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
        </a>

        {/* Product Meta */}
        <div 
          onClick={handleStageClick}
          className="mt-2.5 sm:mt-4 space-y-1 sm:space-y-1.5 cursor-pointer"
        >
          {/* Rating */}
          {(() => {
            const displayRating = product.rating_avg !== null && product.rating_avg !== undefined && Number(product.rating_avg) > 0
              ? Number(product.rating_avg).toFixed(1)
              : (product.rating ? Number(product.rating).toFixed(1) : '4.9');
            return (
              <div className="flex items-center space-x-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
                      i < Math.round(Number(displayRating)) ? 'fill-current' : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                ))}
                <span className="text-[10px] sm:text-xs text-brand-muted ml-1 font-medium">
                  {displayRating}
                </span>
              </div>
            );
          })()}

          {/* Product Name */}
          <h3 className="font-sans text-xs sm:text-sm font-semibold text-brand-tertiary group-hover:text-brand-primary transition-colors cursor-pointer line-clamp-1 leading-snug capitalize">
            <a
              href={productHref}
              onClick={handleStageClick}
              className="hover:underline"
            >
              {name ? name.replace(/\b([a-z])/g, (m) => m.toUpperCase()) : ''}
            </a>
          </h3>

          {/* Material & Description */}
          <p className="text-[10px] sm:text-xs text-brand-muted line-clamp-1 font-light">
            {material || short_description || (isMystery ? 'Assorted Surprise Jewelry Mix' : 'Lightweight Stainless Steel')}
          </p>

          {/* Pricing Row */}
          <div className="flex items-baseline flex-wrap gap-1 sm:gap-2 pt-0.5">
            {hasMultiVariants && (
              <span className="text-[11px] text-brand-muted font-medium mr-0.5">From</span>
            )}
            <span className="text-sm sm:text-lg font-bold text-brand-tertiary">
              ₹{Math.round(displayPrice).toLocaleString('en-IN')}
            </span>
            {displayMrp > displayPrice && (
              <span className="text-[10px] sm:text-xs text-brand-muted line-through font-light">
                ₹{Math.round(displayMrp).toLocaleString('en-IN')}
              </span>
            )}
            {hasMultiVariants ? (
              <span className="text-[9px] sm:text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                {variants.length} {isMystery ? 'Editions' : 'Sizes'}
              </span>
            ) : (
              <span className="text-[9px] sm:text-[11px] font-semibold text-emerald-600">
                Free Express
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Add To Cart or Select Size CTA Button */}
      {hasMultiVariants ? (
        <button
          onClick={() => onQuickView(product)}
          className="mt-2.5 sm:mt-4 w-full py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg sm:rounded-xl bg-purple-50 hover:bg-brand-primary hover:text-white border border-brand-primary/40 text-brand-primary text-[10px] sm:text-xs font-caps tracking-wider sm:tracking-widest uppercase transition-all shadow-2xs active:scale-[0.98] flex items-center justify-center space-x-1 sm:space-x-1.5 font-bold cursor-pointer"
        >
          <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>{isMystery ? 'Select Edition' : 'Select Size'}</span>
        </button>
      ) : (
        <button
          onClick={() => onAddToCart ? onAddToCart(product) : onQuickView(product)}
          className="mt-2.5 sm:mt-4 w-full py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg sm:rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-[10px] sm:text-xs font-caps tracking-wider sm:tracking-widest uppercase transition-all shadow-sm active:scale-[0.98] flex items-center justify-center space-x-1 sm:space-x-2"
        >
          <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>Add to Cart</span>
        </button>
      )}
    </div>
  );
}
