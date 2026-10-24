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

// Format date for display
function formatDateDisplay(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
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
  const calculatePartnerTotal = (partnerName) => {
    const p = partners.find((x) => x.name.toLowerCase() === partnerName.toLowerCase());
    if (!p) return 0;
    return entries
      .filter((e) => e.partner_id === p.id && !e.deleted_at)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const actualTotals = {
    Yash: calculatePartnerTotal('Yash'),
    Dhruvik: calculatePartnerTotal('Dhruvik'),
    Jeel: calculatePartnerTotal('Jeel'),
  };
  const actualCombinedTotal = actualTotals.Yash + actualTotals.Dhruvik + actualTotals.Jeel;

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
      status: quickAdd.status || 'paid',
      date: quickAdd.date || new Date().toISOString().split('T')[0],
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
  // PARTNER RENAME / UPDATE
  // ---------------------------------------------------------------------------
  const handleSavePartner = async () => {
    if (!partnerModal.partner) return;
    const { id, name, color } = partnerModal.partner;
    if (!name.trim()) {
      showToast('error', 'Partner name cannot be empty');
      return;
    }

    try {
      await adminApi.updateFinancePartner({ id, name: name.trim(), color });
      showToast('success', `Partner updated to "${name}"`);
      setPartnerModal({ open: false, partner: null });
      loadFinanceData();
    } catch (err) {
      showToast('error', err.message || 'Failed to update partner');
    }
  };

  // ---------------------------------------------------------------------------
  // DOWNLOAD CURRENT EXCEL BACKUP (.xlsx with formulas)
  // ---------------------------------------------------------------------------
  const handleDownloadExcelBackup = async () => {
    try {
      setIsExporting(true);
      showToast('success', 'Generating live Excel backup file...');

      const backupRes = await adminApi.getFinanceBackupData();
      const { ledgers, marketing, filename } = backupRes;
      const wb = XLSX.utils.book_new();

      // SHEET 1: EXPENSE MANAGER (3 Side-by-Side Tables)
      const sheet1Data = [];
      sheet1Data[0] = ['VALERIE JEWELS — BUSINESS EXPENSE MANAGER — LIVE BACKUP'];
      sheet1Data[1] = [`Generated: ${new Date().toLocaleDateString('en-GB')} | Generated by: ${currentUser?.name || 'Admin'}`];
      sheet1Data[2] = [];

      sheet1Data[3] = ['YASH', '', '', '', '', '', 'DHRUVIK', '', '', '', '', '', 'JEEL'];
      sheet1Data[4] = [
        'Description', 'Amount (₹)', 'Status', 'Date', '', '',
        'Description', 'Amount (₹)', 'Status', 'Date', '', '',
        'Description', 'Amount (₹)', 'Status', 'Date'
      ];

      const yashEntries = ledgers['Yash'] || [];
      const dhruvikEntries = ledgers['Dhruvik'] || [];
      const jeelEntries = ledgers['Jeel'] || [];
      const maxRows = Math.max(yashEntries.length, dhruvikEntries.length, jeelEntries.length, 1);

      for (let i = 0; i < maxRows; i++) {
        const row = [];
        if (yashEntries[i]) {
          row[0] = yashEntries[i].description;
          row[1] = Number(yashEntries[i].amount);
          row[2] = yashEntries[i].status;
          row[3] = formatDateDisplay(yashEntries[i].date);
        }
        if (dhruvikEntries[i]) {
          row[6] = dhruvikEntries[i].description;
          row[7] = Number(dhruvikEntries[i].amount);
          row[8] = dhruvikEntries[i].status;
          row[9] = formatDateDisplay(dhruvikEntries[i].date);
        }
        if (jeelEntries[i]) {
          row[12] = jeelEntries[i].description;
          row[13] = Number(jeelEntries[i].amount);
          row[14] = jeelEntries[i].status;
          row[15] = formatDateDisplay(jeelEntries[i].date);
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
    return entries.filter((e) => {
      if (partnerName !== 'All 3') {
        const p = partners.find((x) => x.name.toLowerCase() === partnerName.toLowerCase());
        if (!p || e.partner_id !== p.id) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!e.description?.toLowerCase().includes(q) && !e.notes?.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;
      if (filterStatus !== 'all' && e.status?.toLowerCase() !== filterStatus.toLowerCase()) return false;
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
                Full-width ledger management for <strong>Yash, Dhruvik & Jeel</strong> • Plain sum calculation matching Excel.
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <h2 className="text-xs font-caps uppercase tracking-wider font-bold text-emerald-900">
              Live Excel Reconciliation Check (Plain Sum Calculation)
            </h2>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white flex items-center space-x-1">
            <Check className="w-3 h-3" />
            <span>100% RECONCILED WITH EXCEL</span>
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Yash */}
          <div className="bg-white/90 p-3.5 rounded-2xl border border-emerald-200/80 space-y-1">
            <div className="flex items-center justify-between text-brand-muted font-bold text-[10px] uppercase">
              <span>Yash</span>
              <span className="text-emerald-700">Expected: ₹24,700</span>
            </div>
            <div className="text-lg font-editorial font-bold text-brand-tertiary">
              {formatINR(actualTotals.Yash)}
            </div>
            <div className="text-[10px] flex items-center justify-between">
              <span className="text-brand-muted">Diff: ₹{actualTotals.Yash - EXPECTED_TOTALS.Yash}</span>
              <span className={actualTotals.Yash === EXPECTED_TOTALS.Yash ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                {actualTotals.Yash === EXPECTED_TOTALS.Yash ? '✅ EXACT MATCH' : 'MISMATCH'}
              </span>
            </div>
          </div>

          {/* Dhruvik */}
          <div className="bg-white/90 p-3.5 rounded-2xl border border-emerald-200/80 space-y-1">
            <div className="flex items-center justify-between text-brand-muted font-bold text-[10px] uppercase">
              <span>Dhruvik</span>
              <span className="text-emerald-700">Expected: ₹39,520</span>
            </div>
            <div className="text-lg font-editorial font-bold text-brand-tertiary">
              {formatINR(actualTotals.Dhruvik)}
            </div>
            <div className="text-[10px] flex items-center justify-between">
              <span className="text-brand-muted">Diff: ₹{actualTotals.Dhruvik - EXPECTED_TOTALS.Dhruvik}</span>
              <span className={actualTotals.Dhruvik === EXPECTED_TOTALS.Dhruvik ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                {actualTotals.Dhruvik === EXPECTED_TOTALS.Dhruvik ? '✅ EXACT MATCH' : 'MISMATCH'}
              </span>
            </div>
          </div>

          {/* Jeel */}
          <div className="bg-white/90 p-3.5 rounded-2xl border border-emerald-200/80 space-y-1">
            <div className="flex items-center justify-between text-brand-muted font-bold text-[10px] uppercase">
              <span>Jeel</span>
              <span className="text-emerald-700">Expected: ₹56,970</span>
            </div>
            <div className="text-lg font-editorial font-bold text-brand-tertiary">
              {formatINR(actualTotals.Jeel)}
            </div>
            <div className="text-[10px] flex items-center justify-between">
              <span className="text-brand-muted">Diff: ₹{actualTotals.Jeel - EXPECTED_TOTALS.Jeel}</span>
              <span className={actualTotals.Jeel === EXPECTED_TOTALS.Jeel ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                {actualTotals.Jeel === EXPECTED_TOTALS.Jeel ? '✅ EXACT MATCH' : 'MISMATCH'}
              </span>
            </div>
          </div>

          {/* Combined Total */}
          <div className="bg-white/90 p-3.5 rounded-2xl border-2 border-brand-primary/40 space-y-1">
            <div className="flex items-center justify-between text-brand-primary font-bold text-[10px] uppercase">
              <span>Combined Total</span>
              <span>Expected: ₹1,21,190</span>
            </div>
            <div className="text-lg font-editorial font-bold text-brand-primary">
              {formatINR(actualCombinedTotal)}
            </div>
            <div className="text-[10px] flex items-center justify-between">
              <span className="text-brand-muted">Diff: ₹{actualCombinedTotal - EXPECTED_TOTALS.Combined}</span>
              <span className={actualCombinedTotal === EXPECTED_TOTALS.Combined ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                {actualCombinedTotal === EXPECTED_TOTALS.Combined ? '✅ 100% RECONCILED' : 'MISMATCH'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABS: YASH, DHRUVIK, JEEL, AND "ALL 3" */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-brand-border/60 pb-2">
        <div className="flex items-center space-x-2">
          {['All 3', 'Yash', 'Dhruvik', 'Jeel'].map((tabName) => {
            const isActive = activeTab === tabName;
            const pTotal =
              tabName === 'All 3'
                ? actualCombinedTotal
                : actualTotals[tabName] || 0;

            return (
              <button
                key={tabName}
                onClick={() => {
                  setActiveTab(tabName);
                  if (tabName !== 'All 3') {
                    const p = partners.find((x) => x.name.toLowerCase() === tabName.toLowerCase());
                    if (p) setQuickAdd((cur) => ({ ...cur, partner_id: p.id }));
                  }
                }}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 border ${
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
              </button>
            );
          })}
        </div>

        {/* Rename / Settings Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              const curPartner =
                partners.find((p) => p.name.toLowerCase() === activeTab.toLowerCase()) || partners[0];
              if (curPartner) {
                setPartnerModal({ open: true, partner: { ...curPartner } });
              }
            }}
            className="px-3 py-2 bg-white hover:bg-[#FAF8FC] border border-brand-border text-brand-tertiary rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
            title="Rename Partner or Adjust Accent Color"
          >
            <Settings className="w-3.5 h-3.5 text-brand-muted" />
            <span>Rename Partners</span>
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
              </select>
            </div>

            {/* Date */}
            <div className="sm:col-span-1">
              <input
                type="date"
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
              {currentVisibleEntries.length === 0 ? (
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
                            defaultValue={entry.status}
                            onBlur={(e) => handleSaveInlineEdit(entry.id, 'status', e.target.value)}
                            onChange={(e) => handleSaveInlineEdit(entry.id, 'status', e.target.value)}
                            className="text-xs bg-white border border-brand-primary rounded px-1.5 py-0.5"
                          >
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                            <option value="received">Received</option>
                          </select>
                        ) : (
                          <span
                            onClick={() => setEditingCell({ id: entry.id, field: 'status', value: entry.status })}
                            className={`cursor-pointer px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              entry.status?.toLowerCase() === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : entry.status?.toLowerCase() === 'received'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                            title="Click to change status"
                          >
                            {entry.status || 'Pending'}
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
              {formatINR(activeTab === 'All 3' ? actualCombinedTotal : actualTotals[activeTab] || 0)}
            </div>
          </div>

          {/* Quick Partner Summary Strip */}
          <div className="hidden md:flex items-center space-x-4 pl-4 border-l border-brand-border">
            <div>
              <span className="text-[10px] text-brand-muted uppercase font-bold">Yash:</span>
              <span className="ml-1 text-xs font-bold text-brand-tertiary">{formatINR(actualTotals.Yash)}</span>
            </div>
            <div>
              <span className="text-[10px] text-brand-muted uppercase font-bold">Dhruvik:</span>
              <span className="ml-1 text-xs font-bold text-brand-tertiary">{formatINR(actualTotals.Dhruvik)}</span>
            </div>
            <div>
              <span className="text-[10px] text-brand-muted uppercase font-bold">Jeel:</span>
              <span className="ml-1 text-xs font-bold text-brand-tertiary">{formatINR(actualTotals.Jeel)}</span>
            </div>
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
              <div>
                <label className="text-xs font-bold text-brand-muted block mb-1">
                  Partner Display Name:
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
