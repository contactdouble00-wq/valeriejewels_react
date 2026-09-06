import React, { useState, useEffect } from 'react';
import {
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
  Play
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

  // Cancellation sub-flow
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changed my mind');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(null);

  // Sandbox advance simulation loading
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Set initial input when opened
  useEffect(() => {
    if (isOpen) {
      if (initialOrderNumber) {
        setOrderNumberInput(initialOrderNumber);
        fetchTracking(initialOrderNumber);
      } else if (user && user.email) {
        setContactInput(user.email);
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
    } catch (err) {
      setError(err.message || 'Unable to find tracking details for this order.');
      setTrackingData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTracking(orderNumberInput, contactInput);
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
      setError('Simulation error: ' . err.message);
    } finally {
      setIsAdvancing(false);
    }
  };

  if (!isOpen) return null;

  const order = trackingData?.order;
  const milestones = trackingData?.milestones || [];
  const events = trackingData?.events || [];
  const items = trackingData?.items || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#26153D]/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
        <div
          className="relative w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all border border-brand-border"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-brand-border bg-[#FAF7FC] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-caps tracking-widest uppercase font-bold text-brand-primary block">
                  Shiprocket Express Tracking
                </span>
                <span className="text-[11px] text-brand-muted font-light">
                  Live Dispatch Status & Order Management
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-brand-muted hover:text-brand-tertiary hover:bg-brand-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Search Input Bar */}
            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-caps uppercase tracking-wider text-brand-muted font-bold mb-1">
                    Order Number *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={orderNumberInput}
                      onChange={(e) => setOrderNumberInput(e.target.value.toUpperCase())}
                      placeholder="e.g. VJ-20260905-3638"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 text-xs font-mono text-brand-tertiary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-caps uppercase tracking-wider text-brand-muted font-bold mb-1">
                    Email or Phone
                  </label>
                  <input
                    type="text"
                    value={contactInput}
                    onChange={(e) => setContactInput(e.target.value)}
                    placeholder="pooja@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 text-xs text-brand-tertiary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-brand-muted font-light">
                  💡 Tip: Find your order number in your SMS or email confirmation.
                </span>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold shadow-sm transition-all flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Locating...' : 'Track Package'}</span>
                </button>
              </div>
            </form>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {cancelSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
                <div className="flex items-center space-x-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Order Successfully Cancelled</span>
                </div>
                <p className="font-light">{cancelSuccess.refund_message}</p>
              </div>
            )}

            {/* ORDER TRACKING RESULT DETAILS */}
            {order && (
              <div className="space-y-6 pt-2 border-t border-brand-border">
                {/* 1. Status Badge & Summary */}
                <div className="p-4 rounded-2xl bg-brand-surface/70 border border-brand-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm font-bold text-brand-tertiary">
                        {order.order_number}
                      </span>
                      <span className={`text-[10px] font-caps uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${
                        order.order_status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.order_status === 'cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : order.order_status === 'shipped' || order.order_status === 'out_for_delivery'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {order.order_status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-[11px] text-brand-muted font-light mt-0.5">
                      Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })} • {order.customer_name}
                    </p>
                  </div>

                  {/* Courier Partner & AWB */}
                  {order.shiprocket_awb && (
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] font-caps uppercase tracking-wider text-brand-muted block">
                        {order.courier_name} Air
                      </span>
                      <a
                        href={order.tracking_url || `https://shiprocket.co/tracking/${order.shiprocket_awb}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono font-bold text-brand-primary hover:underline inline-flex items-center space-x-1"
                      >
                        <span>AWB: {order.shiprocket_awb}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* 2. Visual 5-Milestone Tracking Ladder */}
                {order.order_status !== 'cancelled' ? (
                  <div className="space-y-3">
                    <h4 className="text-xs font-caps uppercase tracking-wider font-bold text-brand-tertiary">
                      Shipment Journey
                    </h4>

                    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-brand-border">
                      {milestones.map((m, idx) => (
                        <div key={m.key} className="relative flex items-start space-x-3 text-xs">
                          {/* Dot / Check Icon */}
                          <div className={`absolute -left-6 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-all ${
                            m.is_completed
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : m.is_current
                              ? 'bg-brand-primary text-white ring-4 ring-brand-primary/20'
                              : 'bg-white border-2 border-brand-border text-brand-muted'
                          }`}>
                            {m.is_completed ? (
                              <Check className="w-3 h-3 stroke-[3]" />
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className={`font-bold block ${
                              m.is_current ? 'text-brand-primary' : m.is_completed ? 'text-brand-tertiary' : 'text-brand-muted'
                            }`}>
                              {m.label}
                            </span>
                            <span className="text-[11px] text-brand-muted font-light block">
                              {m.description}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Cancelled State Banner */
                  <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs space-y-2">
                    <div className="flex items-center space-x-2 text-rose-800 font-bold">
                      <Ban className="w-4 h-4 text-rose-600" />
                      <span>Order Cancelled</span>
                    </div>
                    <p className="text-rose-900/80 font-light">
                      This order was cancelled on {new Date(order.cancelled_at || order.created_at).toLocaleString('en-IN')}.
                    </p>
                    {order.refund_amount > 0 && (
                      <div className="p-2.5 rounded-xl bg-white border border-rose-200 text-emerald-800 font-medium flex items-center justify-between">
                        <span>Refund Amount:</span>
                        <strong className="text-sm">₹{Math.round(order.refund_amount).toLocaleString('en-IN')} (Credited to Original Method)</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Package Items & Destination */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Items Box */}
                  <div className="p-3.5 rounded-2xl bg-brand-surface/40 border border-brand-border space-y-2">
                    <span className="font-caps uppercase tracking-wider text-brand-muted font-bold block text-[10px]">
                      Items in Package ({items.length})
                    </span>
                    <div className="space-y-1.5">
                      {items.map((it) => (
                        <div key={it.id} className="flex justify-between items-baseline text-brand-tertiary">
                          <span className="truncate pr-2 font-medium">
                            {it.quantity}x {it.product_name}
                          </span>
                          <span className="font-semibold text-brand-muted flex-shrink-0">
                            ₹{Math.round(it.total_price).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Destination */}
                  <div className="p-3.5 rounded-2xl bg-brand-surface/40 border border-brand-border space-y-1 text-brand-tertiary">
                    <span className="font-caps uppercase tracking-wider text-brand-muted font-bold block text-[10px]">
                      Delivery Destination
                    </span>
                    <p className="font-medium">{order.shipping_address_line1}</p>
                    <p className="text-brand-muted font-light">
                      {order.city}, {order.state} - {order.pincode}
                    </p>
                    <p className="text-[11px] text-brand-primary font-semibold pt-1">
                      Estimated Delivery: {order.estimated_delivery_date || 'Within 3-5 days'}
                    </p>
                  </div>
                </div>

                {/* 4. Customer Cancellation Action or Status */}
                {order.order_status !== 'cancelled' && (
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-brand-border">
                    {order.can_cancel ? (
                      !showCancelConfirm ? (
                        <div className="w-full flex items-center justify-between">
                          <span className="text-[11px] text-brand-muted font-light">
                            Need to cancel? Permitted prior to courier dispatch.
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowCancelConfirm(true)}
                            className="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-caps tracking-wider uppercase font-bold transition-colors"
                          >
                            Cancel Order
                          </button>
                        </div>
                      ) : (
                        /* Cancellation Confirmation Prompt */
                        <div className="w-full p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="font-bold text-xs text-rose-900 block">
                                Are you sure you want to cancel?
                              </span>
                              <p className="text-[11px] text-rose-800 font-light mt-0.5">
                                {order.amount_paid_upfront > 0
                                  ? `A full refund of ₹${Math.round(order.amount_paid_upfront).toLocaleString('en-IN')} will be processed to your source account within 3-5 days.`
                                  : 'No payment was collected upfront. Order will be voided.'}
                              </p>
                            </div>
                            <button
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
                              className="w-full px-3 py-2 rounded-xl border border-rose-300 bg-white text-xs text-brand-tertiary focus:outline-none"
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
                              {isCancelling ? 'Cancelling...' : 'Confirm Cancellation & Refund'}
                            </button>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="w-full flex items-center justify-between text-xs text-brand-muted">
                        <span className="flex items-center space-x-1.5">
                          <ShieldCheck className="w-4 h-4 text-brand-primary" />
                          <span>Package in transit. Self-service cancellation blocked per policy.</span>
                        </span>
                        <a
                          href="#contact"
                          onClick={() => alert('Valerie Concierge is available 24/7 at support@valeriejewels.com')}
                          className="text-brand-primary underline hover:text-brand-primary-hover"
                        >
                          Need help? Contact Concierge
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Sandbox Demo Utility (Test Milestone Progression) */}
                {order.order_status !== 'cancelled' && order.order_status !== 'delivered' && (
                  <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center justify-between text-xs">
                    <span className="text-purple-900/80 font-light flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Sandbox Demo Mode: Advance Courier Tracking Milestone</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAdvanceShipment}
                      disabled={isAdvancing}
                      className="px-3 py-1.5 rounded-lg bg-brand-primary text-white text-[11px] font-caps tracking-wider uppercase font-bold hover:bg-brand-primary-hover transition-all flex items-center space-x-1"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isAdvancing ? 'Scanning...' : 'Simulate Next Scan'}</span>
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
