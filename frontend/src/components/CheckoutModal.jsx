import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Truck,
  CreditCard,
  Smartphone,
  Banknote,
  Percent,
  Check,
  ChevronRight,
  AlertCircle,
  Clock,
  PackageCheck
} from 'lucide-react';
import { apiService } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

// Pincode directory lookup helper
const PINCODE_MAP = {
  '110': { city: 'New Delhi', state: 'Delhi' },
  '400': { city: 'Mumbai', state: 'Maharashtra' },
  '411': { city: 'Pune', state: 'Maharashtra' },
  '560': { city: 'Bengaluru', state: 'Karnataka' },
  '600': { city: 'Chennai', state: 'Tamil Nadu' },
  '500': { city: 'Hyderabad', state: 'Telangana' },
  '700': { city: 'Kolkata', state: 'West Bengal' },
  '380': { city: 'Ahmedabad', state: 'Gujarat' },
  '302': { city: 'Jaipur', state: 'Rajasthan' },
  '122': { city: 'Gurugram', state: 'Haryana' },
  '201': { city: 'Noida', state: 'Uttar Pradesh' },
  '682': { city: 'Kochi', state: 'Kerala' },
  '160': { city: 'Chandigarh', state: 'Punjab' },
  '452': { city: 'Indore', state: 'Madhya Pradesh' },
  '800': { city: 'Patna', state: 'Bihar' },
  '781': { city: 'Guwahati', state: 'Assam' },
};

export default function CheckoutModal({ isOpen, onClose, onTrackOrder }) {
  const { cartItems, clearCart } = useCart();

  const { user, token } = useAuth();

  // Multi-step checkout states: 'address' | 'payment' | 'fastrr_processing' | 'confirmed'
  const [step, setStep] = useState('address');

  // Address form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  // Payment configuration
  const [paymentType, setPaymentType] = useState('full_prepaid'); // full_prepaid | partial | cod
  const [couponCode, setCouponCode] = useState('VALERIE10');
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);

  // Calculation state from MySQL server
  const [calcData, setCalcData] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState(null);

  // Order placement state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Fastrr simulated payment method
  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay');

  // Load saved address or autofill from authenticated user
  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.email) setEmail(user.email);
      if (user.phone) setPhone(user.phone);
    } else {
      try {
        const saved = localStorage.getItem('valerie_saved_checkout_address');
        if (saved) {
          const parsed = JSON.parse(saved);
          setName(parsed.name || '');
          setEmail(parsed.email || '');
          setPhone(parsed.phone || '');
          setAddressLine1(parsed.addressLine1 || '');
          setAddressLine2(parsed.addressLine2 || '');
          setCity(parsed.city || '');
          setState(parsed.state || '');
          setPincode(parsed.pincode || '');
        }
      } catch (e) {
        console.warn('Could not read saved address:', e);
      }
    }
  }, [user, isOpen]);

  // Recalculate totals from MySQL whenever items, modal open, or coupon changes
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
          setCalcError(err.message || 'Unable to calculate checkout totals.');
        }
      } finally {
        if (isMounted) {
          setIsCalculating(false);
        }
      }
    }

    fetchCalculations();
    return () => {
      isMounted = false;
    };
  }, [isOpen, cartItems, couponApplied, couponCode]);

  // PIN code auto-lookup
  const handlePincodeChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(val);

    if (val.length >= 3) {
      const prefix = val.slice(0, 3);
      if (PINCODE_MAP[prefix]) {
        setCity(PINCODE_MAP[prefix].city);
        setState(PINCODE_MAP[prefix].state);
      }
    }
  };

  // Apply or remove coupon
  const handleApplyCoupon = (codeToApply) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    if (!code) return;
    setCouponCode(code);
    setCouponApplied(true);
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(false);
    setCouponCode('');
    setCouponInput('');
  };

  // Validate address form
  const handleProceedToPayment = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !addressLine1.trim() || !city.trim() || !state.trim() || pincode.length !== 6) {
      setSubmitError('Please complete all shipping address fields with a valid 6-digit PIN code.');
      return;
    }
    setSubmitError(null);

    // Save address locally for guest convenience
    try {
      localStorage.setItem('valerie_saved_checkout_address', JSON.stringify({
        name, email, phone, addressLine1, addressLine2, city, state, pincode
      }));
    } catch (e) {
      // ignore storage error
    }

    setStep('payment');
  };

  // Initiate order and trigger Fastrr checkout
  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formattedItems = cartItems.map((item) => ({
        id: item.productId || item.bundleId || item.id,
        variantId: item.variantId || null,
        bundleId: item.bundleId || null,
        isBundle: item.isBundle || false,
        quantity: item.quantity,
      }));

      const payload = {
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim(),
        shipping_address_line1: addressLine1.trim(),
        shipping_address_line2: addressLine2.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        payment_type: paymentType,
        coupon_code: couponApplied ? couponCode : '',
        items: formattedItems,
      };

      // 1. Create order in MySQL via initiate.php
      const initResult = await apiService.initiateCheckout(payload, token);

      // 2. Open Fastrr payment simulation sheet
      setPlacedOrder(initResult);
      setStep('fastrr_processing');

    } catch (err) {
      setSubmitError(err.message || 'Failed to initialize order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Finalize Fastrr Sandbox Payment
  const handleCompleteFastrrPayment = async () => {
    if (!placedOrder) return;
    setIsSubmitting(true);

    try {
      // In sandbox mode, call verifyPayment with simulate_success to confirm order atomically
      const verified = await apiService.verifyPayment(placedOrder.order_number, true);
      setPlacedOrder(verified.order);
      
      // Empty the cart
      clearCart();
      
      // Transition to Confirmed screen
      setStep('confirmed');
    } catch (err) {
      setSubmitError(err.message || 'Payment confirmation failed. Please contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (step !== 'fastrr_processing') onClose();
        }}
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
        <div
          className="relative w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all border border-brand-border"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Sleek Fastrr Header */}
          <div className="px-6 py-4 border-b border-brand-border bg-gradient-to-r from-brand-surface via-white to-brand-surface flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
                <Zap className="w-4 h-4 text-brand-primary" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-caps tracking-widest uppercase font-bold text-brand-primary">
                    Fastrr 1-Click Checkout
                  </span>
                  <span className="text-[10px] bg-brand-primary-light text-brand-primary px-1.5 py-0.5 rounded font-bold uppercase">
                    Sandbox
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-[11px] text-brand-muted font-light">
                  <Lock className="w-2.5 h-2.5 text-emerald-600" />
                  <span>256-Bit SSL Secured • End-to-End Encrypted</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={step === 'fastrr_processing'}
              className="p-2 rounded-xl text-brand-muted hover:text-brand-tertiary hover:bg-brand-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. Step Progress Bar */}
          {step !== 'confirmed' && (
            <div className="bg-[#FAF7FC] px-6 py-2.5 border-b border-brand-border flex items-center justify-between text-xs">
              <button
                onClick={() => setStep('address')}
                className={`flex items-center space-x-1.5 font-caps uppercase tracking-wider font-semibold transition-colors ${
                  step === 'address' ? 'text-brand-primary font-bold' : 'text-brand-muted hover:text-brand-tertiary'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === 'address' ? 'bg-brand-primary text-white' : 'bg-brand-border text-brand-muted'
                }`}>1</span>
                <span>Shipping Address</span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-brand-border" />

              <button
                onClick={() => {
                  if (name && addressLine1 && pincode) setStep('payment');
                }}
                disabled={!name || !addressLine1 || !pincode}
                className={`flex items-center space-x-1.5 font-caps uppercase tracking-wider font-semibold transition-colors ${
                  step === 'payment' ? 'text-brand-primary font-bold' : 'text-brand-muted hover:text-brand-tertiary disabled:opacity-50'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === 'payment' ? 'bg-brand-primary text-white' : 'bg-brand-border text-brand-muted'
                }`}>2</span>
                <span>Payment Splits</span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-brand-border" />

              <div className={`flex items-center space-x-1.5 font-caps uppercase tracking-wider font-semibold ${
                step === 'fastrr_processing' ? 'text-brand-primary font-bold' : 'text-brand-muted'
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === 'fastrr_processing' ? 'bg-brand-primary text-white' : 'bg-brand-border text-brand-muted'
                }`}>3</span>
                <span>Pay & Confirm</span>
              </div>
            </div>
          )}

          {/* 3. Modal Body based on Step */}
          <div className="p-6">
            {calcError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{calcError}</span>
              </div>
            )}

            {submitError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* STEP 1: SHIPPING ADDRESS */}
            {step === 'address' && (
              <form onSubmit={handleProceedToPayment} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-editorial text-lg font-bold text-brand-tertiary">
                    Delivery & Contact Details
                  </h3>
                  <span className="text-[11px] text-brand-muted bg-brand-surface px-2.5 py-1 rounded-full font-light">
                    {user ? `Logged in as ${user.name}` : '✨ Instant Guest Checkout'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Pooja Sharma"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 text-xs text-brand-tertiary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1">
                      Mobile Number (for Courier updates) *
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-brand-border bg-[#F5F2F9] text-xs font-semibold text-brand-muted">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="9876543210"
                        className="w-full px-3.5 py-2.5 rounded-r-xl border border-brand-border bg-brand-surface/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 text-xs text-brand-tertiary"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1">
                    Email Address (for Order Receipt & Tracking) *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pooja@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 text-xs text-brand-tertiary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1">
                    Street Address / Flat / Society *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Flat 402, Lotus Heights, Linking Road"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 text-xs text-brand-tertiary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={pincode}
                      onChange={handlePincodeChange}
                      placeholder="400050"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 text-xs text-brand-tertiary font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Mumbai"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 text-xs text-brand-tertiary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Maharashtra"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 text-xs text-brand-tertiary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-muted font-bold mb-1">
                    Landmark / Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Near Starbucks, Bandra West"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 text-xs text-brand-tertiary"
                  />
                </div>

                <div className="pt-3 border-t border-brand-border flex items-center justify-between">
                  <div className="text-xs text-brand-muted flex items-center space-x-1.5">
                    <Truck className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Free Delivery Across All India (5–7 Working Days)</span>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold shadow-md hover:shadow-luxury-hover transition-all flex items-center space-x-2"
                  >
                    <span>Continue to Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: PAYMENT SPLIT SELECTION */}
            {step === 'payment' && (
              <div className="space-y-5">
                {/* Coupon Box */}
                <div className="p-3.5 rounded-2xl bg-brand-surface/70 border border-brand-border flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <Percent className="w-4 h-4 text-brand-primary" />
                    <div>
                      <span className="text-xs font-bold text-brand-tertiary block">
                        Valerie Promo Code
                      </span>
                      <span className="text-[11px] text-brand-muted">
                        Use <strong className="text-brand-primary font-mono cursor-pointer hover:underline" onClick={() => handleApplyCoupon('VALERIE10')}>VALERIE10</strong> for 10% instant off
                      </span>
                    </div>
                  </div>

                  {couponApplied ? (
                    <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{couponCode} Applied</span>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-red-500 hover:text-red-700 ml-1 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex w-full sm:w-auto space-x-1.5">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="ENTER COUPON"
                        className="px-3 py-1.5 rounded-xl border border-brand-border text-xs uppercase font-mono w-32 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon(couponInput)}
                        className="px-3 py-1.5 rounded-xl bg-brand-tertiary text-white text-xs font-caps tracking-wider uppercase font-bold hover:bg-black transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                {/* 3 Payment Split Options */}
                <div>
                  <h4 className="text-xs font-caps uppercase tracking-wider font-bold text-brand-tertiary mb-3">
                    Choose Payment Option (Powered by Fastrr)
                  </h4>

                  <div className="space-y-3">
                    {/* Option 1: Full Prepaid */}
                    <div
                      onClick={() => setPaymentType('full_prepaid')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        paymentType === 'full_prepaid'
                          ? 'border-brand-primary bg-brand-primary-light/40 shadow-sm'
                          : 'border-brand-border hover:border-brand-primary/40 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center ${
                            paymentType === 'full_prepaid' ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-muted'
                          }`}>
                            {paymentType === 'full_prepaid' && <Check className="w-3 h-3" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-brand-tertiary">
                                1-Click Fastrr Prepaid (UPI / Cards / NetBanking)
                              </span>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md flex items-center space-x-1">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>FREE Zircon Necklace + ₹50 Extra Off</span>
                              </span>
                            </div>
                            <p className="text-xs text-brand-muted font-light mt-0.5">
                              Instant checkout via UPI/Cards. Complimentary Free Zircon Necklace gift included with ₹50 instant discount.
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-bold text-brand-primary block">
                            ₹{calcData?.payment_splits?.full_prepaid?.amount_due_now !== undefined
                              ? Math.round(calcData.payment_splits.full_prepaid.amount_due_now).toLocaleString('en-IN')
                              : '...'}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-semibold block">
                            ₹0 on Delivery
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Option 2: Partial COD (Smart Split) */}
                    <div
                      onClick={() => setPaymentType('partial')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        paymentType === 'partial'
                          ? 'border-brand-primary bg-brand-primary-light/40 shadow-sm'
                          : 'border-brand-border hover:border-brand-primary/40 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center ${
                            paymentType === 'partial' ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-muted'
                          }`}>
                            {paymentType === 'partial' && <Check className="w-3 h-3" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-brand-tertiary">
                                Partial COD (Smart Split Deposit)
                              </span>
                              <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-md">
                                Recommended
                              </span>
                            </div>
                            <p className="text-xs text-brand-muted font-light mt-0.5">
                              Pay ₹199 advance token now via UPI. Pay remaining balance securely to courier delivery agent.
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-bold text-brand-tertiary block">
                            Pay ₹199 Now
                          </span>
                          <span className="text-[10px] text-brand-muted font-light block">
                            ₹{calcData?.payment_splits?.partial?.amount_due_on_delivery !== undefined
                              ? Math.round(calcData.payment_splits.partial.amount_due_on_delivery).toLocaleString('en-IN')
                              : '...'} on Delivery
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Option 3: Full Cash on Delivery */}
                    <div
                      onClick={() => setPaymentType('cod')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        paymentType === 'cod'
                          ? 'border-brand-primary bg-brand-primary-light/40 shadow-sm'
                          : 'border-brand-border hover:border-brand-primary/40 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center ${
                            paymentType === 'cod' ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-muted'
                          }`}>
                            {paymentType === 'cod' && <Check className="w-3 h-3" />}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-brand-tertiary block">
                              Cash on Delivery (Full COD)
                            </span>
                            <p className="text-xs text-brand-muted font-light mt-0.5">
                              Pay 100% total amount upon package delivery directly to the courier agent.
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-bold text-brand-tertiary block">
                            ₹0 Now
                          </span>
                          <span className="text-[10px] text-brand-muted font-light block">
                            ₹{calcData?.payment_splits?.cod?.amount_due_on_delivery !== undefined
                              ? Math.round(calcData.payment_splits.cod.amount_due_on_delivery).toLocaleString('en-IN')
                              : '...'} on Delivery
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown Summary */}
                {calcData && (
                  <div className="p-4 rounded-2xl bg-[#FAF7FC] border border-brand-border space-y-2 text-xs">
                    <div className="flex justify-between text-brand-muted">
                      <span>Subtotal ({calcData.item_count} items)</span>
                      <span>₹{Math.round(calcData.subtotal).toLocaleString('en-IN')}</span>
                    </div>

                    {calcData.discount_amount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span>Coupon Savings</span>
                        <span>-₹{Math.round(calcData.discount_amount).toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {paymentType === 'full_prepaid' && (
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span>Prepaid Instant Discount</span>
                        <span>-₹50</span>
                      </div>
                    )}

                    <div className="flex justify-between text-brand-muted">
                      <span>Express Courier Shipping</span>
                      <span>{calcData.is_free_shipping ? <strong className="text-emerald-600">FREE</strong> : `₹${calcData.shipping_fee}`}</span>
                    </div>

                    <div className="pt-2 border-t border-brand-border flex items-baseline justify-between text-sm font-bold text-brand-tertiary">
                      <span>Total Payable</span>
                      <span className="text-base text-brand-primary">
                        ₹{paymentType === 'full_prepaid'
                          ? Math.round(calcData.payment_splits.full_prepaid.amount_due_now).toLocaleString('en-IN')
                          : Math.round(calcData.final_total).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('address')}
                    className="text-xs text-brand-muted hover:text-brand-tertiary underline"
                  >
                    ← Back to Shipping Address
                  </button>

                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting || isCalculating}
                    className="px-6 py-3.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold shadow-md hover:shadow-luxury-hover transition-all flex items-center space-x-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Initializing Fastrr...</span>
                    ) : (
                      <>
                        <span>Proceed to Fastrr Checkout</span>
                        <Zap className="w-4 h-4 fill-current" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: FASTRR CHECKOUT SHEET SIMULATION */}
            {step === 'fastrr_processing' && placedOrder && (
              <div className="space-y-6 py-2">
                <div className="p-4 rounded-2xl bg-brand-surface border border-brand-border flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-caps uppercase tracking-wider text-brand-muted block">
                      Order Reference
                    </span>
                    <span className="text-sm font-bold font-mono text-brand-tertiary">
                      {placedOrder.order_number}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-caps uppercase tracking-wider text-brand-muted block">
                      Amount Payable Now
                    </span>
                    <span className="text-base font-bold text-brand-primary">
                      ₹{Math.round(placedOrder.amount_payable_now).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Fastrr Payment Options Selector */}
                <div className="space-y-3">
                  <span className="text-xs font-caps uppercase tracking-wider font-bold text-brand-tertiary block">
                    Select Fastrr Payment Method
                  </span>

                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedUpiApp('gpay')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        selectedUpiApp === 'gpay'
                          ? 'border-brand-primary bg-brand-primary-light/40 font-bold'
                          : 'border-brand-border hover:bg-brand-surface'
                      }`}
                    >
                      <Smartphone className="w-5 h-5 mx-auto mb-1 text-brand-primary" />
                      <span className="text-xs block text-brand-tertiary">Google Pay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedUpiApp('phonepe')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        selectedUpiApp === 'phonepe'
                          ? 'border-brand-primary bg-brand-primary-light/40 font-bold'
                          : 'border-brand-border hover:bg-brand-surface'
                      }`}
                    >
                      <Zap className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                      <span className="text-xs block text-brand-tertiary">PhonePe</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedUpiApp('card')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        selectedUpiApp === 'card'
                          ? 'border-brand-primary bg-brand-primary-light/40 font-bold'
                          : 'border-brand-border hover:bg-brand-surface'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 mx-auto mb-1 text-brand-tertiary" />
                      <span className="text-xs block text-brand-tertiary">Cards / NetBank</span>
                    </button>
                  </div>
                </div>

                {/* Fastrr 1-Click Pay Confirmation */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-center space-y-2">
                  <div className="flex items-center justify-center space-x-1.5 text-xs text-emerald-800 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Fastrr Sandbox Gateway Ready</span>
                  </div>
                  <p className="text-[11px] text-brand-muted font-light max-w-sm mx-auto">
                    Simulating secure RBI-compliant tokenized payment of ₹
                    {Math.round(placedOrder.amount_payable_now).toLocaleString('en-IN')}.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCompleteFastrrPayment}
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-caps tracking-widest uppercase font-bold shadow-lg transition-all flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                      <span>Verifying Fastrr Signature & Payment...</span>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Authorize & Complete 1-Click Payment</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: ORDER CONFIRMED RECEIPT */}
            {step === 'confirmed' && placedOrder && (
              <div className="text-center py-4 space-y-5">
                {/* Success Icon */}
                <div className="w-16 h-16 rounded-full bg-emerald-100 border-4 border-emerald-50 text-emerald-600 flex items-center justify-center mx-auto animate-bounce-short">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div>
                  <span className="text-[11px] font-caps uppercase tracking-widest text-emerald-700 font-bold block mb-1">
                    Order Placed Successfully!
                  </span>
                  <h3 className="font-editorial text-2xl font-bold text-brand-tertiary">
                    Thank You, {placedOrder.customer_name || name}!
                  </h3>
                  <p className="text-xs text-brand-muted font-light mt-1">
                    Your luxury jewelry order has been confirmed and routed to our fulfillment atelier.
                  </p>
                </div>

                {/* Receipt Card */}
                <div className="p-4 rounded-2xl bg-brand-surface/80 border border-brand-border text-left space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-brand-border">
                    <span className="text-brand-muted font-light">Order Number</span>
                    <span className="font-mono font-bold text-brand-primary text-sm">
                      {placedOrder.order_number}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-brand-muted font-light">Payment Method</span>
                    <span className="font-semibold text-brand-tertiary uppercase">
                      {placedOrder.payment_type === 'full_prepaid' ? 'Prepaid (Paid in Full)' : placedOrder.payment_type === 'partial' ? 'Partial COD (Deposit Paid)' : 'Cash on Delivery'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-brand-muted font-light">Amount Paid Upfront</span>
                    <span className="font-semibold text-emerald-600">
                      ₹{Math.round(placedOrder.amount_paid_upfront || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {placedOrder.amount_due_on_delivery > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-brand-muted font-light">Balance Due on Delivery</span>
                      <span className="font-bold text-brand-tertiary">
                        ₹{Math.round(placedOrder.amount_due_on_delivery).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-brand-muted font-light">Fastrr Transaction ID</span>
                    <span className="font-mono text-brand-muted text-[11px]">
                      {placedOrder.fastrr_order_id || 'FST-SBX-SUCCESS'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-brand-border">
                    <span className="text-brand-muted font-light block mb-0.5">Shipping Destination</span>
                    <span className="text-brand-tertiary font-medium block">
                      {placedOrder.shipping_address_line1}, {placedOrder.city}, {placedOrder.state} - {placedOrder.pincode}
                    </span>
                  </div>
                </div>

                {/* Courier Dispatch Announcement */}
                <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/60 text-xs text-purple-900 flex items-center space-x-2.5 text-left">
                  <PackageCheck className="w-5 h-5 text-brand-primary flex-shrink-0" />
                  <div>
                    <span className="font-bold block">Shiprocket Express Courier Dispatch</span>
                    <span className="text-[11px] text-purple-800/80 font-light">
                      Free delivery across all India within 5–7 working days. A tracking link has been sent to {placedOrder.customer_email || email}.
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const ordNum = placedOrder.order_number;
                      onClose();
                      setStep('address');
                      if (onTrackOrder) {
                        onTrackOrder(ordNum);
                      }
                    }}
                    className="w-full py-3.5 rounded-xl border-2 border-brand-primary text-brand-primary hover:bg-brand-primary/5 text-xs font-caps tracking-widest uppercase font-bold shadow-2xs transition-all flex items-center justify-center space-x-2"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Track This Shipment (Shiprocket)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setStep('address');
                    }}
                    className="w-full py-3.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold shadow-md transition-all"
                  >
                    Continue Shopping Valerie Jewels
                  </button>
                </div>
              </div>

            )}
          </div>
        </div>
      </div>
    </div>
  );
}
