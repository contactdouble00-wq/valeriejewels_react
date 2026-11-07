import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { useSiteContent } from '../context/SiteContentContext';

/**
 * Responsive Temporary Announcement Banner
 * Displays storewide notices (e.g. Diwali festive holidays delivery delays).
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
  const text = banner?.text?.trim();

  if (!isEnabled || !text || isDismissed) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Store announcement"
      className="relative z-30 bg-gradient-to-r from-[#24133A] via-[#4A1A37] to-[#24133A] text-amber-100 border-b border-amber-400/25 px-4 py-2 sm:py-2.5 transition-all shadow-xs"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center text-center">
        <div className="flex items-center justify-center space-x-2 text-[11px] sm:text-xs md:text-[13px] font-medium tracking-wide pr-6 sm:pr-8">
          <span className="shrink-0 text-sm leading-none" role="img" aria-label="Diwali Diya">
            🪔
          </span>
          <span className="leading-snug text-amber-100/95 font-medium">
            {text}
          </span>
        </div>

        {/* Dismiss Button */}
        {!isPreview && (
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1 text-amber-200/60 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
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
