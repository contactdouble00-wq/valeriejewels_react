/**
 * VALERIE JEWELS — Admin API Service
 * Handles authenticated communication with /api/admin/* endpoints using JWT.
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
  const rawUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
  return rawUrl.replace(/\/+$/, '');
}

const API_BASE_URL = getApiBaseUrl();

function getAdminToken() {
  return localStorage.getItem('valerie_admin_token') || '';
}

async function request(endpoint, options = {}) {
  const token = getAdminToken();
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is not FormData, add Content-Type: application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('valerie_admin_token');
        localStorage.removeItem('valerie_admin_user');
      }
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (err) {
    console.error(`Admin API Error [${endpoint}]:`, err);
    throw err;
  }
}

export const adminApi = {
  // Auth
  async login(email, password) {
    const res = await request('/auth/login.php', {
      method: 'POST',
      body: JSON.stringify({ email, password, is_admin_portal: true }),
    });
    if (res.success && res.data?.token) {
      localStorage.setItem('valerie_admin_token', res.data.token);
      localStorage.setItem('valerie_admin_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async logout() {
    try {
      await request('/auth/logout.php', { method: 'POST' });
    } catch (e) {
      // Proceed with client-side cleanup
    } finally {
      localStorage.removeItem('valerie_admin_token');
      localStorage.removeItem('valerie_admin_user');
    }
  },

  getCurrentUser() {
    try {
      const stored = localStorage.getItem('valerie_admin_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  // Dashboard
  async getDashboard() {
    const res = await request('/admin/dashboard.php');
    return res.data;
  },

  // Products
  async getProducts(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await request(`/admin/products.php${qs ? '?' + qs : ''}`);
    return res.data;
  },

  async getProduct(id) {
    const res = await request(`/admin/products.php?id=${id}`);
    return res.data;
  },

  async createProduct(productData) {
    const res = await request('/admin/products.php', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
    return res.data;
  },

  async updateProduct(productData) {
    const res = await request('/admin/products.php', {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
    return res.data;
  },

  async updateStock(productId, stockQuantity) {
    const res = await request('/admin/products.php?action=quick_stock', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, stock_quantity: stockQuantity }),
    });
    return res.data;
  },

  async duplicateProduct(productId) {
    const res = await request('/admin/products.php?action=duplicate', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId }),
    });
    return res.data;
  },

  async deleteProduct(productId) {
    const res = await request(`/admin/products.php?id=${productId}`, {
      method: 'DELETE',
    });
    return res.data;
  },

  // CSV Export — returns a download URL (direct GET, no JSON)
  exportProductsCsvUrl() {
    const token = getAdminToken();
    return `${API_BASE_URL}/admin/products.php?action=export_csv&token=${token}`;
  },

  async importProductsCsv(file) {
    const formData = new FormData();
    formData.append('csv_file', file);
    const res = await request('/admin/products.php?action=import_csv', {
      method: 'POST',
      body: formData,
    });
    return res.data;
  },

  // Categories
  async getCategories() {
    const res = await request('/admin/categories.php');
    return res.data;
  },

  async createCategory(categoryData) {
    const res = await request('/admin/categories.php', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
    return res.data;
  },

  async updateCategory(categoryData) {
    const res = await request('/admin/categories.php', {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
    return res.data;
  },

  async reorderCategories(orderArray) {
    const res = await request('/admin/categories.php?action=reorder', {
      method: 'POST',
      body: JSON.stringify({ order: orderArray }),
    });
    return res.data;
  },

  async deleteCategory(categoryId) {
    const res = await request(`/admin/categories.php?id=${categoryId}`, {
      method: 'DELETE',
    });
    return res.data;
  },

  // 2FA
  async requestAdminOtp(email, password) {
    const res = await request('/auth/admin_2fa.php?action=send_otp', {
      method: 'POST',
      body: JSON.stringify({ email, password, action: 'send_otp' }),
    });
    return res.data;
  },

  async verifyAdminOtp(pendingUserId, otp) {
    const res = await request('/auth/admin_2fa.php?action=verify_otp', {
      method: 'POST',
      body: JSON.stringify({ pending_user_id: pendingUserId, otp, action: 'verify_otp' }),
    });
    if (res.data?.token) {
      localStorage.setItem('valerie_admin_token', res.data.token);
      localStorage.setItem('valerie_admin_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  // Orders
  async getOrders(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await request(`/admin/orders.php${qs ? '?' + qs : ''}`);
    return res.data;
  },

  async getOrder(id) {
    const res = await request(`/admin/orders.php?id=${id}`);
    return res.data;
  },

  async updateOrderStatus(orderId, orderStatus, awbCode = '', courierPartner = '') {
    const res = await request('/admin/orders.php?action=update_status', {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        order_status: orderStatus,
        awb_code: awbCode,
        courier_partner: courierPartner,
      }),
    });
    return res.data;
  },

  async cancelRefundOrder(orderId, reason) {
    const res = await request('/admin/orders.php?action=cancel_refund', {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        cancellation_reason: reason,
      }),
    });
    return res.data;
  },

  // Customers & RTO
  async getCustomers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await request(`/admin/customers.php${qs ? '?' + qs : ''}`);
    return res.data;
  },

  async toggleRtoBlock(userId, isBlockedRto, reason = '') {
    const res = await request('/admin/customers.php?action=toggle_rto_block', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        is_blocked_rto: isBlockedRto ? 1 : 0,
        reason,
      }),
    });
    return res.data;
  },

  // Coupons
  async getCoupons() {
    const res = await request('/admin/coupons.php');
    return res.data;
  },

  async createCoupon(couponData) {
    const res = await request('/admin/coupons.php', {
      method: 'POST',
      body: JSON.stringify(couponData),
    });
    return res.data;
  },

  async updateCoupon(couponData) {
    const res = await request('/admin/coupons.php', {
      method: 'PUT',
      body: JSON.stringify(couponData),
    });
    return res.data;
  },

  async deleteCoupon(couponId) {
    const res = await request(`/admin/coupons.php?id=${couponId}`, {
      method: 'DELETE',
    });
    return res.data;
  },

  // Activity Log
  async getActivityLog(limit = 40) {
    const res = await request(`/admin/activity_log.php?limit=${limit}`);
    return res.data;
  },

  // Media Upload
  async uploadMedia(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await request('/admin/upload.php', {
      method: 'POST',
      body: formData,
    });
    return res.data;
  },
};
