import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  X,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Check,
  Ban,
  ChevronRight,
  Play,
  Copy,
  MessageCircle,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function OrderTrackingModal({ isOpen, onClose, initialOrderNumber = '' }) {
  const { user, token } = useAuth();

  const [orderNumberInput, setOrderNumberInput] = useState('');
  const [contactInput, setContactInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState(null);
  const [copiedOrder, setCopiedOrder] = useState(false);
  const [showSearchForm, setShowSearchForm] = useState(false);

  // Cancellation sub-flow
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changed my mind');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(null);

  // Sandbox advance simulation loading
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Lock body scroll and listen for Escape key when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  // Set initial input & fetch when opened
  useEffect(() => {
    if (isOpen) {
      if (initialOrderNumber) {
        setOrderNumberInput(initialOrderNumber);
        setShowSearchForm(false);
        fetchTracking(initialOrderNumber);
      } else if (user && user.email) {
        setContactInput(user.email);
        setShowSearchForm(true);
      } else {
        setShowSearchForm(true);
      }
    } else {
      setShowCancelConfirm(false);
      setCancelSuccess(null);
      setError(null);
    }
  }, [isOpen, initialOrderNumber, user]);

  const fetchTracking = async (orderNumToFetch, contactToFetch = '') => {
    const ordNum = (orderNumToFetch || orderNumberInput).trim();
    if (!ordNum) {
      setError('Please enter your Valerie Order Reference (e.g. VJ-20260905-XXXX)');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.trackOrder(ordNum, contactToFetch || contactInput);
      setTrackingData(data);
      setShowSearchForm(false);
    } catch (err) {
      setError(err.message || 'Unable to find tracking details for this order. Please check the reference number.');
      setTrackingData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTracking(orderNumberInput, contactInput);
  };

  const handleCopyOrderNumber = (ordNum) => {
    if (!ordNum) return;
    navigator.clipboard.writeText(ordNum);
    setCopiedOrder(true);
    setTimeout(() => setCopiedOrder(false), 2000);
  };

  const handleCancelOrder = async () => {
    if (!trackingData || !trackingData.order) return;
    setIsCancelling(true);
    setError(null);

    try {
      const result = await apiService.cancelOrder({
        orderNumber: trackingData.order.order_number,
        reason: cancelReason,
        contact: contactInput,
        token,
      });

      setCancelSuccess(result);
      setShowCancelConfirm(false);
      // Refresh order tracking
      await fetchTracking(trackingData.order.order_number, contactInput);
    } catch (err) {
      setError(err.message || 'Failed to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Sandbox simulation: advance shipment to next milestone
  const handleAdvanceShipment = async () => {
    if (!trackingData || !trackingData.order) return;
    setIsAdvancing(true);

    const current = trackingData.order.order_status;
    let nextStatus = 'processing';
    if (current === 'confirmed') nextStatus = 'processing';
    else if (current === 'processing') nextStatus = 'shipped';
    else if (current === 'shipped') nextStatus = 'out_for_delivery';
    else if (current === 'out_for_delivery') nextStatus = 'delivered';

    try {
      await apiService.advanceShipmentStatus({
        orderNumber: trackingData.order.order_number,
        status: nextStatus,
        location: nextStatus === 'shipped' ? 'Bengaluru Air Cargo Terminal' : 'Local Delivery Hub',
        note: `Simulated Shiprocket scan: ${nextStatus.replace('_', ' ').toUpperCase()}`,
      });
      await fetchTracking(trackingData.order.order_number, contactInput);
    } catch (err) {
      setError('Simulation error: ' + err.message);
    } finally {
      setIsAdvancing(false);
    }
  };

  if (!isOpen) return null;

  const order = trackingData?.order;
  const milestones = trackingData?.milestones || [];
  const events = trackingData?.events || [];
  const items = trackingData?.items || [];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          label: 'Delivered',
          icon: CheckCircle2,
          dotColor: 'bg-emerald-500'
        };
      case 'cancelled':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-200',
          label: 'Cancelled',
          icon: Ban,
          dotColor: 'bg-rose-500'
        };
      case 'shipped':
        return {
          bg: 'bg-sky-100 text-sky-800 border-sky-200',
          label: 'Dispatched via Air',
          icon: Truck,
          dotColor: 'bg-sky-500'
        };
      case 'out_for_delivery':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-200',
          label: 'Out for Delivery',
          icon: Clock,
          dotColor: 'bg-amber-500'
        };
      case 'processing':
        return {
          bg: 'bg-purple-100 text-purple-800 border-purple-200',
          label: 'Packed & Inspected',
          icon: Package,
          dotColor: 'bg-purple-500'
        };
      case 'confirmed':
      default:
        return {
          bg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          label: 'Order Confirmed',
          icon: CheckCircle2,
          dotColor: 'bg-indigo-500'
        };
    }
  };

  const statusBadge = order ? getStatusBadge(order.order_status) : null;
  const StatusIcon = statusBadge ? statusBadge.icon : Truck;

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F4F6] flex flex-col font-sans overflow-y-auto min-h-screen select-none animate-fade-in">
      
      {/* Centered responsive container (edge-to-edge on mobile, sleek app layout on desktop) */}
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col bg-[#F4F4F6] min-h-screen relative shadow-sm sm:border-x sm:border-gray-200/80">

        {/* ══════════════════════════════════════════════════════════════
            1. MINIMAL LUXURY HEADER (Matching Full-Screen Checkout)
        ══════════════════════════════════════════════════════════════ */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200/90 px-4 h-14 flex items-center justify-between shrink-0 shadow-2xs">
          <button
            type="button"
            onClick={onClose}
            className="p-2 -ml-2 text-gray-700 hover:text-black transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5"
            aria-label="Back to store"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
            <span className="text-xs font-semibold hidden sm:inline text-gray-600">Back</span>
          </button>

          <div className="flex items-center justify-center">
            <img
              src="/valerie.png"
              alt="VALERIÉ"
              className="h-6 sm:h-7 w-auto object-contain cursor-pointer"
              onClick={onClose}
            />
          </div>

          <div className="w-12 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              title="Close tracking"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════
            2. DARK PURPLE LUXURY STATUS RIBBON
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-[#281636] px-4 py-2.5 text-center shrink-0 shadow-xs flex items-center justify-center space-x-2">
          <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span className="text-[10px] sm:text-[11.5px] font-bold text-white tracking-widest uppercase">
            ⚡ LIVE DISPATCH STATUS & SHIPROCKET ORDER TRACKING
          </span>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            3. MAIN FULL-SCREEN CONTENT AREA
        ══════════════════════════════════════════════════════════════ */}
        <div className="flex-1 p-4 sm:p-6 space-y-5 bg-[#F4F4F6] pb-24">

          {/* Collapsible / Toggleable Search Card */}
          {(showSearchForm || !order) && (
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-brand-primary">
                  <Search className="w-5 h-5 text-brand-primary" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-gray-900 font-editorial">
                    Track Your Order
                  </h2>
                  <p className="text-xs text-gray-500 font-light">
                    Enter your Valerie Order Reference to view live courier updates.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSearchSubmit} className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Order Reference *
                    </label>
                    <input
                      type="text"
                      required
                      value={orderNumberInput}
                      onChange={(e) => setOrderNumberInput(e.target.value.toUpperCase())}
                      placeholder="e.g. VJ-20260905-3638"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 text-xs font-mono text-gray-900 uppercase font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Email or Phone
                    </label>
                    <input
                      type="text"
                      value={contactInput}
                      onChange={(e) => setContactInput(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 text-xs text-gray-900"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] text-gray-400 font-light">
                    💡 Check your order confirmation SMS or WhatsApp for your VJ reference.
                  </span>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#281636] to-brand-primary text-white text-xs font-caps tracking-widest uppercase font-bold shadow-sm hover:opacity-95 active:scale-98 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{isLoading ? 'Locating Package...' : 'Track Package'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Compact Toggle to Track Another Order (when order is loaded) */}
          {order && !showSearchForm && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <span>Currently viewing:</span>
                <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                  {order.order_number}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSearchForm(true)}
                className="text-xs text-brand-primary hover:text-brand-primary-hover font-semibold flex items-center space-x-1"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Track Another Order</span>
              </button>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2.5 animate-fade-in">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1">
                <span className="font-semibold block">Tracking Notice</span>
                <p className="font-light mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Cancellation Notice */}
          {cancelSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1 animate-fade-in">
              <div className="flex items-center space-x-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Order Cancelled & Refund Initiated</span>
              </div>
              <p className="font-light">{cancelSuccess.refund_message}</p>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              ORDER LOADED: FULL-SCREEN DETAILED TRACKING PANELS
          ══════════════════════════════════════════════════════════════ */}
          {order && (
            <div className="space-y-5 animate-fade-in">

              {/* 1. HERO STATUS CARD */}
              <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                {/* Top Row: Order Ref & Status Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm sm:text-base font-bold text-gray-900">
                      {order.order_number}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyOrderNumber(order.order_number)}
                      className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      title="Copy order number"
                    >
                      {copiedOrder ? (
                        <span className="text-[10px] text-emerald-600 font-bold">Copied!</span>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <span className={`text-[11px] font-caps uppercase tracking-wider font-bold px-3 py-1 rounded-full border flex items-center space-x-1.5 ${statusBadge.bg}`}>
                    <span className={`w-2 h-2 rounded-full ${statusBadge.dotColor} animate-pulse`} />
                    <span>{statusBadge.label}</span>
                  </span>
                </div>

                {/* Middle Row: Big Status Highlight */}
                <div className="flex items-start sm:items-center space-x-3.5 py-1">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    order.order_status === 'delivered' ? 'bg-emerald-50 text-emerald-600' :
                    order.order_status === 'cancelled' ? 'bg-rose-50 text-rose-600' :
                    'bg-purple-50 text-brand-primary'
                  }`}>
                    <StatusIcon className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                      {order.order_status === 'delivered' ? 'Your package has been delivered!' :
                       order.order_status === 'cancelled' ? 'This order was cancelled' :
                       order.order_status === 'out_for_delivery' ? 'Package is out for delivery today' :
                       order.order_status === 'shipped' ? 'Package in transit via air cargo' :
                       order.order_status === 'processing' ? 'Atelier quality check & velvet packaging' :
                       'Order confirmed & allocated to atelier'}
                    </h3>
                    <p className="text-xs text-gray-500 font-light mt-0.5">
                      Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })} for {order.customer_name}
                    </p>
                  </div>
                </div>

                {/* Bottom Row: Courier Details & ETA */}
                <div className="bg-[#FAF8FC] rounded-xl p-3.5 border border-purple-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-caps uppercase tracking-wider text-gray-400 font-bold block">
                      Estimated Arrival
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-brand-tertiary">
                      {order.order_status === 'delivered' 
                        ? 'Delivered to recipient' 
                        : (order.estimated_delivery_date 
                            ? new Date(order.estimated_delivery_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                            : 'Within 3-5 business days')}
                    </span>
                  </div>

                  {order.shiprocket_awb && (
                    <div className="sm:text-right">
                      <span className="text-[10px] font-caps uppercase tracking-wider text-gray-400 font-bold block">
                        {order.courier_name || 'Shiprocket Express Air'}
                      </span>
                      <a
                        href={order.tracking_url || `https://shiprocket.co/tracking/${order.shiprocket_awb}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono font-bold text-brand-primary hover:underline inline-flex items-center space-x-1"
                      >
                        <span>AWB: {order.shiprocket_awb}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. VISUAL 5-MILESTONE SHIPMENT JOURNEY */}
              {order.order_status !== 'cancelled' ? (
                <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <h4 className="text-xs font-caps uppercase tracking-wider font-bold text-gray-900 flex items-center space-x-2">
                      <Truck className="w-4 h-4 text-brand-primary" />
                      <span>Shipment Journey</span>
                    </h4>
                    <span className="text-[11px] text-gray-400 font-light">
                      Step {milestones.findIndex(m => m.is_current) + 1 || (order.order_status === 'delivered' ? 5 : 1)} of 5
                    </span>
                  </div>

                  <div className="relative pl-6 sm:pl-7 pt-2 pb-1 space-y-6 before:absolute before:left-3 before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-200">
                    {milestones.map((m, idx) => {
                      const isCompleted = m.is_completed;
                      const isCurrent = m.is_current;

                      return (
                        <div key={m.key} className="relative flex items-start space-x-3.5 text-xs">
                          {/* Dot / Checkmark Icon */}
                          <div
                            className={`absolute -left-6 sm:-left-7 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all z-10 ${
                              isCompleted
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : isCurrent
                                ? 'bg-[#281636] text-white ring-4 ring-purple-200 shadow-xs animate-pulse'
                                : 'bg-white border-2 border-gray-300 text-gray-400'
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : (
                              <span className="font-bold">{idx + 1}</span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center justify-between">
                              <span
                                className={`font-bold block text-xs sm:text-sm ${
                                  isCurrent
                                    ? 'text-brand-primary'
                                    : isCompleted
                                    ? 'text-gray-900'
                                    : 'text-gray-400'
                                }`}
                              >
                                {m.label}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                                  Current Status
                                </span>
                              )}
                            </div>
                            <span className="text-[11.5px] text-gray-500 font-light block mt-0.5">
                              {m.description}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Carrier Scan Logs (if available) */}
                  {events && events.length > 0 && (
                    <div className="pt-3 border-t border-gray-100 space-y-2">
                      <span className="text-[10px] font-caps uppercase tracking-wider text-gray-400 font-bold block">
                        Recent Carrier Checkpoints
                      </span>
                      <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-xs">
                        {events.map((ev, i) => (
                          <div key={ev.id || i} className="flex justify-between items-start text-[11.5px]">
                            <div>
                              <span className="font-semibold text-gray-800">{ev.title || ev.status}</span>
                              {ev.location && <span className="text-gray-500 font-light"> • {ev.location}</span>}
                              {ev.description && <p className="text-gray-500 font-light text-[10.5px]">{ev.description}</p>}
                            </div>
                            <span className="text-gray-400 text-[10px] font-mono shrink-0 pl-2">
                              {new Date(ev.occurred_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Cancelled State Card */
                <div className="bg-white rounded-2xl border border-rose-200 p-5 sm:p-6 shadow-xs space-y-3">
                  <div className="flex items-center space-x-2 text-rose-800 font-bold text-sm">
                    <Ban className="w-5 h-5 text-rose-600" />
                    <span>Order Cancelled</span>
                  </div>
                  <p className="text-xs text-gray-600 font-light">
                    This order was cancelled on{' '}
                    <strong>{new Date(order.cancelled_at || order.created_at).toLocaleString('en-IN')}</strong>.
                    {order.cancellation_reason && (
                      <span className="block mt-1 text-gray-500">Reason: “{order.cancellation_reason}”</span>
                    )}
                  </p>
                  {order.refund_amount > 0 && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                      <span>Refund Initiated:</span>
                      <strong className="text-sm">
                        ₹{Math.round(order.refund_amount).toLocaleString('en-IN')} (Credited to Original Method)
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {/* 3. PACKAGE CONTENTS & PAYMENT SUMMARY */}
              <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h4 className="text-xs font-caps uppercase tracking-wider font-bold text-gray-900 flex items-center space-x-2">
                    <Package className="w-4 h-4 text-brand-primary" />
                    <span>Items in Package ({items.length})</span>
                  </h4>
                  <span className="text-[10px] font-caps uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                    {order.payment_type ? order.payment_type.replace('_', ' ').toUpperCase() : 'PREPAID'}
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {items.map((it) => (
                    <div key={it.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <span className="w-6 h-6 rounded-md bg-purple-50 text-brand-primary font-bold flex items-center justify-center text-[10px] shrink-0">
                          {it.quantity}x
                        </span>
                        <div className="truncate">
                          <span className="font-semibold text-gray-900 block truncate">
                            {it.product_name}
                          </span>
                          {it.variant_title && (
                            <span className="text-[10px] text-gray-400 font-light block">
                              {it.variant_title}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-bold text-gray-900 font-mono shrink-0">
                        ₹{Math.round(it.total_price).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown Footer */}
                <div className="pt-3 border-t border-gray-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>₹{Math.round(order.subtotal || order.total_amount).toLocaleString('en-IN')}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount</span>
                      <span>-₹{Math.round(order.discount_amount).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500">
                    <span>Express Air Shipping</span>
                    <span className="text-emerald-700 font-semibold">FREE</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-100">
                    <span>Grand Total</span>
                    <span className="font-mono text-base">₹{Math.round(order.total_amount).toLocaleString('en-IN')}</span>
                  </div>
                  {order.amount_due_on_delivery > 0 && (
                    <div className="flex justify-between text-amber-800 bg-amber-50 p-2 rounded-lg text-xs font-semibold">
                      <span>Amount Due on Delivery (COD)</span>
                      <span className="font-mono">₹{Math.round(order.amount_due_on_delivery).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. DELIVERY ADDRESS CARD */}
              <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 shadow-xs space-y-3">
                <h4 className="text-xs font-caps uppercase tracking-wider font-bold text-gray-900 flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-brand-primary" />
                  <span>Delivery Destination</span>
                </h4>

                <div className="text-xs text-gray-700 space-y-1">
                  <p className="font-bold text-gray-900">{order.customer_name}</p>
                  <p className="font-light">{order.shipping_address_line1}</p>
                  {order.shipping_address_line2 && <p className="font-light">{order.shipping_address_line2}</p>}
                  <p className="font-light text-gray-600">
                    {order.city}, {order.state} — {order.pincode}
                  </p>
                  <div className="pt-2 flex flex-wrap gap-4 text-gray-500 font-light">
                    {order.customer_phone && (
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{order.customer_phone}</span>
                      </span>
                    )}
                    {order.customer_email && (
                      <span className="flex items-center space-x-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span>{order.customer_email}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 5. CANCELLATION FLOW */}
              {order.order_status !== 'cancelled' && (
                <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 shadow-xs">
                  {order.can_cancel ? (
                    !showCancelConfirm ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-bold text-gray-900">Need to cancel your order?</h4>
                          <p className="text-[11px] text-gray-500 font-light mt-0.5">
                            Self-service cancellation is permitted before dispatch to our air courier.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCancelConfirm(true)}
                          className="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-caps tracking-wider uppercase font-bold transition-colors shrink-0"
                        >
                          Cancel Order
                        </button>
                      </div>
                    ) : (
                      /* Cancellation Confirmation Box */
                      <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-bold text-xs text-rose-900 block">
                              Confirm Order Cancellation?
                            </span>
                            <p className="text-[11px] text-rose-800 font-light mt-0.5">
                              {order.amount_paid_upfront > 0
                                ? `A full refund of ₹${Math.round(order.amount_paid_upfront).toLocaleString('en-IN')} will be credited to your source payment method within 3-5 business days.`
                                : 'No upfront payment was collected. Your order will be voided immediately.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowCancelConfirm(false)}
                            className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                          >
                            Dismiss
                          </button>
                        </div>

                        <div>
                          <label className="block text-[10px] font-caps uppercase tracking-wider text-rose-900 font-bold mb-1">
                            Reason for Cancellation
                          </label>
                          <select
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-rose-300 bg-white text-xs text-gray-800 focus:outline-none"
                          >
                            <option value="Changed my mind">Changed my mind</option>
                            <option value="Ordered wrong piece/variant">Ordered wrong piece/variant</option>
                            <option value="Need to change shipping address">Need to change shipping address</option>
                            <option value="Found alternative item">Found alternative item</option>
                          </select>
                        </div>

                        <div className="flex justify-end space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowCancelConfirm(false)}
                            className="px-4 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-caps tracking-wider uppercase font-bold"
                          >
                            Keep My Order
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelOrder}
                            disabled={isCancelling}
                            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-caps tracking-wider uppercase font-bold transition-all shadow-sm"
                          >
                            {isCancelling ? 'Processing...' : 'Confirm Cancellation & Refund'}
                          </button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Package is in transit. Cancellation is locked per courier policy.</span>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 6. WHATSAPP & CONCIERGE SUPPORT CARD */}
              <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>Valerie Luxury Concierge</span>
                  </h4>
                  <p className="text-[11px] text-gray-500 font-light mt-0.5">
                    Questions about sizing, delivery date change, or gifting? We're online 24/7.
                  </p>
                </div>

                <a
                  href={`https://wa.me/918401340156?text=${encodeURIComponent(
                    `Hi Valerie Jewels Concierge, I would like an update on my order ${order.order_number}.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-caps tracking-wider uppercase font-bold transition-all flex items-center justify-center space-x-2 shrink-0 shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Concierge</span>
                </a>
              </div>

              {/* 7. SANDBOX DEMO STATUS ADVANCE TOOL (For testing) */}
              {order.order_status !== 'cancelled' && order.order_status !== 'delivered' && (
                <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <span className="text-purple-900/80 font-light flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    <span>Sandbox Demo Tool: Simulate next courier scan & milestone</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAdvanceShipment}
                    disabled={isAdvancing}
                    className="px-3.5 py-1.5 rounded-lg bg-brand-primary text-white text-[11px] font-caps tracking-wider uppercase font-bold hover:bg-brand-primary-hover transition-all flex items-center space-x-1 shrink-0"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isAdvancing ? 'Updating...' : 'Simulate Next Scan'}</span>
                  </button>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
