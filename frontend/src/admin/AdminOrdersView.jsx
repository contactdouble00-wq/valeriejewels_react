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
  SendHorizontal,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { adminApi } from './adminApi';
import ProductAssuranceModal from './ProductAssuranceModal';
import { normalizeMediaUrl } from '../utils/mediaUtils';

export default function AdminOrdersView({ currentUser, initialSelectedOrderId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [jhumkaOnly, setJhumkaOnly] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [assuranceItem, setAssuranceItem] = useState(null);

  // Shiprocket sync state
  const [syncingSrId, setSyncingSrId] = useState(null);

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

  // Delete Order Dialog
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk Order Selection & Deletion Dialog
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Bulk Email Pending Payment / Payment Incomplete Modal
  const [bulkEmailModalOpen, setBulkEmailModalOpen] = useState(false);
  const [bulkEmailReason, setBulkEmailReason] = useState('Bank gateway connection interrupted during UPI authorization / Checkout incomplete');
  const [bulkEmailCustomMessage, setBulkEmailCustomMessage] = useState('');
  const [bulkEmailIncludeRetryLink, setBulkEmailIncludeRetryLink] = useState(true);
  const [bulkEmailSending, setBulkEmailSending] = useState(false);

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
        payment_status: paymentStatusFilter,
        risk_tier: riskFilter,
        jhumka_only: jhumkaOnly ? 1 : 0,
      });
      setOrders(res || []);
      if (res && Array.isArray(res)) {
        const validIds = new Set(res.map((o) => o.id));
        setSelectedOrderIds((prev) => prev.filter((id) => validIds.has(id)));
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  // Bulk Selection Helpers
  const isAllSelected = orders.length > 0 && orders.every((o) => selectedOrderIds.includes(o.id));
  const isSomeSelected = selectedOrderIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map((o) => o.id));
    }
  };

  const handleToggleSelectOrder = (orderId) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleClearSelection = () => {
    setSelectedOrderIds([]);
  };

  const confirmBulkDeleteOrders = async () => {
    if (selectedOrderIds.length === 0) return;
    try {
      setBulkDeleting(true);
      const res = await adminApi.bulkDeleteOrders(selectedOrderIds);
      const count = res?.deleted_count || selectedOrderIds.length;
      showToast(`${count} ${count === 1 ? 'order' : 'orders'} deleted permanently`);
      setOrders((prev) => prev.filter((o) => !selectedOrderIds.includes(o.id)));
      if (selectedOrder && selectedOrderIds.includes(selectedOrder.id)) {
        setSelectedOrder(null);
      }
      setSelectedOrderIds([]);
      setBulkDeleteModalOpen(false);
      loadOrders();
    } catch (err) {
      showToast(err.message || 'Failed to delete selected orders');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Pending payment orders in currently loaded list
  const pendingPaymentOrders = orders.filter(
    (o) =>
      (o.payment_status === 'pending' || o.payment_status === 'failed' || o.order_status === 'pending') &&
      o.payment_type !== 'cod'
  );

  // Selected orders that have pending payment
  const selectedPendingOrders = orders.filter(
    (o) =>
      selectedOrderIds.includes(o.id) &&
      (o.payment_status === 'pending' || o.payment_status === 'failed' || o.order_status === 'pending') &&
      o.payment_type !== 'cod'
  );

  // Target orders for the bulk email dispatch modal
  const targetBulkEmailOrders = selectedPendingOrders.length > 0
    ? selectedPendingOrders
    : orders.filter((o) => selectedOrderIds.includes(o.id));

  const handleSelectAllPendingOrders = () => {
    const pending = orders.filter(
      (o) =>
        (o.payment_status === 'pending' || o.payment_status === 'failed' || o.order_status === 'pending') &&
        o.payment_type !== 'cod'
    );

    if (pending.length > 0) {
      const pendingIds = pending.map((o) => o.id);
      setSelectedOrderIds(pendingIds);
      showToast(`Selected all ${pendingIds.length} orders with pending payment`);
    } else {
      setPaymentStatusFilter('unpaid_pending');
      showToast('Filtered view to Unpaid / Pending Checkouts. Please select when loaded.');
    }
  };

  const handleConfirmBulkEmail = async () => {
    if (targetBulkEmailOrders.length === 0) return;
    setBulkEmailSending(true);
    try {
      const orderIds = targetBulkEmailOrders.map((o) => o.id);
      const res = await adminApi.bulkSendPaymentReminders(
        orderIds,
        bulkEmailCustomMessage,
        bulkEmailReason,
        'order_failed'
      );
      showToast(res?.message || `Payment incomplete recovery emails dispatched to ${orderIds.length} customers!`);
      setBulkEmailModalOpen(false);
      setBulkEmailCustomMessage('');
      setSelectedOrderIds([]);
      loadOrders();
    } catch (err) {
      showToast(err.message || 'Failed to dispatch payment incomplete emails');
    } finally {
      setBulkEmailSending(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, paymentFilter, paymentStatusFilter, riskFilter, jhumkaOnly]);

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

  const handleSyncShiprocket = async (orderId) => {
    try {
      setSyncingSrId(orderId);
      const res = await adminApi.syncShiprocket(orderId);
      showToast(res?.message || 'Order pushed to Shiprocket panel successfully!');
      await loadOrders();
      if (selectedOrder && (selectedOrder.id === orderId || String(selectedOrder.id) === String(orderId))) {
        await inspectOrder(orderId);
      }
    } catch (err) {
      showToast(err.message || 'Failed to sync with Shiprocket');
    } finally {
      setSyncingSrId(null);
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

  const openDeleteModal = (order) => {
    setOrderToDelete(order);
    setDeleteModalOpen(true);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      setDeleting(true);
      await adminApi.deleteOrder(orderToDelete.id);
      showToast(`Order #${orderToDelete.order_number} deleted successfully`);
      setOrders((prev) => prev.filter((o) => o.id !== orderToDelete.id && String(o.id) !== String(orderToDelete.id)));
      if (selectedOrder && (selectedOrder.id === orderToDelete.id || String(selectedOrder.id) === String(orderToDelete.id))) {
        setSelectedOrder(null);
      }
      setDeleteModalOpen(false);
      setOrderToDelete(null);
      loadOrders();
    } catch (err) {
      showToast(err.message || 'Failed to delete order');
    } finally {
      setDeleting(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Delivered</span>
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            <span>Shipped</span>
          </span>
        );
      case 'on_hold':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>On Hold</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span>Failed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-50 text-gray-600 border border-gray-200/80 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            <span>Cancelled</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50/80 text-amber-700 border border-amber-200/70 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>Pending</span>
          </span>
        );
      case 'confirmed':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200/80 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            <span className="capitalize">{status || 'Confirmed'}</span>
          </span>
        );
    }
  };

  const renderPaymentStatusBadge = (ord) => {
    const pStatus = ord.payment_status || 'pending';
    const pType = ord.payment_type || 'full_prepaid';

    if (pStatus === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Paid</span>
        </span>
      );
    }

    if (pStatus === 'partial_paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Advance Paid</span>
        </span>
      );
    }

    if (pType === 'cod') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
          <span>COD</span>
        </span>
      );
    }

    if (pStatus === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          <span>Failed</span>
        </span>
      );
    }

    // Default: unpaid / pending checkout
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap" title="Customer opened checkout but did not complete payment on gateway">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        <span>Unpaid</span>
      </span>
    );
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
            {/* Payment Status Filter (Paid vs Unpaid / Abandoned) */}
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-tertiary font-semibold"
            >
              <option value="">All Orders (Paid & Unpaid)</option>
              <option value="paid_confirmed">✓ Paid / Confirmed Orders Only</option>
              <option value="unpaid_pending">⚠️ Unpaid / Abandoned Checkouts</option>
              <option value="paid">100% Prepaid Paid</option>
              <option value="partial_paid">Partial COD (Advance Paid)</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-tertiary"
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Incomplete / Pending</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="on_hold">On Hold</option>
              <option value="failed">Payment Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Payment Type Filter */}
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

            {/* Quick Select All Pending Payment Orders Button */}
            <button
              type="button"
              onClick={handleSelectAllPendingOrders}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-2xs border cursor-pointer ${
                pendingPaymentOrders.length > 0
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-[#FAF8FC] hover:bg-gray-100 text-brand-muted border-brand-border'
              }`}
              title="Select all orders where customer payment is pending to email them"
            >
              <Mail className="w-3.5 h-3.5 text-amber-600" />
              <span>Select All Pending ({pendingPaymentOrders.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Select Batch Action Banner */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-[#26153D] text-white rounded-2xl p-3.5 px-4 shadow-luxury flex items-center justify-between flex-wrap gap-3 animate-fade-in border border-purple-900/40">
          <div className="flex items-center space-x-3 flex-wrap gap-y-1">
            <span className="w-7 h-7 rounded-xl bg-purple-500/30 border border-purple-400/40 text-purple-200 font-mono font-bold flex items-center justify-center text-xs">
              {selectedOrderIds.length}
            </span>
            <span className="text-xs font-semibold text-purple-100">
              {selectedOrderIds.length} of {orders.length} {selectedOrderIds.length === 1 ? 'order' : 'orders'} selected
            </span>
            {selectedPendingOrders.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {selectedPendingOrders.length} Pending Payment
              </span>
            )}
            <span className="text-white/30 hidden sm:inline">|</span>
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-xs text-purple-300 hover:text-white underline cursor-pointer font-medium"
            >
              {isAllSelected ? 'Deselect All' : `Select All Visible (${orders.length})`}
            </button>
            {pendingPaymentOrders.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllPendingOrders}
                className="text-xs text-amber-300 hover:text-amber-100 underline cursor-pointer font-medium"
              >
                Select All Pending ({pendingPaymentOrders.length})
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* EMAIL PENDING PAYMENT USERS BUTTON */}
            <button
              type="button"
              onClick={() => setBulkEmailModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Email payment reminder to selected pending customers"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>
                Email Pending Users (
                {selectedPendingOrders.length > 0 ? selectedPendingOrders.length : selectedOrderIds.length}
                )
              </span>
            </button>

            <button
              type="button"
              onClick={() => setBulkDeleteModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedOrderIds.length})</span>
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-brand-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8FC] border-b border-brand-border text-brand-muted font-caps tracking-wider text-[10px] uppercase">
              <tr>
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    ref={(el) => { if (el) el.indeterminate = isSomeSelected; }}
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    aria-label="Select all orders"
                    title={isAllSelected ? "Deselect all orders" : "Select all orders"}
                    className="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer accent-[#8366B0]"
                  />
                </th>
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
                  <td colSpan={7} className="py-12 text-center text-brand-muted">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-muted">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr 
                    key={ord.id} 
                    className={`transition-colors ${selectedOrderIds.includes(ord.id) ? 'bg-purple-50/70' : 'hover:bg-[#FAF8FC]'}`}
                  >
                    {/* Selection Checkbox */}
                    <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.includes(ord.id)}
                        onChange={() => handleToggleSelectOrder(ord.id)}
                        aria-label={`Select order #${ord.order_number}`}
                        className="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer accent-[#8366B0]"
                      />
                    </td>
                    {/* Order Number & Item Preview */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start space-x-3">
                        {ord.first_item_image ? (
                          <button
                            type="button"
                            onClick={() => setAssuranceItem({
                              product_name: ord.first_item_name,
                              sku: ord.first_item_sku,
                              slug: ord.first_item_slug,
                              primary_image: ord.first_item_image,
                              order_number: ord.order_number,
                              customer_name: ord.customer_name,
                              total_price: ord.total_amount,
                              is_jhumka_box: Number(ord.has_jhumka_box) > 0,
                            })}
                            className="relative group shrink-0 rounded-xl overflow-hidden border border-brand-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            title="Click to view product image (Assurance Preview)"
                          >
                            <img
                              src={normalizeMediaUrl(ord.first_item_image)}
                              alt={ord.first_item_name || 'Ordered item'}
                              className="w-11 h-11 object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                if (e.target.src.includes('/uploads/') && !e.target.src.includes('/api/uploads/')) {
                                  e.target.src = e.target.src.replace('/uploads/', '/api/uploads/');
                                } else {
                                  e.target.src = 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=150&q=80';
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                          </button>
                        ) : null}

                        <div className="min-w-0">
                          <div className="font-mono font-bold text-brand-tertiary flex items-center space-x-1">
                            <span>#{ord.order_number}</span>
                          </div>
                          {ord.first_item_name && (
                            <div className="text-[11px] font-medium text-brand-tertiary truncate max-w-[170px]" title={ord.first_item_name}>
                              {ord.first_item_name}
                            </div>
                          )}
                          <div className="text-[10px] text-brand-muted">
                            {new Date(ord.created_at).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {Number(ord.items_count) > 1 && (
                              <span className="ml-1.5 px-1.5 py-0.2 bg-gray-100 text-gray-700 rounded font-semibold text-[9px]">
                                +{Number(ord.items_count) - 1} more
                              </span>
                            )}
                          </div>
                          {Number(ord.has_jhumka_box) > 0 && (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 mt-1">
                              <Flame className="w-2.5 h-2.5 text-amber-600" />
                              <span>📦 Jhumka Ad Order</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Customer Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-brand-tertiary">{ord.customer_name}</div>
                      <div className="text-[10px] text-brand-muted">{ord.customer_phone}</div>
                      <div className="text-[10px] text-brand-muted">{ord.city}, {ord.pincode}</div>
                    </td>

                    {/* Payment Breakdown & Status */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-brand-tertiary">
                            ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                          </span>
                          {renderPaymentStatusBadge(ord)}
                        </div>
                        <div className="text-[11px] text-brand-muted">
                          {ord.payment_type === 'partial' ? (
                            (ord.payment_status === 'partial_paid' || ord.payment_status === 'paid') ? (
                              <span className="text-emerald-700 font-medium">₹{Number(ord.amount_paid_upfront)} advance paid · ₹{Number(ord.amount_due_on_delivery)} due</span>
                            ) : (
                              <span>Partial COD (₹{Number(ord.amount_paid_upfront)} advance)</span>
                            )
                          ) : ord.payment_type === 'cod' ? (
                            <span>Cash on Delivery</span>
                          ) : (
                            <span>Prepaid</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Fulfillment Status */}
                    <td className="py-3.5 px-4">
                      {renderStatusBadge(ord.order_status)}
                    </td>

                    {/* AWB Code & Shiprocket Live Status */}
                    <td className="py-3.5 px-4">
                      {ord.shiprocket_order_id && !String(ord.shiprocket_order_id).startsWith('SR-ORD-') ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>SR #{ord.shiprocket_order_id}</span>
                          </span>
                          {ord.shiprocket_awb ? (
                            <div className="text-[10px] font-mono text-brand-primary font-semibold truncate max-w-[130px]">
                              {ord.shiprocket_awb}
                            </div>
                          ) : (
                            <div className="text-[9px] text-brand-muted">Awaiting AWB</div>
                          )}
                          <div className="text-[9px] text-brand-muted truncate max-w-[130px]">
                            {ord.courier_name || 'Shiprocket'}
                          </div>
                        </div>
                      ) : String(ord.shiprocket_order_id || '').startsWith('SR-ORD-') ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300" title="Sandbox dummy ID created before Shiprocket setup">
                            <span>⚠️ Mock SR</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSyncShiprocket(ord.id)}
                            disabled={syncingSrId === ord.id}
                            className="block px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-600 hover:text-white border border-amber-300 text-amber-800 text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {syncingSrId === ord.id ? 'Syncing...' : 'Push to Live'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            <span>Not Synced</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSyncShiprocket(ord.id)}
                            disabled={syncingSrId === ord.id}
                            className="block px-2 py-0.5 rounded-md bg-purple-50 hover:bg-brand-primary hover:text-white border border-purple-200 text-brand-primary text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {syncingSrId === ord.id ? 'Pushing...' : 'Push to SR'}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {ord.first_item_image && (
                          <button
                            type="button"
                            onClick={() => setAssuranceItem({
                              product_name: ord.first_item_name,
                              sku: ord.first_item_sku,
                              slug: ord.first_item_slug,
                              primary_image: ord.first_item_image,
                              order_number: ord.order_number,
                              customer_name: ord.customer_name,
                              total_price: ord.total_amount,
                              is_jhumka_box: Number(ord.has_jhumka_box) > 0,
                            })}
                            title="View Product Image (Assurance Preview)"
                            className="p-1.5 rounded-xl bg-gray-100 hover:bg-brand-primary hover:text-white border border-brand-border text-brand-muted hover:text-white transition-all cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (ord.payment_status === 'pending' && ord.payment_type !== 'cod') {
                              if (!window.confirm(`Payment for Order #${ord.order_number} has not been received yet (Status: Unpaid). Are you sure you want to push this unpaid order to Shiprocket?`)) {
                                return;
                              }
                            }
                            handleSyncShiprocket(ord.id);
                          }}
                          disabled={syncingSrId === ord.id}
                          title={
                            ord.payment_status === 'pending' && ord.payment_type !== 'cod'
                              ? 'Payment pending. Confirm payment before shipping.'
                              : (ord.shiprocket_order_id && !String(ord.shiprocket_order_id).startsWith('SR-ORD-')
                                  ? 'Re-sync with Shiprocket live panel'
                                  : 'Push order directly to Shiprocket live panel')
                          }
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1 shadow-2xs border cursor-pointer disabled:opacity-50 ${
                            ord.shiprocket_order_id && !String(ord.shiprocket_order_id).startsWith('SR-ORD-')
                              ? 'bg-emerald-50 hover:bg-emerald-600 hover:text-white border-emerald-200 text-emerald-700'
                              : 'bg-white hover:bg-gray-100 border-brand-border text-brand-tertiary'
                          }`}
                        >
                          <Truck className={`w-3 h-3 ${syncingSrId === ord.id ? 'animate-bounce' : ''}`} />
                          <span className="hidden xl:inline">
                            {syncingSrId === ord.id
                              ? 'Syncing...'
                              : (ord.shiprocket_order_id && !String(ord.shiprocket_order_id).startsWith('SR-ORD-')
                                  ? 'SR Synced'
                                  : 'Push SR')}
                          </span>
                        </button>
                        <button
                          onClick={() => openEmailModal(ord)}
                          title="Send Branded Customer Email"
                          className="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-brand-primary hover:text-white border border-purple-200 text-brand-primary text-xs font-semibold transition-all flex items-center space-x-1 shadow-2xs cursor-pointer"
                        >
                          <SendHorizontal className="w-3 h-3" />
                          <span className="hidden sm:inline">Email</span>
                        </button>
                        <button
                          onClick={() => inspectOrder(ord.id)}
                          className="px-3 py-1 rounded-xl bg-[#FAF8FC] hover:bg-brand-primary hover:text-white border border-brand-border text-brand-tertiary text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(ord)}
                          title="Delete Order Permanently"
                          className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 text-rose-600 text-xs font-semibold transition-all flex items-center space-x-1 shadow-2xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
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

            {/* Payment Status Banner */}
            {selectedOrder.payment_status === 'pending' && selectedOrder.payment_type !== 'cod' ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs space-y-1.5 text-rose-900">
                <div className="flex items-center space-x-2 font-bold text-rose-800 text-sm">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                  <span>Payment Not Received (Abandoned Checkout)</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  The buyer filled in their address but <strong>did not complete the payment on the payment gateway</strong>. No funds were debited or credited to your Razorpay or bank account. Do not dispatch this package unless payment is verified.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] font-mono text-rose-800">
                  <span className="bg-rose-100 px-2 py-0.5 rounded font-semibold">Payment Status: UNPAID / PENDING</span>
                  <span>Gateway Transaction Ref: None</span>
                </div>
              </div>
            ) : (selectedOrder.payment_status === 'paid' || selectedOrder.payment_status === 'partial_paid') ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs space-y-1 text-emerald-900">
                <div className="flex items-center space-x-2 font-bold text-emerald-800 text-sm">
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                  <span>
                    {selectedOrder.payment_status === 'partial_paid' ? 'Partial COD Advance Paid' : 'Payment Received & Verified'}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-700 flex items-center space-x-2">
                  <span>Transaction Ref:</span>
                  <span className="font-mono font-semibold bg-emerald-100/70 px-2 py-0.5 rounded text-emerald-800">
                    {selectedOrder.fastrr_order_id || 'Captured via Gateway'}
                  </span>
                </div>
              </div>
            ) : selectedOrder.payment_type === 'cod' ? (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs space-y-1 text-blue-900">
                <div className="flex items-center space-x-2 font-bold text-blue-800 text-sm">
                  <span>💵</span>
                  <span>Cash on Delivery (Full Doorstep Collection)</span>
                </div>
                <div className="text-[11px] text-blue-700">
                  Collect ₹{Number(selectedOrder.total_amount).toLocaleString('en-IN')} cash upon doorstep delivery.
                </div>
              </div>
            ) : null}

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
                {selectedOrder.items?.map((item) => {
                  const itemPayload = {
                    product_name: item.product_name,
                    sku: item.sku,
                    slug: item.slug,
                    primary_image: item.primary_image,
                    quantity: item.quantity,
                    variant_title: item.variant_title,
                    unit_price: item.unit_price,
                    total_price: item.total_price,
                    order_number: selectedOrder.order_number,
                    customer_name: selectedOrder.customer_name,
                    is_jhumka_box: Number(item.is_jhumka_box) > 0,
                  };

                  return (
                    <div key={item.id} className="p-3 flex items-center justify-between text-xs hover:bg-[#FAF8FC] rounded-xl transition-colors">
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => setAssuranceItem(itemPayload)}
                          className="relative group shrink-0 rounded-xl overflow-hidden border border-brand-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary"
                          title="Click to view high-resolution product image for assurance"
                        >
                          <img
                            src={
                              item.primary_image ? normalizeMediaUrl(item.primary_image) :
                              'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=150&q=80'
                            }
                            alt={item.product_name}
                            className="w-12 h-12 rounded-xl object-cover group-hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              if (e.target.src.includes('/uploads/') && !e.target.src.includes('/api/uploads/')) {
                                e.target.src = e.target.src.replace('/uploads/', '/api/uploads/');
                              } else {
                                e.target.src = 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=150&q=80';
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-4 h-4 drop-shadow-sm" />
                          </div>
                        </button>

                        <div>
                          <div className="font-semibold text-brand-tertiary flex items-center space-x-2">
                            <span>{item.product_name}</span>
                            {item.sku && (
                              <span className="font-mono text-[9px] text-brand-muted bg-gray-100 px-1.5 py-0.2 rounded">
                                {item.sku}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-brand-muted mt-0.5">
                            Qty: {item.quantity} × ₹{Number(item.unit_price).toLocaleString('en-IN')}
                            {item.variant_title && <span className="ml-1.5 text-brand-tertiary">• {item.variant_title}</span>}
                          </div>
                          {Number(item.is_jhumka_box) > 0 && (
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                              🔥 Signature Jhumka Box
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2.5">
                        <button
                          type="button"
                          onClick={() => setAssuranceItem(itemPayload)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-brand-primary hover:text-white text-[11px] font-semibold text-brand-tertiary transition-colors cursor-pointer"
                          title="Inspect product photo for packing assurance"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Image</span>
                        </button>

                        <div className="font-bold text-brand-tertiary font-mono">
                          ₹{Number(item.total_price).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                <div className="pt-2 border-t border-brand-border/60 text-[11px]">
                  {selectedOrder.payment_status === 'partial_paid' || selectedOrder.payment_status === 'paid' ? (
                    <div className="text-emerald-800">
                      <span>Upfront Deposit Paid: </span>
                      <span className="font-bold">₹{Number(selectedOrder.amount_paid_upfront)}</span>
                      <span className="text-brand-muted"> (Balance ₹{Number(selectedOrder.amount_due_on_delivery)} due on delivery)</span>
                    </div>
                  ) : (
                    <div className="text-rose-700">
                      <span className="font-bold">⚠️ Advance Deposit Required: ₹{Number(selectedOrder.amount_paid_upfront)} (UNPAID)</span>
                      <span className="text-brand-muted"> — Customer has not completed payment.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Shiprocket Live Panel Synchronization Card */}
            <div className="bg-gradient-to-br from-[#FAF8FC] via-white to-purple-50/40 rounded-2xl p-4 sm:p-5 border border-purple-200/80 shadow-2xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-brand-primary flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-editorial text-sm font-bold text-brand-tertiary">Shiprocket Live Dashboard Sync</h4>
                    <div className="text-[10px] text-brand-muted">Automated sync with app.shiprocket.in warehouse</div>
                  </div>
                </div>

                {/* Live Status Badge */}
                {selectedOrder.shiprocket_order_id && !String(selectedOrder.shiprocket_order_id).startsWith('SR-ORD-') ? (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 w-fit">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Live on Shiprocket</span>
                  </span>
                ) : String(selectedOrder.shiprocket_order_id || '').startsWith('SR-ORD-') ? (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 w-fit">
                    <span>⚠️</span>
                    <span>Local Mock (Needs Push)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300 w-fit">
                    <span>○</span>
                    <span>Not Pushed Yet</span>
                  </span>
                )}
              </div>

              {/* SR Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white p-3 rounded-xl border border-brand-border text-xs">
                <div>
                  <div className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">SR Order ID</div>
                  <div className="font-mono font-bold text-brand-tertiary mt-0.5 truncate" title={selectedOrder.shiprocket_order_id || ''}>
                    {selectedOrder.shiprocket_order_id || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">Shipment ID</div>
                  <div className="font-mono font-medium text-brand-tertiary mt-0.5 truncate" title={selectedOrder.shiprocket_shipment_id || ''}>
                    {selectedOrder.shiprocket_shipment_id || 'Pending'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">AWB Number</div>
                  <div className="font-mono font-medium text-brand-primary mt-0.5 truncate" title={selectedOrder.shiprocket_awb || ''}>
                    {selectedOrder.shiprocket_awb || 'Pending Manifest'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">Courier</div>
                  <div className="font-medium text-brand-tertiary mt-0.5 truncate" title={selectedOrder.courier_name || ''}>
                    {selectedOrder.courier_name || 'Assigned by SR'}
                  </div>
                </div>
              </div>

              {/* Payment Warning for Unpaid orders */}
              {selectedOrder.payment_status === 'pending' && selectedOrder.payment_type !== 'cod' && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-900 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Payment Not Received:</strong> This customer has not completed online payment. Pushing to Shiprocket will manifest a shipment for an unpaid order. Confirm receipt of funds before shipping.
                  </span>
                </div>
              )}

              {/* Notice for Sandbox Mock or Unsynced */}
              {String(selectedOrder.shiprocket_order_id || '').startsWith('SR-ORD-') && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    This order was saved with a sandbox mock ID because credentials were not yet authenticated when the customer paid. Click <strong>"Push to Live Shiprocket Panel"</strong> below to create it directly in your live Shiprocket dashboard.
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSyncShiprocket(selectedOrder.id)}
                  disabled={syncingSrId === selectedOrder.id}
                  className="px-3.5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingSrId === selectedOrder.id ? 'animate-spin' : ''}`} />
                  <span>
                    {syncingSrId === selectedOrder.id
                      ? 'Pushing to Shiprocket...'
                      : (selectedOrder.shiprocket_order_id && !String(selectedOrder.shiprocket_order_id).startsWith('SR-ORD-')
                          ? 'Re-Push / Refresh from Shiprocket'
                          : 'Push to Live Shiprocket Panel')}
                  </span>
                </button>

                <a
                  href="https://app.shiprocket.in/orders"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-white hover:bg-gray-50 border border-brand-border text-brand-tertiary text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <span>Open Shiprocket Panel</span>
                  <ExternalLink className="w-3 h-3 text-brand-muted" />
                </a>

                {selectedOrder.tracking_url && (
                  <a
                    href={selectedOrder.tracking_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-brand-primary text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                  >
                    <span>Track Order</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
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

            {/* Delete Order Action */}
            <div className="pt-4 border-t border-brand-border flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-rose-700">Delete Order Record</div>
                <div className="text-[10px] text-brand-muted">Permanently removes this order and tracking history</div>
              </div>

              <button
                type="button"
                onClick={() => openDeleteModal(selectedOrder)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Order</span>
              </button>
            </div>
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
                  <option value="payment_reminder">💳 Payment Reminder (Incomplete Checkout Recovery Link)</option>
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

      {/* ========================================================================= */}
      {/* DELETE ORDER PERMANENT CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deleteModalOpen && orderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-brand-border shadow-luxury space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-2xl border border-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-editorial font-bold text-brand-tertiary">
                  Delete Order Permanently
                </h3>
                <span className="text-[11px] text-brand-muted">Action cannot be undone</span>
              </div>
            </div>

            <div className="bg-[#FAF8FC] rounded-2xl p-4 border border-brand-border space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-brand-border/60">
                <span className="text-brand-muted">Order Number:</span>
                <span className="font-mono font-bold text-brand-primary">#{orderToDelete.order_number}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-brand-border/60">
                <span className="text-brand-muted">Customer:</span>
                <span className="font-semibold text-brand-tertiary">{orderToDelete.customer_name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-brand-border/60">
                <span className="text-brand-muted">Total Amount:</span>
                <span className="font-bold text-brand-tertiary">₹{Number(orderToDelete.total_amount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-brand-muted">Current Status:</span>
                <span className="font-semibold uppercase text-[10px] tracking-wider text-brand-primary">{orderToDelete.order_status}</span>
              </div>
            </div>

            <p className="text-xs text-rose-700/90 leading-relaxed bg-rose-50/60 p-3 rounded-xl border border-rose-100">
              Are you sure you want to permanently delete this order? All associated line items, dispatch events, and email logs will be purged from the database.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => { setDeleteModalOpen(false); setOrderToDelete(null); }}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl border border-brand-border text-xs font-semibold text-brand-tertiary hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteOrder}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Deleting Order...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BULK DELETE ORDERS PERMANENT CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {bulkDeleteModalOpen && selectedOrderIds.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-brand-border shadow-luxury space-y-4 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-2xl border border-rose-100 shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-editorial font-bold text-brand-tertiary">
                  Delete {selectedOrderIds.length} Selected Junk Orders
                </h3>
                <span className="text-[11px] text-rose-600 font-semibold block">
                  ⚠️ Irreversible Permanent Bulk Purge
                </span>
              </div>
            </div>

            <p className="text-xs text-brand-muted leading-relaxed">
              You are about to permanently delete <strong className="text-brand-tertiary">{selectedOrderIds.length} selected {selectedOrderIds.length === 1 ? 'order' : 'orders'}</strong>. All customer details, items, dispatch tracking events, and email logs will be completely purged from the database.
            </p>

            {/* List preview of selected orders to prevent accidental mistakes */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-caps text-brand-muted px-1">
                <span>Orders to be purged ({selectedOrderIds.length})</span>
                <span>Review carefully</span>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-2xl border border-brand-border bg-[#FAF8FC] p-2 space-y-1 divide-y divide-brand-border/40">
                {orders
                  .filter((o) => selectedOrderIds.includes(o.id))
                  .map((o) => (
                    <div key={o.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs px-2 py-1">
                      <div className="truncate max-w-[240px]">
                        <span className="font-mono font-bold text-brand-primary">#{o.order_number}</span>
                        <span className="text-brand-tertiary ml-2 font-medium">{o.customer_name || 'Guest'}</span>
                        <span className="text-[10px] text-brand-muted ml-1.5 font-mono">({o.customer_phone})</span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white border border-brand-border text-brand-tertiary uppercase">
                          {o.order_status}
                        </span>
                        <span className="font-bold text-brand-tertiary">
                          ₹{Number(o.total_amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-rose-50/80 rounded-2xl p-3 border border-rose-200/80 text-[11px] text-rose-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <span>🛡️ Protection Safeguard</span>
              </p>
              <p>
                Double-check the order list above to ensure you are not deleting genuine paid customer orders. Once deleted, these records cannot be recovered.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkDeleteModalOpen(false)}
                disabled={bulkDeleting}
                className="px-4 py-2.5 rounded-xl border border-brand-border text-xs font-semibold text-brand-tertiary hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel / Keep Orders
              </button>
              <button
                type="button"
                onClick={confirmBulkDeleteOrders}
                disabled={bulkDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{bulkDeleting ? `Deleting ${selectedOrderIds.length} Orders...` : `Yes, Delete ${selectedOrderIds.length} Orders`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BULK EMAIL PAYMENT INCOMPLETE / FAILED MODAL */}
      {/* ========================================================================= */}
      {bulkEmailModalOpen && targetBulkEmailOrders.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 border border-brand-border shadow-luxury space-y-4 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
                ✕
              </div>
              <div>
                <h3 className="text-base font-editorial font-bold text-brand-tertiary">
                  Payment Incomplete / Failed (Batch Recovery Email)
                </h3>
                <span className="text-[11px] text-rose-600 font-semibold block">
                  Exact Email Format • {targetBulkEmailOrders.length} {targetBulkEmailOrders.length === 1 ? 'Customer' : 'Customers'} Selected
                </span>
              </div>
            </div>

            {/* Template Selector / Format Indicator (Exact matching the single modal) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-caps tracking-wider uppercase text-brand-tertiary font-bold">
                Selected Email Format & Template *
              </label>
              <div className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl p-3 text-xs text-brand-tertiary font-medium space-y-1">
                <div className="flex items-center justify-between font-semibold text-rose-700">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>✕ Payment Incomplete / Failed (Reassurance & Retry Link)</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                    Active Format
                  </span>
                </div>
                <div className="text-[11px] text-brand-muted">
                  <strong>Subject:</strong> Payment Incomplete for #VJ-XXXX — Your Pieces Are Safe — Valerie Jewels
                </div>
              </div>
            </div>

            {/* Try Again Link Option Feature Box */}
            <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-caps tracking-wider uppercase text-brand-primary font-bold flex items-center space-x-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Try Again & Retry Payment Link Option</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  Auto 1-Click Link
                </span>
              </div>
              <p className="text-[11px] text-brand-muted leading-relaxed">
                Each customer automatically receives the prominent 1-click recovery button linking directly to their unique checkout retry link (<code className="font-mono text-brand-primary">https://valeriejewels.in/#checkout?order=...</code>). If they prefer Cash on Delivery, they can switch to COD on checkout.
              </p>
              {/* Visual Button Preview */}
              <div className="pt-1 flex items-center justify-center">
                <div className="px-5 py-2 rounded-xl bg-[#8366B0] text-white text-[11px] font-bold tracking-wider uppercase shadow-md flex items-center space-x-2 pointer-events-none select-none">
                  <span>Complete Your Order / Retry Payment &rarr;</span>
                </div>
              </div>
            </div>

            {/* Reason / Context Input (Optional) - Matches single email modal line 1480 */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-caps tracking-wider uppercase text-brand-tertiary font-bold flex items-center justify-between">
                <span>Reason / Context (Optional)</span>
                <span className="text-[10px] text-brand-muted font-normal">Shows in alert notice inside email</span>
              </label>
              <input
                type="text"
                value={bulkEmailReason}
                onChange={(e) => setBulkEmailReason(e.target.value)}
                placeholder="e.g. Bank gateway connection interrupted during UPI authorization / Checkout incomplete"
                className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
              />
            </div>

            {/* Added Message Option (+ Added Message) - Matches single email modal line 1500 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-caps tracking-wider uppercase text-brand-tertiary font-bold">
                  + Added Message / Personalized Note (Optional)
                </label>
                <span className="text-[10px] text-brand-muted">Renders in highlighted box below greeting</span>
              </div>
              <textarea
                rows={2}
                value={bulkEmailCustomMessage}
                onChange={(e) => setBulkEmailCustomMessage(e.target.value)}
                placeholder="e.g. We have temporarily reserved your handcrafted pieces. Please click the button below to complete your payment securely and confirm priority dispatch."
                className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl p-3 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
              ></textarea>
            </div>

            {/* Recipients List Preview */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-caps text-brand-muted px-1">
                <span>Recipients ({targetBulkEmailOrders.length})</span>
                <span>Review emails & amounts</span>
              </div>
              <div className="max-h-36 overflow-y-auto rounded-2xl border border-brand-border bg-[#FAF8FC] p-2 space-y-1 divide-y divide-brand-border/40">
                {targetBulkEmailOrders.map((o) => (
                  <div key={o.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs px-2 py-1">
                    <div className="truncate max-w-[280px]">
                      <span className="font-mono font-bold text-brand-primary">#{o.order_number}</span>
                      <span className="text-brand-tertiary ml-2 font-medium">{o.customer_name || 'Valued Customer'}</span>
                      <span className="text-[10px] text-brand-muted ml-1.5">({o.customer_email || 'No email'})</span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        {o.payment_status === 'pending' ? 'Unpaid' : o.payment_status}
                      </span>
                      <span className="font-bold text-brand-tertiary font-mono">
                        ₹{Number(o.total_amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Luxury Guarantee Checklist (Matches single modal) */}
            <div className="p-3 bg-[#FAF8FC] rounded-2xl border border-brand-border/60 text-[11px] text-brand-muted space-y-1">
              <div className="flex items-center space-x-1.5 text-brand-tertiary font-medium">
                <span>✨</span>
                <span><strong>Luxury Theme Assured:</strong> Includes Valerie Jewels top logo, reserved items table, debited funds reassurance ("🛡️ Was money debited from your account?"), and WhatsApp Concierge support.</span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-brand-border/60">
              <button
                type="button"
                onClick={() => setBulkEmailModalOpen(false)}
                disabled={bulkEmailSending}
                className="px-4 py-2.5 rounded-xl border border-brand-border text-xs font-semibold text-brand-tertiary hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkEmail}
                disabled={bulkEmailSending || targetBulkEmailOrders.length === 0}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <Send className={`w-3.5 h-3.5 ${bulkEmailSending ? 'animate-spin' : ''}`} />
                <span>
                  {bulkEmailSending
                    ? `Dispatching to ${targetBulkEmailOrders.length} Customers...`
                    : `Dispatch Payment Incomplete Emails to ${targetBulkEmailOrders.length} ${targetBulkEmailOrders.length === 1 ? 'Customer' : 'Customers'}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Visual Assurance Modal */}
      <ProductAssuranceModal
        isOpen={Boolean(assuranceItem)}
        item={assuranceItem}
        onClose={() => setAssuranceItem(null)}
      />
    </div>
  );
}
