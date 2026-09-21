import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  CheckCircle,
  Truck,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Eye,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Flame,
  X,
  Send,
  Clock,
  Sparkles,
  SendHorizontal
} from 'lucide-react';
import { adminApi } from './adminApi';

export default function AdminOrdersView({ currentUser, initialSelectedOrderId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [jhumkaOnly, setJhumkaOnly] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Status transition state
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [shipAwb, setShipAwb] = useState('');
  const [shipCourier, setShipCourier] = useState('Bluedart Express Air');

  // Email Dispatch Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [targetEmailOrder, setTargetEmailOrder] = useState(null);
  const [selectedEmailType, setSelectedEmailType] = useState('order_status_update');
  const [emailCustomMessage, setEmailCustomMessage] = useState('');
  const [emailReason, setEmailReason] = useState('');
  const [emailTargetStatus, setEmailTargetStatus] = useState('shipped');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Cancel & Refund Dialog
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const isStaff = currentUser?.role === 'staff';

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getOrders({
        search,
        status: statusFilter,
        payment_method: paymentFilter,
        risk_tier: riskFilter,
        jhumka_only: jhumkaOnly ? 1 : 0,
      });
      setOrders(res || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, paymentFilter, riskFilter, jhumkaOnly]);

  useEffect(() => {
    if (initialSelectedOrderId) {
      inspectOrder(initialSelectedOrderId);
    }
  }, [initialSelectedOrderId]);

  const inspectOrder = async (orderId) => {
    try {
      setDrawerLoading(true);
      const fullOrder = await adminApi.getOrder(orderId);
      setSelectedOrder(fullOrder);
      setShipAwb(fullOrder.shiprocket_awb || '');
      setShipCourier(fullOrder.courier_name || 'Bluedart Express Air');
    } catch (err) {
      showToast(err.message || 'Failed to fetch order details');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleStatusChange = async (newStatus, customMsg = '') => {
    if (!selectedOrder) return;
    setUpdatingStatus(true);
    try {
      await adminApi.updateOrderStatus(selectedOrder.id, newStatus, shipAwb, shipCourier, customMsg, true);
      showToast(`Order #${selectedOrder.order_number} marked ${newStatus} & email sent`);
      await inspectOrder(selectedOrder.id);
      loadOrders();
    } catch (err) {
      showToast(err.message || 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openEmailModal = (order) => {
    setTargetEmailOrder(order);
    setSelectedEmailType('order_status_update');
    setEmailTargetStatus(order.order_status || 'confirmed');
    setEmailCustomMessage('');
    setEmailReason('');
    setEmailModalOpen(true);
  };

  const handleSendCustomEmail = async (e) => {
    e.preventDefault();
    if (!targetEmailOrder) return;
    setSendingEmail(true);
    try {
      await adminApi.sendCustomerEmail(
        targetEmailOrder.id,
        selectedEmailType,
        emailCustomMessage,
        emailReason,
        emailTargetStatus
      );
      showToast(`Email dispatched to ${targetEmailOrder.customer_email}`);
      setEmailModalOpen(false);
      setEmailCustomMessage('');
      setEmailReason('');
      if (selectedOrder && selectedOrder.id === targetEmailOrder.id) {
        await inspectOrder(selectedOrder.id);
      }
    } catch (err) {
      showToast(err.message || 'Failed to dispatch email');
    } finally {
      setSendingEmail(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span>✓</span>
            <span className="capitalize">Delivered</span>
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <span>✈</span>
            <span className="capitalize">Shipped</span>
          </span>
        );
      case 'on_hold':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <span>⏱</span>
            <span>On Hold</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <span>✕</span>
            <span>Failed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
            <span>—</span>
            <span className="capitalize">Cancelled</span>
          </span>
        );
      case 'confirmed':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <span>✦</span>
            <span className="capitalize">{status || 'Confirmed'}</span>
          </span>
        );
    }
  };

  const handleCancelAndRefund = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !cancelReason) return;

    setCancelling(true);
    try {
      const res = await adminApi.cancelRefundOrder(selectedOrder.id, cancelReason);
      showToast(res.message || 'Order cancelled & refund processed');
      setCancelModalOpen(false);
      setCancelReason('');
      await inspectOrder(selectedOrder.id);
      loadOrders();
    } catch (err) {
      showToast(err.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-tertiary text-white px-4 py-2.5 rounded-xl shadow-luxury text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div>
        <span className="text-[11px] font-caps tracking-widest uppercase text-brand-primary font-bold">
          Fulfillment & Logistics
        </span>
        <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-brand-tertiary mt-1">
          Orders Management & Shipments
        </h1>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-brand-border space-y-4 shadow-2xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadOrders()}
              placeholder="Search order #, customer, phone, AWB..."
              className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2 pl-9 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
            />
            <Search className="w-3.5 h-3.5 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-tertiary"
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="on_hold">On Hold</option>
              <option value="failed">Payment Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-tertiary"
            >
              <option value="">All Payment Types</option>
              <option value="full_prepaid">Full Prepaid</option>
              <option value="partial">Partial COD</option>
              <option value="cod">Cash On Delivery</option>
            </select>

            {/* Risk Tier Filter */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-tertiary"
            >
              <option value="">All Risk Tiers</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>

            {/* Jhumka Ad Hero Toggle */}
            <button
              onClick={() => setJhumkaOnly(!jhumkaOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                jhumkaOnly
                  ? 'bg-amber-500 text-white font-semibold shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Jhumka Boxes Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-brand-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8FC] border-b border-brand-border text-brand-muted font-caps tracking-wider text-[10px] uppercase">
              <tr>
                <th className="py-3.5 px-4">Order # & Tags</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Payment Breakdown</th>
                <th className="py-3.5 px-4">Fulfillment Status</th>
                <th className="py-3.5 px-4">AWB Tracking</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-brand-muted">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-brand-muted">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#FAF8FC] transition-colors">
                    {/* Order Number & Tags */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-brand-tertiary">
                        #{ord.order_number}
                      </div>
                      <div className="text-[10px] text-brand-muted">
                        {new Date(ord.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      {Number(ord.has_jhumka_box) > 0 && (
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 mt-1">
                          <Flame className="w-2.5 h-2.5 text-amber-600" />
                          <span>📦 Jhumka Ad Order</span>
                        </span>
                      )}
                    </td>

                    {/* Customer Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-brand-tertiary">{ord.customer_name}</div>
                      <div className="text-[10px] text-brand-muted">{ord.customer_phone}</div>
                      <div className="text-[10px] text-brand-muted">{ord.city}, {ord.pincode}</div>
                    </td>

                    {/* Payment Breakdown */}
                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="font-semibold text-brand-tertiary">
                        ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] capitalize text-brand-muted">
                        {ord.payment_type?.replace('_', ' ')}
                      </div>
                      {ord.payment_type === 'partial' && (
                        <div className="text-[10px] text-emerald-700 font-medium">
                          Paid: ₹{Number(ord.amount_paid_upfront)} • Due: ₹{Number(ord.amount_due_on_delivery)}
                        </div>
                      )}
                    </td>

                    {/* Fulfillment Status */}
                    <td className="py-3.5 px-4">
                      {renderStatusBadge(ord.order_status)}
                    </td>

                    {/* AWB Code */}
                    <td className="py-3.5 px-4">
                      {ord.shiprocket_awb ? (
                        <div className="space-y-0.5">
                          <span className="font-mono text-brand-primary font-semibold">
                            {ord.shiprocket_awb}
                          </span>
                          <div className="text-[10px] text-brand-muted">{ord.courier_name}</div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-brand-muted italic">Not dispatched</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => openEmailModal(ord)}
                          title="Send Branded Customer Email"
                          className="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-brand-primary hover:text-white border border-purple-200 text-brand-primary text-xs font-semibold transition-all flex items-center space-x-1 shadow-2xs"
                        >
                          <SendHorizontal className="w-3 h-3" />
                          <span className="hidden sm:inline">Email</span>
                        </button>
                        <button
                          onClick={() => inspectOrder(ord.id)}
                          className="px-3 py-1 rounded-xl bg-[#FAF8FC] hover:bg-brand-primary hover:text-white border border-brand-border text-brand-tertiary text-xs font-semibold transition-all shadow-2xs"
                        >
                          Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ORDER DETAIL INSPECTION DRAWER */}
      {/* ========================================================================= */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl border-l border-brand-border animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-brand-border">
              <div>
                <span className="text-[10px] font-caps tracking-widest uppercase text-brand-primary font-bold">
                  Order Inspection
                </span>
                <h3 className="text-xl font-editorial font-bold text-brand-tertiary">
                  #{selectedOrder.order_number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-brand-muted hover:text-brand-tertiary rounded-xl hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Address Details */}
            <div className="bg-[#FAF8FC] rounded-2xl p-4 border border-brand-border space-y-3 text-xs">
              <div className="font-caps tracking-wider uppercase text-[10px] text-brand-muted font-bold">
                Customer & Delivery Address
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="font-semibold text-brand-tertiary">{selectedOrder.customer_name}</div>
                  <div className="text-brand-muted flex items-center space-x-1 mt-0.5">
                    <Phone className="w-3 h-3" />
                    <span>{selectedOrder.customer_phone}</span>
                  </div>
                  <div className="text-brand-muted flex items-center space-x-1 mt-0.5">
                    <Mail className="w-3 h-3" />
                    <span>{selectedOrder.customer_email}</span>
                  </div>
                </div>

                <div>
                  <div className="text-brand-tertiary font-medium">
                    {selectedOrder.shipping_address_line1}
                    {selectedOrder.shipping_address_line2 ? `, ${selectedOrder.shipping_address_line2}` : ''}
                  </div>
                  <div className="text-brand-muted">
                    {selectedOrder.city}, {selectedOrder.state} - {selectedOrder.pincode}
                  </div>
                </div>
              </div>
            </div>

            {/* Itemized Order List */}
            <div className="space-y-3">
              <div className="font-caps tracking-wider uppercase text-[10px] text-brand-muted font-bold">
                Items Ordered ({selectedOrder.items?.length || 0})
              </div>
              <div className="divide-y divide-brand-border/60 border border-brand-border rounded-2xl p-2 bg-white">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <img
                        src={
                          item.primary_image ||
                          'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=150&q=80'
                        }
                        alt={item.product_name}
                        className="w-12 h-12 rounded-xl object-cover border border-brand-border shrink-0"
                      />
                      <div>
                        <div className="font-semibold text-brand-tertiary">{item.product_name}</div>
                        <div className="text-[10px] text-brand-muted">
                          Qty: {item.quantity} × ₹{Number(item.unit_price).toLocaleString('en-IN')}
                        </div>
                        {Number(item.is_jhumka_box) > 0 && (
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                            🔥 Signature Jhumka Box
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="font-bold text-brand-tertiary font-mono">
                      ₹{Number(item.total_price).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-[#FAF8FC] rounded-2xl p-4 border border-brand-border space-y-2 text-xs">
              <div className="flex justify-between text-brand-muted">
                <span>Subtotal:</span>
                <span>₹{Number(selectedOrder.subtotal).toLocaleString('en-IN')}</span>
              </div>
              {Number(selectedOrder.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Voucher Savings:</span>
                  <span>-₹{Number(selectedOrder.discount_amount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-brand-muted">
                <span>Express Delivery:</span>
                <span>{Number(selectedOrder.shipping_fee) === 0 ? 'FREE' : `₹${selectedOrder.shipping_fee}`}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-brand-tertiary pt-2 border-t border-brand-border/60">
                <span>Total Amount:</span>
                <span>₹{Number(selectedOrder.total_amount).toLocaleString('en-IN')}</span>
              </div>

              {selectedOrder.payment_type === 'partial' && (
                <div className="pt-2 border-t border-brand-border/60 text-[11px] text-emerald-800">
                  <span>Upfront Deposit Paid: </span>
                  <span className="font-bold">₹{Number(selectedOrder.amount_paid_upfront)}</span>
                  <span className="text-brand-muted"> (Balance ₹{Number(selectedOrder.amount_due_on_delivery)} due on delivery)</span>
                </div>
              )}
            </div>

            {/* Manual Status Override & Shiprocket Dispatch */}
            {selectedOrder.order_status !== 'cancelled' && (
              <div className="bg-white rounded-2xl p-4 border border-brand-border space-y-4">
                <div className="font-caps tracking-wider uppercase text-[10px] text-brand-muted font-bold">
                  Manual Status & Shipment Action
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-brand-muted">Shiprocket / Bluedart AWB</label>
                    <input
                      type="text"
                      value={shipAwb}
                      onChange={(e) => setShipAwb(e.target.value)}
                      placeholder="e.g. BLUEDART-987654"
                      className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-brand-muted">Courier Partner</label>
                    <input
                      type="text"
                      value={shipCourier}
                      onChange={(e) => setShipCourier(e.target.value)}
                      placeholder="Bluedart Express Air"
                      className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    onClick={() => handleStatusChange('shipped')}
                    disabled={updatingStatus}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Mark Shipped & Send Tracking Email</span>
                  </button>

                  <button
                    onClick={() => handleStatusChange('delivered')}
                    disabled={updatingStatus}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Mark Delivered</span>
                  </button>

                  <button
                    onClick={() => handleStatusChange('on_hold')}
                    disabled={updatingStatus}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Mark On Hold</span>
                  </button>

                  <button
                    onClick={() => openEmailModal(selectedOrder)}
                    className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Custom Email to Customer</span>
                  </button>
                </div>
              </div>
            )}

            {/* Cancel & Refund Action (Admin Only) */}
            {selectedOrder.order_status !== 'cancelled' && (
              <div className="pt-4 border-t border-brand-border flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-rose-700">Cancel Order & Issue Refund</div>
                  <div className="text-[10px] text-brand-muted">Restocks inventory & triggers refund email</div>
                </div>

                {isStaff ? (
                  <span className="text-[10px] text-brand-muted bg-gray-100 px-2 py-1 rounded">
                    Admin Privilege Required
                  </span>
                ) : (
                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors flex items-center space-x-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel & Refund</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEND CUSTOM LUXURY EMAIL MODAL */}
      {/* ========================================================================= */}
      {emailModalOpen && targetEmailOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-brand-border shadow-luxury space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Header with Branding */}
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 text-brand-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-caps tracking-widest uppercase text-brand-primary font-bold">
                    Email Notification Dispatcher
                  </span>
                  <h3 className="text-base font-editorial font-bold text-brand-tertiary">
                    Send Customer Email • #{targetEmailOrder.order_number}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="p-1.5 text-brand-muted hover:text-brand-tertiary rounded-xl hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recipient Snapshot */}
            <div className="bg-[#FAF8FC] rounded-2xl p-3.5 border border-brand-border/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">Recipient:</span>
                <div className="font-semibold text-brand-tertiary">{targetEmailOrder.customer_name}</div>
                <div className="text-brand-primary font-mono text-[11px]">{targetEmailOrder.customer_email}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">Order Value:</span>
                <div className="font-bold text-brand-tertiary font-mono">₹{Number(targetEmailOrder.total_amount).toLocaleString('en-IN')}</div>
                <div className="text-[10px] text-brand-muted capitalize">{targetEmailOrder.payment_type?.replace('_', ' ')}</div>
              </div>
            </div>

            <form onSubmit={handleSendCustomEmail} className="space-y-4 text-xs">
              {/* Template Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-caps tracking-wider uppercase text-brand-tertiary font-bold">
                  Select Email Template *
                </label>
                <select
                  value={selectedEmailType}
                  onChange={(e) => setSelectedEmailType(e.target.value)}
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary font-medium"
                >
                  <option value="order_confirmation">✦ Order Confirmation / Successful (Full Recap + Gift Callout)</option>
                  <option value="order_status_update">🚚 Status Update & Milestone (Live Badge + Live Tracking)</option>
                  <option value="order_on_hold">⏱ Order Temporarily On Hold (Concierge Notice & WhatsApp)</option>
                  <option value="order_failed">✕ Payment Incomplete / Failed (Reassurance & Retry Link)</option>
                  <option value="order_shipped">✈️ Order Shipped (Air Express & AWB Tracking)</option>
                  <option value="order_cancelled">🛑 Order Cancelled & Refund Notice</option>
                </select>
              </div>

              {/* Status Milestone picker (if status update chosen) */}
              {selectedEmailType === 'order_status_update' && (
                <div className="space-y-1.5 bg-purple-50/50 p-3 rounded-2xl border border-purple-100">
                  <label className="text-[10px] font-caps tracking-wider uppercase text-brand-primary font-bold">
                    Target Milestone Milestone Badge
                  </label>
                  <select
                    value={emailTargetStatus}
                    onChange={(e) => setEmailTargetStatus(e.target.value)}
                    className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
                  >
                    <option value="confirmed">Order Confirmed & Allocated</option>
                    <option value="processing">In Handcrafting & Anti-Tarnish Prep</option>
                    <option value="shipped">Dispatched & On The Way</option>
                    <option value="out_for_delivery">Out for Delivery Today</option>
                    <option value="delivered">Delivered with Care</option>
                    <option value="on_hold">Temporarily On Hold</option>
                  </select>
                </div>
              )}

              {/* Specific Reason (for On Hold or Failed) */}
              {(selectedEmailType === 'order_on_hold' || selectedEmailType === 'order_failed') && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-caps tracking-wider uppercase text-brand-tertiary font-bold">
                    Reason / Context
                  </label>
                  <input
                    type="text"
                    value={emailReason}
                    onChange={(e) => setEmailReason(e.target.value)}
                    placeholder={
                      selectedEmailType === 'order_on_hold'
                        ? 'e.g. Pin code address confirmation required prior to dispatch'
                        : 'e.g. Bank gateway connection interrupted during UPI authorization'
                    }
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
                  />
                </div>
              )}

              {/* Personal Concierge Note (Optional for any email) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-caps tracking-wider uppercase text-brand-tertiary font-bold">
                    Personalized Concierge Note (Optional)
                  </label>
                  <span className="text-[10px] text-brand-muted">Renders prominently in email</span>
                </div>
                <textarea
                  rows={2}
                  value={emailCustomMessage}
                  onChange={(e) => setEmailCustomMessage(e.target.value)}
                  placeholder="e.g. We have included an extra velvet pouch for your order as our special gift. Enjoy your jewelry!"
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl p-3 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
                ></textarea>
              </div>

              {/* Luxury Guarantee Checklist */}
              <div className="p-3 bg-[#FAF8FC] rounded-2xl border border-brand-border/60 text-[11px] text-brand-muted space-y-1">
                <div className="flex items-center space-x-1.5 text-brand-tertiary font-medium">
                  <span>✨</span>
                  <span><strong>Luxury Theme Assured:</strong> Includes Valerie Jewels top logo, brand colors, itemized items table, and delivery notes.</span>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-brand-border/60">
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-brand-tertiary text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-secondary text-white text-xs font-semibold flex items-center space-x-1.5 shadow-luxury transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingEmail ? 'Dispatching...' : 'Send Luxury Email Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CANCEL & REFUND CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {cancelModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-brand-border shadow-luxury space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-editorial font-bold text-brand-tertiary">
                Confirm Cancellation & Refund
              </h3>
            </div>

            <p className="text-xs text-brand-muted leading-relaxed">
              Order #{selectedOrder.order_number} will be cancelled.
              {selectedOrder.payment_type === 'full_prepaid' && (
                <span className="font-semibold text-brand-tertiary block mt-1">
                  Refund Amount: ₹{Number(selectedOrder.total_amount).toLocaleString('en-IN')} (Full Prepaid)
                </span>
              )}
              {selectedOrder.payment_type === 'partial' && (
                <span className="font-semibold text-brand-tertiary block mt-1">
                  Refund Amount: ₹{Number(selectedOrder.amount_paid_upfront).toLocaleString('en-IN')} (₹{Number(selectedOrder.amount_paid_upfront).toLocaleString('en-IN')} Upfront Token)
                </span>
              )}
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-caps tracking-wider uppercase text-brand-tertiary font-bold">
                Mandatory Reason for Activity Log *
              </label>
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer requested cancellation before dispatch; address unserviceable..."
                className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl p-3 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
              ></textarea>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-brand-tertiary text-xs font-semibold"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleCancelAndRefund}
                disabled={cancelling || !cancelReason}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                {cancelling ? 'Processing Refund...' : 'Execute Refund & Restock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
