import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const WishlistContext = createContext(null);

const STORAGE_KEY = 'valerie_jewels_wishlist_v1';

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Failed to parse wishlist from localStorage:', e);
      return [];
    }
  });

  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'add' });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
    } catch (e) {
      console.warn('Failed to save wishlist to localStorage:', e);
    }
  }, [wishlist]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => {
      setToast({ show: false, message: '', type: 'add' });
    }, 2800);
    return () => clearTimeout(timer);
  }, [toast.show]);

  const showToast = useCallback((message, type = 'add') => {
    setToast({ show: true, message, type });
  }, []);

  const isInWishlist = useCallback((productId) => {
    if (!productId) return false;
    return wishlist.some((item) => String(item.id) === String(productId));
  }, [wishlist]);

  const addToWishlist = useCallback((product) => {
    if (!product || !product.id) return;
    
    setWishlist((prev) => {
      if (prev.some((item) => String(item.id) === String(product.id))) {
        return prev;
      }
      
      const price = Number(product.price) || 0;
      const mrp = Number(product.mrp || product.price) || price;
      const discount = product.discount_percentage || 
        (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);

      const newItem = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price,
        mrp,
        primary_image: product.primary_image || (product.images && product.images[0]?.image_url) || '',
        material: product.material || '18K Gold PVD • Stainless Steel',
        category_name: product.category_name || '',
        discount_percentage: discount,
        is_anti_tarnish: Boolean(product.is_anti_tarnish),
        is_bestseller: Boolean(product.is_bestseller),
        in_stock: product.in_stock !== false,
        addedAt: new Date().toISOString(),
      };

      return [newItem, ...prev];
    });

    showToast(`"${product.name}" added to saved pieces`, 'add');
  }, [showToast]);

  const removeFromWishlist = useCallback((productId) => {
    if (!productId) return;
    
    setWishlist((prev) => {
      const existing = prev.find((item) => String(item.id) === String(productId));
      if (existing) {
        showToast(`Removed "${existing.name}" from wishlist`, 'remove');
      }
      return prev.filter((item) => String(item.id) !== String(productId));
    });
  }, [showToast]);

  const toggleWishlist = useCallback((product) => {
    if (!product || !product.id) return;
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  }, [isInWishlist, addToWishlist, removeFromWishlist]);

  const clearWishlist = useCallback(() => {
    setWishlist([]);
    showToast('Wishlist cleared', 'remove');
  }, [showToast]);

  const openWishlist = useCallback(() => {
    setIsWishlistOpen(true);
  }, []);

  const closeWishlist = useCallback(() => {
    setIsWishlistOpen(false);
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistCount: wishlist.length,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        clearWishlist,
        isWishlistOpen,
        setIsWishlistOpen,
        openWishlist,
        closeWishlist,
        toast,
        dismissToast: () => setToast({ show: false, message: '', type: 'add' }),
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
