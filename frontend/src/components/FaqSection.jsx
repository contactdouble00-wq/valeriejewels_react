import React, { useState } from 'react';
import { ChevronDown, Truck, RefreshCw, CreditCard, Gift, Shield, Phone } from 'lucide-react';

// ─── Exact FAQs sourced from https://valeriejewels.in/faqs/ ───────────────────
export const VALERIE_FAQS = [
  {
    category: 'Shipping',
    icon: Truck,
    q: 'How long does shipping usually take?',
    a: 'Orders are typically delivered within 3–7 business days across India. Delivery times may vary depending on your location.',
  },
  {
    category: 'Tracking',
    icon: Truck,
    q: 'Can I track my order after purchase?',
    a: 'Yes. You can track your order anytime using our Track Order page. Simply enter your Order ID and the email address used during checkout. Your Order ID is included in the order confirmation email you receive after placing your order.',
  },
  {
    category: 'Payment',
    icon: CreditCard,
    q: 'Do you offer Cash on Delivery (COD)?',
    a: 'Yes, we offer Cash on Delivery (COD) across India. Please note that a ₹100 additional charge applies to all COD orders.',
  },
  {
    category: 'Support',
    icon: Phone,
    q: 'What if I need help with my order?',
    a: 'If you need any assistance regarding your order, please contact our customer support team via our helpline number or email us at contact@valeriejewels.in. We\'re here to help and will respond as quickly as possible.',
  },
  {
    category: 'Packaging',
    icon: Gift,
    q: 'Do you offer gift packaging?',
    a: 'Yes. You can select Gift Packaging at checkout for a beautifully packed order, perfect for gifting.',
  },
  {
    category: 'Returns',
    icon: RefreshCw,
    q: 'What is your return policy?',
    a: 'We accept returns for damaged or incorrect items reported within the specified return period. Please refer to our Return Policy page for details. We offer a hassle-free 7-day return policy on eligible orders — your satisfaction is our priority.',
  },
  {
    category: 'Quality',
    icon: Shield,
    q: 'Are your jewellery pieces tarnish-resistant?',
    a: 'Our pieces are crafted for durability and long-lasting shine. Proper care will help maintain their beauty over time. We use 18K gold plated anti-tarnish materials designed to withstand everyday wear.',
  },
  {
    category: 'Contact',
    icon: Phone,
    q: 'How can I contact Valerié Jewels?',
    a: 'You can reach us via:\n• WhatsApp: +91 70163 47945\n• Phone: +91 90234 22392\n• Email: orders@valeriejewels.in\n• Address: Patel Chowk, Rajkot, Gujarat\n\nWe\'re available 7 days a week, 8:00 AM – 4:00 PM.',
  },
];

export default function FaqSection({ limit = 5 }) {
  const [openIndex, setOpenIndex] = useState(0);

  const displayFaqs = limit ? VALERIE_FAQS.slice(0, limit) : VALERIE_FAQS;

  return (
    <section className="space-y-6">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <span className="text-xs font-caps uppercase tracking-[0.2em] text-brand-primary font-bold">
          Customer Questions
        </span>
        <h2 className="text-2xl sm:text-3xl font-editorial font-bold text-brand-tertiary">
          Frequently Asked Questions
        </h2>
        <p className="text-xs sm:text-sm text-brand-muted font-light">
          Everything you need to know about shopping at Valerié Jewels.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
        {displayFaqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          const Icon = faq.icon;
          return (
            <div
              key={idx}
              className="luxury-card rounded-2xl overflow-hidden border border-brand-border bg-white transition-all"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-brand-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-brand-primary" />
                  </span>
                  <span className="font-editorial text-base sm:text-lg font-bold text-brand-tertiary">
                    {faq.q}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-brand-primary transition-transform duration-300 flex-shrink-0 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-brand-muted font-light leading-relaxed border-t border-brand-border/60 pt-3 animate-in fade-in duration-200 pl-16 whitespace-pre-line">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {limit && VALERIE_FAQS.length > limit && (
        <div className="text-center pt-2">
          <a
            href="/faqs"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-brand-primary hover:underline"
          >
            <span>View all {VALERIE_FAQS.length} FAQs</span>
            <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
          </a>
        </div>
      )}
    </section>
  );
}
