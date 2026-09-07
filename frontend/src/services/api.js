/**
 * VALERIE JEWELS — API Client Service
 */

function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    if (!isLocal) {
      const envUrl = import.meta.env.VITE_API_BASE_URL;
      if (envUrl && envUrl.startsWith('https://')) {
        return envUrl.replace(/\/+$/, '');
      }
      return '/api';
    }
  }
  const rawUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  return rawUrl.replace(/\/+$/, '');
}

const API_BASE_URL = getApiBaseUrl();

/**
 * Helper to handle fetch responses safely
 */
async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error with status ${response.status}`);
  }
  const result = await response.json();
  return result.data;
}

import { SEED_CATEGORIES, SEED_PRODUCTS, SEED_BUNDLES } from '../data/seedCatalog';
import { DEFAULT_POLICIES } from '../data/defaultPolicies';
import { DEFAULT_FAQS_DATA } from '../data/defaultFaqs';

function filterSeedProducts(params = {}) {
  let list = [...SEED_PRODUCTS];

  if (params.category && params.category !== 'all') {
    list = list.filter((p) => p.category_slug === params.category || String(p.category_id) === String(params.category));
  }
  if (params.minPrice) {
    list = list.filter((p) => Number(p.price) >= Number(params.minPrice));
  }
  if (params.maxPrice) {
    list = list.filter((p) => Number(p.price) <= Number(params.maxPrice));
  }
  if (params.bestseller) {
    list = list.filter((p) => Number(p.is_bestseller) === 1);
  }
  if (params.search) {
    const s = params.search.toLowerCase();
    list = list.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(s)) ||
        (p.short_description && p.short_description.toLowerCase().includes(s)) ||
        (p.description && p.description.toLowerCase().includes(s))
    );
  }

  // Sort
  if (params.sort === 'price_low') {
    list.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (params.sort === 'price_high') {
    list.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (params.sort === 'newest') {
    list.sort((a, b) => b.id - a.id);
  } else {
    list.sort((a, b) => (b.is_bestseller || 0) - (a.is_bestseller || 0));
  }

  return {
    products: list,
    meta: {
      page: 1,
      limit: params.limit || 12,
      total_items: list.length,
      total_pages: 1,
    },
  };
}

export const apiService = {
  /**
   * Check backend health and status
   */
  async getHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health.php`);
      if (response.ok) return await response.json();
    } catch {
      // Return safe offline state
    }
    return {
      success: true,
      data: {
        store: 'VALERIE JEWELS',
        status: 'online',
        database: { connected: false, message: 'Running with cached catalog' },
      },
    };
  },

  /**
   * Fetch all active categories with seed fallback
   */
  async getCategories() {
    try {
      const response = await fetch(`${API_BASE_URL}/products/categories.php`);
      if (response.ok) {
        const result = await response.json();
        if (Array.isArray(result.data) && result.data.length > 0) {
          return result.data;
        }
      }
    } catch (err) {
      console.warn('API getCategories error, falling back to seed categories:', err);
    }
    return SEED_CATEGORIES;
  },

  /**
   * Fetch products with optional filters, pagination, and seed fallback
   */
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'all') query.append('category', params.category);
    if (params.minPrice) query.append('min_price', params.minPrice);
    if (params.maxPrice) query.append('max_price', params.maxPrice);
    if (params.sort) query.append('sort', params.sort);
    if (params.bestseller) query.append('bestseller', params.bestseller);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    try {
      const url = `${API_BASE_URL}/products/list.php?${query.toString()}`;
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        if (Array.isArray(result.data) && result.data.length > 0) {
          return {
            products: result.data,
            meta: result.meta || {},
          };
        }
      }
    } catch (err) {
      console.warn('API getProducts error, falling back to seed products:', err);
    }
    return filterSeedProducts(params);
  },

  /**
   * Fetch full product details by slug or id with seed fallback
   */
  async getProductDetail(slugOrId) {
    const isId = typeof slugOrId === 'number' || /^\d+$/.test(slugOrId);
    const param = isId ? `id=${slugOrId}` : `slug=${encodeURIComponent(slugOrId)}`;
    try {
      const response = await fetch(`${API_BASE_URL}/products/detail.php?${param}`);
      if (response.ok) {
        const result = await response.json();
        if (result.data) return result.data;
      }
    } catch (err) {
      console.warn('API getProductDetail error, falling back to seed:', err);
    }
    const found = SEED_PRODUCTS.find((p) => (isId ? String(p.id) === String(slugOrId) : p.slug === slugOrId));
    return found || null;
  },

  /**
   * Fetch curated bundles and combo offers with seed fallback
   */
  async getBundles() {
    try {
      const response = await fetch(`${API_BASE_URL}/products/bundles.php`);
      if (response.ok) {
        const result = await response.json();
        if (Array.isArray(result.data) && result.data.length > 0) {
          return result.data;
        }
      }
    } catch (err) {
      console.warn('API getBundles error, falling back to seed bundles:', err);
    }
    return SEED_BUNDLES;
  },

  /**
   * Customer and Admin Login
   */
  async login({ email, password, isAdminPortal = false }) {
    const response = await fetch(`${API_BASE_URL}/auth/login.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, is_admin_portal: isAdminPortal }),
    });
    return handleResponse(response);
  },

  /**
   * Customer Registration
   */
  async register({ name, email, phone, password }) {
    const response = await fetch(`${API_BASE_URL}/auth/register.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password }),
    });
    return handleResponse(response);
  },

  /**
   * Fetch current authenticated profile
   */
  async getMe(token) {
    const response = await fetch(`${API_BASE_URL}/auth/me.php`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },

  /**
   * Phase 5: Calculate checkout totals & payment splits strictly server-side
   */
  async calculateCheckout({ items, couponCode = '' }) {
    const response = await fetch(`${API_BASE_URL}/payments/calculate.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items,
        coupon_code: couponCode,
      }),
    });
    return handleResponse(response);
  },

  /**
   * Phase 5: Initiate checkout & create order in MySQL
   */
  async initiateCheckout(checkoutPayload, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/payments/initiate.php`, {
      method: 'POST',
      headers,
      body: JSON.stringify(checkoutPayload),
    });
    return handleResponse(response);
  },

  /**
   * Phase 5: Verify payment status & get order receipt
   */
  async verifyPayment(orderNumber, simulateSuccess = false) {
    const query = new URLSearchParams({
      order_number: orderNumber,
    });
    if (simulateSuccess) query.append('simulate_success', '1');

    const response = await fetch(`${API_BASE_URL}/payments/verify.php?${query.toString()}`);
    return handleResponse(response);
  },

  /**
   * Phase 6: Track order by order reference & contact
   */
  async trackOrder(orderNumber, contact = '') {
    const query = new URLSearchParams({
      order_number: orderNumber,
    });
    if (contact) query.append('contact', contact);

    const response = await fetch(`${API_BASE_URL}/orders/track.php?${query.toString()}`);
    return handleResponse(response);
  },

  /**
   * Phase 6: Fetch customer order history
   */
  async getCustomerOrders({ token = null, email = '', phone = '' } = {}) {
    const query = new URLSearchParams();
    if (email) query.append('email', email);
    if (phone) query.append('phone', phone);

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/orders/list.php?${query.toString()}`, {
      headers,
    });
    return handleResponse(response);
  },

  /**
   * Phase 6: Customer-initiated order cancellation
   */
  async cancelOrder({ orderNumber, reason = '', contact = '', token = null }) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/orders/cancel.php`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        order_number: orderNumber,
        reason,
        contact,
      }),
    });
    return handleResponse(response);
  },

  /**
   * Phase 6 Sandbox: Advance shipment status for testing
   */
  async advanceShipmentStatus({ orderNumber, status, location = '', note = '' }) {
    const response = await fetch(`${API_BASE_URL}/shipping/advance.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_number: orderNumber,
        status,
        location,
        note,
      }),
    });
    return handleResponse(response);
  },

  /**
   * Fetch legal policies (Shipping, Returns, Privacy, Terms) with fallback
   */
  async getPolicies() {
    try {
      const response = await fetch(`${API_BASE_URL}/policies/get.php`);
      if (response.ok) {
        const result = await response.json();
        if (result.data) return result.data;
      }
    } catch (err) {
      console.warn('API getPolicies error, falling back to default policies:', err);
    }
    return DEFAULT_POLICIES;
  },

  /**
   * Fetch FAQs with fallback
   */
  async getFaqs() {
    try {
      const response = await fetch(`${API_BASE_URL}/faqs/get.php`);
      if (response.ok) {
        const result = await response.json();
        if (result.data) return result.data;
      }
    } catch (err) {
      console.warn('API getFaqs error, falling back to default faqs:', err);
    }
    return DEFAULT_FAQS_DATA;
  },
};


