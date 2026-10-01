/**
 * Unified Marketing & E-Commerce Tracking Helper
 * Safely wraps both Meta Pixel (window.fbq) and Google Analytics 4 (window.gtag)
 * for standard e-commerce events:
 * - PageView / page_view
 * - ViewContent / view_item
 * - AddToCart / add_to_cart
 * - InitiateCheckout / begin_checkout
 * - Purchase / purchase
 */

import { trackGAEvent } from './analytics';

export const trackPixel = (eventName, params = {}) => {
  // 1. Meta Pixel Tracking
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', eventName, params);
    }
  } catch (err) {
    console.debug('[MetaPixel] Event tracking error:', err);
  }

  // 2. Automated Google Analytics 4 (GA4) Dual-Tracking
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      switch (eventName) {
        case 'PageView':
          trackGAEvent('page_view');
          break;
        case 'ViewContent':
          trackGAEvent('view_item', {
            currency: params.currency || 'INR',
            value: params.value || 0,
            items: Array.isArray(params.contents)
              ? params.contents.map((c) => ({ item_id: c.id, quantity: c.quantity || 1 }))
              : undefined,
          });
          break;
        case 'AddToCart':
          trackGAEvent('add_to_cart', {
            currency: params.currency || 'INR',
            value: params.value || 0,
            items: Array.isArray(params.contents)
              ? params.contents.map((c) => ({ item_id: c.id, quantity: c.quantity || 1 }))
              : undefined,
          });
          break;
        case 'InitiateCheckout':
          trackGAEvent('begin_checkout', {
            currency: params.currency || 'INR',
            value: params.value || 0,
            items: Array.isArray(params.contents)
              ? params.contents.map((c) => ({ item_id: c.id, quantity: c.quantity || 1 }))
              : undefined,
          });
          break;
        case 'Purchase':
          trackGAEvent('purchase', {
            transaction_id: String(params.order_id || params.orderId || `VJ-${Date.now()}`),
            currency: params.currency || 'INR',
            value: params.value || 0,
            items: Array.isArray(params.contents)
              ? params.contents.map((c) => ({ item_id: c.id, quantity: c.quantity || 1 }))
              : undefined,
          });
          break;
        default:
          trackGAEvent(eventName, params);
          break;
      }
    }
  } catch (err) {
    console.debug('[GA4] Dual tracking error:', err);
  }
};

export const trackCustomPixel = (eventName, params = {}) => {
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('trackCustom', eventName, params);
    }
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      trackGAEvent(eventName, params);
    }
  } catch (err) {
    console.debug('[Tracking] Custom event tracking error:', err);
  }
};
