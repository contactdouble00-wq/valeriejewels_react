/**
 * VALERIE JEWELS — Omnichannel Analytics & Conversion Tracking Helper
 * Integrates:
 * 1. Meta Pixel & Conversions API (CAPI) with Manual Advanced Matching (Pixel ID: 1574336098052134)
 * 2. Google Analytics 4 (GA4) / gtag.js e-commerce events
 * 3. Google Tag Manager (GTM) dataLayer with deduplication & root-level parameter compliance
 * 4. Local telemetry ring buffer for real-time Executive Operations Dashboard
 */

export const META_PIXEL_ID = '1574336098052134';

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

/**
 * Sanitize and format customer data for Meta Pixel Manual Advanced Matching
 * Follows Meta specifications:
 * - em: lowercase, trimmed email
 * - ph: E.164-compatible without '+', e.g. 919876543210 (10 digits prepended with 91)
 * - fn: lowercase first name
 * - ln: lowercase last name
 * - ct: lowercase city, alphanumeric only
 * - st: lowercase state
 * - zp: lowercase zip / postal code
 * - country: 'in'
 */
export const normalizeMetaUserData = (rawUser = {}) => {
  if (!rawUser || typeof rawUser !== 'object') return {};
  const normalized = {};

  // Email
  const rawEmail = rawUser.email || rawUser.customer_email || rawUser.shipping_email || rawUser.em || '';
  if (rawEmail && typeof rawEmail === 'string' && rawEmail.includes('@')) {
    normalized.em = rawEmail.trim().toLowerCase();
  }

  // Phone
  const rawPhone = rawUser.phone || rawUser.customer_phone || rawUser.shipping_phone || rawUser.ph || '';
  if (rawPhone) {
    let digits = String(rawPhone).replace(/\D/g, '');
    if (digits.length === 10) {
      digits = '91' + digits;
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = '91' + digits.slice(1);
    }
    if (digits.length >= 10) {
      normalized.ph = digits;
    }
  }

  // First & Last Name
  const fullName = String(rawUser.name || rawUser.customer_name || rawUser.shipping_name || '').trim();
  let fn = String(rawUser.first_name || rawUser.firstName || rawUser.fn || '').trim();
  let ln = String(rawUser.last_name || rawUser.lastName || rawUser.ln || '').trim();

  if (!fn && fullName) {
    const parts = fullName.split(/\s+/);
    fn = parts[0] || '';
    if (parts.length > 1) {
      ln = parts.slice(1).join(' ');
    }
  }

  if (fn) normalized.fn = fn.toLowerCase().replace(/[^a-z]/g, '');
  if (ln) normalized.ln = ln.toLowerCase().replace(/[^a-z]/g, '');

  // City
  const rawCity = String(rawUser.city || rawUser.shipping_city || rawUser.ct || '').trim();
  if (rawCity) {
    normalized.ct = rawCity.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // State
  const rawState = String(rawUser.state || rawUser.shipping_state || rawUser.st || '').trim();
  if (rawState) {
    normalized.st = rawState.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Zip / Pincode
  const rawZip = String(rawUser.pincode || rawUser.zip || rawUser.postal_code || rawUser.shipping_pincode || rawUser.zp || '').trim();
  if (rawZip) {
    normalized.zp = rawZip.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Country
  normalized.country = 'in';

  // External ID (optional order or user id)
  const extId = rawUser.external_id || rawUser.order_number || rawUser.orderId || rawUser.id;
  if (extId) {
    normalized.external_id = String(extId).trim();
  }

  return normalized;
};

/**
 * Configure Meta Pixel Manual Advanced Matching
 * Updates fbq instance with customer details and caches them locally
 */
export const setMetaAdvancedMatching = (userData = {}) => {
  try {
    const normalized = normalizeMetaUserData(userData);
    if (Object.keys(normalized).length === 0) return;

    // Cache locally so subsequent PageViews can also use it
    if (typeof localStorage !== 'undefined') {
      try {
        const existingRaw = localStorage.getItem('valerie_meta_user_data');
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        const merged = { ...existing, ...normalized };
        localStorage.setItem('valerie_meta_user_data', JSON.stringify(merged));
      } catch (_) {}
    }

    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('init', META_PIXEL_ID, normalized);
      window.fbq('setUserProperties', META_PIXEL_ID, normalized);
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[Meta Pixel] Manual Advanced Matching updated:', normalized);
      }
    }
  } catch (err) {
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
 * Track Product View in GA4 & Meta Pixel
 */
export const trackGAViewItem = (product) => {
  if (!product) return;
  const price = Math.round((Number(product.price) || 0) * 100) / 100;
  const productId = String(product.id || product.slug || '');

  trackGAEvent('view_item', {
    currency: 'INR',
    value: price,
    items: [
      {
        item_id: productId,
        item_name: product.name || '',
        price: price,
        item_category: product.category_name || 'Everyday Luxury',
        quantity: 1,
      },
    ],
  });

  // Direct Meta Pixel ViewContent event
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'ViewContent', {
        value: price,
        currency: 'INR',
        content_name: product.name || '',
        content_ids: [productId],
        content_type: 'product',
      });
    }
  } catch (_) {}
};

/**
 * Track Add To Cart in GA4 & Meta Pixel
 */
export const trackGAAddToCart = (product, variant = null, quantity = 1) => {
  if (!product) return;
  const price = Math.round((variant && variant.price ? Number(variant.price) : Number(product.price) || 0) * 100) / 100;
  const totalValue = Math.round((price * quantity) * 100) / 100;
  const itemId = String(variant?.id || product.id || product.slug || '');

  trackGAEvent('add_to_cart', {
    currency: 'INR',
    value: totalValue,
    items: [
      {
        item_id: itemId,
        item_name: product.name || '',
        item_variant: variant?.option1_value || variant?.title || undefined,
        price: price,
        item_category: product.category_name || 'Everyday Luxury',
        quantity: quantity,
      },
    ],
  });

  // Direct Meta Pixel AddToCart event
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'AddToCart', {
        value: totalValue,
        currency: 'INR',
        content_name: product.name || '',
        content_ids: [itemId],
        content_type: 'product',
        num_items: Number(quantity) || 1,
      });
    }
  } catch (_) {}
};

/**
 * Track Begin Checkout in GA4 & Meta Pixel
 */
export const trackGABeginCheckout = (items = [], totalValue = 0) => {
  const numericValue = Math.round((Number(totalValue) || 0) * 100) / 100;
  trackGAEvent('begin_checkout', {
    currency: 'INR',
    value: numericValue,
    items: items.map((it) => ({
      item_id: String(it.productId || it.variantId || it.id || ''),
      item_name: it.name || it.title || '',
      price: Math.round((Number(it.price) || 0) * 100) / 100,
      quantity: Number(it.quantity) || 1,
    })),
  });

  // Direct Meta Pixel InitiateCheckout event
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'InitiateCheckout', {
        value: numericValue,
        currency: 'INR',
        num_items: items.length,
        content_type: 'product',
        content_ids: items.map((it) => String(it.productId || it.variantId || it.id || '')),
      });
    }
  } catch (_) {}
};

/**
 * Track Purchase Conversion in GA4
 */
export const trackGAPurchase = ({ orderId, totalAmount, items = [] }) => {
  const numericValue = Math.round((Number(totalAmount) || 0) * 100) / 100;
  trackGAEvent('purchase', {
    transaction_id: String(orderId || `VJ-${Date.now()}`),
    value: numericValue,
    currency: 'INR',
    items: items.map((it) => ({
      item_id: String(it.productId || it.variantId || it.id || ''),
      item_name: it.name || it.title || '',
      price: Math.round((Number(it.price) || 0) * 100) / 100,
      quantity: Number(it.quantity) || 1,
    })),
  });
};

/**
 * Deduplicated Official Meta Pixel, Conversions API (CAPI) & Google Tag Manager (GTM) Purchase Event Trigger
 *
 * Guarantees:
 * 1. Exact 3-letter currency code ('INR') with NO symbols or spaces
 * 2. Exact numeric value (floating point, 2 decimals) without strings or formatting
 * 3. Root-level 'value' and 'currency' for GTM Meta tags expecting {{value}} and {{currency}}
 * 4. E-commerce object 'ecommerce.value' and 'ecommerce.currency' for standard GTM tags
 * 5. Direct Meta Pixel window.fbq('track', 'Purchase', ...) with eventID for 100% CAPI deduplication
 * 6. Manual Advanced Matching (fbq init with email, phone, name, city, zip)
 * 7. Deduplication key 'purchase_fired_<orderId>' in both sessionStorage and localStorage
 *
 * @param {Object} order - Verified order object from backend or checkout modal
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
        console.info(`[Analytics] Purchase event already fired for order ${orderNumber}. Skipping duplicate.`);
      }
      return false;
    }
  } catch (_) {
    // If storage is restricted, proceed safely
  }

  // 1. Dynamic Manual Advanced Matching on Purchase
  setMetaAdvancedMatching(order);

  // 2. Format payment type
  const isPartial = order.payment_type === 'partial';
  const paymentTypeStr = isPartial ? 'partial_cod' : (order.payment_type === 'cod' ? 'cod' : 'prepaid');

  // 3. Value calculation: strictly numeric float, 2 decimal places, positive number
  let rawTotal = Number(order.total_amount ?? order.total ?? 0);
  if (isNaN(rawTotal) || rawTotal <= 0) {
    if (Array.isArray(order.items)) {
      rawTotal = order.items.reduce((acc, it) => acc + (Number(it.unit_price || it.price || 0) * Number(it.quantity || 1)), 0);
    }
  }
  const purchaseValue = Math.round(Number(rawTotal || 0) * 100) / 100;
  const upfrontPaidValue = Math.round(Number(order.amount_paid_upfront ?? purchaseValue) * 100) / 100;

  // Strict 3-letter currency code as required by Meta Pixel and GA4 standards
  const currencyCode = 'INR';

  // Format line items according to GA4 / GTM / Meta e-commerce standards
  const rawItems = Array.isArray(order.items) ? order.items : [];
  const formattedItems = rawItems.map((item, idx) => ({
    item_id: String(item.product_id || item.variant_id || item.productId || item.id || `item_${idx + 1}`),
    item_name: String(item.product_name || item.name || item.title || 'Valerie Fine Jewelry'),
    price: Math.round(Number(item.unit_price || item.price || 0) * 100) / 100,
    quantity: Number(item.quantity || 1),
    item_variant: item.variant_title || item.variant || undefined,
  }));

  const totalQuantity = formattedItems.reduce((acc, it) => acc + (it.quantity || 1), 0);

  // 4. Direct Meta Pixel purchase tracking
  // Addresses Meta error: "Currency field is missing" / "value and currency parameters are missing"
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      const fbContents = formattedItems.map((it) => ({
        id: it.item_id,
        quantity: it.quantity,
        item_price: it.price,
      }));
      const fbContentIds = formattedItems.map((it) => it.item_id);

      window.fbq(
        'track',
        'Purchase',
        {
          value: purchaseValue,
          currency: currencyCode, // Strictly 'INR' (3-letter uppercase ISO code)
          content_type: 'product',
          contents: fbContents,
          content_ids: fbContentIds,
          num_items: totalQuantity,
        },
        {
          eventID: orderNumber, // Matches CAPI event_id for 100% deduplication
        }
      );

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Meta Pixel] fbq Purchase tracked for order ${orderNumber}:`, {
          value: purchaseValue,
          currency: currencyCode,
          eventID: orderNumber,
        });
      }
    }
  } catch (fbErr) {
    console.warn('[Meta Pixel] fbq track Purchase failed:', fbErr);
  }

  // 5. Google Tag Manager dataLayer push
  // Provides value and currency at BOTH root level and inside ecommerce object
  // so any GTM Meta Pixel or CAPI tag receives valid parameters regardless of variable mapping!
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];

    // Step A: Clear previous ecommerce object to prevent parameter leakage
    window.dataLayer.push({ ecommerce: null });

    // Step B: Push official 'purchase' event
    const payload = {
      event: 'purchase',
      event_id: orderNumber, // Matches Meta Pixel <-> CAPI event_id for 100% deduplication
      transaction_id: orderNumber,
      value: purchaseValue, // Root-level value for GTM tags reading {{value}}
      currency: currencyCode, // Root-level currency for GTM tags reading {{currency}}
      ecommerce: {
        transaction_id: orderNumber,
        value: purchaseValue, // E-commerce value for GTM tags reading {{ecommerce.value}}
        currency: currencyCode, // E-commerce currency for GTM tags reading {{ecommerce.currency}}
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
      currency: currencyCode,
      payment_type: paymentTypeStr,
      itemCount: formattedItems.length,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[GTM] Purchase event successfully pushed for order ${orderNumber}:`, payload);
    }
  }

  // 6. Keep GA4 gtag in sync
  try {
    trackGAPurchase({
      orderId: orderNumber,
      totalAmount: purchaseValue,
      items: formattedItems,
    });
  } catch (_) {}

  // Mark as fired in both sessionStorage and localStorage to guarantee zero duplicates on refresh or back
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(dedupeKey, 'true');
    if (typeof localStorage !== 'undefined') localStorage.setItem(dedupeKey, 'true');
  } catch (_) {}

  return true;
};
