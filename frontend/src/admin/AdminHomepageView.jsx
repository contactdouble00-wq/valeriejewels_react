import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Eye,
  Sliders,
  Flame,
  Tag,
  ShieldCheck,
  Truck,
  ArrowRight,
  Droplet,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Smartphone,
  Plus,
  ChevronUp,
  ChevronDown,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { adminApi } from './adminApi';

const FACTORY_DEFAULTS = {
  mobileSlider: {
    enabled: true,
    autoPlay: true,
    interval: 4500,
    slides: [
      {
        id: 'slide-1',
        imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=85',
        title: 'The Everyday Diamond Edit',
        subtitle: 'Under ₹999 Luxury Collection',
        buttonText: 'SHOP NOW',
        linkUrl: '#catalog',
        isActive: true,
      },
      {
        id: 'slide-2',
        imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=85',
        title: 'The 4 Signature Jhumka Boxes',
        subtitle: 'Viral 5 to 6 Pair Festive Keepsakes',
        buttonText: 'EXPLORE BOXES',
        linkUrl: '#jhumka-boxes',
        isActive: true,
      },
      {
        id: 'slide-3',
        imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=85',
        title: '18K Anti-Tarnish Everyday Edit',
        subtitle: 'Waterproof & Shower-Safe PVD Gold',
        buttonText: 'SHOP COLLECTION',
        linkUrl: '#catalog',
        isActive: true,
      },
      {
        id: 'slide-4',
        imageUrl: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=900&q=85',
        title: 'Statement Pairings & Duos',
        subtitle: 'Layered Elegance with Free Express Delivery',
        buttonText: 'VIEW PIECES',
        linkUrl: '#jhumka-boxes',
        isActive: true,
      },
    ],
  },
  topRibbon: {
    enabled: true,
    text: 'COMPLIMENTARY EXPRESS DELIVERY ON ALL ORDERS ABOVE',
    highlightAmount: '₹999',
    suffix: '• 18K GOLD PVD ANTI-TARNISH',
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
    pairsBadgeSuffix: 'Pairs Inside',
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

export default function AdminHomepageView() {
  const [formData, setFormData] = useState(FACTORY_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const [activeSection, setActiveSection] = useState('mobileSlider');
  const [uploadingHeroPhoto, setUploadingHeroPhoto] = useState(false);
  const [uploadingSlideIndex, setUploadingSlideIndex] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getHomepageSettings();
      if (data) {
        setFormData({
          ...FACTORY_DEFAULTS,
          ...data,
          mobileSlider: {
            ...FACTORY_DEFAULTS.mobileSlider,
            ...(data.mobileSlider || {}),
            slides: Array.isArray(data.mobileSlider?.slides) && data.mobileSlider.slides.length > 0
              ? data.mobileSlider.slides
              : FACTORY_DEFAULTS.mobileSlider.slides,
          },
          topRibbon: { ...FACTORY_DEFAULTS.topRibbon, ...(data.topRibbon || {}) },
          heroBanner: { ...FACTORY_DEFAULTS.heroBanner, ...(data.heroBanner || {}) },
          jhumkaHero: { ...FACTORY_DEFAULTS.jhumkaHero, ...(data.jhumkaHero || {}) },
          catalogHeader: { ...FACTORY_DEFAULTS.catalogHeader, ...(data.catalogHeader || {}) },
          combosHeader: { ...FACTORY_DEFAULTS.combosHeader, ...(data.combosHeader || {}) },
          trustStrip: Array.isArray(data.trustStrip) && data.trustStrip.length > 0
            ? data.trustStrip
            : FACTORY_DEFAULTS.trustStrip,
          telemetryBanner: { ...FACTORY_DEFAULTS.telemetryBanner, ...(data.telemetryBanner || {}) },
        });
      }
    } catch (err) {
      console.warn('Could not load remote settings, using local defaults:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await adminApi.updateHomepageSettings(formData);
      setFeedback({
        type: 'success',
        message: 'Homepage banners, posters and text updated! Changes are now live on the storefront.',
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update homepage settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleHeroPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHeroPhoto(true);
    try {
      const res = await adminApi.uploadMedia(file);
      if (res && res.url) {
        updateNested('heroBanner', 'rightImageUrl', res.url);
        setFeedback({
          type: 'success',
          message: 'Hero photograph uploaded! Click "Save Live Changes" to publish.',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to upload photo.',
      });
    } finally {
      setUploadingHeroPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const addSlide = () => {
    const newSlide = {
      id: 'slide-' + Date.now(),
      imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=85',
      title: 'New Poster Edit',
      subtitle: 'Under ₹999 Luxury Collection',
      buttonText: 'SHOP NOW',
      linkUrl: '#catalog',
      isActive: true,
    };
    setFormData((prev) => ({
      ...prev,
      mobileSlider: {
        ...prev.mobileSlider,
        slides: [...(prev.mobileSlider?.slides || []), newSlide],
      },
    }));
    setFeedback({
      type: 'success',
      message: 'New slide added! You can upload an image and click "Save Live Changes".',
    });
  };

  const removeSlide = (idx) => {
    if ((formData.mobileSlider?.slides?.length || 0) <= 1) {
      alert('You must keep at least 1 slide in the mobile slider.');
      return;
    }
    if (!window.confirm(`Delete slide ${idx + 1}?`)) return;
    setFormData((prev) => {
      const updated = prev.mobileSlider.slides.filter((_, i) => i !== idx);
      return {
        ...prev,
        mobileSlider: {
          ...prev.mobileSlider,
          slides: updated,
        },
      };
    });
  };

  const updateSlide = (idx, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.mobileSlider?.slides || [])];
      updated[idx] = { ...updated[idx], [field]: value };
      return {
        ...prev,
        mobileSlider: {
          ...prev.mobileSlider,
          slides: updated,
        },
      };
    });
  };

  const moveSlide = (idx, direction) => {
    setFormData((prev) => {
      const slides = [...(prev.mobileSlider?.slides || [])];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= slides.length) return prev;
      const temp = slides[idx];
      slides[idx] = slides[targetIdx];
      slides[targetIdx] = temp;
      return {
        ...prev,
        mobileSlider: {
          ...prev.mobileSlider,
          slides,
        },
      };
    });
  };

  const handleSlideUpload = async (e, idx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlideIndex(idx);
    try {
      const res = await adminApi.uploadMedia(file);
      if (res && res.url) {
        updateSlide(idx, 'imageUrl', res.url);
        setFeedback({
          type: 'success',
          message: `Slide ${idx + 1} poster uploaded successfully! Click "Save Live Changes" to publish.`,
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to upload slide image.',
      });
    } finally {
      setUploadingSlideIndex(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all homepage banners, mobile slider, and text to factory original defaults?')) {
      setFormData(FACTORY_DEFAULTS);
      setFeedback({
        type: 'success',
        message: 'Reverted to defaults in editor. Click "Save Live Changes" to publish.',
      });
    }
  };

  // Field change helpers
  const updateNested = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const updateTrustPillar = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.trustStrip];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, trustStrip: updated };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const sections = [
    { id: 'mobileSlider', label: 'Mobile Poster Slider (Tanishq Style)', icon: Smartphone },
    { id: 'ribbon', label: 'Top Announcement Ribbon', icon: Sparkles },
    { id: 'hero', label: 'Desktop Hero Banner', icon: Sliders },
    { id: 'jhumka', label: '4 Jhumka Boxes Spotlight', icon: Flame },
    { id: 'catalog', label: 'Catalog & Combos Headers', icon: Tag },
    { id: 'trust', label: 'Trust Strip (4 Pillars)', icon: ShieldCheck },
    { id: 'telemetry', label: 'Developer System Banner', icon: Eye },
  ];

  return (
    <div className="p-6 sm:p-8 space-y-6 w-full">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-brand-border shadow-xs">
        <div>
          <div className="inline-flex items-center space-x-2 text-[10px] font-caps uppercase tracking-widest text-brand-primary font-bold">
            <Sliders className="w-3.5 h-3.5" />
            <span>Storefront Visual Customizer</span>
          </div>
          <h2 className="text-2xl font-editorial font-bold text-brand-tertiary mt-1">
            Homepage Banners & Text Control
          </h2>
          <p className="text-xs text-brand-muted font-light mt-0.5">
            Modify any headline, badge, subtitle, or button. Edits broadcast to the live storefront immediately without page reloads.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl border border-brand-border text-xs font-semibold text-brand-muted hover:text-brand-tertiary hover:border-gray-400 transition-colors flex items-center space-x-1.5"
            title="Revert back to default marketing copy"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold tracking-wider uppercase shadow-md hover:bg-brand-primary-hover disabled:opacity-50 transition-all flex items-center space-x-2 active:scale-95"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save Live Changes'}</span>
          </button>
        </div>
      </div>

      {/* Status Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-3 text-xs font-medium animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide whitespace-nowrap transition-all flex items-center space-x-2 ${
                isActive
                  ? 'bg-brand-primary text-white shadow-xs font-bold'
                  : 'bg-white border border-brand-border text-brand-tertiary hover:border-brand-primary/40'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-brand-muted'}`} />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 shadow-xs space-y-6">

        {/* 0. MOBILE HERO POSTER SLIDER (TANISHQ STYLE) */}
        {activeSection === 'mobileSlider' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/60 pb-5">
              <div>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-brand-primary-light text-brand-primary text-[10px] font-caps uppercase tracking-wider font-bold mb-1">
                  <Smartphone className="w-3 h-3" />
                  <span>Mobile Viewport Exclusive</span>
                </div>
                <h3 className="text-lg font-editorial font-bold text-brand-tertiary">
                  Mobile Poster Slider (Tanishq Style)
                </h3>
                <p className="text-xs text-brand-muted font-light max-w-2xl mt-0.5">
                  Replaces the text banner on mobile viewports with an auto-playing, touch-swipable luxury poster slider with diamond indicators. Upload any number of slides, reorder them, or set custom landing links.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={addSlide}
                  className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold tracking-wider uppercase shadow-xs flex items-center space-x-1.5 active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Slide ({formData.mobileSlider?.slides?.length || 0})</span>
                </button>
              </div>
            </div>

            {/* Slider Master Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#FAF8FD] border border-brand-border/60">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.mobileSlider?.enabled !== false}
                  onChange={(e) => updateNested('mobileSlider', 'enabled', e.target.checked)}
                  className="rounded text-brand-primary focus:ring-brand-primary h-4 w-4"
                />
                <div>
                  <span className="text-xs font-bold text-brand-tertiary block">Enable Mobile Slider</span>
                  <span className="text-[10px] text-brand-muted font-light">Show poster slider on mobile devices</span>
                </div>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.mobileSlider?.autoPlay !== false}
                  onChange={(e) => updateNested('mobileSlider', 'autoPlay', e.target.checked)}
                  className="rounded text-brand-primary focus:ring-brand-primary h-4 w-4"
                />
                <div>
                  <span className="text-xs font-bold text-brand-tertiary block">Auto-Play Carousel</span>
                  <span className="text-[10px] text-brand-muted font-light">Automatically advances slides</span>
                </div>
              </label>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-tertiary">Slide Duration</span>
                  <span className="text-[11px] font-mono text-brand-primary font-bold">
                    {((formData.mobileSlider?.interval || 4500) / 1000).toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="2500"
                  max="8000"
                  step="500"
                  value={formData.mobileSlider?.interval || 4500}
                  onChange={(e) => updateNested('mobileSlider', 'interval', Number(e.target.value))}
                  className="w-full accent-brand-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Live Mobile Interactive Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-caps uppercase tracking-wider text-brand-muted font-bold block">
                  Live Mobile Storefront Preview:
                </span>
                <span className="text-[11px] text-brand-muted font-light">
                  {formData.mobileSlider?.slides?.length || 0} total slides in rotation
                </span>
              </div>

              {/* Centered Phone Mockup Frame */}
              <div className="max-w-xs mx-auto bg-white p-3 rounded-2xl border-2 border-brand-primary/20 shadow-md">
                <div className="relative w-full aspect-square rounded-t-none rounded-b-xl overflow-hidden bg-gray-100 border border-brand-border">
                  {/* First active slide preview */}
                  {(() => {
                    const activeSlides = (formData.mobileSlider?.slides || []).filter((s) => s.isActive !== false);
                    const previewSlide = activeSlides[0] || formData.mobileSlider?.slides?.[0];
                    if (!previewSlide) {
                      return (
                        <div className="w-full h-full flex items-center justify-center text-xs text-brand-muted">
                          No slides added yet. Click "Add Slide" below.
                        </div>
                      );
                    }
                    return (
                      <div className="relative w-full h-full flex items-end">
                        <img
                          src={previewSlide.imageUrl}
                          alt="Mobile Poster Preview"
                          className="absolute inset-0 w-full h-full object-cover object-center"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
                        <div className="relative z-10 w-full p-4 flex items-end justify-between gap-2">
                          <div className="text-white space-y-0.5 max-w-[70%]">
                            {previewSlide.subtitle && (
                              <p className="text-[9px] font-caps uppercase tracking-widest text-white/90 font-semibold truncate">
                                {previewSlide.subtitle}
                              </p>
                            )}
                            {previewSlide.title && (
                              <h4 className="text-base font-editorial font-bold text-white leading-tight truncate">
                                {previewSlide.title}
                              </h4>
                            )}
                          </div>
                          {previewSlide.buttonText && (
                            <span className="shrink-0 px-3 py-1.5 rounded bg-white text-brand-tertiary text-[10px] font-caps tracking-widest uppercase font-bold shadow-md flex items-center space-x-1">
                              <span>{previewSlide.buttonText}</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Reference Diamond Indicators */}
                <div className="flex items-center justify-center space-x-2 pt-2.5 pb-1">
                  {(formData.mobileSlider?.slides || []).map((_, idx) => (
                    <span
                      key={idx}
                      className={`block transform rotate-45 transition-all ${
                        idx === 0
                          ? 'w-2 h-2 bg-[#8366B0]'
                          : 'w-1.5 h-1.5 bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Slides List & Editor Cards */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-brand-border pb-2">
                <h4 className="text-sm font-editorial font-bold text-brand-tertiary">
                  Manage Poster Slides ({formData.mobileSlider?.slides?.length || 0})
                </h4>
                <button
                  type="button"
                  onClick={addSlide}
                  className="text-xs text-brand-primary hover:text-brand-primary-hover font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Slide</span>
                </button>
              </div>

              <div className="space-y-4">
                {(formData.mobileSlider?.slides || []).map((slide, idx) => (
                  <div
                    key={slide.id || idx}
                    className="p-4 sm:p-5 rounded-xl border border-brand-border bg-[#FAF8FD]/40 space-y-4 transition-all hover:border-brand-primary/40"
                  >
                    {/* Top Bar of Card */}
                    <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-6 h-6 rounded-full bg-brand-primary text-white text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-brand-tertiary">
                          Slide #{idx + 1}: {slide.title || 'Untitled Poster'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Reorder Buttons */}
                        <button
                          type="button"
                          onClick={() => moveSlide(idx, 'up')}
                          disabled={idx === 0}
                          title="Move Slide Up"
                          className="p-1.5 rounded-lg border border-brand-border bg-white text-brand-tertiary hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSlide(idx, 'down')}
                          disabled={idx === (formData.mobileSlider?.slides?.length || 1) - 1}
                          title="Move Slide Down"
                          className="p-1.5 rounded-lg border border-brand-border bg-white text-brand-tertiary hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Active Checkbox */}
                        <label className="flex items-center space-x-1.5 px-2 py-1 rounded-lg border border-brand-border bg-white cursor-pointer text-[11px] font-semibold text-brand-tertiary">
                          <input
                            type="checkbox"
                            checked={slide.isActive !== false}
                            onChange={(e) => updateSlide(idx, 'isActive', e.target.checked)}
                            className="rounded text-brand-primary focus:ring-brand-primary h-3.5 w-3.5"
                          />
                          <span>Active</span>
                        </label>

                        {/* Delete Slide */}
                        <button
                          type="button"
                          onClick={() => removeSlide(idx)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete this slide"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Image Upload & Poster Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                      {/* Left: Thumbnail & File Upload */}
                      <div className="md:col-span-4 space-y-2">
                        <label className="text-xs font-bold text-brand-tertiary block">
                          Poster Image
                        </label>
                        <div className="relative aspect-square w-full max-w-[180px] rounded-t-none rounded-b-xl overflow-hidden border border-brand-border bg-gray-50 group">
                          <img
                            src={slide.imageUrl}
                            alt={`Slide ${idx + 1}`}
                            className="w-full h-full object-cover object-center"
                          />
                          {uploadingSlideIndex === idx && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white space-y-1">
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-[10px] font-medium">Uploading...</span>
                            </div>
                          )}
                        </div>

                        {/* Direct File Upload Button */}
                        <div className="pt-1">
                          <label className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-brand-border text-brand-tertiary hover:border-brand-primary text-xs font-semibold cursor-pointer shadow-2xs active:scale-95 transition-all">
                            <UploadCloud className="w-3.5 h-3.5 text-brand-primary" />
                            <span>{uploadingSlideIndex === idx ? 'Uploading...' : 'Upload Image File'}</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/jpg"
                              onChange={(e) => handleSlideUpload(e, idx)}
                              disabled={uploadingSlideIndex === idx}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Image URL text fallback */}
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] text-brand-muted font-light block">Or paste image URL:</span>
                          <input
                            type="text"
                            value={slide.imageUrl}
                            onChange={(e) => updateSlide(idx, 'imageUrl', e.target.value)}
                            placeholder="https://images.unsplash.com/..."
                            className="w-full px-3 py-1.5 rounded-lg border border-brand-border text-[11px] font-mono bg-white focus:outline-none focus:border-brand-primary"
                          />
                        </div>
                      </div>

                      {/* Right: Slide Text & Destination Settings */}
                      <div className="md:col-span-8 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-brand-tertiary block">
                              Subtitle / Eyebrow Text
                            </label>
                            <input
                              type="text"
                              value={slide.subtitle || ''}
                              onChange={(e) => updateSlide(idx, 'subtitle', e.target.value)}
                              placeholder="e.g. Under 30k • The Everyday Diamond Edit"
                              className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs bg-white focus:outline-none focus:border-brand-primary"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-brand-tertiary block">
                              Main Title Headline
                            </label>
                            <input
                              type="text"
                              value={slide.title || ''}
                              onChange={(e) => updateSlide(idx, 'title', e.target.value)}
                              placeholder="e.g. The Everyday Diamond Edit"
                              className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs bg-white focus:outline-none focus:border-brand-primary"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-brand-tertiary block">
                              Action Button Text
                            </label>
                            <input
                              type="text"
                              value={slide.buttonText || ''}
                              onChange={(e) => updateSlide(idx, 'buttonText', e.target.value)}
                              placeholder="e.g. SHOP NOW"
                              className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs bg-white focus:outline-none focus:border-brand-primary"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-brand-tertiary block">
                              Destination Link
                            </label>
                            <select
                              value={['#catalog', '#jhumka-boxes'].includes(slide.linkUrl) ? slide.linkUrl : 'custom'}
                              onChange={(e) => {
                                if (e.target.value !== 'custom') {
                                  updateSlide(idx, 'linkUrl', e.target.value);
                                }
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs bg-white focus:outline-none focus:border-brand-primary mb-1.5"
                            >
                              <option value="#catalog">All Everyday Jewelry (#catalog)</option>
                              <option value="#jhumka-boxes">4 Signature Jhumka Boxes (#jhumka-boxes)</option>
                              <option value="custom">Custom URL or Anchor</option>
                            </select>
                            <input
                              type="text"
                              value={slide.linkUrl || '#catalog'}
                              onChange={(e) => updateSlide(idx, 'linkUrl', e.target.value)}
                              placeholder="#catalog, #jhumka-boxes, or /product/slug"
                              className="w-full px-3 py-1.5 rounded-lg border border-brand-border text-[11px] font-mono bg-white focus:outline-none focus:border-brand-primary"
                            />
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-white/70 border border-brand-border/60 text-[11px] text-brand-muted flex items-center justify-between">
                          <span>
                            Tip: For exact 1:1 Tanishq proportions on mobile, upload square posters (e.g. 1080×1080px).
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 1. TOP RIBBON */}
        {activeSection === 'ribbon' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-4">
              <div>
                <h3 className="text-base font-editorial font-bold text-brand-tertiary">
                  Top Editorial Ribbon
                </h3>
                <p className="text-xs text-brand-muted font-light">
                  Appears at the very top of every page above the main navigation header.
                </p>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.topRibbon.enabled}
                  onChange={(e) => updateNested('topRibbon', 'enabled', e.target.checked)}
                  className="rounded text-brand-primary focus:ring-brand-primary h-4 w-4"
                />
                <span className="text-xs font-bold text-brand-tertiary">
                  {formData.topRibbon.enabled ? 'Ribbon Visible' : 'Ribbon Hidden'}
                </span>
              </label>
            </div>

            {/* Live Preview Box */}
            <div className="space-y-2">
              <span className="text-[10px] font-caps uppercase tracking-wider text-brand-muted font-bold block">
                Live Storefront Preview:
              </span>
              <div className="bg-[#FAF7FC] border border-brand-border text-brand-tertiary text-[11px] font-medium py-2 px-4 text-center tracking-widest uppercase flex items-center justify-center space-x-2 rounded-xl">
                <Sparkles className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                <span>
                  {formData.topRibbon.text}{' '}
                  <span className="font-bold text-brand-primary">{formData.topRibbon.highlightAmount}</span>{' '}
                  {formData.topRibbon.suffix}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-brand-tertiary block">
                  Announcement Message
                </label>
                <input
                  type="text"
                  value={formData.topRibbon.text}
                  onChange={(e) => updateNested('topRibbon', 'text', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                  placeholder="e.g. COMPLIMENTARY EXPRESS DELIVERY ON ALL ORDERS ABOVE"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-tertiary block">
                  Highlight Text / Amount
                </label>
                <input
                  type="text"
                  value={formData.topRibbon.highlightAmount}
                  onChange={(e) => updateNested('topRibbon', 'highlightAmount', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                  placeholder="e.g. ₹999"
                />
              </div>

              <div className="sm:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-brand-tertiary block">
                  Suffix Tagline
                </label>
                <input
                  type="text"
                  value={formData.topRibbon.suffix}
                  onChange={(e) => updateNested('topRibbon', 'suffix', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                  placeholder="e.g. • 18K GOLD PVD ANTI-TARNISH"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. HERO BANNER */}
        {activeSection === 'hero' && (
          <div className="space-y-6">
            <div className="border-b border-brand-border/60 pb-4">
              <h3 className="text-base font-editorial font-bold text-brand-tertiary">
                Fast Fashion Hero Banner
              </h3>
              <p className="text-xs text-brand-muted font-light">
                The primary full-width conversion banner at the top of the storefront homepage.
              </p>
            </div>

            {/* Live Preview Card */}
            <div className="space-y-2">
              <span className="text-[10px] font-caps uppercase tracking-wider text-brand-muted font-bold block">
                Live Storefront Preview (Desktop):
              </span>
              <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-r from-[#FAF7FD] via-white to-[#F6F2FA] border border-brand-border space-y-3">
                {/* Desktop Faded Photograph Preview */}
                {Boolean(formData.heroBanner.rightImageUrl ?? '/hero-jewelry-model.jpg') && (
                  <div className="hidden sm:block absolute top-0 right-0 w-[65%] lg:w-[60%] xl:w-[56%] h-full pointer-events-none select-none overflow-hidden z-0">
                    <img
                      src={formData.heroBanner.rightImageUrl || '/hero-jewelry-model.jpg'}
                      alt="Hero Preview"
                      className="w-full h-full object-cover object-[center_15%]"
                      style={{
                        maskImage: 'linear-gradient(to right, transparent 0%, transparent 4%, rgba(0,0,0,0.12) 10%, rgba(0,0,0,0.55) 16%, #000 22%, #000 100%)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 4%, rgba(0,0,0,0.12) 10%, rgba(0,0,0,0.55) 16%, #000 22%, #000 100%)',
                      }}
                    />
                  </div>
                )}

                <div className="relative z-10 space-y-3">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-brand-primary-light border border-brand-primary/20 text-brand-primary text-[10px] font-caps uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-brand-primary" />
                    <span>{formData.heroBanner.badgeText}</span>
                  </div>
                  <h4 className="text-2xl font-editorial font-bold text-brand-tertiary leading-snug">
                    {formData.heroBanner.headline} <br />
                    <span className="italic font-normal text-brand-primary">{formData.heroBanner.accentText}</span>
                  </h4>
                  <p className="text-xs text-brand-muted font-light max-w-sm sm:max-w-md leading-relaxed">
                    {formData.heroBanner.subtitle}
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <span className="px-4 py-2 rounded-xl bg-brand-primary text-white text-[11px] font-caps uppercase font-bold flex items-center space-x-1.5">
                      <span>{formData.heroBanner.primaryBtnText}</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                    <span className="px-4 py-2 rounded-xl bg-white border border-brand-border text-brand-tertiary text-[11px] font-caps uppercase font-semibold">
                      {formData.heroBanner.secondaryBtnText}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-brand-tertiary block">
                  Eyebrow Badge Text
                </label>
                <input
                  type="text"
                  value={formData.heroBanner.badgeText}
                  onChange={(e) => updateNested('heroBanner', 'badgeText', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                  placeholder="e.g. 18K PVD Anti-Tarnish Everyday Luxury"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-tertiary block">
                  Main Headline (Line 1)
                </label>
                <input
                  type="text"
                  value={formData.heroBanner.headline}
                  onChange={(e) => updateNested('heroBanner', 'headline', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                  placeholder="e.g. Curated everyday jewelry,"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-tertiary block">
                  Italic Accent Text (Line 2)
                </label>
                <input
                  type="text"
                  value={formData.heroBanner.accentText}
                  onChange={(e) => updateNested('heroBanner', 'accentText', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary text-brand-primary italic font-serif"
                  placeholder="e.g. designed to shine forever."
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-brand-tertiary block">
                  Subtitle Paragraph
                </label>
                <textarea
                  rows={2}
                  value={formData.heroBanner.subtitle}
                  onChange={(e) => updateNested('heroBanner', 'subtitle', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary leading-relaxed"
                  placeholder="Supporting descriptive paragraph..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-tertiary block">
                  Primary Button Text
                </label>
                <input
                  type="text"
                  value={formData.heroBanner.primaryBtnText}
                  onChange={(e) => updateNested('heroBanner', 'primaryBtnText', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-tertiary block">
                  Primary Button Link / Anchor
                </label>
                <input
                  type="text"
                  value={formData.heroBanner.primaryBtnLink}
                  onChange={(e) => updateNested('heroBanner', 'primaryBtnLink', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                  placeholder="#jhumka-boxes"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-tertiary block">
                  Secondary Button Text
                </label>
                <input
                  type="text"
                  value={formData.heroBanner.secondaryBtnText}
                  onChange={(e) => updateNested('heroBanner', 'secondaryBtnText', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-tertiary block">
                  Secondary Button Link / Anchor
                </label>
                <input
                  type="text"
                  value={formData.heroBanner.secondaryBtnLink}
                  onChange={(e) => updateNested('heroBanner', 'secondaryBtnLink', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                  placeholder="#catalog"
                />
              </div>

              {/* Hero Photograph Upload & Controls (Desktop) */}
              <div className="sm:col-span-2 p-4 rounded-xl border border-brand-primary/20 bg-brand-primary-light/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-bold text-brand-tertiary flex items-center space-x-1.5">
                      <ImageIcon className="w-4 h-4 text-brand-primary" />
                      <span>Hero Right Photograph (Desktop View)</span>
                    </h5>
                    <p className="text-[11px] text-brand-muted mt-0.5">
                      Fades creatively from left (0% opacity) into the white card background. Visible specifically on desktop view.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className={`cursor-pointer px-3.5 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-caps tracking-wider uppercase font-bold hover:bg-brand-primary-hover transition-colors flex items-center space-x-1.5 shadow-sm ${uploadingHeroPhoto ? 'opacity-70 pointer-events-none' : ''}`}>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{uploadingHeroPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleHeroPhotoUpload}
                        disabled={uploadingHeroPhoto}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => updateNested('heroBanner', 'rightImageUrl', '/hero-jewelry-model.jpg')}
                      className="px-2.5 py-1.5 rounded-lg border border-brand-border bg-white text-brand-tertiary text-xs font-caps tracking-wider uppercase font-semibold hover:border-brand-primary transition-colors"
                      title="Reset to default luxury model photograph"
                    >
                      Default Photo
                    </button>
                    {formData.heroBanner.rightImageUrl && (
                      <button
                        type="button"
                        onClick={() => updateNested('heroBanner', 'rightImageUrl', '')}
                        className="p-1.5 rounded-lg border border-brand-border bg-white text-brand-muted hover:text-red-600 hover:border-red-300 transition-colors"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-lg border border-brand-border bg-white overflow-hidden flex-shrink-0 relative shadow-inner">
                    {formData.heroBanner.rightImageUrl ? (
                      <img
                        src={formData.heroBanner.rightImageUrl}
                        alt="Hero Preview Thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-muted text-[10px] text-center px-1">
                        No Photo
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-medium text-brand-muted block">
                      Image URL or Uploaded Path
                    </label>
                    <input
                      type="text"
                      value={formData.heroBanner.rightImageUrl || ''}
                      onChange={(e) => updateNested('heroBanner', 'rightImageUrl', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-brand-border text-xs focus:outline-none focus:border-brand-primary bg-white font-mono"
                      placeholder="e.g. /hero-jewelry-model.jpg or https://..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. JHUMKA HERO SPOTLIGHT */}
        {activeSection === 'jhumka' && (
          <div className="space-y-6">
            <div className="border-b border-brand-border/60 pb-4">
              <h3 className="text-base font-editorial font-bold text-brand-tertiary">
                4 Signature Jhumka Boxes Ad Spotlight
              </h3>
              <p className="text-xs text-brand-muted font-light">
                The high-converting hero card displaying your viral bestselling curated jhumka sets.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-brand-tertiary block">
                  Ad Campaign Badge
                </label>
                <input
                  type="text"
                  value={formData.jhumkaHero.badgeText}
                  onChange={(e) => updateNested('jhumkaHero', 'badgeText', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-tertiary block">
                  Title Line 1
                </label>
                <input
                  type="text"
                  value={formData.jhumkaHero.titleLine1}
                  onChange={(e) => updateNested('jhumkaHero', 'titleLine1', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-tertiary block">
                  Title Line 2 (Accent)
                </label>
                <input
                  type="text"
                  value={formData.jhumkaHero.titleLine2}
                  onChange={(e) => updateNested('jhumkaHero', 'titleLine2', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary text-brand-primary italic font-serif"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-brand-tertiary block">
                  Section Description
                </label>
                <textarea
                  rows={2}
                  value={formData.jhumkaHero.subtitle}
                  onChange={(e) => updateNested('jhumkaHero', 'subtitle', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-tertiary block">
                  Feature Pill 1
                </label>
                <input
                  type="text"
                  value={formData.jhumkaHero.pill1}
                  onChange={(e) => updateNested('jhumkaHero', 'pill1', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-tertiary block">
                  Feature Pill 2
                </label>
                <input
                  type="text"
                  value={formData.jhumkaHero.pill2}
                  onChange={(e) => updateNested('jhumkaHero', 'pill2', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-brand-tertiary block">
                  Feature Pill 3 (Savings / Value)
                </label>
                <input
                  type="text"
                  value={formData.jhumkaHero.pill3}
                  onChange={(e) => updateNested('jhumkaHero', 'pill3', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>

              {/* Pairs Badge Label Customization */}
              <div className="sm:col-span-2 p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pairs Badge Label Format</span>
                  </span>
                  <span className="text-[10px] text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded">
                    Storefront Card Badge
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-amber-900 font-medium">Badge Suffix (after pairs count)</label>
                    <input
                      type="text"
                      value={formData.jhumkaHero.pairsBadgeSuffix || 'Pairs Inside'}
                      onChange={(e) => updateNested('jhumkaHero', 'pairsBadgeSuffix', e.target.value)}
                      placeholder="e.g. Pairs Inside, Curated Pairs"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 text-xs focus:outline-none focus:border-amber-500 font-semibold text-brand-tertiary"
                    />
                  </div>
                  <div className="text-[11px] text-amber-800 leading-snug self-center bg-white/60 p-2.5 rounded-lg border border-amber-200/60">
                    Renders as <strong>"6 {formData.jhumkaHero.pairsBadgeSuffix || 'Pairs Inside'}"</strong>. You can customize the exact count of pairs (e.g. 5 or 6 pairs) for each individual box under <strong>Products Control</strong>.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. CATALOG & COMBOS HEADERS */}
        {activeSection === 'catalog' && (
          <div className="space-y-6">
            <div className="border-b border-brand-border/60 pb-4">
              <h3 className="text-base font-editorial font-bold text-brand-tertiary">
                Catalog & Combo Offer Headers
              </h3>
              <p className="text-xs text-brand-muted font-light">
                Controls the headlines and eyebrow tags above the dynamic product grids.
              </p>
            </div>

            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-[#FAF8FD] border border-brand-border space-y-4">
                <h4 className="text-xs font-caps uppercase tracking-wider font-bold text-brand-primary">
                  1. Main Jewelry Catalog Header
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-tertiary block">Eyebrow Tag</label>
                    <input
                      type="text"
                      value={formData.catalogHeader.eyebrow}
                      onChange={(e) => updateNested('catalogHeader', 'eyebrow', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-tertiary block">Main Title</label>
                    <input
                      type="text"
                      value={formData.catalogHeader.title}
                      onChange={(e) => updateNested('catalogHeader', 'title', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#FAF8FD] border border-brand-border space-y-4">
                <h4 className="text-xs font-caps uppercase tracking-wider font-bold text-brand-primary">
                  2. Combo Sets & Duos Header
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-tertiary block">Eyebrow Tag</label>
                    <input
                      type="text"
                      value={formData.combosHeader.eyebrow}
                      onChange={(e) => updateNested('combosHeader', 'eyebrow', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-tertiary block">Main Title</label>
                    <input
                      type="text"
                      value={formData.combosHeader.title}
                      onChange={(e) => updateNested('combosHeader', 'title', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-brand-tertiary block">Subtitle Description</label>
                    <input
                      type="text"
                      value={formData.combosHeader.subtitle}
                      onChange={(e) => updateNested('combosHeader', 'subtitle', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. TRUST PILLARS */}
        {activeSection === 'trust' && (
          <div className="space-y-6">
            <div className="border-b border-brand-border/60 pb-4">
              <h3 className="text-base font-editorial font-bold text-brand-tertiary">
                Trust Strip (4 Pillars of Valerie Jewels)
              </h3>
              <p className="text-xs text-brand-muted font-light">
                Displayed in a clean horizontal grid to establish credibility with first-time buyers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {formData.trustStrip.map((pillar, idx) => (
                <div key={pillar.id || idx} className="p-4 rounded-xl border border-brand-border space-y-3 bg-[#FAF8FD]/50">
                  <div className="flex items-center space-x-2 text-xs font-bold text-brand-primary">
                    <span>Pillar {idx + 1}</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-brand-tertiary block">Title</label>
                    <input
                      type="text"
                      value={pillar.title}
                      onChange={(e) => updateTrustPillar(idx, 'title', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-brand-tertiary block">Description</label>
                    <textarea
                      rows={2}
                      value={pillar.desc}
                      onChange={(e) => updateTrustPillar(idx, 'desc', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary bg-white leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. TELEMETRY BANNER */}
        {activeSection === 'telemetry' && (
          <div className="space-y-6">
            <div className="border-b border-brand-border/60 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-editorial font-bold text-brand-tertiary">
                  Live System Status Banner
                </h3>
                <p className="text-xs text-brand-muted font-light">
                  Show or hide the system status badge that was used during phase testing.
                </p>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.telemetryBanner.enabled}
                  onChange={(e) => updateNested('telemetryBanner', 'enabled', e.target.checked)}
                  className="rounded text-brand-primary focus:ring-brand-primary h-4 w-4"
                />
                <span className="text-xs font-bold text-brand-tertiary">
                  {formData.telemetryBanner.enabled ? 'Banner Shown' : 'Banner Hidden (Recommended for Live Store)'}
                </span>
              </label>
            </div>

            {formData.telemetryBanner.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-brand-tertiary block">Banner Title</label>
                  <input
                    type="text"
                    value={formData.telemetryBanner.title}
                    onChange={(e) => updateNested('telemetryBanner', 'title', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-brand-tertiary block">Banner Subtitle</label>
                  <input
                    type="text"
                    value={formData.telemetryBanner.subtitle}
                    onChange={(e) => updateNested('telemetryBanner', 'subtitle', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
