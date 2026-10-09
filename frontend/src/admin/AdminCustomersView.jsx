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
  RotateCcw,
  MailCheck,
  RefreshCw,
  AlertCircle,
  CreditCard,
  XCircle,
  History
} from 'lucide-react';
import { adminApi } from './adminApi';

export default function AdminCustomersView() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Customer Email History Modal State
  const [customerEmailModalOpen, setCustomerEmailModalOpen] = useState(false);
  const [selectedCustomerForEmails, setSelectedCustomerForEmails] = useState(null);
  const [customerEmailLogs, setCustomerEmailLogs] = useState([]);
  const [loadingCustomerEmailLogs, setLoadingCustomerEmailLogs] = useState(false);

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

  const getEmailTypeBadgeInfo = (emailType) => {
    const type = String(emailType || '').toLowerCase();
    if (type === 'order_confirmation') {
      return {
        label: 'Order Confirmed',
        icon: CheckCircle,
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-500'
      };
    }
    if (type === 'order_failed') {
      return {
        label: 'Payment Incomplete / Failed',
        icon: AlertCircle,
        bg: 'bg-rose-100 text-rose-800 border-rose-300',
        dot: 'bg-rose-500'
      };
    }
    if (type === 'payment_reminder') {
      return {
        label: 'Payment Reminder',
        icon: CreditCard,
        bg: 'bg-purple-100 text-purple-800 border-purple-300',
        dot: 'bg-purple-500'
      };
    }
    if (type === 'order_shipped') {
      return {
        label: 'Order Shipped / Tracking',
        icon: Truck,
        bg: 'bg-blue-100 text-blue-800 border-blue-300',
        dot: 'bg-blue-500'
      };
    }
    if (type === 'order_on_hold') {
      return {
        label: 'Order On Hold',
        icon: Clock,
        bg: 'bg-amber-100 text-amber-800 border-amber-300',
        dot: 'bg-amber-500'
      };
    }
    if (type === 'order_cancelled') {
      return {
        label: 'Order Cancelled',
        icon: XCircle,
        bg: 'bg-red-100 text-red-800 border-red-300',
        dot: 'bg-red-500'
      };
    }
    if (type.startsWith('status_update_') || type === 'order_status_update') {
      const milestone = type.replace('status_update_', '').replace('order_status_update', 'milestone').replace(/_/g, ' ');
      return {
        label: `Status: ${milestone.toUpperCase()}`,
        icon: RefreshCw,
        bg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        dot: 'bg-indigo-500'
      };
    }
    return {
      label: type.replace(/_/g, ' ').toUpperCase(),
      icon: Mail,
      bg: 'bg-gray-100 text-gray-800 border-gray-300',
      dot: 'bg-gray-500'
    };
  };

  const renderEmailTypeBadges = (typesStringOrArray) => {
    if (!typesStringOrArray) return null;
    let types = [];
    if (Array.isArray(typesStringOrArray)) {
      types = typesStringOrArray;
    } else if (typeof typesStringOrArray === 'string') {
      types = typesStringOrArray.split(',').map((t) => t.trim()).filter(Boolean);
    }
    if (types.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-1">
        {types.map((t, idx) => {
          const badge = getEmailTypeBadgeInfo(t);
          const IconComp = badge.icon;
          return (
            <span
              key={`${t}-${idx}`}
              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
              title={`Dispatched Email Type: ${badge.label}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
              <IconComp className="w-2.5 h-2.5 shrink-0" />
              <span>{badge.label}</span>
            </span>
          );
        })}
      </div>
    );
  };

  const openCustomerEmailModal = async (cust) => {
    if (!cust) return;
    setSelectedCustomerForEmails(cust);
    setCustomerEmailModalOpen(true);
    setLoadingCustomerEmailLogs(true);
    try {
      const res = await adminApi.getSentEmailLogs({ email: cust.email });
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setCustomerEmailLogs(list);
    } catch (err) {
      showToast(err.message || 'Failed to load customer email history');
      setCustomerEmailLogs([]);
    } finally {
      setLoadingCustomerEmailLogs(false);
    }
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
                <th className="py-3.5 px-4 text-center font-bold text-brand-primary">Emails Sent</th>
                <th className="py-3.5 px-4 text-right">RTO Risk Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-muted">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-muted">
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

                      {/* Emails Sent Count & Types */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center space-y-1.5 min-w-[120px]">
                          <button
                            type="button"
                            onClick={() => openCustomerEmailModal(c)}
                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center space-x-1.5 shadow-2xs ${
                              Number(c.emails_sent_count) > 0
                                ? 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
                            }`}
                            title={`View emails sent to ${c.name || 'customer'}`}
                          >
                            <MailCheck className="w-3.5 h-3.5 text-purple-700" />
                            <span>{c.emails_sent_count || 0} Sent</span>
                          </button>

                          {Number(c.emails_sent_count) > 0 ? (
                            <div className="flex flex-col items-center space-y-1">
                              <div className="max-w-[150px] truncate flex justify-center">
                                {renderEmailTypeBadges(c.sent_email_types || c.latest_email_type)}
                              </div>
                              <button
                                type="button"
                                onClick={() => openCustomerEmailModal(c)}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#26153D] hover:bg-brand-primary text-white transition-colors cursor-pointer flex items-center space-x-1 shadow-2xs"
                                title={`View email types sent to ${c.name}`}
                              >
                                <Eye className="w-2.5 h-2.5 text-amber-300" />
                                <span>View Types ({c.emails_sent_count})</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-brand-muted italic">None dispatched</span>
                          )}
                        </div>
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

      {/* ========================================================================= */}
      {/* CUSTOMER EMAIL HISTORY & TYPES MODAL */}
      {/* ========================================================================= */}
      {customerEmailModalOpen && selectedCustomerForEmails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 border border-brand-border shadow-luxury space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-brand-primary flex items-center justify-center shrink-0 shadow-2xs">
                  <MailCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-caps tracking-widest uppercase text-brand-primary font-bold">
                    Customer Email Intelligence
                  </span>
                  <h3 className="text-base font-editorial font-bold text-brand-tertiary">
                    Email Dispatch History • {selectedCustomerForEmails.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomerEmailModalOpen(false)}
                className="p-1.5 text-brand-muted hover:text-brand-tertiary rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Snapshot */}
            <div className="bg-[#FAF8FC] rounded-2xl p-4 border border-brand-border/80 space-y-2 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold text-brand-tertiary text-sm">{selectedCustomerForEmails.name}</div>
                  <div className="text-brand-muted text-[11px] font-mono">{selectedCustomerForEmails.email}</div>
                  {selectedCustomerForEmails.phone && (
                    <div className="text-brand-muted text-[11px] font-mono">{selectedCustomerForEmails.phone}</div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-brand-muted uppercase font-bold tracking-wider block">Customer Metrics</span>
                  <div className="font-bold text-brand-tertiary font-mono">
                    {selectedCustomerForEmails.total_orders || 0} Orders • ₹{Number(selectedCustomerForEmails.total_spent || 0).toLocaleString('en-IN')}
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200 mt-1">
                    {customerEmailLogs.length} Total Dispatches
                  </span>
                </div>
              </div>
            </div>

            {/* Email Types Sent Summary Strip */}
            <div className="p-3.5 bg-gradient-to-r from-purple-50 via-[#FAF8FC] to-purple-50/50 rounded-2xl border border-purple-200/80 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-caps tracking-wider uppercase font-bold text-purple-900">
                <span className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Email Types Sent to this Customer</span>
                </span>
                <span className="font-mono bg-purple-200/90 text-purple-950 px-2.5 py-0.5 rounded-full font-bold">
                  {customerEmailLogs.length} Total Emails
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {customerEmailLogs.length === 0 ? (
                  <span className="text-xs text-brand-muted">No emails recorded yet.</span>
                ) : (
                  Object.entries(
                    customerEmailLogs.reduce((acc, l) => {
                      const t = l.email_type || 'other';
                      acc[t] = (acc[t] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([type, count]) => {
                    const badge = getEmailTypeBadgeInfo(type);
                    const IconComp = badge.icon;
                    return (
                      <span
                        key={type}
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-2xs ${badge.bg}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${badge.dot}`}></span>
                        <IconComp className="w-3.5 h-3.5 shrink-0" />
                        <span>{badge.label}</span>
                        <span className="ml-1 px-1.5 py-0.2 rounded-full bg-black/10 text-[10px] font-mono">
                          ×{count}
                        </span>
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            {/* Audit Trail List */}
            <div className="space-y-3">
              <div className="text-[11px] text-brand-muted font-caps tracking-wider uppercase font-bold flex items-center justify-between">
                <span>All Dispatched Emails</span>
                <span className="text-brand-tertiary">{customerEmailLogs.length} recorded</span>
              </div>

              {loadingCustomerEmailLogs ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-brand-muted">
                  <RefreshCw className="w-6 h-6 animate-spin text-brand-primary" />
                  <span className="text-xs font-medium">Loading customer email logs...</span>
                </div>
              ) : customerEmailLogs.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-brand-border text-center space-y-2 bg-[#FAF8FC]">
                  <Mail className="w-8 h-8 text-brand-muted mx-auto" />
                  <h4 className="text-sm font-bold text-brand-tertiary">No Emails Dispatched to this Customer</h4>
                  <p className="text-xs text-brand-muted max-w-sm mx-auto">
                    Automated real-time emails are dispatched as orders progress through checkout, payment, shipping, and delivery.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1">
                  {customerEmailLogs.map((log, idx) => {
                    const badge = getEmailTypeBadgeInfo(log.email_type);
                    const IconComp = badge.icon;
                    return (
                      <div
                        key={log.log_id || log.id || idx}
                        className="p-3.5 rounded-2xl border border-brand-border bg-[#FAF8FC] hover:bg-white transition-all space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                              <IconComp className="w-3.5 h-3.5 shrink-0" />
                              <span>{badge.label}</span>
                            </span>
                            <span className="text-[10px] font-mono text-brand-muted">
                              {log.sent_at ? new Date(log.sent_at).toLocaleString('en-IN') : 'Dispatched'}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            log.delivery_status === 'sent'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : log.delivery_status === 'simulated'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {log.delivery_status === 'sent' ? 'Delivered (SMTP)' : log.delivery_status === 'simulated' ? 'Delivered (Simulated)' : 'Failed'}
                          </span>
                        </div>
                        <div className="font-semibold text-xs text-brand-tertiary">
                          {log.subject}
                        </div>
                        {log.order_number && (
                          <div className="text-[10px] text-brand-muted font-mono">
                            Order Reference: #{log.order_number}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-brand-border flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setCustomerEmailModalOpen(false);
                  setEmailPreviewOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#FAF8FC] hover:bg-purple-50 text-brand-primary border border-brand-border text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Email Templates</span>
              </button>
              <button
                type="button"
                onClick={() => setCustomerEmailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#26153D] hover:bg-brand-primary text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
