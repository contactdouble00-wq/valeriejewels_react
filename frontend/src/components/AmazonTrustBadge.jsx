import React from 'react';
import { ExternalLink, CheckCircle2 } from 'lucide-react';
import { useSiteContent } from '../context/SiteContentContext';

export const DEFAULT_AMAZON_STORE_URL = 'https://www.amazon.in/s?rh=n%3A1951048031%2Cp_4%3AHOUSE%2BOF%2BVJ';
export const DEFAULT_AMAZON_STORE_NAME = 'HOUSE OF VJ';

/**
 * Clean Amazon Brand Logo / Smile SVG
 */
export function AmazonSmileLogo({ className = "h-3.5 w-auto" }) {
  return (
    <svg className={className} viewBox="0 0 100 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Amazon">
      {/* amazon text simplified */}
      <path
        d="M20.5 17.2c-.3-.2-1-.6-2.1-1.1-.9-.4-1.6-.7-2.1-1-.4-.3-.7-.6-.8-.9-.1-.3-.2-.7-.2-1.2 0-.8.3-1.4.9-1.8.6-.4 1.4-.6 2.4-.6.8 0 1.6.2 2.3.5.7.3 1.2.7 1.5 1.2.2.3.4.4.6.4.2 0 .4-.1.5-.4l1.3-1.8c.2-.3.1-.5-.1-.7-.7-.7-1.6-1.2-2.7-1.5-1.1-.3-2.3-.5-3.5-.5-1.8 0-3.3.4-4.4 1.3-1.1.9-1.7 2.1-1.7 3.6 0 .9.2 1.6.6 2.2.4.6 1 1.1 1.7 1.5.7.4 1.5.8 2.5 1.2.9.4 1.6.7 2 .9.4.2.7.5.8.8.1.3.2.7.2 1.1 0 .9-.3 1.6-1 2.1-.7.5-1.6.8-2.8.8-1.1 0-2.1-.2-3.1-.7-1-.5-1.7-1.1-2.1-1.8-.2-.3-.3-.4-.6-.4-.2 0-.4.1-.5.3l-1.4 1.8c-.2.3-.1.6.1.8.8 1 1.9 1.7 3.2 2.2 1.3.5 2.8.7 4.3.7 2 0 3.6-.5 4.8-1.4 1.2-.9 1.8-2.2 1.8-3.9 0-1-.2-1.8-.7-2.4-.3-.6-1-1.1-1.9-1.5z"
        fill="currentColor"
      />
      {/* Curved Smile Arrow */}
      <path
        d="M10 24c18 6.5 48 6.5 68-3"
        stroke="#FF9900"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M74.5 18.5c1.8 1 3.5 2.5 4 4.5-.8-.1-2.6-.6-4.5-1.5-.4-.2-.5-.5-.4-.8.1-.4.5-.6.9-2.2z"
        fill="#FF9900"
      />
    </svg>
  );
}

export default function AmazonTrustBadge({ variant = 'strip', className = '' }) {
  const { content } = useSiteContent();
  const amazon = content?.amazonStore || {};
  
  if (amazon.enabled === false || amazon.enabled === 'false') {
    return null;
  }

  const storeUrl = amazon.url || DEFAULT_AMAZON_STORE_URL;
  const storeName = amazon.storeName || DEFAULT_AMAZON_STORE_NAME;

  // 1. Variant: Trust Strip on Homepage (Below Pillars)
  if (variant === 'strip') {
    return (
      <div className={`mt-5 pt-4 border-t border-brand-border/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${className}`}>
        <div className="flex items-center space-x-2.5 text-brand-tertiary">
          <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-700 flex items-center justify-center font-bold text-[11px] shrink-0">
            ✓
          </span>
          <span className="text-xs font-medium text-brand-tertiary">
            Also available on <span className="font-bold text-brand-tertiary">Amazon India</span>
            <span className="text-brand-muted font-light hidden sm:inline"> — Verified storefront: <span className="font-semibold text-brand-tertiary">{storeName}</span></span>
          </span>
        </div>
        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1.5 text-brand-primary hover:text-brand-primary/80 font-semibold text-xs transition-colors shrink-0 group"
          title={`Visit ${storeName} on Amazon India`}
        >
          <span>Visit Amazon Store</span>
          <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>
    );
  }

  // 2. Variant: Product Detail Modal (PDP)
  if (variant === 'pdp') {
    return (
      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`p-3 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50/50 via-white to-orange-50/30 hover:border-amber-400 hover:shadow-xs transition-all flex items-center justify-between group ${className}`}
        title={`Explore ${storeName} on Amazon`}
      >
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#232F3E] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            <span className="font-serif font-black tracking-tight text-amber-400">a</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-brand-tertiary block text-[11.5px]">Also Available on Amazon</span>
              <span className="text-[8.5px] font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.2 rounded-full border border-amber-300/60">
                Verified
              </span>
            </div>
            <span className="text-[10px] text-brand-muted font-light">Official Storefront: {storeName}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-medium text-brand-primary group-hover:translate-x-0.5 transition-transform">
          <span>View Store</span>
          <ExternalLink className="w-3 h-3" />
        </div>
      </a>
    );
  }

  // 3. Variant: Global Footer Tagline Badge
  if (variant === 'footer') {
    return (
      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#FAF7FC] border border-brand-border hover:border-brand-primary/50 text-xs text-brand-tertiary font-medium transition-all group ${className}`}
        title={`Visit ${storeName} on Amazon`}
      >
        <span className="w-4 h-4 rounded-full bg-[#232F3E] text-amber-400 flex items-center justify-center font-bold text-[9px] shrink-0">
          a
        </span>
        <span>Also available on <strong className="font-semibold text-brand-tertiary">Amazon</strong> ({storeName})</span>
        <ExternalLink className="w-3 h-3 text-brand-muted group-hover:text-brand-primary transition-colors" />
      </a>
    );
  }

  // 4. Variant: Mobile Sidebar Drawer
  if (variant === 'sidebar') {
    return (
      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`w-full py-2.5 px-3 rounded-xl bg-amber-50/70 hover:bg-amber-100/70 text-brand-tertiary border border-amber-200/60 text-xs font-medium flex items-center justify-between transition-colors ${className}`}
        title={`Visit ${storeName} on Amazon`}
      >
        <div className="flex items-center space-x-2.5">
          <span className="w-4 h-4 rounded-full bg-[#232F3E] text-amber-400 flex items-center justify-center font-bold text-[9px] shrink-0">
            a
          </span>
          <span className="text-[11.5px]">Also on <strong>Amazon</strong> ({storeName})</span>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-brand-muted" />
      </a>
    );
  }

  return null;
}
