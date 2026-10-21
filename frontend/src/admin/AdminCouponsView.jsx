import React, { useState, useEffect, useMemo } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Percent,
  IndianRupee,
  Calculator,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Info
} from 'lucide-react';
import { adminApi } from './adminApi';

export default function AdminCouponsView({ currentUser }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formDiscountType, setFormDiscountType] = useState('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState('');
  const [formMinOrder, setFormMinOrder] = useState('0');
  const [formMaxDiscount, setFormMaxDiscount] = useState('');
  const [formUsageLimit, setFormUsageLimit] = useState('1000');
  const [formIsActive, setFormIsActive] = useState(true);

  // Deletion modal state
  const [deletingCoupon, setDeletingCoupon] = useState(null);

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

  const openCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setFormCode('');
    setFormDiscountType('percentage');
    setFormDiscountValue('');
    setFormMinOrder('0');
    setFormMaxDiscount('');
    setFormUsageLimit('1000');
    setFormIsActive(true);
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (coupon) => {
    setModalMode('edit');
    setEditingId(coupon.id);
    setFormCode(coupon.code);
    setFormDiscountType(coupon.discount_type || 'percentage');
    setFormDiscountValue(coupon.discount_value !== undefined && coupon.discount_value !== null ? String(Number(coupon.discount_value)) : '');
    setFormMinOrder(coupon.min_order_amount !== undefined && coupon.min_order_amount !== null ? String(Number(coupon.min_order_amount)) : '0');
    setFormMaxDiscount(coupon.max_discount_amount ? String(Number(coupon.max_discount_amount)) : '');
    setFormUsageLimit(coupon.usage_limit ? String(coupon.usage_limit) : '');
    setFormIsActive(coupon.is_active === 1 || coupon.is_active === true || coupon.is_active === '1');
    setError('');
    setModalOpen(true);
  };

  // Live calculation preview calculation for the modal
  const previewCalculation = useMemo(() => {
    const val = parseFloat(formDiscountValue);
    const minOrd = parseFloat(formMinOrder) || 0;
    const maxCap = formMaxDiscount && parseFloat(formMaxDiscount) > 0 ? parseFloat(formMaxDiscount) : null;

    if (isNaN(val) || val <= 0) {
      return null;
    }

    // Benchmark sample cart amounts
    const sampleCart = minOrd > 1000 ? minOrd + 200 : 1000;
    let sampleDiscount = 0;

    if (formDiscountType === 'percentage') {
      sampleDiscount = (sampleCart * val) / 100;
      if (maxCap !== null && maxCap > 0) {
        sampleDiscount = Math.min(sampleDiscount, maxCap);
      }
    } else {
      sampleDiscount = val;
      if (maxCap !== null && maxCap > 0) {
        sampleDiscount = Math.min(sampleDiscount, maxCap);
      }
    }

    sampleDiscount = Math.min(sampleDiscount, sampleCart);
    const netPayable = Math.max(0, sampleCart - sampleDiscount);

    return {
      sampleCart,
      sampleDiscount: Math.round(sampleDiscount * 100) / 100,
      netPayable: Math.round(netPayable * 100) / 100,
      minOrd,
      maxCap,
      capped: maxCap !== null && sampleDiscount >= maxCap,
    };
  }, [formDiscountType, formDiscountValue, formMinOrder, formMaxDiscount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const trimmedCode = formCode.trim().toUpperCase();
    if (!trimmedCode) {
      setError('Coupon code cannot be empty.');
      setSaving(false);
      return;
    }

    const val = parseFloat(formDiscountValue);
    if (isNaN(val) || val <= 0) {
      setError('Discount value must be a positive number greater than 0.');
      setSaving(false);
      return;
    }

    if (formDiscountType === 'percentage' && val > 100) {
      setError('Percentage discount cannot exceed 100%.');
      setSaving(false);
      return;
    }

    const minAmt = parseFloat(formMinOrder) || 0;
    if (minAmt < 0) {
      setError('Minimum order amount cannot be negative.');
      setSaving(false);
      return;
    }

    const maxAmt = formMaxDiscount && parseFloat(formMaxDiscount) > 0 ? parseFloat(formMaxDiscount) : null;
    const limit = formUsageLimit && parseInt(formUsageLimit, 10) > 0 ? parseInt(formUsageLimit, 10) : null;

    try {
      if (modalMode === 'edit') {
        await adminApi.updateCoupon({
          id: editingId,
          code: trimmedCode,
          discount_type: formDiscountType,
          discount_value: val,
          min_order_amount: minAmt,
          max_discount_amount: maxAmt,
          usage_limit: limit,
          is_active: formIsActive ? 1 : 0,
        });
        showToast(`Voucher ${trimmedCode} updated successfully. Storefront synced.`);
      } else {
        await adminApi.createCoupon({
          code: trimmedCode,
          discount_type: formDiscountType,
          discount_value: val,
          min_order_amount: minAmt,
          max_discount_amount: maxAmt,
          usage_limit: limit || 1000,
          is_active: formIsActive ? 1 : 0,
        });
        showToast(`Voucher ${trimmedCode} created successfully.`);
      }
      setModalOpen(false);
      loadCoupons();
    } catch (err) {
      setError(err.message || `Failed to ${modalMode} coupon`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (coupon) => {
    const newActive = coupon.is_active == 1 ? 0 : 1;
    try {
      await adminApi.updateCoupon({
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_order_amount: coupon.min_order_amount,
        max_discount_amount: coupon.max_discount_amount,
        usage_limit: coupon.usage_limit,
        is_active: newActive,
      });
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: newActive } : c))
      );
      showToast(`Voucher ${coupon.code} is now ${newActive ? 'Active' : 'Inactive'}`);
    } catch (err) {
      showToast(err.message || 'Failed to update status');
    }
  };

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
    <div className="p-6 sm:p-8 space-y-6 w-full">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-tertiary text-white px-4 py-2.5 rounded-xl shadow-luxury text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-caps tracking-widest uppercase text-brand-primary font-bold">
            Promotions & Growth
          </span>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-brand-tertiary mt-1">
            Discount Vouchers & Campaigns
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">
            Manage promotional coupon codes, discounts, minimum order thresholds, and usage caps.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-wider uppercase font-bold transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Voucher</span>
        </button>
      </div>

      {/* Vouchers Table */}
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
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-muted">
                    Loading vouchers...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-muted">
                    No active discount vouchers.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => {
                  const isActive = Number(c.is_active) === 1;
                  return (
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
                        {c.max_discount_amount ? `₹${Number(c.max_discount_amount).toLocaleString('en-IN')}` : 'No Limit'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-brand-tertiary">
                        {c.used_count || 0} / {c.usage_limit || '∞'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(c)}
                          title={`Click to ${isActive ? 'deactivate' : 'activate'} this voucher`}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                          <span>{isActive ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 text-brand-muted hover:text-brand-primary rounded-lg hover:bg-brand-primary/10 transition-colors cursor-pointer"
                            title="Edit Coupon"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!isStaff && (
                            <button
                              onClick={() => setDeletingCoupon({ id: c.id, code: c.code })}
                              className="p-1.5 text-brand-muted hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Coupon (Admin Only)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Coupon Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-brand-border shadow-luxury space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
              <div>
                <span className="text-[10px] font-caps tracking-widest uppercase text-brand-primary font-bold">
                  {modalMode === 'edit' ? 'Modify Existing Campaign' : 'New Promotional Campaign'}
                </span>
                <h3 className="text-lg font-editorial font-bold text-brand-tertiary">
                  {modalMode === 'edit' ? `Edit Voucher (${formCode})` : 'Create Promotional Voucher'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Coupon Code & Active Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-brand-tertiary block mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VALERIE10"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 font-mono font-bold text-brand-tertiary uppercase tracking-wider focus:outline-none focus:border-brand-primary"
                  />
                  <p className="text-[10px] text-brand-muted mt-1">
                    Customers enter this code at checkout to claim the discount.
                  </p>
                </div>
                <div>
                  <label className="font-semibold text-brand-tertiary block mb-1">
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormIsActive(!formIsActive)}
                    className={`w-full py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                      formIsActive
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-gray-100 border-gray-300 text-gray-500'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${formIsActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    <span>{formIsActive ? 'Active' : 'Disabled'}</span>
                  </button>
                  <p className="text-[10px] text-brand-muted mt-1 text-center">
                    Toggle voucher availability
                  </p>
                </div>
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-brand-tertiary block mb-1">
                    Discount Type
                  </label>
                  <select
                    value={formDiscountType}
                    onChange={(e) => setFormDiscountType(e.target.value)}
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 font-medium text-brand-tertiary focus:outline-none focus:border-brand-primary cursor-pointer"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-brand-tertiary block mb-1">
                    Discount Value * {formDiscountType === 'percentage' ? '(%)' : '(₹)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      max={formDiscountType === 'percentage' ? '100' : undefined}
                      required
                      placeholder={formDiscountType === 'percentage' ? '10' : '50'}
                      value={formDiscountValue}
                      onChange={(e) => setFormDiscountValue(e.target.value)}
                      className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 font-semibold text-brand-tertiary focus:outline-none focus:border-brand-primary"
                    />
                    <span className="absolute right-3 top-2 text-brand-muted text-[11px] font-bold">
                      {formDiscountType === 'percentage' ? '%' : '₹'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Min Order & Max Discount Cap */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-brand-tertiary block mb-1">
                    Min Order Threshold (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={formMinOrder}
                    onChange={(e) => setFormMinOrder(e.target.value)}
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 focus:outline-none focus:border-brand-primary"
                  />
                  <p className="text-[10px] text-brand-muted mt-0.5">
                    0 = applies to all orders
                  </p>
                </div>
                <div>
                  <label className="font-semibold text-brand-tertiary block mb-1">
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Optional (No limit)"
                    value={formMaxDiscount}
                    onChange={(e) => setFormMaxDiscount(e.target.value)}
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 focus:outline-none focus:border-brand-primary"
                  />
                  <p className="text-[10px] text-brand-muted mt-0.5">
                    Leave blank for unlimited
                  </p>
                </div>
              </div>

              {/* Usage Limit */}
              <div>
                <label className="font-semibold text-brand-tertiary block mb-1">
                  Overall Usage Limit
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1000"
                  value={formUsageLimit}
                  onChange={(e) => setFormUsageLimit(e.target.value)}
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 focus:outline-none focus:border-brand-primary"
                />
                <p className="text-[10px] text-brand-muted mt-0.5">
                  Maximum total redemptions permitted across all customer checkouts.
                </p>
              </div>

              {/* Live Calculation Preview Card */}
              {previewCalculation && (
                <div className="p-3.5 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 space-y-2">
                  <div className="flex items-center gap-1.5 text-brand-primary font-bold text-[11px]">
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Calculation Verification & Storefront Impact</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                    <div className="bg-white p-2 rounded-xl border border-brand-border/60">
                      <span className="text-gray-400 block text-[9px] uppercase font-bold">Sample Cart</span>
                      <span className="font-bold text-gray-800">₹{previewCalculation.sampleCart}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-brand-border/60">
                      <span className="text-gray-400 block text-[9px] uppercase font-bold">Discount Given</span>
                      <span className="font-bold text-emerald-600">-₹{previewCalculation.sampleDiscount}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-brand-border/60">
                      <span className="text-gray-400 block text-[9px] uppercase font-bold">Net Total</span>
                      <span className="font-bold text-brand-tertiary">₹{previewCalculation.netPayable}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-brand-muted leading-tight">
                    • Minimum cart required: <span className="font-bold text-brand-tertiary">₹{previewCalculation.minOrd}</span>
                    {previewCalculation.maxCap && (
                      <span> • Max discount cap: <span className="font-bold text-brand-tertiary">₹{previewCalculation.maxCap}</span></span>
                    )}
                    {previewCalculation.capped && (
                      <span className="text-amber-600 font-semibold block mt-0.5">
                        ⚠️ Note: Discount capped at ₹{previewCalculation.maxCap} for this sample order.
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-brand-border/60">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-brand-tertiary font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold shadow-md disabled:opacity-50 cursor-pointer transition-all"
                >
                  {saving
                    ? modalMode === 'edit'
                      ? 'Saving Changes...'
                      : 'Creating...'
                    : modalMode === 'edit'
                    ? 'Save Voucher Changes'
                    : 'Create Voucher'}
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
                className="flex-1 px-4 py-2.5 rounded-xl border border-brand-border text-xs font-semibold text-brand-tertiary hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCoupon}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
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
