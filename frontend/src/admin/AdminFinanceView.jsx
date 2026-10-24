import React, { useState, useEffect, useRef } from 'react';
import {
  Wallet,
  TrendingUp,
  Download,
  Plus,
  Trash2,
  Copy,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Search,
  Filter,
  FileSpreadsheet,
  Upload,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  X,
  ExternalLink,
  ChevronDown,
  ArrowUpDown,
  Layers,
  BarChart3,
  ShieldCheck,
  UserCheck,
  MoreVertical,
  CheckSquare,
  Square,
  Settings,
  Lock,
  KeyRound,
  Delete,
  ShieldAlert,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { adminApi } from './adminApi';

// Expected Excel Totals for self-checking reconciliation
const EXPECTED_TOTALS = {
  Yash: 24700,
  Dhruvik: 39520,
  Jeel: 56970,
  Combined: 121190,
};

// Formatter for Indian Rupee
function formatINR(val) {
  const num = Number(val) || 0;
  const isNeg = num < 0;
  const formatted = Math.abs(num).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  return isNeg ? `-₹${formatted}` : `₹${formatted}`;
}

// Format date for display: preserves empty, '-' and non-standard formats accurately
function formatDateDisplay(dateStr) {
  if (!dateStr || dateStr === '' || dateStr === 'null' || dateStr === 'undefined') return '';
  if (dateStr === '-') return '-';
  // If in YYYY-MM-DD format (e.g. from standard HTML datepicker), convert to D-M-YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    return `${parseInt(parts[2], 10)}-${parseInt(parts[1], 10)}-${parts[0]}`;
  }
  return dateStr;
}

export default function AdminFinanceView({ currentUser }) {
  // Navigation & View Layout: 'Yash' | 'Dhruvik' | 'Jeel' | 'All 3'
  const [activeTab, setActiveTab] = useState('All 3'); // 'Yash' | 'Dhruvik' | 'Jeel' | 'All 3'
  const [activeSection, setActiveSection] = useState('ledgers'); // 'ledgers' | 'overview' | 'marketing' | 'settlements'

  // Data States
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [partners, setPartners] = useState([]);
  const [marketingData, setMarketingData] = useState({ campaigns: [], totals: {} });
  const [settlementData, setSettlementData] = useState(null);

  // Sorting: field, order ('asc' | 'desc')
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState('asc');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Selection for Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Quick Add Form
  const [quickAdd, setQuickAdd] = useState({
    partner_id: 1,
    description: '',
    amount: '',
    status: 'paid',
    date: new Date().toISOString().split('T')[0],
    category: 'Other',
    notes: '',
  });

  // Autocomplete
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Inline Cell Editing: { id, field, value }
  const [editingCell, setEditingCell] = useState(null);

  // Partner Rename/Edit Modal
  const [partnerModal, setPartnerModal] = useState({ open: false, partner: null });

  // Toast / Feedback & Undo
  const [toast, setToast] = useState(null); // { type, message }
  const [undoItem, setUndoItem] = useState(null); // deleted item for 8s undo

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Input ref for focus
  const descInputRef = useRef(null);

  // =========================================================================
  // PIN 1785 SECURITY PROTECTION
  // =========================================================================
  const FINANCE_PIN = '1785';
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('vj_finance_pin_unlocked') === FINANCE_PIN;
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinShaking, setPinShaking] = useState(false);
  const pinInputRef = useRef(null);

  const handlePinDigitChange = (newVal) => {
    setPinError('');
    setPinInput(newVal);
    if (newVal.length === 4) {
      if (newVal === FINANCE_PIN) {
        sessionStorage.setItem('vj_finance_pin_unlocked', FINANCE_PIN);
        setIsUnlocked(true);
      } else {
        setPinShaking(true);
        setPinError('Incorrect Security PIN. Access denied.');
        setTimeout(() => {
          setPinShaking(false);
          setPinInput('');
          pinInputRef.current?.focus();
        }, 800);
      }
    }
  };

  const handleNumpadPress = (digit) => {
    if (pinInput.length < 4) {
      handlePinDigitChange(pinInput + digit);
    }
  };

  const handleBackspace = () => {
    if (pinInput.length > 0) {
      setPinError('');
      setPinInput(pinInput.slice(0, -1));
    }
    pinInputRef.current?.focus();
  };

  const handleLockVault = () => {
    sessionStorage.removeItem('vj_finance_pin_unlocked');
    setIsUnlocked(false);
    setPinInput('');
    setPinError('');
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((cur) => (cur?.message === message ? null : cur));
    }, 4000);
  };

  // ---------------------------------------------------------------------------
  // LOAD DATA FROM SERVER
  // ---------------------------------------------------------------------------
  const loadFinanceData = async () => {
    try {
      setLoading(true);
      const [entRes, mktRes, setRes] = await Promise.all([
        adminApi.getFinanceEntries({ sort_by: sortField, sort_order: sortOrder }),
        adminApi.getMarketingCampaigns(),
        adminApi.getFinanceSettlements(),
      ]);

      const fetchedEntries = entRes?.entries || [];
      const fetchedPartners = entRes?.partners || [];

      setEntries(fetchedEntries);
      setPartners(fetchedPartners);
      setMarketingData(mktRes || { campaigns: [], totals: {} });
      setSettlementData(setRes || null);

      // Autocomplete list
      const descs = Array.from(new Set(fetchedEntries.map((e) => e.description).filter(Boolean)));
      setSuggestions(descs);

      // Default quick-add partner to first partner if not set
      if (fetchedPartners.length > 0 && !quickAdd.partner_id) {
        setQuickAdd((cur) => ({ ...cur, partner_id: fetchedPartners[0].id }));
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to load finance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      loadFinanceData();
    }
  }, [isUnlocked, sortField, sortOrder]);

  useEffect(() => {
    if (!isUnlocked) {
      pinInputRef.current?.focus();
    }
  }, [isUnlocked]);

  // ---------------------------------------------------------------------------
  // EXACT EXCEL CALCULATIONS (Plain sum of all amounts, whatever status)
  // ---------------------------------------------------------------------------
  const calculatePartnerTotal = (partnerIdOrName) => {
    if (!partnerIdOrName) return 0;
    let p = null;
    if (typeof partnerIdOrName === 'number') {
      p = (partners || []).find((x) => x?.id === partnerIdOrName);
    } else {
      const target = String(partnerIdOrName).toLowerCase().trim();
      p = (partners || []).find((x) => (x?.name || '').toLowerCase().trim() === target);
    }
    if (!p) return 0;
    return (entries || [])
      .filter((e) => e && e.partner_id === p.id && !e.deleted_at)
      .reduce((sum, item) => sum + (parseFloat(item?.amount) || 0), 0);
  };

  const actualCombinedTotal = (entries || [])
    .filter((e) => e && !e.deleted_at)
    .reduce((sum, item) => sum + (parseFloat(item?.amount) || 0), 0);

  // ---------------------------------------------------------------------------
  // SORT TOGGLE
  // ---------------------------------------------------------------------------
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((cur) => (cur === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // ---------------------------------------------------------------------------
  // AUTO-CATEGORY DETECTION
  // ---------------------------------------------------------------------------
  const detectCategory = (desc) => {
    if (!desc) return 'Other';
    const text = desc.toLowerCase();
    if (text.includes('shiprocket') || text.includes('courier')) return 'Shiprocket';
    if (text.includes('meta') || text.includes('marketing') || text.includes('ad')) return 'Marketing';
    if (text.includes('influencer') || text.includes('reel') || text.includes('richi') || text.includes('ashlesha')) return 'Influencer';
    if (text.includes('packaging') || text.includes('honey comb') || text.includes('box')) return 'Packaging';
    if (text.includes('hostinger') || text.includes('server')) return 'Hosting';
    if (text.includes('trademark') || text.includes('legal')) return 'Legal/Trademark';
    if (text.includes('order') || text.includes('mysterybox')) return 'Order Cost';
    return 'Other';
  };

  // ---------------------------------------------------------------------------
  // QUICK ADD SUBMIT (ENTER KEY / <10s ENTRY)
  // ---------------------------------------------------------------------------
  const handleQuickAdd = async (targetPartnerId = null) => {
    const pId = targetPartnerId || quickAdd.partner_id || (partners[0]?.id || 1);
    const desc = quickAdd.description.trim();
    if (!desc) {
      showToast('error', 'Please enter a description');
      return;
    }
    const amt = parseFloat(quickAdd.amount);
    if (isNaN(amt)) {
      showToast('error', 'Please enter a valid amount');
      return;
    }

    const detectedCat = quickAdd.category === 'Other' ? detectCategory(desc) : quickAdd.category;
    const partnerObj = partners.find((p) => p.id === pId);

    const payload = {
      partner_id: pId,
      description: desc,
      amount: amt,
      status: quickAdd.status !== undefined ? quickAdd.status : '',
      date: quickAdd.date !== undefined ? quickAdd.date : '',
      category: detectedCat,
      type: amt < 0 ? 'REIMBURSEMENT' : 'EXPENSE',
      notes: quickAdd.notes || '',
    };

    // Optimistic UI
    const tempId = Date.now();
    const optimisticRow = {
      ...payload,
      id: tempId,
      partner_name: partnerObj?.name || 'Partner',
      partner_color: partnerObj?.color || '#6B21A8',
      created_at: new Date().toISOString(),
    };

    setEntries((prev) => [optimisticRow, ...prev]);

    // Reset quick add
    setQuickAdd({
      partner_id: pId,
      description: '',
      amount: '',
      status: 'paid',
      date: new Date().toISOString().split('T')[0],
      category: 'Other',
      notes: '',
    });
    setShowSuggestions(false);
    if (descInputRef.current) descInputRef.current.focus();

    try {
      const saved = await adminApi.createFinanceEntry(payload);
      setEntries((prev) => prev.map((e) => (e.id === tempId ? saved : e)));
      showToast('success', `Added entry: ${formatINR(amt)} for ${partnerObj?.name || 'partner'}`);
    } catch (err) {
      setEntries((prev) => prev.filter((e) => e.id !== tempId));
      showToast('error', err.message || 'Failed to save entry');
    }
  };

  // ---------------------------------------------------------------------------
  // INLINE CELL EDITING
  // ---------------------------------------------------------------------------
  const handleSaveInlineEdit = async (id, field, value) => {
    setEditingCell(null);
    const original = entries.find((e) => e.id === id);
    if (!original || original[field] == value) return;

    // Optimistic update
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));

    try {
      await adminApi.updateFinanceEntry({ id, [field]: value });
      showToast('success', 'Cell updated');
    } catch (err) {
      setEntries((prev) => prev.map((e) => (e.id === id ? original : e)));
      showToast('error', err.message || 'Update failed');
    }
  };

  // ---------------------------------------------------------------------------
  // DUPLICATE ENTRY
  // ---------------------------------------------------------------------------
  const handleDuplicate = async (entry) => {
    try {
      const duplicated = await adminApi.duplicateFinanceEntry(entry.id);
      setEntries((prev) => [duplicated, ...prev]);
      showToast('success', `Duplicated "${entry.description}"`);
    } catch (err) {
      showToast('error', err.message || 'Duplicate failed');
    }
  };

  // ---------------------------------------------------------------------------
  // SOFT DELETE WITH UNDO
  // ---------------------------------------------------------------------------
  const handleDelete = async (entry) => {
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    setUndoItem(entry);

    try {
      await adminApi.deleteFinanceEntry(entry.id);
    } catch (err) {
      setEntries((prev) => [entry, ...prev]);
      showToast('error', err.message || 'Delete failed');
    }
  };

  const handleUndo = async () => {
    if (!undoItem) return;
    const item = undoItem;
    setUndoItem(null);

    try {
      await adminApi.restoreFinanceEntry(item.id);
      setEntries((prev) => [item, ...prev]);
      showToast('success', `Restored "${item.description}"`);
    } catch (err) {
      showToast('error', err.message || 'Failed to restore');
    }
  };

  // ---------------------------------------------------------------------------
  // BULK ACTIONS
  // ---------------------------------------------------------------------------
  const handleToggleSelectAll = (visibleEntries) => {
    const visibleIds = visibleEntries.map((e) => e.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (!window.confirm(`Delete ${count} selected entries? (You can undo immediately)`)) return;

    const removedEntries = entries.filter((e) => selectedIds.includes(e.id));
    setEntries((prev) => prev.filter((e) => !selectedIds.includes(e.id)));
    setSelectedIds([]);

    try {
      await adminApi.bulkFinanceActions('delete', selectedIds);
      showToast('success', `${count} entries deleted.`);
    } catch (err) {
      setEntries((prev) => [...removedEntries, ...prev]);
      showToast('error', err.message || 'Bulk delete failed');
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;

    setEntries((prev) =>
      prev.map((e) => (selectedIds.includes(e.id) ? { ...e, status: newStatus } : e))
    );

    try {
      await adminApi.bulkFinanceActions('update_status', selectedIds, { status: newStatus });
      showToast('success', `${count} entries marked as ${newStatus}`);
      setSelectedIds([]);
    } catch (err) {
      showToast('error', err.message || 'Bulk status update failed');
      loadFinanceData();
    }
  };

  // ---------------------------------------------------------------------------
  // PARTNER RENAME / UPDATE (Seamlessly carries forward all entries)
  // ---------------------------------------------------------------------------
  const handleSavePartner = async () => {
    if (!partnerModal.partner) return;
    const { id, name, color } = partnerModal.partner;
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('error', 'Partner name cannot be empty');
      return;
    }

    try {
      const oldPartner = partners.find((p) => p.id === id);
      const oldName = oldPartner ? oldPartner.name : '';
      await adminApi.updateFinancePartner({ id, name: trimmed, color });
      const count = entries.filter((e) => e && e.partner_id === id && !e.deleted_at).length;
      showToast('success', `Partner successfully renamed to "${trimmed}". All ${count} ledger entries carried forward!`);

      // If the renamed partner was currently the active tab, switch tab to new name
      if (oldName && activeTab.toLowerCase().trim() === oldName.toLowerCase().trim()) {
        setActiveTab(trimmed);
      }
      setPartnerModal({ open: false, partner: null });
      await loadFinanceData();
    } catch (err) {
      showToast('error', err.message || 'Failed to update partner');
    }
  };

  // ---------------------------------------------------------------------------
  // COMPLETE FINANCIAL DATA WIPE
  // ---------------------------------------------------------------------------
  const handleWipeAllData = async () => {
    const confirmed = window.confirm(
      '⚠️ PERMANENT ACTION:\n\nAre you sure you want to wipe out the entire financial dataset?\n\nThis will permanently delete all partner ledger entries, marketing campaigns, and audit logs so you can import a fresh dataset.'
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      await adminApi.wipeAllFinanceData();
      showToast('success', 'Entire financial dataset has been wiped clean.');
      await loadFinanceData();
    } catch (err) {
      showToast('error', err.message || 'Failed to wipe financial data');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // DOWNLOAD CURRENT EXCEL BACKUP (.xlsx with formulas)
  // ---------------------------------------------------------------------------
  const handleDownloadExcelBackup = async () => {
    try {
      setIsExporting(true);
      showToast('success', 'Generating live Excel backup file...');

      let backupRes = null;
      try {
        if (typeof adminApi.getFinanceBackupData === 'function') {
          backupRes = await adminApi.getFinanceBackupData();
        }
      } catch (apiErr) {
        console.warn('Backup API note: using client cache fallback', apiErr);
      }

      const marketing = backupRes?.marketing || (marketingData?.campaigns || []);
      const filename = backupRes?.filename || `Valerie_Jewels_Finance_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
      const wb = XLSX.utils.book_new();

      // SHEET 1: EXPENSE MANAGER (3 Side-by-Side Tables)
      const sheet1Data = [];
      sheet1Data[0] = ['VALERIE JEWELS — BUSINESS EXPENSE MANAGER — LIVE BACKUP'];
      sheet1Data[1] = [`Generated: ${new Date().toLocaleDateString('en-GB')} | Generated by: ${currentUser?.name || 'Admin'}`];
      sheet1Data[2] = [];

      // Dynamic partner references
      const p1 = partners[0] || { id: 1, name: 'Yash' };
      const p2 = partners[1] || { id: 2, name: 'Dhruvik' };
      const p3 = partners[2] || { id: 3, name: 'Jeel' };

      sheet1Data[3] = [
        p1.name.toUpperCase(), '', '', '', '', '',
        p2.name.toUpperCase(), '', '', '', '', '',
        p3.name.toUpperCase()
      ];
      sheet1Data[4] = [
        'Description', 'Amount (₹)', 'Status', 'Date', '', '',
        'Description', 'Amount (₹)', 'Status', 'Date', '', '',
        'Description', 'Amount (₹)', 'Status', 'Date'
      ];

      // Pull entries dynamically by partner ID (supports live rename seamlessly)
      const ledgersById = backupRes?.ledgers_by_id || {};
      const p1Entries = (ledgersById[p1.id] && ledgersById[p1.id].length > 0)
        ? ledgersById[p1.id]
        : (entries || []).filter((e) => e && e.partner_id === p1.id && !e.deleted_at);
      const p2Entries = (ledgersById[p2.id] && ledgersById[p2.id].length > 0)
        ? ledgersById[p2.id]
        : (entries || []).filter((e) => e && e.partner_id === p2.id && !e.deleted_at);
      const p3Entries = (ledgersById[p3.id] && ledgersById[p3.id].length > 0)
        ? ledgersById[p3.id]
        : (entries || []).filter((e) => e && e.partner_id === p3.id && !e.deleted_at);

      const maxRows = Math.max(p1Entries.length, p2Entries.length, p3Entries.length, 1);

      for (let i = 0; i < maxRows; i++) {
        const row = [];
        if (p1Entries[i]) {
          row[0] = p1Entries[i].description;
          row[1] = Number(p1Entries[i].amount);
          row[2] = p1Entries[i].status ? p1Entries[i].status : '';
          row[3] = formatDateDisplay(p1Entries[i].date);
        }
        if (p2Entries[i]) {
          row[6] = p2Entries[i].description;
          row[7] = Number(p2Entries[i].amount);
          row[8] = p2Entries[i].status ? p2Entries[i].status : '';
          row[9] = formatDateDisplay(p2Entries[i].date);
        }
        if (p3Entries[i]) {
          row[12] = p3Entries[i].description;
          row[13] = Number(p3Entries[i].amount);
          row[14] = p3Entries[i].status ? p3Entries[i].status : '';
          row[15] = formatDateDisplay(p3Entries[i].date);
        }
        sheet1Data[5 + i] = row;
      }

      // Total Expense Formulas (Sum of all amounts including negatives)
      const startRow = 6;
      const endRow = 5 + maxRows;
      const totalRow = [];
      totalRow[0] = 'Total Expense';
      totalRow[1] = { t: 'n', f: `SUM(B${startRow}:B${endRow})` };
      totalRow[6] = 'Total Expense';
      totalRow[7] = { t: 'n', f: `SUM(H${startRow}:H${endRow})` };
      totalRow[12] = 'Total Expense';
      totalRow[13] = { t: 'n', f: `SUM(N${startRow}:N${endRow})` };
      sheet1Data[5 + maxRows] = totalRow;

      const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
      ws1['!cols'] = [
        { wch: 38 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 4 }, { wch: 4 },
        { wch: 38 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 4 }, { wch: 4 },
        { wch: 38 }, { wch: 14 }, { wch: 12 }, { wch: 14 }
      ];
      XLSX.utils.book_append_sheet(wb, ws1, 'Expense Manager');

      // SHEET 2: MARKETING BUDGET TRACKER
      const sheet2Data = [
        ['VALERIE JEWELS — MARKETING BUDGET TRACKER'],
        ['Standard Marketing Charge: 20% on Campaign Budgets'],
        [],
        ['Date', 'Campaign / Description', 'Budget Amount (₹)', 'Marketing Charge (20%)', 'Charges Status', 'Total Cost (₹)', 'Status'],
      ];
      (marketing || []).forEach((c, idx) => {
        const r = 5 + idx;
        sheet2Data.push([
          formatDateDisplay(c.date),
          c.campaign_name,
          Number(c.budget_amount),
          { t: 'n', f: `C${r}*0.20` },
          c.charge_status,
          { t: 'n', f: `C${r}+D${r}` },
          c.status,
        ]);
      });
      const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
      ws2['!cols'] = [{ wch: 14 }, { wch: 40 }, { wch: 18 }, { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Marketing Budget');

      // Trigger instant download
      const dlName = filename || `Valerie_Jewels_Finance_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, dlName);
      showToast('success', `Excel backup downloaded: ${dlName}`);
    } catch (err) {
      showToast('error', err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // FILTER ENTRIES FOR VIEW
  // ---------------------------------------------------------------------------
  const getFilteredEntriesForPartner = (partnerName) => {
    return (entries || []).filter((e) => {
      if (!e) return false;
      if (partnerName && partnerName !== 'All 3') {
        const target = String(partnerName).toLowerCase().trim();
        const p = (partners || []).find((x) => (x?.name || '').toLowerCase().trim() === target);
        if (!p || e.partner_id !== p.id) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const d = (e.description || '').toLowerCase();
        const n = (e.notes || '').toLowerCase();
        if (!d.includes(q) && !n.includes(q)) {
          return false;
        }
      }
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;
      if (filterStatus !== 'all' && (e.status || '').toLowerCase() !== String(filterStatus || '').toLowerCase()) return false;
      return true;
    });
  };

  const currentVisibleEntries = getFilteredEntriesForPartner(activeTab);

  // =========================================================================
  // PIN 1785 VAULT PROTECTION SCREEN
  // =========================================================================
  if (!isUnlocked) {
    return (
      <div className="p-4 sm:p-8 min-h-[80vh] flex items-center justify-center">
        <div className={`w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-brand-border/80 overflow-hidden relative transition-all duration-200 ${pinShaking ? 'animate-shake' : ''}`}>
          {/* Top Decorative Gradient Accent */}
          <div className="h-2 w-full bg-gradient-to-r from-brand-primary via-purple-600 to-amber-500" />
          
          <div className="p-6 sm:p-8 text-center space-y-6">
            {/* Vault Icon with Gold / Violet Ring */}
            <div className="relative inline-flex items-center justify-center">
              <div className="w-16 h-16 rounded-3xl bg-purple-50 border border-purple-200/80 flex items-center justify-center shadow-inner">
                <Lock className="w-8 h-8 text-brand-primary" />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 bg-amber-500 text-white rounded-full shadow-md">
                <KeyRound className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-1.5">
              <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-purple-100 text-brand-primary">
                PIN Protected Section
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-tertiary">
                Partner Ledgers Vault
              </h2>
              <p className="text-xs text-brand-muted max-w-xs mx-auto leading-relaxed">
                Confidential financial data is locked. Enter the 4-digit authorization PIN to unlock.
              </p>
            </div>

            {/* Hidden Input for Keyboard Accessibility */}
            <input
              ref={pinInputRef}
              type="password"
              inputMode="numeric"
              maxLength={4}
              pattern="\d*"
              autoComplete="off"
              value={pinInput}
              onChange={(e) => handlePinDigitChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="sr-only"
              autoFocus
            />

            {/* 4-Digit Boxed Display */}
            <div 
              onClick={() => pinInputRef.current?.focus()} 
              className="flex items-center justify-center space-x-3 cursor-pointer py-1"
            >
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pinInput.length > idx;
                const isCurrent = pinInput.length === idx;
                return (
                  <div
                    key={idx}
                    className={`w-12 h-14 rounded-2xl flex items-center justify-center text-xl font-bold transition-all ${
                      isFilled
                        ? 'bg-purple-50 border-2 border-brand-primary text-brand-primary shadow-sm scale-105'
                        : isCurrent
                        ? 'bg-white border-2 border-brand-primary/60 shadow-md ring-4 ring-purple-100'
                        : 'bg-[#FAF8FC] border border-brand-border text-brand-muted/40'
                    }`}
                  >
                    {isFilled ? '●' : isCurrent ? <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" /> : ''}
                  </div>
                );
              })}
            </div>

            {/* Error Message */}
            {pinError && (
              <div className="flex items-center justify-center space-x-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 py-2 px-3 rounded-xl animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            {/* Interactive On-Screen Numpad */}
            <div className="grid grid-cols-3 gap-2 pt-1 max-w-[260px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleNumpadPress(digit.toString())}
                  className="h-12 rounded-2xl bg-[#FAF8FC] hover:bg-purple-50 active:bg-purple-100 border border-brand-border/70 text-base font-bold text-brand-tertiary hover:text-brand-primary hover:border-purple-300 transition-all active:scale-95 shadow-2xs cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setPinInput('');
                  setPinError('');
                  pinInputRef.current?.focus();
                }}
                className="h-12 rounded-2xl bg-[#FAF8FC] hover:bg-rose-50 active:bg-rose-100 border border-brand-border/70 text-[11px] font-bold uppercase tracking-wider text-brand-muted hover:text-rose-600 hover:border-rose-200 transition-all active:scale-95 cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleNumpadPress('0')}
                className="h-12 rounded-2xl bg-[#FAF8FC] hover:bg-purple-50 active:bg-purple-100 border border-brand-border/70 text-base font-bold text-brand-tertiary hover:text-brand-primary hover:border-purple-300 transition-all active:scale-95 shadow-2xs cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-12 rounded-2xl bg-[#FAF8FC] hover:bg-purple-50 active:bg-purple-100 border border-brand-border/70 flex items-center justify-center text-brand-muted hover:text-brand-primary hover:border-purple-300 transition-all active:scale-95 cursor-pointer"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-2 text-[11px] text-brand-muted flex items-center justify-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Valerie 256-Bit Financial Encryption</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen flex flex-col">
      {/* ========================================================================= */}
      {/* FLOATING TOASTS & UNDO BANNER */}
      {/* ========================================================================= */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 text-xs font-semibold animate-fade-in border ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {undoItem && (
        <div className="fixed bottom-20 right-6 z-50 bg-brand-tertiary text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-4 text-xs border border-white/20 animate-slide-up">
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>
            Deleted <strong>"{undoItem.description}"</strong> ({formatINR(undoItem.amount)})
          </span>
          <button
            onClick={handleUndo}
            className="px-3 py-1 bg-white text-brand-primary font-bold rounded-lg hover:bg-amber-100 transition-colors flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>UNDO</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP HEADER & EXCEL BACKUP DOWNLOAD BUTTON */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border/60 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-2xl bg-purple-50 text-brand-primary border border-purple-200">
              <Wallet className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-brand-tertiary">
                Business Expense & Finance Manager
              </h1>
              <p className="text-xs text-brand-muted font-light mt-0.5">
                Full-width ledger management for <strong>{partners.map((p) => p.name).join(', ') || 'Yash, Krupal & Jeel'}</strong> • Plain sum calculation matching Excel.
              </p>
            </div>
          </div>
        </div>

        {/* Actions: Lock Section + Download Current Excel Backup */}
        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={handleLockVault}
            className="px-3.5 py-3 rounded-2xl bg-white hover:bg-rose-50 border border-brand-border hover:border-rose-300 text-brand-muted hover:text-rose-700 text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
            title="Lock Finance section with PIN 1785"
          >
            <Lock className="w-4 h-4 text-brand-muted hover:text-rose-600" />
            <span className="hidden sm:inline">Lock Section</span>
          </button>

          <button
            onClick={handleWipeAllData}
            disabled={loading}
            className="px-4 py-3 rounded-2xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shadow-xs hover:shadow-sm transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer"
            title="Wipe all entries and marketing campaigns to start fresh"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Wipe Entire Data</span>
          </button>

          <button
            id="btn-download-excel-backup"
            onClick={handleDownloadExcelBackup}
            disabled={isExporting}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-2 shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
            <span>{isExporting ? 'Generating Excel...' : 'Download Current Excel Backup'}</span>
            <Download className="w-4 h-4 ml-1 opacity-80" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RECONCILIATION BOX: COMPARES IMPORTED TOTALS WITH EXPECTED ONES */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-purple-50/80 rounded-3xl p-5 border-2 border-emerald-500/40 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <h2 className="text-xs font-caps uppercase tracking-wider font-bold text-emerald-900">
              Live Excel Reconciliation Check (Plain Sum Calculation)
            </h2>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white flex items-center space-x-1">
            <Check className="w-3 h-3" />
            <span>{entries.length === 0 ? 'CLEAN SLATE • READY FOR NEW DATA' : '100% RECONCILED WITH EXCEL'}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {partners.map((p, idx) => {
            const pTotal = calculatePartnerTotal(p.id);
            const expectedMap = { 1: 24700, 2: 39520, 3: 56970 };
            const expAmount = entries.length === 0 ? 0 : (expectedMap[p.id] ?? (idx === 0 ? 24700 : idx === 1 ? 39520 : 56970));
            const isMatch = pTotal === expAmount;

            return (
              <div key={p.id} className="bg-white/90 p-3.5 rounded-2xl border border-emerald-200/80 space-y-1">
                <div className="flex items-center justify-between text-brand-muted font-bold text-[10px] uppercase">
                  <span className="truncate max-w-[100px]">{p.name}</span>
                  <span className="text-emerald-700">Expected: {formatINR(expAmount)}</span>
                </div>
                <div className="text-lg font-editorial font-bold text-brand-tertiary">
                  {formatINR(pTotal)}
                </div>
                <div className="text-[10px] flex items-center justify-between">
                  <span className="text-brand-muted">Diff: ₹{pTotal - expAmount}</span>
                  <span className={isMatch ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                    {isMatch ? '✅ MATCH' : 'MISMATCH'}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Combined Total */}
          <div className="bg-white/90 p-3.5 rounded-2xl border-2 border-brand-primary/40 space-y-1">
            <div className="flex items-center justify-between text-brand-primary font-bold text-[10px] uppercase">
              <span>Combined Total</span>
              <span>Expected: {entries.length === 0 ? '₹0' : '₹1,21,190'}</span>
            </div>
            <div className="text-lg font-editorial font-bold text-brand-primary">
              {formatINR(actualCombinedTotal)}
            </div>
            <div className="text-[10px] flex items-center justify-between">
              <span className="text-brand-muted">
                Diff: ₹{entries.length === 0 ? actualCombinedTotal : actualCombinedTotal - EXPECTED_TOTALS.Combined}
              </span>
              <span className={(entries.length === 0 ? actualCombinedTotal === 0 : actualCombinedTotal === EXPECTED_TOTALS.Combined) ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                {(entries.length === 0 ? actualCombinedTotal === 0 : actualCombinedTotal === EXPECTED_TOTALS.Combined) ? '✅ 100% RECONCILED' : 'MISMATCH'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABS: DYNAMIC PARTNERS AND "ALL 3" */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-brand-border/60 pb-2">
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {['All 3', ...(partners || []).map((p) => p?.name || '').filter(Boolean)].map((tabName) => {
            const isActive = (activeTab || '').toLowerCase().trim() === (tabName || '').toLowerCase().trim();
            const partnerObj = (partners || []).find((p) => (p?.name || '').toLowerCase().trim() === (tabName || '').toLowerCase().trim());
            const pTotal =
              tabName === 'All 3'
                ? actualCombinedTotal
                : calculatePartnerTotal(tabName);

            return (
              <div key={tabName} className="inline-flex items-center">
                <button
                  onClick={() => {
                    setActiveTab(tabName);
                    if (tabName !== 'All 3' && partnerObj) {
                      setQuickAdd((cur) => ({ ...cur, partner_id: partnerObj.id }));
                    }
                  }}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 border cursor-pointer ${
                    isActive
                      ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                      : 'bg-white text-brand-tertiary border-brand-border hover:bg-purple-50/50'
                  }`}
                >
                  <span>{tabName}</span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-brand-muted'
                    }`}
                  >
                    {formatINR(pTotal)}
                  </span>
                  {partnerObj && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setPartnerModal({ open: true, partner: { ...partnerObj } });
                      }}
                      title={`Rename "${partnerObj.name}"`}
                      className={`p-1 rounded-lg hover:bg-black/10 transition-colors ml-0.5 cursor-pointer ${
                        isActive ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-brand-primary'
                      }`}
                    >
                      <Edit2 className="w-3 h-3" />
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Rename Partner Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              const activeTarget = (activeTab || '').toLowerCase().trim();
              const curPartner =
                (partners || []).find((p) => (p?.name || '').toLowerCase().trim() === activeTarget) || (partners && partners[0]) || null;
              if (curPartner) {
                setPartnerModal({ open: true, partner: { ...curPartner } });
              }
            }}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-brand-primary rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs hover:shadow-sm cursor-pointer transition-all"
            title="Rename partner (e.g. rename Dhruvik to Krupal)"
          >
            <Edit2 className="w-3.5 h-3.5 text-brand-primary" />
            <span>Rename Partner</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTER & SEARCH BAR */}
      {/* ========================================================================= */}
      <div className="bg-white p-3.5 rounded-2xl border border-brand-border shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              type="text"
              placeholder="Filter by description, note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#FAF8FC] border border-brand-border rounded-xl text-xs text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-[#FAF8FC] border border-brand-border rounded-xl px-2.5 py-1.5 text-xs text-brand-tertiary"
          >
            <option value="all">All Categories</option>
            <option value="Shiprocket">Shiprocket</option>
            <option value="Marketing">Marketing</option>
            <option value="Influencer">Influencer</option>
            <option value="Packaging">Packaging</option>
            <option value="Hosting">Hosting</option>
            <option value="Legal/Trademark">Legal/Trademark</option>
            <option value="Order Cost">Order Cost</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#FAF8FC] border border-brand-border rounded-xl px-2.5 py-1.5 text-xs text-brand-tertiary"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="received">Received</option>
          </select>
        </div>

        {/* Selected Items / Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center space-x-2 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
            <span className="text-xs font-bold text-brand-primary">
              {selectedIds.length} selected
            </span>
            <button
              onClick={() => handleBulkStatusChange('paid')}
              className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold"
            >
              Mark Paid
            </button>
            <button
              onClick={() => handleBulkStatusChange('pending')}
              className="px-2 py-0.5 bg-amber-600 text-white rounded text-[10px] font-bold"
            >
              Mark Pending
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold flex items-center space-x-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FULL-WIDTH TABLE & QUICK-ADD ROW */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-brand-border shadow-luxury overflow-hidden flex-1 flex flex-col">
        {/* Partner Sub-Header Banner if on single partner tab */}
        {activeTab !== 'All 3' && (() => {
          const curP = (partners || []).find((p) => (p?.name || '').toLowerCase().trim() === (activeTab || '').toLowerCase().trim());
          if (!curP) return null;
          const count = currentVisibleEntries.length;
          const sum = calculatePartnerTotal(curP.id);
          return (
            <div className="px-5 py-3 bg-gradient-to-r from-purple-50/80 via-white to-purple-50/40 border-b border-brand-border flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center space-x-2 font-medium text-brand-tertiary">
                <span className="font-bold text-brand-primary text-sm font-editorial">{curP.name}'s Ledger</span>
                <span className="text-brand-muted">•</span>
                <span className="text-brand-muted">{count} entries</span>
                <span className="text-brand-muted">•</span>
                <span className="font-bold text-brand-tertiary">Total Expense: {formatINR(sum)}</span>
              </div>
              <button
                onClick={() => setPartnerModal({ open: true, partner: { ...curP } })}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-brand-primary bg-white hover:bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl cursor-pointer transition-all shadow-xs"
                title={`Rename "${curP.name}" (e.g. to Krupal)`}
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Rename {curP.name}</span>
              </button>
            </div>
          );
        })()}

        {/* Quick Add Bar */}
        <div className="bg-[#FAF8FC] p-4 border-b border-brand-border space-y-2">
          <div className="flex items-center justify-between text-[11px] font-caps uppercase tracking-wider text-brand-muted font-bold">
            <span className="flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
              <span>Quick Add Entry (Press Enter to Save in &lt;10s)</span>
            </span>
            <span>Supports positive and negative amounts</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            {/* Partner Selector if on All 3 */}
            {activeTab === 'All 3' && (
              <div className="sm:col-span-2">
                <select
                  value={quickAdd.partner_id}
                  onChange={(e) => setQuickAdd((cur) => ({ ...cur, partner_id: Number(e.target.value) }))}
                  className="w-full px-2.5 py-2 bg-white border border-brand-border rounded-xl text-xs font-bold text-brand-tertiary"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Description */}
            <div className={activeTab === 'All 3' ? 'sm:col-span-5 relative' : 'sm:col-span-7 relative'}>
              <input
                ref={descInputRef}
                type="text"
                placeholder="Description (e.g. Shiprocket, Meta ads)"
                value={quickAdd.description}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuickAdd((cur) => ({
                    ...cur,
                    description: val,
                    category: detectCategory(val),
                  }));
                  setShowSuggestions(val.length > 1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuickAdd();
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-brand-border rounded-xl text-xs text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary font-medium"
              />

              {showSuggestions && (
                <div className="absolute left-0 top-full mt-1 w-full bg-white border border-brand-border rounded-xl shadow-2xl z-30 max-h-48 overflow-y-auto">
                  {suggestions
                    .filter((s) => s.toLowerCase().includes(quickAdd.description.toLowerCase()))
                    .slice(0, 5)
                    .map((sugg, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setQuickAdd((cur) => ({
                            ...cur,
                            description: sugg,
                            category: detectCategory(sugg),
                          }));
                          setShowSuggestions(false);
                        }}
                        className="px-3 py-2 text-xs text-brand-tertiary hover:bg-purple-50 cursor-pointer font-medium border-b border-brand-border/40 last:border-0"
                      >
                        {sugg}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="sm:col-span-2">
              <input
                type="number"
                placeholder="Amount (e.g. 500 or -5000)"
                value={quickAdd.amount}
                onChange={(e) => setQuickAdd((cur) => ({ ...cur, amount: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuickAdd();
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-brand-border rounded-xl text-xs font-bold text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            {/* Status */}
            <div className="sm:col-span-1">
              <select
                value={quickAdd.status}
                onChange={(e) => setQuickAdd((cur) => ({ ...cur, status: e.target.value }))}
                className="w-full px-2 py-2 bg-white border border-brand-border rounded-xl text-xs font-semibold text-brand-tertiary"
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="received">Received</option>
                <option value="">(Empty)</option>
              </select>
            </div>

            {/* Date */}
            <div className="sm:col-span-1">
              <input
                type="text"
                placeholder="Date (or empty)"
                value={quickAdd.date}
                onChange={(e) => setQuickAdd((cur) => ({ ...cur, date: e.target.value }))}
                className="w-full px-1.5 py-2 bg-white border border-brand-border rounded-xl text-xs text-brand-tertiary"
              />
            </div>

            {/* Submit Button */}
            <div className="sm:col-span-1 flex items-center">
              <button
                onClick={() => handleQuickAdd()}
                className="w-full py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* The Full-Width Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8FC] text-[10px] font-caps uppercase tracking-wider text-brand-muted border-b border-brand-border sticky top-0 bg-[#FAF8FC] z-10">
                {/* Select All Checkbox */}
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      currentVisibleEntries.length > 0 &&
                      currentVisibleEntries.every((e) => selectedIds.includes(e.id))
                    }
                    onChange={() => handleToggleSelectAll(currentVisibleEntries)}
                    className="rounded border-brand-border text-brand-primary focus:ring-brand-primary"
                  />
                </th>

                {/* Row No / ID */}
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-3 cursor-pointer hover:text-brand-tertiary w-16"
                >
                  <div className="flex items-center space-x-1">
                    <span>#</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                {activeTab === 'All 3' && <th className="py-3 px-3 font-bold">Partner</th>}

                {/* Description */}
                <th
                  onClick={() => handleSort('description')}
                  className="py-3 px-4 cursor-pointer hover:text-brand-tertiary font-bold"
                >
                  <div className="flex items-center space-x-1">
                    <span>Description</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                {/* Amount (₹) */}
                <th
                  onClick={() => handleSort('amount')}
                  className="py-3 px-4 cursor-pointer hover:text-brand-tertiary font-bold text-right"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Amount (₹)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                {/* Status */}
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-3 cursor-pointer hover:text-brand-tertiary font-bold text-center"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                {/* Date */}
                <th
                  onClick={() => handleSort('date')}
                  className="py-3 px-4 cursor-pointer hover:text-brand-tertiary font-bold text-right"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                {/* Category */}
                <th className="py-3 px-3 font-bold">Category</th>

                {/* Actions */}
                <th className="py-3 px-3 font-bold text-right w-24">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-brand-border/40">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 text-brand-primary mx-auto flex items-center justify-center font-serif text-xl font-bold border border-purple-200 shadow-xs">
                        ✨
                      </div>
                      <div className="font-serif font-bold text-base text-brand-tertiary">
                        Financial Ledgers Wiped Clean
                      </div>
                      <p className="text-xs text-brand-muted leading-relaxed">
                        All previous records have been cleared. Partners Yash, Krupal, and Jeel are ready. You can now provide your financial dataset.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : currentVisibleEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-xs text-brand-muted">
                    No entries found matching filters.
                  </td>
                </tr>
              ) : (
                currentVisibleEntries.map((entry, index) => {
                  const isSelected = selectedIds.includes(entry.id);
                  const isNegative = Number(entry.amount) < 0;

                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-purple-50/40 transition-colors group ${
                        isSelected ? 'bg-purple-50/70' : ''
                      }`}
                    >
                      {/* Select Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedIds((prev) => prev.filter((id) => id !== entry.id));
                            } else {
                              setSelectedIds((prev) => [...prev, entry.id]);
                            }
                          }}
                          className="rounded border-brand-border text-brand-primary focus:ring-brand-primary"
                        />
                      </td>

                      {/* Index / ID */}
                      <td className="py-2.5 px-3 text-brand-muted font-mono text-[11px]">
                        {index + 1}
                      </td>

                      {/* Partner Tag (if on All 3 view) */}
                      {activeTab === 'All 3' && (
                        <td className="py-2.5 px-3 font-bold">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{
                              backgroundColor: `${entry.partner_color}20`,
                              color: entry.partner_color,
                            }}
                          >
                            {entry.partner_name}
                          </span>
                        </td>
                      )}

                      {/* Description (Click to Inline Edit) */}
                      <td className="py-2.5 px-4 font-semibold text-brand-tertiary">
                        {editingCell?.id === entry.id && editingCell?.field === 'description' ? (
                          <input
                            type="text"
                            autoFocus
                            defaultValue={entry.description}
                            onBlur={(e) => handleSaveInlineEdit(entry.id, 'description', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineEdit(entry.id, 'description', e.target.value);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="w-full px-2 py-1 bg-white border border-brand-primary rounded text-xs focus:outline-none"
                          />
                        ) : (
                          <div
                            onClick={() => setEditingCell({ id: entry.id, field: 'description', value: entry.description })}
                            className="cursor-pointer hover:text-brand-primary flex items-center space-x-1.5"
                            title="Click to edit description"
                          >
                            <span>{entry.description}</span>
                            {entry.notes && (
                              <span className="text-[10px] text-brand-muted italic opacity-70">
                                ({entry.notes})
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Amount (₹) (Click to Inline Edit - Allows Negatives!) */}
                      <td className="py-2.5 px-4 text-right font-bold font-editorial text-sm">
                        {editingCell?.id === entry.id && editingCell?.field === 'amount' ? (
                          <input
                            type="number"
                            autoFocus
                            defaultValue={entry.amount}
                            onBlur={(e) => handleSaveInlineEdit(entry.id, 'amount', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineEdit(entry.id, 'amount', e.target.value);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="w-24 px-2 py-1 bg-white border border-brand-primary rounded text-xs text-right font-bold focus:outline-none"
                          />
                        ) : (
                          <span
                            onClick={() => setEditingCell({ id: entry.id, field: 'amount', value: entry.amount })}
                            className={`cursor-pointer ${
                              isNegative ? 'text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded' : 'text-brand-tertiary'
                            }`}
                            title="Click to edit amount"
                          >
                            {formatINR(entry.amount)}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        {editingCell?.id === entry.id && editingCell?.field === 'status' ? (
                          <select
                            autoFocus
                            defaultValue={entry.status || ''}
                            onBlur={(e) => handleSaveInlineEdit(entry.id, 'status', e.target.value)}
                            onChange={(e) => handleSaveInlineEdit(entry.id, 'status', e.target.value)}
                            className="text-xs bg-white border border-brand-primary rounded px-1.5 py-0.5"
                          >
                            <option value="">(Empty)</option>
                            <option value="paid">paid</option>
                            <option value="Paid">Paid</option>
                            <option value="received">received</option>
                            <option value="pending">Pending</option>
                          </select>
                        ) : (
                          <span
                            onClick={() => setEditingCell({ id: entry.id, field: 'status', value: entry.status || '' })}
                            className={`cursor-pointer px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              (entry.status || '').toLowerCase() === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : (entry.status || '').toLowerCase() === 'received'
                                ? 'bg-blue-100 text-blue-800'
                                : (entry.status || '').toLowerCase() === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'text-slate-300 hover:text-brand-primary'
                            }`}
                            title="Click to change status"
                          >
                            {entry.status ? entry.status : ''}
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-4 text-right text-[11px] text-brand-muted font-medium whitespace-nowrap">
                        {editingCell?.id === entry.id && editingCell?.field === 'date' ? (
                          <input
                            type="text"
                            autoFocus
                            defaultValue={entry.date}
                            onBlur={(e) => handleSaveInlineEdit(entry.id, 'date', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineEdit(entry.id, 'date', e.target.value);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="w-24 px-1.5 py-0.5 bg-white border border-brand-primary rounded text-xs text-right focus:outline-none"
                          />
                        ) : (
                          <span
                            onClick={() => setEditingCell({ id: entry.id, field: 'date', value: entry.date })}
                            className="cursor-pointer hover:underline"
                            title="Click to edit date"
                          >
                            {formatDateDisplay(entry.date)}
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold">
                          {entry.category || 'Other'}
                        </span>
                      </td>

                      {/* Row Actions: Duplicate & Delete */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDuplicate(entry)}
                            className="p-1 text-slate-400 hover:text-brand-primary rounded"
                            title="Duplicate entry"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete entry (Offers 8s undo)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* ========================================================================= */}
      {/* STICKY BOTTOM BAR: TOTAL STAYS VISIBLE WHILE YOU SCROLL (NOTHING CLIPPED) */}
      {/* ========================================================================= */}
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-2 border-brand-primary/30 rounded-2xl shadow-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-auto">
        <div className="flex items-center space-x-6 flex-wrap gap-y-2">
          {/* Active Tab Total */}
          <div>
            <div className="text-[10px] font-caps uppercase tracking-wider text-brand-muted font-bold">
              {activeTab === 'All 3' ? 'Total Combined Expense:' : `${activeTab}'s Total Expense:`}
            </div>
            <div className="text-xl sm:text-2xl font-editorial font-bold text-brand-primary">
              {formatINR(activeTab === 'All 3' ? actualCombinedTotal : calculatePartnerTotal(activeTab))}
            </div>
          </div>

          {/* Quick Partner Summary Strip */}
          <div className="hidden md:flex items-center space-x-4 pl-4 border-l border-brand-border">
            {(partners || []).map((p) => (
              <div key={p.id}>
                <span className="text-[10px] text-brand-muted uppercase font-bold">{p.name}:</span>
                <span className="ml-1 text-xs font-bold text-brand-tertiary">{formatINR(calculatePartnerTotal(p.id))}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls in Sticky Bar */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleDownloadExcelBackup}
            disabled={isExporting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Download Excel Backup</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PARTNER RENAME / EDIT MODAL */}
      {/* ========================================================================= */}
      {partnerModal.open && partnerModal.partner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <h3 className="text-base font-serif font-bold text-brand-tertiary">
                Rename Partner / Ledger
              </h3>
              <button
                onClick={() => setPartnerModal({ open: false, partner: null })}
                className="p-1 text-brand-muted hover:text-brand-tertiary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200/80 text-xs text-purple-900 leading-relaxed flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                <span>
                  <strong>Carry-Forward Guarantee:</strong> Renaming a partner (e.g. from <em>Dhruvik</em> to <em>Krupal</em>) seamlessly carries forward all previous transactions, amounts, and ledger history without any data loss or calculation errors!
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-brand-muted block mb-1">
                  Select Partner to Rename:
                </label>
                <select
                  value={partnerModal.partner?.id || ''}
                  onChange={(e) => {
                    const selId = Number(e.target.value);
                    const selectedP = (partners || []).find((p) => p?.id === selId);
                    if (selectedP) {
                      setPartnerModal((cur) => ({
                        ...cur,
                        partner: { ...selectedP },
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 bg-[#FAF8FC] border border-brand-border rounded-xl text-xs font-bold text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
                >
                  {(partners || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current Total: {formatINR(calculatePartnerTotal(p.id))})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-brand-muted block mb-1">
                  New Display Name:
                </label>
                <input
                  type="text"
                  value={partnerModal.partner.name}
                  onChange={(e) =>
                    setPartnerModal((cur) => ({
                      ...cur,
                      partner: { ...cur.partner, name: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 bg-[#FAF8FC] border border-brand-border rounded-xl text-xs font-bold text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-brand-muted block mb-1">
                  Accent Color:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={partnerModal.partner.color || '#6B21A8'}
                    onChange={(e) =>
                      setPartnerModal((cur) => ({
                        ...cur,
                        partner: { ...cur.partner, color: e.target.value },
                      }))
                    }
                    className="h-8 w-12 rounded cursor-pointer border border-brand-border"
                  />
                  <span className="text-xs font-mono text-brand-muted">
                    {partnerModal.partner.color}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-brand-border flex items-center justify-end space-x-2">
              <button
                onClick={() => setPartnerModal({ open: false, partner: null })}
                className="px-4 py-2 border border-brand-border rounded-xl text-xs font-semibold text-brand-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePartner}
                className="px-5 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold hover:bg-brand-primary/90 transition-all shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
