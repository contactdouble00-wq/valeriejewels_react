import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  FileText,
  Save,
  RotateCcw as ResetIcon,
  CheckCircle,
  AlertCircle,
  Eye,
  Plus,
  Trash2,
  Gift,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { adminApi } from './adminApi';
import { DEFAULT_POLICIES } from '../data/defaultPolicies';

export default function AdminPoliciesView() {
  const [policies, setPolicies] = useState(DEFAULT_POLICIES);
  const [activeTab, setActiveTab] = useState('shipping');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getPolicies();
      if (data && typeof data === 'object') {
        setPolicies({
          meta: { ...DEFAULT_POLICIES.meta, ...(data.meta || {}) },
          shipping: { ...DEFAULT_POLICIES.shipping, ...(data.shipping || {}) },
          refund: { ...DEFAULT_POLICIES.refund, ...(data.refund || {}) },
          privacy: { ...DEFAULT_POLICIES.privacy, ...(data.privacy || {}) },
          terms: { ...DEFAULT_POLICIES.terms, ...(data.terms || {}) },
        });
      }
    } catch (err) {
      console.warn('Could not load policies from backend, using defaults:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setFeedback(null);
      await adminApi.updatePolicies(policies);
      setFeedback({ type: 'success', message: 'All legal policies & delivery parameters successfully updated and synced across live storefront.' });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save legal policies.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset all policy text and parameters back to standard regulatory defaults (5-7 days shipping, Free zircon necklace on prepaid, DPDP Act 2023)?')) {
      setPolicies(DEFAULT_POLICIES);
      setFeedback({ type: 'success', message: 'Restored standard legal defaults. Click "Save Policies" to commit changes to database.' });
    }
  };

  // Helpers for updating meta values
  const handleMetaChange = (field, val) => {
    setPolicies((prev) => ({
      ...prev,
      meta: {
        ...prev.meta,
        [field]: val,
      },
    }));
  };

  const handleQuickHighlightChange = (field, val) => {
    setPolicies((prev) => ({
      ...prev,
      meta: {
        ...prev.meta,
        quickHighlights: {
          ...(prev.meta?.quickHighlights || {}),
          [field]: val,
        },
      },
    }));
  };

  // Helpers for updating active policy sections
  const handlePolicyHeaderChange = (field, val) => {
    setPolicies((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: val,
      },
    }));
  };

  const handleSectionChange = (index, field, val) => {
    setPolicies((prev) => {
      const currentSections = [...(prev[activeTab]?.sections || [])];
      currentSections[index] = {
        ...currentSections[index],
        [field]: val,
      };
      return {
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          sections: currentSections,
        },
      };
    });
  };

  const handleAddSection = () => {
    setPolicies((prev) => {
      const currentSections = [...(prev[activeTab]?.sections || [])];
      currentSections.push({
        id: `section-${Date.now()}`,
        heading: `${currentSections.length + 1}. New Policy Clause`,
        content: 'Enter the comprehensive legal clause details here...',
      });
      return {
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          sections: currentSections,
        },
      };
    });
  };

  const handleRemoveSection = (index) => {
    if (window.confirm('Are you sure you want to remove this clause from the policy?')) {
      setPolicies((prev) => {
        const currentSections = [...(prev[activeTab]?.sections || [])];
        currentSections.splice(index, 1);
        return {
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            sections: currentSections,
          },
        };
      });
    }
  };

  const policyTabs = [
    { id: 'shipping', label: 'Shipping & Delivery', icon: Truck, badge: '5–7 Days' },
    { id: 'refund', label: 'Return & Refund', icon: RotateCcw, badge: '5–7 Days Window' },
    { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck, badge: 'DPDP 2023' },
    { id: 'terms', label: 'Terms & Conditions', icon: FileText, badge: 'Standard' },
  ];

  const currentPolicy = policies[activeTab] || DEFAULT_POLICIES[activeTab];

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs uppercase tracking-widest text-brand-muted font-caps">Loading Policy Control Suite...</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-caps tracking-widest uppercase font-bold bg-brand-primary-light text-brand-primary border border-brand-primary/20">
              Regulatory Compliance
            </span>
            <span className="text-xs text-brand-muted">DPDP 2023 &bull; Consumer Protection Rules</span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-brand-tertiary mt-1">
            Legal Policies &amp; Delivery Management
          </h1>
          <p className="text-xs text-brand-muted mt-1 font-light">
            Manage your Shipping Policy, Return &amp; Refund terms, DPDP Privacy Policy, and Terms of Service with instant live storefront synchronization.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setPreviewOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-brand-border bg-white hover:bg-brand-surface text-brand-tertiary text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-brand-muted" />
            <span>Store Preview</span>
          </button>

          <button
            onClick={handleResetToDefault}
            className="px-3.5 py-2 rounded-xl border border-brand-border bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-brand-tertiary text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
            title="Reset to factory legal defaults"
          >
            <ResetIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold uppercase tracking-wider font-caps flex items-center space-x-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Policies'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center space-x-3 text-xs ${feedback.type === 'success'
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

      {/* 2. Core Business Directives Card (Shipping Timeline & Prepaid Perks) */}
      <section className="p-6 rounded-3xl bg-gradient-to-r from-white via-brand-surface to-[#FAF8FC] border border-brand-border shadow-xs space-y-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h2 className="font-sans text-sm font-bold text-brand-tertiary uppercase tracking-wider">
            Key Commercial Terms &amp; Live Customer Promises
          </h2>
        </div>
        <p className="text-xs text-brand-muted font-light">
          These values automatically display across the top notification ribbon, cart drawer, checkout modal, and policy hero strips.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Delivery Timeline */}
          <div className="p-4 rounded-2xl bg-white border border-brand-border/80 space-y-1.5 shadow-2xs">
            <label className="text-[10.5px] font-caps tracking-wider uppercase text-brand-muted font-bold flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-brand-primary" />
              <span>Standard Delivery Time</span>
            </label>
            <input
              type="text"
              value={policies.meta?.quickHighlights?.deliveryTimeline || '5–7 working days'}
              onChange={(e) => handleQuickHighlightChange('deliveryTimeline', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs font-semibold text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="e.g. 5–7 working days"
            />
            <span className="text-[10px] text-brand-muted font-light block">Standard delivery across all Indian pin codes</span>
          </div>

          {/* Shipping Fee */}
          <div className="p-4 rounded-2xl bg-white border border-brand-border/80 space-y-1.5 shadow-2xs">
            <label className="text-[10.5px] font-caps tracking-wider uppercase text-brand-muted font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pan-India Shipping Fee</span>
            </label>
            <input
              type="text"
              value={policies.meta?.quickHighlights?.shippingFee || '100% Free Shipping Across All India'}
              onChange={(e) => handleQuickHighlightChange('shippingFee', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs font-semibold text-emerald-700 focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="e.g. 100% Free Shipping Across All India"
            />
            <span className="text-[10px] text-brand-muted font-light block">Zero hidden freight charges nationwide</span>
          </div>

          {/* Prepaid Perk */}
          <div className="p-4 rounded-2xl bg-white border border-brand-border/80 space-y-1.5 shadow-2xs">
            <label className="text-[10.5px] font-caps tracking-wider uppercase text-brand-muted font-bold flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-purple-600" />
              <span>Prepaid Order Bonus Offer</span>
            </label>
            <input
              type="text"
              value={policies.meta?.quickHighlights?.prepaidPerk || 'Complimentary Free Zircon Necklace + Extra ₹50 Instant Discount'}
              onChange={(e) => handleQuickHighlightChange('prepaidPerk', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs font-semibold text-purple-900 focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="e.g. Free Zircon Necklace + ₹50 OFF"
            />
            <span className="text-[10px] text-brand-muted font-light block">Applied on UPI, Cards, NetBanking payments</span>
          </div>
        </div>

        {/* Contact & Support Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-brand-border/60 text-xs">
          <div>
            <label className="text-[10px] font-caps uppercase text-brand-muted font-bold block mb-1">Support Phone</label>
            <input
              type="text"
              value={policies.meta?.supportPhone || '+91 90234 22392'}
              onChange={(e) => handleMetaChange('supportPhone', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-brand-border text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] font-caps uppercase text-brand-muted font-bold block mb-1">WhatsApp Concierge</label>
            <input
              type="text"
              value={policies.meta?.whatsappNumber || '+91 70163 47945'}
              onChange={(e) => handleMetaChange('whatsappNumber', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-brand-border text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] font-caps uppercase text-brand-muted font-bold block mb-1">Support Email</label>
            <input
              type="email"
              value={policies.meta?.supportEmail || 'orders@valeriejewels.in'}
              onChange={(e) => handleMetaChange('supportEmail', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-brand-border text-xs"
            />
          </div>
        </div>
      </section>

      {/* 3. Policy Tab Selector */}
      <div className="flex items-center space-x-2 border-b border-brand-border pb-3 overflow-x-auto">
        {policyTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center space-x-2 transition-all ${isActive
                ? 'bg-brand-primary text-white shadow-sm'
                : 'bg-white text-brand-tertiary/75 hover:bg-brand-surface border border-brand-border/70'
                }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-brand-muted'}`} />
              <span>{tab.label}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-brand-surface text-brand-muted border border-brand-border'
                  }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Active Policy Details & Clauses Editor */}
      <div className="space-y-6">
        {/* Policy Header Info */}
        <div className="p-6 rounded-3xl bg-white border border-brand-border shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-caps uppercase text-brand-muted font-bold block mb-1">Page Title</label>
              <input
                type="text"
                value={currentPolicy.title || ''}
                onChange={(e) => handlePolicyHeaderChange('title', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-border text-sm font-bold text-brand-tertiary"
              />
            </div>
            <div>
              <label className="text-[11px] font-caps uppercase text-brand-muted font-bold block mb-1">Badge Tagline</label>
              <input
                type="text"
                value={currentPolicy.badge || ''}
                onChange={(e) => handlePolicyHeaderChange('badge', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-border text-sm font-medium text-brand-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-caps uppercase text-brand-muted font-bold block mb-1">Subtitle / Summary</label>
            <input
              type="text"
              value={currentPolicy.subtitle || ''}
              onChange={(e) => handlePolicyHeaderChange('subtitle', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs text-brand-muted"
            />
          </div>
        </div>

        {/* Clauses List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-brand-tertiary">
              Clauses &amp; Policy Sections ({currentPolicy.sections?.length || 0})
            </h3>

            <button
              onClick={handleAddSection}
              className="px-3 py-1.5 rounded-xl bg-brand-surface hover:bg-brand-primary-light text-brand-primary text-xs font-semibold border border-brand-border flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Clause</span>
            </button>
          </div>

          {(currentPolicy.sections || []).map((sec, idx) => (
            <div key={sec.id || idx} className="p-5 rounded-2xl bg-white border border-brand-border shadow-2xs space-y-3">
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  value={sec.heading || ''}
                  onChange={(e) => handleSectionChange(idx, 'heading', e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-brand-border text-xs font-bold text-brand-tertiary focus:ring-1 focus:ring-brand-primary"
                  placeholder="Clause Title (e.g. 1. Delivery Timelines)"
                />

                <button
                  onClick={() => handleRemoveSection(idx)}
                  className="p-1.5 rounded-lg text-brand-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Remove Clause"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <textarea
                rows={4}
                value={sec.content || ''}
                onChange={(e) => handleSectionChange(idx, 'content', e.target.value)}
                className="w-full p-3 rounded-xl border border-brand-border text-xs text-brand-tertiary font-light leading-relaxed focus:ring-1 focus:ring-brand-primary"
                placeholder="Clause text and details..."
              />
            </div>
          ))}

          <button
            onClick={handleAddSection}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-brand-border hover:border-brand-primary/50 text-brand-muted hover:text-brand-primary text-xs font-semibold flex items-center justify-center space-x-2 transition-all bg-brand-surface/40 hover:bg-white"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Policy Clause</span>
          </button>
        </div>
      </div>

      {/* 5. Live Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl border border-brand-border overflow-hidden animate-in fade-in">
            <div className="p-4 border-b border-brand-border bg-brand-surface flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-brand-primary" />
                <span className="text-xs font-bold text-brand-tertiary">Live Storefront Policy Preview</span>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="px-3 py-1 rounded-xl bg-white border border-brand-border text-xs font-semibold hover:bg-brand-surface"
              >
                Close Preview
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="text-center space-y-2 border-b border-brand-border pb-4">
                <span className="text-xs font-caps tracking-widest text-brand-primary font-bold uppercase">{currentPolicy.badge}</span>
                <h2 className="font-editorial text-2xl font-bold text-brand-tertiary">{currentPolicy.title}</h2>
                <p className="text-xs text-brand-muted">{currentPolicy.subtitle}</p>
              </div>

              <div className="space-y-4">
                {(currentPolicy.sections || []).map((sec, i) => (
                  <div key={i} className="p-4 rounded-xl bg-brand-surface/50 border border-brand-border/60 space-y-2">
                    <h4 className="text-xs font-bold text-brand-tertiary">{sec.heading}</h4>
                    <p className="text-xs text-brand-muted font-light leading-relaxed whitespace-pre-line">{sec.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
