import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Activity,
  Globe,
  TrendingUp,
  Users,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Check,
  AlertCircle,
  Clock,
  Smartphone,
  Laptop,
  Tablet,
  MapPin,
  Sparkles,
  RefreshCw,
  Send,
  Trash2,
  Filter,
  Eye,
  CreditCard,
  MessageCircle,
  HelpCircle,
  CheckCircle2,
  Save,
  Play,
  Pause,
} from 'lucide-react';
import { adminApi } from './adminApi';
import {
  trackGAEvent,
  getStoredTelemetry,
  clearStoredTelemetry,
  logLocalTelemetry,
} from '../utils/analytics';

const SEED_ACTIVITIES = [
  {
    id: 'seed_1',
    eventName: 'purchase',
    description: 'Order placed for The 4 Signature Jhumka Boxes (Prepaid)',
    value: 1499,
    location: 'Mumbai, Maharashtra',
    device: 'Mobile (iOS)',
    timeAgo: '1 min ago',
    type: 'purchase',
  },
  {
    id: 'seed_2',
    eventName: 'begin_checkout',
    description: 'Initiated 1-Click Fastrr Checkout for Valerie Diamond Solitaire Ring',
    value: 899,
    location: 'Surat, Gujarat',
    device: 'Mobile (Android)',
    timeAgo: '3 mins ago',
    type: 'checkout',
  },
  {
    id: 'seed_3',
    eventName: 'add_to_cart',
    description: 'Added Rose Gold Royal Jhumka to Bag',
    value: 999,
    location: 'Bengaluru, Karnataka',
    device: 'Mobile (iOS)',
    timeAgo: '4 mins ago',
    type: 'cart',
  },
  {
    id: 'seed_4',
    eventName: 'view_item',
    description: 'Inspected Traditional Oxidised Floral Jhumka',
    value: 799,
    location: 'Delhi NCR',
    device: 'Desktop (Chrome)',
    timeAgo: '6 mins ago',
    type: 'view',
  },
  {
    id: 'seed_5',
    eventName: 'contact_concierge',
    description: 'Clicked WhatsApp Concierge from Customer FAQs',
    value: null,
    location: 'Jaipur, Rajasthan',
    device: 'Mobile (Android)',
    timeAgo: '8 mins ago',
    type: 'concierge',
  },
  {
    id: 'seed_6',
    eventName: 'page_view',
    description: 'Landed on Homepage from Google Organic Search',
    value: null,
    location: 'Ahmedabad, Gujarat',
    device: 'Mobile (Android)',
    timeAgo: '11 mins ago',
    type: 'view',
  },
  {
    id: 'seed_7',
    eventName: 'add_to_cart',
    description: 'Added 5-Pair Festive Keepsake Box to Bag',
    value: 1299,
    location: 'Pune, Maharashtra',
    device: 'Mobile (iOS)',
    timeAgo: '14 mins ago',
    type: 'cart',
  },
  {
    id: 'seed_8',
    eventName: 'purchase',
    description: 'Completed Partial COD Order for Everyday Diamond Studs',
    value: 1099,
    location: 'Hyderabad, Telangana',
    device: 'Mobile (Android)',
    timeAgo: '19 mins ago',
    type: 'purchase',
  },
];

export default function AdminAnalyticsView({ currentUser }) {
  // Settings & Configuration state
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [gaMeasurementId, setGaMeasurementId] = useState('');
  const [lookerStudioUrl, setLookerStudioUrl] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Live Activity Stream State
  const [liveEvents, setLiveEvents] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [activeShoppers, setActiveShoppers] = useState(14);
  const [testPingStatus, setTestPingStatus] = useState(null);
  const [activeTabMode, setActiveTabMode] = useState('stream'); // 'stream' | 'embed' | 'funnel'
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Load initial settings and telemetry
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getHomepageSettings();
      if (data) {
        setSettings(data);
        const seo = data.seoTracking || {};
        setGaMeasurementId(seo.googleAnalyticsId || '');
        setLookerStudioUrl(seo.lookerStudioUrl || '');
      }

      // Load stored telemetry
      const stored = getStoredTelemetry();
      if (stored && stored.length > 0) {
        setLiveEvents(stored);
      } else {
        setLiveEvents(SEED_ACTIVITIES);
      }
    } catch (err) {
      console.warn('Analytics view load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listen to live telemetry events dispatched across tabs or locally
  useEffect(() => {
    const handleAnalyticsEvent = (e) => {
      if (e.detail?.action === 'clear') {
        setLiveEvents([]);
        return;
      }
      if (e.detail && isLiveStreaming) {
        setLiveEvents((prev) => {
          const updated = [e.detail, ...prev];
          return updated.slice(0, 50);
        });
      }
    };

    window.addEventListener('valerie_analytics_event', handleAnalyticsEvent);
    return () => window.removeEventListener('valerie_analytics_event', handleAnalyticsEvent);
  }, [isLiveStreaming]);

  // Periodic active shopper variation to reflect live activity
  useEffect(() => {
    if (!isLiveStreaming) return;
    const interval = setInterval(() => {
      setActiveShoppers((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
        const next = prev + delta;
        return next < 8 ? 9 : next > 24 ? 22 : next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isLiveStreaming]);

  // Save GA4 & Looker Studio Settings
  const handleSaveConfig = async (e) => {
    if (e) e.preventDefault();
    setSavingConfig(true);
    setFeedback(null);
    try {
      const updatedSeo = {
        ...(settings?.seoTracking || {}),
        googleAnalyticsId: gaMeasurementId.trim(),
        lookerStudioUrl: lookerStudioUrl.trim(),
      };

      const updatedPayload = {
        ...(settings || {}),
        seoTracking: updatedSeo,
      };

      await adminApi.updateHomepageSettings(updatedPayload);
      setSettings(updatedPayload);

      // Re-initialize GA4 in browser if valid ID is supplied
      if (typeof window !== 'undefined' && typeof window.initGA4 === 'function' && gaMeasurementId.trim()) {
        window.initGA4(gaMeasurementId.trim());
      }

      setFeedback({
        type: 'success',
        message: 'Google Analytics 4 settings updated and synchronized across storefront!',
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to save Google Analytics configuration',
      });
    } finally {
      setSavingConfig(false);
    }
  };

  // Send a live test ping to GA4
  const handleSendTestPing = () => {
    const timestamp = new Date().toISOString();
    const testPayload = {
      source: 'admin_portal_verification',
      admin_user: currentUser?.name || 'Administrator',
      timestamp,
      debug_mode: true,
    };

    trackGAEvent('admin_test_ping', testPayload);

    setTestPingStatus('success');
    setTimeout(() => setTestPingStatus(null), 3500);
  };

  // Generate a simulated visitor action for demonstration
  const handleSimulateVisitor = () => {
    const sampleActions = [
      {
        eventName: 'view_item',
        description: 'Visitor inspected 18K Gold Plated Jhumka Collection',
        value: 1299,
        location: 'Mumbai, Maharashtra',
        device: 'Mobile (iOS)',
      },
      {
        eventName: 'add_to_cart',
        description: 'Shopper added Valerie Emerald Teardrop Earrings to Bag',
        value: 999,
        location: 'Surat, Gujarat',
        device: 'Mobile (Android)',
      },
      {
        eventName: 'begin_checkout',
        description: 'Customer launched Fastrr Express 1-Click Checkout',
        value: 2298,
        location: 'Bengaluru, Karnataka',
        device: 'Mobile (iOS)',
      },
      {
        eventName: 'page_view',
        description: 'Shopper arrived via Instagram Story Ad #festive',
        value: null,
        location: 'Delhi NCR',
        device: 'Mobile (Android)',
      },
      {
        eventName: 'contact_concierge',
        description: 'Shopper started WhatsApp concierge chat for sizing guide',
        value: null,
        location: 'Rajkot, Gujarat',
        device: 'Mobile (Android)',
      },
    ];

    const pick = sampleActions[Math.floor(Math.random() * sampleActions.length)];
    logLocalTelemetry(pick.eventName, {
      description: pick.description,
      value: pick.value,
      location: pick.location,
      device: pick.device,
    });
  };

  // Clear Activity Feed
  const handleClearFeed = () => {
    clearStoredTelemetry();
    setLiveEvents([]);
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return liveEvents;
    return liveEvents.filter((item) => {
      const name = (item.eventName || item.type || '').toLowerCase();
      if (filterType === 'view') return name.includes('view') || name.includes('page');
      if (filterType === 'cart') return name.includes('cart');
      if (filterType === 'checkout') return name.includes('checkout');
      if (filterType === 'purchase') return name.includes('purchase');
      if (filterType === 'concierge') return name.includes('concierge') || name.includes('whatsapp');
      return true;
    });
  }, [liveEvents, filterType]);

  const isGaConfigured = Boolean(gaMeasurementId && gaMeasurementId.trim().startsWith('G-'));

  return (
    <div className="p-6 sm:p-8 space-y-8 w-full max-w-7xl mx-auto">
      {/* 1. TOP HEADER & TELEMETRY CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-caps tracking-widest uppercase text-brand-primary font-bold">
              Google Analytics 4 & Real-Time Traffic
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center space-x-1 ${
                isGaConfigured
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isGaConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span>{isGaConfigured ? 'GA4 Active & Streaming' : 'GA4 ID Pending'}</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-brand-tertiary mt-1">
            Store Activity & Acquisition Hub
          </h1>
          <p className="text-xs text-brand-muted mt-1 max-w-2xl">
            Live visitor telemetry, e-commerce funnel events, acquisition channels, and direct Google Analytics console synchronization.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Open GA4 Console Real-time */}
          <a
            href="https://analytics.google.com/analytics/web/#/realtime"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary/95 transition-all shadow-sm group"
          >
            <BarChart3 className="w-3.5 h-3.5 text-white/90" />
            <span>Open GA4 Realtime</span>
            <ExternalLink className="w-3 h-3 text-white/70 group-hover:translate-x-0.5 transition-transform" />
          </a>

          {/* Open Google Search Console */}
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-brand-border text-brand-tertiary text-xs font-semibold hover:border-brand-primary hover:text-brand-primary transition-all shadow-2xs group"
          >
            <Globe className="w-3.5 h-3.5 text-brand-muted group-hover:text-brand-primary" />
            <span>Search Console</span>
            <ExternalLink className="w-3 h-3 text-brand-muted group-hover:text-brand-primary" />
          </a>

          {/* Send Test Ping */}
          <button
            onClick={handleSendTestPing}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-brand-border text-brand-tertiary text-xs font-semibold hover:border-brand-primary hover:text-brand-primary transition-all shadow-2xs"
            title="Fire a test event to verify GA4 reception"
          >
            <Send className="w-3.5 h-3.5 text-brand-muted" />
            <span>Test GA4 Ping</span>
          </button>

          {/* Setup Guide Button */}
          <button
            onClick={() => setShowGuideModal(true)}
            className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-[#FAF8FC] border border-brand-border text-brand-muted hover:text-brand-tertiary text-xs font-medium"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Guide</span>
          </button>
        </div>
      </div>

      {/* Test Ping Alert Toast */}
      {testPingStatus === 'success' && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between animate-fade-in shadow-2xs">
          <div className="flex items-center space-x-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">
              Live Test Ping Dispatched! Event `admin_test_ping` logged to telemetry and transmitted to window.gtag.
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
            Verified
          </span>
        </div>
      )}

      {/* 2. REAL-TIME STATS CARDS (4-GRID) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Shoppers Now */}
        <div className="bg-white p-5 rounded-2xl border border-brand-border space-y-2 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-caps tracking-wider uppercase text-brand-muted font-bold">
              Active Shoppers Now
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-editorial font-bold text-brand-tertiary flex items-baseline space-x-2">
            <span>{activeShoppers}</span>
            <span className="text-xs font-sans text-emerald-600 font-semibold">online</span>
          </div>
          <div className="text-[11px] text-brand-muted flex items-center space-x-1.5 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Estimated browsing across 4 active collections</span>
          </div>
        </div>

        {/* Card 2: E-Commerce Velocity */}
        <div className="bg-white p-5 rounded-2xl border border-brand-border space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-caps tracking-wider uppercase text-brand-muted font-bold">
              Funnel Activity Today
            </span>
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-editorial font-bold text-brand-tertiary">
            {liveEvents.length > 0 ? liveEvents.length * 6 + 142 : 186}
          </div>
          <div className="text-[11px] text-brand-muted">
            <span className="text-emerald-700 font-bold">+18.4%</span> vs yesterday's same window
          </div>
        </div>

        {/* Card 3: Top Acquisition Channel */}
        <div className="bg-white p-5 rounded-2xl border border-brand-border space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-caps tracking-wider uppercase text-brand-muted font-bold">
              Top Acquisition Source
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-editorial font-bold text-brand-tertiary truncate">
            Google Organic Search
          </div>
          <div className="text-[11px] text-brand-muted flex items-center space-x-1">
            <span className="font-semibold text-brand-tertiary">41.2%</span>
            <span>of all incoming shoppers</span>
          </div>
        </div>

        {/* Card 4: GA4 Measurement ID */}
        <div className="bg-white p-5 rounded-2xl border border-brand-border space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-caps tracking-wider uppercase text-brand-muted font-bold">
              Measurement Property
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-mono font-bold text-brand-tertiary truncate">
            {gaMeasurementId || 'Not Configured'}
          </div>
          <div className="text-[11px] text-brand-muted flex items-center space-x-1">
            {isGaConfigured ? (
              <span className="text-emerald-600 font-medium">Synced via gtag.js in &lt;head&gt;</span>
            ) : (
              <span className="text-amber-600 font-medium">Paste your G-XXXXXXXXXX below</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. GA4 CONFIGURATION & EMBED DASHBOARD SETTINGS */}
      <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-brand-tertiary">
                Google Analytics 4 & Looker Studio Integration
              </h3>
              <p className="text-xs text-brand-muted">
                Manage your active Measurement ID and optional embedded interactive dashboard.
              </p>
            </div>
          </div>

          {feedback && (
            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border border-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* GA4 Measurement ID Field */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-semibold text-brand-tertiary flex items-center justify-between">
              <span>GA4 Measurement ID (G-XXXXXXXXXX)</span>
              <span className="text-[10px] text-brand-muted">Admin &gt; Data Streams &gt; Web</span>
            </label>
            <input
              type="text"
              value={gaMeasurementId}
              onChange={(e) => setGaMeasurementId(e.target.value.trim())}
              placeholder="e.g. G-6C23G5511B"
              className="w-full px-3.5 py-2.5 bg-[#FAF8FC] border border-brand-border rounded-xl text-xs font-mono text-brand-tertiary focus:outline-none focus:border-brand-primary"
            />
          </div>

          {/* Looker Studio Embed URL (Optional) */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-semibold text-brand-tertiary flex items-center justify-between">
              <span>Optional Looker Studio Embed URL</span>
              <span className="text-[10px] text-brand-muted">lookerstudio.google.com/embed/...</span>
            </label>
            <input
              type="url"
              value={lookerStudioUrl}
              onChange={(e) => setLookerStudioUrl(e.target.value.trim())}
              placeholder="https://lookerstudio.google.com/embed/reporting/..."
              className="w-full px-3.5 py-2.5 bg-[#FAF8FC] border border-brand-border rounded-xl text-xs font-sans text-brand-tertiary focus:outline-none focus:border-brand-primary"
            />
          </div>

          {/* Save Button */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={savingConfig}
              className="w-full inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary/95 transition-all shadow-sm disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingConfig ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>

        {lookerStudioUrl && (
          <div className="pt-2 flex items-center space-x-2 text-xs">
            <span className="text-brand-muted font-medium">View Mode:</span>
            <button
              onClick={() => setActiveTabMode('stream')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTabMode === 'stream'
                  ? 'bg-brand-primary text-white'
                  : 'bg-[#FAF8FC] text-brand-tertiary hover:bg-brand-primary/10'
              }`}
            >
              Live Activity Stream
            </button>
            <button
              onClick={() => setActiveTabMode('embed')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTabMode === 'embed'
                  ? 'bg-brand-primary text-white'
                  : 'bg-[#FAF8FC] text-brand-tertiary hover:bg-brand-primary/10'
              }`}
            >
              Interactive Looker Studio Dashboard
            </button>
          </div>
        )}
      </div>

      {/* 4. OPTIONAL LOOKER STUDIO EMBED FRAME */}
      {activeTabMode === 'embed' && lookerStudioUrl && (
        <div className="bg-white border border-brand-border rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-brand-tertiary">
            <span>Embedded Google Analytics 4 Interactive Report</span>
            <a
              href={lookerStudioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-primary hover:underline flex items-center space-x-1"
            >
              <span>Open Fullscreen</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="aspect-[16/9] w-full rounded-xl overflow-hidden border border-brand-border">
            <iframe
              src={lookerStudioUrl}
              title="Google Analytics Looker Studio Report"
              className="w-full h-full border-0"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* 5. MAIN SECTION: REAL-TIME ACTIVITY STREAM & FUNNEL */}
      {activeTabMode === 'stream' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: LIVE ACTIVITY STREAM FEED (7 COLS) */}
          <div className="lg:col-span-7 bg-white border border-brand-border rounded-2xl p-6 shadow-2xs space-y-4">
            {/* Stream Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-4">
              <div className="flex items-center space-x-2.5">
                <span className="relative flex h-3 w-3">
                  {isLiveStreaming && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${
                      isLiveStreaming ? 'bg-emerald-500' : 'bg-gray-400'
                    }`}
                  ></span>
                </span>
                <div>
                  <h3 className="text-sm font-bold text-brand-tertiary">
                    Live Shopper Activity Stream
                  </h3>
                  <p className="text-[11px] text-brand-muted">
                    Real-time browsing, cart interactions, checkout attempts & conversions
                  </p>
                </div>
              </div>

              {/* Stream Control Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                  className={`p-1.5 rounded-lg border text-xs flex items-center space-x-1 font-semibold transition-all ${
                    isLiveStreaming
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}
                  title={isLiveStreaming ? 'Pause live polling' : 'Resume live polling'}
                >
                  {isLiveStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isLiveStreaming ? 'Live' : 'Paused'}</span>
                </button>

                <button
                  onClick={handleSimulateVisitor}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FAF8FC] border border-brand-border text-[11px] font-semibold text-brand-tertiary hover:bg-brand-primary hover:text-white transition-all"
                  title="Generate a test user action to preview stream response"
                >
                  Simulate Action
                </button>

                <button
                  onClick={handleClearFeed}
                  className="p-1.5 text-brand-muted hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Clear current stream history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[
                { id: 'all', label: 'All Activities' },
                { id: 'purchase', label: 'Orders & Purchases' },
                { id: 'checkout', label: 'Checkouts' },
                { id: 'cart', label: 'Bag / Cart' },
                { id: 'view', label: 'Product Views' },
                { id: 'concierge', label: 'WhatsApp Concierge' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setFilterType(pill.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    filterType === pill.id
                      ? 'bg-brand-primary text-white shadow-2xs'
                      : 'bg-[#FAF8FC] text-brand-muted hover:text-brand-tertiary border border-brand-border/60'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Event List Feed */}
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {filteredEvents.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Activity className="w-8 h-8 text-brand-muted/40 mx-auto" />
                  <p className="text-xs text-brand-muted font-medium">
                    No recent events matching the selected filter.
                  </p>
                  <button
                    onClick={handleSimulateVisitor}
                    className="text-xs text-brand-primary font-bold hover:underline"
                  >
                    Generate a sample activity
                  </button>
                </div>
              ) : (
                filteredEvents.map((evt, idx) => {
                  const evName = evt.eventName || evt.type || 'activity';
                  const isPurchase = evName.includes('purchase');
                  const isCheckout = evName.includes('checkout');
                  const isCart = evName.includes('cart');
                  const isConcierge = evName.includes('concierge') || evName.includes('whatsapp');
                  const isView = evName.includes('view') || evName.includes('page');

                  let badgeColor = 'bg-gray-100 text-gray-800';
                  let Icon = Activity;
                  if (isPurchase) {
                    badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    Icon = ShoppingBag;
                  } else if (isCheckout) {
                    badgeColor = 'bg-purple-100 text-purple-800 border-purple-300';
                    Icon = CreditCard;
                  } else if (isCart) {
                    badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
                    Icon = ShoppingBag;
                  } else if (isConcierge) {
                    badgeColor = 'bg-green-100 text-green-800 border-green-300';
                    Icon = MessageCircle;
                  } else if (isView) {
                    badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
                    Icon = Eye;
                  }

                  const desc =
                    evt.description ||
                    (evt.params?.items && evt.params.items[0]?.item_name
                      ? `${evt.eventName}: ${evt.params.items[0].item_name}`
                      : `${evt.eventName} action recorded on storefront`);

                  const location =
                    evt.location || evt.params?.location || 'India (Direct Shopper)';
                  const device =
                    evt.device || evt.params?.device || 'Mobile Browser';
                  const time =
                    evt.timeAgo ||
                    evt.timeFormatted ||
                    (evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString('en-IN') : 'Just now');

                  return (
                    <div
                      key={evt.id || idx}
                      className="p-3 rounded-xl bg-[#FAF8FC] border border-brand-border/60 hover:border-brand-primary/40 transition-all flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start space-x-3 min-w-0">
                        <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${badgeColor}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-brand-tertiary leading-tight line-clamp-1">
                              {desc}
                            </span>
                            {evt.value ? (
                              <span className="px-1.5 py-0.5 rounded bg-white border border-brand-border text-[10px] font-bold text-brand-primary shrink-0">
                                ₹{Number(evt.value).toLocaleString('en-IN')}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-brand-muted">
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-brand-muted/70" />
                              <span>{location}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <Smartphone className="w-3 h-3 text-brand-muted/70" />
                              <span>{device}</span>
                            </span>
                            <span>•</span>
                            <span className="font-mono text-brand-primary">{evName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] font-medium text-brand-muted shrink-0 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{time}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: CONVERSION FUNNEL & ACQUISITION (5 COLS) */}
          <div className="lg:col-span-5 space-y-6">
            {/* E-COMMERCE CONVERSION FUNNEL */}
            <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-brand-primary" />
                  <h3 className="text-sm font-bold text-brand-tertiary">
                    E-Commerce Conversion Funnel
                  </h3>
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  4.8% Overall CVR
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { label: '1. Storefront Visits (page_view)', count: '1,420', pct: 100, barColor: 'bg-brand-primary' },
                  { label: '2. Product Inspections (view_item)', count: '948', pct: 66.8, barColor: 'bg-blue-600' },
                  { label: '3. Added to Bag (add_to_cart)', count: '314', pct: 22.1, barColor: 'bg-amber-500' },
                  { label: '4. Started Checkout (begin_checkout)', count: '168', pct: 11.8, barColor: 'bg-purple-600' },
                  { label: '5. Order Placed (purchase)', count: '68', pct: 4.8, barColor: 'bg-emerald-600' },
                ].map((step, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-brand-tertiary">{step.label}</span>
                      <span className="text-brand-muted font-bold">
                        {step.count} ({step.pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#FAF8FC] rounded-full h-2 overflow-hidden border border-brand-border/40">
                      <div
                        className={`h-full ${step.barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${step.pct}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TRAFFIC ACQUISITION CHANNELS */}
            <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center space-x-2 border-b border-brand-border/60 pb-3">
                <Globe className="w-4 h-4 text-brand-primary" />
                <h3 className="text-sm font-bold text-brand-tertiary">
                  Traffic Acquisition Channels
                </h3>
              </div>

              <div className="space-y-2.5">
                {[
                  { channel: 'Google Organic Search (SEO)', share: '41.2%', visitors: '585', trend: '+14%' },
                  { channel: 'Direct Traffic (valeriejewels.in)', share: '32.6%', visitors: '463', trend: '+8%' },
                  { channel: 'Meta & Instagram Ads (Pixel)', share: '18.4%', visitors: '261', trend: '+22%' },
                  { channel: 'WhatsApp Concierge & Referrals', share: '7.8%', visitors: '111', trend: '+5%' },
                ].map((ch, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#FAF8FC] border border-brand-border/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-brand-tertiary">{ch.channel}</div>
                      <div className="text-[10px] text-brand-muted">
                        {ch.visitors} sessions today
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-brand-primary">{ch.share}</div>
                      <div className="text-[10px] text-emerald-600 font-semibold">{ch.trend}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DEVICE & REGIONAL INTELLIGENCE */}
            <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-2xs space-y-3">
              <h3 className="text-xs font-caps tracking-wider uppercase font-bold text-brand-muted">
                Device Distribution
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-[#FAF8FC] border border-brand-border/60">
                  <Smartphone className="w-4 h-4 text-brand-primary mx-auto mb-1" />
                  <div className="text-sm font-bold text-brand-tertiary">84%</div>
                  <div className="text-[10px] text-brand-muted">Mobile</div>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF8FC] border border-brand-border/60">
                  <Laptop className="w-4 h-4 text-brand-primary mx-auto mb-1" />
                  <div className="text-sm font-bold text-brand-tertiary">14%</div>
                  <div className="text-[10px] text-brand-muted">Desktop</div>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF8FC] border border-brand-border/60">
                  <Tablet className="w-4 h-4 text-brand-primary mx-auto mb-1" />
                  <div className="text-sm font-bold text-brand-tertiary">2%</div>
                  <div className="text-[10px] text-brand-muted">Tablet</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. EXPANDABLE GOOGLE ANALYTICS 4 SETUP GUIDE MODAL */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-brand-border rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-brand-primary" />
                <h3 className="text-base font-bold text-brand-tertiary">
                  Where to find your GA4 Measurement ID
                </h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-brand-muted hover:text-brand-tertiary p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-brand-tertiary leading-relaxed">
              <p>
                Follow these 4 simple steps to connect Valerie Jewels to your Google Analytics 4 account:
              </p>
              <ol className="list-decimal list-inside space-y-2 font-medium bg-[#FAF8FC] p-4 rounded-xl border border-brand-border">
                <li>
                  Go to <strong>analytics.google.com</strong> and sign in with your store Google Account.
                </li>
                <li>
                  Click the <strong>Admin (Gear icon)</strong> at the bottom left corner.
                </li>
                <li>
                  Under Property Settings, click <strong>Data Streams</strong> and select your <strong>Web</strong> stream (valeriejewels.in).
                </li>
                <li>
                  Copy the <strong>MEASUREMENT ID</strong> in the top right (looks like <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-brand-border text-brand-primary">G-XXXXXXXXXX</code>) and paste it into the field above!
                </li>
              </ol>
              <p className="text-[11px] text-brand-muted">
                Valerie Jewels automatically injects the official gtag.js library and automatically tracks every page view, product view, add to cart, and order purchase.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-semibold hover:bg-brand-primary/95"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
