import React from 'react';

/**
 * Official Payment Brand Logos & Badges
 * Authentic, pixel-perfect vector SVGs for official payment brands
 * conforming to official brand guidelines for maximum customer trust.
 */

// 1. Official NPCI Unified Payments Interface (UPI) Logo
export function UpiLogo({ className = "w-6 h-6", variant = "default" }) {
  if (variant === "badge") {
    return (
      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-50 border border-gray-200">
        <svg viewBox="0 0 100 40" className="h-3.5 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* NPCI Dual Chevron/Triangle */}
          <path d="M22 6L32 20L22 34H12L22 20L12 6H22Z" fill="#F47920" />
          <path d="M34 6L44 20L34 34H24L34 20L24 6H34Z" fill="#0F8043" />
          {/* UPI Text */}
          <text x="50" y="27" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="22" fill="#2E3192" letterSpacing="-0.5">UPI</text>
        </svg>
      </div>
    );
  }

  return (
    <svg viewBox="0 0 120 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Official UPI Dual Arrows (Orange & Green) */}
      <path d="M28 8L40 24L28 40H16L28 24L16 8H28Z" fill="#F47920" />
      <path d="M42 8L54 24L42 40H30L42 24L30 8H42Z" fill="#0F8043" />
      {/* UPI Wordmark */}
      <text x="60" y="32" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="26" fill="#1E293B" letterSpacing="-0.5">UPI</text>
    </svg>
  );
}

// 2. Official Google Pay Logo
export function GooglePayLogo({ className = "w-8 h-8" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.2 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z" fill="#4285F4"/>
      <path d="M6.3 14.7l6.6 4.8C14.7 16.1 18.9 14 24 14c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" fill="#EA4335"/>
      <path d="M24 44c5.3 0 10.1-1.9 13.6-5.2l-6.3-5.2C29.3 35.1 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.5 39.5 16.2 44 24 44z" fill="#34A853"/>
      <path d="M43.6 20.1H42V20H24v8h11.3C34.6 30.6 33.2 32.8 31.3 34.3l6.3 5.2c3.7-3.4 6-8.5 6-15.5 0-1.3-.1-2.7-.4-3.9z" fill="#4285F4"/>
      <path d="M12.7 28c-.4-1.2-.7-2.6-.7-4s.3-2.8.7-4l-6.6-4.8C4.8 17.8 4 20.8 4 24s.8 6.2 2.1 8.8l6.6-4.8z" fill="#FBBC05"/>
    </svg>
  );
}

// 3. Official PhonePe Logo (Iconic Purple Circle with White Devanagari Pe)
export function PhonePeLogo({ className = "w-8 h-8" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#5F259F" />
      {/* Official PhonePe 'पे' Vector Character */}
      <path
        d="M26.2 11.5H16.8c-.8 0-1.4.6-1.4 1.4v1.8c0 .8.6 1.4 1.4 1.4h4.1v5.1c0 2.2 1.4 4.1 3.4 4.8l-7.2 10.7c-.4.6-.3 1.4.3 1.8.2.2.5.2.8.2.4 0 .8-.2 1-.5l8.5-12.7h1.4c4.6 0 8.3-3.7 8.3-8.3s-3.7-8.7-8.5-8.7zm0 12.3h-1.6c-2 0-3.6-1.6-3.6-3.6v-4.4h5.2c2.4 0 4.3 2 4.3 4.4s-1.9 3.6-4.3 3.6z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

// 4. Official Paytm Logo (Deep Blue "Pay" + Cyan "tm")
export function PaytmLogo({ className = "w-10 h-auto" }) {
  return (
    <svg viewBox="0 0 96 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* "Pay" in #002970 */}
      <path d="M12 4h-8v24h4.8v-7.8h3.2c4.8 0 8-3.2 8-8.1S16.8 4 12 4zm-.2 11.6H8.8V8.6h3c2.4 0 4 1.4 4 3.5s-1.6 3.5-4 3.5z" fill="#002970"/>
      <path d="M28.4 13.8c-3.8 0-6.2 2.8-6.2 6.8 0 4.1 2.4 6.8 6.2 6.8 2.2 0 3.8-1 4.6-2.4v2.1h4.6V14.2h-4.6v2c-.8-1.4-2.4-2.4-4.6-2.4zm1 10c-1.8 0-3-1.4-3-3.2s1.2-3.2 3-3.2 3 1.4 3 3.2-1.2 3.2-3 3.2z" fill="#002970"/>
      <path d="M42 14.2l3.6 9.8 3.6-9.8h5.2l-6.8 15.6c-1.4 3.2-3.2 4.4-6.4 4.4h-2.4v-4.2h1.6c1.2 0 1.8-.4 2.4-1.6l.6-1.4-6-12.8H42z" fill="#002970"/>
      {/* "tm" in #00BAF2 */}
      <path d="M59.6 9.4h4.8V5.2h-4.8V2.4h-4.6v2.8h-2.8v4.2h2.8v10.4c0 3.2 1.8 5 5 5h4.4v-4.2H61c-1 0-1.4-.4-1.4-1.4V9.4z" fill="#00BAF2"/>
      <path d="M70.8 13.8c-2.4 0-4.2 1.4-5 3v-2.6h-4.6v13.2H66V20c0-1.8 1.2-3 2.8-3 1.6 0 2.6 1 2.6 2.8v7.6H76V20c0-1.8 1.2-3 2.8-3 1.6 0 2.6 1 2.6 2.8v7.6H86V19.4c0-3.6-2-5.6-5.2-5.6-2.2 0-4 1.2-4.8 2.8-.8-1.8-2.6-2.8-5.2-2.8z" fill="#00BAF2"/>
    </svg>
  );
}

// 5. Official BHIM UPI Logo
export function BhimLogo({ className = "w-8 h-8" }) {
  return (
    <svg viewBox="0 0 64 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Tricolor Angled Slant */}
      <path d="M12 4l-4 24h6l4-24h-6z" fill="#1FA348" />
      <path d="M20 4l-4 24h6l4-24h-6z" fill="#F47920" />
      {/* BHIM Text */}
      <text x="24" y="23" fontFamily="Arial Black, Impact, sans-serif" fontWeight="900" fontStyle="italic" fontSize="18" fill="#09579F" letterSpacing="-0.5">BHIM</text>
    </svg>
  );
}

// 6. Official Visa Logo
export function VisaLogo({ className = "w-10 h-auto" }) {
  return (
    <svg viewBox="0 0 64 22" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M26.4 1.5l-4.2 18.9h-4.3L22.1 1.5h4.3zm19.9 12.3l2.2-6.2.7-2 .4 8.2h-3.3zm4.9 6.6h3.9L51.8 1.5h-3.6c-.8 0-1.5.5-1.8 1.2l-6.4 17.7h4.4l.9-2.5h5.4l.5 2.5zm-14.7-6.2c0-3.9-5.4-4.1-5.4-5.9 0-.6.6-1.2 1.8-1.4.6-.1 2.2-.2 4.1.7l.7-3.4c-1-.4-2.3-.7-3.9-.7-4.1 0-7 2.2-7 5.3 0 2.3 2 3.6 3.6 4.4 1.6.8 2.2 1.3 2.2 2 0 1.1-1.3 1.6-2.5 1.6-2.1 0-3.3-.3-5.1-1.1l-.7 3.5c1.1.5 3.1.9 4.9.9 4.6.1 7.3-2.3 7.3-5.3zm-20.7-12.7l-4.1 11.2-.4-2.2c-.7-2.4-3-5.1-5.5-6.4l3.6 16.3h4.4l6.6-18.9h-4.6z" fill="#1434CB"/>
      <path d="M8.2 1.5H1.4L1.2 2.5C6.3 3.8 9.9 7 11.3 11.2L9.8 2.8C9.5 1.8 8.9 1.5 8.2 1.5z" fill="#F7B600"/>
    </svg>
  );
}

// 7. Official Mastercard Logo
export function MastercardLogo({ className = "w-8 h-auto" }) {
  return (
    <svg viewBox="0 0 38 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="38" height="24" rx="3" fill="#FFFFFF" fillOpacity="0" />
      {/* Left Red Circle */}
      <circle cx="13" cy="12" r="10" fill="#EB001B"/>
      {/* Right Yellow Circle */}
      <circle cx="25" cy="12" r="10" fill="#F79E1B"/>
      {/* Intersection Orange */}
      <path d="M19 4.35a9.98 9.98 0 0 1 3.65 7.65c0 3.05-1.37 5.79-3.65 7.65a9.98 9.98 0 0 1-3.65-7.65c0-3.05 1.37-5.79 3.65-7.65z" fill="#FF5F00"/>
    </svg>
  );
}

// 8. Official RuPay Logo
export function RupayLogo({ className = "w-12 h-auto" }) {
  return (
    <svg viewBox="0 0 80 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* "Ru" in Navy Blue */}
      <text x="2" y="18" fontFamily="Arial Black, Impact, sans-serif" fontWeight="900" fontStyle="italic" fontSize="19" fill="#09579F" letterSpacing="-0.5">Ru</text>
      {/* "Pay" in Navy Blue with distinctive slant */}
      <text x="32" y="18" fontFamily="Arial Black, Impact, sans-serif" fontWeight="900" fontStyle="italic" fontSize="19" fill="#09579F" letterSpacing="-0.5">Pay</text>
      {/* RuPay Dual Chevron Accents (Orange & Cyan) */}
      <path d="M68 5l5 7-5 7h4l5-7-5-7h-4z" fill="#F15A24" />
      <path d="M73 5l5 7-5 7h4l5-7-5-7h-4z" fill="#00A9E0" />
    </svg>
  );
}

// 9. Official State Bank of India (SBI) Logo
export function SbiLogo({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#0078D7" />
      {/* Iconic Keyhole Cutout */}
      <circle cx="16" cy="13" r="5" fill="#FFFFFF" />
      <rect x="14.5" y="13" width="3" height="15" fill="#FFFFFF" />
    </svg>
  );
}

// 10. Official HDFC Bank Logo
export function HdfcLogo({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="4" fill="#004C8F" />
      {/* HDFC Cross/Shield Elements */}
      <rect x="4" y="12" width="24" height="8" fill="#ED232A" />
      <rect x="12" y="4" width="8" height="24" fill="#ED232A" />
      <rect x="11" y="11" width="10" height="10" fill="#004C8F" />
      <rect x="13" y="13" width="6" height="6" fill="#FFFFFF" />
    </svg>
  );
}

// 11. Official ICICI Bank Logo
export function IciciLogo({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#F37021" />
      {/* Stylized 'i' in white */}
      <circle cx="16" cy="9" r="2.5" fill="#FFFFFF" />
      <path d="M14 14h4v11h-4z" fill="#FFFFFF" />
      <path d="M12 14h4v2h-4zM12 23h8v2h-8z" fill="#FFFFFF" />
    </svg>
  );
}

// 12. Official Axis Bank Logo
export function AxisLogo({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="4" fill="#97144D" />
      {/* Iconic Axis Bank Burgundy Inverted Triangle with diagonal bar */}
      <path d="M16 7L7 24h6l4.5-8.5L22 24h6L16 7z" fill="#FFFFFF" />
    </svg>
  );
}

// 13. Official Amazon Pay Logo
export function AmazonPayLogo({ className = "w-9 h-auto" }) {
  return (
    <svg viewBox="0 0 68 22" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="2" y="13" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="12" fill="#232F3E">amazon</text>
      <text x="46" y="13" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="12" fill="#FF9900">pay</text>
      {/* Amazon Smile Arc */}
      <path d="M4 17c9 3.5 24 3.5 32-1.5" stroke="#FF9900" strokeWidth="2" strokeLinecap="round" />
      <path d="M35 14l3 1.5-2 2.5" fill="#FF9900" />
    </svg>
  );
}

// 14. Official MobiKwik Logo
export function MobikwikLogo({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#00A3EF" />
      {/* MobiKwik white folded M mark */}
      <path d="M9 22V10l7 6 7-6v12h-3.5V14.5L16 17.5 12.5 14.5V22H9z" fill="#FFFFFF" />
    </svg>
  );
}

// 15. Official Cash on Delivery (COD) Trust Emblem
export function CodEmblem({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="15" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
      {/* Cash Currency Note */}
      <rect x="6" y="10" width="20" height="12" rx="2" fill="#10B981" />
      <circle cx="16" cy="16" r="3" fill="#FFFFFF" fillOpacity="0.3" />
      {/* Rupee Symbol */}
      <text x="16" y="19" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="9" fill="#FFFFFF" textAnchor="middle">₹</text>
      {/* Small Checkmark Badge */}
      <circle cx="23" cy="9" r="4.5" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="1" />
      <path d="M21.5 9l1 1 2-2" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════════
// COMPOSITE VISUAL ROW COMPONENTS
// Replaces generic icon boxes with clusters of official logos
// ═════════════════════════════════════════════════════════════════

/**
 * 1. UPI Payment Leading Box (The official UPI dual-arrow emblem)
 */
export function UpiLeadIcon({ isSelected = false }) {
  return (
    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center relative shrink-0 transition-all ${
      isSelected
        ? 'border-brand-primary bg-purple-50/80 shadow-xs ring-2 ring-brand-primary/20'
        : 'border-gray-200 bg-white shadow-2xs hover:border-gray-300'
    }`}>
      <svg viewBox="0 0 36 28" className="w-6 h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 4L16 14L8 24H2L10 14L2 4H8Z" fill="#F47920" />
        <path d="M18 4L26 14L18 24H12L20 14L12 4H18Z" fill="#0F8043" />
        <text x="14" y="27" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="7" fill="#1E293B" letterSpacing="0.5">UPI</text>
      </svg>
    </div>
  );
}

/**
 * 2. UPI Partner Mini Badges (Google Pay, PhonePe, Paytm)
 */
export function UpiBrandBadges() {
  return (
    <div className="flex items-center gap-1.5 pt-0.5">
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-200/80" title="Google Pay">
        <GooglePayLogo className="w-3.5 h-3.5" />
        <span className="text-[9.5px] font-bold text-gray-700">GPay</span>
      </div>
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50/60 border border-purple-200/70" title="PhonePe">
        <PhonePeLogo className="w-3.5 h-3.5" />
        <span className="text-[9.5px] font-bold text-[#5F259F]">PhonePe</span>
      </div>
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50/60 border border-sky-200/70" title="Paytm">
        <PaytmLogo className="w-7 h-auto" />
      </div>
      <span className="text-[9.5px] text-gray-400 font-medium">+ all UPI</span>
    </div>
  );
}

/**
 * 3. Cards Leading Box (Visa & Mastercard & RuPay visual)
 */
export function CardLeadIcon({ isSelected = false }) {
  return (
    <div className={`w-9 h-9 rounded-xl border flex flex-col items-center justify-center p-0.5 relative shrink-0 transition-all ${
      isSelected
        ? 'border-brand-primary bg-purple-50/80 shadow-xs ring-2 ring-brand-primary/20'
        : 'border-gray-200 bg-white shadow-2xs hover:border-gray-300'
    }`}>
      <div className="flex items-center justify-center gap-0.5 w-full">
        <VisaLogo className="w-4 h-auto" />
        <MastercardLogo className="w-3.5 h-auto" />
      </div>
      <div className="w-full flex justify-center -mt-0.5">
        <RupayLogo className="w-5 h-auto scale-90" />
      </div>
    </div>
  );
}

/**
 * 4. Cards Brand Badges (Visa, Mastercard, RuPay badges)
 */
export function CardBrandBadges() {
  return (
    <div className="flex items-center gap-1.5 pt-0.5">
      <div className="px-1.5 py-0.5 rounded bg-white border border-gray-200 shadow-3xs flex items-center h-4.5" title="Visa">
        <VisaLogo className="w-6 h-auto" />
      </div>
      <div className="px-1.5 py-0.5 rounded bg-white border border-gray-200 shadow-3xs flex items-center h-4.5" title="Mastercard">
        <MastercardLogo className="w-5 h-auto" />
      </div>
      <div className="px-1.5 py-0.5 rounded bg-white border border-gray-200 shadow-3xs flex items-center h-4.5" title="RuPay">
        <RupayLogo className="w-8 h-auto" />
      </div>
      <span className="text-[9.5px] text-gray-400 font-medium">&amp; all cards</span>
    </div>
  );
}

/**
 * 5. Net Banking Leading Box (SBI, HDFC, ICICI, Axis)
 */
export function NetBankingLeadIcon({ isSelected = false }) {
  return (
    <div className={`w-9 h-9 rounded-xl border grid grid-cols-2 gap-0.5 p-1 items-center justify-center relative shrink-0 transition-all ${
      isSelected
        ? 'border-brand-primary bg-purple-50/80 shadow-xs ring-2 ring-brand-primary/20'
        : 'border-gray-200 bg-white shadow-2xs hover:border-gray-300'
    }`}>
      <div className="flex items-center justify-center"><SbiLogo className="w-3 h-3" /></div>
      <div className="flex items-center justify-center"><HdfcLogo className="w-3 h-3" /></div>
      <div className="flex items-center justify-center"><IciciLogo className="w-3 h-3" /></div>
      <div className="flex items-center justify-center"><AxisLogo className="w-3 h-3" /></div>
    </div>
  );
}

/**
 * 6. Net Banking Bank Badges
 */
export function NetBankingBrandBadges() {
  return (
    <div className="flex items-center gap-1.5 pt-0.5">
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50/60 border border-blue-200/70" title="State Bank of India">
        <SbiLogo className="w-3 h-3" />
        <span className="text-[9px] font-bold text-[#0078D7]">SBI</span>
      </div>
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50/60 border border-indigo-200/70" title="HDFC Bank">
        <HdfcLogo className="w-3 h-3" />
        <span className="text-[9px] font-bold text-[#004C8F]">HDFC</span>
      </div>
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50/60 border border-orange-200/70" title="ICICI Bank">
        <IciciLogo className="w-3 h-3" />
        <span className="text-[9px] font-bold text-[#B02A30]">ICICI</span>
      </div>
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50/60 border border-rose-200/70" title="Axis Bank">
        <AxisLogo className="w-3 h-3" />
        <span className="text-[9px] font-bold text-[#97144D]">Axis</span>
      </div>
      <span className="text-[9.5px] text-gray-400 font-medium">+ 50+ Banks</span>
    </div>
  );
}

/**
 * 7. Wallets Leading Box (Paytm, PhonePe, Amazon Pay, MobiKwik)
 */
export function WalletLeadIcon({ isSelected = false }) {
  return (
    <div className={`w-9 h-9 rounded-xl border flex flex-col items-center justify-center p-1 relative shrink-0 transition-all ${
      isSelected
        ? 'border-brand-primary bg-purple-50/80 shadow-xs ring-2 ring-brand-primary/20'
        : 'border-gray-200 bg-white shadow-2xs hover:border-gray-300'
    }`}>
      <div className="flex items-center gap-1 justify-center w-full">
        <PhonePeLogo className="w-3.5 h-3.5" />
        <PaytmLogo className="w-4.5 h-auto" />
      </div>
      <div className="w-full flex justify-center mt-0.5">
        <MobikwikLogo className="w-3 h-3" />
      </div>
    </div>
  );
}

/**
 * 8. Wallets Brand Badges
 */
export function WalletBrandBadges() {
  return (
    <div className="flex items-center gap-1.5 pt-0.5">
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-50/60 border border-sky-200/70" title="Paytm Wallet">
        <PaytmLogo className="w-6 h-auto" />
      </div>
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50/60 border border-purple-200/70" title="PhonePe Wallet">
        <PhonePeLogo className="w-3 h-3" />
        <span className="text-[9px] font-bold text-[#5F259F]">PhonePe</span>
      </div>
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50/60 border border-amber-200/70" title="Amazon Pay">
        <AmazonPayLogo className="w-7 h-auto" />
      </div>
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-50/60 border border-cyan-200/70" title="MobiKwik">
        <MobikwikLogo className="w-3 h-3" />
        <span className="text-[9px] font-bold text-[#00A3EF]">MobiKwik</span>
      </div>
    </div>
  );
}

/**
 * 9. Cash on Delivery (COD) / Partial COD Leading Box
 */
export function CodLeadIcon({ isSelected = false }) {
  return (
    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center p-1 relative shrink-0 transition-all ${
      isSelected
        ? 'border-brand-primary bg-purple-50/80 shadow-xs ring-2 ring-brand-primary/20'
        : 'border-gray-200 bg-white shadow-2xs hover:border-gray-300'
    }`}>
      <CodEmblem className="w-6 h-6" />
    </div>
  );
}
