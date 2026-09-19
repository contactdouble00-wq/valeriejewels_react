import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { DEFAULT_MOBILE_SLIDES } from '../components/MobileHeroSlider';

const DEFAULT_SITE_CONTENT = {
  topRibbon: {
    enabled: true,
    text: 'COMPLIMENTARY EXPRESS DELIVERY ON ALL ORDERS ABOVE',
    highlightAmount: '₹999',
    suffix: '• 18K GOLD PVD ANTI-TARNISH',
  },
  mobileSlider: {
    enabled: true,
    autoPlay: true,
    interval: 4500,
    slides: DEFAULT_MOBILE_SLIDES,
  },
  heroBanner: {
    badgeText: '18K PVD Anti-Tarnish Everyday Luxury',
    headline: 'Curated everyday jewelry,',
    accentText: 'designed to shine forever.',
    subtitle: 'Waterproof, shower-safe, and hypoallergenic accessories crafted in premium 316L stainless steel and 18K gold. Priced honestly from ₹500 to ₹1,500.',
    primaryBtnText: 'Shop 4 Jhumka Boxes',
    primaryBtnLink: '#jhumka-boxes',
    secondaryBtnText: 'All Everyday Jewelry',
    secondaryBtnLink: '#catalog',
    rightImageUrl: '/hero-jewelry-model.jpg',
  },
  jhumkaHero: {
    badgeText: '#1 Ad Bestseller Collection • 12,000+ Delivered',
    titleLine1: 'The 4 Signature',
    titleLine2: 'Jhumka Treasure Boxes',
    subtitle: 'Our most viral handcrafted collections. Each box brings 5 to 6 curated jhumka pairs inside a luxury keepsake box with anti-tarnish micro gold polish and lightweight comfort.',
    pill1: '5–6 Curated Pairs Per Box',
    pill2: 'Zero Earache • Featherlight',
    pill3: 'Save up to 50% vs Single Pairs',
    showBoxNumber: true,
    showPricePerPair: true,
  },
  catalogHeader: {
    eyebrow: 'Curated Catalog',
    title: 'Discover Everyday Fine Jewelry',
  },
  combosHeader: {
    eyebrow: 'Curated Pairings',
    title: 'Jewelry Combo Sets & Duos',
    subtitle: 'Expertly styled layered pairings with bundle-exclusive discounts up to 45%.',
  },
  festivalOffer: {
    enabled: true,
    badgeText: '✨ GRAND FESTIVE CELEBRATION • LIMITED EDITION',
    headline: 'The Royal Festive Edit',
    subtitle: 'Celebrate auspicious traditions with 18K gold PVD anti-tarnish jewelry. Handcrafted for festivities, weddings, and every luminous moment.',
    countdownEnabled: true,
    countdownEndDate: '2026-11-15T23:59:59',
    countdownLabel: 'FESTIVE CELEBRATION OFFERS END IN:',
    couponCode: 'FESTIVE20',
    couponDiscount: 'FLAT 20% OFF',
    couponDescription: 'Applicable on all handcrafted festive jhumka boxes & fine jewelry above ₹999.',
    perk1Title: 'Free Velvet Keepsake Box',
    perk1Desc: 'Luxury royal unboxing packaging included complimentary with all festive orders.',
    perk2Title: 'Extra ₹50 OFF + Free Gift',
    perk2Desc: 'Instant discount & complimentary zircon necklace on 1-Click Fastrr Prepaid.',
    perk3Title: 'Shiprocket Priority Express',
    perk3Desc: 'Priority dispatch & insured delivery across 29,000+ Indian pincodes.',
  },
  trustStrip: [
    {
      id: 'pillar1',
      title: '100% Anti-Tarnish',
      desc: 'High-grade 18K PVD coating guaranteed not to fade or tarnish.',
    },
    {
      id: 'pillar2',
      title: 'Water & Sweat Proof',
      desc: 'Wear comfortably in the shower, gym, or pool with zero worry.',
    },
    {
      id: 'pillar3',
      title: 'Hypoallergenic Skin-Safe',
      desc: 'Zero nickel, zero lead. Designed for the most sensitive skin.',
    },
    {
      id: 'pillar4',
      title: 'Shiprocket Express',
      desc: 'Dispatched via premium couriers across 29,000+ Indian pincodes.',
    },
  ],
  telemetryBanner: {
    enabled: false,
    title: 'Phase 4 Authentication & Guest Mode Active',
    subtitle: 'Guest checkout supported • Customer JWT optional • Secure staff role partitioning active.',
  },
};

const SiteContentContext = createContext({
  content: DEFAULT_SITE_CONTENT,
  refreshContent: () => {},
  loading: false,
});

export function SiteContentProvider({ children }) {
  const [content, setContent] = useState(() => {
    try {
      const cached = localStorage.getItem('valerie_site_content_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...DEFAULT_SITE_CONTENT,
          ...parsed,
          festivalOffer: {
            ...DEFAULT_SITE_CONTENT.festivalOffer,
            ...(parsed.festivalOffer || {}),
            enabled: parsed.festivalOffer?.enabled !== undefined
              ? (parsed.festivalOffer.enabled !== false && parsed.festivalOffer.enabled !== 'false' && parsed.festivalOffer.enabled !== 0 && parsed.festivalOffer.enabled !== '0')
              : true,
          },
        };
      }
    } catch {}
    return DEFAULT_SITE_CONTENT;
  });
  const [loading, setLoading] = useState(false);

  const fetchContent = useCallback(async () => {
    try {
      const res = await apiService.get('/settings/get.php');
      if (res && res.data) {
        setContent((prev) => {
          const merged = {
            ...DEFAULT_SITE_CONTENT,
            ...res.data,
            topRibbon: { ...DEFAULT_SITE_CONTENT.topRibbon, ...(res.data.topRibbon || {}) },
            heroBanner: { ...DEFAULT_SITE_CONTENT.heroBanner, ...(res.data.heroBanner || {}) },
            jhumkaHero: { ...DEFAULT_SITE_CONTENT.jhumkaHero, ...(res.data.jhumkaHero || {}) },
            catalogHeader: { ...DEFAULT_SITE_CONTENT.catalogHeader, ...(res.data.catalogHeader || {}) },
            combosHeader: { ...DEFAULT_SITE_CONTENT.combosHeader, ...(res.data.combosHeader || {}) },
            festivalOffer: {
              ...DEFAULT_SITE_CONTENT.festivalOffer,
              ...(res.data.festivalOffer || {}),
              enabled: res.data.festivalOffer?.enabled !== undefined
                ? (res.data.festivalOffer.enabled !== false && res.data.festivalOffer.enabled !== 'false' && res.data.festivalOffer.enabled !== 0 && res.data.festivalOffer.enabled !== '0')
                : true,
            },
            trustStrip: Array.isArray(res.data.trustStrip) && res.data.trustStrip.length > 0
              ? res.data.trustStrip
              : DEFAULT_SITE_CONTENT.trustStrip,
            mobileSlider: {
              ...DEFAULT_SITE_CONTENT.mobileSlider,
              ...(res.data.mobileSlider || {}),
              slides: Array.isArray(res.data.mobileSlider?.slides) && res.data.mobileSlider.slides.length > 0
                ? res.data.mobileSlider.slides
                : DEFAULT_SITE_CONTENT.mobileSlider.slides,
            },
            telemetryBanner: { ...DEFAULT_SITE_CONTENT.telemetryBanner, ...(res.data.telemetryBanner || {}) },
          };
          try {
            localStorage.setItem('valerie_site_content_cache', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    } catch (err) {
      console.warn('Could not load dynamic site content, using defaults/cached:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();

    const handleUpdate = (e) => {
      if (e?.detail) {
        setContent((prev) => {
          const incoming = e.detail;
          const merged = {
            ...prev,
            ...incoming,
            festivalOffer: {
              ...prev.festivalOffer,
              ...(incoming.festivalOffer || {}),
              enabled: incoming.festivalOffer?.enabled !== undefined
                ? (incoming.festivalOffer.enabled !== false && incoming.festivalOffer.enabled !== 'false' && incoming.festivalOffer.enabled !== 0 && incoming.festivalOffer.enabled !== '0')
                : (prev.festivalOffer?.enabled ?? true),
            },
          };
          try {
            localStorage.setItem('valerie_site_content_cache', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
      fetchContent();
    };

    const handleStorage = (e) => {
      if (e.key === 'valerie_settings_updated') {
        fetchContent();
      }
    };

    window.addEventListener('valerie_settings_updated', handleUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('valerie_settings_updated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchContent]);

  return (
    <SiteContentContext.Provider value={{ content, refreshContent: fetchContent, loading, DEFAULT_SITE_CONTENT }}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent() {
  const context = useContext(SiteContentContext);
  if (!context) {
    return { content: DEFAULT_SITE_CONTENT, refreshContent: () => {}, loading: false, DEFAULT_SITE_CONTENT };
  }
  return context;
}
