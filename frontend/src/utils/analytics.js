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

/**
 * Deduplicated Google Tag Manager (GTM) -> Meta Pixel / CAPI Purchase Event Trigger
 * Pushes exactly once per order, stores 'purchase_fired_<orderId>' in sessionStorage and localStorage.
 * Clears ecommerce object first (dataLayer.push({ ecommerce: null })) to avoid stale parameters.
 * No raw PII in dataLayer.
 *
 * @param {Object} order - Verified order object from backend
 * @returns {boolean} - true if event was dispatched, false if skipped due to dedupe
 */
export const trackPurchase = (order) => {
  if (!order) return false;
  const orderNumber = String(order.order_number || order.id || '').trim();
  if (!orderNumber) return false;

  const dedupeKey = `purchase_fired_${orderNumber}`;

  // Check deduplication in both sessionStorage and localStorage
  try {
    const alreadyFiredSession = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(dedupeKey) : null;
    const alreadyFiredLocal = typeof localStorage !== 'undefined' ? localStorage.getItem(dedupeKey) : null;
    if (alreadyFiredSession === 'true' || alreadyFiredLocal === 'true') {
      if (process.env.NODE_ENV !== 'production') {
        console.info(`[GTM] Purchase event already fired for order ${orderNumber}. Skipping duplicate.`);
      }
      return false;
    }
  } catch (_) {
    // If storage is restricted, proceed safely
  }

  // Format payment type
  const isPartial = order.payment_type === 'partial';
  const paymentTypeStr = isPartial ? 'partial_cod' : (order.payment_type === 'cod' ? 'cod' : 'prepaid');

  // Value calculation:
  // For Meta conversion tracking and Google Ads ROAS:
  // - Full order value represents the total purchase contract (e.g. ₹1,299)
  // - Amount paid upfront represents online cash collected immediately (e.g. ₹100 for partial COD)
  const fullOrderValue = Number(order.total_amount ?? order.total ?? 0);
  const upfrontPaidValue = Number(order.amount_paid_upfront ?? fullOrderValue);
  const purchaseValue = isPartial ? fullOrderValue : fullOrderValue;

  // Format line items according to GA4 / GTM / Meta e-commerce standards
  const rawItems = Array.isArray(order.items) ? order.items : [];
  const formattedItems = rawItems.map((item, idx) => ({
    item_id: String(item.product_id || item.variant_id || item.id || `item_${idx + 1}`),
    item_name: String(item.product_name || item.name || 'Valerie Fine Jewelry'),
    price: Number(item.unit_price || item.price || 0),
    quantity: Number(item.quantity || 1),
    item_variant: item.variant_title || item.variant || undefined,
  }));

  // GTM dataLayer push
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];

    // Step 1: Clear the previous ecommerce object to prevent parameter leakage
    window.dataLayer.push({ ecommerce: null });

    // Step 2: Push the official 'purchase' event with event_id for Meta deduplication
    const payload = {
      event: 'purchase',
      event_id: orderNumber, // Matches Meta Pixel <-> CAPI event_id for 100% deduplication
      ecommerce: {
        transaction_id: orderNumber,
        value: purchaseValue,
        currency: 'INR',
        payment_type: paymentTypeStr,
        amount_paid_now: upfrontPaidValue,
        balance_due_on_delivery: Number(order.amount_due_on_delivery || 0),
        tax: 0,
        shipping: Number(order.shipping_fee || 0),
        coupon: order.coupon_code || undefined,
        items: formattedItems,
      },
    };

    window.dataLayer.push(payload);

    // Also record local telemetry for real-time Admin Portal activity stream
    logLocalTelemetry('purchase', {
      orderId: orderNumber,
      value: purchaseValue,
      payment_type: paymentTypeStr,
      itemCount: formattedItems.length,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[GTM] Purchase event successfully pushed for order ${orderNumber}:`, payload);
    }
  }

  // Mark as fired in both sessionStorage and localStorage to guarantee zero duplicates on refresh or back
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(dedupeKey, 'true');
    if (typeof localStorage !== 'undefined') localStorage.setItem(dedupeKey, 'true');
  } catch (_) {}

  return true;
};
