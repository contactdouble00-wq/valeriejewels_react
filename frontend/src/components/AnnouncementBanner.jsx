import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSiteContent } from '../context/SiteContentContext';

/**
 * Responsive Temporary Festive Announcement Banner
 * Displays animated festive notices (e.g. Diwali festive season delivery delays).
 * Controlled fully via the Admin Panel (ON/OFF toggle and custom text).
 */
export default function AnnouncementBanner({ previewBanner = null, isPreview = false }) {
  const { content } = useSiteContent();
  const banner = previewBanner || content?.announcementBanner;

  const [isDismissed, setIsDismissed] = useState(false);

  // If text changes, reset dismissed state so new notices are immediately visible
  useEffect(() => {
    if (isPreview) return;
    try {
      if (typeof window !== 'undefined' && banner?.text) {
        const key = `valerie_announcement_dismissed_${banner.text.slice(0, 32)}`;
        const dismissed = window.sessionStorage.getItem(key);
        setIsDismissed(dismissed === 'true');
      }
    } catch (_) {}
  }, [banner?.text, isPreview]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (isPreview) return;
    try {
      if (typeof window !== 'undefined' && banner?.text) {
        const key = `valerie_announcement_dismissed_${banner.text.slice(0, 32)}`;
        window.sessionStorage.setItem(key, 'true');
      }
    } catch (_) {}
  };

  const isEnabled = banner?.enabled !== false && banner?.enabled !== 'false' && banner?.enabled !== 0 && banner?.enabled !== '0';
  const rawText = banner?.text?.trim() || '';

  if (!isPreview) {
    if (!isEnabled || !rawText || isDismissed) {
      return null;
    }
  } else {
    if (!rawText) {
      return (
        <div className="p-3 text-center text-xs text-brand-muted bg-gray-50 italic">
          No announcement message entered.
        </div>
      );
    }
  }

  // Strip leading diya emoji if present to avoid duplicate diya icons
  const cleanText = rawText.replace(/^🪔\s*/, '');

  return (
    <div
      role="region"
      aria-label="Store announcement"
      className={`relative z-30 overflow-hidden bg-gradient-to-r from-[#991B1B] via-[#C2410C] to-[#D97706] text-white border-b border-amber-300/30 px-4 py-2 sm:py-2.5 shadow-md animate-festive-gradient transition-all ${
        isPreview && !isEnabled ? 'opacity-60 ring-2 ring-dashed ring-amber-400' : ''
      }`}
    >
      {/* Moving festive light sheen sweep */}
      <div
        className="pointer-events-none absolute inset-0 -translate-x-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-light-sheen"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto flex items-center justify-center text-center">
        <div className="flex items-center justify-center space-x-2 text-[11px] sm:text-xs md:text-[13px] font-medium tracking-wide pr-6 sm:pr-8">
          <span
            className="shrink-0 text-sm sm:text-base leading-none animate-diya select-none"
            role="img"
            aria-label="Diwali Diya"
          >
            🪔
          </span>
          <span className="leading-snug text-white font-medium drop-shadow-xs">
            {cleanText}
          </span>
        </div>

        {/* Dismiss Button */}
        {!isPreview && (
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            aria-label="Close announcement"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
