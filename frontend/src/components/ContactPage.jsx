import React, { useState, useEffect } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Clock,
  Sparkles,
  ArrowLeft,
  Send,
  CheckCircle2,
  HelpCircle,
  Truck,
  ShieldCheck,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import InstagramIcon from './InstagramIcon';
import { useSiteContent } from '../context/SiteContentContext';
import { apiService } from '../services/api';

export default function ContactPage({ onReturnToStore, onOpenTracking, onOpenFaqs, onOpenPolicy }) {
  const { content } = useSiteContent();
  const cs = content?.customerSupport || {};

  const phone = cs.phone || '+91 90234 22392';
  const whatsappNumber = cs.whatsappNumber || '+91 90234 22392';
  const cleanWaNumber = whatsappNumber.replace(/[^0-9]/g, '');
  const email = cs.email || 'orders@valeriejewels.in';
  const address = cs.address || 'Patel Chowk, Rajkot, Gujarat, 360002';
  const hours = cs.hours || '7 days a week, 8:00 AM – 4:00 PM IST';
  const instagramUrl = cs.instagramUrl || 'https://www.instagram.com/valeriejewels.in/';
  const instagramHandle = cs.instagramHandle || '@valeriejewels.in';

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    order_number: '',
    subject: 'Order & Delivery Status',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [waLink, setWaLink] = useState('');

  // Set Page Title and Meta Tags
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Contact Us | Customer Care & Atelier Concierge | Valerie Jewels';

    let metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc ? metaDesc.getAttribute('content') : '';
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Contact the Valerie Jewels atelier in Rajkot, Gujarat. Reach our customer care team via WhatsApp (+91 90234 22392), phone, or email for order status, custom styling, and delivery support.'
      );
    }

    // Add ContactPage schema
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      'name': 'Contact Valerie Jewels',
      'description': 'Customer care and atelier concierge for Valerie Jewels.',
      'url': 'https://valeriejewels.in/contact-us',
      'mainEntity': {
        '@type': 'JewelryStore',
        'name': 'Valerie Jewels',
        'telephone': phone,
        'email': email,
        'address': {
          '@type': 'PostalAddress',
          'streetAddress': 'Patel Chowk',
          'addressLocality': 'Rajkot',
          'addressRegion': 'Gujarat',
          'postalCode': '360002',
          'addressCountry': 'IN'
        },
        'openingHours': 'Mo-Su 08:00-16:00'
      }
    });
    document.head.appendChild(script);

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc) metaDesc.setAttribute('content', prevDesc);
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [phone, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.message.trim()) {
      setErrorMsg('Please enter your name and message.');
      return;
    }
    if (!formData.email.trim() && !formData.phone.trim()) {
      setErrorMsg('Please provide either your phone number or email address.');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await apiService.submitContactInquiry(formData);
      setSubmitted(true);
      if (res?.whatsapp_url) {
        setWaLink(res.whatsapp_url);
      } else {
        const text = `Hello Valerie Jewels Atelier,\n\nMy name is ${formData.name}.\n${formData.order_number ? `Order #: ${formData.order_number}\n` : ''}Topic: ${formData.subject}\nMessage: ${formData.message}\n\nPlease assist me. Thank you!`;
        setWaLink(`https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(text)}`);
      }
    } catch (err) {
      // Fallback: Still generate instant WhatsApp link so customer is never stuck
      const text = `Hello Valerie Jewels Atelier,\n\nMy name is ${formData.name}.\n${formData.order_number ? `Order #: ${formData.order_number}\n` : ''}Topic: ${formData.subject}\nMessage: ${formData.message}\n\nPlease assist me. Thank you!`;
      setWaLink(`https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(text)}`);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoHome = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (onReturnToStore) {
      onReturnToStore();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFBFE] text-brand-tertiary antialiased flex flex-col">
      {/* 1. Top Global Announcement Ribbon */}
      <div className="bg-gradient-to-r from-[#26153D] via-[#372248] to-[#26153D] text-white text-[11px] py-2 px-4 text-center font-medium tracking-wider flex items-center justify-center space-x-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        <span>
          VALERIE ATELIER CONCIERGE • 7 DAYS A WEEK •{' '}
          <span className="text-amber-300 font-bold">WHATSAPP: {phone}</span>
        </span>
      </div>

      {/* 2. Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-brand-border px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <button
          onClick={handleGoHome}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-brand-tertiary hover:text-brand-primary hover:bg-brand-surface transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2]" />
          <span>Return to Boutique</span>
        </button>

        {/* Center Brand Logo */}
        <a href="/" onClick={handleGoHome} className="flex items-center">
          <img src="/valerie.png" alt="VALERIÉ" className="h-6 sm:h-7 w-auto object-contain" />
        </a>

        {/* Quick WhatsApp Pill */}
        <a
          href={`https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(cs.whatsappMessage || 'Hello Valerie Jewels, I would like to inquire about an order.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
        >
          <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 text-white" />
          <span>WhatsApp Chat</span>
        </a>
      </header>

      {/* 3. Hero Header Section */}
      <div className="bg-gradient-to-b from-white via-purple-50/20 to-[#FCFBFE] border-b border-brand-border/60 py-10 sm:py-14 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-primary-light text-brand-primary text-xs font-bold font-caps tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Customer Concierge & Support</span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl md:text-5xl font-bold text-brand-tertiary tracking-tight">
            We are Here to Assist You
          </h1>
          <p className="text-xs sm:text-sm text-brand-muted max-w-xl mx-auto font-light leading-relaxed">
            Have a question regarding your order, dispatch timeline, custom gift box curation, or jewelry styling?
            Connect with our Rajkot atelier concierge directly.
          </p>
        </div>
      </div>

      {/* 4. Main Body: Contact Cards & Inquiry Form */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        
        {/* Direct Channels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* WhatsApp Instant Chat */}
          <div className="bg-white rounded-2xl p-5 border border-brand-border/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
                <MessageCircle className="w-5 h-5 fill-emerald-600 text-white" />
              </div>
              <h3 className="font-serif font-bold text-sm text-brand-tertiary">WhatsApp Concierge</h3>
              <p className="text-[11.5px] text-brand-muted leading-relaxed font-light">
                Instant reply within minutes during operational hours.
              </p>
              <div className="font-mono text-xs font-bold text-emerald-800">{whatsappNumber}</div>
            </div>
            <a
              href={`https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(cs.whatsappMessage || 'Hello Valerie Jewels, I would like to inquire about an order.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center space-x-1.5 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs"
            >
              <span>Chat on WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Phone Call */}
          <div className="bg-white rounded-2xl p-5 border border-brand-border/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-brand-primary/40 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-brand-primary border border-purple-200">
                <Phone className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-brand-tertiary">Direct Helpline</h3>
              <p className="text-[11.5px] text-brand-muted leading-relaxed font-light">
                Available 7 days a week for immediate call support.
              </p>
              <div className="font-mono text-xs font-bold text-brand-primary">{phone}</div>
            </div>
            <a
              href={`tel:${cleanWaNumber}`}
              className="inline-flex items-center justify-center space-x-1.5 w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-brand-primary border border-purple-200 text-xs font-bold transition-all"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Us Now</span>
            </a>
          </div>

          {/* Email Support */}
          <div className="bg-white rounded-2xl p-5 border border-brand-border/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-brand-primary/40 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-brand-primary border border-purple-200">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-brand-tertiary">Official Email</h3>
              <p className="text-[11.5px] text-brand-muted leading-relaxed font-light">
                For order tracking, receipts, and custom corporate orders.
              </p>
              <div className="font-mono text-xs font-bold text-brand-primary truncate" title={email}>{email}</div>
            </div>
            <a
              href={`mailto:${email}?subject=Inquiry%20regarding%20Valerie%20Jewels`}
              className="inline-flex items-center justify-center space-x-1.5 w-full py-2 px-3 rounded-xl bg-white hover:bg-gray-50 text-brand-tertiary border border-brand-border text-xs font-bold transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Send Email</span>
            </a>
          </div>

          {/* Atelier Office */}
          <div className="bg-white rounded-2xl p-5 border border-brand-border/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-brand-primary/40 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-brand-primary border border-purple-200">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-brand-tertiary">Headquarters & Atelier</h3>
              <p className="text-[11.5px] text-brand-muted leading-relaxed font-light">
                {address}
              </p>
              <div className="flex items-center space-x-1 text-[11px] text-brand-muted">
                <Clock className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                <span>{hours}</span>
              </div>
            </div>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center space-x-1.5 w-full py-2 px-3 rounded-xl bg-[#FAF6FD] hover:bg-purple-100 text-[#8366B0] border border-purple-200/80 text-xs font-bold transition-all"
            >
              <InstagramIcon className="w-3.5 h-3.5" />
              <span>Follow {instagramHandle}</span>
            </a>
          </div>

        </div>

        {/* Contact Form & Quick Help Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Inquiry Form (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-brand-border shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="font-editorial text-2xl font-bold text-brand-tertiary">
                Send an Atelier Message
              </h2>
              <p className="text-xs text-brand-muted font-light">
                Fill in the details below and our concierge team will reach out directly.
              </p>
            </div>

            {submitted ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-bold text-emerald-900">Message Received!</h3>
                  <p className="text-xs text-emerald-700 font-light max-w-md mx-auto">
                    Thank you, {formData.name}. Our atelier customer care team has received your message and will respond promptly.
                  </p>
                </div>

                {waLink && (
                  <div className="pt-2">
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md"
                    >
                      <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                      <span>Also Open in WhatsApp for Faster Reply</span>
                    </a>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({
                      name: '',
                      email: '',
                      phone: '',
                      order_number: '',
                      subject: 'Order & Delivery Status',
                      message: '',
                    });
                  }}
                  className="text-xs text-brand-muted hover:underline block mx-auto pt-2"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-brand-tertiary">
                      Your Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Radhika Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-brand-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-brand-tertiary">
                      Phone Number (WhatsApp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-brand-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-brand-tertiary">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. radhika@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-brand-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-brand-tertiary">
                      Order Reference # (if applicable)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. #VJ-20261028-1234"
                      value={formData.order_number}
                      onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                      className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-brand-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-brand-tertiary">Inquiry Category</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-brand-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="Order & Delivery Status">Track My Order / Delivery Timeline</option>
                    <option value="Mystery Jar Inquiry">Mystery Jewellery Jar Inquiry</option>
                    <option value="Jhumka Box Collection">Jhumka Box 16-Pair / 12-Pair Box Inquiry</option>
                    <option value="Return or Exchange">Return, Refund or Damaged Item Notice</option>
                    <option value="Custom Gift Curation">Custom Gift Box / Bulk / Corporate Order</option>
                    <option value="Payment or COD Question">Payment, Advance Deposit or Fastrr Inquiry</option>
                    <option value="Other">Other Inquiry</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-brand-tertiary">
                    Your Message <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Tell us how we can help you..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-brand-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary resize-y"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-wider uppercase font-bold shadow-md transition-all active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? (
                      <span>Sending message...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Atelier Message</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(cs.whatsappMessage || 'Hello Valerie Jewels, I would like to inquire about an order.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-all flex items-center justify-center space-x-1.5"
                  >
                    <MessageCircle className="w-4 h-4 fill-emerald-600 text-white" />
                    <span>Prefer WhatsApp? Click Here</span>
                  </a>
                </div>
              </form>
            )}
          </div>

          {/* Quick Self-Service Hub (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-white rounded-3xl p-6 border border-brand-border shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-base text-brand-tertiary flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-brand-gold fill-current" />
                <span>Instant Self-Service</span>
              </h3>
              <p className="text-xs text-brand-muted font-light leading-relaxed">
                Need immediate answers? Check these quick self-service resources available 24/7.
              </p>

              <div className="space-y-2 pt-1">
                {/* Track Order */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenTracking) onOpenTracking();
                    else window.location.href = '/track-order';
                  }}
                  className="w-full p-3 rounded-xl bg-[#FAF8FC] hover:bg-purple-50/60 border border-brand-border text-left flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-white border border-brand-border text-brand-primary group-hover:scale-105 transition-transform">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-brand-tertiary">Track Order Dispatch</h4>
                      <p className="text-[10.5px] text-brand-muted">Check live AWB tracking and delivery date</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-brand-muted group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* FAQs */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenFaqs) onOpenFaqs();
                    else window.location.href = '/faqs';
                  }}
                  className="w-full p-3 rounded-xl bg-[#FAF8FC] hover:bg-purple-50/60 border border-brand-border text-left flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-white border border-brand-border text-brand-primary group-hover:scale-105 transition-transform">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-brand-tertiary">Help & FAQs</h4>
                      <p className="text-[10.5px] text-brand-muted">Answers regarding shipping, returns & jewelry care</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-brand-muted group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Return Policy */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenPolicy) onOpenPolicy('refund');
                    else window.location.href = '/refund-policy';
                  }}
                  className="w-full p-3 rounded-xl bg-[#FAF8FC] hover:bg-purple-50/60 border border-brand-border text-left flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-white border border-brand-border text-brand-primary group-hover:scale-105 transition-transform">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-brand-tertiary">Return & Refund Policy</h4>
                      <p className="text-[10.5px] text-brand-muted">5–7 day replacement window guidelines</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-brand-muted group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* Trust Assurance Strip */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/60 via-white to-amber-50/40 border border-purple-100 text-xs text-brand-tertiary space-y-2.5">
              <div className="flex items-center space-x-2 font-bold text-brand-primary">
                <ShieldCheck className="w-4 h-4 text-brand-primary" />
                <span>The Valerie Atelier Guarantee</span>
              </div>
              <ul className="text-[11px] text-brand-muted space-y-1.5 font-light leading-relaxed">
                <li>• Free insured delivery across 29,000+ Indian pincodes.</li>
                <li>• Complimentary luxury keepsake box included with every box order.</li>
                <li>• Instant response via WhatsApp from 8:00 AM to 4:00 PM IST.</li>
              </ul>
            </div>

          </div>

        </div>

      </main>

      {/* 5. Minimal Footer */}
      <footer className="bg-white border-t border-brand-border py-6 px-4 text-center text-xs text-brand-muted font-light">
        <p>© {new Date().getFullYear()} Valerie Jewels (VALERIÉ). All rights reserved. Headquartered in Rajkot, Gujarat, India.</p>
      </footer>
    </div>
  );
}
