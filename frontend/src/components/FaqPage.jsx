import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ArrowLeft,
  MessageCircle,
  Phone,
  Mail,
  Truck,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Gift,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  X
} from 'lucide-react';
import { apiService } from '../services/api';
import { DEFAULT_FAQS_DATA } from '../data/defaultFaqs';

export default function FaqPage({ onReturnToStore, onNavigatePolicy }) {
  const [faqsData, setFaqsData] = useState(DEFAULT_FAQS_DATA);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [openFaqIds, setOpenFaqIds] = useState(['faq-1', 'faq-3']); // First and third open by default

  // Load dynamic FAQs from backend
  useEffect(() => {
    let isMounted = true;
    async function loadFaqs() {
      try {
        const data = await apiService.getFaqs();
        if (isMounted && data && data.faqs) {
          setFaqsData(data);
        }
      } catch (err) {
        console.warn('FaqPage: error loading dynamic faqs, using defaults:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadFaqs();

    const handleSync = (e) => {
      if (e.detail && e.detail.faqs) {
        setFaqsData(e.detail);
      }
    };
    window.addEventListener('valerie_faqs_updated', handleSync);
    return () => {
      isMounted = false;
      window.removeEventListener('valerie_faqs_updated', handleSync);
    };
  }, []);

  // Filter categories and active FAQs
  const categories = useMemo(() => {
    const list = faqsData.categories || [
      'Shipping & Delivery',
      'Orders & Payments',
      'Jewelry Care & Quality',
      'Returns & Refunds',
      'Gifting & Packaging',
      'Customer Support',
    ];
    return ['All', ...list];
  }, [faqsData]);

  const filteredFaqs = useMemo(() => {
    const allFaqs = faqsData.faqs || [];
    return allFaqs.filter((item) => {
      if (item.isActive === false) return false;
      
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchQ = item.q && item.q.toLowerCase().includes(q);
      const matchA = item.a && item.a.toLowerCase().includes(q);
      const matchCat = item.category && item.category.toLowerCase().includes(q);
      return matchQ || matchA || matchCat;
    });
  }, [faqsData, selectedCategory, searchQuery]);

  const toggleFaq = (id) => {
    setOpenFaqIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Shipping & Delivery':
        return Truck;
      case 'Orders & Payments':
        return Sparkles;
      case 'Jewelry Care & Quality':
        return ShieldCheck;
      case 'Returns & Refunds':
        return RotateCcw;
      case 'Gifting & Packaging':
        return Gift;
      default:
        return HelpCircle;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFBFE] text-brand-tertiary antialiased">
      {/* Top Reassurance Ribbon */}
      <div className="bg-[#FAF7FC] border-b border-brand-border text-brand-tertiary text-[10.5px] sm:text-[11px] font-medium py-2 px-4 text-center tracking-wider uppercase flex items-center justify-center space-x-2">
        <Sparkles className="w-3.5 h-3.5 text-brand-primary shrink-0" />
        <span>
          FREE DELIVERY ACROSS ALL INDIA (5-7 WORKING DAYS) • FREE ZIRCON NECKLACE ON PREPAID ORDERS
        </span>
      </div>

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-brand-border px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              if (onReturnToStore) onReturnToStore();
              else {
                window.location.href = '/';
              }
            }}
            className="flex items-center space-x-1.5 text-xs font-semibold text-brand-muted hover:text-brand-primary transition-colors py-1 px-2.5 rounded-lg hover:bg-brand-surface"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Storefront</span>
          </button>
          <div className="h-4 w-px bg-brand-border hidden sm:block"></div>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              if (onReturnToStore) onReturnToStore();
              else window.location.href = '/';
            }}
            className="flex items-center"
          >
            <img src="/valerie.png" alt="VALERIÉ" className="h-6 w-auto object-contain" />
          </a>
        </div>

        {/* Quick WhatsApp Support Link */}
        <div className="flex items-center space-x-3">
          <a
            href="https://wa.me/917016347945"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/20" />
            <span>WhatsApp Support</span>
          </a>

          <button
            onClick={() => {
              if (onReturnToStore) onReturnToStore();
              else window.location.href = '/';
            }}
            className="px-4 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-caps tracking-wider uppercase font-bold hover:bg-brand-primary-hover shadow-xs transition-all"
          >
            Back to Store
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-primary-light/60 text-brand-primary border border-brand-primary/20 text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Valerié Customer Concierge &amp; Knowledge Base</span>
          </div>

          <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold text-brand-tertiary tracking-tight">
            Frequently Asked Questions
          </h1>

          <p className="text-xs sm:text-sm text-brand-muted font-light leading-relaxed max-w-2xl mx-auto">
            Everything you need to know about our 18K PVD anti-tarnish jewelry, 5–7 working days free delivery across all India, prepaid perks, returns, and orders.
          </p>

          {/* Search Box */}
          <div className="pt-2 max-w-2xl mx-auto">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-brand-muted absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions (e.g. shipping time, anti-tarnish, zircon necklace, COD, returns)..."
                className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-white border border-brand-border focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 text-xs sm:text-sm text-brand-tertiary placeholder:text-brand-muted/70 shadow-sm outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 p-1 text-brand-muted hover:text-brand-tertiary rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="text-left mt-2 px-2 text-xs text-brand-muted">
                Found <strong className="text-brand-primary">{filteredFaqs.length}</strong> {filteredFaqs.length === 1 ? 'question' : 'questions'} matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* Highlight Quick Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FAF5FF] to-white border border-purple-100 shadow-2xs flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center shrink-0 shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-brand-tertiary">5–7 Working Days Delivery</div>
              <div className="text-[11px] text-brand-muted font-light">100% Free Shipping across India</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FFF7ED] to-white border border-amber-100 shadow-2xs flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-brand-tertiary">Free Zircon Necklace Gift</div>
              <div className="text-[11px] text-brand-muted font-light">+ ₹50 Extra Instant Discount on Prepaid</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#F0FDF4] to-white border border-emerald-100 shadow-2xs flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-brand-tertiary">18K PVD Anti-Tarnish</div>
              <div className="text-[11px] text-brand-muted font-light">Waterproof &amp; Hypoallergenic 316L Steel</div>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none border-b border-brand-border/60">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'bg-white text-brand-muted hover:text-brand-tertiary border border-brand-border/70 hover:bg-brand-surface'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* FAQs Accordion List */}
        <div className="space-y-3.5">
          {loading ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-brand-muted uppercase tracking-wider font-semibold">Loading questions...</p>
            </div>
          ) : filteredFaqs.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-brand-border bg-white space-y-3">
              <HelpCircle className="w-10 h-10 text-brand-muted/40 mx-auto" />
              <h3 className="font-editorial text-xl font-bold text-brand-tertiary">No matching questions found</h3>
              <p className="text-xs text-brand-muted max-w-sm mx-auto">
                We couldn't find any questions matching "{searchQuery}". Try searching with different keywords or contact our team directly.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hover transition-colors inline-block"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = openFaqIds.includes(faq.id);
              const CategoryIcon = getCategoryIcon(faq.category);
              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition-all duration-200 bg-white overflow-hidden ${
                    isOpen
                      ? 'border-brand-primary/40 shadow-sm'
                      : 'border-brand-border hover:border-brand-primary/30'
                  }`}
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full p-5 sm:p-6 text-left flex items-start justify-between gap-4 focus:outline-none cursor-pointer"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-primary-light/70 text-brand-primary">
                          <CategoryIcon className="w-3 h-3" />
                          <span>{faq.category}</span>
                        </span>
                      </div>
                      <h3 className="font-editorial text-base sm:text-lg font-bold text-brand-tertiary leading-snug">
                        {faq.q}
                      </h3>
                    </div>

                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 mt-1 ${
                        isOpen ? 'bg-brand-primary text-white rotate-180' : 'bg-brand-surface text-brand-muted'
                      }`}
                    >
                      <ChevronDown className="w-4 h-4 stroke-[2]" />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-brand-muted font-light leading-relaxed border-t border-brand-border/60 whitespace-pre-line">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Concierge Support Banner */}
        <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#FAF5FF] via-white to-[#FFF5F8] border border-brand-primary/20 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-[10.5px] font-caps uppercase tracking-wider text-brand-primary font-bold">
              Still Have Questions?
            </span>
            <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-brand-tertiary">
              Speak with a Valerie Concierge
            </h3>
            <p className="text-xs text-brand-muted font-light max-w-lg">
              Our dedicated jewelry concierge team is available 7 days a week from 8:00 AM to 4:00 PM IST to assist you with styling advice, orders, or tracking.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <a
              href="https://wa.me/917016347945"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs transition-all"
            >
              <MessageCircle className="w-4 h-4 fill-white/20" />
              <span>WhatsApp: +91 70163 47945</span>
            </a>

            <a
              href="tel:+919023422392"
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-brand-surface border border-brand-border text-brand-tertiary text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
            >
              <Phone className="w-4 h-4 text-brand-primary" />
              <span>Call: +91 90234 22392</span>
            </a>
          </div>
        </div>

        {/* Policy Quick Links Footer Strip */}
        <div className="pt-6 border-t border-brand-border flex flex-wrap items-center justify-between gap-4 text-xs text-brand-muted">
          <div>
            Need detailed legal guidelines? Explore our dedicated policy atelier:
          </div>
          <div className="flex flex-wrap gap-4 text-brand-primary font-medium">
            <button
              onClick={() => onNavigatePolicy && onNavigatePolicy('shipping')}
              className="hover:underline cursor-pointer"
            >
              Shipping &amp; Delivery Policy
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigatePolicy && onNavigatePolicy('refund')}
              className="hover:underline cursor-pointer"
            >
              Return &amp; Refund Policy
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigatePolicy && onNavigatePolicy('privacy')}
              className="hover:underline cursor-pointer"
            >
              Privacy Policy (DPDP 2023)
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigatePolicy && onNavigatePolicy('terms')}
              className="hover:underline cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-brand-border py-8 mt-16 text-center text-xs text-brand-muted font-light">
        <div className="max-w-5xl mx-auto px-4 space-y-2">
          <p>© {new Date().getFullYear()} VALERIÉ (Valerie Jewels). All rights reserved.</p>
          <p className="text-[11px] text-brand-muted/70">Patel Chowk, Rajkot, Gujarat — 360001, India • Concierge: orders@valeriejewels.in</p>
        </div>
      </footer>
    </div>
  );
}
