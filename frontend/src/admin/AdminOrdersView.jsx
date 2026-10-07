import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  CheckCircle,
  Truck,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Eye,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Flame,
  X,
  Send,
  Clock,
  Sparkles,
  SendHorizontal,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  MessageSquare,
  History,
  User,
  MailCheck,
  ArrowUpRight,
  Download,
  Package,
  PackageCheck,
  Settings,
  Lock,
  AlertCircle
} from 'lucide-react';
import { adminApi } from './adminApi';
import ProductAssuranceModal from './ProductAssuranceModal';
import { normalizeMediaUrl } from '../utils/mediaUtils';

export default function AdminOrdersView({ currentUser, initialSelectedOrderId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [jhumkaOnly, setJhumkaOnly] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [assuranceItem, setAssuranceItem] = useState(null);

  // View Mode: 'orders' | 'shiprocket_synced' | 'sent_emails'
  const [activeOrdersViewMode, setActiveOrdersViewMode] = useState('orders');

  // In Orders view: sync segment filter ('all' by default so all received orders are visible immediately)
  const [ordersSyncSegment, setOrdersSyncSegment] = useState('all');

  // Dedicated Shiprocket Synced Section States
  const [syncedSearch, setSyncedSearch] = useState('');
  const [syncedStatusFilter, setSyncedStatusFilter] = useState('');
  const [syncedCourierFilter, setSyncedCourierFilter] = useState('');
  const [copiedAwbId, setCopiedAwbId] = useState(null);

  // Sent Emails Customer Log State
  const [sentEmailLogs, setSentEmailLogs] = useState([]);
  const safeSentLogs = Array.isArray(sentEmailLogs) ? sentEmailLogs : [];
  const [loadingSentEmails, setLoadingSentEmails] = useState(false);
  const [sentEmailSearch, setSentEmailSearch] = useState('');
  const [sentEmailTypeFilter, setSentEmailTypeFilter] = useState('');
  const [sentEmailStatusFilter, setSentEmailStatusFilter] = useState('');
  const [copiedLogId, setCopiedLogId] = useState(null);
  const [resendingLogId, setResendingLogId] = useState(null);

  // Shiprocket sync state
  const [syncingSrId, setSyncingSrId] = useState(null);

  // Status transition state
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [shipAwb, setShipAwb] = useState('');
  const [shipCourier, setShipCourier] = useState('Bluedart Express Air');

  // Email Dispatch Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [targetEmailOrder, setTargetEmailOrder] = useState(null);
  const [selectedEmailType, setSelectedEmailType] = useState('order_status_update');
  const [emailTargetStatus, setEmailTargetStatus] = useState('confirmed');
  const [emailCustomMessage, setEmailCustomMessage] = useState('');
  const [emailReason, setEmailReason] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [recipientEmailInput, setRecipientEmailInput] = useState('');
  const [runningRecovery, setRunningRecovery] = useState(false);

  // Cancel & Refund Dialog
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Delete Order Dialog
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk Order Selection & Deletion Dialog
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Bulk Email Pending Payment / Payment Incomplete Modal
  const [bulkEmailModalOpen, setBulkEmailModalOpen] = useState(false);
  const [bulkEmailReason, setBulkEmailReason] = useState('Bank gateway connection interrupted during UPI authorization / Checkout incomplete');
  const [bulkEmailCustomMessage, setBulkEmailCustomMessage] = useState('');
  const [bulkEmailIncludeRetryLink, setBulkEmailIncludeRetryLink] = useState(true);
  const [bulkEmailSending, setBulkEmailSending] = useState(false);

  // SMTP Settings & Test Email Modal State
  const [smtpModalOpen, setSmtpModalOpen] = useState(false);
  const [smtpHost, setSmtpHost] = useState('smtp.hostinger.com');
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpEncryption, setSmtpEncryption] = useState('ssl');
  const [smtpUser, setSmtpUser] = useState('orders@valeriejewels.in');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('orders@valeriejewels.in');
  const [smtpFromName, setSmtpFromName] = useState('Valerie Jewels Support');
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpHasSavedPassword, setSmtpHasSavedPassword] = useState(false);
  const [isLiveSmtpConfigured, setIsLiveSmtpConfigured] = useState(false);
  const [loadingSmtpSettings, setLoadingSmtpSettings] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('yashpatel6855@gmail.com');
  const [testEmailName, setTestEmailName] = useState('Yash Patel');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  const isStaff = currentUser?.role === 'staff';

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadSmtpSettings = async () => {
    try {
      setLoadingSmtpSettings(true);
      const data = await adminApi.getSmtpSettings();
      if (data) {
        if (data.host) setSmtpHost(data.host);
        if (data.port) setSmtpPort(data.port);
        if (data.username) setSmtpUser(data.username);
        if (data.from_email) setSmtpFromEmail(data.from_email);
        if (data.from_name) setSmtpFromName(data.from_name);
        if (data.encryption) setSmtpEncryption(data.encryption);
        setSmtpHasSavedPassword(Boolean(data.has_password));
        setIsLiveSmtpConfigured(Boolean(data.is_live_smtp));
      }
    } catch (err) {
      console.warn('Failed to load SMTP settings:', err);
    } finally {
      setLoadingSmtpSettings(false);
    }
  };

  useEffect(() => {
    if (smtpModalOpen) {
      loadSmtpSettings();
    }
  }, [smtpModalOpen]);

  const handleSaveSmtpSettings = async (e) => {
    e?.preventDefault();
    if (!smtpUser || !smtpPass) {
      showToast('⚠️ Please enter both SMTP username and password');
      return;
    }
    setSmtpSaving(true);
    try {
      await adminApi.saveSmtpSettings({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        username: smtpUser,
        password: smtpPass,
        from_email: smtpFromEmail,
        from_name: smtpFromName,
        encryption: smtpEncryption,
      });
      setIsLiveSmtpConfigured(true);
      setSmtpHasSavedPassword(true);
      setSmtpPass('');
      showToast('✓ SMTP credentials saved! Live customer emails are now enabled.');
    } catch (err) {
      showToast(`❌ Failed to save SMTP settings: ${err.message}`);
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient) {
      showToast('⚠️ Please enter a recipient email address');
      return;
    }
    setTestEmailSending(true);
    setTestEmailResult(null);
    try {
      const res = await adminApi.sendTestEmail(
        testEmailRecipient,
        testEmailName,
        'Valerie Jewels Atelier — Live Email Dispatch Test',
        'This is a verified test email sent from Valerie Jewels Haute Joaillerie Atelier. If you have received this message in your inbox, your SMTP email delivery pipeline is fully functional and live customer emails (order confirmations, shipping notifications, and payment reminders) are operating successfully.'
      );
      setTestEmailResult(res);
      if (res?.status === 'sent') {
        showToast(`✓ Test email delivered to ${testEmailRecipient}!`);
      } else {
        showToast(`⚠️ Email processed in simulation mode. Live SMTP credentials required.`);
      }
      loadSentEmailLogs();
    } catch (err) {
      setTestEmailResult({
        status: 'failed',
        error: err.message,
      });
      showToast(`❌ Test email failed: ${err.message}`);
    } finally {
      setTestEmailSending(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getOrders({
        search,
        status: statusFilter,
        payment_method: paymentFilter,
        payment_status: paymentStatusFilter,
        risk_tier: riskFilter,
        jhumka_only: jhumkaOnly ? 1 : 0,
      });
      setOrders(res || []);
      if (res && Array.isArray(res)) {
        const validIds = new Set(res.map((o) => o.id));
        setSelectedOrderIds((prev) => prev.filter((id) => validIds.has(id)));
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  // Shiprocket Synced Order Identifier (zero mismatch: orders with SR ID or AWB)
  const isShiprocketSyncedOrder = (o) => Boolean(o && (o.shiprocket_order_id || o.shiprocket_awb));

  const syncedOrders = orders.filter(isShiprocketSyncedOrder);
  const unsyncedOrders = orders.filter((o) => !isShiprocketSyncedOrder(o));

  // In Orders view: display unsynced orders by default to shift synced orders to separate section
  const displayOrders = ordersSyncSegment === 'unsynced'
    ? unsyncedOrders
    : (ordersSyncSegment === 'synced' ? syncedOrders : orders);

  // Filtered list for the dedicated Shiprocket Synced Section
  const filteredSyncedOrders = syncedOrders.filter((ord) => {
    if (syncedStatusFilter && ord.order_status !== syncedStatusFilter) {
      return false;
    }
    if (syncedCourierFilter) {
      const cName = String(ord.courier_name || '').toLowerCase();
      if (!cName.includes(syncedCourierFilter.toLowerCase())) {
        return false;
      }
    }
    if (syncedSearch.trim()) {
      const q = syncedSearch.toLowerCase();
      const match =
        String(ord.order_number || '').toLowerCase().includes(q) ||
        String(ord.customer_name || '').toLowerCase().includes(q) ||
        String(ord.customer_phone || '').toLowerCase().includes(q) ||
        String(ord.customer_email || '').toLowerCase().includes(q) ||
        String(ord.shiprocket_order_id || '').toLowerCase().includes(q) ||
        String(ord.shiprocket_awb || '').toLowerCase().includes(q) ||
        String(ord.courier_name || '').toLowerCase().includes(q) ||
        String(ord.city || '').toLowerCase().includes(q) ||
        String(ord.state || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Bulk Selection Helpers (scoped to visible displayOrders)
  const isAllSelected = displayOrders.length > 0 && displayOrders.every((o) => selectedOrderIds.includes(o.id));
  const isSomeSelected = selectedOrderIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(displayOrders.map((o) => o.id));
    }
  };

  const handleToggleSelectOrder = (orderId) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleClearSelection = () => {
    setSelectedOrderIds([]);
  };

  const confirmBulkDeleteOrders = async () => {
    if (selectedOrderIds.length === 0) return;
    try {
      setBulkDeleting(true);
      const res = await adminApi.bulkDeleteOrders(selectedOrderIds);
      const count = res?.deleted_count || selectedOrderIds.length;
      showToast(`${count} ${count === 1 ? 'order' : 'orders'} deleted permanently`);
      setOrders((prev) => prev.filter((o) => !selectedOrderIds.includes(o.id)));
      if (selectedOrder && selectedOrderIds.includes(selectedOrder.id)) {
        setSelectedOrder(null);
      }
      setSelectedOrderIds([]);
      setBulkDeleteModalOpen(false);
      loadOrders();
    } catch (err) {
      showToast(err.message || 'Failed to delete selected orders');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Pending payment / incomplete orders (including all pending, failed, or unpaid checkout states)
  const isPendingOrder = (o) =>
    ((o.payment_status === 'pending' || o.payment_status === 'failed' || o.order_status === 'pending' || o.order_status === 'failed') &&
      o.payment_status !== 'paid');

  // Pending payment orders in currently loaded visible list
  const pendingPaymentOrders = displayOrders.filter(isPendingOrder);

  // Selected orders that have pending payment
  const selectedPendingOrders = displayOrders.filter(
    (o) => selectedOrderIds.includes(o.id) && isPendingOrder(o)
  );

  // Target orders for the bulk email dispatch modal
  const targetBulkEmailOrders = selectedPendingOrders.length > 0
    ? selectedPendingOrders
    : displayOrders.filter((o) => selectedOrderIds.includes(o.id));

  const handleSelectAllPendingOrders = () => {
    const pending = displayOrders.filter(isPendingOrder);

    if (pending.length > 0) {
      const pendingIds = pending.map((o) => o.id);
      setSelectedOrderIds(pendingIds);
      showToast(`Selected all ${pendingIds.length} pending orders`);
    } else {
      setPaymentStatusFilter('unpaid_pending');
      setStatusFilter('');
      showToast('Filtered view to Unpaid / Abandoned Checkouts (All Pending Orders).');
    }
  };

  const handleConfirmBulkEmail = async () => {
    if (targetBulkEmailOrders.length === 0) return;
    setBulkEmailSending(true);
    try {
      const orderIds = targetBulkEmailOrders.map((o) => o.id);
      const res = await adminApi.bulkSendPaymentReminders(
        orderIds,
        bulkEmailCustomMessage,
        bulkEmailReason,
        'order_failed'
      );
      showToast(res?.message || `Payment incomplete recovery emails dispatched to ${orderIds.length} customers!`);
      setBulkEmailModalOpen(false);
      setBulkEmailCustomMessage('');
      setSelectedOrderIds([]);
      await loadOrders();
      await loadSentEmailLogs();
      setActiveOrdersViewMode('sent_emails');
    } catch (err) {
      showToast(err.message || 'Failed to dispatch payment incomplete emails');
    } finally {
      setBulkEmailSending(false);
    }
  };

  // Fetch Sent Email Customer Logs
  const loadSentEmailLogs = async () => {
    try {
      setLoadingSentEmails(true);
      const res = await adminApi.getSentEmailLogs({
        search: sentEmailSearch,
        type: sentEmailTypeFilter,
        delivery_status: sentEmailStatusFilter,
      });
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setSentEmailLogs(list);
    } catch (err) {
      setSentEmailLogs([]);
      showToast(err.message || 'Failed to fetch sent email logs');
    } finally {
      setLoadingSentEmails(false);
    }
  };

  // Copy customer dossier for concierge / phone / WhatsApp access
  const handleCopyCustomerDossier = (log) => {
    const custName = log.recipient_name || log.customer_name || 'Valued Customer';
    const email = log.recipient_email || log.customer_email || 'N/A';
    const phone = log.customer_phone || 'N/A';
    const address = [log.shipping_address_line1, log.shipping_address_line2, log.city, log.state, log.pincode].filter(Boolean).join(', ') || 'N/A';
    const ordNum = log.order_number ? `#${log.order_number}` : 'N/A';
    const amount = log.total_amount ? `₹${Number(log.total_amount).toLocaleString('en-IN')}` : 'N/A';

    const text = [
      `VALERIE JEWELS — CUSTOMER DOSSIER`,
      `---------------------------------`,
      `Name: ${custName}`,
      `Phone: ${phone}`,
      `Email: ${email}`,
      `Address: ${address}`,
      `Order: ${ordNum} (${amount})`,
      `Payment Status: ${log.payment_status || 'Pending'}`,
      `Last Dispatched Email: ${log.subject || log.email_type} on ${log.sent_at}`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedLogId(log.log_id);
    showToast(`Copied ${custName}'s customer data to clipboard!`);
    setTimeout(() => setCopiedLogId(null), 2500);
  };

  // 1-Click Retry / Resend Customer Email via Live SMTP
  const handleResendEmail = async (log) => {
    if (!log.order_id) {
      showToast('⚠️ No associated order ID to resend this email');
      return;
    }
    setResendingLogId(log.log_id);
    try {
      const res = await adminApi.sendCustomerEmail(log.order_id, log.email_type || 'order_confirmation');
      if (res?.status === 'failed') {
        showToast(`❌ Retry dispatch failed: ${res.error_message || 'SMTP error'}`);
      } else {
        showToast(`✓ Email successfully dispatched to ${log.recipient_email || log.customer_email || 'customer'}!`);
      }
      await loadSentEmailLogs();
    } catch (err) {
      showToast(`❌ Failed to resend email: ${err.message}`);
    } finally {
      setResendingLogId(null);
    }
  };

  // Export Sent Emails Customer Log to CSV
  const exportSentEmailsCsv = () => {
    if (safeSentLogs.length === 0) {
      showToast('No sent email records available to export');
      return;
    }
    const headers = [
      'Log ID',
      'Sent At',
      'Email Type',
      'Delivery Status',
      'Customer Name',
      'Recipient Email',
      'Customer Phone',
      'Shipping Address Line 1',
      'Shipping Address Line 2',
      'City',
      'State',
      'Pincode',
      'Order Number',
      'Order Total (INR)',
      'Payment Status',
      'Order Status',
      'Email Subject',
      'Error Message'
    ];
    const rows = safeSentLogs.map((l) => [
      l.log_id || '',
      `"${l.sent_at || ''}"`,
      `"${l.email_type || ''}"`,
      `"${l.delivery_status || ''}"`,
      `"${String(l.recipient_name || l.customer_name || '').replace(/"/g, '""')}"`,
      `"${String(l.recipient_email || l.customer_email || '').replace(/"/g, '""')}"`,
      `"${String(l.customer_phone || '').replace(/"/g, '""')}"`,
      `"${String(l.shipping_address_line1 || '').replace(/"/g, '""')}"`,
      `"${String(l.shipping_address_line2 || '').replace(/"/g, '""')}"`,
      `"${String(l.city || '').replace(/"/g, '""')}"`,
      `"${String(l.state || '').replace(/"/g, '""')}"`,
      `"${String(l.pincode || '').replace(/"/g, '""')}"`,
      `"${String(l.order_number || '').replace(/"/g, '""')}"`,
      l.total_amount || 0,
      `"${l.payment_status || ''}"`,
      `"${l.order_status || ''}"`,
      `"${String(l.subject || '').replace(/"/g, '""')}"`,
      `"${String(l.error_message || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `valerie_customer_sent_emails_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${safeSentLogs.length} customer records to CSV`);
  };

  // Generate WhatsApp recovery chat URL
  const getWhatsAppRecoveryUrl = (log) => {
    const rawPhone = String(log.customer_phone || '').replace(/[^0-9]/g, '');
    const phoneClean = rawPhone.startsWith('91') && rawPhone.length === 12
      ? rawPhone
      : (rawPhone.length === 10 ? `91${rawPhone}` : rawPhone);
    const custName = log.recipient_name || log.customer_name || 'there';
    const ordNum = log.order_number ? `#${log.order_number}` : '';
    const message = encodeURIComponent(
      `Hello ${custName}, this is the Valerie Jewels Concierge team regarding your order ${ordNum}. We noticed your payment attempt was interrupted. Your handcrafted pieces are safe with us! Would you like us to assist you in completing your payment or switching to Cash on Delivery?`
    );
    return `https://wa.me/${phoneClean}?text=${message}`;
  };

  // Copy AWB code with visual feedback
  const handleCopyAwb = (awb, id) => {
    if (!awb) return;
    navigator.clipboard.writeText(String(awb).trim());
    setCopiedAwbId(id);
    showToast(`Copied AWB tracking code ${awb} to clipboard!`);
    setTimeout(() => setCopiedAwbId(null), 2500);
  };

  // Generate WhatsApp tracking dispatch URL for synced orders
  const getWhatsAppTrackingUrl = (ord) => {
    const rawPhone = String(ord.customer_phone || '').replace(/[^0-9]/g, '');
    const phoneClean = rawPhone.startsWith('91') && rawPhone.length === 12
      ? rawPhone
      : (rawPhone.length === 10 ? `91${rawPhone}` : rawPhone);
    const custName = ord.customer_name || 'Valued Customer';
    const ordNum = ord.order_number ? `#${ord.order_number}` : '';
    const courier = ord.courier_name || 'our courier partner';
    const awb = ord.shiprocket_awb || 'Assigned';
    const trackingLink = ord.shiprocket_awb
      ? `https://shiprocket.co/tracking/${ord.shiprocket_awb}`
      : 'https://shiprocket.co/tracking';

    const message = encodeURIComponent(
      `Hello ${custName}! 📦✨\n\nYour Valerie Jewels order ${ordNum} has been processed and synced with Shiprocket logistics via ${courier}.\n\nWaybill / AWB Number: ${awb}\nYou can track your shipment live here:\n${trackingLink}\n\nThank you for choosing Valerie Jewels!`
    );
    return `https://wa.me/${phoneClean}?text=${message}`;
  };

  // Export Shiprocket Synced Orders to CSV
  const exportSyncedOrdersCsv = () => {
    if (syncedOrders.length === 0) {
      showToast('No Shiprocket synced orders available to export');
      return;
    }
    const headers = [
      'Order ID',
      'Order Number',
      'Order Date',
      'Customer Name',
      'Customer Phone',
      'Customer Email',
      'Address Line 1',
      'City',
      'State',
      'Pincode',
      'Total Amount (INR)',
      'Payment Type',
      'Payment Status',
      'Fulfillment Status',
      'Shiprocket Order ID',
      'Shiprocket AWB',
      'Courier Partner',
      'Tracking URL'
    ];
    const rows = filteredSyncedOrders.map((ord) => [
      ord.id || '',
      `"${ord.order_number || ''}"`,
      `"${ord.created_at || ''}"`,
      `"${(ord.customer_name || '').replace(/"/g, '""')}"`,
      `"${(ord.customer_phone || '').replace(/"/g, '""')}"`,
      `"${(ord.customer_email || '').replace(/"/g, '""')}"`,
      `"${(ord.shipping_address_line1 || '').replace(/"/g, '""')}"`,
      `"${(ord.city || '').replace(/"/g, '""')}"`,
      `"${(ord.state || '').replace(/"/g, '""')}"`,
      `"${(ord.pincode || '').replace(/"/g, '""')}"`,
      ord.total_amount || 0,
      `"${ord.payment_type || ''}"`,
      `"${ord.payment_status || ''}"`,
      `"${ord.order_status || ''}"`,
      `"${ord.shiprocket_order_id || ''}"`,
      `"${ord.shiprocket_awb || ''}"`,
      `"${(ord.courier_name || '').replace(/"/g, '""')}"`,
      `"https://shiprocket.co/tracking/${ord.shiprocket_awb || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `valerie_shiprocket_synced_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredSyncedOrders.length} Shiprocket shipment records to CSV`);
  };

  useEffect(() => {
    loadOrders();
    loadSentEmailLogs();
  }, [statusFilter, paymentFilter, paymentStatusFilter, riskFilter, jhumkaOnly]);

  useEffect(() => {
    if (activeOrdersViewMode === 'sent_emails') {
      loadSentEmailLogs();
    }
  }, [activeOrdersViewMode, sentEmailTypeFilter, sentEmailStatusFilter]);

  useEffect(() => {
    if (initialSelectedOrderId) {
      inspectOrder(initialSelectedOrderId);
    }
  }, [initialSelectedOrderId]);

  const inspectOrder = async (orderId) => {
    try {
      setDrawerLoading(true);
      const fullOrder = await adminApi.getOrder(orderId);
      setSelectedOrder(fullOrder);
      setShipAwb(fullOrder.shiprocket_awb || '');
      setShipCourier(fullOrder.courier_name || 'Bluedart Express Air');
    } catch (err) {
      showToast(err.message || 'Failed to fetch order details');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleStatusChange = async (newStatus, customMsg = '') => {
    if (!selectedOrder) return;
    setUpdatingStatus(true);
    try {
      await adminApi.updateOrderStatus(selectedOrder.id, newStatus, shipAwb, shipCourier, customMsg, true);
      showToast(`Order #${selectedOrder.order_number} marked ${newStatus} & email sent`);
      await inspectOrder(selectedOrder.id);
      loadOrders();
    } catch (err) {
      showToast(err.message || 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSyncShiprocket = async (orderId) => {
    try {
      setSyncingSrId(orderId);
      const res = await adminApi.syncShiprocket(orderId);
      showToast(res?.message || 'Order pushed to Shiprocket panel successfully! Shifted to Shiprocket Synced section.');
      await loadOrders();
      if (selectedOrder && (selectedOrder.id === orderId || String(selectedOrder.id) === String(orderId))) {
        await inspectOrder(orderId);
      }
    } catch (err) {
      showToast(err.message || 'Failed to sync with Shiprocket');
    } finally {
      setSyncingSrId(null);
    }
  };

  const openEmailModal = (order) => {
    if (!order) return;
    setTargetEmailOrder(order);
    const isUnpaid = (order.payment_status === 'pending' || order.payment_status === 'failed' || order.payment_status === 'unpaid');
    setSelectedEmailType(isUnpaid ? 'order_failed' : 'order_status_update');
    setEmailTargetStatus(order.order_status || 'confirmed');
    setEmailCustomMessage('');
    setEmailReason(isUnpaid ? 'Bank gateway connection interrupted during UPI authorization / Checkout incomplete' : '');
    setRecipientEmailInput(order.customer_email || '');
    setEmailModalOpen(true);
  };

  const handleSendCustomEmail = async (e) => {
    e.preventDefault();
    if (!targetEmailOrder) return;
    setSendingEmail(true);
    try {
      await adminApi.sendCustomerEmail(
        targetEmailOrder.id,
        selectedEmailType,
        emailCustomMessage,
        emailReason,
        emailTargetStatus,
        recipientEmailInput.trim()
      );
      showToast(`Email dispatched to ${recipientEmailInput.trim() || targetEmailOrder.customer_email}`);
      setEmailModalOpen(false);
      setEmailCustomMessage('');
      setEmailReason('');
      if (selectedOrder && selectedOrder.id === targetEmailOrder.id) {
        await inspectOrder(selectedOrder.id);
      }
      await loadSentEmailLogs();
      await loadOrders();
    } catch (err) {
      showToast(err.message || 'Failed to dispatch email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleRunAutoRecovery = async () => {
    try {
      setRunningRecovery(true);
      const res = await adminApi.runPaymentRecovery();
      const count = res?.sent_count ?? 0;
      showToast(res?.message || `Auto recovery dispatched ${count} customer emails!`);
      await loadSentEmailLogs();
      await loadOrders();
    } catch (err) {
      showToast(err.message || 'Failed to run auto payment recovery');
    } finally {
      setRunningRecovery(false);
    }
  };

  const openDeleteModal = (order) => {
    setOrderToDelete(order);
    setDeleteModalOpen(true);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      setDeleting(true);
      await adminApi.deleteOrder(orderToDelete.id);
      showToast(`Order #${orderToDelete.order_number} deleted successfully`);
      setOrders((prev) => prev.filter((o) => o.id !== orderToDelete.id && String(o.id) !== String(orderToDelete.id)));
      if (selectedOrder && (selectedOrder.id === orderToDelete.id || String(selectedOrder.id) === String(orderToDelete.id))) {
        setSelectedOrder(null);
      }
      setDeleteModalOpen(false);
      setOrderToDelete(null);
      loadOrders();
    } catch (err) {
      showToast(err.message || 'Failed to delete order');
    } finally {
      setDeleting(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Delivered</span>
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            <span>Shipped</span>
          </span>
        );
      case 'on_hold':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>On Hold</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span>Failed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-50 text-gray-600 border border-gray-200/80 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            <span>Cancelled</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50/80 text-amber-700 border border-amber-200/70 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>Pending</span>
          </span>
        );
      case 'confirmed':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200/80 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            <span className="capitalize">{status || 'Confirmed'}</span>
          </span>
        );
    }
  };

  const renderPaymentStatusBadge = (ord) => {
    const pStatus = ord.payment_status || 'pending';
    const pType = ord.payment_type || 'full_prepaid';

    if (pStatus === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Paid</span>
        </span>
      );
    }

    if (pStatus === 'partial_paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Advance Paid</span>
        </span>
      );
    }

    if (pType === 'cod') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
          <span>COD</span>
        </span>
      );
    }

    if (pStatus === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          <span>Failed</span>
        </span>
      );
    }

    // Default: unpaid / pending checkout
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap" title="Customer opened checkout but did not complete payment on gateway">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        <span>Unpaid</span>
      </span>
    );
  };

  const renderPaymentBadge = (statusOrOrd) => {
    if (!statusOrOrd) return renderPaymentStatusBadge({ payment_status: 'pending' });
    if (typeof statusOrOrd === 'object') return renderPaymentStatusBadge(statusOrOrd);
    return renderPaymentStatusBadge({ payment_status: statusOrOrd });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      let safe = String(dateStr).trim();
      // If timestamp is "YYYY-MM-DD HH:MM:SS" without explicit timezone offset,
      // it is stored in server UTC time — append 'Z' so it correctly renders in IST (Asia/Kolkata)
      if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(safe)) {
        safe = safe.replace(' ', 'T') + 'Z';
      }
      const d = new Date(safe);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return String(dateStr);
    }
  };

  const handleCancelAndRefund = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !cancelReason) return;

    setCancelling(true);
    try {
      const res = await adminApi.cancelRefundOrder(selectedOrder.id, cancelReason);
      showToast(res.message || 'Order cancelled & refund processed');
      setCancelModalOpen(false);
      setCancelReason('');
      await inspectOrder(selectedOrder.id);
      loadOrders();
    } catch (err) {
      showToast(err.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-tertiary text-white px-4 py-2.5 rounded-xl shadow-luxury text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Header with Luxury View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[11px] font-caps tracking-widest uppercase text-brand-primary font-bold">
            Fulfillment & Customer Concierge
          </span>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-brand-tertiary mt-1">
            {activeOrdersViewMode === 'orders' 
              ? 'Orders Management & Fulfillment' 
              : activeOrdersViewMode === 'shiprocket_synced'
              ? 'Shiprocket Synced Orders & Logistics'
              : 'Sent Customer Emails & Recovery Audit'}
          </h1>
        </div>

        {/* View Switcher Tabs (3 Dedicated Sections to Eliminate Mismatch) */}
        <div className="flex items-center space-x-1.5 bg-[#FAF8FC] p-1.5 rounded-2xl border border-brand-border self-start md:self-auto shadow-2xs flex-wrap gap-y-1">
          {/* Tab 1: Orders & Fulfillment (Unsynced / Awaiting Dispatch) */}
          <button
            type="button"
            onClick={() => setActiveOrdersViewMode('orders')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer ${
              activeOrdersViewMode === 'orders'
                ? 'bg-[#26153D] text-white shadow-xs'
                : 'text-brand-tertiary hover:bg-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Orders & Fulfillment</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeOrdersViewMode === 'orders' ? 'bg-white/20 text-white' : 'bg-gray-200/80 text-brand-tertiary'
            }`}>
              {orders.length}
            </span>
          </button>

          {/* Tab 2: Shiprocket Synced Orders (Shifted to Separate Section) */}
          <button
            type="button"
            onClick={() => setActiveOrdersViewMode('shiprocket_synced')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer ${
              activeOrdersViewMode === 'shiprocket_synced'
                ? 'bg-[#26153D] text-white shadow-xs'
                : 'text-brand-tertiary hover:bg-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Shiprocket Synced</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeOrdersViewMode === 'shiprocket_synced'
                ? 'bg-emerald-400 text-emerald-950'
                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
            }`}>
              {syncedOrders.length}
            </span>
          </button>

          {/* Tab 3: Sent Customer Emails Log */}
          <button
            type="button"
            onClick={() => {
              setActiveOrdersViewMode('sent_emails');
              loadSentEmailLogs();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer ${
              activeOrdersViewMode === 'sent_emails'
                ? 'bg-[#26153D] text-white shadow-xs'
                : 'text-brand-tertiary hover:bg-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-brand-accent" />
            <span>Sent Customer Emails Log</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeOrdersViewMode === 'sent_emails'
                ? 'bg-amber-400 text-amber-950'
                : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}>
              {safeSentLogs.length}
            </span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: ORDERS & SHIPMENTS */}
      {activeOrdersViewMode === 'orders' && (
        <div className="space-y-6">
          {/* Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-brand-border space-y-4 shadow-2xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadOrders()}
              placeholder="Search order #, customer, phone, AWB..."
              className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2 pl-9 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
            />
            <Search className="w-3.5 h-3.5 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Payment Status Filter (Paid vs Unpaid / Abandoned) */}
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                const val = e.target.value;
                setPaymentStatusFilter(val);
                if (val === 'unpaid_pending') {
                  setStatusFilter('');
                }
              }}
              className="bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-tertiary font-semibold"
            >
              <option value="">All Orders (Paid & Unpaid)</option>
              <option value="unpaid_pending">⚠️ Unpaid / Abandoned Checkouts (All Pending Orders)</option>
              <option value="paid_confirmed">✓ Paid / Confirmed Orders Only</option>
              <option value="paid">100% Prepaid Paid</option>
              <option value="partial_paid">Partial COD (Advance Paid)</option>
            </select>

            {/* Fulfillment Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'pending' || val === 'failed') {
                  setPaymentStatusFilter('unpaid_pending');
                  setStatusFilter('');
                } else {
                  setStatusFilter(val);
                }
              }}
              className="bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-tertiary"
            >
              <option value="">All Fulfillment Statuses</option>
              <option value="confirmed">Confirmed (Ready to Pack)</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="on_hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Payment Type Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-tertiary"
            >
              <option value="">All Payment Types</option>
              <option value="full_prepaid">Full Prepaid</option>
              <option value="partial">Partial COD</option>
              <option value="cod">Cash On Delivery</option>
            </select>

            {/* Risk Tier Filter */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-tertiary"
            >
              <option value="">All Risk Tiers</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>

            {/* Jhumka Ad Hero Toggle */}
            <button
              onClick={() => setJhumkaOnly(!jhumkaOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                jhumkaOnly
                  ? 'bg-amber-500 text-white font-semibold shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Jhumka Boxes Only</span>
            </button>

            {/* Quick Select All Pending Payment Orders Button */}
            <button
              type="button"
              onClick={handleSelectAllPendingOrders}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-2xs border cursor-pointer ${
                pendingPaymentOrders.length > 0
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-[#FAF8FC] hover:bg-gray-100 text-brand-muted border-brand-border'
              }`}
              title="Select all orders where customer payment is pending to email them"
            >
              <Mail className="w-3.5 h-3.5 text-amber-600" />
              <span>Select All Pending ({pendingPaymentOrders.length})</span>
            </button>

            {/* 1-Click Automated Recovery Dispatch to All Unpaid Customers */}
            <button
              type="button"
              onClick={handleRunAutoRecovery}
              disabled={runningRecovery}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-xs border border-purple-300 bg-purple-700 hover:bg-purple-800 text-white cursor-pointer disabled:opacity-50"
              title="Scan and automatically email luxury product recovery links to all customers with pending or failed payments"
            >
              <Sparkles className={`w-3.5 h-3.5 ${runningRecovery ? 'animate-spin' : ''}`} />
              <span>{runningRecovery ? 'Sending...' : '⚡ Auto-Mail Unpaid Customers'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Select Batch Action Banner */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-[#26153D] text-white rounded-2xl p-3.5 px-4 shadow-luxury flex items-center justify-between flex-wrap gap-3 animate-fade-in border border-purple-900/40">
          <div className="flex items-center space-x-3 flex-wrap gap-y-1">
            <span className="w-7 h-7 rounded-xl bg-purple-500/30 border border-purple-400/40 text-purple-200 font-mono font-bold flex items-center justify-center text-xs">
              {selectedOrderIds.length}
            </span>
            <span className="text-xs font-semibold text-purple-100">
              {selectedOrderIds.length} of {displayOrders.length} {selectedOrderIds.length === 1 ? 'order' : 'orders'} selected
            </span>
            {selectedPendingOrders.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {selectedPendingOrders.length} Pending Payment
              </span>
            )}
            <span className="text-white/30 hidden sm:inline">|</span>
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-xs text-purple-300 hover:text-white underline cursor-pointer font-medium"
            >
              {isAllSelected ? 'Deselect All' : `Select All Visible (${displayOrders.length})`}
            </button>
            {pendingPaymentOrders.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllPendingOrders}
                className="text-xs text-amber-300 hover:text-amber-100 underline cursor-pointer font-medium"
              >
                Select All Pending ({pendingPaymentOrders.length})
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* EMAIL PENDING PAYMENT USERS BUTTON */}
            <button
              type="button"
              onClick={() => setBulkEmailModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Email payment reminder to selected pending customers"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>
                Email Pending Users (
                {selectedPendingOrders.length > 0 ? selectedPendingOrders.length : selectedOrderIds.length}
                )
              </span>
            </button>

            <button
              type="button"
              onClick={() => setBulkDeleteModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedOrderIds.length})</span>
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Shiprocket Synced Shift Banner (Zero Mismatch Assurance) */}
      {syncedOrders.length > 0 && (
        <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200/90 rounded-2xl px-4 py-3 text-xs text-emerald-950 flex-wrap gap-2 shadow-2xs animate-fade-in">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-emerald-900">
                {syncedOrders.length} {syncedOrders.length === 1 ? 'order has' : 'orders have'} been synced to Shiprocket
              </span>
              <span className="text-emerald-700 text-[11px] ml-1.5 hidden md:inline">
                — shifted to the dedicated Shiprocket Synced tab to prevent any fulfillment mismatch.
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveOrdersViewMode('shiprocket_synced')}
              className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer flex items-center space-x-1 shadow-2xs"
            >
              <span>View Synced Orders ({syncedOrders.length})</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setOrdersSyncSegment(ordersSyncSegment === 'unsynced' ? 'all' : 'unsynced')}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-100/60 border border-emerald-300 text-emerald-800 text-[11px] font-medium transition-colors cursor-pointer"
              title="Toggle whether already-synced orders are hidden from this fulfillment queue"
            >
              {ordersSyncSegment === 'unsynced' ? 'Show All Here' : 'Hide Synced (Segregated)'}
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-brand-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8FC] border-b border-brand-border text-brand-muted font-caps tracking-wider text-[10px] uppercase">
              <tr>
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    ref={(el) => { if (el) el.indeterminate = isSomeSelected; }}
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    aria-label="Select all orders"
                    title={isAllSelected ? "Deselect all orders" : "Select all orders"}
                    className="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer accent-[#8366B0]"
                  />
                </th>
                <th className="py-3.5 px-4">Order # & Tags</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Payment Breakdown</th>
                <th className="py-3.5 px-4">Fulfillment Status</th>
                <th className="py-3.5 px-4">AWB Tracking</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-muted">
                    Loading orders...
                  </td>
                </tr>
              ) : displayOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-muted">
                    {ordersSyncSegment === 'unsynced' && syncedOrders.length > 0 ? (
                      <div className="space-y-3 py-6 max-w-md mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <div className="font-editorial text-lg font-bold text-brand-tertiary">
                          All Orders Have Been Synced with Shiprocket!
                        </div>
                        <p className="text-xs text-brand-muted leading-relaxed">
                          All {syncedOrders.length} active orders have already been pushed to Shiprocket and shifted to the dedicated Synced Orders section to eliminate fulfillment mismatch.
                        </p>
                        <div className="pt-2 flex items-center justify-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setActiveOrdersViewMode('shiprocket_synced')}
                            className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary/90 transition-colors shadow-xs cursor-pointer flex items-center space-x-1.5"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Go to Shiprocket Synced Orders ({syncedOrders.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrdersSyncSegment('all')}
                            className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-brand-tertiary text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Show All
                          </button>
                        </div>
                      </div>
                    ) : (
                      'No orders found.'
                    )}
                  </td>
                </tr>
              ) : (
                displayOrders.map((ord) => (
                  <tr 
                    key={ord.id} 
                    className={`transition-colors ${selectedOrderIds.includes(ord.id) ? 'bg-purple-50/70' : 'hover:bg-[#FAF8FC]'}`}
                  >
                    {/* Selection Checkbox */}
                    <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.includes(ord.id)}
                        onChange={() => handleToggleSelectOrder(ord.id)}
                        aria-label={`Select order #${ord.order_number}`}
                        className="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer accent-[#8366B0]"
                      />
                    </td>
                    {/* Order Number & Item Preview */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start space-x-3">
                        {ord.first_item_image ? (
                          <button
                            type="button"
                            onClick={() => setAssuranceItem({
                              product_name: ord.first_item_name,
                              sku: ord.first_item_sku,
                              slug: ord.first_item_slug,
                              primary_image: ord.first_item_image,
                              order_number: ord.order_number,
                              customer_name: ord.customer_name,
                              total_price: ord.total_amount,
                              is_jhumka_box: Number(ord.has_jhumka_box) > 0,
                            })}
                            className="relative group shrink-0 rounded-xl overflow-hidden border border-brand-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            title="Click to view product image (Assurance Preview)"
                          >
                            <img
                              src={normalizeMediaUrl(ord.first_item_image)}
                              alt={ord.first_item_name || 'Ordered item'}
                              className="w-11 h-11 object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                if (e.target.src.includes('/uploads/') && !e.target.src.includes('/api/uploads/')) {
                                  e.target.src = e.target.src.replace('/uploads/', '/api/uploads/');
                                } else {
                                  e.target.src = 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=150&q=80';
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                          </button>
                        ) : null}

                        <div className="min-w-0">
                          <div className="font-mono font-bold text-brand-tertiary flex items-center space-x-1">
                            <span>#{ord.order_number}</span>
                          </div>
                          {ord.first_item_name && (
                            <div className="text-[11px] font-medium text-brand-tertiary truncate max-w-[170px]" title={ord.first_item_name}>
                              {ord.first_item_name}
                            </div>
                          )}
                          <div className="text-[10px] text-brand-muted">
                            {formatDateTime(ord.created_at)}
                            {Number(ord.items_count) > 1 && (
                              <span className="ml-1.5 px-1.5 py-0.2 bg-gray-100 text-gray-700 rounded font-semibold text-[9px]">
                                +{Number(ord.items_count) - 1} more
                              </span>
                            )}
                          </div>
                          {Number(ord.has_jhumka_box) > 0 && (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 mt-1">
                              <Flame className="w-2.5 h-2.5 text-amber-600" />
                              <span>📦 Jhumka Ad Order</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Customer Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-brand-tertiary">{ord.customer_name}</div>
                      <div className="text-[10px] text-brand-muted">{ord.customer_phone}</div>
                      <div className="text-[10px] text-brand-muted">{ord.city}, {ord.pincode}</div>
                    </td>

                    {/* Payment Breakdown & Status */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-brand-tertiary">
                            ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                          </span>
                          {renderPaymentStatusBadge(ord)}
                        </div>
                        <div className="text-[11px] text-brand-muted">
                          {ord.payment_type === 'partial' ? (
                            (ord.payment_status === 'partial_paid' || ord.payment_status === 'paid') ? (
                              <span className="text-emerald-700 font-medium">₹{Number(ord.amount_paid_upfront)} advance paid · ₹{Number(ord.amount_due_on_delivery)} due</span>
                            ) : (
                              <span>Partial COD (₹{Number(ord.amount_paid_upfront)} advance)</span>
                            )
                          ) : ord.payment_type === 'cod' ? (
                            <span>Cash on Delivery</span>
                          ) : (
                            <span>Prepaid</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Fulfillment Status */}
                    <td className="py-3.5 px-4">
                      {renderStatusBadge(ord.order_status)}
                    </td>

                    {/* AWB Code & Shiprocket Live Status */}
                    <td className="py-3.5 px-4">
                      {ord.shiprocket_order_id && !String(ord.shiprocket_order_id).startsWith('SR-ORD-') ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>SR #{ord.shiprocket_order_id}</span>
                          </span>
                          {ord.shiprocket_awb ? (
                            <div className="text-[10px] font-mono text-brand-primary font-semibold truncate max-w-[130px]">
                              {ord.shiprocket_awb}
                            </div>
                          ) : (
                            <div className="text-[9px] text-brand-muted">Awaiting AWB</div>
                          )}
                          <div className="text-[9px] text-brand-muted truncate max-w-[130px]">
                            {ord.courier_name || 'Shiprocket'}
                          </div>
                        </div>
                      ) : String(ord.shiprocket_order_id || '').startsWith('SR-ORD-') ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300" title="Sandbox dummy ID created before Shiprocket setup">
                            <span>⚠️ Mock SR</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSyncShiprocket(ord.id)}
                            disabled={syncingSrId === ord.id}
                            className="block px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-600 hover:text-white border border-amber-300 text-amber-800 text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {syncingSrId === ord.id ? 'Syncing...' : 'Push to Live'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            <span>Not Synced</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSyncShiprocket(ord.id)}
                            disabled={syncingSrId === ord.id}
                            className="block px-2 py-0.5 rounded-md bg-purple-50 hover:bg-brand-primary hover:text-white border border-purple-200 text-brand-primary text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {syncingSrId === ord.id ? 'Pushing...' : 'Push to SR'}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {ord.first_item_image && (
                          <button
                            type="button"
                            onClick={() => setAssuranceItem({
                              product_name: ord.first_item_name,
                              sku: ord.first_item_sku,
                              slug: ord.first_item_slug,
                              primary_image: ord.first_item_image,
                              order_number: ord.order_number,
                              customer_name: ord.customer_name,
                              total_price: ord.total_amount,
                              is_jhumka_box: Number(ord.has_jhumka_box) > 0,
                            })}
                            title="View Product Image (Assurance Preview)"
                            className="p-1.5 rounded-xl bg-gray-100 hover:bg-brand-primary hover:text-white border border-brand-border text-brand-muted hover:text-white transition-all cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (ord.payment_status === 'pending' && ord.payment_type !== 'cod') {
                              if (!window.confirm(`Payment for Order #${ord.order_number} has not been received yet (Status: Unpaid). Are you sure you want to push this unpaid order to Shiprocket?`)) {
                                return;
                              }
                            }
                            handleSyncShiprocket(ord.id);
                          }}
                          disabled={syncingSrId === ord.id}
                          title={
                            ord.payment_status === 'pending' && ord.payment_type !== 'cod'
                              ? 'Payment pending. Confirm payment before shipping.'
                              : (ord.shiprocket_order_id && !String(ord.shiprocket_order_id).startsWith('SR-ORD-')
                                  ? 'Re-sync with Shiprocket live panel'
                                  : 'Push order directly to Shiprocket live panel')
                          }
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1 shadow-2xs border cursor-pointer disabled:opacity-50 ${
                            ord.shiprocket_order_id && !String(ord.shiprocket_order_id).startsWith('SR-ORD-')
                              ? 'bg-emerald-50 hover:bg-emerald-600 hover:text-white border-emerald-200 text-emerald-700'
                              : 'bg-white hover:bg-gray-100 border-brand-border text-brand-tertiary'
                          }`}
                        >
                          <Truck className={`w-3 h-3 ${syncingSrId === ord.id ? 'animate-bounce' : ''}`} />
                          <span className="hidden xl:inline">
                            {syncingSrId === ord.id
                              ? 'Syncing...'
                              : (ord.shiprocket_order_id && !String(ord.shiprocket_order_id).startsWith('SR-ORD-')
                                  ? 'SR Synced'
                                  : 'Push SR')}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEmailModal(ord)}
                          title="Send Branded Customer Email"
                          className="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-brand-primary hover:text-white border border-purple-200 text-brand-primary text-xs font-semibold transition-all flex items-center space-x-1 shadow-2xs cursor-pointer"
                        >
                          <SendHorizontal className="w-3 h-3" />
                          <span className="hidden sm:inline">Email</span>
                        </button>
                        <button
                          onClick={() => inspectOrder(ord.id)}
                          className="px-3 py-1 rounded-xl bg-[#FAF8FC] hover:bg-brand-primary hover:text-white border border-brand-border text-brand-tertiary text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(ord)}
                          title="Delete Order Permanently"
                          className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 text-rose-600 text-xs font-semibold transition-all flex items-center space-x-1 shadow-2xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: SHIPROCKET SYNCED ORDERS & LOGISTICS (SEPARATE SECTION) */}
      {/* ========================================================================= */}
      {activeOrdersViewMode === 'shiprocket_synced' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Logistics Performance Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-brand-muted">
                <span className="text-[10px] font-caps tracking-wider uppercase font-bold">Total Synced Shipments</span>
                <Truck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-brand-tertiary">
                {syncedOrders.length}
              </div>
              <div className="text-[10px] text-brand-muted">
                Pushed to Shiprocket with zero mismatch
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-brand-muted">
                <span className="text-[10px] font-caps tracking-wider uppercase font-bold">In Transit (AWB Active)</span>
                <ShieldCheck className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-sky-700">
                {syncedOrders.filter((o) => o.shiprocket_awb).length}
              </div>
              <div className="text-[10px] text-brand-muted">
                Waybill assigned & tracking live
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-brand-muted">
                <span className="text-[10px] font-caps tracking-wider uppercase font-bold">Delivered Orders</span>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-700">
                {syncedOrders.filter((o) => o.order_status === 'delivered').length}
              </div>
              <div className="text-[10px] text-brand-muted">
                Successfully delivered to customers
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-brand-muted">
                <span className="text-[10px] font-caps tracking-wider uppercase font-bold">Consignment Value</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-brand-tertiary">
                ₹{syncedOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-brand-muted">
                Total value of synced shipments
              </div>
            </div>
          </div>

          {/* Logistics Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-brand-border space-y-4 shadow-2xs">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <input
                  type="text"
                  value={syncedSearch}
                  onChange={(e) => setSyncedSearch(e.target.value)}
                  placeholder="Search order #, customer, phone, AWB, SR ID, courier..."
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2 pl-9 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
                />
                <Search className="w-3.5 h-3.5 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
                {syncedSearch && (
                  <button
                    type="button"
                    onClick={() => setSyncedSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Courier Partner Filter */}
                <select
                  value={syncedCourierFilter}
                  onChange={(e) => setSyncedCourierFilter(e.target.value)}
                  className="bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-tertiary font-semibold"
                >
                  <option value="">All Courier Partners</option>
                  <option value="bluedart">Bluedart Express</option>
                  <option value="delhivery">Delhivery</option>
                  <option value="dtdc">DTDC</option>
                  <option value="ekart">Ekart</option>
                  <option value="shadowfax">Shadowfax</option>
                  <option value="xpressbees">Xpressbees</option>
                </select>

                {/* Fulfillment Status Filter */}
                <select
                  value={syncedStatusFilter}
                  onChange={(e) => setSyncedStatusFilter(e.target.value)}
                  className="bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-tertiary"
                >
                  <option value="">All Delivery Statuses</option>
                  <option value="confirmed">Confirmed (Ready to Pack)</option>
                  <option value="shipped">Shipped / In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                {/* Clear Filters */}
                {(syncedSearch || syncedCourierFilter || syncedStatusFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSyncedSearch('');
                      setSyncedCourierFilter('');
                      setSyncedStatusFilter('');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-brand-tertiary text-xs font-medium transition-colors cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}

                {/* Refresh Shipments */}
                <button
                  type="button"
                  onClick={loadOrders}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF8FC] hover:bg-gray-100 border border-brand-border text-brand-tertiary text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                  title="Refresh orders from database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                {/* Export Synced Shipments CSV */}
                <button
                  type="button"
                  onClick={exportSyncedOrdersCsv}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  title="Export all Shiprocket synced order records to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Synced CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Synced Shipments Table */}
          <div className="bg-white rounded-3xl border border-brand-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8FC] border-b border-brand-border text-brand-muted font-caps tracking-wider text-[10px] uppercase">
                  <tr>
                    <th className="py-3.5 px-4">Order # & Tags</th>
                    <th className="py-3.5 px-4">Customer & Destination</th>
                    <th className="py-3.5 px-4">Shiprocket Order ID</th>
                    <th className="py-3.5 px-4">Courier & AWB Tracking</th>
                    <th className="py-3.5 px-4">Payment & Amount</th>
                    <th className="py-3.5 px-4">Delivery Milestone</th>
                    <th className="py-3.5 px-4 text-right">Logistics Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-brand-muted">
                        Loading Shiprocket synced shipments...
                      </td>
                    </tr>
                  ) : syncedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-brand-muted">
                        <div className="space-y-3 max-w-sm mx-auto py-6">
                          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-brand-primary flex items-center justify-center mx-auto shadow-xs">
                            <Truck className="w-6 h-6" />
                          </div>
                          <div className="font-editorial text-base font-bold text-brand-tertiary">
                            No Shiprocket Synced Orders Yet
                          </div>
                          <p className="text-xs text-brand-muted leading-relaxed">
                            When orders in the Orders & Fulfillment tab are pushed to Shiprocket, they will automatically appear in this dedicated section with full tracking details.
                          </p>
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => setActiveOrdersViewMode('orders')}
                              className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary/90 transition-colors shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
                            >
                              <Package className="w-3.5 h-3.5" />
                              <span>Go to Orders & Fulfillment</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredSyncedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-brand-muted">
                        <div className="space-y-2 py-6">
                          <p>No shipments match your current search or filters.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSyncedSearch('');
                              setSyncedCourierFilter('');
                              setSyncedStatusFilter('');
                            }}
                            className="text-xs text-brand-primary font-semibold underline cursor-pointer"
                          >
                            Clear all filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSyncedOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#FAF8FC] transition-colors">
                        {/* Order Number & Item Preview */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start space-x-3">
                            {ord.first_item_image ? (
                              <button
                                type="button"
                                onClick={() => setAssuranceItem({
                                  product_name: ord.first_item_name,
                                  sku: ord.first_item_sku,
                                  slug: ord.first_item_slug,
                                  primary_image: ord.first_item_image,
                                  order_number: ord.order_number,
                                  customer_name: ord.customer_name,
                                  total_price: ord.total_amount,
                                  is_jhumka_box: Number(ord.has_jhumka_box) > 0,
                                })}
                                className="relative group shrink-0 rounded-xl overflow-hidden border border-brand-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                title="Click to view product image (Assurance Preview)"
                              >
                                <img
                                  src={normalizeMediaUrl(ord.first_item_image)}
                                  alt={ord.first_item_name || 'Ordered item'}
                                  className="w-11 h-11 object-cover group-hover:scale-105 transition-transform duration-200"
                                  onError={(e) => {
                                    if (e.target.src.includes('/uploads/') && !e.target.src.includes('/api/uploads/')) {
                                      e.target.src = e.target.src.replace('/uploads/', '/api/uploads/');
                                    } else {
                                      e.target.src = 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=150&q=80';
                                    }
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye className="w-3.5 h-3.5" />
                                </div>
                              </button>
                            ) : null}

                            <div className="min-w-0">
                              <div className="font-mono font-bold text-brand-tertiary flex items-center space-x-1">
                                <span>#{ord.order_number}</span>
                              </div>
                              {ord.first_item_name && (
                                <div className="text-[11px] font-medium text-brand-tertiary truncate max-w-[170px]" title={ord.first_item_name}>
                                  {ord.first_item_name}
                                </div>
                              )}
                              <div className="text-[10px] text-brand-muted">
                                {formatDateTime(ord.created_at)}
                                {Number(ord.items_count) > 1 && (
                                  <span className="ml-1.5 px-1.5 py-0.2 bg-gray-100 text-gray-700 rounded font-semibold text-[9px]">
                                    +{Number(ord.items_count) - 1} more
                                  </span>
                                )}
                              </div>
                              {Number(ord.has_jhumka_box) > 0 && (
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 mt-1">
                                  <Flame className="w-2.5 h-2.5 text-amber-600" />
                                  <span>📦 Jhumka Ad Order</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Customer & Destination */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-brand-tertiary">{ord.customer_name}</div>
                          <div className="text-[10px] text-brand-muted">{ord.customer_phone}</div>
                          <div className="text-[10px] text-brand-muted truncate max-w-[190px]" title={`${ord.city || ''}, ${ord.state || ''} ${ord.pincode || ''}`}>
                            {[ord.city, ord.state, ord.pincode].filter(Boolean).join(', ') || 'N/A'}
                          </div>
                          {ord.shipping_address_line1 && (
                            <div className="text-[9px] text-brand-muted truncate max-w-[190px]" title={ord.shipping_address_line1}>
                              {ord.shipping_address_line1}
                            </div>
                          )}
                        </td>

                        {/* Shiprocket Order ID */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>SR #{ord.shiprocket_order_id || 'ID Pending'}</span>
                            </span>
                            <div className="text-[9px] text-emerald-700 font-medium flex items-center space-x-1">
                              <Check className="w-2.5 h-2.5" />
                              <span>Live Synced</span>
                            </div>
                          </div>
                        </td>

                        {/* Courier Partner & AWB Tracking */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1.5">
                            <div className="font-semibold text-brand-tertiary text-xs flex items-center space-x-1">
                              <Truck className="w-3 h-3 text-brand-primary" />
                              <span>{ord.courier_name || 'Shiprocket Assigned Partner'}</span>
                            </div>

                            {ord.shiprocket_awb ? (
                              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                <span className="font-mono text-brand-primary font-bold text-xs bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                  {ord.shiprocket_awb}
                                </span>

                                {/* Copy AWB */}
                                <button
                                  type="button"
                                  onClick={() => handleCopyAwb(ord.shiprocket_awb, ord.id)}
                                  title="Copy AWB code to clipboard"
                                  className={`p-1 rounded-lg border text-[10px] font-semibold transition-all cursor-pointer flex items-center space-x-0.5 ${
                                    copiedAwbId === ord.id
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-white hover:bg-gray-100 border-brand-border text-brand-tertiary'
                                  }`}
                                >
                                  {copiedAwbId === ord.id ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span className="hidden xl:inline">Copy</span>
                                    </>
                                  )}
                                </button>

                                {/* Live Track Package */}
                                <a
                                  href={`https://shiprocket.co/tracking/${ord.shiprocket_awb}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Track package live on Shiprocket courier portal"
                                  className="p-1 rounded-lg bg-sky-50 hover:bg-sky-600 hover:text-white border border-sky-200 text-sky-700 text-[10px] font-semibold transition-colors flex items-center space-x-0.5 shadow-2xs"
                                >
                                  <span>Track</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-[10px] text-brand-muted italic">
                                AWB Assignment in progress
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Payment Breakdown & Total */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-brand-tertiary">
                                ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                              </span>
                              {renderPaymentStatusBadge(ord)}
                            </div>
                            <div className="text-[11px] text-brand-muted">
                              {ord.payment_type === 'partial' ? (
                                (ord.payment_status === 'partial_paid' || ord.payment_status === 'paid') ? (
                                  <span className="text-emerald-700 font-medium">₹{Number(ord.amount_paid_upfront)} advance paid</span>
                                ) : (
                                  <span>Partial COD (₹{Number(ord.amount_paid_upfront)} advance)</span>
                                )
                              ) : ord.payment_type === 'cod' ? (
                                <span>Cash on Delivery</span>
                              ) : (
                                <span>Prepaid</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Fulfillment Status */}
                        <td className="py-3.5 px-4">
                          {renderStatusBadge(ord.order_status)}
                        </td>

                        {/* Logistics Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5 flex-wrap gap-y-1">
                            {/* WhatsApp Tracking Notification */}
                            {ord.customer_phone && (
                              <a
                                href={getWhatsAppTrackingUrl(ord)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Send live WhatsApp tracking message to customer"
                                className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-emerald-700 text-xs font-semibold transition-all flex items-center space-x-1 shadow-2xs"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span className="hidden xl:inline">WhatsApp</span>
                              </a>
                            )}

                            {/* Inspect Drawer */}
                            <button
                              type="button"
                              onClick={() => inspectOrder(ord.id)}
                              className="px-3 py-1 rounded-xl bg-[#FAF8FC] hover:bg-brand-primary hover:text-white border border-brand-border text-brand-tertiary text-xs font-semibold transition-all shadow-2xs cursor-pointer flex items-center space-x-1"
                              title="Inspect full shipment and customer dossier"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Inspect</span>
                            </button>

                            {/* Re-sync SR */}
                            <button
                              type="button"
                              onClick={() => handleSyncShiprocket(ord.id)}
                              disabled={syncingSrId === ord.id}
                              title="Re-sync order details with Shiprocket API"
                              className="p-1.5 rounded-xl bg-gray-50 hover:bg-gray-200 border border-brand-border text-brand-muted hover:text-brand-tertiary transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${syncingSrId === ord.id ? 'animate-spin' : ''}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: SENT CUSTOMER EMAILS & RECOVERY AUDIT LOG */}
      {activeOrdersViewMode === 'sent_emails' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Metrics Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-brand-muted">
                <span className="text-[10px] font-caps tracking-wider uppercase font-bold">Total Dispatched</span>
                <MailCheck className="w-4 h-4 text-brand-primary" />
              </div>
              <div className="text-2xl font-bold font-mono text-brand-tertiary">
                {safeSentLogs.length}
              </div>
              <div className="text-[10px] text-brand-muted">
                All lifecycle & recovery emails logged
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-brand-muted">
                <span className="text-[10px] font-caps tracking-wider uppercase font-bold">Unique Customers</span>
                <User className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-brand-tertiary">
                {new Set(safeSentLogs.map((l) => l.recipient_email || l.customer_email).filter(Boolean)).size}
              </div>
              <div className="text-[10px] text-brand-muted">
                Direct contacts reachable
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-brand-muted">
                <span className="text-[10px] font-caps tracking-wider uppercase font-bold">Value Monitored</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-brand-tertiary">
                ₹{safeSentLogs.reduce((sum, l) => sum + (Number(l.total_amount) || 0), 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-brand-muted">
                Associated customer cart/order value
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-brand-border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-brand-muted">
                <span className="text-[10px] font-caps tracking-wider uppercase font-bold">Delivery Success</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-700">
                {safeSentLogs.length > 0
                  ? `${Math.round((safeSentLogs.filter((l) => l.delivery_status !== 'failed').length / safeSentLogs.length) * 100)}%`
                  : '100%'}
              </div>
              <div className="text-[10px] text-brand-muted">
                Live SMTP & simulated delivery
              </div>
            </div>
          </div>

          {/* Filter Toolbar for Sent Emails */}
          <div className="bg-white rounded-2xl p-4 border border-brand-border space-y-4 shadow-2xs">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <input
                  type="text"
                  value={sentEmailSearch}
                  onChange={(e) => setSentEmailSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadSentEmailLogs()}
                  placeholder="Search customer name, email, phone, city, order #..."
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2 pl-9 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
                />
                <Search className="w-3.5 h-3.5 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
                {sentEmailSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setSentEmailSearch('');
                      adminApi.getSentEmailLogs({
                        search: '',
                        type: sentEmailTypeFilter,
                        delivery_status: sentEmailStatusFilter,
                      }).then(res => {
                        const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
                        setSentEmailLogs(list);
                      });
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={loadSentEmailLogs}
                  disabled={loadingSentEmails}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF8FC] hover:bg-gray-100 border border-brand-border text-brand-tertiary text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                  title="Refresh sent customer emails log"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSentEmails ? 'animate-spin text-brand-primary' : ''}`} />
                  <span>Refresh</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSmtpModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  title="Configure Hostinger SMTP Credentials & Send Live Test Email"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>SMTP Settings & Live Test</span>
                </button>

                {/* Email Type Filter */}
                <select
                  value={sentEmailTypeFilter}
                  onChange={(e) => setSentEmailTypeFilter(e.target.value)}
                  className="bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-tertiary font-medium"
                >
                  <option value="">All Email Types</option>
                  <option value="order_failed">⚠️ Payment Incomplete / Failed</option>
                  <option value="payment_reminder">💳 Payment Recovery Reminder</option>
                  <option value="order_confirmation">✓ Order Confirmed</option>
                  <option value="order_shipped">📦 Shipped & Tracking</option>
                  <option value="order_on_hold">⏳ Order On Hold</option>
                  <option value="order_status_update">🔄 Status Update</option>
                  <option value="order_cancelled">❌ Order Cancelled</option>
                </select>

                {/* Delivery Status Filter */}
                <select
                  value={sentEmailStatusFilter}
                  onChange={(e) => setSentEmailStatusFilter(e.target.value)}
                  className="bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-tertiary font-medium"
                >
                  <option value="">All Delivery Statuses</option>
                  <option value="sent">Delivered (Live SMTP)</option>
                  <option value="simulated">Delivered (Simulated / Local)</option>
                  <option value="failed">Failed</option>
                </select>

                {/* Export CSV Button */}
                <button
                  type="button"
                  onClick={exportSentEmailsCsv}
                  disabled={safeSentLogs.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-brand-primary hover:text-white border border-purple-200 text-brand-primary text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                  title="Export all sent customer records with phone, address, and orders to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Customer CSV</span>
                </button>

                {/* Quick Switch to Orders Button */}
                <button
                  type="button"
                  onClick={() => setActiveOrdersViewMode('orders')}
                  className="px-3 py-1.5 rounded-xl bg-[#26153D] hover:bg-[#3B205D] text-white text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>View All Orders</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sent Emails Customer List Table */}
          <div className="bg-white rounded-3xl border border-brand-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8FC] border-b border-brand-border text-brand-muted font-caps tracking-wider text-[10px] uppercase">
                  <tr>
                    <th className="py-3.5 px-4">Customer & Contact</th>
                    <th className="py-3.5 px-4">Delivery Address</th>
                    <th className="py-3.5 px-4">Order Reference</th>
                    <th className="py-3.5 px-4">Dispatched Email</th>
                    <th className="py-3.5 px-4">Status & Timestamp</th>
                    <th className="py-3.5 px-4 text-right">Concierge Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {loadingSentEmails ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-brand-muted">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-brand-primary" />
                          <span className="text-xs font-medium">Loading sent customer email logs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : safeSentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-brand-muted">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-brand-primary flex items-center justify-center mx-auto">
                            <Mail className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-bold text-brand-tertiary font-editorial">
                            No Sent Customer Emails Found
                          </h4>
                          <p className="text-xs text-brand-muted leading-relaxed">
                            {sentEmailSearch || sentEmailTypeFilter || sentEmailStatusFilter
                              ? 'No sent email records match your search or filter criteria. Try clearing the filters.'
                              : 'No customer emails have been dispatched yet. When you select pending orders and send recovery emails, every customer record will be saved here for instant access.'}
                          </p>
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSentEmailSearch('');
                                setSentEmailTypeFilter('');
                                setSentEmailStatusFilter('');
                                setActiveOrdersViewMode('orders');
                              }}
                              className="px-4 py-2 rounded-xl bg-[#26153D] text-white text-xs font-semibold hover:bg-brand-primary transition-all shadow-xs cursor-pointer"
                            >
                              Go to Orders & Select Customers
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    safeSentLogs.map((log) => {
                      const custName = log.recipient_name || log.customer_name || 'Valued Customer';
                      const email = log.recipient_email || log.customer_email || 'No email';
                      const phone = log.customer_phone;
                      const hasAddress = log.shipping_address_line1 || log.city;
                      const isPaymentIncomplete = log.email_type === 'order_failed';

                      return (
                        <tr key={log.log_id} className="hover:bg-[#FAF8FC] transition-colors">
                          {/* Customer & Contact Info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-start space-x-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 text-brand-primary font-bold flex items-center justify-center shrink-0 text-xs shadow-2xs">
                                {(custName && typeof custName === 'string' && custName.length > 0) ? custName.charAt(0).toUpperCase() : 'C'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-brand-tertiary flex items-center space-x-1.5">
                                  <span>{custName}</span>
                                </div>
                                <div className="text-[11px] text-brand-muted flex items-center space-x-1 mt-0.5 truncate max-w-[200px]" title={email}>
                                  <Mail className="w-3 h-3 shrink-0 text-gray-400" />
                                  <a href={`mailto:${email}`} className="hover:text-brand-primary truncate hover:underline">
                                    {email}
                                  </a>
                                </div>
                                {phone && (
                                  <div className="text-[11px] text-brand-muted flex items-center space-x-1.5 mt-0.5">
                                    <Phone className="w-3 h-3 shrink-0 text-gray-400" />
                                    <a href={`tel:${phone}`} className="hover:text-brand-primary font-mono text-[10px]">
                                      {phone}
                                    </a>
                                    <a
                                      href={getWhatsAppRecoveryUrl(log)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Open WhatsApp chat with prefilled payment recovery message"
                                      className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 transition-colors"
                                    >
                                      <span>💬 WhatsApp</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Customer Address Details */}
                          <td className="py-3.5 px-4">
                            {hasAddress ? (
                              <div className="space-y-0.5 max-w-[190px]">
                                <div className="font-medium text-brand-tertiary text-xs">
                                  {log.city || 'City'}{log.state ? `, ${log.state}` : ''} {log.pincode ? `- ${log.pincode}` : ''}
                                </div>
                                <div className="text-[10px] text-brand-muted truncate" title={log.shipping_address_line1}>
                                  {log.shipping_address_line1}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-brand-muted italic">
                                Checkout address pending
                              </span>
                            )}
                          </td>

                          {/* Order Reference & Amount */}
                          <td className="py-3.5 px-4">
                            {log.order_id ? (
                              <div className="space-y-1">
                                <button
                                  type="button"
                                  onClick={() => inspectOrder(log.order_id)}
                                  className="font-mono font-bold text-brand-primary hover:underline cursor-pointer flex items-center space-x-1"
                                  title="Inspect complete order details"
                                >
                                  <span>#{log.order_number || log.order_id}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                                <div className="font-bold text-brand-tertiary font-mono text-xs">
                                  ₹{log.total_amount ? Number(log.total_amount).toLocaleString('en-IN') : '0.00'}
                                </div>
                                <div className="flex items-center space-x-1 flex-wrap gap-1">
                                  {renderPaymentBadge(log)}
                                  {log.first_item_name && (
                                    <span className="text-[9px] text-brand-muted truncate max-w-[130px]" title={log.first_item_name}>
                                      • {log.first_item_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-brand-muted">
                                General Dispatch
                              </span>
                            )}
                          </td>

                          {/* Dispatched Email Subject & Type */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1 max-w-[240px]">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                isPaymentIncomplete
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : log.email_type === 'order_confirmation'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : log.email_type === 'order_shipped'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : 'bg-purple-100 text-purple-800 border border-purple-300'
                              }`}>
                                {isPaymentIncomplete ? '⚠️ Payment Incomplete Recovery' : String(log.email_type || 'Email').replace(/_/g, ' ')}
                              </span>
                              <div className="text-[11px] font-medium text-brand-tertiary truncate" title={log.subject}>
                                {log.subject}
                              </div>
                            </div>
                          </td>

                          {/* Status & Sent Timestamp */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div>
                                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  log.delivery_status === 'sent'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : log.delivery_status === 'simulated'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`} title={log.error_message || ''}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${log.delivery_status === 'failed' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                                  <span>{log.delivery_status === 'simulated' ? 'Delivered (Simulated)' : log.delivery_status === 'sent' ? 'Delivered (SMTP)' : 'Failed'}</span>
                                </span>
                              </div>
                              <div className="text-[10px] text-brand-muted">
                                {formatDateTime(log.sent_at)}
                              </div>
                              {log.delivery_status === 'failed' && log.error_message && (
                                <div 
                                  className="text-[10px] text-rose-600 font-medium max-w-[210px] truncate cursor-pointer hover:underline flex items-center space-x-1"
                                  title={`Failure Reason: ${log.error_message}\n\nClick to view full error details.`}
                                  onClick={() => alert(`Email Dispatch Failure Diagnostic:\n\nOrder: #${log.order_number || log.order_id}\nRecipient: ${log.recipient_email || log.customer_email}\nType: ${log.email_type}\nFailure Reason: ${log.error_message}`)}
                                >
                                  <AlertCircle className="w-3 h-3 shrink-0 text-rose-500" />
                                  <span className="truncate">{log.error_message}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Concierge Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* Retry / Resend Email Button */}
                              {log.order_id && (
                                <button
                                  type="button"
                                  onClick={() => handleResendEmail(log)}
                                  disabled={resendingLogId === log.log_id}
                                  title={log.delivery_status === 'failed' ? "Retry sending failed email to customer via live SMTP" : "Resend copy of this email to customer via live SMTP"}
                                  className={`p-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs flex items-center space-x-1 ${
                                    log.delivery_status === 'failed'
                                      ? 'bg-rose-50 hover:bg-rose-600 hover:text-white border-rose-200 text-rose-700'
                                      : 'bg-white hover:bg-brand-primary hover:text-white border-brand-border text-brand-tertiary'
                                  }`}
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${resendingLogId === log.log_id ? 'animate-spin' : ''}`} />
                                  <span className="hidden xl:inline text-[10px]">{log.delivery_status === 'failed' ? 'Retry' : 'Resend'}</span>
                                </button>
                              )}

                              {/* Copy Customer Dossier */}
                              <button
                                type="button"
                                onClick={() => handleCopyCustomerDossier(log)}
                                title="Copy Customer Name, Phone, Email & Address Dossier to clipboard"
                                className={`p-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs flex items-center space-x-1 ${
                                  copiedLogId === log.log_id
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-white hover:bg-gray-100 border-brand-border text-brand-tertiary'
                                }`}
                              >
                                {copiedLogId === log.log_id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span className="text-[10px]">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span className="hidden lg:inline text-[10px]">Copy Data</span>
                                  </>
                                )}
                              </button>

                              {/* WhatsApp Direct Chat */}
                              {phone && (
                                <a
                                  href={getWhatsAppRecoveryUrl(log)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Chat with Customer on WhatsApp"
                                  className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-emerald-700 text-xs font-semibold transition-all flex items-center space-x-1 shadow-2xs"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span className="hidden xl:inline text-[10px]">WhatsApp</span>
                                </a>
                              )}

                              {/* Inspect Full Order Drawer */}
                              {log.order_id && (
                                <button
                                  type="button"
                                  onClick={() => inspectOrder(log.order_id)}
                                  title="View full customer and order details in drawer"
                                  className="px-2.5 py-1 rounded-xl bg-[#FAF8FC] hover:bg-brand-primary hover:text-white border border-brand-border text-brand-tertiary text-xs font-semibold transition-all shadow-2xs cursor-pointer flex items-center space-x-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Inspect</span>
                                </button>
                              )}
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
      {/* ORDER DETAIL INSPECTION DRAWER */}
      {/* ========================================================================= */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl border-l border-brand-border animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-brand-border">
              <div>
                <span className="text-[10px] font-caps tracking-widest uppercase text-brand-primary font-bold">
                  Order Inspection
                </span>
                <h3 className="text-xl font-editorial font-bold text-brand-tertiary">
                  #{selectedOrder.order_number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-brand-muted hover:text-brand-tertiary rounded-xl hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payment Status Banner */}
            {selectedOrder.payment_status === 'pending' && selectedOrder.payment_type !== 'cod' ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs space-y-1.5 text-rose-900">
                <div className="flex items-center space-x-2 font-bold text-rose-800 text-sm">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                  <span>Payment Not Received (Abandoned Checkout)</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  The buyer filled in their address but <strong>did not complete the payment on the payment gateway</strong>. No funds were debited or credited to your Razorpay or bank account. Do not dispatch this package unless payment is verified.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] font-mono text-rose-800">
                  <span className="bg-rose-100 px-2 py-0.5 rounded font-semibold">Payment Status: UNPAID / PENDING</span>
                  <span>Gateway Transaction Ref: None</span>
                </div>
              </div>
            ) : (selectedOrder.payment_status === 'paid' || selectedOrder.payment_status === 'partial_paid') ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs space-y-1 text-emerald-900">
                <div className="flex items-center space-x-2 font-bold text-emerald-800 text-sm">
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                  <span>
                    {selectedOrder.payment_status === 'partial_paid' ? 'Partial COD Advance Paid' : 'Payment Received & Verified'}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-700 flex items-center space-x-2">
                  <span>Transaction Ref:</span>
                  <span className="font-mono font-semibold bg-emerald-100/70 px-2 py-0.5 rounded text-emerald-800">
                    {selectedOrder.fastrr_order_id || 'Captured via Gateway'}
                  </span>
                </div>
              </div>
            ) : selectedOrder.payment_type === 'cod' ? (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs space-y-1 text-blue-900">
                <div className="flex items-center space-x-2 font-bold text-blue-800 text-sm">
                  <span>💵</span>
                  <span>Cash on Delivery (Full Doorstep Collection)</span>
                </div>
                <div className="text-[11px] text-blue-700">
                  Collect ₹{Number(selectedOrder.total_amount).toLocaleString('en-IN')} cash upon doorstep delivery.
                </div>
              </div>
            ) : null}

            {/* Customer & Address Details */}
            <div className="bg-[#FAF8FC] rounded-2xl p-4 border border-brand-border space-y-3 text-xs">
              <div className="font-caps tracking-wider uppercase text-[10px] text-brand-muted font-bold">
                Customer & Delivery Address
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="font-semibold text-brand-tertiary">{selectedOrder.customer_name}</div>
                  <div className="text-brand-muted flex items-center space-x-1 mt-0.5">
                    <Phone className="w-3 h-3" />
                    <span>{selectedOrder.customer_phone}</span>
                  </div>
                  <div className="text-brand-muted flex items-center space-x-1 mt-0.5">
                    <Mail className="w-3 h-3" />
                    <span>{selectedOrder.customer_email}</span>
                  </div>
                </div>

                <div>
                  <div className="text-brand-tertiary font-medium">
                    {selectedOrder.shipping_address_line1}
                    {selectedOrder.shipping_address_line2 ? `, ${selectedOrder.shipping_address_line2}` : ''}
                  </div>
                  <div className="text-brand-muted">
                    {selectedOrder.city}, {selectedOrder.state} - {selectedOrder.pincode}
                  </div>
                </div>
              </div>
            </div>

            {/* Itemized Order List */}
            <div className="space-y-3">
              <div className="font-caps tracking-wider uppercase text-[10px] text-brand-muted font-bold">
                Items Ordered ({selectedOrder.items?.length || 0})
              </div>
              <div className="divide-y divide-brand-border/60 border border-brand-border rounded-2xl p-2 bg-white">
                {selectedOrder.items?.map((item) => {
                  const itemPayload = {
                    product_name: item.product_name,
                    sku: item.sku,
                    slug: item.slug,
                    primary_image: item.primary_image,
                    quantity: item.quantity,
                    variant_title: item.variant_title,
                    unit_price: item.unit_price,
                    total_price: item.total_price,
                    order_number: selectedOrder.order_number,
                    customer_name: selectedOrder.customer_name,
                    is_jhumka_box: Number(item.is_jhumka_box) > 0,
                  };

                  return (
                    <div key={item.id} className="p-3 flex items-center justify-between text-xs hover:bg-[#FAF8FC] rounded-xl transition-colors">
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => setAssuranceItem(itemPayload)}
                          className="relative group shrink-0 rounded-xl overflow-hidden border border-brand-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary"
                          title="Click to view high-resolution product image for assurance"
                        >
                          <img
                            src={
                              item.primary_image ? normalizeMediaUrl(item.primary_image) :
                              'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=150&q=80'
                            }
                            alt={item.product_name}
                            className="w-12 h-12 rounded-xl object-cover group-hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              if (e.target.src.includes('/uploads/') && !e.target.src.includes('/api/uploads/')) {
                                e.target.src = e.target.src.replace('/uploads/', '/api/uploads/');
                              } else {
                                e.target.src = 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=150&q=80';
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-4 h-4 drop-shadow-sm" />
                          </div>
                        </button>

                        <div>
                          <div className="font-semibold text-brand-tertiary flex items-center space-x-2">
                            <span>{item.product_name}</span>
                            {item.sku && (
                              <span className="font-mono text-[9px] text-brand-muted bg-gray-100 px-1.5 py-0.2 rounded">
                                {item.sku}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-brand-muted mt-0.5">
                            Qty: {item.quantity} × ₹{Number(item.unit_price).toLocaleString('en-IN')}
                            {item.variant_title && <span className="ml-1.5 text-brand-tertiary">• {item.variant_title}</span>}
                          </div>
                          {Number(item.is_jhumka_box) > 0 && (
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                              🔥 Signature Jhumka Box
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2.5">
                        <button
                          type="button"
                          onClick={() => setAssuranceItem(itemPayload)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-brand-primary hover:text-white text-[11px] font-semibold text-brand-tertiary transition-colors cursor-pointer"
                          title="Inspect product photo for packing assurance"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Image</span>
                        </button>

                        <div className="font-bold text-brand-tertiary font-mono">
                          ₹{Number(item.total_price).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-[#FAF8FC] rounded-2xl p-4 border border-brand-border space-y-2 text-xs">
              <div className="flex justify-between text-brand-muted">
                <span>Subtotal:</span>
                <span>₹{Number(selectedOrder.subtotal).toLocaleString('en-IN')}</span>
              </div>
              {Number(selectedOrder.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Voucher Savings:</span>
                  <span>-₹{Number(selectedOrder.discount_amount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-brand-muted">
                <span>Express Delivery:</span>
                <span>{Number(selectedOrder.shipping_fee) === 0 ? 'FREE' : `₹${selectedOrder.shipping_fee}`}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-brand-tertiary pt-2 border-t border-brand-border/60">
                <span>Total Amount:</span>
                <span>₹{Number(selectedOrder.total_amount).toLocaleString('en-IN')}</span>
              </div>

              {selectedOrder.payment_type === 'partial' && (
                <div className="pt-2 border-t border-brand-border/60 text-[11px]">
                  {selectedOrder.payment_status === 'partial_paid' || selectedOrder.payment_status === 'paid' ? (
                    <div className="text-emerald-800">
                      <span>Upfront Deposit Paid: </span>
                      <span className="font-bold">₹{Number(selectedOrder.amount_paid_upfront)}</span>
                      <span className="text-brand-muted"> (Balance ₹{Number(selectedOrder.amount_due_on_delivery)} due on delivery)</span>
                    </div>
                  ) : (
                    <div className="text-rose-700">
                      <span className="font-bold">⚠️ Advance Deposit Required: ₹{Number(selectedOrder.amount_paid_upfront)} (UNPAID)</span>
                      <span className="text-brand-muted"> — Customer has not completed payment.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Shiprocket Live Panel Synchronization Card */}
            <div className="bg-gradient-to-br from-[#FAF8FC] via-white to-purple-50/40 rounded-2xl p-4 sm:p-5 border border-purple-200/80 shadow-2xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-brand-primary flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-editorial text-sm font-bold text-brand-tertiary">Shiprocket Live Dashboard Sync</h4>
                    <div className="text-[10px] text-brand-muted">Automated sync with app.shiprocket.in warehouse</div>
                  </div>
                </div>

                {/* Live Status Badge */}
                {selectedOrder.shiprocket_order_id && !String(selectedOrder.shiprocket_order_id).startsWith('SR-ORD-') ? (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 w-fit">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Live on Shiprocket</span>
                  </span>
                ) : String(selectedOrder.shiprocket_order_id || '').startsWith('SR-ORD-') ? (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 w-fit">
                    <span>⚠️</span>
                    <span>Local Mock (Needs Push)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300 w-fit">
                    <span>○</span>
                    <span>Not Pushed Yet</span>
                  </span>
                )}
              </div>

              {/* SR Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white p-3 rounded-xl border border-brand-border text-xs">
                <div>
                  <div className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">SR Order ID</div>
                  <div className="font-mono font-bold text-brand-tertiary mt-0.5 truncate" title={selectedOrder.shiprocket_order_id || ''}>
                    {selectedOrder.shiprocket_order_id || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">Shipment ID</div>
                  <div className="font-mono font-medium text-brand-tertiary mt-0.5 truncate" title={selectedOrder.shiprocket_shipment_id || ''}>
                    {selectedOrder.shiprocket_shipment_id || 'Pending'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">AWB Number</div>
                  <div className="font-mono font-medium text-brand-primary mt-0.5 truncate" title={selectedOrder.shiprocket_awb || ''}>
                    {selectedOrder.shiprocket_awb || 'Pending Manifest'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">Courier</div>
                  <div className="font-medium text-brand-tertiary mt-0.5 truncate" title={selectedOrder.courier_name || ''}>
                    {selectedOrder.courier_name || 'Assigned by SR'}
                  </div>
                </div>
              </div>

              {/* Payment Warning for Unpaid orders */}
              {selectedOrder.payment_status === 'pending' && selectedOrder.payment_type !== 'cod' && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-900 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Payment Not Received:</strong> This customer has not completed online payment. Pushing to Shiprocket will manifest a shipment for an unpaid order. Confirm receipt of funds before shipping.
                  </span>
                </div>
              )}

              {/* Notice for Sandbox Mock or Unsynced */}
              {String(selectedOrder.shiprocket_order_id || '').startsWith('SR-ORD-') && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    This order was saved with a sandbox mock ID because credentials were not yet authenticated when the customer paid. Click <strong>"Push to Live Shiprocket Panel"</strong> below to create it directly in your live Shiprocket dashboard.
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSyncShiprocket(selectedOrder.id)}
                  disabled={syncingSrId === selectedOrder.id}
                  className="px-3.5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingSrId === selectedOrder.id ? 'animate-spin' : ''}`} />
                  <span>
                    {syncingSrId === selectedOrder.id
                      ? 'Pushing to Shiprocket...'
                      : (selectedOrder.shiprocket_order_id && !String(selectedOrder.shiprocket_order_id).startsWith('SR-ORD-')
                          ? 'Re-Push / Refresh from Shiprocket'
                          : 'Push to Live Shiprocket Panel')}
                  </span>
                </button>

                <a
                  href="https://app.shiprocket.in/orders"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-white hover:bg-gray-50 border border-brand-border text-brand-tertiary text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <span>Open Shiprocket Panel</span>
                  <ExternalLink className="w-3 h-3 text-brand-muted" />
                </a>

                {selectedOrder.tracking_url && (
                  <a
                    href={selectedOrder.tracking_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-brand-primary text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                  >
                    <span>Track Order</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Manual Status Override & Shiprocket Dispatch */}
            {selectedOrder.order_status !== 'cancelled' && (
              <div className="bg-white rounded-2xl p-4 border border-brand-border space-y-4">
                <div className="font-caps tracking-wider uppercase text-[10px] text-brand-muted font-bold">
                  Manual Status & Shipment Action
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-brand-muted">Shiprocket / Bluedart AWB</label>
                    <input
                      type="text"
                      value={shipAwb}
                      onChange={(e) => setShipAwb(e.target.value)}
                      placeholder="e.g. BLUEDART-987654"
                      className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-brand-muted">Courier Partner</label>
                    <input
                      type="text"
                      value={shipCourier}
                      onChange={(e) => setShipCourier(e.target.value)}
                      placeholder="Bluedart Express Air"
                      className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    onClick={() => handleStatusChange('shipped')}
                    disabled={updatingStatus}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Mark Shipped & Send Tracking Email</span>
                  </button>

                  <button
                    onClick={() => handleStatusChange('delivered')}
                    disabled={updatingStatus}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Mark Delivered</span>
                  </button>

                  <button
                    onClick={() => handleStatusChange('on_hold')}
                    disabled={updatingStatus}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Mark On Hold</span>
                  </button>

                  <button
                    onClick={() => openEmailModal(selectedOrder)}
                    className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Custom Email to Customer</span>
                  </button>
                </div>
              </div>
            )}

            {/* Dispatched Emails Audit Trail */}
            <div className="space-y-3 pt-3 border-t border-brand-border">
              <div className="flex items-center justify-between">
                <div className="font-caps tracking-wider uppercase text-[10px] text-brand-muted font-bold flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Email Dispatch History ({selectedOrder.email_logs?.length || 0})</span>
                </div>
                <button
                  type="button"
                  onClick={() => openEmailModal(selectedOrder)}
                  className="text-[11px] font-semibold text-brand-primary hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <SendHorizontal className="w-3 h-3" />
                  <span>Send Email</span>
                </button>
              </div>

              {selectedOrder.email_logs && selectedOrder.email_logs.length > 0 ? (
                <div className="divide-y divide-brand-border/60 border border-brand-border rounded-2xl bg-white p-2 space-y-1">
                  {selectedOrder.email_logs.map((log) => (
                    <div key={log.id} className="p-2.5 hover:bg-[#FAF8FC] rounded-xl transition-colors text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          log.email_type === 'order_failed'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : log.email_type === 'order_confirmation'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                        }`}>
                          {log.email_type === 'order_failed' ? 'Payment Incomplete Recovery' : log.email_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-brand-muted">
                          {formatDateTime(log.sent_at)}
                        </span>
                      </div>
                      <div className="font-medium text-brand-tertiary truncate" title={log.subject}>
                        {log.subject}
                      </div>
                      <div className="text-[10px] text-brand-muted flex items-center justify-between pt-0.5">
                        <span className="truncate max-w-[200px]">To: {log.recipient_email}</span>
                        <span className={`font-semibold capitalize ${
                          log.status === 'sent' || log.status === 'simulated' ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {log.status === 'simulated' ? '✓ Delivered (Simulated)' : `✓ ${log.status}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#FAF8FC] border border-brand-border rounded-2xl p-4 text-center text-xs text-brand-muted">
                  No email notifications dispatched for this order yet.
                </div>
              )}
            </div>

            {/* Cancel & Refund Action (Admin Only) */}
            {selectedOrder.order_status !== 'cancelled' && (
              <div className="pt-4 border-t border-brand-border flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-rose-700">Cancel Order & Issue Refund</div>
                  <div className="text-[10px] text-brand-muted">Restocks inventory & triggers refund email</div>
                </div>

                {isStaff ? (
                  <span className="text-[10px] text-brand-muted bg-gray-100 px-2 py-1 rounded">
                    Admin Privilege Required
                  </span>
                ) : (
                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors flex items-center space-x-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel & Refund</span>
                  </button>
                )}
              </div>
            )}

            {/* Delete Order Action */}
            <div className="pt-4 border-t border-brand-border flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-rose-700">Delete Order Record</div>
                <div className="text-[10px] text-brand-muted">Permanently removes this order and tracking history</div>
              </div>

              <button
                type="button"
                onClick={() => openDeleteModal(selectedOrder)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEND CUSTOM LUXURY EMAIL MODAL */}
      {/* ========================================================================= */}
      {emailModalOpen && targetEmailOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-brand-border shadow-luxury space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Header with Branding */}
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 text-brand-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-caps tracking-widest uppercase text-brand-primary font-bold">
                    Email Notification Dispatcher
                  </span>
                  <h3 className="text-base font-editorial font-bold text-brand-tertiary">
                    Send Customer Email • #{targetEmailOrder.order_number}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="p-1.5 text-brand-muted hover:text-brand-tertiary rounded-xl hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recipient Snapshot & Editable Email Address */}
            <div className="bg-[#FAF8FC] rounded-2xl p-3.5 border border-brand-border/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">Customer:</span>
                  <div className="font-semibold text-brand-tertiary">{targetEmailOrder.customer_name}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">Order Value:</span>
                  <div className="font-bold text-brand-tertiary font-mono">₹{Number(targetEmailOrder.total_amount).toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-brand-muted capitalize">{targetEmailOrder.payment_type?.replace('_', ' ')}</div>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-brand-muted uppercase font-bold tracking-wider flex items-center justify-between mb-1">
                  <span>Recipient Email *</span>
                  {(!recipientEmailInput || recipientEmailInput.includes('@valerieclient.in')) && (
                    <span className="text-rose-600 font-semibold normal-case">⚠️ Enter customer email to send</span>
                  )}
                </label>
                <input
                  type="email"
                  required
                  value={recipientEmailInput}
                  onChange={(e) => setRecipientEmailInput(e.target.value)}
                  placeholder="e.g. customer@example.com"
                  className="w-full bg-white border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary font-mono"
                />
              </div>
            </div>

            <form onSubmit={handleSendCustomEmail} className="space-y-4 text-xs">
              {/* Template Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-caps tracking-wider uppercase text-brand-tertiary font-bold">
                  Select Email Template *
                </label>
                <select
                  value={selectedEmailType}
                  onChange={(e) => setSelectedEmailType(e.target.value)}
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary font-medium"
                >
                  <option value="order_confirmation">✦ Order Confirmation / Successful (Full Recap + Gift Callout)</option>
                  <option value="order_status_update">🚚 Status Update & Milestone (Live Badge + Live Tracking)</option>
                  <option value="order_on_hold">⏱ Order Temporarily On Hold (Concierge Notice & WhatsApp)</option>
                  <option value="payment_reminder">💳 Payment Reminder (Incomplete Checkout Recovery Link)</option>
                  <option value="order_failed">✕ Payment Incomplete / Failed (Reassurance & Retry Link)</option>
                  <option value="order_shipped">✈️ Order Shipped (Air Express & AWB Tracking)</option>
                  <option value="order_cancelled">🛑 Order Cancelled & Refund Notice</option>
                </select>
              </div>

              {/* Status Milestone picker (if status update chosen) */}
              {selectedEmailType === 'order_status_update' && (
                <div className="space-y-1.5 bg-purple-50/50 p-3 rounded-2xl border border-purple-100">
                  <label className="text-[10px] font-caps tracking-wider uppercase text-brand-primary font-bold">
                    Target Milestone Milestone Badge
                  </label>
                  <select
                    value={emailTargetStatus}
                    onChange={(e) => setEmailTargetStatus(e.target.value)}
                    className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
                  >
                    <option value="confirmed">Order Confirmed & Allocated</option>
                    <option value="processing">In Handcrafting & Anti-Tarnish Prep</option>
                    <option value="shipped">Dispatched & On The Way</option>
                    <option value="out_for_delivery">Out for Delivery Today</option>
                    <option value="delivered">Delivered with Care</option>
                    <option value="on_hold">Temporarily On Hold</option>
                  </select>
                </div>
              )}

              {/* Specific Reason (for On Hold or Failed) */}
              {(selectedEmailType === 'order_on_hold' || selectedEmailType === 'order_failed') && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-caps tracking-wider uppercase text-brand-tertiary font-bold">
                    Reason / Context
                  </label>
                  <input
                    type="text"
                    value={emailReason}
                    onChange={(e) => setEmailReason(e.target.value)}
                    placeholder={
                      selectedEmailType === 'order_on_hold'
                        ? 'e.g. Pin code address confirmation required prior to dispatch'
                        : 'e.g. Bank gateway connection interrupted during UPI authorization'
                    }
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
                  />
                </div>
              )}

              {/* Personal Concierge Note (Optional for any email) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-caps tracking-wider uppercase text-brand-tertiary font-bold">
                    Personalized Concierge Note (Optional)
                  </label>
                  <span className="text-[10px] text-brand-muted">Renders prominently in email</span>
                </div>
                <textarea
                  rows={2}
                  value={emailCustomMessage}
                  onChange={(e) => setEmailCustomMessage(e.target.value)}
                  placeholder="e.g. We have included an extra velvet pouch for your order as our special gift. Enjoy your jewelry!"
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl p-3 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
                ></textarea>
              </div>

              {/* Luxury Guarantee Checklist */}
              <div className="p-3 bg-[#FAF8FC] rounded-2xl border border-brand-border/60 text-[11px] text-brand-muted space-y-1">
                <div className="flex items-center space-x-1.5 text-brand-tertiary font-medium">
                  <span>✨</span>
                  <span><strong>Luxury Theme Assured:</strong> Includes Valerie Jewels top logo, brand colors, itemized items table, and delivery notes.</span>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-brand-border/60">
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-brand-tertiary text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-secondary text-white text-xs font-semibold flex items-center space-x-1.5 shadow-luxury transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingEmail ? 'Dispatching...' : 'Send Luxury Email Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CANCEL & REFUND CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {cancelModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-brand-border shadow-luxury space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-editorial font-bold text-brand-tertiary">
                Confirm Cancellation & Refund
              </h3>
            </div>

            <p className="text-xs text-brand-muted leading-relaxed">
              Order #{selectedOrder.order_number} will be cancelled.
              {selectedOrder.payment_type === 'full_prepaid' && (
                <span className="font-semibold text-brand-tertiary block mt-1">
                  Refund Amount: ₹{Number(selectedOrder.total_amount).toLocaleString('en-IN')} (Full Prepaid)
                </span>
              )}
              {selectedOrder.payment_type === 'partial' && (
                <span className="font-semibold text-brand-tertiary block mt-1">
                  Refund Amount: ₹{Number(selectedOrder.amount_paid_upfront).toLocaleString('en-IN')} (₹{Number(selectedOrder.amount_paid_upfront).toLocaleString('en-IN')} Upfront Token)
                </span>
              )}
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-caps tracking-wider uppercase text-brand-tertiary font-bold">
                Mandatory Reason for Activity Log *
              </label>
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer requested cancellation before dispatch; address unserviceable..."
                className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl p-3 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
              ></textarea>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-brand-tertiary text-xs font-semibold"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleCancelAndRefund}
                disabled={cancelling || !cancelReason}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                {cancelling ? 'Processing Refund...' : 'Execute Refund & Restock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE ORDER PERMANENT CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deleteModalOpen && orderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-brand-border shadow-luxury space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-2xl border border-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-editorial font-bold text-brand-tertiary">
                  Delete Order Permanently
                </h3>
                <span className="text-[11px] text-brand-muted">Action cannot be undone</span>
              </div>
            </div>

            <div className="bg-[#FAF8FC] rounded-2xl p-4 border border-brand-border space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-brand-border/60">
                <span className="text-brand-muted">Order Number:</span>
                <span className="font-mono font-bold text-brand-primary">#{orderToDelete.order_number}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-brand-border/60">
                <span className="text-brand-muted">Customer:</span>
                <span className="font-semibold text-brand-tertiary">{orderToDelete.customer_name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-brand-border/60">
                <span className="text-brand-muted">Total Amount:</span>
                <span className="font-bold text-brand-tertiary">₹{Number(orderToDelete.total_amount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-brand-muted">Current Status:</span>
                <span className="font-semibold uppercase text-[10px] tracking-wider text-brand-primary">{orderToDelete.order_status}</span>
              </div>
            </div>

            <p className="text-xs text-rose-700/90 leading-relaxed bg-rose-50/60 p-3 rounded-xl border border-rose-100">
              Are you sure you want to permanently delete this order? All associated line items, dispatch events, and email logs will be purged from the database.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => { setDeleteModalOpen(false); setOrderToDelete(null); }}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl border border-brand-border text-xs font-semibold text-brand-tertiary hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteOrder}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Deleting Order...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BULK DELETE ORDERS PERMANENT CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {bulkDeleteModalOpen && selectedOrderIds.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-brand-border shadow-luxury space-y-4 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-2xl border border-rose-100 shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-editorial font-bold text-brand-tertiary">
                  Delete {selectedOrderIds.length} Selected Junk Orders
                </h3>
                <span className="text-[11px] text-rose-600 font-semibold block">
                  ⚠️ Irreversible Permanent Bulk Purge
                </span>
              </div>
            </div>

            <p className="text-xs text-brand-muted leading-relaxed">
              You are about to permanently delete <strong className="text-brand-tertiary">{selectedOrderIds.length} selected {selectedOrderIds.length === 1 ? 'order' : 'orders'}</strong>. All customer details, items, dispatch tracking events, and email logs will be completely purged from the database.
            </p>

            {/* List preview of selected orders to prevent accidental mistakes */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-caps text-brand-muted px-1">
                <span>Orders to be purged ({selectedOrderIds.length})</span>
                <span>Review carefully</span>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-2xl border border-brand-border bg-[#FAF8FC] p-2 space-y-1 divide-y divide-brand-border/40">
                {orders
                  .filter((o) => selectedOrderIds.includes(o.id))
                  .map((o) => (
                    <div key={o.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs px-2 py-1">
                      <div className="truncate max-w-[240px]">
                        <span className="font-mono font-bold text-brand-primary">#{o.order_number}</span>
                        <span className="text-brand-tertiary ml-2 font-medium">{o.customer_name || 'Guest'}</span>
                        <span className="text-[10px] text-brand-muted ml-1.5 font-mono">({o.customer_phone})</span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white border border-brand-border text-brand-tertiary uppercase">
                          {o.order_status}
                        </span>
                        <span className="font-bold text-brand-tertiary">
                          ₹{Number(o.total_amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-rose-50/80 rounded-2xl p-3 border border-rose-200/80 text-[11px] text-rose-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <span>🛡️ Protection Safeguard</span>
              </p>
              <p>
                Double-check the order list above to ensure you are not deleting genuine paid customer orders. Once deleted, these records cannot be recovered.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkDeleteModalOpen(false)}
                disabled={bulkDeleting}
                className="px-4 py-2.5 rounded-xl border border-brand-border text-xs font-semibold text-brand-tertiary hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel / Keep Orders
              </button>
              <button
                type="button"
                onClick={confirmBulkDeleteOrders}
                disabled={bulkDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{bulkDeleting ? `Deleting ${selectedOrderIds.length} Orders...` : `Yes, Delete ${selectedOrderIds.length} Orders`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BULK EMAIL PAYMENT INCOMPLETE / FAILED MODAL */}
      {/* ========================================================================= */}
      {bulkEmailModalOpen && targetBulkEmailOrders.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 border border-brand-border shadow-luxury space-y-4 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
                ✕
              </div>
              <div>
                <h3 className="text-base font-editorial font-bold text-brand-tertiary">
                  Payment Incomplete / Failed (Batch Recovery Email)
                </h3>
                <span className="text-[11px] text-rose-600 font-semibold block">
                  Exact Email Format • {targetBulkEmailOrders.length} {targetBulkEmailOrders.length === 1 ? 'Customer' : 'Customers'} Selected
                </span>
              </div>
            </div>

            {/* Template Selector / Format Indicator (Exact matching the single modal) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-caps tracking-wider uppercase text-brand-tertiary font-bold">
                Selected Email Format & Template *
              </label>
              <div className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl p-3 text-xs text-brand-tertiary font-medium space-y-1">
                <div className="flex items-center justify-between font-semibold text-rose-700">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>✕ Payment Incomplete / Failed (Reassurance & Retry Link)</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                    Active Format
                  </span>
                </div>
                <div className="text-[11px] text-brand-muted">
                  <strong>Subject:</strong> Payment Incomplete for #VJ-XXXX — Your Pieces Are Safe — Valerie Jewels
                </div>
              </div>
            </div>

            {/* Try Again Link Option Feature Box */}
            <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-caps tracking-wider uppercase text-brand-primary font-bold flex items-center space-x-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Try Again & Retry Payment Link Option</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  Auto 1-Click Link
                </span>
              </div>
              <p className="text-[11px] text-brand-muted leading-relaxed">
                Each customer automatically receives the prominent 1-click recovery button linking directly to their unique checkout retry link (<code className="font-mono text-brand-primary">https://valeriejewels.in/#checkout?order=...</code>). If they prefer Cash on Delivery, they can switch to COD on checkout.
              </p>
              {/* Visual Button Preview */}
              <div className="pt-1 flex items-center justify-center">
                <div className="px-5 py-2 rounded-xl bg-[#8366B0] text-white text-[11px] font-bold tracking-wider uppercase shadow-md flex items-center space-x-2 pointer-events-none select-none">
                  <span>Complete Your Order / Retry Payment &rarr;</span>
                </div>
              </div>
            </div>

            {/* Reason / Context Input (Optional) - Matches single email modal line 1480 */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-caps tracking-wider uppercase text-brand-tertiary font-bold flex items-center justify-between">
                <span>Reason / Context (Optional)</span>
                <span className="text-[10px] text-brand-muted font-normal">Shows in alert notice inside email</span>
              </label>
              <input
                type="text"
                value={bulkEmailReason}
                onChange={(e) => setBulkEmailReason(e.target.value)}
                placeholder="e.g. Bank gateway connection interrupted during UPI authorization / Checkout incomplete"
                className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
              />
            </div>

            {/* Added Message Option (+ Added Message) - Matches single email modal line 1500 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-caps tracking-wider uppercase text-brand-tertiary font-bold">
                  + Added Message / Personalized Note (Optional)
                </label>
                <span className="text-[10px] text-brand-muted">Renders in highlighted box below greeting</span>
              </div>
              <textarea
                rows={2}
                value={bulkEmailCustomMessage}
                onChange={(e) => setBulkEmailCustomMessage(e.target.value)}
                placeholder="e.g. We have temporarily reserved your handcrafted pieces. Please click the button below to complete your payment securely and confirm priority dispatch."
                className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl p-3 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
              ></textarea>
            </div>

            {/* Recipients List Preview */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-caps text-brand-muted px-1">
                <span>Recipients ({targetBulkEmailOrders.length})</span>
                <span>Review emails & amounts</span>
              </div>
              <div className="max-h-36 overflow-y-auto rounded-2xl border border-brand-border bg-[#FAF8FC] p-2 space-y-1 divide-y divide-brand-border/40">
                {targetBulkEmailOrders.map((o) => (
                  <div key={o.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs px-2 py-1">
                    <div className="truncate max-w-[280px]">
                      <span className="font-mono font-bold text-brand-primary">#{o.order_number}</span>
                      <span className="text-brand-tertiary ml-2 font-medium">{o.customer_name || 'Valued Customer'}</span>
                      <span className="text-[10px] text-brand-muted ml-1.5">({o.customer_email || 'No email'})</span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        {o.payment_status === 'pending' ? 'Unpaid' : o.payment_status}
                      </span>
                      <span className="font-bold text-brand-tertiary font-mono">
                        ₹{Number(o.total_amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Luxury Guarantee Checklist (Matches single modal) */}
            <div className="p-3 bg-[#FAF8FC] rounded-2xl border border-brand-border/60 text-[11px] text-brand-muted space-y-1">
              <div className="flex items-center space-x-1.5 text-brand-tertiary font-medium">
                <span>✨</span>
                <span><strong>Luxury Theme Assured:</strong> Includes Valerie Jewels top logo, reserved items table, debited funds reassurance ("🛡️ Was money debited from your account?"), and WhatsApp Concierge support.</span>
              </div>
            </div>

            {/* Automatic Customer Log Audit Notice */}
            <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-100 text-[11px] text-purple-900 flex items-center space-x-2">
              <MailCheck className="w-4 h-4 text-brand-primary shrink-0" />
              <span>
                <strong>Instant History Access:</strong> All {targetBulkEmailOrders.length} customer records will be automatically saved to your <strong>Sent Customer Emails Log</strong> so you can access customer phone numbers, delivery addresses, and order data anytime.
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-brand-border/60">
              <button
                type="button"
                onClick={() => setBulkEmailModalOpen(false)}
                disabled={bulkEmailSending}
                className="px-4 py-2.5 rounded-xl border border-brand-border text-xs font-semibold text-brand-tertiary hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkEmail}
                disabled={bulkEmailSending || targetBulkEmailOrders.length === 0}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <Send className={`w-3.5 h-3.5 ${bulkEmailSending ? 'animate-spin' : ''}`} />
                <span>
                  {bulkEmailSending
                    ? `Dispatching to ${targetBulkEmailOrders.length} Customers...`
                    : `Dispatch Payment Incomplete Emails to ${targetBulkEmailOrders.length} ${targetBulkEmailOrders.length === 1 ? 'Customer' : 'Customers'}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMTP Settings & Live Test Email Modal */}
      {smtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-brand-border shadow-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-brand-border/60 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                    <Settings className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-bold text-brand-tertiary">
                    SMTP Email Delivery & Diagnostics
                  </h3>
                </div>
                <p className="text-xs text-brand-muted">
                  Configure live SMTP credentials (e.g., Hostinger Webmail) so customers receive real order confirmations, shipping tracking, and payment recovery emails.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSmtpModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Status Pill */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
              isLiveSmtpConfigured
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isLiveSmtpConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>
                  {isLiveSmtpConfigured
                    ? 'Live SMTP Operational — Real emails will be dispatched to customers inboxes'
                    : 'Simulation Mode Active — Live credentials missing, emails saved locally to disk'}
                </span>
              </div>
              {smtpHasSavedPassword && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 border border-emerald-300 text-emerald-700">
                  Password Saved
                </span>
              )}
            </div>

            {/* Section 1: SMTP Credentials */}
            <form onSubmit={handleSaveSmtpSettings} className="space-y-4 bg-[#FAF8FC] p-4 md:p-5 rounded-2xl border border-brand-border/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-brand-tertiary">
                  <Lock className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Hostinger SMTP Server Credentials</span>
                </div>
                <span className="text-[11px] text-brand-muted">Hostinger / Webmail</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-brand-tertiary mb-1">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    required
                    className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary focus:outline-none focus:border-brand-primary"
                    placeholder="smtp.hostinger.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-brand-tertiary mb-1">
                      Port
                    </label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      required
                      className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary focus:outline-none focus:border-brand-primary"
                      placeholder="465"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-brand-tertiary mb-1">
                      Encryption
                    </label>
                    <select
                      value={smtpEncryption}
                      onChange={(e) => setSmtpEncryption(e.target.value)}
                      className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary focus:outline-none focus:border-brand-primary font-medium"
                    >
                      <option value="ssl">SSL (465)</option>
                      <option value="tls">TLS (587)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-brand-tertiary mb-1">
                    SMTP Username / Email Address
                  </label>
                  <input
                    type="email"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    required
                    className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary focus:outline-none focus:border-brand-primary font-mono text-xs"
                    placeholder="orders@valeriejewels.in"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-brand-tertiary mb-1">
                    Hostinger Email Password
                  </label>
                  <div className="relative">
                    <input
                      type={showSmtpPass ? 'text' : 'password'}
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      required={!smtpHasSavedPassword}
                      className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 pr-9 text-brand-tertiary focus:outline-none focus:border-brand-primary font-mono text-xs"
                      placeholder={smtpHasSavedPassword ? '•••••••• (Enter new to change)' : 'Enter email password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer text-[10px]"
                    >
                      {showSmtpPass ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-brand-tertiary mb-1">
                    From Email Address
                  </label>
                  <input
                    type="email"
                    value={smtpFromEmail}
                    onChange={(e) => setSmtpFromEmail(e.target.value)}
                    required
                    className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary focus:outline-none focus:border-brand-primary"
                    placeholder="orders@valeriejewels.in"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-brand-tertiary mb-1">
                    From Sender Name
                  </label>
                  <input
                    type="text"
                    value={smtpFromName}
                    onChange={(e) => setSmtpFromName(e.target.value)}
                    required
                    className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary focus:outline-none focus:border-brand-primary"
                    placeholder="Valerie Jewels Support"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-brand-muted">
                  Credentials are encrypted and stored in system database settings.
                </span>
                <button
                  type="submit"
                  disabled={smtpSaving || loadingSmtpSettings}
                  className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Check className={`w-3.5 h-3.5 ${smtpSaving ? 'animate-spin' : ''}`} />
                  <span>{smtpSaving ? 'Saving Credentials...' : 'Save SMTP Settings'}</span>
                </button>
              </div>
            </form>

            {/* Section 2: Live Test Email Dispatcher */}
            <div className="space-y-4 bg-white p-4 md:p-5 rounded-2xl border border-brand-border shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-brand-tertiary">
                  <Send className="w-3.5 h-3.5 text-purple-700" />
                  <span>Send Live Test Email (Instant Verification)</span>
                </div>
                <span className="text-[11px] text-purple-700 font-semibold">Test Inboxes</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-brand-tertiary mb-1">
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    required
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary font-mono focus:outline-none focus:border-brand-primary"
                    placeholder="yashpatel6855@gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-brand-tertiary mb-1">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    value={testEmailName}
                    onChange={(e) => setTestEmailName(e.target.value)}
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary focus:outline-none focus:border-brand-primary"
                    placeholder="Yash Patel"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-brand-muted">
                  Sends a luxury Valerie Jewels verification template to test mailbox delivery.
                </div>
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={testEmailSending || !testEmailRecipient}
                  className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 active:scale-95 text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 ${testEmailSending ? 'animate-spin' : ''}`} />
                  <span>{testEmailSending ? 'Connecting & Dispatching...' : 'Send Test Email Now'}</span>
                </button>
              </div>

              {/* Test Result Box */}
              {testEmailResult && (
                <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in duration-200 ${
                  testEmailResult.status === 'sent'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : testEmailResult.status === 'simulated'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center space-x-2 font-bold">
                    {testEmailResult.status === 'sent' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                    {testEmailResult.status === 'simulated' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                    {testEmailResult.status === 'failed' && <XCircle className="w-4 h-4 text-rose-600" />}
                    <span>
                      {testEmailResult.status === 'sent' && `✓ Test email successfully sent to ${testEmailRecipient}!`}
                      {testEmailResult.status === 'simulated' && `⚠️ Email rendered in simulation mode`}
                      {testEmailResult.status === 'failed' && `❌ SMTP Email Delivery Failed`}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {testEmailResult.message || testEmailResult.error || (
                      testEmailResult.status === 'sent'
                        ? 'The email was accepted by Hostinger SMTP with code 250 OK and dispatched to recipient inbox. Please check your spam/inbox folder.'
                        : 'Live SMTP credentials must be saved above before real emails can leave the server.'
                    )}
                  </p>
                  {testEmailResult.smtp_host && (
                    <div className="text-[10px] text-brand-muted font-mono pt-1">
                      Server: {testEmailResult.smtp_host}:{testEmailResult.smtp_port} | From: {testEmailResult.from_email}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-2 border-t border-brand-border/60">
              <button
                type="button"
                onClick={() => setSmtpModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-brand-border text-xs font-semibold text-brand-tertiary hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Visual Assurance Modal */}
      <ProductAssuranceModal
        isOpen={Boolean(assuranceItem)}
        item={assuranceItem}
        onClose={() => setAssuranceItem(null)}
      />
    </div>
  );
}
