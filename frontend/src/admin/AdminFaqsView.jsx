import React, { useState, useEffect, useMemo } from 'react';
import {
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Search,
  ChevronDown,
  Layers,
  ArrowUpDown,
  X,
  Sparkles,
  Truck,
  Tag,
  ChevronUp,
  MessageCircle,
  Phone,
  Clock
} from 'lucide-react';
import { adminApi } from './adminApi';
import { DEFAULT_FAQS_DATA } from '../data/defaultFaqs';
import FaqPage from '../components/FaqPage';

export default function AdminFaqsView({ currentUser }) {
  const [faqsData, setFaqsData] = useState(DEFAULT_FAQS_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [conciergeCardOpen, setConciergeCardOpen] = useState(true);
  const [savingConcierge, setSavingConcierge] = useState(false);

  // Derived Concierge Contact Details from faqsData
  const concierge = faqsData.concierge || {
    enabled: true,
    eyebrow: 'Still Have Questions?',
    title: 'Speak with a Valerie Concierge',
    description: 'Our dedicated jewelry concierge team is available 7 days a week from 8:00 AM to 4:00 PM IST to assist you with styling advice, orders, or tracking.',
    whatsappNumber: '+91 70163 47945',
    whatsappMessage: 'Hello Valerie Jewels Concierge, I have an inquiry about my order / jewelry.',
    phone: '+91 90234 22392',
    hours: '7 days a week from 8:00 AM to 4:00 PM IST',
  };

  const updateConcierge = (field, val) => {
    setFaqsData((prev) => ({
      ...prev,
      concierge: {
        ...(prev.concierge || {
          enabled: true,
          eyebrow: 'Still Have Questions?',
          title: 'Speak with a Valerie Concierge',
          description: 'Our dedicated jewelry concierge team is available 7 days a week from 8:00 AM to 4:00 PM IST to assist you with styling advice, orders, or tracking.',
          whatsappNumber: '+91 70163 47945',
          whatsappMessage: 'Hello Valerie Jewels Concierge, I have an inquiry about my order / jewelry.',
          phone: '+91 90234 22392',
          hours: '7 days a week from 8:00 AM to 4:00 PM IST',
        }),
        [field]: val,
      },
    }));
  };

  // Dedicated Save for Concierge Details
  const handleSaveConciergeOnly = async () => {
    setSavingConcierge(true);
    setStatusMessage(null);
    try {
      const res = await adminApi.updateFaqs(faqsData);
      setFaqsData(res || faqsData);
      setStatusMessage({
        type: 'success',
        text: 'Concierge contact details successfully updated and live on /faqs!',
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to update concierge details.',
      });
    } finally {
      setSavingConcierge(false);
    }
  };

  // Modal states for Create / Edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    category: 'Shipping & Delivery',
    q: '',
    a: '',
    isActive: true,
    priority: 1
  });
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Fetch FAQs
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await adminApi.getFaqs();
        if (isMounted && data && data.faqs) {
          setFaqsData(data);
        }
      } catch (err) {
        console.warn('AdminFaqsView: load error, using default FAQs:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  const categories = useMemo(() => {
    return faqsData.categories || [
      'Shipping & Delivery',
      'Orders & Payments',
      'Jewelry Care & Quality',
      'Returns & Refunds',
      'Gifting & Packaging',
      'Customer Support',
    ];
  }, [faqsData]);

  const filteredFaqs = useMemo(() => {
    let list = faqsData.faqs || [];
    if (selectedCategoryFilter !== 'All') {
      list = list.filter((f) => f.category === selectedCategoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          (f.q && f.q.toLowerCase().includes(q)) ||
          (f.a && f.a.toLowerCase().includes(q)) ||
          (f.category && f.category.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => (Number(a.priority) || 99) - (Number(b.priority) || 99));
  }, [faqsData, selectedCategoryFilter, searchQuery]);

  // Open Create FAQ Modal
  const handleOpenCreateModal = () => {
    setEditingFaq(null);
    setFormData({
      id: `faq-${Date.now()}`,
      category: categories[0] || 'Shipping & Delivery',
      q: '',
      a: '',
      isActive: true,
      priority: (faqsData.faqs?.length || 0) + 1
    });
    setNewCategoryInput('');
    setIsEditModalOpen(true);
  };

  // Open Edit FAQ Modal
  const handleOpenEditModal = (faq) => {
    setEditingFaq(faq);
    setFormData({
      id: faq.id || `faq-${Date.now()}`,
      category: faq.category || 'Shipping & Delivery',
      q: faq.q || '',
      a: faq.a || '',
      isActive: faq.isActive !== false,
      priority: faq.priority || 1
    });
    setNewCategoryInput('');
    setIsEditModalOpen(true);
  };

  // Save Modal Form
  const handleSaveFaqModal = (e) => {
    e.preventDefault();
    if (!formData.q.trim() || !formData.a.trim()) {
      alert('Please fill out both the question and answer fields.');
      return;
    }

    const finalCategory = newCategoryInput.trim() ? newCategoryInput.trim() : formData.category;

    // Update categories list if new category added
    let updatedCategories = [...categories];
    if (newCategoryInput.trim() && !updatedCategories.includes(newCategoryInput.trim())) {
      updatedCategories.push(newCategoryInput.trim());
    }

    const newFaqItem = {
      ...formData,
      category: finalCategory,
      priority: Number(formData.priority) || 1
    };

    let updatedFaqs = [...(faqsData.faqs || [])];
    if (editingFaq) {
      updatedFaqs = updatedFaqs.map((f) => (f.id === editingFaq.id ? newFaqItem : f));
    } else {
      updatedFaqs.push(newFaqItem);
    }

    setFaqsData({
      ...faqsData,
      categories: updatedCategories,
      faqs: updatedFaqs
    });

    setIsEditModalOpen(false);
    setStatusMessage({ type: 'info', text: 'FAQ updated in workspace. Click "Publish FAQs" to sync live to MySQL.' });
  };

  // Delete FAQ
  const handleDeleteFaq = (faqId) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) return;
    const updated = (faqsData.faqs || []).filter((f) => f.id !== faqId);
    setFaqsData({
      ...faqsData,
      faqs: updated
    });
    setStatusMessage({ type: 'info', text: 'FAQ removed from draft. Click "Publish FAQs" to save changes.' });
  };

  // Toggle Active Status
  const handleToggleActive = (faqId) => {
    const updated = (faqsData.faqs || []).map((f) =>
      f.id === faqId ? { ...f, isActive: !f.isActive } : f
    );
    setFaqsData({
      ...faqsData,
      faqs: updated
    });
  };

  // Reset to Defaults
  const handleResetToDefaults = () => {
    if (!window.confirm('Reset all FAQs to the verified Valerie Jewels standard benchmark? Any unsaved edits will be discarded.')) return;
    setFaqsData(DEFAULT_FAQS_DATA);
    setStatusMessage({ type: 'info', text: 'Reset to default Valerie FAQs template. Remember to click "Publish FAQs" to save.' });
  };

  // Save / Publish to MySQL Backend
  const handlePublishFaqs = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await adminApi.updateFaqs(faqsData);
      setFaqsData(res || faqsData);
      setStatusMessage({
        type: 'success',
        text: 'All FAQs have been successfully published and synced to the live storefront!'
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      console.error('Save FAQs error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to publish FAQs to server. Check database connection.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs uppercase tracking-wider text-brand-muted">Loading FAQ Administration Portal...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-brand-border shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-purple-50 text-brand-primary">
              <HelpCircle className="w-5 h-5" />
            </span>
            <div>
              <h1 className="font-editorial text-2xl font-bold text-brand-tertiary">
                Customer FAQs &amp; Help Desk Management
              </h1>
              <p className="text-xs text-brand-muted font-light mt-0.5">
                Manage questions, categorized answers, and priorities for the dedicated /faqs page and homepage widget.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleResetToDefaults}
            className="px-3.5 py-2 rounded-xl border border-brand-border text-xs font-semibold text-brand-muted hover:text-brand-tertiary hover:bg-brand-surface transition-colors flex items-center space-x-1.5"
            title="Reset to default benchmark FAQs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={() => setShowPreviewModal(true)}
            className="px-4 py-2 rounded-xl border border-brand-primary/30 text-xs font-semibold text-brand-primary hover:bg-brand-primary-light transition-colors flex items-center space-x-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Preview</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-[#FAF5FF] border border-brand-primary/40 text-brand-primary hover:bg-brand-primary hover:text-white text-xs font-semibold shadow-xs transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add New FAQ</span>
          </button>

          <button
            onClick={handlePublishFaqs}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-wider uppercase font-bold shadow-sm flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Publishing...' : 'Publish FAQs'}</span>
          </button>
        </div>
      </div>

      {/* Status Feedback Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 hover:opacity-75 text-xs font-bold"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Concierge Support Banner Configuration Card (Speak with a Valerie Concierge) ── */}
      <div className="bg-white rounded-2xl border border-brand-border shadow-xs overflow-hidden">
        <div 
          onClick={() => setConciergeCardOpen(!conciergeCardOpen)}
          className="p-5 border-b border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer bg-gradient-to-r from-emerald-50/40 via-purple-50/30 to-white hover:bg-emerald-50/60 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <MessageCircle className="w-5 h-5 fill-emerald-600/20" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-editorial text-lg font-bold text-brand-tertiary">
                  "Speak with a Valerie Concierge" Contact Controls
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  concierge.enabled !== false 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {concierge.enabled !== false ? '● Live on /faqs' : '○ Hidden'}
                </span>
              </div>
              <p className="text-xs text-brand-muted font-light mt-0.5">
                Update the contact numbers, WhatsApp prefilled message, and concierge guidance shown on the /faqs customer banner.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={handleSaveConciergeOnly}
              disabled={savingConcierge}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingConcierge ? 'Saving...' : 'Save Concierge Details'}</span>
            </button>
            <button
              type="button"
              onClick={() => setConciergeCardOpen(!conciergeCardOpen)}
              className="p-2 rounded-xl border border-brand-border text-brand-muted hover:text-brand-tertiary hover:bg-white transition-colors"
              title={conciergeCardOpen ? 'Collapse' : 'Expand'}
            >
              {conciergeCardOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {conciergeCardOpen && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Form Controls (7 cols) */}
              <div className="lg:col-span-7 space-y-4 text-xs">
                
                {/* Section Eyebrow & Title */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1">
                      Eyebrow Tag *
                    </label>
                    <input
                      type="text"
                      value={concierge.eyebrow || ''}
                      onChange={(e) => updateConcierge('eyebrow', e.target.value)}
                      placeholder="e.g. STILL HAVE QUESTIONS?"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/30 focus:bg-white text-xs text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary font-medium"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1">
                      Concierge Section Title *
                    </label>
                    <input
                      type="text"
                      value={concierge.title || ''}
                      onChange={(e) => updateConcierge('title', e.target.value)}
                      placeholder="e.g. Speak with a Valerie Concierge"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/30 focus:bg-white text-xs text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary font-bold"
                    />
                  </div>
                </div>

                {/* Concierge Description */}
                <div>
                  <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1">
                    Concierge Description / Guidance *
                  </label>
                  <textarea
                    rows={3}
                    value={concierge.description || ''}
                    onChange={(e) => updateConcierge('description', e.target.value)}
                    placeholder="Enter availability hours and how the concierge team can assist patrons..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/30 focus:bg-white text-xs text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary leading-relaxed font-light"
                  />
                </div>

                {/* Primary Contact Numbers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp Number *</span>
                    </label>
                    <input
                      type="text"
                      value={concierge.whatsappNumber || ''}
                      onChange={(e) => updateConcierge('whatsappNumber', e.target.value)}
                      placeholder="e.g. +91 70163 47945"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/30 focus:bg-white text-xs text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono font-medium"
                    />
                    <span className="text-[10px] text-brand-muted mt-0.5 block">Used for the green 1-click WhatsApp button</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Direct Helpline Phone Number *</span>
                    </label>
                    <input
                      type="text"
                      value={concierge.phone || ''}
                      onChange={(e) => updateConcierge('phone', e.target.value)}
                      placeholder="e.g. +91 90234 22392"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/30 focus:bg-white text-xs text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono font-medium"
                    />
                    <span className="text-[10px] text-brand-muted mt-0.5 block">Dials automatically when patrons click Call</span>
                  </div>
                </div>

                {/* WhatsApp Prefilled Message & Hours */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1">
                      WhatsApp Pre-filled Message
                    </label>
                    <input
                      type="text"
                      value={concierge.whatsappMessage || ''}
                      onChange={(e) => updateConcierge('whatsappMessage', e.target.value)}
                      placeholder="e.g. Hello Valerie Jewels Concierge, I have an inquiry."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/30 focus:bg-white text-xs text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1">
                      Operating Hours (Reference)
                    </label>
                    <input
                      type="text"
                      value={concierge.hours || ''}
                      onChange={(e) => updateConcierge('hours', e.target.value)}
                      placeholder="e.g. 7 days a week from 8:00 AM to 4:00 PM IST"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/30 focus:bg-white text-xs text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>
                </div>

                {/* Visibility Toggle & Save Action */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-brand-border">
                  <label className="inline-flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={concierge.enabled !== false}
                      onChange={(e) => updateConcierge('enabled', e.target.checked)}
                      className="rounded text-brand-primary focus:ring-brand-primary w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs text-brand-tertiary font-semibold">
                      Display "Speak with a Valerie Concierge" banner on /faqs
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleSaveConciergeOnly}
                    disabled={savingConcierge}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingConcierge ? 'Saving Details...' : 'Save Concierge Details'}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Live Storefront Preview (5 cols) */}
              <div className="lg:col-span-5 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-brand-muted">
                  <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Live Preview (Exact /faqs Layout)</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                    Real-Time Visualizer
                  </span>
                </div>

                {/* Mock Banner exactly replicating the user's screenshot */}
                <div className="rounded-2xl p-5 bg-gradient-to-r from-[#FAF5FF] via-white to-[#FFF5F8] border border-brand-primary/20 shadow-xs space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-caps uppercase tracking-wider text-brand-primary font-bold block">
                      {concierge.eyebrow || 'STILL HAVE QUESTIONS?'}
                    </span>
                    <h3 className="font-editorial text-lg sm:text-xl font-bold text-brand-tertiary leading-snug">
                      {concierge.title || 'Speak with a Valerie Concierge'}
                    </h3>
                    <p className="text-[11.5px] text-brand-muted font-light leading-relaxed">
                      {concierge.description || 'Our dedicated jewelry concierge team is available 7 days a week from 8:00 AM to 4:00 PM IST to assist you with styling advice, orders, or tracking.'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    {concierge.whatsappNumber && (
                      <div className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-2xs">
                        <MessageCircle className="w-4 h-4 fill-white/20 shrink-0" />
                        <span className="truncate">WhatsApp: {concierge.whatsappNumber}</span>
                      </div>
                    )}

                    {concierge.phone && (
                      <div className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-border text-brand-tertiary text-xs font-semibold flex items-center justify-center space-x-2 shadow-2xs">
                        <Phone className="w-4 h-4 text-brand-primary shrink-0" />
                        <span className="truncate">Call: {concierge.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-brand-border/60 text-[10px] text-brand-muted flex flex-col gap-0.5 font-mono">
                    <span className="truncate">WhatsApp Link: https://wa.me/{(concierge.whatsappNumber || '').replace(/\D/g, '')}</span>
                    <span className="truncate">Call Dial: tel:{(concierge.phone || '').replace(/\s+/g, '')}</span>
                  </div>
                </div>

                <p className="text-[10px] text-brand-muted/80 italic text-center">
                  Changes made here update live on <strong className="font-medium text-brand-primary">valeriejewels.in/faqs</strong> when published.
                </p>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-brand-muted shrink-0">Category:</span>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-brand-border text-xs text-brand-tertiary bg-brand-surface/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
          >
            <option value="All">All Categories ({faqsData.faqs?.length || 0})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions or answers..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-brand-border text-xs text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary bg-brand-surface/30"
          />
        </div>
      </div>

      {/* FAQs Table / Card List */}
      <div className="bg-white rounded-2xl border border-brand-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-brand-border flex items-center justify-between bg-brand-surface/30">
          <div className="text-xs font-bold text-brand-tertiary flex items-center space-x-2">
            <span>Questions List</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
              {filteredFaqs.length} Active in view
            </span>
          </div>
          <span className="text-[11px] text-brand-muted font-light">
            Priority controls storefront ordering (1 = top)
          </span>
        </div>

        {filteredFaqs.length === 0 ? (
          <div className="p-12 text-center text-brand-muted text-xs space-y-2">
            <HelpCircle className="w-8 h-8 mx-auto text-brand-muted/40" />
            <p>No questions found matching your filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-brand-border/60">
            {filteredFaqs.map((faq) => (
              <div
                key={faq.id}
                className={`p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                  faq.isActive === false ? 'bg-zinc-50 opacity-60' : 'hover:bg-[#FAF8FC]'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-brand-primary-light text-brand-primary border border-brand-primary/20">
                      {faq.category}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-gray-100 text-gray-700">
                      Priority #{faq.priority || 1}
                    </span>
                    {faq.isActive === false && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                        Inactive / Hidden
                      </span>
                    )}
                  </div>
                  <h3 className="font-editorial text-base font-bold text-brand-tertiary">
                    {faq.q}
                  </h3>
                  <p className="text-xs text-brand-muted font-light line-clamp-2 leading-relaxed">
                    {faq.a}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleToggleActive(faq.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      faq.isActive !== false
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {faq.isActive !== false ? 'Live' : 'Hidden'}
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(faq)}
                    className="p-1.5 rounded-lg border border-brand-border hover:bg-brand-primary-light hover:text-brand-primary text-brand-muted transition-colors"
                    title="Edit FAQ"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteFaq(faq.id)}
                    className="p-1.5 rounded-lg border border-brand-border hover:bg-rose-50 hover:text-rose-600 text-brand-muted transition-colors"
                    title="Delete FAQ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create or Edit FAQ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-brand-border p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-brand-primary" />
                <h3 className="font-editorial text-lg font-bold text-brand-tertiary">
                  {editingFaq ? 'Edit Frequently Asked Question' : 'Add New FAQ'}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-brand-muted hover:text-brand-tertiary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFaqModal} className="space-y-4 text-xs">
              {/* Category selector */}
              <div>
                <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/30 focus:bg-white text-xs text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <div className="mt-2">
                  <span className="text-[10.5px] text-brand-muted">Or create a new category:</span>
                  <input
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    placeholder="e.g. Ring Sizing & Guide"
                    className="w-full mt-1 px-3 py-1.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* Question */}
              <div>
                <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1">
                  Question Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.q}
                  onChange={(e) => setFormData({ ...formData, q: e.target.value })}
                  placeholder="e.g. How long does delivery take across India?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/30 focus:bg-white text-xs text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary font-medium"
                />
              </div>

              {/* Answer */}
              <div>
                <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1">
                  Answer Text (Supports multi-line formatting) *
                </label>
                <textarea
                  rows={5}
                  required
                  value={formData.a}
                  onChange={(e) => setFormData({ ...formData, a: e.target.value })}
                  placeholder="Enter clear, comprehensive customer guidance..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface/30 focus:bg-white text-xs text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary leading-relaxed font-light"
                ></textarea>
              </div>

              {/* Priority and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1">
                    Display Priority Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-border bg-brand-surface/30 focus:bg-white text-xs"
                  />
                  <span className="text-[10px] text-brand-muted mt-0.5 block">Smaller number displays first</span>
                </div>

                <div>
                  <label className="block text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold mb-1">
                    Visibility Status
                  </label>
                  <label className="inline-flex items-center space-x-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded text-brand-primary focus:ring-brand-primary w-4 h-4"
                    />
                    <span className="text-xs text-brand-tertiary font-semibold">
                      Visible on Live Storefront
                    </span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-brand-border flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-brand-border text-xs font-semibold text-brand-muted hover:text-brand-tertiary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold shadow-xs"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Live Storefront Preview */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-brand-border">
            <div className="px-6 py-3 border-b border-brand-border flex items-center justify-between bg-zinc-900 text-white">
              <div className="flex items-center space-x-2 text-xs">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold uppercase tracking-wider">
                  Live FAQ Page Simulation (/faqs)
                </span>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <FaqPage onReturnToStore={() => setShowPreviewModal(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
