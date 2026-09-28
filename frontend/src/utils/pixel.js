/**
 * Meta Pixel Tracking Helper
 * Safely wraps window.fbq calls for standard e-commerce events:
 * - PageView
 * - ViewContent
 * - AddToCart
 * - InitiateCheckout
 * - Purchase
 */

export const trackPixel = (eventName, params = {}) => {
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', eventName, params);
    }
  } catch (err) {
    console.debug('[MetaPixel] Event tracking error:', err);
  }
};

export const trackCustomPixel = (eventName, params = {}) => {
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('trackCustom', eventName, params);
    }
  } catch (err) {
    console.debug('[MetaPixel] Custom event tracking error:', err);
  }
};
