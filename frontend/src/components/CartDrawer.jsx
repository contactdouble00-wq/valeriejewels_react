import React from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Truck,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Tag
} from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CartDrawer({ onProceedToCheckout }) {
  const {
    cartItems,
    itemCount,
    subtotal,
    totalMrp,
    totalSavings,
    isFreeShipping,
    freeShippingRemaining,
    freeShippingProgress,
    shippingFee,
    grandTotal,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeFromCart,
  } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Dimmed Blur Backdrop */}
      <div
        onClick={closeCart}
        className="absolute inset-0 bg-brand-tertiary/60 backdrop-blur-sm transition-opacity"
      />

      {/* Slide-out Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-brand-border animate-in slide-in-from-right duration-300">
          
          {/* 1. Drawer Header */}
          <div className="p-5 border-b border-brand-border flex items-center justify-between bg-[#FAF7FC]">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-brand-primary" />
              <h2 className="font-editorial text-xl font-bold text-brand-tertiary">
                Your Shopping Bag
              </h2>
              <span className="text-xs font-bold text-brand-primary bg-brand-primary-light px-2 py-0.5 rounded-full">
                {itemCount}
              </span>
            </div>
            <button
              onClick={closeCart}
              className="p-2 rounded-full text-brand-tertiary hover:bg-white hover:text-brand-primary transition-colors border border-transparent hover:border-brand-border"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. Free Shipping Progress Bar */}
          <div className="bg-white px-5 py-3 border-b border-brand-border">
            <div className="flex items-center justify-between text-xs mb-1.5">
              {isFreeShipping ? (
                <span className="font-semibold text-emerald-700 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                  <span>You've unlocked <strong>FREE Express Shipping</strong>!</span>
                </span>
              ) : (
                <span className="text-brand-muted font-light">
                  Add <strong className="text-brand-primary font-bold">₹{freeShippingRemaining}</strong> more for <strong>FREE Express Shipping</strong> 🚚
                </span>
              )}
              <span className="font-bold text-[11px] text-brand-primary">
                {freeShippingProgress}%
              </span>
            </div>
            <div className="w-full bg-[#EFEBF4] h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-brand-primary to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* 3. Items List Stage */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-brand-primary-light flex items-center justify-center text-brand-primary">
                  <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-editorial text-lg font-bold text-brand-tertiary">
                    Your bag is currently empty
                  </h3>
                  <p className="text-xs text-brand-muted font-light max-w-xs">
                    Explore our curated everyday anti-tarnish fine jewelry designed to elevate your daily style.
                  </p>
                </div>
                <a
                  href="#catalog"
                  onClick={closeCart}
                  className="px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold shadow-md transition-all"
                >
                  Explore Best Sellers
                </a>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.key}
                  className="p-3.5 rounded-2xl bg-[#FAF7FC] border border-brand-border flex space-x-3 transition-all hover:border-brand-primary/30"
                >
                  {/* Thumbnail */}
                  <img
                    src={item.image || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=400&q=80'}
                    alt={item.name}
                    className="w-20 h-20 rounded-xl object-cover border border-brand-border flex-shrink-0 bg-white"
                  />

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-editorial text-sm font-bold text-brand-tertiary truncate">
                          {item.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.key)}
                          className="p-1 text-brand-muted hover:text-red-600 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Variant or Bundle Badge */}
                      {item.isBundle ? (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-caps uppercase tracking-wider font-bold text-brand-primary bg-brand-primary-light px-2 py-0.5 rounded-md mt-0.5">
                          <Tag className="w-2.5 h-2.5" />
                          <span>Curated Duo Set</span>
                        </span>
                      ) : item.variantTitle ? (
                        <span className="inline-block text-[11px] text-brand-muted font-light mt-0.5">
                          Option: <strong className="text-brand-tertiary">{item.variantTitle}</strong>
                        </span>
                      ) : null}
                    </div>

                    {/* Price & Quantity Stepper */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-sm font-bold text-brand-tertiary">
                          ₹{Math.round(item.price).toLocaleString('en-IN')}
                        </span>
                        {item.mrp > item.price && (
                          <span className="text-[11px] text-brand-muted line-through font-light">
                            ₹{Math.round(item.mrp).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      {/* Stepper */}
                      <div className="flex items-center border border-brand-border rounded-lg bg-white overflow-hidden shadow-2xs">
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                          className="p-1.5 hover:bg-brand-surface text-brand-tertiary hover:text-brand-primary transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-brand-tertiary min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          className="p-1.5 hover:bg-brand-surface text-brand-tertiary hover:text-brand-primary transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 4. Drawer Footer / Checkout Summary */}
          {cartItems.length > 0 && (
            <div className="p-5 border-t border-brand-border bg-white space-y-3.5 shadow-lg">
              
              {/* Savings Announcement */}
              {totalSavings > 0 && (
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Your Total Bag Savings</span>
                  </span>
                  <span className="font-bold">₹{Math.round(totalSavings).toLocaleString('en-IN')}</span>
                </div>
              )}

              {/* Subtotal & Shipping breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-brand-muted">
                  <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                  <span className="font-semibold text-brand-tertiary">
                    ₹{Math.round(subtotal).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-brand-muted">
                  <span>Express Courier Shipping</span>
                  <span>
                    {isFreeShipping ? (
                      <strong className="text-emerald-600 uppercase font-bold">FREE</strong>
                    ) : (
                      `₹${shippingFee}`
                    )}
                  </span>
                </div>
                <div className="pt-2 border-t border-brand-border flex items-baseline justify-between text-base font-bold text-brand-tertiary">
                  <span>Total Amount</span>
                  <span className="text-xl">
                    ₹{Math.round(grandTotal).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Primary Checkout Action */}
              <button
                onClick={() => {
                  closeCart();
                  if (onProceedToCheckout) {
                    onProceedToCheckout();
                  }
                }}
                className="w-full py-3.5 px-6 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold shadow-md hover:shadow-luxury-hover transition-all flex items-center justify-center space-x-2"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Trust badges footer */}
              <div className="pt-1 flex items-center justify-center space-x-4 text-[10px] text-brand-muted">
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />
                  <span>256-Bit Encrypted</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Truck className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Shiprocket Express</span>
                </span>
                <span>•</span>
                <span>Fastrr 1-Click</span>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
