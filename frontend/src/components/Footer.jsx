import React, { useState } from 'react';
import {
  MapPin,
  Mail,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import InstagramIcon from './InstagramIcon';
import { useSiteContent } from '../context/SiteContentContext';
import { OriginalAmazonLogo, DEFAULT_AMAZON_STORE_URL } from './AmazonTrustBadge';

export function WhatsAppOutlineIcon({ className = "w-4 h-4 text-[#642A7F] shrink-0" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 21l1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
      <path d="M9 10c.5 1.5 2.5 3.5 4 4l1.5-1.5c.3-.3.7-.3 1 0l2 2c.3.3.3.7 0 1-.8.8-2 1.5-3 1.5-4 0-7.5-3.5-7.5-7.5 0-1 .7-2.2 1.5-3 .3-.3.7-.3 1 0l2 2c.3.3.3.7 0 1z" />
    </svg>
  );
}

export default function Footer({
  onOpenPolicy,
  onOpenFaqs,
  onOpenContact,
  onNavigateHome,
  setSelectedCategory,
  openPdp,
  openTracking,
}) {
  const { content } = useSiteContent();
  const support = content?.customerSupport || {};
  const amazonStore = content?.amazonStore || {};

  const address = support.address || 'Patel Chowk, Rajkot, Gujarat';
  const phone = support.phone || '+91 90234 22392';
  const waNum = support.whatsappNumber || '+91 90234 22392';
  const cleanWa = (waNum || '919023422392').replace(/\D/g, '');
  const email = support.email || 'orders@valeriejewels.in';
  const igHandle = support.instagramHandle || '@valeriejewels.in';
  const igUrl = support.instagramUrl || 'https://www.instagram.com/valeriejewels.in/';
  const rawHours = support.hours || '8:00 AM – 4:00 PM';
  const hours = rawHours.replace(/^7\s*days\s*a\s*week,?\s*/i, '');
  const waMsg = encodeURIComponent(
    support.whatsappMessage || 'Hello Valerie Jewels, I have an inquiry about my order / jewelry.'
  );
  const amazonUrl = amazonStore.url || DEFAULT_AMAZON_STORE_URL;
  const year = new Date().getFullYear();

  // Mobile Accordions state
  const [accordions, setAccordions] = useState({
    shop: false,
    help: false,
    info: false,
  });

  const toggleAccordion = (key) => {
    setAccordions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleJhumkaBoxes = (e) => {
    e.preventDefault();
    if (onNavigateHome) onNavigateHome();
    if (setSelectedCategory) setSelectedCategory('jhumka-boxes');
    window.history.pushState(null, '', '/jhumka-boxes');
    const el = document.getElementById('catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleMysteryJar = (e) => {
    e.preventDefault();
    if (openPdp) openPdp('mystery-jewellery-jar');
  };

  const handleNewArrivals = (e) => {
    e.preventDefault();
    if (onNavigateHome) onNavigateHome();
    if (setSelectedCategory) setSelectedCategory('new-arrivals');
    const el = document.getElementById('catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAllCollections = (e) => {
    e.preventDefault();
    if (onNavigateHome) onNavigateHome();
    if (setSelectedCategory) setSelectedCategory('all');
    const el = document.getElementById('catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-white border-t border-neutral-200 mt-16 text-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12 pb-6">

        {/* ============================================================ */}
        {/* 1. TOP SECTION: DESKTOP VIEW (5 Columns, Brand with divider) */}
        {/* ============================================================ */}
        <div className="hidden md:grid md:grid-cols-12 gap-8 pb-10">

          {/* Column 1: Brand Info */}
          <div className="md:col-span-4 lg:col-span-3.5 border-r border-neutral-200 pr-6 lg:pr-8 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="font-serif text-2xl lg:text-3xl tracking-[0.06em] text-[#642A7F] font-medium select-none block">
                VALERIÉ
              </span>
              <p className="text-xs text-neutral-600 font-normal leading-relaxed max-w-[260px]">
                Curated everyday luxury jewelry crafted for timeless elegance and effortless beauty.
              </p>
              <div className="pt-1">
                <span className="text-[11px] font-semibold text-neutral-800 tracking-[0.25em] uppercase block">
                  HOUSE OF VJ
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: SHOP */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-bold tracking-wider text-neutral-900 uppercase mb-4">
              SHOP
            </h3>
            <ul className="space-y-2.5 text-xs text-neutral-600 font-normal">
              <li>
                <a
                  href="/jhumka-boxes"
                  onClick={handleJhumkaBoxes}
                  className="hover:text-brand-primary transition-colors block"
                >
                  Jhumka Boxes
                </a>
              </li>
              <li>
                <a
                  href="/mystery-jewellery-jar"
                  onClick={handleMysteryJar}
                  className="hover:text-brand-primary transition-colors block"
                >
                  Mystery Jewellery Jar
                </a>
              </li>
              <li>
                <a
                  href="#new-arrivals"
                  onClick={handleNewArrivals}
                  className="hover:text-brand-primary transition-colors block"
                >
                  New Arrivals
                </a>
              </li>
              <li>
                <a
                  href="#catalog"
                  onClick={handleAllCollections}
                  className="hover:text-brand-primary transition-colors block"
                >
                  All Collections
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: HELP & SUPPORT */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-bold tracking-wider text-neutral-900 uppercase mb-4">
              HELP &amp; SUPPORT
            </h3>
            <ul className="space-y-2.5 text-xs text-neutral-600 font-normal">
              <li>
                <a
                  href="/shipping-policy"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onOpenPolicy) onOpenPolicy('shipping');
                  }}
                  className="hover:text-brand-primary transition-colors block"
                >
                  Shipping &amp; Delivery
                </a>
              </li>
              <li>
                <a
                  href="/refund-policy"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onOpenPolicy) onOpenPolicy('refund');
                  }}
                  className="hover:text-brand-primary transition-colors block"
                >
                  Returns &amp; Refunds
                </a>
              </li>
              <li>
                <a
                  href="#track-order"
                  onClick={(e) => {
                    e.preventDefault();
                    if (openTracking) openTracking();
                  }}
                  className="hover:text-brand-primary transition-colors block"
                >
                  Track Order
                </a>
              </li>
              <li>
                <a
                  href="/faqs"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onOpenFaqs) onOpenFaqs();
                  }}
                  className="hover:text-brand-primary transition-colors block"
                >
                  FAQs
                </a>
              </li>
              <li>
                <a
                  href="/contact-us"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onOpenContact) onOpenContact();
                  }}
                  className="hover:text-brand-primary transition-colors block"
                >
                  Contact Concierge
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: INFORMATION */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-bold tracking-wider text-neutral-900 uppercase mb-4">
              INFORMATION
            </h3>
            <ul className="space-y-2.5 text-xs text-neutral-600 font-normal">
              <li>
                <a
                  href="/about"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onOpenPolicy) onOpenPolicy('about');
                    else if (onOpenContact) onOpenContact();
                  }}
                  className="hover:text-brand-primary transition-colors block"
                >
                  About VALERIÉ
                </a>
              </li>
              <li>
                <a
                  href="/privacy-policy"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onOpenPolicy) onOpenPolicy('privacy');
                  }}
                  className="hover:text-brand-primary transition-colors block"
                >
                  Privacy Policy (DPDP 2023)
                </a>
              </li>
              <li>
                <a
                  href="/terms-and-conditions"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onOpenPolicy) onOpenPolicy('terms');
                  }}
                  className="hover:text-brand-primary transition-colors block"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Column 5: SHOP ON */}
          <div className="md:col-span-2 lg:col-span-2.5">
            <h3 className="text-xs font-bold tracking-wider text-neutral-900 uppercase mb-4">
              SHOP ON
            </h3>
            <a
              href={amazonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2.5 px-3 py-2 rounded-lg border border-neutral-300 bg-white hover:border-neutral-400 hover:shadow-2xs transition-all text-xs font-medium text-neutral-800 group"
              title="Visit Valerie Jewels Amazon Brand Store"
            >
              <OriginalAmazonLogo className="h-3.5 w-auto" />
              <span className="text-neutral-300 select-none">|</span>
              <span className="group-hover:text-brand-primary transition-colors">Amazon Brand Store</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-600 group-hover:text-brand-primary transition-colors shrink-0" />
            </a>
          </div>

        </div>

        {/* ============================================================ */}
        {/* 1. TOP SECTION: MOBILE VIEW (Centered Brand + Accordions)     */}
        {/* ============================================================ */}
        <div className="block md:hidden pb-4">

          {/* Centered Brand Block */}
          <div className="text-center pb-6">
            <span className="font-serif text-3xl tracking-[0.06em] text-[#642A7F] font-medium select-none block">
              VALERIÉ
            </span>
            <p className="text-xs text-neutral-600 font-normal leading-relaxed max-w-xs mx-auto mt-2">
              Curated everyday luxury jewelry crafted for timeless elegance and effortless beauty.
            </p>
            <div className="mt-3">
              <span className="text-xs font-semibold text-neutral-800 tracking-[0.25em] uppercase">
                HOUSE OF VJ
              </span>
            </div>
          </div>

          <div className="border-t border-neutral-200" />

          {/* 1. SHOP Accordion */}
          <div className="border-b border-neutral-200">
            <button
              type="button"
              onClick={() => toggleAccordion('shop')}
              className="w-full flex items-center justify-between py-3.5 text-xs font-bold tracking-wider text-neutral-900 uppercase cursor-pointer select-none text-left"
            >
              <span>SHOP</span>
              <ChevronDown
                className={`w-4 h-4 text-neutral-700 transition-transform duration-200 ${
                  accordions.shop ? 'rotate-180' : ''
                }`}
              />
            </button>
            {accordions.shop && (
              <ul className="pb-3.5 space-y-2.5 text-xs text-neutral-600 animate-in fade-in duration-150">
                <li>
                  <a href="/jhumka-boxes" onClick={handleJhumkaBoxes} className="block hover:text-brand-primary">
                    Jhumka Boxes
                  </a>
                </li>
                <li>
                  <a href="/mystery-jewellery-jar" onClick={handleMysteryJar} className="block hover:text-brand-primary">
                    Mystery Jewellery Jar
                  </a>
                </li>
                <li>
                  <a href="#new-arrivals" onClick={handleNewArrivals} className="block hover:text-brand-primary">
                    New Arrivals
                  </a>
                </li>
                <li>
                  <a href="#catalog" onClick={handleAllCollections} className="block hover:text-brand-primary">
                    All Collections
                  </a>
                </li>
              </ul>
            )}
          </div>

          {/* 2. HELP & SUPPORT Accordion */}
          <div className="border-b border-neutral-200">
            <button
              type="button"
              onClick={() => toggleAccordion('help')}
              className="w-full flex items-center justify-between py-3.5 text-xs font-bold tracking-wider text-neutral-900 uppercase cursor-pointer select-none text-left"
            >
              <span>HELP &amp; SUPPORT</span>
              <ChevronDown
                className={`w-4 h-4 text-neutral-700 transition-transform duration-200 ${
                  accordions.help ? 'rotate-180' : ''
                }`}
              />
            </button>
            {accordions.help && (
              <ul className="pb-3.5 space-y-2.5 text-xs text-neutral-600 animate-in fade-in duration-150">
                <li>
                  <a
                    href="/shipping-policy"
                    onClick={(e) => {
                      e.preventDefault();
                      if (onOpenPolicy) onOpenPolicy('shipping');
                    }}
                    className="block hover:text-brand-primary"
                  >
                    Shipping &amp; Delivery
                  </a>
                </li>
                <li>
                  <a
                    href="/refund-policy"
                    onClick={(e) => {
                      e.preventDefault();
                      if (onOpenPolicy) onOpenPolicy('refund');
                    }}
                    className="block hover:text-brand-primary"
                  >
                    Returns &amp; Refunds
                  </a>
                </li>
                <li>
                  <a
                    href="#track-order"
                    onClick={(e) => {
                      e.preventDefault();
                      if (openTracking) openTracking();
                    }}
                    className="block hover:text-brand-primary"
                  >
                    Track Order
                  </a>
                </li>
                <li>
                  <a
                    href="/faqs"
                    onClick={(e) => {
                      e.preventDefault();
                      if (onOpenFaqs) onOpenFaqs();
                    }}
                    className="block hover:text-brand-primary"
                  >
                    FAQs
                  </a>
                </li>
                <li>
                  <a
                    href="/contact-us"
                    onClick={(e) => {
                      e.preventDefault();
                      if (onOpenContact) onOpenContact();
                    }}
                    className="block hover:text-brand-primary"
                  >
                    Contact Concierge
                  </a>
                </li>
              </ul>
            )}
          </div>

          {/* 3. INFORMATION Accordion */}
          <div className="border-b border-neutral-200">
            <button
              type="button"
              onClick={() => toggleAccordion('info')}
              className="w-full flex items-center justify-between py-3.5 text-xs font-bold tracking-wider text-neutral-900 uppercase cursor-pointer select-none text-left"
            >
              <span>INFORMATION</span>
              <ChevronDown
                className={`w-4 h-4 text-neutral-700 transition-transform duration-200 ${
                  accordions.info ? 'rotate-180' : ''
                }`}
              />
            </button>
            {accordions.info && (
              <ul className="pb-3.5 space-y-2.5 text-xs text-neutral-600 animate-in fade-in duration-150">
                <li>
                  <a
                    href="/about"
                    onClick={(e) => {
                      e.preventDefault();
                      if (onOpenPolicy) onOpenPolicy('about');
                      else if (onOpenContact) onOpenContact();
                    }}
                    className="block hover:text-brand-primary"
                  >
                    About VALERIÉ
                  </a>
                </li>
                <li>
                  <a
                    href="/privacy-policy"
                    onClick={(e) => {
                      e.preventDefault();
                      if (onOpenPolicy) onOpenPolicy('privacy');
                    }}
                    className="block hover:text-brand-primary"
                  >
                    Privacy Policy (DPDP 2023)
                  </a>
                </li>
                <li>
                  <a
                    href="/terms-and-conditions"
                    onClick={(e) => {
                      e.preventDefault();
                      if (onOpenPolicy) onOpenPolicy('terms');
                    }}
                    className="block hover:text-brand-primary"
                  >
                    Terms of Service
                  </a>
                </li>
              </ul>
            )}
          </div>

          {/* 4. SHOP ON */}
          <div className="pt-5 pb-6 border-b border-neutral-200">
            <h3 className="text-xs font-bold tracking-wider text-neutral-900 uppercase mb-3">
              SHOP ON
            </h3>
            <a
              href={amazonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full max-w-sm py-2.5 px-4 rounded-xl border border-neutral-300 bg-white flex items-center justify-center space-x-3 hover:border-neutral-400 shadow-2xs transition-all text-xs font-medium text-neutral-800"
              title="Visit Valerie Jewels Amazon Brand Store"
            >
              <OriginalAmazonLogo className="h-4 w-auto" />
              <span className="text-neutral-300 select-none">|</span>
              <span>Amazon Brand Store</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
            </a>
          </div>

        </div>

        {/* ============================================================ */}
        {/* 2. VALUE PROPOSITIONS / FEATURES STRIP                       */}
        {/* ============================================================ */}
        <div className="border-t md:border-t-0 border-b border-neutral-200 py-4 sm:py-5">
          <div className="grid grid-cols-4 divide-x divide-neutral-200 text-center">
            <div className="px-1 sm:px-2 text-[10.5px] sm:text-xs md:text-sm font-semibold text-neutral-800 leading-tight flex items-center justify-center">
              Free Delivery Across India
            </div>
            <div className="px-1 sm:px-2 text-[10.5px] sm:text-xs md:text-sm font-semibold text-neutral-800 leading-tight flex items-center justify-center">
              5–7 Day Delivery
            </div>
            <div className="px-1 sm:px-2 text-[10.5px] sm:text-xs md:text-sm font-semibold text-neutral-800 leading-tight flex items-center justify-center">
              Secure Checkout
            </div>
            <div className="px-1 sm:px-2 text-[10.5px] sm:text-xs md:text-sm font-semibold text-neutral-800 leading-tight flex items-center justify-center">
              Easy Returns
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. CONTACT STRIP                                             */}
        {/* ============================================================ */}

        {/* Desktop View: Horizontal 4-Column Row with Dividers */}
        <div className="hidden md:grid md:grid-cols-4 divide-x divide-neutral-200 py-5 border-b border-neutral-200 text-xs text-neutral-800">
          <div className="flex items-center justify-center space-x-2 px-2 text-center">
            <MapPin className="w-4 h-4 text-[#642A7F] shrink-0" strokeWidth={1.8} />
            <span className="truncate">{address}</span>
          </div>
          <div className="flex items-center justify-center space-x-2 px-2 text-center">
            <WhatsAppOutlineIcon className="w-4 h-4 text-[#642A7F] shrink-0" />
            <a
              href={`https://wa.me/${cleanWa}?text=${waMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-primary transition-colors truncate"
            >
              {waNum} · WhatsApp
            </a>
          </div>
          <div className="flex items-center justify-center space-x-2 px-2 text-center">
            <Mail className="w-4 h-4 text-[#642A7F] shrink-0" strokeWidth={1.8} />
            <a
              href={`mailto:${email}`}
              className="hover:text-brand-primary transition-colors truncate"
            >
              {email}
            </a>
          </div>
          <div className="flex items-center justify-center space-x-2 px-2 text-center">
            <InstagramIcon className="w-4 h-4 text-[#642A7F] shrink-0" strokeWidth={1.8} />
            <a
              href={igUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-primary transition-colors truncate"
            >
              Instagram {igHandle}
            </a>
          </div>
        </div>

        {/* Mobile View: Vertical Stack */}
        <div className="flex flex-col space-y-4 py-4 md:hidden border-b border-neutral-200 text-xs sm:text-sm text-neutral-800">
          <div className="flex items-center space-x-3">
            <MapPin className="w-4 h-4 text-[#642A7F] shrink-0" strokeWidth={1.8} />
            <span>{address}</span>
          </div>
          <div className="flex items-center space-x-3">
            <WhatsAppOutlineIcon className="w-4 h-4 text-[#642A7F] shrink-0" />
            <a
              href={`https://wa.me/${cleanWa}?text=${waMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-primary transition-colors"
            >
              {waNum} · WhatsApp
            </a>
          </div>
          <div className="flex items-center space-x-3">
            <Mail className="w-4 h-4 text-[#642A7F] shrink-0" strokeWidth={1.8} />
            <a
              href={`mailto:${email}`}
              className="hover:text-brand-primary transition-colors"
            >
              {email}
            </a>
          </div>
          <div className="flex items-center space-x-3">
            <InstagramIcon className="w-4 h-4 text-[#642A7F] shrink-0" strokeWidth={1.8} />
            <a
              href={igUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-primary transition-colors"
            >
              Instagram {igHandle}
            </a>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. BOTTOM COPYRIGHT & SUPPORT HOURS                          */}
        {/* ============================================================ */}
        <div className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-neutral-600 gap-1.5 sm:gap-4 font-normal">
          <div>© {year} VALERIÉ. All rights reserved.</div>
          <div>Customer support: {hours}</div>
        </div>

        {/* Semantic SEO Description for Google & AI Engines (accessible to crawlers, visually unobtrusive) */}
        <div className="sr-only">
          <p>
            Valerie Jewels (VALERIÉ) is an Indian everyday luxury jewelry atelier offering signature festive jhumka keepsake boxes, surprise mystery jewellery jars, and curated everyday jewellery. Headquartered in Rajkot, Gujarat, India, delivering with insured express shipping across 29,000+ Indian pincodes. Follow our official Instagram page @valeriejewels.in and explore our verified Amazon Brand Store.
          </p>
        </div>

      </div>
    </footer>
  );
}
