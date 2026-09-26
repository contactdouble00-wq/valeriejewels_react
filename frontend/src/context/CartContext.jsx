import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

const STORAGE_KEY = 'valerie_jewels_cart_v1';
const FREE_SHIPPING_THRESHOLD = 999;

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Failed to parse cart from localStorage:', e);
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Sync to localStorage whenever cartItems change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.warn('Failed to save cart to localStorage:', e);
    }
  }, [cartItems]);

  /**
   * Add a single product (with optional variant) to the cart
   */
  const addToCart = (product, variant = null, quantity = 1, openDrawer = true) => {
    setCartItems((prevItems) => {
      const itemKey = variant ? `p_${product.id}_v_${variant.id}` : `p_${product.id}`;
      const existingIndex = prevItems.findIndex((item) => item.key === itemKey);

      const price = variant && variant.price ? Number(variant.price) : Number(product.price);
      const mrp = variant && variant.mrp ? Number(variant.mrp) : Number(product.mrp || product.price);

      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      } else {
        const newItem = {
          key: itemKey,
          productId: product.id,
          variantId: variant ? variant.id : null,
          name: product.name,
          slug: product.slug,
          price,
          mrp,
          quantity,
          image: product.primary_image || (product.images && product.images[0]?.image_url),
          variantTitle: variant ? (variant.option1_value || variant.title) : null,
          material: product.material,
          isBundle: false,
        };
        return [...prevItems, newItem];
      }
    });

    if (openDrawer) {
      setIsCartOpen(true);
    }
  };

  /**
   * Add a combo bundle to the cart
   */
  const addBundleToCart = (bundle, quantity = 1, openDrawer = true) => {
    setCartItems((prevItems) => {
      const itemKey = `b_${bundle.id}`;
      const existingIndex = prevItems.findIndex((item) => item.key === itemKey);

      const price = Number(bundle.bundle_price);
      const mrp = Number(bundle.compare_price || bundle.bundle_price);

      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      } else {
        const newItem = {
          key: itemKey,
          bundleId: bundle.id,
          name: bundle.title,
          slug: bundle.slug,
          price,
          mrp,
          quantity,
          image: bundle.items && bundle.items[0]?.primary_image,
          badgeText: bundle.badge_text || 'Curated Combo',
          items: bundle.items || [],
          isBundle: true,
        };
        return [...prevItems, newItem];
      }
    });

    if (openDrawer) {
      setIsCartOpen(true);
    }
  };

  /**
   * Update quantity of a cart item
   */
  const updateQuantity = (itemKey, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemKey);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.key === itemKey ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  /**
   * Remove item completely from cart
   */
  const removeFromCart = (itemKey) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.key !== itemKey));
  };

  /**
   * Empty entire cart
   */
  const clearCart = () => {
    setCartItems([]);
  };

  // Computations
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalMrp = cartItems.reduce((sum, item) => sum + (item.mrp || item.price) * item.quantity, 0);
  const totalSavings = Math.max(0, totalMrp - subtotal);

  // Delivery Policy: 100% Free delivery on Prepaid and Partial COD orders
  const isFreeShipping = true;
  const freeShippingRemaining = 0;
  const freeShippingProgress = 100;
  const shippingFee = 0;
  const grandTotal = subtotal;

  return (
    <CartContext.Provider
      value={{
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
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        isCartOpen,
        setIsCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
        addToCart,
        addBundleToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
