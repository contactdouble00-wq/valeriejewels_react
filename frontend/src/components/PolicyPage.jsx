import React, { useState, useEffect } from 'react';
import {
  Truck,
  RotateCcw,
  ShieldCheck,
  FileText,
  ArrowLeft,
  Sparkles,
  Gift,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Clock,
  ChevronRight,
  ExternalLink,
  Lock,
  CheckCircle2,
  Video
} from 'lucide-react';
import { apiService } from '../services/api';
import { DEFAULT_POLICIES } from '../data/defaultPolicies';

export default function PolicyPage({
  initialPolicy = 'shipping',
  onNavigateHome,
  onOpenPolicy,
  onOpenCart
}) {
  const [activeTab, setActiveTab] = useState(initialPolicy || 'shipping');
  const [policies, setPolicies] = useState(() => {
    try {
      const cached = localStorage.getItem('valerie_policies_cache');
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_POLICIES;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialPolicy) {
      setActiveTab(initialPolicy);
    }
  }, [initialPolicy]);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const data = await apiService.getPolicies();
      if (data) {
        setPolicies(data);
        try {
          localStorage.setItem('valerie_policies_cache', JSON.stringify(data));
        } catch {}
      }
    } catch (err) {
      console.warn('Could not refresh policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();

    const handleUpdate = () => {
      fetchPolicies();
    };

    window.addEventListener('valerie_policies_updated', handleUpdate);
    return () => window.removeEventListener('valerie_policies_updated', handleUpdate);
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (onOpenPolicy) {
      onOpenPolicy(tab);
    } else {
      window.location.hash = `#${tab}-policy`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tabs = [
    { id: 'shipping', label: 'Shipping & Delivery', icon: Truck, badge: '5–7 Days • Free' },
    { id: 'refund', label: 'Return & Refund', icon: RotateCcw, badge: '5–7 Days Window' },
    { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck, badge: 'DPDP 2023' },
    { id: 'terms', label: 'Terms & Conditions', icon: FileText, badge: 'Legal' },
  ];

  const currentPolicy = policies[activeTab] || DEFAULT_POLICIES[activeTab] || DEFAULT_POLICIES.shipping;
  const meta = policies.meta || DEFAULT_POLICIES.meta;

  return (
    <div className="min-h-screen bg-[#FCFBFE] text-brand-tertiary antialiased flex flex-col">
      {/* 1. Top Global Announcement Ribbon */}
      <div className="bg-gradient-to-r from-[#26153D] via-[#372248] to-[#26153D] text-white text-[11px] py-2 px-4 text-center font-medium tracking-wider flex items-center justify-center space-x-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        <span>
          ALL INDIA FREE EXPRESS DELIVERY (5–7 WORKING DAYS) •{' '}
          <span className="text-amber-300 font-bold">FREE ZIRCON NECKLACE</span> +{' '}
          <span className="text-emerald-300 font-bold">₹50 OFF ON PREPAID</span>
        </span>
      </div>

      {/* 2. Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-brand-border px-4 sm:px-8 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigateHome ? onNavigateHome() : (window.location.href = '/')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-brand-tertiary hover:text-brand-primary hover:bg-brand-surface transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2]" />
            <span>Return to Atelier</span>
          </button>
        </div>

        {/* Center Brand Logo */}
        <a href="/" onClick={(e) => { e.preventDefault(); onNavigateHome ? onNavigateHome() : (window.location.href = '/'); }}>
          <img src="/valerie.png" alt="VALERIÉ" className="h-6 sm:h-7 w-auto object-contain" />
        </a>

        {/* Right Action: WhatsApp Concierge Support */}
        <div className="flex items-center space-x-2">
          <a
            href="https://wa.me/917016347945?text=Hello%20Valerie%20Jewels,%20I%20have%20a%20question%20regarding%20shipping%20and%20policies."
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Concierge: +91 70163 47945</span>
          </a>
        </div>
      </header>

      {/* 3. Hero Header with Editorial Aesthetics */}
      <section className="bg-gradient-to-b from-white via-brand-surface to-[#F9F6FC] border-b border-brand-border py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-caps tracking-widest uppercase font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Atelier Commitments</span>
          </div>

          <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold text-brand-tertiary tracking-tight">
            {currentPolicy.title || 'Legal & Customer Policies'}
          </h1>

          <p className="text-xs sm:text-sm text-brand-muted max-w-2xl mx-auto font-light leading-relaxed">
            {currentPolicy.subtitle || 'Guaranteed transparency, insured Pan-India transit, and regulatory compliance under Indian Law.'}
          </p>

          <div className="text-[11px] text-brand-muted/80 pt-1">
            Last Reviewed &amp; Updated: <span className="font-semibold text-brand-tertiary">{meta.lastUpdated || 'September 2026'}</span>
          </div>
        </div>

        {/* 4. Three High-Impact Policy Pillars */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 pt-8">
          <div className="p-3.5 rounded-2xl bg-white border border-brand-border shadow-xs flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-brand-primary-light flex items-center justify-center text-brand-primary shrink-0">
              <Truck className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[11px] font-caps tracking-wider uppercase text-brand-muted block font-semibold">Delivery Time</span>
              <span className="text-xs font-bold text-brand-tertiary">5–7 Working Days (Pan-India)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-brand-border shadow-xs flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[11px] font-caps tracking-wider uppercase text-brand-muted block font-semibold">Shipping Charges</span>
              <span className="text-xs font-bold text-emerald-700">100% Free Across All India</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-brand-border shadow-xs flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <Gift className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[11px] font-caps tracking-wider uppercase text-brand-muted block font-semibold">Prepaid Bonus</span>
              <span className="text-xs font-bold text-purple-900">Free Zircon Necklace + ₹50 OFF</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Policy Navigation Tabs Strip */}
      <nav aria-label="Policy Navigation" className="sticky top-14 z-30 bg-white/95 backdrop-blur-md border-b border-brand-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center space-x-2 overflow-x-auto py-2.5 no-scrollbar">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-2 shrink-0 ${
                    isActive
                      ? 'bg-brand-tertiary text-white shadow-sm'
                      : 'bg-brand-surface text-brand-tertiary/75 hover:bg-brand-primary-light hover:text-brand-primary border border-brand-border/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-brand-muted'}`} />
                  <span>{t.label}</span>
                  {t.badge && (
                    <span
                      className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-brand-primary/10 text-brand-primary'
                      }`}
                    >
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* 6. Main Document Content Body */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Interactive Table of Contents (Sticky on Desktop) */}
          <aside aria-label="Table of contents" className="hidden lg:block lg:col-span-4">
            <div className="sticky top-32 p-5 rounded-2xl bg-white border border-brand-border shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-xs font-caps tracking-wider uppercase font-bold text-brand-tertiary border-b border-brand-border pb-2">
                <FileText className="w-3.5 h-3.5 text-brand-primary" />
                <span>Clause Directory</span>
              </div>

              <ul className="space-y-1.5 text-xs">
                {(currentPolicy.sections || []).map((sec, i) => (
                  <li key={sec.id || i}>
                    <a
                      href={`#${sec.id || `section-${i}`}`}
                      className="block py-1 px-2 rounded-lg text-brand-muted hover:text-brand-primary hover:bg-brand-primary-light transition-colors line-clamp-1"
                    >
                      {sec.heading}
                    </a>
                  </li>
                ))}
              </ul>

              {/* Verified Legal Seals */}
              <div className="pt-3 border-t border-brand-border/60 text-[11px] text-brand-muted font-light space-y-1">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>DPDP Act 2023 Compliant</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Consumer Protection Rules 2020</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column: Detailed Clauses & Formatted Policy Text */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Specific Visual Callout Box per Policy Tab */}
            {activeTab === 'shipping' && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 shadow-xs space-y-2">
                <div className="flex items-center space-x-2 text-emerald-900 font-bold text-sm">
                  <Truck className="w-4 h-4 text-emerald-700" />
                  <span>Valerie Express Logistics Guarantee</span>
                </div>
                <p className="text-xs text-emerald-950 font-light leading-relaxed">
                  • <strong>5–7 Working Days Delivery:</strong> Seamless delivery to 29,000+ pin codes via Shiprocket, Blue Dart, and Delhivery.<br />
                  • <strong>100% Free Shipping:</strong> ₹0 shipping cost on all jewelry pieces across India.<br />
                  • <strong>Prepaid Gift &amp; Discount:</strong> Get an extra ₹50 instant discount + a free luxury Zircon Solitaire Necklace on all prepaid orders.
                </p>
              </div>
            )}

            {activeTab === 'refund' && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/80 shadow-xs space-y-2">
                <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
                  <Video className="w-4 h-4 text-amber-700" />
                  <span>Mandatory Unboxing Video Advisory</span>
                </div>
                <p className="text-xs text-amber-950 font-light leading-relaxed">
                  To protect our patrons and satisfy insurance audit standards, an <strong>uncut, continuous 360° video</strong> from opening the outer courier bag is strictly required for transit damage, defect, or missing piece claims. Please record your unboxing as soon as the package arrives!
                </p>
              </div>
            )}

            {/* Structured Sections */}
            <div className="space-y-6">
              {(currentPolicy.sections || []).map((sec, i) => (
                <article
                  key={sec.id || i}
                  id={sec.id || `section-${i}`}
                  className="p-6 sm:p-7 rounded-2xl bg-white border border-brand-border shadow-xs space-y-3 scroll-mt-32"
                >
                  <h2 className="font-sans text-base sm:text-lg font-bold text-brand-tertiary">
                    {sec.heading}
                  </h2>
                  <div className="text-xs sm:text-sm text-brand-muted/90 font-light leading-relaxed whitespace-pre-line">
                    {sec.content}
                  </div>
                </article>
              ))}
            </div>

            {/* Statutory Contact & Grievance Card */}
            <div className="p-6 sm:p-7 rounded-2xl bg-[#FAF8FD] border border-brand-border space-y-4">
              <div className="flex items-center space-x-2 font-caps uppercase tracking-wider text-xs font-bold text-brand-primary">
                <ShieldCheck className="w-4 h-4 text-brand-primary" />
                <span>Nodal Compliance &amp; Customer Grievance Cell</span>
              </div>

              <p className="text-xs text-brand-muted font-light leading-relaxed">
                In compliance with the Information Technology Act, 2000, and the Digital Personal Data Protection Act, 2023, you may address any concerns, tracking queries, or return requests directly to our registered atelier cell:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-brand-tertiary">
                <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-white border border-brand-border/80">
                  <Mail className="w-4 h-4 text-brand-primary shrink-0" />
                  <div>
                    <span className="text-[10.5px] text-brand-muted block font-semibold uppercase">Email Inquiries</span>
                    <a href={`mailto:${meta.supportEmail || 'orders@valeriejewels.in'}`} className="font-medium hover:text-brand-primary transition-colors">
                      {meta.supportEmail || 'orders@valeriejewels.in'}
                    </a>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-white border border-brand-border/80">
                  <Phone className="w-4 h-4 text-brand-primary shrink-0" />
                  <div>
                    <span className="text-[10.5px] text-brand-muted block font-semibold uppercase">Customer Helpline</span>
                    <a href={`tel:${meta.supportPhone || '+919023422392'}`} className="font-medium hover:text-brand-primary transition-colors">
                      {meta.supportPhone || '+91 90234 22392'}
                    </a>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-white border border-brand-border/80">
                  <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-[10.5px] text-brand-muted block font-semibold uppercase">WhatsApp Concierge</span>
                    <a href={`https://wa.me/${(meta.whatsappNumber || '917016347945').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="font-medium hover:text-emerald-700 transition-colors">
                      {meta.whatsappNumber || '+91 70163 47945'}
                    </a>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-white border border-brand-border/80">
                  <MapPin className="w-4 h-4 text-brand-primary shrink-0" />
                  <div>
                    <span className="text-[10.5px] text-brand-muted block font-semibold uppercase">Atelier Headquarters</span>
                    <span className="font-medium text-brand-tertiary">
                      {meta.registeredAddress || 'Patel Chowk, Rajkot, Gujarat — 360001'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* 7. Bottom Return to Shopping Strip */}
      <footer className="bg-white border-t border-brand-border py-6 px-4 text-center">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-brand-muted">
          <div>
            © {new Date().getFullYear()} {meta.brandName || 'VALERIÉ'}. Registered in India under Valerie Jewels Atelier Private Limited.
          </div>
          <button
            onClick={() => onNavigateHome ? onNavigateHome() : (window.location.href = '/')}
            className="px-5 py-2 rounded-xl bg-brand-primary text-white font-semibold hover:bg-brand-primary-hover transition-colors shadow-xs active:scale-95"
          >
            Continue Exploring Jewelry
          </button>
        </div>
      </footer>
    </div>
  );
}
