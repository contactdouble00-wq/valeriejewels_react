import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  Clock,
  ShieldCheck,
  CreditCard,
  Banknote,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  ShoppingBag,
  Sparkles,
  Zap,
  Lock,
  Timer,
} from 'lucide-react';
import { apiService } from '../services/api';
import { useCart } from '../context/CartContext';
import { trackPurchase } from '../utils/analytics';

export default function OrderConfirmationPage({
  orderId: initialOrderId,
  onNavigateHome,
  onOpenTracking,
  isFailedMode = false,
}) {
  const { clearCart } = useCart();

  // Extract orderId from props or URL
  const extractOrderId = () => {
    if (initialOrderId && initialOrderId.trim()) return initialOrderId.trim();
    if (typeof window === 'undefined') return '';

    // Check path: /order-success/VJ-123456, /order-failed/VJ-123456, /order-confirmation/VJ-123456, etc.
    const path = window.location.pathname || '';
    const pathMatch = path.match(/\/(?:order-confirmation|order-success|thank-you|order-failed|order-cancelled|payment-failed)\/([A-Za-z0-9-]+)/i);
    if (pathMatch && pathMatch[1]) return pathMatch[1].trim();

    // Check query params: ?order_id=VJ-123456 or ?order=...
    const searchParams = new URLSearchParams(window.location.search);
    const queryOrder = searchParams.get('order_id') ||
      searchParams.get('order') ||
      searchParams.get('orderNumber') ||
      searchParams.get('id');
    if (queryOrder && queryOrder.trim()) return queryOrder.trim();

    // Check hash: #order-confirmation/VJ-123456 or #order-failed/...
    const hash = window.location.hash || '';
    const hashMatch = hash.match(/(?:order-confirmation\/|order-success\/|thank-you\/|order-failed\/|order-cancelled\/|payment-failed\/|order_id=|order=)([A-Za-z0-9-]+)/i);
    if (hashMatch && hashMatch[1]) return hashMatch[1].trim();

    return '';
  };

  const orderNumber = extractOrderId();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [pendingItems, setPendingItems] = useState([]);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isConvertingToCod, setIsConvertingToCod] = useState(false);
  const [retryError, setRetryError] = useState(null);
  const [reservationSeconds, setReservationSeconds] = useState(899); // 14m 59s urgency timer

  const MAX_POLL_ATTEMPTS = 2; // Fast 2-attempt poll before rendering conversion recovery
  const pollTimerRef = useRef(null);
  const cartClearedRef = useRef(false);

  // 15-minute psychological reservation countdown timer
  useEffect(() => {
    if (order) return;
    const timer = setInterval(() => {
      setReservationSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [order]);

  const formatReservationTime = () => {
    const m = Math.floor(reservationSeconds / 60);
    const s = reservationSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper to dynamically load official Razorpay SDK
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // If no orderId provided, redirect to home
  useEffect(() => {
    if (!orderNumber) {
      if (onNavigateHome) onNavigateHome();
      else window.location.href = '/';
    }
  }, [orderNumber, onNavigateHome]);

  const verifyAndLoadOrder = async (isPoll = false) => {
    if (!orderNumber) return;
    if (!isPoll) setLoading(true);
    else setIsVerifying(true);

    try {
      const data = await apiService.getOrderConfirmation(orderNumber);
      const fetchedOrder = data?.order || data;
      const fetchedItems = data?.items || fetchedOrder?.items || [];

      if (!fetchedOrder) {
        throw new Error('Order details not found.');
      }

      setPendingOrder(fetchedOrder);
      setPendingItems(fetchedItems);

      const pStatus = (fetchedOrder.payment_status || '').toLowerCase();
      const oStatus = (fetchedOrder.order_status || '').toLowerCase();
      const pType = (fetchedOrder.payment_type || '').toLowerCase();

      // Verification logic:
      // - Full Prepaid: must be 'paid' or 'confirmed'
      // - Partial COD: must be 'partial_paid' or 'confirmed'
      // - Pure COD: can be 'pending' or 'confirmed' with payment_type === 'cod'
      const isConfirmed =
        pStatus === 'paid' ||
        pStatus === 'partial_paid' ||
        oStatus === 'confirmed' ||
        (pType === 'cod' && (oStatus === 'confirmed' || pStatus === 'pending'));

      if (isConfirmed) {
        setOrder(fetchedOrder);
        setItems(fetchedItems);
        setError(null);
        setLoading(false);
        setIsVerifying(false);

        // 1. Update URL to order-success if needed
        if (typeof window !== 'undefined' && orderNumber) {
          const curPath = window.location.pathname || '';
          if (curPath.includes('/order-failed') || curPath.includes('/order-cancelled') || curPath.includes('/payment-failed')) {
            window.history.replaceState(null, '', `/order-success/${orderNumber}`);
          }
        }

        // 2. Clear customer cart once verified
        if (!cartClearedRef.current) {
          clearCart();
          cartClearedRef.current = true;
        }

        // 2. Fire deduplicated GTM / Meta conversion purchase event
        trackPurchase({
          ...fetchedOrder,
          items: fetchedItems,
        });

        // Clear any running polling timer
        if (pollTimerRef.current) {
          clearTimeout(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      } else {
        // Order exists but payment is not confirmed yet (initial checkout failed/timed out)
        const isExplicitFail = isFailedMode || (typeof window !== 'undefined' && (
          window.location.pathname.includes('/order-failed') ||
          window.location.pathname.includes('/order-cancelled') ||
          window.location.pathname.includes('/payment-failed') ||
          window.location.hash.includes('#order-failed') ||
          window.location.hash.includes('#order-cancelled') ||
          window.location.hash.includes('#payment-failed')
        ));

        if (!isExplicitFail && pollCount < MAX_POLL_ATTEMPTS) {
          setIsVerifying(true);
          pollTimerRef.current = setTimeout(() => {
            setPollCount((prev) => prev + 1);
          }, 2500);
        } else {
          setLoading(false);
          setIsVerifying(false);
          setError({
            type: 'unconfirmed',
            message: 'Payment Incomplete or Interrupted',
            description: 'Your handcrafted jewelry reservation is held for a limited time. Please complete your payment below to secure immediate dispatch.',
          });
        }
      }
    } catch (err) {
      if (pollCount < MAX_POLL_ATTEMPTS) {
        setIsVerifying(true);
        pollTimerRef.current = setTimeout(() => {
          setPollCount((prev) => prev + 1);
        }, 2500);
      } else {
        setLoading(false);
        setIsVerifying(false);
        setError({
          type: 'not_found',
          message: 'Unable to verify order payment status.',
          description: err.message || 'Please check your order reference number or contact support.',
        });
      }
    }
  };

  useEffect(() => {
    verifyAndLoadOrder(pollCount > 0);
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [orderNumber, pollCount]);

  // High-converting Razorpay retry payment action
  const handleRetryPayment = async (targetType = 'full_prepaid') => {
    if (!orderNumber || isRetrying) return;
    setIsRetrying(true);
    setRetryError(null);

    try {
      const res = await apiService.retryPaymentOrder({
        orderNumber,
        paymentType: targetType,
      });

      if (res?.data?.already_confirmed) {
        await verifyAndLoadOrder(false);
        setIsRetrying(false);
        return;
      }

      const retryData = res?.data;
      const rzpKey = retryData?.razorpay_key_id || 'rzp_live_Tf7Bar4fWloC2y';

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error('Payment gateway SDK could not be loaded. Please check your internet connection.');
      }

      const amountInPaise = Math.round(Number(retryData?.amount_due_now || pendingOrder?.total_amount || 0) * 100);

      const rzpOptions = {
        key: rzpKey,
        amount: amountInPaise,
        currency: retryData?.currency || 'INR',
        name: 'Valerie Jewels',
        description: `Complete Order #${orderNumber}`,
        image: '/v-logo.png',
        order_id: retryData?.razorpay_order_id || undefined,
        prefill: {
          name: retryData?.customer?.name || pendingOrder?.customer_name || '',
          email: retryData?.customer?.email || pendingOrder?.customer_email || '',
          contact: (retryData?.customer?.phone || pendingOrder?.customer_phone || '').replace(/\D/g, '').slice(-10),
        },
        notes: {
          order_number: orderNumber,
          payment_type: targetType,
          source: 'order_confirmation_retry',
        },
        theme: {
          color: '#8366B0',
        },
        handler: async (rpResponse) => {
          setIsVerifying(true);
          try {
            await apiService.verifyPayment({
              order_number: orderNumber,
              order_id: retryData?.order_id || pendingOrder?.id,
              razorpay_payment_id: rpResponse.razorpay_payment_id,
              razorpay_order_id: rpResponse.razorpay_order_id || retryData?.razorpay_order_id,
              razorpay_signature: rpResponse.razorpay_signature,
            });
            await verifyAndLoadOrder(false);
          } catch (verErr) {
            setRetryError(verErr.message || 'Payment received! Your order is syncing and will verify in a few seconds.');
            verifyAndLoadOrder(false);
          } finally {
            setIsRetrying(false);
            setIsVerifying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsRetrying(false);
          },
          backdropclose: false,
          escape: true,
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
      };

      const rzp = new window.Razorpay(rzpOptions);
      rzp.on('payment.failed', (failResp) => {
        setIsRetrying(false);
        setRetryError(failResp.error?.description || 'Payment was unsuccessful or cancelled. You can retry with another UPI app or switch to Cash on Delivery.');
      });
      rzp.open();

    } catch (err) {
      setIsRetrying(false);
      setRetryError(err.message || 'Unable to launch payment gateway. Please try again or switch to Cash on Delivery.');
    }
  };

  // Psychological fallback: 1-click convert order to Cash on Delivery
  const handleSwitchToCod = async () => {
    if (!orderNumber || isConvertingToCod) return;
    setIsConvertingToCod(true);
    setRetryError(null);

    try {
      const res = await apiService.convertOrderToCod({ orderNumber });
      if (res?.data?.order || res?.success) {
        await verifyAndLoadOrder(false);
      } else {
        throw new Error(res?.message || 'Failed to switch to Cash on Delivery.');
      }
    } catch (err) {
      setRetryError(err.message || 'Unable to switch payment method. Please try again or message our concierge.');
    } finally {
      setIsConvertingToCod(false);
    }
  };

  const handleCopyOrderNumber = () => {
    if (navigator.clipboard && orderNumber) {
      navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleManualRetry = () => {
    setPollCount(0);
    setError(null);
    verifyAndLoadOrder(false);
  };

  // Helper formatting
  const customerFirstName = order?.customer_name
    ? order.customer_name.trim().split(' ')[0]
    : 'Valued Customer';

  const isPartialCod = order?.payment_type === 'partial';
  const isPrepaid = order?.payment_type === 'full_prepaid' || (!isPartialCod && order?.payment_type !== 'cod');
  const isPureCod = order?.payment_type === 'cod';

  const amountPaidUpfront = Number(order?.amount_paid_upfront ?? (isPrepaid ? order?.total_amount : 0));
  const amountDueOnDelivery = Number(order?.amount_due_on_delivery ?? (isPartialCod ? (order?.total_amount - amountPaidUpfront) : 0));
  const totalAmount = Number(order?.total_amount ?? (amountPaidUpfront + amountDueOnDelivery));

  // Compute estimated delivery text
  const etaText = order?.estimated_delivery_date
    ? new Date(order.estimated_delivery_date).toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '3–4 Business Days';

  const orderDateText = order?.created_at
    ? new Date(order.created_at).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('en-IN');

  // WhatsApp support link with prefilled order number
  const whatsappUrl = `https://wa.me/919999999999?text=${encodeURIComponent(
    `Hi Valerie Jewels, I have a question regarding my confirmed order #${orderNumber || ''}`
  )}`;

  // 1. Skeleton Loading / Payment Verification State
  if (loading || isVerifying) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-brand-border p-8 text-center space-y-6 shadow-luxury">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-brand-primary/20 animate-ping"></div>
            <div className="w-20 h-20 rounded-full bg-brand-primary-light flex items-center justify-center text-brand-primary border-2 border-brand-primary/30 shadow-inner">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-caps tracking-widest uppercase font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              Verifying Payment
            </span>
            <h2 className="text-xl sm:text-2xl font-editorial font-bold text-brand-tertiary">
              Confirming Your Order...
            </h2>
            <p className="text-xs sm:text-sm text-brand-muted font-light leading-relaxed">
              We're securely communicating with your payment gateway. This usually takes just a few seconds.
            </p>
          </div>

          <div className="bg-[#FAF7FC] p-4 rounded-2xl border border-brand-border space-y-2 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="text-brand-muted">Order Reference:</span>
              <span className="font-mono font-bold text-brand-tertiary">#{orderNumber}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-brand-muted">Verification Status:</span>
              <span className="text-brand-primary font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></span>
                Secure handshake in progress
              </span>
            </div>
          </div>

          <p className="text-[11px] text-brand-muted">
            Please do not refresh or close this window.
          </p>
        </div>
      </div>
    );
  }

  // 2. High-Converting Psychological Payment Retry & Recovery View
  if ((error?.type === 'unconfirmed' || (!order && pendingOrder)) && pendingOrder) {
    const custFirstName = (pendingOrder.customer_name || 'Valued Customer').trim().split(' ')[0];
    const upfrontAmount = Number(pendingOrder.total_amount || 0);

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 space-y-6 animate-in fade-in duration-300">
        
        {/* Urgency & Reservation Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 p-[2px] shadow-luxury">
          <div className="rounded-[22px] bg-white p-5 sm:p-7 space-y-5">
            
            {/* Top Status Header + Countdown */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-150">
              <div className="flex items-center space-x-2 text-rose-600 font-bold text-xs sm:text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                <span className="font-caps tracking-wider uppercase">Order Held • Payment Pending</span>
              </div>
              
              {/* Ticking 15-Minute Reservation Timer */}
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-mono font-bold self-start sm:self-auto">
                <Timer className="w-4 h-4 text-amber-600 animate-pulse" />
                <span>RESERVATION EXPIRES IN {formatReservationTime()}</span>
              </div>
            </div>

            {/* Headline & Empathy Message */}
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-editorial font-bold text-brand-tertiary leading-tight">
                Almost yours, {custFirstName}! Complete payment to secure your order.
              </h2>
              <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
                Your payment session timed out or was interrupted. Don&apos;t worry—your pieces are temporarily held in our atelier so you don&apos;t lose your selection. Choose an option below to complete your order now.
              </p>
            </div>

            {/* Order Reference Pill */}
            <div className="p-3.5 rounded-xl bg-[#FAF7FC] border border-brand-border flex items-center justify-between text-xs">
              <span className="text-brand-muted">
                Order Reference: <strong className="text-brand-tertiary font-mono font-bold">#{orderNumber}</strong>
              </span>
              <span className="text-brand-primary font-bold text-sm">
                Total: ₹{upfrontAmount.toLocaleString('en-IN')}
              </span>
            </div>

            {retryError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{retryError}</span>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                ACTION 1: Primary Online Payment Retry CTA (1-Click UPI/Cards)
                ══════════════════════════════════════════════════════════════ */}
            <div className="pt-1 space-y-2">
              <button
                type="button"
                disabled={isRetrying || isConvertingToCod}
                onClick={() => handleRetryPayment('full_prepaid')}
                className="w-full py-4 px-6 rounded-2xl bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.99] text-white text-xs sm:text-sm font-caps tracking-widest uppercase font-bold shadow-lg hover:shadow-luxury-hover transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isRetrying ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-brand-gold fill-brand-gold" />
                    <span>TRY PAYMENT AGAIN — ₹{upfrontAmount.toLocaleString('en-IN')} (UPI &amp; CARDS)</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-brand-muted">
                ⚡ Instant confirmation via GPay, PhonePe, Paytm, All UPI, Credit/Debit Cards &amp; NetBanking
              </p>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                ACTION 2: Psychological Fallback - Switch to Cash on Delivery
                ══════════════════════════════════════════════════════════════ */}
            <div className="pt-3 border-t border-gray-150 space-y-2">
              <div className="text-center">
                <span className="text-[11px] font-caps tracking-wider uppercase text-brand-muted font-semibold">
                  Prefer Doorstep Cash on Delivery Instead?
                </span>
              </div>

              <button
                type="button"
                disabled={isRetrying || isConvertingToCod}
                onClick={handleSwitchToCod}
                className="w-full py-3.5 px-6 rounded-2xl bg-white border-2 border-emerald-600 hover:bg-emerald-50 active:scale-[0.99] text-emerald-800 text-xs sm:text-sm font-caps tracking-wider uppercase font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isConvertingToCod ? (
                  <div className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span>SWITCH TO CASH ON DELIVERY (PAY AT DOORSTEP)</span>
                  </>
                )}
              </button>
              <p className="text-[10.5px] text-center text-emerald-700">
                ✓ Zero online payment required right now • Pay cash or UPI to courier upon doorstep delivery
              </p>
            </div>

          </div>
        </div>

        {/* Itemized Order Preview */}
        {pendingItems.length > 0 && (
          <div className="bg-white rounded-2xl border border-brand-border p-5 space-y-3">
            <h4 className="text-xs font-caps tracking-widest uppercase font-bold text-brand-tertiary">
              Reserved Jewelry in This Order ({pendingItems.length})
            </h4>
            <div className="divide-y divide-gray-100">
              {pendingItems.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.product_name} className="w-11 h-11 rounded-lg object-cover border border-gray-100" />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-purple-50 flex items-center justify-center text-brand-primary">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-brand-tertiary line-clamp-1">{item.product_name}</p>
                      <p className="text-[11px] text-brand-muted">Qty: {item.quantity} {item.variant_title ? `• ${item.variant_title}` : ''}</p>
                    </div>
                  </div>
                  <span className="font-bold text-brand-tertiary">₹{Number(item.total_price || item.unit_price).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trust & Psychological Reassurance Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div className="p-3 bg-white rounded-xl border border-brand-border space-y-1">
            <ShieldCheck className="w-5 h-5 text-brand-primary mx-auto" />
            <p className="text-[10px] sm:text-xs font-bold text-brand-tertiary">100% Anti-Tarnish</p>
            <p className="text-[9px] text-brand-muted">Lifetime Polish Promise</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-brand-border space-y-1">
            <Lock className="w-5 h-5 text-emerald-600 mx-auto" />
            <p className="text-[10px] sm:text-xs font-bold text-brand-tertiary">256-Bit Encrypted</p>
            <p className="text-[9px] text-brand-muted">RBI &amp; NPCI Verified</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-brand-border space-y-1">
            <Truck className="w-5 h-5 text-amber-600 mx-auto" />
            <p className="text-[10px] sm:text-xs font-bold text-brand-tertiary">Free Express Insured</p>
            <p className="text-[9px] text-brand-muted">3-5 Days Across India</p>
          </div>
        </div>

        {/* Secondary Actions: WhatsApp Concierge + Manual Status Check */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a
            href={`https://wa.me/917984024500?text=${encodeURIComponent(`Hi Valerie Jewels, my payment for order #${orderNumber} was interrupted. Can you help me complete it?`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat With Concierge On WhatsApp</span>
          </a>

          <button
            onClick={() => verifyAndLoadOrder(false)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>I Already Paid, Check Status</span>
          </button>
        </div>

        <div className="text-center pt-2">
          <button
            onClick={onNavigateHome}
            className="text-xs text-brand-muted hover:text-brand-primary transition-colors underline underline-offset-4 cursor-pointer"
          >
            Return to Store Catalog
          </button>
        </div>

      </div>
    );
  }

  // 2b. Standalone Error / Not Found State
  if (error || !order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-amber-200 p-8 text-center space-y-6 shadow-luxury">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center border-2 border-amber-200 shadow-sm">
            <AlertCircle className="w-8 h-8 stroke-[2]" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-0.5 rounded-full text-[10px] font-caps tracking-wider uppercase font-bold bg-amber-50 text-amber-800 border border-amber-200">
              Order Reference Notice
            </span>
            <h2 className="text-xl sm:text-2xl font-editorial font-bold text-brand-tertiary">
              {error?.message || 'Order Awaiting Confirmation'}
            </h2>
            <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
              {error?.description || 'We could not locate active order records for this reference number.'}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleManualRetry}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-wider uppercase font-bold transition-all flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Check Status Again</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-caps tracking-wider uppercase font-bold transition-all flex items-center justify-center space-x-2 shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Support</span>
            </a>
          </div>

          <div>
            <button
              onClick={onNavigateHome}
              className="text-xs text-brand-muted hover:text-brand-primary transition-colors underline underline-offset-4 cursor-pointer"
            >
              Return to Valerie Jewels Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Fully Verified Order Confirmation View
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-8 animate-in fade-in duration-300">

      {/* Hero Success Confirmation Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#FAF7FD] via-white to-[#FAF7FD] border border-brand-border p-6 sm:p-10 text-center space-y-5 shadow-luxury">
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Success Icon */}
        <div className="relative z-10 w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center border-2 border-emerald-200 shadow-md">
          <Check className="w-10 h-10 stroke-[3]" />
        </div>

        {/* Heading */}
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-caps tracking-wider uppercase font-bold border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Payment Verified & Order Confirmed</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-editorial font-bold text-brand-tertiary">
            Thank you, {customerFirstName}! Your order is confirmed.
          </h1>

          <p className="text-xs sm:text-sm text-brand-muted font-light max-w-lg mx-auto leading-relaxed">
            We have received your order and our atelier has initiated handcrafted preparation. A receipt has been dispatched to{' '}
            <strong className="text-brand-tertiary font-medium">{order.customer_email || order.customer_phone}</strong>.
          </p>
        </div>

        {/* Order Reference Pill & Quick Meta */}
        <div className="relative z-10 inline-flex flex-wrap items-center justify-center gap-3 bg-white p-2.5 px-5 rounded-2xl border border-brand-border shadow-xs text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-brand-muted">Order Number:</span>
            <span className="font-mono font-bold text-brand-primary text-sm">#{order.order_number}</span>
            <button
              onClick={handleCopyOrderNumber}
              className="p-1 hover:bg-gray-100 rounded-md text-brand-muted hover:text-brand-primary transition-colors"
              title="Copy Order Reference"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <span className="hidden sm:inline text-brand-border">•</span>

          <div className="flex items-center space-x-1.5 text-brand-muted">
            <Clock className="w-3.5 h-3.5" />
            <span>{orderDateText}</span>
          </div>

          <span className="hidden sm:inline text-brand-border">•</span>

          <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold">
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Est. Delivery: {etaText}</span>
          </div>
        </div>
      </div>

      {/* Dynamic Payment Mode Banner */}
      {isPartialCod ? (
        // Partial COD Banner
        <div className="rounded-2xl bg-gradient-to-r from-purple-50 via-amber-50/70 to-purple-50 border-2 border-purple-200 p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-600 text-white shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-caps tracking-widest uppercase font-bold text-purple-900 block">
                Partial Cash on Delivery Order
              </span>
              <h3 className="text-base sm:text-lg font-bold text-gray-950">
                Advance Paid: ₹{amountPaidUpfront.toLocaleString('en-IN')} • Balance on Delivery: ₹{amountDueOnDelivery.toLocaleString('en-IN')}
              </h3>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-amber-300 text-xs text-amber-950 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">
                Please keep ₹{amountDueOnDelivery.toLocaleString('en-IN')} ready for delivery!
              </p>
              <p className="text-[11px] text-amber-900 font-light leading-relaxed">
                Your online deposit of ₹{amountPaidUpfront.toLocaleString('en-IN')} has been credited. You only need to pay the remaining balance of ₹{amountDueOnDelivery.toLocaleString('en-IN')} via Cash or UPI directly to the delivery executive when the parcel arrives at your doorstep.
              </p>
            </div>
          </div>
        </div>
      ) : isPureCod ? (
        // Pure COD Banner
        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-5 space-y-2">
          <div className="flex items-center space-x-2 text-gray-900 font-bold text-sm">
            <Banknote className="w-4 h-4 text-brand-primary" />
            <span>Cash on Delivery (COD)</span>
          </div>
          <p className="text-xs text-gray-600">
            Please pay the total amount of <strong className="text-gray-900">₹{totalAmount.toLocaleString('en-IN')}</strong> in cash or UPI to the delivery courier upon arrival.
          </p>
        </div>
      ) : (
        // 100% Full Prepaid Banner
        <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-caps tracking-widest uppercase font-bold text-emerald-800 block">
                Prepaid Payment Successful
              </span>
              <p className="text-sm sm:text-base font-bold text-emerald-950">
                Paid in Full: ₹{totalAmount.toLocaleString('en-IN')}.00
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Zero Balance on Delivery</span>
          </div>
        </div>
      )}

      {/* Order Details & Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

        {/* Left Column: Ordered Items List */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-brand-border p-5 sm:p-7 space-y-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 text-brand-primary" />
              <h2 className="text-sm font-caps uppercase tracking-wider font-bold text-brand-tertiary">
                Order Items ({items.length})
              </h2>
            </div>
            <span className="text-xs text-brand-muted font-light">Fast Dispatch Atelier</span>
          </div>

          <div className="divide-y divide-brand-border/60">
            {items.map((item, idx) => (
              <div key={item.id || idx} className="py-3.5 flex items-center space-x-3 sm:space-x-4">
                {/* Item Thumbnail */}
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-brand-primary-light/40 border border-brand-border overflow-hidden shrink-0 flex items-center justify-center">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="w-7 h-7 text-brand-primary/40" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="text-xs sm:text-sm font-semibold text-brand-tertiary leading-snug line-clamp-2">
                    {item.product_name}
                  </h4>
                  {item.variant_title && (
                    <p className="text-[11px] text-brand-muted">
                      Edition: {item.variant_title}
                    </p>
                  )}
                  <p className="text-[11px] text-brand-muted">
                    Qty: <strong className="text-brand-tertiary font-bold">{item.quantity}</strong> × ₹{Number(item.unit_price).toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Item Total */}
                <div className="text-right shrink-0">
                  <span className="text-xs sm:text-sm font-bold text-brand-tertiary font-mono">
                    ₹{Number(item.total_price || item.unit_price * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Complimentary Packaging Note */}
          <div className="p-3.5 rounded-2xl bg-[#FAF7FC] border border-brand-border flex items-center space-x-2.5 text-xs text-brand-tertiary">
            <Sparkles className="w-4 h-4 text-brand-gold shrink-0 animate-pulse" />
            <span className="text-[11px] font-light">
              Complimentary luxury velvet gift box & micro-fiber polishing kit included.
            </span>
          </div>
        </div>

        {/* Right Column: Pricing Breakdown & Shipping Info */}
        <div className="lg:col-span-5 space-y-6">

          {/* Price Breakdown Card */}
          <div className="bg-white rounded-3xl border border-brand-border p-5 sm:p-6 space-y-4 shadow-xs">
            <h3 className="text-xs font-caps uppercase tracking-wider font-bold text-brand-tertiary pb-2 border-b border-brand-border">
              Payment Summary
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-brand-muted">
                <span>Items Subtotal</span>
                <span className="font-mono text-brand-tertiary">₹{Number(order.subtotal || totalAmount).toLocaleString('en-IN')}.00</span>
              </div>

              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount Applied</span>
                  <span className="font-mono font-bold">-₹{Number(order.discount_amount).toLocaleString('en-IN')}.00</span>
                </div>
              )}

              <div className="flex justify-between text-brand-muted">
                <span>Shipping & Express Handling</span>
                <span className="font-semibold text-emerald-700">FREE</span>
              </div>

              <div className="pt-2 border-t border-brand-border flex justify-between text-sm sm:text-base font-bold text-brand-tertiary">
                <span>Total Order Value</span>
                <span className="font-mono text-brand-primary">₹{totalAmount.toLocaleString('en-IN')}.00</span>
              </div>

              {isPartialCod && (
                <div className="pt-2 border-t border-brand-border/60 space-y-1.5 text-xs">
                  <div className="flex justify-between text-purple-900 font-semibold">
                    <span>Paid Online (Advance Deposit)</span>
                    <span className="font-mono">₹{amountPaidUpfront.toLocaleString('en-IN')}.00</span>
                  </div>
                  <div className="flex justify-between text-amber-900 font-bold bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                    <span>Balance Due on Delivery</span>
                    <span className="font-mono">₹{amountDueOnDelivery.toLocaleString('en-IN')}.00</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address Card */}
          <div className="bg-white rounded-3xl border border-brand-border p-5 sm:p-6 space-y-3.5 shadow-xs">
            <div className="flex items-center space-x-2 text-xs font-caps uppercase tracking-wider font-bold text-brand-tertiary pb-2 border-b border-brand-border">
              <MapPin className="w-3.5 h-3.5 text-brand-primary" />
              <span>Delivery Address</span>
            </div>

            <div className="space-y-1 text-xs text-brand-muted leading-relaxed">
              <p className="font-semibold text-brand-tertiary text-sm">
                {order.customer_name}
              </p>
              <p>{order.shipping_address_line1}</p>
              {order.shipping_address_line2 && <p>{order.shipping_address_line2}</p>}
              <p>
                {order.city}, {order.state} - <strong className="font-mono text-brand-tertiary font-bold">{order.pincode}</strong>
              </p>
              <div className="pt-2 flex flex-col gap-1 text-[11px] text-brand-tertiary font-medium">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-brand-muted" />
                  <span>{order.customer_phone}</span>
                </span>
                {order.customer_email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-brand-muted" />
                    <span>{order.customer_email}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Action Buttons & Reassurance Footer */}
      <div className="bg-white rounded-3xl border border-brand-border p-6 sm:p-8 space-y-6 text-center shadow-xs">
        <div className="max-w-md mx-auto space-y-1">
          <h4 className="text-base font-editorial font-bold text-brand-tertiary">
            Need Live Updates or Have a Question?
          </h4>
          <p className="text-xs text-brand-muted font-light">
            Our concierge team is available 24/7 on WhatsApp. Live courier tracking activates upon dispatch.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
          {/* Continue Shopping */}
          <button
            onClick={onNavigateHome}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Track Order */}
          <button
            onClick={() => {
              if (onOpenTracking) onOpenTracking(order.order_number);
              else window.location.href = `/track/${order.order_number}`;
            }}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white border border-brand-border hover:border-brand-primary text-brand-tertiary text-xs font-caps tracking-wider uppercase font-semibold transition-all flex items-center justify-center space-x-2"
          >
            <Truck className="w-3.5 h-3.5 text-brand-primary" />
            <span>Track Order Status</span>
          </button>

          {/* WhatsApp Support */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-caps tracking-wider uppercase font-bold transition-all flex items-center justify-center space-x-2 shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp Support</span>
          </a>
        </div>
      </div>

    </div>
  );
}
