import React, { useState, useEffect } from 'react';
import {
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  Phone,
  Mail,
  ShoppingBag,
  Eye,
  ExternalLink,
  Monitor,
  Smartphone,
  X,
  Sparkles,
  Clock,
  AlertTriangle,
  Truck,
  CheckCircle,
  RotateCcw
} from 'lucide-react';
import { adminApi } from './adminApi';

export default function AdminCustomersView() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Email Preview Modal State
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState('order_confirmation');
  const [activeDevice, setActiveDevice] = useState('desktop'); // 'desktop' | 'mobile'
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState({ html: '', subject: '' });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getCustomers({ search });
      setCustomers(res || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Fetch email preview whenever template changes or modal opens
  const fetchEmailPreview = async (templateType) => {
    try {
      setPreviewLoading(true);
      const res = await adminApi.previewEmailTemplate(templateType);
      setPreviewData({
        html: res.html || '',
        subject: res.subject || '',
      });
    } catch (err) {
      showToast(err.message || 'Failed to load email preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (emailPreviewOpen) {
      fetchEmailPreview(activeTemplate);
    }
  }, [emailPreviewOpen, activeTemplate]);

  const handleToggleBlock = async (user) => {
    const nextState = Number(user.is_blocked_rto) === 1 ? 0 : 1;
    const actionDesc = nextState === 1 ? 'BLOCK from COD (high RTO risk)' : 'UNBLOCK';
    if (!window.confirm(`Are you sure you want to ${actionDesc} for ${user.name}?`)) return;

    try {
      const res = await adminApi.toggleRtoBlock(user.id, nextState, `Manually toggled via Customer panel`);
      showToast(res.message);
      setCustomers((prev) =>
        prev.map((c) => (c.id === user.id ? { ...c, is_blocked_rto: nextState } : c))
      );
    } catch (err) {
      showToast(err.message || 'Failed to update RTO block status');
    }
  };

  const emailTemplates = [
    {
      id: 'order_confirmation',
      label: 'Order Successful',
      icon: Sparkles,
      desc: 'Sent immediately on purchase with logo, itemized pieces & gift perk',
      color: 'text-purple-700 bg-purple-100',
    },
    {
      id: 'order_on_hold',
      label: 'Order On Hold',
      icon: Clock,
      desc: 'Concierge review alert with specific hold reasons & WhatsApp resolution',
      color: 'text-amber-700 bg-amber-100',
    },
    {
      id: 'order_failed',
      label: 'Order Failed',
      icon: AlertTriangle,
      desc: 'Reassurance on pending bank refunds & 1-click cart recovery link',
      color: 'text-rose-700 bg-rose-100',
    },
    {
      id: 'order_status_update',
      label: 'Status Update',
      icon: Truck,
      desc: 'Dynamic milestone badge, custom concierge note & live tracking',
      color: 'text-blue-700 bg-blue-100',
    },
    {
      id: 'order_shipped',
      label: 'Order Shipped',
      icon: Truck,
      desc: 'Air Express courier partner, AWB waybill code & tracking link',
      color: 'text-indigo-700 bg-indigo-100',
    },
    {
      id: 'order_cancelled',
      label: 'Order Cancelled',
      icon: RotateCcw,
      desc: 'Confirmed cancellation & refund transaction receipt',
      color: 'text-gray-700 bg-gray-100',
    },
  ];

  return (
    <div className="p-6 sm:p-8 space-y-6 w-full">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-tertiary text-white px-4 py-2.5 rounded-xl shadow-luxury text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Header with Email Preview Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-caps tracking-widest uppercase text-brand-primary font-bold">
            Customer Intelligence & Risk Control
          </span>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-brand-tertiary mt-1">
            Customer Database & RTO Protection
          </h1>
        </div>

        {/* CUSTOMER EMAIL FORMAT PREVIEW BUTTON */}
        <button
          onClick={() => setEmailPreviewOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white text-xs font-semibold flex items-center space-x-2 shadow-luxury hover:opacity-95 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Mail className="w-4 h-4" />
          <span>Preview Customer Email Formats</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-2xs">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadCustomers()}
            placeholder="Search by customer name, phone, email..."
            className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2 pl-9 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
          />
          <Search className="w-3.5 h-3.5 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Customer Database Table */}
      <div className="bg-white rounded-3xl border border-brand-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8FC] border-b border-brand-border text-brand-muted font-caps tracking-wider text-[10px] uppercase">
              <tr>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Phone & Email</th>
                <th className="py-3.5 px-4">Total Orders</th>
                <th className="py-3.5 px-4">Lifetime Spend</th>
                <th className="py-3.5 px-4">RTO / Cancel Incidents</th>
                <th className="py-3.5 px-4 text-right">RTO Risk Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-brand-muted">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-brand-muted">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const isBlocked = Number(c.is_blocked_rto) === 1;
                  return (
                    <tr key={c.id} className="hover:bg-[#FAF8FC] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-brand-tertiary flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-brand-primary-light text-brand-primary flex items-center justify-center font-bold text-[11px]">
                            {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <span>{c.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="text-brand-tertiary">{c.phone || 'N/A'}</div>
                        <div className="text-[10px] text-brand-muted">{c.email}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-brand-tertiary">
                        {c.total_orders} orders
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-tertiary">
                        ₹{Number(c.total_spent).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-mono font-semibold ${
                            Number(c.rto_cancellations) > 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {c.rto_cancellations} cancelled
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleBlock(c)}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all border ${
                            isBlocked
                              ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          {isBlocked ? 'Blocked (RTO Risk)' : 'Verified (COD Allowed)'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LUXURY CUSTOMER EMAIL FORMAT & TEMPLATE PREVIEW MODAL */}
      {/* ========================================================================= */}
      {emailPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-5xl w-full h-[92vh] flex flex-col shadow-2xl border border-brand-border overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-brand-border flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-brand-primary flex items-center justify-center font-bold">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-caps tracking-widest uppercase text-brand-primary font-bold">
                      Valerie Jewels Brand Experience
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-brand-primary-light text-brand-primary border border-brand-primary/20">
                      Live Preview
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-editorial font-bold text-brand-tertiary">
                    Customer Email Format & Layout Inspector
                  </h3>
                </div>
              </div>

              {/* Viewport and Close Actions */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* Device Viewport Switcher */}
                <div className="flex items-center bg-[#FAF8FC] p-1 rounded-xl border border-brand-border">
                  <button
                    onClick={() => setActiveDevice('desktop')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      activeDevice === 'desktop'
                        ? 'bg-white text-brand-primary shadow-xs'
                        : 'text-brand-muted hover:text-brand-tertiary'
                    }`}
                    title="Desktop Email Client (600px)"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Desktop</span>
                  </button>
                  <button
                    onClick={() => setActiveDevice('mobile')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      activeDevice === 'mobile'
                        ? 'bg-white text-brand-primary shadow-xs'
                        : 'text-brand-muted hover:text-brand-tertiary'
                    }`}
                    title="Mobile Email Client (375px)"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Mobile</span>
                  </button>
                </div>

                <a
                  href={`/api/admin/orders.php?action=preview_email&type=${activeTemplate}&format=html&token=${localStorage.getItem('valerie_admin_token') || ''}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-brand-muted hover:text-brand-primary rounded-xl hover:bg-gray-100 transition-colors"
                  title="Open Full HTML in New Tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  onClick={() => setEmailPreviewOpen(false)}
                  className="p-2 text-brand-muted hover:text-brand-tertiary rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Template Tabs Strip */}
            <div className="px-4 py-2.5 bg-[#FAF8FC] border-b border-brand-border flex items-center space-x-2 overflow-x-auto shrink-0">
              {emailTemplates.map((t) => {
                const IconComponent = t.icon;
                const isActive = activeTemplate === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTemplate(t.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-brand-primary text-white shadow-luxury'
                        : 'bg-white text-brand-tertiary hover:bg-purple-50/70 border border-brand-border/80'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Email Subject & Meta Banner */}
            <div className="px-4 py-2 bg-purple-50/70 border-b border-purple-100/60 flex items-center justify-between text-[11px] shrink-0">
              <div className="flex items-center space-x-2 truncate">
                <span className="font-bold text-brand-primary uppercase tracking-wider text-[10px]">Email Subject:</span>
                <span className="font-semibold text-brand-tertiary truncate">{previewData.subject || 'Loading subject...'}</span>
              </div>
              <div className="hidden sm:flex items-center space-x-3 text-brand-muted text-[10px]">
                <span>Brand Logo: <strong>Top /valerie.png</strong></span>
                <span>•</span>
                <span>Delivery Note: <strong>5–7 Days Express</strong></span>
              </div>
            </div>

            {/* Live Interactive Render Viewport */}
            <div className="flex-1 bg-[#F5F1FA] overflow-y-auto p-4 sm:p-6 flex justify-center items-start">
              {previewLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-brand-muted space-x-2 py-20">
                  <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>Rendering Luxury Valerie Template...</span>
                </div>
              ) : (
                <div
                  className={`bg-white rounded-2xl shadow-xl border border-brand-border transition-all duration-300 overflow-hidden ${
                    activeDevice === 'mobile' ? 'w-[390px]' : 'w-[640px]'
                  }`}
                  style={{ minHeight: '600px' }}
                >
                  <iframe
                    title="Valerie Jewels Email Preview"
                    srcDoc={previewData.html}
                    className="w-full h-[700px] border-0"
                    sandbox="allow-same-origin allow-popups"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer Features Bar */}
            <div className="p-3.5 px-6 border-t border-brand-border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-brand-muted shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center space-x-1 text-brand-tertiary font-medium">
                  <Sparkles className="w-3 h-3 text-brand-primary" />
                  <span>Valerie Jewels Brand Theme Applied</span>
                </span>
                <span>•</span>
                <span>Full itemized pieces recap</span>
                <span>•</span>
                <span>WhatsApp support integration</span>
              </div>
              <button
                onClick={() => setEmailPreviewOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-brand-tertiary font-semibold self-end sm:self-auto transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
