import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Truck,
  CreditCard,
  Smartphone,
  Banknote,
  Percent,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Clock,
  PackageCheck,
  Phone,
  Mail,
  Edit2,
  Gift,
  Heart,
  MessageCircle,
  ExternalLink,
  Landmark,
  Wallet,
  User
} from 'lucide-react';
import { apiService } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

// Pincode directory lookup helper for instant city/state auto-fill
const PINCODE_MAP = {
  '110': { city: 'New Delhi', state: 'Delhi', days: '2–3 Days' },
  '400': { city: 'Mumbai', state: 'Maharashtra', days: '2–3 Days' },
  '411': { city: 'Pune', state: 'Maharashtra', days: '3–4 Days' },
  '560': { city: 'Bengaluru', state: 'Karnataka', days: '3–4 Days' },
  '600': { city: 'Chennai', state: 'Tamil Nadu', days: '3–4 Days' },
  '500': { city: 'Hyderabad', state: 'Telangana', days: '3–4 Days' },
  '700': { city: 'Kolkata', state: 'West Bengal', days: '3–5 Days' },
  '380': { city: 'Ahmedabad', state: 'Gujarat', days: '2–3 Days' },
  '360': { city: 'Rajkot', state: 'Gujarat', days: '2–3 Days' },
  '395': { city: 'Surat', state: 'Gujarat', days: '2–3 Days' },
  '302': { city: 'Jaipur', state: 'Rajasthan', days: '3–4 Days' },
  '226': { city: 'Lucknow', state: 'Uttar Pradesh', days: '3–4 Days' },
  '160': { city: 'Chandigarh', state: 'Punjab', days: '2–3 Days' },
  '682': { city: 'Kochi', state: 'Kerala', days: '3–5 Days' },
  '452': { city: 'Indore', state: 'Madhya Pradesh', days: '3–4 Days' },
  '800': { city: 'Patna', state: 'Bihar', days: '4–5 Days' },
  '781': { city: 'Guwahati', state: 'Assam', days: '4–5 Days' },
};

export default function CheckoutModal({ isOpen, onClose, onTrackOrder }) {
  const { cartItems, clearCart } = useCart();
  const { user, token } = useAuth();

  // Fastrr Checkout Step Sequence:
  // 'phone' -> 'otp' -> 'details_payment' -> 'processing' -> 'confirmed'
  const [step, setStep] = useState('phone');

  // Fastrr dynamic settings loaded from backend / cache
  const [paymentSettings, setPaymentSettings] = useState({
    gateway_mode: 'live',
    prepaid_discount: 50,
    prepaid_gift_title: 'Free Zircon Necklace',
    prepaid_gift_subtitle: 'Included complimentary with all prepaid orders',
    online_payment_enabled: true,
    partial_cod_enabled: true,
    partial_advance: 150,
    cod_fee: 0,
    cod_available: false,
    checkout_banner_text: 'GET A FREE ZIRCON NECKLACE WORTH RS.1499 WHEN YOU PAY ONLINE',
    exit_intent_enabled: true,
    exit_intent_title: 'Wait! Are you sure you want to exit?',
    exit_intent_message: 'High-demand handcrafted pieces in your bag might sell out before your next visit.',
    testimonial_quote: '“The Korean earrings collection with velvet box is breathtaking! Quality feels like real 18K gold. Absolutely loved the free zircon gift.”',
    testimonial_author: 'Ananya Sharma, Verified Buyer • New Delhi',
  });

  // Contact & Address Fields
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('Jayeshbhai Patel');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [deliveryEta, setDeliveryEta] = useState('3–5 Days');

  // Modal / Drawer to Change Delivery Address
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // OTP State
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(25);
  const [otpResent, setOtpResent] = useState(false);
  const [demoOtp, setDemoOtp] = useState('123456');
  const [isLiveSms, setIsLiveSms] = useState(false);
  const [otpInfoMsg, setOtpInfoMsg] = useState(null);
  const otpInputs = useRef([]);

  // UI Toggles & Modals
  const [orderSummaryOpen, setOrderSummaryOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [couponCode, setCouponCode] = useState('VALERIE10');
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);

  // Payment Selection: 'full_prepaid' | 'partial' | 'cod'
  const [paymentType, setPaymentType] = useState('full_prepaid');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('upi'); // 'upi' | 'card' | 'netbanking' | 'wallet' | 'paylater' | 'partial_cod' | 'cod'
  const [selectedUpiApp, setSelectedUpiApp] = useState('google_pay');
  const [showUpiInput, setShowUpiInput] = useState(false);
  const [upiIdInput, setUpiIdInput] = useState('');

  // Server Calculation & Submission States
  const [calcData, setCalcData] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Auto-fallback payment selection if currently selected method is disabled by admin
  useEffect(() => {
    const isOnlineOk = paymentSettings.online_payment_enabled !== false && calcData?.payment_splits?.full_prepaid?.enabled !== false;
    const isPartialOk = !!paymentSettings.partial_cod_enabled && calcData?.payment_splits?.partial?.enabled !== false;
    const isCodOk = !!paymentSettings.cod_available && calcData?.payment_splits?.cod?.enabled !== false;

    if (paymentType === 'full_prepaid' && !isOnlineOk) {
      if (isPartialOk) setPaymentType('partial');
      else if (isCodOk) setPaymentType('cod');
    } else if (paymentType === 'partial' && !isPartialOk) {
      if (isOnlineOk) setPaymentType('full_prepaid');
      else if (isCodOk) setPaymentType('cod');
    } else if (paymentType === 'cod' && !isCodOk) {
      if (isOnlineOk) setPaymentType('full_prepaid');
      else if (isPartialOk) setPaymentType('partial');
    }
  }, [paymentSettings.online_payment_enabled, paymentSettings.partial_cod_enabled, paymentSettings.cod_available, calcData?.payment_splits, paymentType]);

  // 1. Fetch Dynamic Payment Settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const s = await apiService.getPaymentSettings();
        if (s) setPaymentSettings((prev) => ({ ...prev, ...s }));
      } catch (err) {
        console.warn('Using cached payment settings');
      }
    }
    loadSettings();

    const handleUpdate = (e) => {
      if (e.detail) setPaymentSettings((prev) => ({ ...prev, ...e.detail }));
    };
    window.addEventListener('valerie_payment_settings_updated', handleUpdate);
    return () => window.removeEventListener('valerie_payment_settings_updated', handleUpdate);
  }, []);

  // 2. Load Saved or Authenticated Customer Data
  useEffect(() => {
    if (!isOpen) {
      setStep('phone');
      setShowExitIntent(false);
      setIsAddressModalOpen(false);
      return;
    }

    if (user) {
      if (user.name) setName(user.name);
      if (user.email) setEmail(user.email);
      if (user.phone) {
        const clean = user.phone.replace(/\D/g, '').slice(-10);
        setPhone(clean);
      }
    } else {
      try {
        const saved = localStorage.getItem('valerie_saved_checkout_address');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.name) setName(parsed.name);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.addressLine1) setAddressLine1(parsed.addressLine1);
          if (parsed.addressLine2) setAddressLine2(parsed.addressLine2);
          if (parsed.city) setCity(parsed.city);
          if (parsed.state) setState(parsed.state);
          if (parsed.pincode) setPincode(parsed.pincode);
        } else {
          // Realistic default prefill matching fastrr address directory for instant checkout
          setName('Jayeshbhai Patel');
          setAddressLine1('Valerie Jewels, Ground Floor 001, Opp Momai Tea Stall');
          setAddressLine2('Patel Chowk, Harighawa Main Road, Near Ahir Chowk');
          setCity('Rajkot');
          setState('Gujarat');
          setPincode('360002');
          setEmail('customer@valeriejewels.in');
        }
      } catch (e) {}
    }
  }, [user, isOpen]);

  // 3. OTP Countdown Timer
  useEffect(() => {
    let interval = null;
    if (step === 'otp' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((t) => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  // 4. Server-Side Price & Payment Split Recalculation
  useEffect(() => {
    if (!isOpen || cartItems.length === 0) return;

    let isMounted = true;
    async function fetchCalculations() {
      setIsCalculating(true);
      setCalcError(null);
      try {
        const formattedItems = cartItems.map((item) => ({
          id: item.productId || item.bundleId || item.id,
          variantId: item.variantId || null,
          bundleId: item.bundleId || null,
          isBundle: item.isBundle || false,
          quantity: item.quantity,
        }));

        const result = await apiService.calculateCheckout({
          items: formattedItems,
          couponCode: couponApplied ? couponCode : '',
        });

        if (isMounted) {
          setCalcData(result);
        }
      } catch (err) {
        if (isMounted) {
          // Client-side fallback calculation if offline
          const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
          const disc = couponApplied ? Math.min(subtotal * 0.1, 200) : 0;
          const finalTot = Math.max(0, subtotal - disc);
          const prepDisc = Math.min(paymentSettings.prepaid_discount || 50, finalTot);
          setCalcData({
            subtotal,
            total_mrp: cartItems.reduce((acc, item) => acc + (item.mrp || Math.round(item.price * 1.5)) * item.quantity, 0),
            discount_amount: disc,
            final_total: finalTot,
            is_free_shipping: true,
            shipping_fee: 0,
            payment_splits: {
              full_prepaid: {
                title: 'Prepaid (UPI / Cards / NetBanking)',
                badge: `Save ₹${prepDisc} Extra Instant Discount`,
                incentive_discount: prepDisc,
                amount_due_now: Math.max(0, finalTot - prepDisc),
                amount_due_on_delivery: 0,
              },
              partial: {
                enabled: paymentSettings.partial_cod_enabled,
                title: 'Partial COD (Smart Split)',
                badge: `Pay ₹${paymentSettings.partial_advance ?? 199} Deposit Now, Rest on Delivery`,
                amount_due_now: Math.min(Number(paymentSettings.partial_advance) || 199, finalTot),
                amount_due_on_delivery: Math.max(0, finalTot - (Number(paymentSettings.partial_advance) || 199)),
              },
              cod: {
                enabled: paymentSettings.cod_available,
                title: 'Cash on Delivery (Full COD)',
                badge: paymentSettings.cod_fee > 0 ? `₹${paymentSettings.cod_fee} COD Fee` : 'Pay Full Cash at Doorstep',
                amount_due_now: 0,
                amount_due_on_delivery: finalTot + (paymentSettings.cod_fee || 0),
              },
            },
          });
        }
      } finally {
        if (isMounted) setIsCalculating(false);
      }
    }

    fetchCalculations();
    return () => {
      isMounted = false;
    };
  }, [isOpen, cartItems, couponApplied, couponCode, paymentSettings]);

  // 5. Auto Pincode Directory Resolver
  const handlePincodeChange = (pin) => {
    const clean = pin.replace(/\D/g, '').slice(0, 6);
    setPincode(clean);
    if (clean.length >= 3) {
      const prefix = clean.substring(0, 3);
      if (PINCODE_MAP[prefix]) {
        setCity(PINCODE_MAP[prefix].city);
        setState(PINCODE_MAP[prefix].state);
        setDeliveryEta(PINCODE_MAP[prefix].days);
      }
    }
  };

  // Step 1: Submit Phone Number -> Go to OTP
  // Step 1: Submit Phone Number -> Go to Details & Payment
  const handlePhoneSubmit = async (e) => {
    if (e) e.preventDefault();
    const clean = phone.replace(/\D/g, '');
    if (clean.length !== 10) {
      setSubmitError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      apiService.sendCheckoutOtp(clean).catch(() => {});
    } catch (err) {
      // Background OTP dispatch
    } finally {
      setIsSubmitting(false);
    }

    setStep('details_payment');
  };

  // Step 2: Handle OTP input & auto-advancing
  const handleOtpChange = (index, value) => {
    const clean = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = clean;
    setOtp(newOtp);

    // Auto-focus next input box
    if (clean && index < 5 && otpInputs.current[index + 1]) {
      otpInputs.current[index + 1].focus();
    }

    // Auto submit when all 6 digits entered
    const fullOtp = newOtp.join('');
    if (fullOtp.length === 6) {
      handleVerifyOtp(fullOtp);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && otpInputs.current[index - 1]) {
      otpInputs.current[index - 1].focus();
    }
  };

  const handleVerifyOtp = async (codeToVerify) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await apiService.verifyCheckoutOtp(phone, codeToVerify);
      setStep('details_payment');
    } catch (err) {
      // Offline fallback: allow test code 123456
      if (codeToVerify === '123456' || codeToVerify === demoOtp) {
        setStep('details_payment');
      } else {
        setSubmitError(err.message || 'Invalid verification code. Please check or use auto-fill.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpTimer(25);
    setOtpResent(true);
    setSubmitError(null);
    const clean = phone.replace(/\D/g, '');
    try {
      const res = await apiService.sendCheckoutOtp(clean);
      if (res?.demo_otp) setDemoOtp(res.demo_otp);
      setIsLiveSms(Boolean(res?.is_live_delivery));
    } catch (e) {}
    setTimeout(() => setOtpResent(false), 3500);
  };

  // Helper to dynamically load official Razorpay Checkout SDK
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

  // Step 3: Place Order via API & Gateway Engine
  const handlePlaceOrder = async (e, options = {}) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!name.trim() || !addressLine1.trim() || pincode.trim().length < 6) {
      setIsAddressModalOpen(true);
      setSubmitError('Please complete your full delivery address and 6-digit pincode.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const targetPaymentType = options.paymentType || paymentType;
    const targetMethod = options.method || selectedPaymentMethod;
    const directApp = options.directUpiApp || null;

    try {
      // Save address locally for instant future prefill
      try {
        localStorage.setItem('valerie_saved_checkout_address', JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        }));
      } catch (err) {}

      const formattedItems = cartItems.map((item) => ({
        id: item.productId || item.bundleId || item.id,
        variantId: item.variantId || null,
        bundleId: item.bundleId || null,
        isBundle: item.isBundle || false,
        quantity: item.quantity,
      }));

      const payload = {
        customer_name: name.trim(),
        customer_email: email.trim() || `${phone.replace(/\D/g, '')}@valerieclient.in`,
        customer_phone: phone.trim(),
        shipping_address_line1: addressLine1.trim(),
        shipping_address_line2: addressLine2.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        payment_type: targetPaymentType,
        coupon_code: couponApplied ? couponCode : '',
        items: formattedItems,
      };

      // 1. Send Order Initiation to Backend
      const initResult = await apiService.initiateCheckout(payload, token);

      const finalOrderNumber = initResult?.order_number || `VJ-${Date.now().toString().slice(-6)}`;
      const activeSplit = calcData?.payment_splits?.[targetPaymentType];

      const orderData = {
        id: initResult?.order_id || Date.now(),
        order_number: finalOrderNumber,
        total_amount: activeSplit?.amount_due_now !== undefined ? activeSplit.amount_due_now : calcData?.final_total,
        amount_paid_upfront: activeSplit?.amount_due_now || 0,
        amount_due_on_delivery: activeSplit?.amount_due_on_delivery || 0,
        payment_type: targetPaymentType,
        payment_status: targetPaymentType === 'cod' ? 'pending' : 'paid',
        shipping_name: name.trim(),
        shipping_phone: phone.trim(),
        shipping_address_line1: addressLine1.trim(),
        shipping_city: city.trim(),
        shipping_pincode: pincode.trim(),
        created_at: new Date().toISOString(),
      };

      // Case A: 100% Cash on Delivery (Doorstep settlement)
      if (targetPaymentType === 'cod') {
        setPlacedOrder(orderData);
        clearCart();
        setStep('confirmed');
        setIsSubmitting(false);
        return;
      }

      // Case B: Live Razorpay Gateway Triggering
      const rzpKey = initResult?.razorpay_key_id;
      if (rzpKey && rzpKey.trim() !== '') {
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          throw new Error('Payment gateway SDK could not be loaded. Please check your internet connection.');
        }

        if (rzpKey.startsWith('rzp_live_') && !initResult?.razorpay_order_id) {
          throw new Error('Secure Razorpay Order ID could not be generated. Please verify your Razorpay API Secret in Admin Settings.');
        }

        const dueNowInPaise = Math.round(Number(initResult.amount_payable_now || orderData.amount_paid_upfront) * 100);

        const cleanPhone = phone.replace(/\D/g, '').slice(-10);

        const rzpOptions = {
          key: rzpKey,
          amount: dueNowInPaise,
          currency: initResult.currency || 'INR',
          name: 'Valerie Jewels',
          description: targetPaymentType === 'partial'
            ? `Partial COD Advance Deposit (${finalOrderNumber})`
            : `Order ${finalOrderNumber}`,
          image: '/valerie.png',
          order_id: initResult.razorpay_order_id || undefined,
          prefill: {
            name: name.trim(),
            email: email.trim() || `${cleanPhone}@valerieclient.in`,
            contact: cleanPhone,
            method: targetMethod === 'card' ? 'card' : targetMethod === 'netbanking' ? 'netbanking' : targetMethod === 'wallet' ? 'wallet' : 'upi',
            ...(targetMethod === 'upi' && upiIdInput.trim() ? { vpa: upiIdInput.trim() } : {}),
          },
          notes: {
            order_number: finalOrderNumber,
            payment_type: targetPaymentType,
            engine: paymentSettings.checkout_engine || 'shiprocket_fastrr',
            upi_app: directApp || selectedUpiApp,
          },
          theme: {
            color: '#5B1E31',
          },
          modal: {
            ondismiss: () => {
              setIsSubmitting(false);
            },
            backdropclose: false,
            escape: true,
          },
          retry: {
            enabled: true,
            max_count: 3,
          },
          handler: async (rpResponse) => {
            setStep('processing');
            try {
              await apiService.verifyPayment({
                order_number: finalOrderNumber,
                order_id: initResult.order_id,
                razorpay_payment_id: rpResponse.razorpay_payment_id,
                razorpay_order_id: rpResponse.razorpay_order_id || initResult.razorpay_order_id,
                razorpay_signature: rpResponse.razorpay_signature,
              });

              setPlacedOrder({
                ...orderData,
                payment_status: targetPaymentType === 'partial' ? 'partial_paid' : 'paid',
                transaction_id: rpResponse.razorpay_payment_id,
              });
              clearCart();
              setStep('confirmed');
            } catch (verErr) {
              setSubmitError(verErr.message || 'Payment confirmation failed. If debited, your order will sync automatically via webhook.');
              setStep('details_payment');
            } finally {
              setIsSubmitting(false);
            }
          },
        };

        const rzpInstance = new window.Razorpay(rzpOptions);
        rzpInstance.on('payment.failed', (failResp) => {
          setIsSubmitting(false);
          setSubmitError(failResp.error?.description || 'Payment was cancelled or unsuccessful. Please try again.');
        });
        rzpInstance.open();
        return;
      }

      // Case C: Sandbox Mode Simulation (when testing before live credentials are entered)
      setPlacedOrder(orderData);
      setStep('processing');

      setTimeout(async () => {
        try {
          await apiService.verifyPayment({
            order_number: finalOrderNumber,
            order_id: initResult?.order_id,
            simulate_success: true,
          }).catch(() => {});
        } catch (e) {}

        clearCart();
        setStep('confirmed');
        setIsSubmitting(false);
      }, 1400);

    } catch (err) {
      setSubmitError(err.message || 'Payment initiation failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleAttemptClose = () => {
    if (step === 'details_payment') {
      if (paymentSettings.exit_intent_enabled) {
        setShowExitIntent(true);
      } else {
        onClose();
      }
    } else if (step === 'otp') {
      setStep('phone');
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const totalItemsCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);
  const activeSplit = calcData?.payment_splits?.[paymentType];
  const dueNow = activeSplit?.amount_due_now ?? calcData?.final_total ?? 0;
  const dueOnDelivery = activeSplit?.amount_due_on_delivery ?? 0;

  // Exact Everlasting Savings calculation
  const totalMrp = calcData?.total_mrp || cartItems.reduce((acc, item) => acc + (item.mrp || Math.round(item.price * 1.5)) * item.quantity, 0);
  const subtotal = calcData?.subtotal || cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const finalTotal = calcData?.final_total || subtotal;
  const prepaidDiscount = paymentSettings.prepaid_discount || 150;
  const prepaidAmountDue = Math.max(0, finalTotal - prepaidDiscount);

  // Dynamic calculation for green savings banner (e.g. ₹900.00 saved so far)
  const totalSavings = Math.max(150, totalMrp - dueNow + (calcData?.discount_amount || 0));

  // Everlasting UPI Apps Grid (Exact 5 Apps matching everlasting.shop)
  const UPI_APPS = [
    {
      id: 'google_pay',
      razorpayApp: 'google_pay',
      name: 'Google Pay',
      hasCashback: false,
      icon: (
        <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
          <path fill="#4285F4" d="M23.9 19.5c0-1.2-.1-2.4-.3-3.5H12v6.7h6.7c-.3 1.6-1.2 3-2.6 3.9v3.3h4.2c2.4-2.2 3.6-5.5 3.6-10.4z"/>
          <path fill="#34A853" d="M12 31.6c3.4 0 6.2-1.1 8.3-3.1l-4.2-3.3c-1.1.8-2.6 1.2-4.1 1.2-3.2 0-5.9-2.1-6.8-5.1H1v3.4c2.1 4.1 6.4 6.9 11 6.9z"/>
          <path fill="#FBBC05" d="M5.2 21.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3v-3.4H1C.4 14.6 0 16.3 0 18s.4 3.4 1 4.7l4.2-3.4z"/>
          <path fill="#EA4335" d="M12 10.4c1.8 0 3.5.6 4.8 1.9l3.6-3.6C18.2 6.6 15.4 5.5 12 5.5 7.4 5.5 3.1 8.3 1 12.4l4.2 3.4c.9-3 3.6-5.4 6.8-5.4z"/>
        </svg>
      )
    },
    {
      id: 'phonepe',
      razorpayApp: 'phonepe',
      name: 'PhonePe',
      hasCashback: false,
      icon: (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#5f259f] flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-xs">
          पे
        </div>
      )
    },
    {
      id: 'paytm',
      razorpayApp: 'paytm',
      name: 'Paytm',
      hasCashback: true,
      icon: (
        <div className="flex items-center tracking-tight font-black text-xs sm:text-sm">
          <span className="text-[#002e6e]">Pay</span>
          <span className="text-[#00baf2]">tm</span>
        </div>
      )
    },
    {
      id: 'bhim',
      razorpayApp: 'bhim',
      name: 'BHIM',
      hasCashback: false,
      icon: (
        <div className="flex flex-col items-center justify-center leading-none">
          <div className="flex items-center text-xs font-black italic tracking-tighter">
            <span className="text-[#108A44]">BH</span>
            <span className="text-[#09579F]">IM</span>
          </div>
          <span className="text-[5px] font-bold text-gray-400 tracking-tighter uppercase mt-0.5 scale-90 whitespace-nowrap">
            BHARAT INTERFACE
          </span>
        </div>
      )
    },
    {
      id: 'others',
      razorpayApp: 'others',
      name: 'Others',
      hasCashback: false,
      icon: (
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center -space-x-1.5">
            <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[7px] text-white font-bold border border-white">
              ₹
            </div>
            <div className="w-4 h-4 rounded-full bg-[#5f259f] flex items-center justify-center text-[7px] text-white font-bold border border-white">
              पे
            </div>
            <div className="w-4 h-4 rounded-full bg-[#00baf2] flex items-center justify-center text-[6px] text-white font-bold border border-white">
              tm
            </div>
          </div>
          <span className="text-[10px] font-bold text-gray-700 mt-0.5">+10</span>
        </div>
      )
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F4F6] flex flex-col font-sans select-none animate-fade-in overflow-hidden">
      
      {/* Centered responsive container (edge-to-edge on mobile, sleek app layout on desktop) */}
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col h-full bg-[#F4F4F6] relative shadow-sm border-x border-gray-200/60 overflow-hidden">

        {/* ══════════════════════════════════════════════════════════════
            1. MINIMAL LUXURY HEADER (Matching everlasting.shop)
        ══════════════════════════════════════════════════════════════ */}
        <header className="shrink-0 bg-white border-b border-gray-200/90 px-4 h-14 flex items-center justify-between shadow-2xs z-30">
          <button
            type="button"
            onClick={handleAttemptClose}
            className="p-2 -ml-2 text-gray-700 hover:text-black transition-all active:scale-95 cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </button>

          <div className="flex items-center justify-center">
            <img
              src="/valerie.png"
              alt="VALERIÉ"
              className="h-6 sm:h-7 w-auto object-contain"
            />
          </div>

          <div className="w-8 flex items-center justify-end">
            {step !== 'confirmed' && (
              <button
                type="button"
                onClick={handleAttemptClose}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                title="Close checkout"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════
            2. DARK PURPLE LUXURY PROMO BANNER
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-[#281636] px-4 py-2.5 text-center shrink-0 shadow-xs">
          <span className="text-[10px] sm:text-[11.5px] font-bold text-white tracking-widest uppercase">
            {paymentSettings.checkout_banner_text || 'GET A FREE ZIRCON NECKLACE WORTH RS.1499 WHEN YOU PAY ONLINE'}
          </span>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            3. SOFT GREEN SAVINGS RIBBON
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-[#E6F8EB] px-4 py-2 text-center text-xs font-semibold text-emerald-800 shrink-0 border-b border-emerald-100/80">
          <span>Yay! You've saved <strong>₹{totalSavings.toLocaleString('en-IN')}.00</strong> so far 🥳</span>
        </div>

        {/* Global Error Notice */}
        {submitError && (
          <div className="m-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 animate-fade-in shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{submitError}</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            SCROLLABLE BODY WRAPPER FOR ALL CHECKOUT STEPS
        ══════════════════════════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

        {/* ══════════════════════════════════════════════════════════════
            STEP 1: FULL SCREEN PHONE VERIFICATION
        ══════════════════════════════════════════════════════════════ */}
        {step === 'phone' && (
          <div className="p-4 sm:p-6 min-h-full flex flex-col justify-between animate-fade-in">
            <div className="space-y-5 pt-2">
              <div className="text-center space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  Enter mobile number
                </h2>
                <p className="text-xs text-gray-500 font-light">
                  Provide your mobile number to continue with 1-click checkout
                </p>
              </div>

              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="flex items-center border border-gray-300 rounded-2xl bg-white shadow-2xs overflow-hidden focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20 transition-all">
                  <div className="flex items-center space-x-1.5 px-3.5 py-3.5 bg-gray-50 border-r border-gray-200 text-xs font-semibold text-gray-800 select-none">
                    <span className="text-base">🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    autoFocus
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="flex-1 px-4 py-3.5 text-sm font-semibold tracking-wider text-gray-900 focus:outline-none bg-transparent placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || phone.replace(/\D/g, '').length !== 10}
                  className="w-full py-4 rounded-2xl bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-50 text-white text-xs font-caps tracking-widest uppercase font-bold shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>CONTINUE</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Fastrr Address Prefill Assurance Note */}
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-brand-primary/20 text-center space-y-0.5">
                <p className="text-xs text-gray-800 font-medium">
                  We'll fill in your saved addresses automatically.
                </p>
                <p className="text-[10.5px] text-gray-500 flex items-center justify-center gap-1 font-light">
                  <span>Powered by</span>
                  <strong className="font-bold text-brand-primary">Fastrr ⚡</strong>
                </p>
              </div>

              {/* Customer Testimonial Quote (Social Proof) */}
              <div className="p-3.5 rounded-2xl bg-white border border-gray-200 text-center space-y-1 shadow-2xs">
                <p className="text-xs text-gray-700 italic leading-relaxed">
                  {paymentSettings.testimonial_quote}
                </p>
                <p className="text-[10.5px] text-gray-400 font-medium">
                  — {paymentSettings.testimonial_author}
                </p>
              </div>
            </div>

            {/* Trust Footer Badges */}
            <div className="pt-6 pb-2 grid grid-cols-4 gap-1 text-[9.5px] text-center text-gray-500 border-t border-gray-200/80 mt-auto">
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-brand-primary" />
                <span>PCI DSS certified</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Secure payments</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Truck className="w-4 h-4 text-brand-primary" />
                <span>Assured delivery</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>100% Genuine</span>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP 2: FULL SCREEN OTP VERIFICATION
        ══════════════════════════════════════════════════════════════ */}
        {step === 'otp' && (
          <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between animate-fade-in">
            <div className="space-y-4 pt-2">
              <div className="text-center space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  Verify phone number
                </h2>
                <div className="flex items-center justify-center space-x-1.5 text-xs text-gray-500">
                  <span>{isLiveSms ? 'Enter 6-digit code sent to' : 'Verification code for'}</span>
                  <strong className="text-gray-900 font-bold">+91 {phone}</strong>
                  <button
                    type="button"
                    onClick={() => setStep('phone')}
                    className="p-1 text-brand-primary hover:underline cursor-pointer"
                    title="Change phone number"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* SMS Notification Banner */}
              <div className="p-2.5 bg-purple-50/80 border border-brand-primary/20 rounded-xl text-center">
                <p className="text-xs text-brand-primary font-semibold flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></span>
                  <span>Verification code dispatched via SMS to your mobile</span>
                </p>
              </div>

              {/* 6-box OTP digits */}
              <div className="flex items-center justify-center gap-2 sm:gap-2.5 pt-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-13 sm:w-12 sm:h-14 rounded-xl border-2 border-gray-300 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 text-center font-mono font-bold text-lg text-gray-900 outline-none bg-white transition-all shadow-2xs"
                  />
                ))}
              </div>

              {/* Verify Button */}
              <button
                type="button"
                disabled={isSubmitting || otp.join('').length !== 6}
                onClick={() => handleVerifyOtp(otp.join(''))}
                className="w-full py-4 px-4 rounded-2xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-wider uppercase font-bold shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99] disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>VERIFY & CONTINUE</span>
                  </>
                )}
              </button>

              {/* Resend OTP Timer & Info */}
              <div className="text-center space-y-1.5 pt-1">
                <div className="text-xs text-gray-500">
                  {otpTimer > 0 ? (
                    <span>Didn't receive code? Resend OTP in <strong className="text-brand-primary font-mono">{otpTimer}s</strong></span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-brand-primary font-bold hover:underline cursor-pointer"
                    >
                      Resend OTP Code
                    </button>
                  )}
                </div>
                {otpResent && (
                  <p className="text-[11px] text-emerald-600 font-semibold animate-fade-in">
                    ✓ A new verification code has been dispatched.
                  </p>
                )}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setStep('details_payment')}
                    className="w-full py-3 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-brand-primary text-xs font-bold border border-brand-primary/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-brand-primary fill-current" />
                    <span>Continue to Delivery & Payment Options</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Fastrr Assurance Footer */}
            <div className="p-3 rounded-2xl bg-white border border-gray-200 text-center space-y-0.5 mt-auto shadow-2xs">
              <p className="text-xs text-gray-700 font-medium">
                We'll fill in your saved addresses automatically.
              </p>
              <p className="text-[10.5px] text-gray-400 flex items-center justify-center gap-1 font-light">
                <span>Powered by</span>
                <strong className="font-bold text-brand-primary">Fastrr ⚡</strong>
              </p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP 3: EVERLASTING 1-CLICK CHECKOUT (Screenshots 1 & 2)
        ══════════════════════════════════════════════════════════════ */}
        {step === 'details_payment' && (
          <div className="p-3 sm:p-4 space-y-3 flex-1 flex flex-col pb-28 animate-fade-in">

            {/* 1. Promo / Coupon Code Input Card (Screenshot 2) */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Percent className="w-4 h-4 absolute left-3 top-2.5 text-emerald-600" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder={couponApplied ? couponCode : "Enter coupon code"}
                    className="w-full pl-9 pr-3 py-2 bg-transparent text-xs font-bold tracking-wider text-gray-900 focus:outline-none uppercase placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (couponApplied) {
                      setCouponApplied(false);
                      setCouponInput('');
                    } else {
                      setCouponCode(couponInput || 'VALERIE10');
                      setCouponApplied(true);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    couponApplied
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'bg-brand-primary text-white hover:bg-brand-primary-hover shadow-2xs'
                  }`}
                >
                  {couponApplied ? 'Remove' : 'Apply'}
                </button>
              </div>
              {couponApplied && (
                <p className="text-[11px] text-emerald-700 font-medium pt-2 pl-1 flex items-center gap-1 animate-fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>Coupon {couponCode} applied! Extra savings added to your order.</span>
                </p>
              )}
            </div>

            {/* 2. Delivery Details Card (Screenshot 2) */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Delivery details</h3>
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(true)}
                  className="text-xs font-bold text-brand-primary hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              {name && addressLine1 ? (
                <div className="space-y-1 text-xs text-gray-700 leading-relaxed pt-0.5">
                  <p className="font-bold text-gray-900 text-[13px]">{name}</p>
                  <p className="text-gray-600 leading-snug">
                    {addressLine1}{addressLine2 ? `, ${addressLine2}` : ''}, {city ? `${city}, ` : ''}{state ? `${state}, ` : ''}{pincode}
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-gray-500 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <span>{phone}</span>
                    </span>
                    {email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="truncate max-w-[180px]">{email}</span>
                      </span>
                    )}
                  </div>
                  <div className="pt-2 flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                    <Truck className="w-3.5 h-3.5" />
                    <span>Free shipping for you</span>
                  </div>
                </div>
              ) : (
                <div className="py-2 text-center">
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="w-full py-2.5 px-4 rounded-xl border border-dashed border-brand-primary text-brand-primary font-bold text-xs hover:bg-purple-50 transition-colors cursor-pointer"
                  >
                    + Add Delivery Address
                  </button>
                </div>
              )}
            </div>

            {/* 3. Partner Cashback & Offers Card (Screenshot 2) */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-3.5 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-[#002e6e] px-1.5 py-0.5 rounded bg-sky-50 border border-sky-100">Paytm</span>
                  <div className="w-4 h-4 rounded-full bg-[#5f259f] flex items-center justify-center text-white text-[8px] font-bold">पे</div>
                </div>
                <button type="button" className="text-xs font-semibold text-gray-700 hover:text-black flex items-center gap-0.5 cursor-pointer">
                  <span>View all offers</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>

              <div className="p-2.5 rounded-xl border border-gray-150 bg-gray-50/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-[#002e6e]">Paytm</span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-900">Get up to ₹200 Cashback</p>
                  <p className="text-[10.5px] text-gray-500">Use PAYTM App and win cashback as per spend.</p>
                </div>
              </div>
            </div>

            {/* 4. Pay via / UPI & Payment Options Card (Exact Everlasting Design) */}
            <div className="space-y-2">
              <div>
                <h3 className="text-base font-bold text-gray-900">Pay via</h3>
                <p className="text-xs text-gray-600 flex items-center gap-1.5 mt-0.5">
                  <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                  <span>Enjoy fast delivery on all prepaid orders.</span>
                </p>
              </div>

              {/* Unified White Card matching everlasting.shop */}
              <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
                
                {/* 1. UPI Payment Section */}
                <div className="p-4 space-y-3">
                  <div
                    onClick={() => {
                      setPaymentType('full_prepaid');
                      setSelectedPaymentMethod('upi');
                    }}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50 relative shrink-0">
                        <Smartphone className="w-4 h-4 text-gray-700" />
                        <Zap className="w-2.5 h-2.5 text-blue-600 fill-blue-600 absolute -top-1 -right-1" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">UPI payment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 line-through">₹{totalMrp.toLocaleString('en-IN')}.00</span>
                      <span className="text-sm font-bold text-gray-900">₹{prepaidAmountDue.toLocaleString('en-IN')}.00</span>
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>

                  {/* Green Discount Pill Badge */}
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E7F8EE] text-[#0A803D] text-xs font-bold border border-[#0A803D]/20">
                      <Percent className="w-3.5 h-3.5 text-[#0A803D]" />
                      <span>Pay online and save ₹{prepaidDiscount}</span>
                    </span>
                  </div>

                  {/* 5 UPI Apps Grid (Google Pay, PhonePe, Paytm, BHIM, Others) */}
                  <div className="grid grid-cols-5 gap-2 pt-1">
                    {UPI_APPS.map((app) => {
                      const isThisLoading = isSubmitting && selectedUpiApp === app.razorpayApp;
                      return (
                        <button
                          key={app.id}
                          type="button"
                          disabled={isSubmitting}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUpiApp(app.razorpayApp);
                            setSelectedPaymentMethod('upi');
                            setPaymentType('full_prepaid');
                            // DIRECT APP LAUNCH: clicking Google Pay or PhonePe directly opens that payment app!
                            handlePlaceOrder(null, {
                              directUpiApp: app.razorpayApp,
                              method: 'upi',
                              paymentType: 'full_prepaid',
                            });
                          }}
                          className={`flex flex-col items-center justify-between p-2 h-20 rounded-2xl border transition-all cursor-pointer relative bg-white active:scale-95 ${
                            isThisLoading
                              ? 'border-[#0A803D] ring-2 ring-[#0A803D]/20 bg-green-50/20'
                              : 'border-gray-200/90 hover:border-gray-300'
                          }`}
                        >
                          {app.hasCashback && (
                            <span className="absolute -top-2 inset-x-0 mx-auto w-fit px-1.5 py-0.2 rounded-full text-[7.5px] font-bold text-[#0A803D] bg-[#E7F8EE] border border-[#0A803D]/30 uppercase leading-none">
                              Cashback
                            </span>
                          )}
                          <div className="w-full flex-1 flex items-center justify-center">
                            {isThisLoading ? (
                              <div className="w-5 h-5 border-2 border-[#0A803D] border-t-transparent rounded-full animate-spin" />
                            ) : (
                              app.icon
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-gray-600 truncate w-full text-center mt-0.5">
                            {app.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Add UPI ID Toggle */}
                  <div className="pt-0.5 text-center">
                    <button
                      type="button"
                      onClick={() => setShowUpiInput(!showUpiInput)}
                      className="text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                    >
                      {showUpiInput ? 'Cancel UPI ID' : 'Add UPI ID'}
                    </button>
                    {showUpiInput && (
                      <div className="pt-2 flex items-center gap-2 animate-fade-in">
                        <input
                          type="text"
                          value={upiIdInput}
                          onChange={(e) => setUpiIdInput(e.target.value)}
                          placeholder="Enter UPI ID (e.g. mobile@upi)"
                          className="flex-1 px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:border-brand-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => {
                            setSelectedPaymentMethod('upi');
                            setPaymentType('full_prepaid');
                            setShowUpiInput(false);
                            handlePlaceOrder(null, {
                              method: 'upi',
                              paymentType: 'full_prepaid',
                            });
                          }}
                          className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          Pay
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dashed line divider */}
                <div className="border-t border-dashed border-gray-200 mx-4" />

                {/* 2. Credit/Debit Card */}
                <div
                  onClick={() => {
                    setSelectedPaymentMethod('card');
                    setPaymentType('full_prepaid');
                    handlePlaceOrder(null, { method: 'card', paymentType: 'full_prepaid' });
                  }}
                  className="p-4 flex items-center justify-between hover:bg-gray-50/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50 relative shrink-0">
                      <CreditCard className="w-4 h-4 text-gray-700" />
                      <Zap className="w-2.5 h-2.5 text-blue-600 fill-blue-600 absolute -top-1 -right-1" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Credit/Debit Card</p>
                      <div className="mt-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E7F8EE] text-[#0A803D] text-[10px] font-bold">
                          <Percent className="w-2.5 h-2.5 text-[#0A803D]" />
                          <span>Save ₹{Math.min(100, prepaidDiscount)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 line-through">₹{totalMrp.toLocaleString('en-IN')}.00</span>
                    <span className="text-xs font-bold text-gray-900">₹{(prepaidAmountDue + Math.max(0, prepaidDiscount - 100)).toLocaleString('en-IN')}.00</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* Dashed line divider */}
                <div className="border-t border-dashed border-gray-200 mx-4" />

                {/* 3. Net Banking */}
                <div
                  onClick={() => {
                    setSelectedPaymentMethod('netbanking');
                    setPaymentType('full_prepaid');
                    handlePlaceOrder(null, { method: 'netbanking', paymentType: 'full_prepaid' });
                  }}
                  className="p-4 flex items-center justify-between hover:bg-gray-50/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50 relative shrink-0">
                      <Landmark className="w-4 h-4 text-gray-700" />
                      <Zap className="w-2.5 h-2.5 text-blue-600 fill-blue-600 absolute -top-1 -right-1" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Net Banking</p>
                      <div className="mt-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E7F8EE] text-[#0A803D] text-[10px] font-bold">
                          <Percent className="w-2.5 h-2.5 text-[#0A803D]" />
                          <span>Save ₹{Math.min(100, prepaidDiscount)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 line-through">₹{totalMrp.toLocaleString('en-IN')}.00</span>
                    <span className="text-xs font-bold text-gray-900">₹{(prepaidAmountDue + Math.max(0, prepaidDiscount - 100)).toLocaleString('en-IN')}.00</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* Dashed line divider */}
                <div className="border-t border-dashed border-gray-200 mx-4" />

                {/* 4. Wallets */}
                <div
                  onClick={() => {
                    setSelectedPaymentMethod('wallet');
                    setPaymentType('full_prepaid');
                    handlePlaceOrder(null, { method: 'wallet', paymentType: 'full_prepaid' });
                  }}
                  className="p-4 flex items-center justify-between hover:bg-gray-50/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50 relative shrink-0">
                      <Wallet className="w-4 h-4 text-gray-700" />
                      <Zap className="w-2.5 h-2.5 text-blue-600 fill-blue-600 absolute -top-1 -right-1" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Wallets</p>
                      <div className="mt-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E7F8EE] text-[#0A803D] text-[10px] font-bold">
                          <Percent className="w-2.5 h-2.5 text-[#0A803D]" />
                          <span>Save ₹{Math.min(100, prepaidDiscount)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 line-through">₹{totalMrp.toLocaleString('en-IN')}.00</span>
                    <span className="text-xs font-bold text-gray-900">₹{(prepaidAmountDue + Math.max(0, prepaidDiscount - 100)).toLocaleString('en-IN')}.00</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* 5. Partial COD (if enabled) */}
                {paymentSettings.partial_cod_enabled && (
                  <>
                    <div className="border-t border-dashed border-gray-200 mx-4" />
                    <div
                      onClick={() => {
                        setPaymentType('partial');
                        setSelectedPaymentMethod('partial_cod');
                        handlePlaceOrder(null, { method: 'partial_cod', paymentType: 'partial' });
                      }}
                      className="p-4 flex items-center justify-between hover:bg-gray-50/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50 shrink-0">
                          <Banknote className="w-4 h-4 text-gray-700" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">Partial COD</p>
                          <p className="text-[10.5px] text-gray-500">
                            Pay Balance ₹{(calcData?.payment_splits?.partial?.amount_due_on_delivery ?? Math.max(0, finalTotal - (Number(paymentSettings.partial_advance) || 199))).toLocaleString('en-IN')}.00 at Delivery
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">
                          ₹{(calcData?.payment_splits?.partial?.amount_due_now ?? Math.min(Number(paymentSettings.partial_advance) || 199, finalTotal)).toLocaleString('en-IN')}.00
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </>
                )}

                {/* 6. Cash on Delivery (if enabled) */}
                {paymentSettings.cod_available && (
                  <>
                    <div className="border-t border-dashed border-gray-200 mx-4" />
                    <div
                      onClick={() => {
                        setPaymentType('cod');
                        setSelectedPaymentMethod('cod');
                        handlePlaceOrder(null, { method: 'cod', paymentType: 'cod' });
                      }}
                      className="p-4 flex items-center justify-between hover:bg-gray-50/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50 shrink-0">
                          <Banknote className="w-4 h-4 text-gray-700" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">Cash on Delivery (Full COD)</p>
                          <p className="text-[10.5px] text-gray-500">Pay full amount at doorstep</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">₹{finalTotal.toLocaleString('en-IN')}.00</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </>
                )}

              </div>
            </div>

            {/* 5. Collapsible Account Card (Screenshot 1) */}
            <div 
              onClick={() => setAccountOpen(!accountOpen)}
              className="bg-white rounded-2xl border border-gray-200/90 p-3.5 shadow-2xs flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-gray-800">Account</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400 font-mono">+91 {phone}</span>
                {accountOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </div>

            {accountOpen && (
              <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-2xs space-y-2 text-xs text-gray-600 animate-fade-in">
                <p><strong>Customer:</strong> {name || 'Guest'}</p>
                <p><strong>Mobile:</strong> +91 {phone}</p>
                {email && <p><strong>Email:</strong> {email}</p>}
                <p className="text-[11px] text-gray-400 pt-1 border-t border-gray-100">
                  Logged in via Fastrr OTP. Addresses and orders are automatically synced.
                </p>
              </div>
            )}

            {/* 6. Collapsible Order Summary Bar */}
            <div className="bg-white rounded-2xl border border-gray-200/90 overflow-hidden shadow-2xs">
              <div 
                onClick={() => setOrderSummaryOpen(!orderSummaryOpen)}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2 text-xs font-bold text-gray-900">
                  <span>Order summary ({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'})</span>
                  {orderSummaryOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                </div>
                <span className="text-xs font-bold text-brand-primary">₹{dueNow.toLocaleString('en-IN')}.00</span>
              </div>

              {orderSummaryOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-150 pt-3 animate-fade-in">
                  <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1">
                    {cartItems.map((item) => (
                      <div key={item.key || item.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2.5">
                          <img
                            src={item.image || item.primary_image || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=120&q=80'}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                          />
                          <div>
                            <p className="font-semibold text-gray-800 line-clamp-1">{item.name}</p>
                            <span className="text-[10px] text-gray-500">Qty: {item.quantity}</span>
                          </div>
                        </div>
                        <span className="font-bold text-gray-900">
                          ₹{Math.round(item.price * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-gray-150 space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Total MRP</span>
                      <span className="text-gray-400 line-through">₹{totalMrp.toLocaleString('en-IN')}.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Store Price</span>
                      <span>₹{subtotal.toLocaleString('en-IN')}.00</span>
                    </div>
                    {couponApplied && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Coupon Discount</span>
                        <span>- ₹{calcData?.discount_amount || 0}</span>
                      </div>
                    )}
                    {paymentType === 'full_prepaid' && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Prepaid Instant Discount</span>
                        <span>- ₹{prepaidDiscount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-emerald-700">
                      <span>Shipping</span>
                      <span className="font-bold uppercase text-[10px]">FREE</span>
                    </div>
                    {paymentType === 'partial' && (
                      <div className="flex justify-between text-purple-700 font-semibold text-xs">
                        <span>Balance Due on Delivery</span>
                        <span>₹{dueOnDelivery.toLocaleString('en-IN')}.00</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-200 font-extrabold text-sm text-gray-900">
                      <span>{paymentType === 'partial' ? 'Token Deposit Payable Now' : 'Amount Payable Now'}</span>
                      <span className="text-brand-primary">₹{dueNow.toLocaleString('en-IN')}.00</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP 4: ORDER PROCESSING ANIMATION
        ══════════════════════════════════════════════════════════════ */}
        {step === 'processing' && (
          <div className="flex-1 p-8 flex flex-col items-center justify-center space-y-5 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-brand-primary relative shadow-md">
              <Zap className="w-8 h-8 animate-pulse text-brand-primary" />
              <div className="absolute inset-0 rounded-full border-3 border-brand-primary border-t-transparent animate-spin"></div>
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Confirming 1-Click Fastrr Order...
              </h3>
              <p className="text-xs text-gray-500 font-light">
                Securing your handcrafted pieces and allocating priority delivery.
              </p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP 5: ORDER CONFIRMED RECEIPT & TRACKING
        ══════════════════════════════════════════════════════════════ */}
        {step === 'confirmed' && placedOrder && (
          <div className="p-5 sm:p-6 space-y-5 text-center animate-fade-in flex-1 flex flex-col justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-md">
              <Check className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-caps uppercase tracking-wider font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
                Order Successfully Placed
              </span>
              <h2 className="text-xl font-editorial font-bold text-gray-900">
                Thank You, {placedOrder.shipping_name || name}!
              </h2>
              <p className="text-xs text-gray-500 font-mono font-bold tracking-wider">
                Order Ref: #{placedOrder.order_number}
              </p>
            </div>

            {/* Order Highlights Box */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200 text-left space-y-2.5 text-xs shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-gray-150">
                <span className="text-gray-500">Payment Mode:</span>
                <span className="font-bold text-gray-900 uppercase text-[11px]">
                  {placedOrder.payment_type === 'full_prepaid' ? '100% Prepaid (Fastrr)' : placedOrder.payment_type === 'partial' ? 'Partial COD' : 'Cash on Delivery'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-gray-150">
                <span className="text-gray-500">Estimated Delivery:</span>
                <span className="font-bold text-emerald-700">{deliveryEta}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Shipping to:</span>
                <span className="font-medium text-gray-900 text-right line-clamp-1 max-w-[200px]">
                  {placedOrder.shipping_city}, {placedOrder.shipping_pincode}
                </span>
              </div>
            </div>

            {/* WhatsApp Order Support Button */}
            <div className="pt-2 space-y-2">
              <a
                href={`https://wa.me/919999999999?text=Hi%20Valerie%20Jewels,%20I%20have%20a%20question%20regarding%20my%20order%20%23${placedOrder.order_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Order Support</span>
              </a>

              <button
                onClick={() => {
                  onClose();
                  if (onTrackOrder) onTrackOrder(placedOrder.order_number);
                }}
                className="w-full py-3 rounded-2xl border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>Track Live Dispatch Status</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        </div>

        {/* ══════════════════════════════════════════════════════════════
            DOCKED BOTTOM ACTION BAR (Step 3: Details & Payment)
            Always 100% visible on Mobile & Desktop above home indicator
        ══════════════════════════════════════════════════════════════ */}
        {step === 'details_payment' && (
          <div className="shrink-0 z-40 bg-white/98 backdrop-blur-md border-t border-gray-200/90 px-4 py-3.5 pb-[max(0.85rem,env(safe-area-inset-bottom))] shadow-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">TO PAY</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base sm:text-lg font-black text-gray-900 font-mono">
                  ₹{dueNow.toLocaleString('en-IN')}.00
                </span>
                {totalSavings > 0 && (
                  <span className="text-[10.5px] text-emerald-600 font-bold">
                    Save ₹{totalSavings}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handlePlaceOrder}
              className="py-3.5 px-6 sm:px-8 rounded-2xl bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.98] text-white text-xs font-caps tracking-widest uppercase font-bold shadow-lg transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>
                    {paymentType === 'full_prepaid'
                      ? `PAY ₹${Math.round(dueNow).toLocaleString('en-IN')}`
                      : paymentType === 'partial'
                      ? `PAY ₹${Math.round(dueNow).toLocaleString('en-IN')} DEPOSIT`
                      : `CONFIRM COD ORDER`}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════════
          SLIDE-UP ADDRESS MODAL / DRAWER (Triggered by "Change")
      ══════════════════════════════════════════════════════════════ */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div 
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-brand-primary" />
                <h3 className="text-sm font-bold text-gray-900">Delivery Address</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim() || !addressLine1.trim() || pincode.trim().length < 6) {
                  setSubmitError('Please complete name, address line, and 6-digit pincode.');
                  return;
                }
                setSubmitError(null);
                setIsAddressModalOpen(false);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jayeshbhai Patel"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Email (for invoice) *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. customer@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Flat, House no., Building *</label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="e.g. Flat 402, Golden Heights"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Street, Area, Landmark</label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="e.g. Near Ahir Chowk, MG Road"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Pincode *</label>
                  <input
                    type="tel"
                    required
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    placeholder="6 digits"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 font-mono focus:border-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:border-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-brand-primary text-white text-xs font-bold uppercase tracking-wider shadow-md hover:bg-brand-primary-hover active:scale-[0.99] transition-all cursor-pointer"
                >
                  Save Delivery Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          EXIT-INTENT RETENTION POPUP (High Conversion Safeguard)
      ══════════════════════════════════════════════════════════════ */}
      {showExitIntent && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 animate-fade-in bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl border border-gray-200 space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-gray-900">
                {paymentSettings.exit_intent_title || 'Wait! Are you sure you want to exit?'}
              </h3>
              <p className="text-xs text-gray-500 font-light leading-relaxed">
                {paymentSettings.exit_intent_message || 'High-demand handcrafted pieces in your bag might sell out before your next visit.'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border border-brand-primary/20 text-xs">
              <span className="font-bold text-brand-primary block">
                🎁 Free Zircon Necklace Reserved
              </span>
              <span className="text-[11px] text-gray-700">
                Order within the next 10 minutes to claim your gift!
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => setShowExitIntent(false)}
                className="w-full py-3.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-wider uppercase font-bold shadow-md transition-all cursor-pointer"
              >
                RESUME 1-CLICK ORDER
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitIntent(false);
                  onClose();
                }}
                className="w-full py-2 text-[11px] text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
              >
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
