import React, { useState, useEffect, useMemo } from 'react';
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
  RefreshCw,
  Copy,
  Check,
  MessageCircle,
  MapPin,
  Users,
  SendHorizontal
} from 'lucide-react';
import { adminApi } from './adminApi';

export default function AdminCustomersView() {
  // Main Sub-Tab: 'rto_panel' (default) | 'customer_database'
  const [activeSubTab, setActiveSubTab] = useState('rto_panel');

  // Customer Database State
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // JustShyp RTO & NDR State
  const [rtoShipments, setRtoShipments] = useState([]);
  const [rtoSummary, setRtoSummary] = useState({ total_count: 0, rto_count: 0, initiated_count: 0, total_rto_value: 0 });
  const [loadingRto, setLoadingRto] = useState(false);
  const [rtoError, setRtoError] = useState('');
  const [rtoSearch, setRtoSearch] = useState('');
  const [rtoStageFilter, setRtoStageFilter] = useState('all'); // 'all' | 'rto' | 'initiated'
  const [copiedAwb, setCopiedAwb] = useState(null);

  // NDR Action Modal State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionTargetShipment, setActionTargetShipment] = useState(null);
  const [selectedNdrAction, setSelectedNdrAction] = useState('reattempt'); // 'reattempt' | 'rto' | 'update_phone' | 'update_address'
  const [actionPhone, setActionPhone] = useState('');
  const [actionAddress, setActionAddress] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

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

  // 1. Load Live RTO Shipments from JustShyp
  const loadJustShypRto = async () => {
    try {
      setLoadingRto(true);
      setRtoError('');
      const res = await adminApi.getJustShypRto({ ndr_type: 'all' });
      if (res) {
        setRtoShipments(res.shipments || []);
        setRtoSummary({
          total_count: res.total_count || 0,
          rto_count: res.rto_count || 0,
          initiated_count: res.initiated_count || 0,
          total_rto_value: res.total_rto_value || 0,
          missing_carrier_details: res.missing_carrier_details || 0,
          cached: res.rto_cached,
          saved_at: res.rto_saved_at,
        });
      }
    } catch (err) {
      setRtoError('JustShyp refresh failed. Any displayed records may be outdated.');
      showToast(err.message || 'Failed to fetch RTO from JustShyp');
    } finally {
      setLoadingRto(false);
    }
  };

  // 2. Load Customers List
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
    loadJustShypRto();
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

  const handleCopyAwb = (awb) => {
    if (!awb) return;
    navigator.clipboard.writeText(awb);
    setCopiedAwb(awb);
    showToast(`✓ Waybill ${awb} copied to clipboard`);
    setTimeout(() => setCopiedAwb(null), 2000);
  };

  const handleOpenActionModal = (shipment) => {
    setActionTargetShipment(shipment);
    setSelectedNdrAction('reattempt');
    setActionPhone(shipment.customer_phone || '');
    setActionAddress(shipment.address || '');
    setActionModalOpen(true);
  };

  const handleSubmitNdrAction = async (e) => {
    if (e) e.preventDefault();
    if (!actionTargetShipment?.waybill_number) return;

    setSubmittingAction(true);
    try {
      const res = await adminApi.submitJustShypNdrAction({
        awb: actionTargetShipment.waybill_number,
        action: selectedNdrAction,
        phone: actionPhone,
        address: actionAddress,
      });
      showToast(res?.message || 'JustShyp NDR action submitted successfully!');
      setActionModalOpen(false);
      setActionTargetShipment(null);
      await loadJustShypRto();
    } catch (err) {
      showToast(`❌ ${err.message || 'Failed to submit action to JustShyp'}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Filtered RTO shipments
  const filteredRtoShipments = useMemo(() => {
    const q = rtoSearch.toLowerCase().trim();
    return rtoShipments.filter((s) => {
      if (rtoStageFilter !== 'all' && s.stage !== rtoStageFilter) return false;
      const chId = String(s.channel_order_id || '').toLowerCase();
      const wb = String(s.waybill_number || '').toLowerCase();
      const name = String(s.customer_name || '').toLowerCase();
      const phone = String(s.customer_phone || '').toLowerCase();
      const city = String(s.city || '').toLowerCase();
      const reason = String(s.ndr_reason || '').toLowerCase();
      return chId.includes(q) || wb.includes(q) || name.includes(q) || phone.includes(q) || city.includes(q) || reason.includes(q);
    });
  }, [rtoShipments, rtoSearch, rtoStageFilter]);

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

      {/* Top Header & Sub-Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-caps tracking-widest uppercase text-brand-primary font-bold">
              Carrier Telemetry & Risk Mitigation
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              Live JustShyp API
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-brand-tertiary mt-1">
            {activeSubTab === 'rto_panel' ? 'RTO & NDR Live Management Panel' : 'Customer Database & COD Protection'}
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">
            {activeSubTab === 'rto_panel'
              ? 'Real-time undelivered (NDR) and Return-to-Origin parcels fetched directly from JustShyp carrier API.'
              : 'Customer lifetime order telemetry, fraud prevention, and selective Cash-on-Delivery access control.'}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center space-x-1.5 bg-[#FAF8FC] p-1.5 rounded-2xl border border-brand-border self-start md:self-auto shadow-2xs flex-wrap gap-y-1">
          {/* Tab 1: JustShyp RTO & NDR Shipments */}
          <button
            type="button"
            onClick={() => setActiveSubTab('rto_panel')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'rto_panel'
                ? 'bg-[#26153D] text-white shadow-xs'
                : 'text-brand-tertiary hover:bg-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>JustShyp RTO Panel</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeSubTab === 'rto_panel' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-800'
            }`}>
              {rtoSummary.total_count || rtoShipments.length}
            </span>
          </button>

          {/* Tab 2: Customer Database & COD Protection */}
          <button
            type="button"
            onClick={() => setActiveSubTab('customer_database')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'customer_database'
                ? 'bg-[#26153D] text-white shadow-xs'
                : 'text-brand-tertiary hover:bg-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customer Database</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeSubTab === 'customer_database' ? 'bg-white/20 text-white' : 'bg-gray-200 text-brand-tertiary'
            }`}>
              {customers.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE 1: JUSTSHYP LIVE RTO & NDR PANEL */}
      {/* ========================================================================= */}
      {activeSubTab === 'rto_panel' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {rtoSummary.cached && <p role="status" className="text-sm text-amber-700">Showing saved RTO panel data from {rtoSummary.saved_at}. Live RTO refresh is unavailable.</p>}
          {rtoError && <p role="alert" className="text-sm text-rose-700">{rtoError}</p>}
          {rtoSummary.missing_carrier_details > 0 && <p role="status" className="text-sm text-amber-700">Current status or value is unavailable from JustShyp for {rtoSummary.missing_carrier_details} shipment(s). The value total is incomplete.</p>}
          {/* Performance & Consignment Metric Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-brand-muted">
                <span className="text-[10px] font-caps tracking-wider uppercase font-bold text-brand-tertiary">Total JustShyp RTO/NDR</span>
                <Truck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-brand-tertiary">
                {rtoSummary.total_count}
              </div>
              <div className="text-[10px] text-brand-muted">
                JustShyp reports from the last 60 days
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-brand-muted">
                <span className="text-[10px] font-caps tracking-wider uppercase font-bold text-rose-700">RTO Initiated</span>
                <RotateCcw className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-rose-700">
                {rtoSummary.rto_count}
              </div>
              <div className="text-[10px] text-brand-muted">
                Includes returns already delivered to the seller
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-brand-muted">
                <span className="text-[10px] font-caps tracking-wider uppercase font-bold text-amber-800">NDR Action Required</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-800">
                {rtoSummary.initiated_count}
              </div>
              <div className="text-[10px] text-brand-muted">
                Undelivered attempts requiring customer action
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-brand-muted">
                <span className="text-[10px] font-caps tracking-wider uppercase font-bold text-brand-primary">JustShyp Order Value</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-brand-primary">
                ₹{Number(rtoSummary.total_rto_value || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-brand-muted">
                {rtoSummary.missing_carrier_details ? 'Partial total; some values unavailable' : 'Sum of reported RTO and NDR order values'}
              </div>
            </div>
          </div>

          {/* Filter & Action Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-brand-border space-y-4 shadow-2xs">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <input
                  type="text"
                  value={rtoSearch}
                  onChange={(e) => setRtoSearch(e.target.value)}
                  placeholder="Search order #, customer, phone, AWB, reason, city..."
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2 pl-9 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
                />
                <Search className="w-3.5 h-3.5 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <div className="flex items-center space-x-2 w-full md:w-auto flex-wrap gap-y-2">
                {/* Stage Filter */}
                <select
                  value={rtoStageFilter}
                  onChange={(e) => setRtoStageFilter(e.target.value)}
                  className="bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-tertiary font-semibold"
                >
                  <option value="all">All JustShyp Reports ({rtoSummary.total_count})</option>
                  <option value="rto">RTO Initiated ({rtoSummary.rto_count})</option>
                  <option value="initiated">NDR Action Required ({rtoSummary.initiated_count})</option>
                </select>

                {/* Refresh Button */}
                <button
                  type="button"
                  onClick={loadJustShypRto}
                  disabled={loadingRto}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 text-blue-700 text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                  title="Fetch fresh real-time RTO data from JustShyp carrier API"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-600 group-hover:text-white ${loadingRto ? 'animate-spin' : ''}`} />
                  <span>{loadingRto ? 'Fetching JustShyp...' : 'Refresh from JustShyp'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* JustShyp RTO Table */}
          <div className="bg-white rounded-3xl border border-brand-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8FC] border-b border-brand-border text-brand-muted font-caps tracking-wider text-[10px] uppercase">
                  <tr>
                    <th className="py-3.5 px-4">Channel Order ID</th>
                    <th className="py-3.5 px-4">Customer & Location</th>
                    <th className="py-3.5 px-4">JustShyp AWB & Courier</th>
                    <th className="py-3.5 px-4">Carrier NDR / RTO Reason</th>
                    <th className="py-3.5 px-4">Stage / Status</th>
                    <th className="py-3.5 px-4 text-right">Concierge Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {loadingRto ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-brand-muted">
                        <div className="flex items-center justify-center space-x-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                          <span>Fetching real-time RTO and NDR data from JustShyp API...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRtoShipments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-brand-muted">
                        No RTO shipments found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRtoShipments.map((s, idx) => {
                      const cleanPhone = String(s.customer_phone || '').replace(/\D/g, '').slice(-10);
                      const isInitiated = s.stage === 'initiated';
                      const waText = encodeURIComponent(
                        `Hi ${s.customer_name || 'there'}, this is Valerie Jewels customer concierge regarding your order #${s.channel_order_id}. Our courier attempted delivery (Waybill: ${s.waybill_number})${s.ndr_reason ? ` and reported: "${s.ndr_reason}"` : ''}. Would you like us to schedule a delivery reattempt or update your address?`
                      );

                      return (
                        <tr key={s.waybill_number || idx} className="hover:bg-[#FAF8FC] transition-colors">
                          {/* Order ID & Dates */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="font-mono font-bold text-brand-primary text-xs flex items-center space-x-1.5">
                              <span>#{s.channel_order_id || 'N/A'}</span>
                            </div>
                            <div className="text-[10.5px] text-brand-muted mt-1 space-y-0.5">
                              {s.order_date && <div>Ordered: {s.order_date.split(' ')[0]}</div>}
                              {s.pickup_date && <div>Picked: {s.pickup_date.split(' ')[0]}</div>}
                              {s.ofd_time && <div className="text-amber-700 font-medium">OFD: {s.ofd_time.split(' ')[0]}</div>}
                            </div>
                            {s.total_amount > 0 && (
                              <div className="mt-1 font-mono font-semibold text-gray-800 text-[11px]">
                                ₹{s.total_amount.toLocaleString('en-IN')}
                              </div>
                            )}
                          </td>

                          {/* Customer & Location */}
                          <td className="py-3.5 px-4 align-top space-y-0.5">
                            <div className="font-semibold text-brand-tertiary flex items-center space-x-1">
                              <span>{s.customer_name || 'Customer'}</span>
                            </div>
                            {cleanPhone && (
                              <div className="font-mono text-gray-600 text-[11px] flex items-center space-x-1">
                                <Phone className="w-3 h-3 text-brand-muted" />
                                <span>+91 {cleanPhone}</span>
                              </div>
                            )}
                            {(s.city || s.state) && (
                              <div className="text-[10px] text-brand-muted flex items-center space-x-1">
                                <MapPin className="w-3 h-3 text-brand-muted" />
                                <span>{[s.city, s.state].filter(Boolean).join(', ')}</span>
                              </div>
                            )}
                          </td>

                          {/* JustShyp AWB */}
                          <td className="py-3.5 px-4 align-top space-y-1">
                            <div className="inline-flex items-center space-x-1.5 bg-blue-50/80 px-2 py-0.5 rounded-lg border border-blue-200">
                              <span className="font-mono font-bold text-blue-900 text-[11px]">
                                {s.waybill_number || 'Awaiting'}
                              </span>
                              {s.waybill_number && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyAwb(s.waybill_number)}
                                  className="text-blue-600 hover:text-blue-800 cursor-pointer p-0.5"
                                  title="Copy Waybill"
                                >
                                  {copiedAwb === s.waybill_number ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                            {s.waybill_number && (
                              <div>
                                <a
                                  href={`https://backend.justshyp.com/tracking?awb=${s.waybill_number}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10.5px] text-blue-600 hover:underline flex items-center space-x-1"
                                >
                                  <span>Track on JustShyp</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            )}
                          </td>

                          {/* Carrier NDR / RTO Reason */}
                          <td className="py-3.5 px-4 align-top max-w-xs">
                            <div className="text-xs text-gray-800 font-medium bg-[#FAF8FC] p-2 rounded-xl border border-brand-border/60">
                              <p className="line-clamp-3 leading-snug">
                                {s.ndr_reason || 'Reason not supplied by JustShyp API'}
                              </p>
                              {s.ndr_time && (
                                <p className="text-[10px] text-brand-muted mt-1 flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Reported: {s.ndr_time}</span>
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 align-top">
                            {isInitiated ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Action Required (NDR){s.carrier_status ? ` · ${String(s.carrier_status).replace(/[_-]+/g, ' ').toUpperCase()}` : ' · status unavailable'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300 whitespace-nowrap">
                                <RotateCcw className="w-3 h-3 text-rose-600" />
                                <span>{s.carrier_status ? String(s.carrier_status).replace(/[_-]+/g, ' ').toUpperCase() : 'RTO initiated · status unavailable'}</span>
                              </span>
                            )}
                          </td>

                          {/* Concierge Actions */}
                          <td className="py-3.5 px-4 align-top text-right space-y-1.5">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* 1-Click WhatsApp Concierge */}
                              {isInitiated && cleanPhone && (
                                <a
                                  href={`https://wa.me/91${cleanPhone}?text=${waText}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center space-x-1 shadow-2xs"
                                  title="Open WhatsApp chat with customer"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  <span>WhatsApp</span>
                                </a>
                              )}

                              {/* Take Action on JustShyp NDR */}
                              {isInitiated && <button
                                type="button"
                                onClick={() => handleOpenActionModal(s)}
                                className="px-2.5 py-1 rounded-xl bg-[#26153D] hover:bg-[#3b235c] text-white text-[11px] font-semibold flex items-center space-x-1 shadow-2xs cursor-pointer"
                                title="Submit action to JustShyp (Reattempt / Update Address / RTO)"
                              >
                                <span>NDR Action</span>
                              </button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: CUSTOMER DATABASE & COD PROTECTION */}
      {/* ========================================================================= */}
      {activeSubTab === 'customer_database' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Email Preview Launch Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-brand-border shadow-2xs">
            <div className="relative w-full sm:w-80">
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

            <button
              onClick={() => setEmailPreviewOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white text-xs font-semibold flex items-center space-x-2 shadow-luxury hover:opacity-95 transition-all cursor-pointer self-start sm:self-auto"
            >
              <Mail className="w-4 h-4" />
              <span>Preview Customer Email Formats</span>
            </button>
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
                    <th className="py-3.5 px-4">Cancelled / Incomplete</th>
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
                              {c.rto_cancellations} incidents
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* JUSTSHYP NDR ACTION MODAL */}
      {/* ========================================================================= */}
      {actionModalOpen && actionTargetShipment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-brand-border space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-brand-primary" />
                <h3 className="text-base font-bold text-brand-tertiary">
                  JustShyp NDR Action Directive
                </h3>
              </div>
              <button
                onClick={() => setActionModalOpen(false)}
                className="p-1 rounded-lg text-brand-muted hover:text-brand-tertiary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#FAF8FC] p-3 rounded-2xl border border-brand-border/60 text-xs space-y-1">
              <div><strong>Order Number:</strong> #{actionTargetShipment.channel_order_id}</div>
              <div><strong>Waybill / AWB:</strong> {actionTargetShipment.waybill_number}</div>
              <div><strong>Customer:</strong> {actionTargetShipment.customer_name} ({actionTargetShipment.customer_phone})</div>
              <div><strong>Current Reason:</strong> {actionTargetShipment.ndr_reason}</div>
            </div>

            <form onSubmit={handleSubmitNdrAction} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-brand-tertiary block mb-1.5">
                  Select Action to Dispatch to Courier
                </label>
                <select
                  value={selectedNdrAction}
                  onChange={(e) => setSelectedNdrAction(e.target.value)}
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs font-medium text-brand-tertiary focus:outline-none focus:border-brand-primary"
                >
                  <option value="reattempt">Request Delivery Reattempt (Customer available)</option>
                  <option value="update_phone">Update Customer Phone Number</option>
                  <option value="update_address">Update Customer Delivery Address</option>
                  <option value="rto">Confirm Return to Origin (RTO)</option>
                </select>
              </div>

              {selectedNdrAction === 'update_phone' && (
                <div>
                  <label className="text-xs font-semibold text-brand-tertiary block mb-1">
                    Updated Phone Number
                  </label>
                  <input
                    type="text"
                    value={actionPhone}
                    onChange={(e) => setActionPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
                    required
                  />
                </div>
              )}

              {selectedNdrAction === 'update_address' && (
                <div>
                  <label className="text-xs font-semibold text-brand-tertiary block mb-1">
                    Updated Delivery Address
                  </label>
                  <textarea
                    rows={3}
                    value={actionAddress}
                    onChange={(e) => setActionAddress(e.target.value)}
                    placeholder="Complete delivery address with landmarks"
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
                    required
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-brand-border text-xs font-semibold text-brand-tertiary hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-secondary text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {submittingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submittingAction ? 'Submitting to JustShyp...' : 'Submit Action'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Mobile (375px)</span>
                  </button>
                </div>

                <button
                  onClick={() => setEmailPreviewOpen(false)}
                  className="p-1.5 text-brand-muted hover:text-brand-tertiary hover:bg-[#FAF8FC] rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Template Selector Strip */}
            <div className="bg-[#FAF8FC] px-4 py-2.5 border-b border-brand-border flex items-center space-x-2 overflow-x-auto shrink-0">
              {emailTemplates.map((tmpl) => {
                const Icon = tmpl.icon;
                const isSelected = activeTemplate === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => setActiveTemplate(tmpl.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-brand-primary text-white shadow-xs'
                        : 'bg-white text-brand-tertiary hover:bg-brand-border/40 border border-brand-border/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tmpl.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Preview Frame */}
            <div className="flex-1 bg-gray-100 p-4 sm:p-6 overflow-y-auto flex items-start justify-center">
              {previewLoading ? (
                <div className="py-20 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-brand-muted">Rendering email template preview...</p>
                </div>
              ) : (
                <div
                  className={`bg-white rounded-2xl shadow-luxury overflow-hidden transition-all duration-300 ${
                    activeDevice === 'mobile' ? 'w-[375px]' : 'w-full max-w-2xl'
                  }`}
                >
                  <div className="bg-gray-50 border-b border-gray-200 p-3 text-xs text-gray-600 flex items-center justify-between">
                    <span className="truncate"><strong>Subject:</strong> {previewData.subject}</span>
                    <span className="text-[10px] text-gray-400 font-mono shrink-0 ml-2">UTF-8 HTML</span>
                  </div>
                  <iframe
                    title="Email Preview"
                    srcDoc={previewData.html}
                    className="w-full h-[65vh] border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
