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
  const rawUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
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
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    ...(options.headers || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Admin-Token'] = token;
  }

  // If body is not FormData, add Content-Type: application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${API_BASE_URL}${endpoint}${separator}_t=${Date.now()}`;
  try {
    const response = await fetch(url, { ...options, headers, cache: 'no-store' });
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
    const res = await request('/admin/products.php?action=update', {
      method: 'POST',
      body: JSON.stringify({ ...productData, action: 'update', _method: 'PUT' }),
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
    const res = await request(`/admin/products.php?action=delete&id=${productId}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', id: productId, _method: 'DELETE' }),
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
    const res = await request('/admin/categories.php?action=update', {
      method: 'POST',
      body: JSON.stringify({ ...categoryData, action: 'update', _method: 'PUT' }),
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
    const res = await request(`/admin/categories.php?action=delete&id=${categoryId}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', id: categoryId, _method: 'DELETE' }),
    });
    return res.data;
  },

  async toggleCategoryActive(categoryId, isActive) {
    const res = await request('/admin/categories.php?action=toggle_active', {
      method: 'POST',
      body: JSON.stringify({ id: categoryId, is_active: isActive !== undefined ? (isActive ? 1 : 0) : undefined }),
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

  async updateOrderStatus(orderId, orderStatus, awbCode = '', courierPartner = '', customMessage = '', notifyCustomer = true) {
    const res = await request('/admin/orders.php?action=update_status', {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        order_status: orderStatus,
        awb_code: awbCode,
        courier_partner: courierPartner,
        custom_message: customMessage,
        notify_customer: notifyCustomer,
      }),
    });
    return res.data;
  },

  async sendCustomerEmail(orderId, emailType, customMessage = '', reason = '', status = '') {
    const res = await request('/admin/orders.php?action=send_customer_email', {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        email_type: emailType,
        custom_message: customMessage,
        reason,
        status,
      }),
    });
    return res.data;
  },

  async previewEmailTemplate(type = 'order_confirmation', params = {}) {
    const qs = new URLSearchParams({ action: 'preview_email', type, ...params }).toString();
    const res = await request(`/admin/orders.php?${qs}`);
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

  // Homepage Banners & Content Control
  async getHomepageSettings() {
    const res = await request('/settings/get.php');
    return res.data;
  },

  async updateHomepageSettings(contentData) {
    const res = await request('/settings/update.php', {
      method: 'POST',
      body: JSON.stringify(contentData),
    });

    // Notify storefront instances locally and across browser tabs
    try {
      localStorage.setItem('valerie_settings_updated', Date.now().toString());
      localStorage.setItem('valerie_site_content_cache', JSON.stringify(res.data || contentData));
      window.dispatchEvent(new CustomEvent('valerie_settings_updated', { detail: res.data || contentData }));
    } catch (e) {
      console.warn('Sync broadcast warning:', e);
    }

    return res.data;
  },

  // Legal Policies Management
  async getPolicies() {
    const res = await request('/policies/get.php');
    return res.data;
  },

  async updatePolicies(policiesData) {
    const res = await request('/policies/update.php', {
      method: 'POST',
      body: JSON.stringify(policiesData),
    });

    try {
      localStorage.setItem('valerie_policies_updated', Date.now().toString());
      localStorage.setItem('valerie_policies_cache', JSON.stringify(res.data || policiesData));
      window.dispatchEvent(new CustomEvent('valerie_policies_updated', { detail: res.data || policiesData }));
    } catch (e) {
      console.warn('Sync broadcast warning for policies:', e);
    }

    return res.data;
  },

  // Frequently Asked Questions Management
  async getFaqs() {
    const res = await request('/faqs/get.php');
    return res.data;
  },

  async updateFaqs(faqsData) {
    const res = await request('/faqs/update.php', {
      method: 'POST',
      body: JSON.stringify(faqsData),
    });

    try {
      localStorage.setItem('valerie_faqs_updated', Date.now().toString());
      localStorage.setItem('valerie_faqs_cache', JSON.stringify(res.data || faqsData));
      window.dispatchEvent(new CustomEvent('valerie_faqs_updated', { detail: res.data || faqsData }));
    } catch (e) {
      console.warn('Sync broadcast warning for faqs:', e);
    }

    return res.data;
  },

  // Fastrr Checkout & Payment Settings Management
  async getPaymentSettings() {
    try {
      const res = await request('/settings/payments.php');
      if (res && res.data) {
        localStorage.setItem('valerie_payment_settings_cache', JSON.stringify(res.data));
        return res.data;
      }
    } catch (e) {
      console.warn('Failed to fetch remote payment settings, checking cache:', e);
    }
    const cached = localStorage.getItem('valerie_payment_settings_cache');
    if (cached) {
      try { return JSON.parse(cached); } catch (err) { }
    }
    return {
      gateway_mode: 'sandbox',
      fastrr_app_id: 'vj_fastrr_app_test',
      fastrr_secret_key: 'vj_fastrr_secret_test_2026',
      fastrr_webhook_secret: 'vj_fastrr_whsec_test',
      prepaid_discount: 50,
      prepaid_gift_title: 'Free Zircon Necklace',
      prepaid_gift_subtitle: 'Included complimentary with all prepaid orders',
      online_payment_enabled: true,
      partial_cod_enabled: true,
      partial_advance: 199,
      cod_fee: 0,
      cod_available: true,
      checkout_banner_text: '🎁 Prepaid Orders = ₹50 OFF + Free Luxury Gift + ⚡ Priority Shipping',
      exit_intent_enabled: true,
      exit_intent_title: 'Wait! Are you sure you want to exit?',
      exit_intent_message: 'High-demand handcrafted pieces in your bag might sell out before your next visit.',
      testimonial_quote: '“The Korean earrings collection with velvet box is breathtaking! Quality feels like real 18K gold. Absolutely loved the free zircon gift.”',
      testimonial_author: 'Ananya Sharma, Verified Buyer • New Delhi',
    };
  },

  async updatePaymentSettings(settings) {
    let resData = settings;
    try {
      const res = await request('/settings/payments.php', {
        method: 'POST',
        body: JSON.stringify(settings),
      });
      if (res && res.data) {
        resData = res.data;
      }
    } catch (e) {
      console.warn('Remote payment settings update failed, persisting locally:', e);
    }

    try {
      localStorage.setItem('valerie_payment_settings_updated', Date.now().toString());
      localStorage.setItem('valerie_payment_settings_cache', JSON.stringify(resData));
      window.dispatchEvent(new CustomEvent('valerie_payment_settings_updated', { detail: resData }));
    } catch (e) {
      console.warn('Sync broadcast warning for payment settings:', e);
    }

    return resData;
  },

  async sendTestSms(payload) {
    const res = await request('/auth/test_sms.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  },
};

