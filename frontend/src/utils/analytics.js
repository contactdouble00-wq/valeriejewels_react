/**
 * Google Analytics 4 (GA4) & gtag.js E-Commerce Tracking Helper
 * Safely wraps window.gtag calls for standard GA4 e-commerce events:
 * - page_view
 * - view_item
 * - add_to_cart
 * - begin_checkout
 * - purchase
 */

export const trackGAEvent = (eventName, params = {}) => {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[GA4] Event tracked: ${eventName}`, params);
      }
    }
  } catch (err) {
    console.debug('[GA4] Event tracking error:', err);
  }
};

/**
 * Track Product View in GA4
 */
export const trackGAViewItem = (product) => {
  if (!product) return;
  const price = Number(product.price) || 0;
  trackGAEvent('view_item', {
    currency: 'INR',
    value: price,
    items: [
      {
        item_id: String(product.id || product.slug || ''),
        item_name: product.name || '',
        price: price,
        item_category: product.category_name || 'Everyday Luxury',
        quantity: 1,
      },
    ],
  });
};

/**
 * Track Add To Cart in GA4
 */
export const trackGAAddToCart = (product, variant = null, quantity = 1) => {
  if (!product) return;
  const price = variant && variant.price ? Number(variant.price) : Number(product.price) || 0;
  trackGAEvent('add_to_cart', {
    currency: 'INR',
    value: price * quantity,
    items: [
      {
        item_id: String(variant?.id || product.id || product.slug || ''),
        item_name: product.name || '',
        item_variant: variant?.option1_value || variant?.title || undefined,
        price: price,
        item_category: product.category_name || 'Everyday Luxury',
        quantity: quantity,
      },
    ],
  });
};

/**
 * Track Begin Checkout in GA4
 */
export const trackGABeginCheckout = (items = [], totalValue = 0) => {
  trackGAEvent('begin_checkout', {
    currency: 'INR',
    value: Number(totalValue) || 0,
    items: items.map((it) => ({
      item_id: String(it.productId || it.variantId || it.id || ''),
      item_name: it.name || it.title || '',
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 1,
    })),
  });
};

/**
 * Track Purchase Conversion in GA4
 */
export const trackGAPurchase = ({ orderId, totalAmount, items = [] }) => {
  trackGAEvent('purchase', {
    transaction_id: String(orderId || `VJ-${Date.now()}`),
    value: Number(totalAmount) || 0,
    currency: 'INR',
    items: items.map((it) => ({
      item_id: String(it.productId || it.variantId || it.id || ''),
      item_name: it.name || it.title || '',
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 1,
    })),
  });
};
