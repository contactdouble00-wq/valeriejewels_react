import React from 'react';
import { Star, ShoppingBag, Eye, Sparkles, ShieldCheck, Heart } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';

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
    material,
    short_description,
  } = product;

  return (
    <div className="luxury-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col justify-between group h-full relative">
      <div>
        {/* Product Image Stage */}
        <div 
          onClick={() => onQuickView(product)}
          className="relative aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-[#FAF7FC] cursor-pointer"
        >
          <img
            src={primary_image || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80'}
            alt={name}
            className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />

          {/* Badges Overlay */}
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 z-10">
            {discount_percentage > 0 && (
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-bold bg-emerald-100 text-emerald-800 shadow-sm w-fit">
                {discount_percentage}% OFF
              </span>
            )}
            {Boolean(is_bestseller) && (
              <span className="px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-caps uppercase tracking-wider font-bold bg-brand-tertiary text-white shadow-sm w-fit">
                Best Seller
              </span>
            )}
            {Boolean(is_anti_tarnish) && (
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-caps uppercase tracking-wider font-semibold bg-white/95 text-brand-tertiary backdrop-blur-sm shadow-sm flex items-center gap-1 w-fit">
                <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-brand-primary" />
                Anti-Tarnish
              </span>
            )}
          </div>

          {/* Floating Wishlist Heart Button */}
          <button
            onClick={(e) => {
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

          {/* Quick View Hover Button (Desktop only, mobile taps open directly) */}
          <div className="hidden sm:flex absolute inset-0 bg-brand-tertiary/10 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center p-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickView(product);
              }}
              className="px-4 py-2 rounded-xl bg-white text-brand-tertiary text-xs font-caps tracking-wider uppercase font-semibold shadow-luxury flex items-center space-x-1.5 hover:bg-brand-primary hover:text-white transition-all transform translate-y-2 group-hover:translate-y-0"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Quick View</span>
            </button>
          </div>
        </div>

        {/* Product Meta */}
        <div className="mt-2.5 sm:mt-4 space-y-1 sm:space-y-1.5">
          {/* Rating */}
          <div className="flex items-center space-x-1 text-amber-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
            ))}
            <span className="text-[10px] sm:text-xs text-brand-muted ml-1 font-light">4.9</span>
          </div>

          {/* Product Name */}
          <h3
            onClick={() => onQuickView(product)}
            className="font-sans text-xs sm:text-sm font-semibold text-brand-tertiary group-hover:text-brand-primary transition-colors cursor-pointer line-clamp-1 leading-snug"
          >
            {name}
          </h3>

          {/* Material & Description */}
          <p className="text-[10px] sm:text-xs text-brand-muted line-clamp-1 font-light">
            {material || short_description}
          </p>

          {/* Pricing Row */}
          <div className="flex items-baseline flex-wrap gap-1 sm:gap-2 pt-0.5">
            <span className="text-sm sm:text-lg font-bold text-brand-tertiary">
              ₹{Math.round(price).toLocaleString('en-IN')}
            </span>
            {mrp > price && (
              <span className="text-[10px] sm:text-xs text-brand-muted line-through font-light">
                ₹{Math.round(mrp).toLocaleString('en-IN')}
              </span>
            )}
            <span className="text-[9px] sm:text-[11px] font-semibold text-emerald-600">
              Free Express
            </span>
          </div>
        </div>
      </div>

      {/* Add To Cart CTA Button */}
      <button
        onClick={() => onAddToCart ? onAddToCart(product) : onQuickView(product)}
        className="mt-2.5 sm:mt-4 w-full py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg sm:rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-[10px] sm:text-xs font-caps tracking-wider sm:tracking-widest uppercase transition-all shadow-sm active:scale-[0.98] flex items-center justify-center space-x-1 sm:space-x-2"
      >
        <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        <span>Add to Cart</span>
      </button>
    </div>
  );
}
