import React, { useEffect } from 'react';
import {
  X,
  Heart,
  ShoppingBag,
  Trash2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';

export default function WishlistDrawer({ onSelectProduct }) {
  const {
    wishlist,
    wishlistCount,
    isWishlistOpen,
    closeWishlist,
    removeFromWishlist,
    clearWishlist
  } = useWishlist();

  const { addToCart, setIsCartOpen } = useCart();
  const [movingId, setMovingId] = React.useState(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isWishlistOpen) {
        closeWishlist();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWishlistOpen, closeWishlist]);

  // Prevent background body scroll when drawer is open
  useEffect(() => {
    if (isWishlistOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isWishlistOpen]);

  if (!isWishlistOpen) return null;

  const handleMoveToBag = (item) => {
    setMovingId(item.id);
    addToCart(item, null, 1, false);
    
    // Give user brief visual feedback then remove from wishlist
    setTimeout(() => {
      removeFromWishlist(item.id);
      setMovingId(null);
    }, 450);
  };

  const handleMoveAllToBag = () => {
    wishlist.forEach((item) => {
      addToCart(item, null, 1, false);
    });
    clearWishlist();
    closeWishlist();
    setIsCartOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeWishlist}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-brand-border flex items-center justify-between bg-brand-surface/70 backdrop-blur">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Heart className="w-4 h-4 fill-brand-primary" />
              </div>
              <div>
                <h2 className="font-editorial text-lg sm:text-xl font-bold text-brand-tertiary">
                  Saved Pieces
                </h2>
                <p className="text-[11px] text-brand-muted font-light">
                  {wishlistCount} {wishlistCount === 1 ? 'item' : 'items'} saved in your private vault
                </p>
              </div>
            </div>

            <button
              onClick={closeWishlist}
              className="p-2 -mr-1 rounded-full text-brand-tertiary/70 hover:text-brand-tertiary hover:bg-brand-border/40 transition-all"
              aria-label="Close wishlist drawer"
            >
              <X className="w-5 h-5 stroke-[1.8]" />
            </button>
          </div>

          {/* Subheader Trust Ribbon */}
          <div className="bg-brand-primary-light/60 px-4 py-2 border-b border-brand-primary/10 flex items-center justify-between text-[11px] text-brand-tertiary/80">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span>18K PVD Anti-Tarnish Guaranteed</span>
            </div>
            <span className="text-[10px] font-caps uppercase tracking-wider text-brand-primary font-bold">
              Instant Bag Transfer
            </span>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {wishlist.length === 0 ? (
              /* Empty State */
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-primary-light flex items-center justify-center text-brand-primary relative">
                  <Heart className="w-8 h-8 stroke-[1.5]" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-primary rounded-full animate-ping opacity-75"></span>
                </div>

                <div className="space-y-1.5 max-w-xs">
                  <h3 className="font-editorial text-lg font-bold text-brand-tertiary">
                    Your Wishlist is Empty
                  </h3>
                  <p className="text-xs text-brand-muted leading-relaxed font-light">
                    Save pieces you love while exploring our everyday waterproof and anti-tarnish jewelry collections.
                  </p>
                </div>

                <a
                  href="#catalog"
                  onClick={closeWishlist}
                  className="mt-2 inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-wider uppercase font-bold shadow-md hover:shadow-luxury transition-all"
                >
                  <span>Explore Catalog</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              /* Wishlist Items List */
              <div className="space-y-3.5">
                {wishlist.map((item) => {
                  const isMoving = movingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="group p-3 rounded-2xl border border-brand-border bg-white hover:border-brand-primary/30 transition-all shadow-sm hover:shadow-md flex gap-3 relative"
                    >
                      {/* Product Thumbnail */}
                      <div
                        onClick={() => {
                          if (onSelectProduct) onSelectProduct(item);
                          closeWishlist();
                        }}
                        className="w-20 h-20 rounded-xl overflow-hidden bg-brand-surface border border-brand-border/60 shrink-0 cursor-pointer relative"
                      >
                        <img
                          src={item.primary_image || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=400&q=80'}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        {item.discount_percentage > 0 && (
                          <span className="absolute top-1 left-1 px-1 py-0.5 rounded text-[8px] font-bold bg-emerald-600 text-white">
                            {item.discount_percentage}% OFF
                          </span>
                        )}
                      </div>

                      {/* Info & Actions */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h4
                              onClick={() => {
                                if (onSelectProduct) onSelectProduct(item);
                                closeWishlist();
                              }}
                              className="font-sans text-xs sm:text-sm font-semibold text-brand-tertiary group-hover:text-brand-primary transition-colors cursor-pointer line-clamp-1"
                              title={item.name}
                            >
                              {item.name}
                            </h4>
                            <button
                              onClick={() => removeFromWishlist(item.id)}
                              className="p-1 -mr-1 text-brand-muted hover:text-red-600 transition-colors shrink-0"
                              title="Remove from wishlist"
                              aria-label={`Remove ${item.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-[10px] text-brand-muted line-clamp-1 mt-0.5 font-light">
                            {item.material || '18K Gold PVD • Waterproof'}
                          </p>
                        </div>

                        {/* Price & Move to Bag Row */}
                        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-brand-border/40">
                          <div className="flex items-baseline space-x-1.5">
                            <span className="text-sm font-bold text-brand-tertiary">
                              ₹{Math.round(item.price).toLocaleString('en-IN')}
                            </span>
                            {item.mrp > item.price && (
                              <span className="text-[10px] text-brand-muted line-through">
                                ₹{Math.round(item.mrp).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleMoveToBag(item)}
                            disabled={isMoving}
                            className={`px-3 py-1.5 rounded-lg text-xs font-caps tracking-wider uppercase font-bold flex items-center space-x-1.5 transition-all ${
                              isMoving
                                ? 'bg-emerald-600 text-white'
                                : 'bg-brand-primary hover:bg-brand-primary-hover text-white shadow-sm'
                            }`}
                          >
                            {isMoving ? (
                              <>
                                <Check className="w-3 h-3 text-white" />
                                <span>Moved!</span>
                              </>
                            ) : (
                              <>
                                <ShoppingBag className="w-3 h-3" />
                                <span>Move to Bag</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with Move All */}
          {wishlist.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-brand-border bg-brand-surface space-y-3">
              <button
                onClick={handleMoveAllToBag}
                className="w-full py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold shadow-md hover:shadow-luxury-hover transition-all flex items-center justify-center space-x-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Move All to Bag ({wishlist.length})</span>
              </button>

              <div className="flex items-center justify-between text-xs px-1">
                <button
                  onClick={clearWishlist}
                  className="text-brand-muted hover:text-red-600 text-[11px] underline underline-offset-2 transition-colors"
                >
                  Clear all saved pieces
                </button>

                <span className="text-[10px] text-brand-muted font-light flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-primary" />
                  Free Express Shipping above ₹999
                </span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
