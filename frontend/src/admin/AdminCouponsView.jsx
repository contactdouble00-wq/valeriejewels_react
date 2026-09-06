import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { adminApi } from './adminApi';

export default function AdminCouponsView({ currentUser }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const [newCode, setNewCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrder, setMinOrder] = useState('499');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState('1000');

  const isStaff = currentUser?.role === 'staff';

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getCoupons();
      setCoupons(res || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await adminApi.createCoupon({
        code: newCode,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        min_order_amount: parseFloat(minOrder) || 0,
        max_discount_amount: maxDiscount ? parseFloat(maxDiscount) : null,
        usage_limit: parseInt(usageLimit, 10) || 1000,
      });
      showToast(`Voucher ${newCode} created successfully`);
      setModalOpen(false);
      setNewCode('');
      setDiscountValue('');
      loadCoupons();
    } catch (err) {
      setError(err.message || 'Failed to create coupon');
    } finally {
      setSaving(false);
    }
  };

  const [deletingCoupon, setDeletingCoupon] = useState(null);

  const confirmDeleteCoupon = async () => {
    if (!deletingCoupon) return;
    const { id, code } = deletingCoupon;
    setDeletingCoupon(null);
    try {
      await adminApi.deleteCoupon(id);
      showToast(`Coupon ${code} deleted successfully`);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      showToast(err.message || 'Failed to delete coupon');
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-tertiary text-white px-4 py-2.5 rounded-xl shadow-luxury text-xs font-semibold">
          {toastMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-caps tracking-widest uppercase text-brand-primary font-bold">
            Promotions & Growth
          </span>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-brand-tertiary mt-1">
            Discount Vouchers & Campaigns
          </h1>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-wider uppercase font-bold transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Create Voucher</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-brand-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8FC] border-b border-brand-border text-brand-muted font-caps tracking-wider text-[10px] uppercase">
              <tr>
                <th className="py-3.5 px-4">Coupon Code</th>
                <th className="py-3.5 px-4">Discount</th>
                <th className="py-3.5 px-4">Min Order</th>
                <th className="py-3.5 px-4">Max Cap</th>
                <th className="py-3.5 px-4">Usage Count</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-brand-muted">
                    Loading vouchers...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-brand-muted">
                    No active discount vouchers.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAF8FC] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-tertiary">
                      <span className="bg-[#FAF8FC] border border-brand-border px-2.5 py-1 rounded-lg">
                        {c.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-brand-primary">
                      {c.discount_type === 'percentage'
                        ? `${Number(c.discount_value)}% OFF`
                        : `₹${Number(c.discount_value)} FLAT OFF`}
                    </td>
                    <td className="py-3.5 px-4 text-brand-muted">
                      ₹{Number(c.min_order_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-brand-muted">
                      {c.max_discount_amount ? `₹${c.max_discount_amount}` : 'No Limit'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-brand-tertiary">
                      {c.used_count || 0} / {c.usage_limit || '∞'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!isStaff && (
                        <button
                          onClick={() => setDeletingCoupon({ id: c.id, code: c.code })}
                          className="p-1.5 text-brand-muted hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete Coupon (Admin Only)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-brand-border shadow-luxury space-y-5 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-editorial font-bold text-brand-tertiary">
              Create Promotional Voucher
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-brand-tertiary block mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="VALERIE10"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-brand-tertiary block mb-1">Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-brand-tertiary block mb-1">Value *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="10"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-brand-tertiary block mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    placeholder="499"
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-brand-tertiary block mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    placeholder="250"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-brand-tertiary font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-brand-primary text-white font-semibold shadow-md disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Coupon Confirmation Modal */}
      {deletingCoupon && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-brand-border shadow-luxury space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-editorial font-bold text-brand-tertiary">Delete Coupon Voucher</h3>
              <p className="text-xs text-brand-muted">
                Are you sure you want to delete coupon <span className="font-mono font-bold text-brand-tertiary">"{deletingCoupon.code}"</span>?
              </p>
              <p className="text-[11px] text-brand-muted/80">
                Customers will no longer be able to apply this discount code during checkout.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCoupon(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-brand-border text-xs font-semibold text-brand-tertiary hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCoupon}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
