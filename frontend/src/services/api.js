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

export const apiService = {
  /**
   * Check backend health and status
   */
  async getHealth() {
    const response = await fetch(`${API_BASE_URL}/health.php`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  },

  /**
   * Fetch all active categories
   */
  async getCategories() {
    const response = await fetch(`${API_BASE_URL}/products/categories.php`);
    return handleResponse(response);
  },

  /**
   * Fetch products with optional filters and pagination
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

    const url = `${API_BASE_URL}/products/list.php?${query.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`);
    }
    const result = await response.json();
    return {
      products: result.data || [],
      meta: result.meta || {},
    };
  },

  /**
   * Fetch full product details by slug or id
   */
  async getProductDetail(slugOrId) {
    const isId = typeof slugOrId === 'number' || /^\d+$/.test(slugOrId);
    const param = isId ? `id=${slugOrId}` : `slug=${encodeURIComponent(slugOrId)}`;
    const response = await fetch(`${API_BASE_URL}/products/detail.php?${param}`);
    return handleResponse(response);
  },

  /**
   * Fetch curated bundles and combo offers
   */
  async getBundles() {
    const response = await fetch(`${API_BASE_URL}/products/bundles.php`);
    return handleResponse(response);
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
};


