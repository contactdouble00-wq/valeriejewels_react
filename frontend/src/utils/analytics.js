/**
 * Google Analytics 4 (GA4) & gtag.js E-Commerce Tracking Helper
 * Safely wraps window.gtag calls for standard GA4 e-commerce events:
 * - page_view
 * - view_item
 * - add_to_cart
 * - begin_checkout
 * - purchase
 */

const TELEMETRY_STORAGE_KEY = 'valerie_live_telemetry_events';
const MAX_TELEMETRY_ITEMS = 60;

/**
 * Log event to local storage ring buffer and dispatch a live event for Admin Panel
 */
export const logLocalTelemetry = (eventName, params = {}) => {
  try {
    if (typeof window === 'undefined') return;
    const now = new Date();
    const eventRecord = {
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      eventName,
      params,
      timestamp: Date.now(),
      timeFormatted: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      page: window.location.pathname || '/',
    };

    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    list.unshift(eventRecord);
    if (list.length > MAX_TELEMETRY_ITEMS) {
      list = list.slice(0, MAX_TELEMETRY_ITEMS);
    }
    localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('valerie_analytics_event', { detail: eventRecord }));
  } catch (e) {
    // Non-blocking telemetry warning
  }
};

/**
 * Get all stored telemetry events
 */
export const getStoredTelemetry = () => {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
};

/**
 * Clear stored telemetry events
 */
export const clearStoredTelemetry = () => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TELEMETRY_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('valerie_analytics_event', { detail: { action: 'clear' } }));
  } catch (e) {
    // Non-blocking
  }
};

export const trackGAEvent = (eventName, params = {}) => {
  try {
    // 1. Record event for real-time Admin Panel Activity Stream
    logLocalTelemetry(eventName, params);

    // 2. Dispatch to official Google Analytics 4 gtag.js
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
