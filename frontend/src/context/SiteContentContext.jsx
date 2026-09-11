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
    showBoxNumber: false,
    showPricePerPair: false,
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
        return { ...DEFAULT_SITE_CONTENT, ...parsed };
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

    const handleUpdate = () => {
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
