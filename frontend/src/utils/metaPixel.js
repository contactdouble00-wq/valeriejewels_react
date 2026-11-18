/**
 * Meta Pixel Manual Advanced Matching Helper
 * Reference: https://developers.facebook.com/docs/meta-pixel/advanced/advanced-matching/
 *
 * Manual Advanced Matching securely passes normalized customer identity data (email, phone, name,
 * location) to the Meta Pixel (fbevents.js). The Meta Pixel library automatically SHA-256 hashes
 * the parameters client-side before transmission.
 */

// Known placeholder/test values to reject
const PLACEHOLDER_EMAILS = new Set([
  'email@email.com',
  'test@test.com',
  'example@example.com',
  'user@domain.com',
  'sample@example.com',
]);

const PLACEHOLDER_PHONES = new Set([
  '1234567890',
  '01234567890',
  '911234567890',
  '0000000000',
  '9999999999',
]);

// Module-level memoization to guard against duplicate calls across renders & StrictMode double-invocation
let lastInitializedSignature = null;
let lastInitializedPixelId = null;

/**
 * Checks whether user has consented to tracking based on site cookie/privacy preferences.
 * By default in Indian e-commerce, consent is active unless explicitly opted out via cookie/privacy settings.
 */
export const hasTrackingConsent = () => {
  if (typeof window === 'undefined') return false;
  try {
    const consent = localStorage.getItem('valerie_cookie_consent') || localStorage.getItem('cookie_consent');
    if (consent === 'denied' || consent === 'false') {
      return false;
    }
    return true;
  } catch {
    return true;
  }
};

/**
 * Dynamically resolves Meta Pixel ID from environment variables or existing initialized pixel instance.
 * Avoids hardcoding the pixel ID inside this utility.
 */
export const getMetaPixelId = () => {
  // 1. Vite environment variables
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_META_PIXEL_ID) {
      return String(import.meta.env.VITE_META_PIXEL_ID).trim();
    }
    if (import.meta.env.VITE_META_DATASET_ID) {
      return String(import.meta.env.VITE_META_DATASET_ID).trim();
    }
  }

  // 2. Global window object inspection (if base snippet recorded an init call)
  if (typeof window !== 'undefined') {
    if (window._fbqPixelId) {
      return String(window._fbqPixelId).trim();
    }
    if (window.fbq && Array.isArray(window.fbq.queue)) {
      const initCall = window.fbq.queue.find(
        (args) => args && args[0] === 'init' && typeof args[1] === 'string'
      );
      if (initCall && initCall[1]) {
        return initCall[1].trim();
      }
    }
  }

  return '';
};

/**
 * Normalize email: trimmed, lowercase, filter out invalid/placeholder patterns.
 */
export const normalizeEmail = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@') || trimmed.length < 5) return '';
  if (PLACEHOLDER_EMAILS.has(trimmed)) return '';
  return trimmed;
};

/**
 * Normalize phone: digits only, including country code, no "+" or spaces.
 * For 10-digit Indian numbers, automatically prepends "91".
 */
export const normalizePhone = (raw) => {
  if (!raw || (typeof raw !== 'string' && typeof raw !== 'number')) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits || digits.length < 7) return '';

  let normalized = digits;
  if (digits.length === 10) {
    // 10-digit mobile number in India: prepend 91 country code
    normalized = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    // 11-digit number with leading 0: replace 0 with 91
    normalized = `91${digits.slice(1)}`;
  }

  if (PLACEHOLDER_PHONES.has(digits) || PLACEHOLDER_PHONES.has(normalized)) {
    return '';
  }

  return normalized;
};

/**
 * Normalize name string (removes special symbols, converts to lowercase).
 */
export const normalizeName = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().toLowerCase().replace(/[^a-z\s]/gi, '');
};

/**
 * Normalize city: lowercase, removes spaces and punctuation (Meta spec: lowercase, no spaces).
 */
export const normalizeCity = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().toLowerCase().replace(/[^a-z]/g, '');
};

/**
 * Normalize state: lowercase, letters only without punctuation.
 */
export const normalizeState = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().toLowerCase().replace(/[^a-z]/g, '');
};

/**
 * Normalize postal code / pincode: lowercase alphanumeric, removes spaces and dashes.
 */
export const normalizeZip = (raw) => {
  if (!raw || (typeof raw !== 'string' && typeof raw !== 'number')) return '';
  return String(raw).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Normalize country: 2-letter lowercase ISO country code (default 'in' for Valerie Jewels).
 */
export const normalizeCountry = (raw) => {
  if (!raw || typeof raw !== 'string') return 'in';
  const clean = raw.trim().toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length === 2) return clean;
  if (clean === 'india') return 'in';
  return clean.slice(0, 2) || 'in';
};

/**
 * Extracts and normalizes user parameters for Meta Advanced Matching.
 * Returns an object containing ONLY non-empty, valid fields (em, ph, fn, ln, ct, st, zp, country, external_id).
 * NOTE: Values are NOT hashed here. The Meta Pixel library (fbevents.js) applies SHA-256 automatically.
 */
export const buildMatchingData = (user) => {
  if (!user || typeof user !== 'object') return {};

  const matchingData = {};

  // Email (em)
  const em = normalizeEmail(user.email || user.em || user.customer_email);
  if (em) matchingData.em = em;

  // Phone (ph)
  const ph = normalizePhone(user.phone || user.ph || user.customer_phone || user.mobile);
  if (ph) matchingData.ph = ph;

  // First name (fn) & Last name (ln)
  let fn = normalizeName(user.first_name || user.firstName || user.fn);
  let ln = normalizeName(user.last_name || user.lastName || user.ln);

  const fullName = String(user.name || user.customer_name || '').trim();
  if (fullName && (!fn || !ln)) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (!fn && parts.length > 0) fn = normalizeName(parts[0]);
    if (!ln && parts.length > 1) ln = normalizeName(parts.slice(1).join(' '));
  }

  if (fn) matchingData.fn = fn;
  if (ln) matchingData.ln = ln;

  // City (ct)
  const ct = normalizeCity(user.city || user.ct || user.shipping_city);
  if (ct) matchingData.ct = ct;

  // State (st)
  const st = normalizeState(user.state || user.st || user.shipping_state);
  if (st) matchingData.st = st;

  // Postal code / ZIP (zp)
  const zp = normalizeZip(
    user.pincode || user.pin || user.zp || user.zip || user.postal_code || user.shipping_pincode
  );
  if (zp) matchingData.zp = zp;

  // Country
  if (ct || st || zp || em || ph) {
    const country = normalizeCountry(user.country);
    if (country) matchingData.country = country;
  }

  // External ID (optional advertiser ID)
  const externalId = String(user.id || user.user_id || user.external_id || '').trim();
  if (externalId && externalId !== 'null' && externalId !== 'undefined') {
    matchingData.external_id = externalId;
  }

  return matchingData;
};

/**
 * Initializes or updates Meta Pixel with Manual Advanced Matching data.
 *
 * @param {Object} user - User object containing email, phone, name, and/or address.
 * @param {string|null} customPixelId - Optional override for Meta Pixel ID.
 * @returns {boolean} - true if fbq('init', PIXEL_ID, matchingData) was executed; false if skipped.
 */
export const initPixelWithMatching = (user, customPixelId = null) => {
  // 1. Guard: make sure window and window.fbq exist before calling
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') {
    return false;
  }

  // 2. Guard: verify user tracking consent
  if (!hasTrackingConsent()) {
    return false;
  }

  // 3. Resolve Meta Pixel ID from environment
  const pixelId = customPixelId || getMetaPixelId();
  if (!pixelId) {
    return false;
  }

  // 4. Build normalized matching data
  const matchingData = buildMatchingData(user);
  const keys = Object.keys(matchingData);

  // 5. If no user data is available (guest visitor), keep the normal fbq('init', PIXEL_ID)
  // with no matching object, and NEVER send empty or placeholder values.
  if (keys.length === 0) {
    return false;
  }

  // 6. Guard against duplicate calls:
  // Prevent React StrictMode double-invocation in development and avoid re-firing on identical data
  const signature = `${pixelId}:${JSON.stringify(matchingData)}`;
  if (lastInitializedSignature === signature && lastInitializedPixelId === pixelId) {
    return false;
  }

  lastInitializedSignature = signature;
  lastInitializedPixelId = pixelId;

  // 7. Call fbq('init', PIXEL_ID, matchingData)
  // Meta's fbevents.js automatically applies SHA-256 client-side
  window.fbq('init', pixelId, matchingData);

  return true;
};

/**
 * Helper to reset deduplication cache (useful for testing).
 */
export const resetPixelMatchingCache = () => {
  lastInitializedSignature = null;
  lastInitializedPixelId = null;
};
