import React, { useState, useEffect, useRef } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRightLeft,
  Share2,
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
  Layers,
  BarChart3,
  PieChart,
  ShieldCheck,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { adminApi } from './adminApi';

// Standard Indian Rupee Formatter
function formatINR(val) {
  const num = Number(val) || 0;
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

// Format Date to DD-MM-YYYY
function formatDateDisplay(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

export default function AdminFinanceView({ currentUser }) {
  // Navigation Sub-tabs: 'overview' | 'ledgers' | 'marketing' | 'settlements' | 'export' | 'import'
  const [activeSubTab, setActiveSubTab] = useState('ledgers');
  const [ledgerLayout, setLedgerLayout] = useState('side_by_side'); // 'side_by_side' | 'tabs'
  const [activePartnerId, setActivePartnerId] = useState(1); // For tabs mode
  const [selectedMonth, setSelectedMonth] = useState('all');

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState(null);
  const [entries, setEntries] = useState([]);
  const [partners, setPartners] = useState([]);
  const [marketingData, setMarketingData] = useState({ campaigns: [], totals: {} });
  const [settlementData, setSettlementData] = useState(null);

  // Quick Add State (per partner)
  const [quickAdd, setQuickAdd] = useState({
    partner_id: 1,
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'EXPENSE',
    status: 'PAID',
    category: 'Other',
    notes: '',
  });

  // Autocomplete Suggestions
  const [descriptionSuggestions, setDescriptionSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Inline Cell Editing
  const [editingCell, setEditingCell] = useState(null); // { id, field, value }

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Toast / Feedback & Undo
  const [toast, setToast] = useState(null); // { type, message }
  const [undoItem, setUndoItem] = useState(null); // { id, description, timerId }

  // Excel Paste Modal
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pastePartnerId, setPastePartnerId] = useState(1);
  const [pasteRawText, setPasteRawText] = useState('');
  const [pastePreviewRows, setPastePreviewRows] = useState([]);

  // Export Loading
  const [isExporting, setIsExporting] = useState(false);

  // Ref for quick-add input focus
  const descInputRef = useRef(null);

  // Show Toast Helper
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((cur) => (cur?.message === message ? null : cur));
    }, 4000);
  };

  // ---------------------------------------------------------------------------
  // LOAD ALL DATA
  // ---------------------------------------------------------------------------
  const loadAllFinanceData = async () => {
    try {
      setLoading(true);
      const [ovRes, entRes, mktRes, setRes] = await Promise.all([
        adminApi.getFinanceOverview(selectedMonth),
        adminApi.getFinanceEntries({ month: selectedMonth }),
        adminApi.getMarketingCampaigns(),
        adminApi.getFinanceSettlements(),
      ]);

      setOverviewData(ovRes);
      setEntries(entRes?.entries || []);
      setPartners(entRes?.partners || ovRes?.partners || []);
      setMarketingData(mktRes || { campaigns: [], totals: {} });
      setSettlementData(setRes || null);

      // Extract unique previous descriptions for autocomplete
      const prevDescs = Array.from(
        new Set((entRes?.entries || []).map((e) => e.description).filter(Boolean))
      );
      setDescriptionSuggestions(prevDescs);

      if (entRes?.partners?.length > 0 && !activePartnerId) {
        setActivePartnerId(entRes.partners[0].id);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to load finance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllFinanceData();
  }, [selectedMonth]);

  // ---------------------------------------------------------------------------
  // CURRENT EXCEL BACKUP & DOWNLOAD GENERATION (PROMINENT FEATURE)
  // ---------------------------------------------------------------------------
  const handleDownloadExcelBackup = async () => {
    try {
      setIsExporting(true);
      showToast('success', 'Preparing complete live Excel backup with formulas...');

      // 1. Fetch freshest database state directly from server
      const backupRes = await adminApi.getFinanceBackupData();
      const { partners: backupPartners, ledgers, marketing, filename } = backupRes;

      const wb = XLSX.utils.book_new();

      // =======================================================================
      // SHEET 1: EXPENSE MANAGER (3 Side-by-Side Tables: Yash, Dhruvik, Jeel)
      // =======================================================================
      // Header rows matching the original layout:
      // Yash: Cols A-D (0..3)
      // Dhruvik: Cols G-J (6..9)
      // Jeel: Cols M-P (12..15)
      const sheet1Data = [];

      // Row 0 & 1: Title
      sheet1Data[0] = ['VALERIE JEWELS — BUSINESS EXPENSE MANAGER — CURRENT BACKUP'];
      sheet1Data[1] = [`Live Database Snapshot Date: ${new Date().toLocaleDateString('en-GB')} | Generated by: ${currentUser?.name || 'Admin'}`];
      sheet1Data[2] = [];

      // Row 3: Partner Headers
      const row3 = [];
      row3[0] = 'YASH (EXPENSES)';
      row3[6] = 'DHRUVIK (EXPENSES)';
      row3[12] = 'JEEL (EXPENSES)';
      sheet1Data[3] = row3;

      // Row 4: Column Headers
      const row4 = [];
      // Yash
      row4[0] = 'Description';
      row4[1] = 'Amount (₹)';
      row4[2] = 'Status';
      row4[3] = 'Date';
      // Col 4 & 5 blank separator
      // Dhruvik
      row4[6] = 'Description';
      row4[7] = 'Amount (₹)';
      row4[8] = 'Status';
      row4[9] = 'Date';
      // Col 10 & 11 blank separator
      // Jeel
      row4[12] = 'Description';
      row4[13] = 'Amount (₹)';
      row4[14] = 'Status';
      row4[15] = 'Date';
      sheet1Data[4] = row4;

      const yashEntries = ledgers['Yash'] || [];
      const dhruvikEntries = ledgers['Dhruvik'] || [];
      const jeelEntries = ledgers['Jeel'] || [];

      const maxRows = Math.max(yashEntries.length, dhruvikEntries.length, jeelEntries.length, 1);

      for (let i = 0; i < maxRows; i++) {
        const row = [];
        // Yash
        if (yashEntries[i]) {
          row[0] = yashEntries[i].description;
          row[1] = Number(yashEntries[i].amount);
          row[2] = yashEntries[i].status;
          row[3] = formatDateDisplay(yashEntries[i].date);
        }
        // Dhruvik
        if (dhruvikEntries[i]) {
          row[6] = dhruvikEntries[i].description;
          row[7] = Number(dhruvikEntries[i].amount);
          row[8] = dhruvikEntries[i].status;
          row[9] = formatDateDisplay(dhruvikEntries[i].date);
        }
        // Jeel
        if (jeelEntries[i]) {
          row[12] = jeelEntries[i].description;
          row[13] = Number(jeelEntries[i].amount);
          row[14] = jeelEntries[i].status;
          row[15] = formatDateDisplay(jeelEntries[i].date);
        }
        sheet1Data[5 + i] = row;
      }

      // Sticky Bottom Totals Row with Working Excel SUM Formulas!
      const lastDataRowIdx = 4 + maxRows; // 0-based
      const startExcelRow = 6; // 1-based start row in Excel
      const endExcelRow = 5 + maxRows; // 1-based end row in Excel

      const totalsRow = [];
      totalsRow[0] = 'Total Expense';
      totalsRow[1] = { t: 'n', f: `SUM(B${startExcelRow}:B${endExcelRow})` };
      totalsRow[6] = 'Total Expense';
      totalsRow[7] = { t: 'n', f: `SUM(H${startExcelRow}:H${endExcelRow})` };
      totalsRow[12] = 'Total Expense';
      totalsRow[13] = { t: 'n', f: `SUM(N${startExcelRow}:N${endExcelRow})` };
      sheet1Data[lastDataRowIdx + 1] = totalsRow;

      const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

      // Set nice column widths
      ws1['!cols'] = [
        { wch: 38 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, // Yash
        { wch: 4 }, { wch: 4 },                             // Separator
        { wch: 38 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, // Dhruvik
        { wch: 4 }, { wch: 4 },                             // Separator
        { wch: 38 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, // Jeel
      ];

      XLSX.utils.book_append_sheet(wb, ws1, 'Expense Manager');

      // =======================================================================
      // SHEET 2: MARKETING BUDGET TRACKER
      // =======================================================================
      const sheet2Data = [
        ['VALERIE JEWELS — MARKETING BUDGET TRACKER'],
        ['Standard Agency Marketing Charge: 20% on Campaign Budgets'],
        [],
        ['Date', 'Campaign / Description', 'Budget Amount (₹)', 'Marketing Charge (20%)', 'Charges Status', 'Total Cost (₹)', 'Status'],
      ];

      const mktList = marketing || [];
      const mktStartRow = 5; // 1-based in Excel
      const mktEndRow = mktStartRow + Math.max(mktList.length - 1, 0);

      mktList.forEach((camp, idx) => {
        const curRow = mktStartRow + idx;
        sheet2Data.push([
          formatDateDisplay(camp.date),
          camp.campaign_name,
          Number(camp.budget_amount),
          { t: 'n', f: `C${curRow}*(${Number(camp.charge_percent)}/100)` },
          camp.charge_status,
          { t: 'n', f: `C${curRow}+D${curRow}` },
          camp.status,
        ]);
      });

      // Marketing Grand Total Row
      if (mktList.length > 0) {
        sheet2Data.push([
          'GRAND TOTAL',
          '',
          { t: 'n', f: `SUM(C${mktStartRow}:C${mktEndRow})` },
          { t: 'n', f: `SUM(D${mktStartRow}:D${mktEndRow})` },
          '',
          { t: 'n', f: `SUM(F${mktStartRow}:F${mktEndRow})` },
          '',
        ]);
      }

      const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
      ws2['!cols'] = [
        { wch: 14 }, { wch: 40 }, { wch: 18 }, { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 14 },
      ];
      XLSX.utils.book_append_sheet(wb, ws2, 'Marketing Budget');

      // =======================================================================
      // SHEET 3: SETTLEMENTS & NET POSITION SUMMARY
      // =======================================================================
      const sheet3Data = [
        ['VALERIE JEWELS — PARTNER SETTLEMENTS & NET EQUITY'],
        [`Snapshot Date: ${new Date().toLocaleDateString('en-GB')}`],
        [],
        ['Partner', 'Total Expenses Paid (₹)', 'Contributions (₹)', 'Transfers / Reimb. Net (₹)', 'Net Position (₹)', 'Equity Share (%)'],
      ];

      (overviewData?.partners || []).forEach((p) => {
        sheet3Data.push([
          p.name,
          p.total_expense,
          p.total_contributions,
          p.total_reimbursements + p.total_transfers_in - p.total_transfers_out,
          p.net_position,
          p.share_percent + '%',
        ]);
      });

      const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
      ws3['!cols'] = [{ wch: 16 }, { wch: 22 }, { wch: 18 }, { wch: 26 }, { wch: 18 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Settlements Summary');

      // 4. Download file immediately in browser (0 page reload, 0 navigation)
      const downloadFilename = filename || `Valerie_Jewels_Finance_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, downloadFilename);

      showToast('success', `Excel backup downloaded: ${downloadFilename}`);
    } catch (err) {
      console.error('Export error:', err);
      showToast('error', err.message || 'Failed to generate Excel backup');
    } finally {
      setIsExporting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // AUTO-CATEGORY KEYWORD DETECTION
  // ---------------------------------------------------------------------------
  const detectCategory = (desc) => {
    if (!desc) return 'Other';
    const text = desc.toLowerCase();
    if (text.includes('shiprocket') || text.includes('courier')) return 'Shiprocket';
    if (text.includes('meta') || text.includes('ad') || text.includes('marketing') || text.includes('campaign')) return 'Marketing';
    if (text.includes('influencer') || text.includes('reel') || text.includes('creator')) return 'Influencer';
    if (text.includes('packaging') || text.includes('pouch') || text.includes('honeycomb') || text.includes('honey comb') || text.includes('box')) return 'Packaging';
    if (text.includes('hostinger') || text.includes('domain') || text.includes('server')) return 'Hosting';
    if (text.includes('trademark') || text.includes('legal') || text.includes('ip')) return 'Legal/Trademark';
    if (text.includes('order')) return 'Order Cost';
    return 'Other';
  };

  // ---------------------------------------------------------------------------
  // FAST QUICK-ADD SUBMIT (<10s SPEED OF ENTRY)
  // ---------------------------------------------------------------------------
  const handleQuickAddSubmit = async (overridePartnerId = null) => {
    const targetPartnerId = overridePartnerId || quickAdd.partner_id || activePartnerId || 1;
    const desc = quickAdd.description.trim();
    const amt = parseFloat(quickAdd.amount);

    if (!desc) {
      showToast('error', 'Please enter a description');
      return;
    }
    if (!amt || amt <= 0) {
      showToast('error', 'Please enter a valid positive amount');
      return;
    }

    const detectedCat = quickAdd.category === 'Other' ? detectCategory(desc) : quickAdd.category;

    const payload = {
      partner_id: targetPartnerId,
      date: quickAdd.date || new Date().toISOString().split('T')[0],
      description: desc,
      amount: amt,
      type: quickAdd.type || 'EXPENSE',
      status: quickAdd.status || 'PAID',
      category: detectedCat,
      notes: quickAdd.notes || '',
    };

    // Optimistic UI update
    const tempId = Date.now();
    const targetPartner = partners.find((p) => p.id === targetPartnerId);
    const optimisticRow = {
      ...payload,
      id: tempId,
      partner_name: targetPartner?.name || 'Partner',
      partner_color: targetPartner?.color || '#6B21A8',
      created_at: new Date().toISOString(),
    };

    setEntries((prev) => [optimisticRow, ...prev]);

    // Clear Quick Add inputs immediately and keep focus on description
    setQuickAdd({
      partner_id: targetPartnerId,
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      type: 'EXPENSE',
      status: 'PAID',
      category: 'Other',
      notes: '',
    });
    setShowSuggestions(false);
    if (descInputRef.current) descInputRef.current.focus();

    try {
      const saved = await adminApi.createFinanceEntry(payload);
      // Replace optimistic row with actual server row
      setEntries((prev) => prev.map((e) => (e.id === tempId ? saved : e)));
      showToast('success', `Saved ₹${amt.toLocaleString('en-IN')} for ${targetPartner?.name || 'partner'}`);
      // Refresh KPIs quietly in background
      adminApi.getFinanceOverview(selectedMonth).then(setOverviewData).catch(() => {});
    } catch (err) {
      // Revert optimistic row on failure
      setEntries((prev) => prev.filter((e) => e.id !== tempId));
      showToast('error', err.message || 'Failed to save entry');
    }
  };

  // ---------------------------------------------------------------------------
  // INLINE CELL EDITING
  // ---------------------------------------------------------------------------
  const handleSaveInlineEdit = async (entryId, field, value) => {
    setEditingCell(null);
    const originalEntry = entries.find((e) => e.id === entryId);
    if (!originalEntry || originalEntry[field] == value) return;

    // Optimistic local update
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, [field]: value } : e))
    );

    try {
      await adminApi.updateFinanceEntry({ id: entryId, [field]: value });
      showToast('success', 'Updated');
      adminApi.getFinanceOverview(selectedMonth).then(setOverviewData).catch(() => {});
    } catch (err) {
      // Rollback
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? originalEntry : e))
      );
      showToast('error', err.message || 'Update failed');
    }
  };

  // ---------------------------------------------------------------------------
  // STATUS CHIP 1-CLICK CYCLE (PAID -> PENDING -> RECEIVED)
  // ---------------------------------------------------------------------------
  const handleCycleStatus = async (entry) => {
    const cycle = { PAID: 'PENDING', PENDING: 'RECEIVED', RECEIVED: 'PAID' };
    const nextStatus = cycle[entry.status] || 'PAID';
    await handleSaveInlineEdit(entry.id, 'status', nextStatus);
  };

  // ---------------------------------------------------------------------------
  // SOFT DELETE WITH 8-SECOND UNDO TOAST
  // ---------------------------------------------------------------------------
  const handleDeleteEntry = async (entry) => {
    // Remove locally
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));

    // Show undo toast
    setUndoItem(entry);

    try {
      await adminApi.deleteFinanceEntry(entry.id);
      adminApi.getFinanceOverview(selectedMonth).then(setOverviewData).catch(() => {});
    } catch (err) {
      setEntries((prev) => [entry, ...prev]);
      showToast('error', err.message || 'Delete failed');
    }
  };

  const handleUndoDelete = async () => {
    if (!undoItem) return;
    const itemToRestore = undoItem;
    setUndoItem(null);

    try {
      await adminApi.restoreFinanceEntry(itemToRestore.id);
      setEntries((prev) => [itemToRestore, ...prev]);
      showToast('success', `Restored: "${itemToRestore.description}"`);
      adminApi.getFinanceOverview(selectedMonth).then(setOverviewData).catch(() => {});
    } catch (err) {
      showToast('error', err.message || 'Failed to restore');
    }
  };

  // ---------------------------------------------------------------------------
  // EXCEL PASTE PARSER & MODAL
  // ---------------------------------------------------------------------------
  const handleProcessPastedText = () => {
    if (!pasteRawText.trim()) return;
    const lines = pasteRawText.trim().split(/\r?\n/);
    const parsed = [];

    lines.forEach((line) => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const desc = parts[0]?.trim();
        const amtStr = parts[1]?.replace(/[₹,]/g, '')?.trim();
        const amt = parseFloat(amtStr);
        const status = (parts[2]?.trim()?.toUpperCase() === 'PENDING' ? 'PENDING' : 'PAID');
        const date = parts[3]?.trim() || new Date().toISOString().split('T')[0];

        if (desc && !isNaN(amt) && amt > 0) {
          parsed.push({
            description: desc,
            amount: amt,
            status,
            date,
            category: detectCategory(desc),
            type: 'EXPENSE',
          });
        }
      }
    });

    setPastePreviewRows(parsed);
  };

  const handleConfirmPasteImport = async () => {
    if (pastePreviewRows.length === 0) return;
    const targetPartner = partners.find((p) => p.id === pastePartnerId);

    try {
      let importedCount = 0;
      for (const row of pastePreviewRows) {
        await adminApi.createFinanceEntry({
          ...row,
          partner_id: pastePartnerId,
        });
        importedCount++;
      }

      showToast('success', `✅ Successfully imported ${importedCount} rows for ${targetPartner?.name}!`);
      setPasteModalOpen(false);
      setPasteRawText('');
      setPastePreviewRows([]);
      loadAllFinanceData();
    } catch (err) {
      showToast('error', err.message || 'Failed to import pasted rows');
    }
  };

  // Filtered Entries
  const filteredEntries = entries.filter((e) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!e.description?.toLowerCase().includes(q) && !e.notes?.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* FLOATING NOTIFICATION TOAST & 8-SECOND UNDO BANNER */}
      {/* ========================================================================= */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 text-xs font-semibold animate-fade-in border ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-white" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {undoItem && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-tertiary text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-4 text-xs border border-white/20 animate-slide-up">
          <div className="flex items-center space-x-2">
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>
              Deleted <strong>"{undoItem.description}"</strong> (₹{Number(undoItem.amount).toLocaleString('en-IN')})
            </span>
          </div>
          <button
            onClick={handleUndoDelete}
            className="px-3 py-1 bg-white text-brand-primary font-bold rounded-lg hover:bg-amber-100 transition-colors flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>UNDO</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP HEADER & PROMINENT "DOWNLOAD CURRENT EXCEL BACKUP" BUTTON */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border/60 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-2xl bg-purple-50 text-brand-primary border border-purple-200">
              <Wallet className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-brand-tertiary">
                Business Expense & Finance Manager
              </h1>
              <p className="text-xs text-brand-muted font-light mt-0.5">
                Multi-partner ledger atelier for <strong>Yash, Dhruvik & Jeel</strong> • Side-by-side ledgers, Marketing Budget (20%), and 1-Click Excel Backup.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* PROMINENT "DOWNLOAD CURRENT EXCEL BACKUP" BUTTON (AS REQUESTED) */}
          <button
            id="btn-download-excel-backup"
            onClick={handleDownloadExcelBackup}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
            title="Download complete current Excel backup with 3 side-by-side tables and working SUM formulas"
          >
            <FileSpreadsheet className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
            <span>{isExporting ? 'Generating Excel...' : 'Download Current Excel Backup'}</span>
            <Download className="w-3.5 h-3.5 ml-1 opacity-80" />
          </button>

          {/* Quick Paste Modal Button */}
          <button
            onClick={() => setPasteModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#FAF8FC] text-brand-tertiary border border-brand-border text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5"
            title="Paste multiple rows copied from Google Sheets or Excel"
          >
            <Upload className="w-3.5 h-3.5 text-brand-muted" />
            <span className="hidden sm:inline">Paste From Excel</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-NAVIGATION TABS */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between border-b border-brand-border/60 overflow-x-auto pb-1 gap-2">
        <div className="flex items-center space-x-1.5 shrink-0">
          {[
            { id: 'ledgers', label: 'Partner Ledgers (3 Tables)', icon: Layers, badge: 'Live Entry' },
            { id: 'overview', label: 'Executive Overview', icon: BarChart3 },
            { id: 'marketing', label: 'Marketing Budget (20%)', icon: TrendingUp },
            { id: 'settlements', label: 'Settlements & Equity', icon: ArrowRightLeft },
            { id: 'export', label: 'Reports & Export', icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 shrink-0 ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'text-brand-muted hover:text-brand-tertiary hover:bg-white/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-brand-muted'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-purple-100 text-brand-primary'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Month Filter */}
        <div className="flex items-center space-x-1 text-xs shrink-0 pl-2">
          <Calendar className="w-3.5 h-3.5 text-brand-muted" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-brand-border rounded-lg px-2.5 py-1 text-xs font-semibold text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          >
            <option value="all">All Months</option>
            <option value="2026-10">October 2026</option>
            <option value="2026-09">September 2026</option>
            <option value="2026-08">August 2026</option>
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PARTNER LEDGERS (THE 3 CORE TABLES) */}
      {/* ========================================================================= */}
      {activeSubTab === 'ledgers' && (
        <div className="space-y-6">
          {/* Controls: Search, Layout Toggle (Side-by-Side vs Tabs) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-brand-border shadow-sm">
            {/* Search and Filters */}
            <div className="flex items-center flex-wrap gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input
                  type="text"
                  placeholder="Filter expenses by description or note..."
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
                <option value="Marketing">Marketing</option>
                <option value="Shiprocket">Shiprocket</option>
                <option value="Packaging">Packaging</option>
                <option value="Hosting">Hosting</option>
                <option value="Legal/Trademark">Legal/Trademark</option>
                <option value="Influencer">Influencer</option>
                <option value="Order Cost">Order Cost</option>
                <option value="Other">Other</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#FAF8FC] border border-brand-border rounded-xl px-2.5 py-1.5 text-xs text-brand-tertiary"
              >
                <option value="all">All Status</option>
                <option value="PAID">Paid Only</option>
                <option value="PENDING">Pending Only</option>
                <option value="RECEIVED">Received Only</option>
              </select>
            </div>

            {/* Layout Toggle: Side-by-Side vs Tabs (Desktop Only) */}
            <div className="hidden lg:flex items-center space-x-1 p-1 bg-[#FAF8FC] rounded-xl border border-brand-border">
              <button
                onClick={() => setLedgerLayout('side_by_side')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  ledgerLayout === 'side_by_side'
                    ? 'bg-white text-brand-primary shadow-sm font-bold'
                    : 'text-brand-muted hover:text-brand-tertiary'
                }`}
              >
                Side-by-Side (3 Tables)
              </button>
              <button
                onClick={() => setLedgerLayout('tabs')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  ledgerLayout === 'tabs'
                    ? 'bg-white text-brand-primary shadow-sm font-bold'
                    : 'text-brand-muted hover:text-brand-tertiary'
                }`}
              >
                Tabs View
              </button>
            </div>
          </div>

          {/* Quick Partner Switcher for Tabs Layout or Mobile */}
          {(ledgerLayout === 'tabs' || typeof window !== 'undefined' && window.innerWidth < 1024) && (
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              {partners.map((p) => {
                const isActive = activePartnerId === p.id;
                const pStat = overviewData?.partners?.find((x) => x.id === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => setActivePartnerId(p.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 border ${
                      isActive
                        ? 'bg-white text-brand-primary border-brand-primary shadow-sm'
                        : 'bg-white/60 text-brand-muted border-brand-border hover:bg-white'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></span>
                    <span>{p.name}'s Ledger</span>
                    <span className="text-[10px] text-brand-muted">
                      ({formatINR(pStat?.total_expense || 0)})
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* =================================================================== */}
          {/* THE TABLES: SIDE-BY-SIDE OR TABBED */}
          {/* =================================================================== */}
          <div
            className={
              ledgerLayout === 'side_by_side'
                ? 'grid grid-cols-1 lg:grid-cols-3 gap-6 items-start'
                : 'grid grid-cols-1 gap-6'
            }
          >
            {partners
              .filter((p) => (ledgerLayout === 'side_by_side' ? true : p.id === activePartnerId))
              .map((partner) => {
                const partnerEntries = filteredEntries.filter((e) => e.partner_id === partner.id);
                const partnerStat = overviewData?.partners?.find((x) => x.id === partner.id);
                const totalPaidExpense = partnerEntries
                  .filter((e) => e.type === 'EXPENSE' && e.status === 'PAID')
                  .reduce((acc, cur) => acc + Number(cur.amount), 0);
                const totalPending = partnerEntries
                  .filter((e) => e.status === 'PENDING')
                  .reduce((acc, cur) => acc + Number(cur.amount), 0);

                return (
                  <div
                    key={partner.id}
                    className="bg-white rounded-3xl border border-brand-border shadow-luxury overflow-hidden flex flex-col"
                  >
                    {/* Partner Header */}
                    <div
                      className="px-5 py-4 border-b border-brand-border/60 flex items-center justify-between"
                      style={{ borderTop: `4px solid ${partner.color}` }}
                    >
                      <div className="flex items-center space-x-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: partner.color }}
                        ></span>
                        <div>
                          <h3 className="text-base font-serif font-bold text-brand-tertiary">
                            {partner.name}
                          </h3>
                          <span className="text-[10px] text-brand-muted uppercase tracking-wider font-caps">
                            {partnerEntries.length} Records
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold text-brand-tertiary">
                          {formatINR(totalPaidExpense)}
                        </div>
                        {totalPending > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold">
                            + {formatINR(totalPending)} Pending
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SPEED OF ENTRY: ALWAYS-VISIBLE QUICK-ADD ROW */}
                    <div className="bg-[#FAF8FC] p-3 border-b border-brand-border/60 space-y-2">
                      <div className="text-[10px] font-caps tracking-wider uppercase text-brand-muted font-bold flex items-center justify-between">
                        <span className="flex items-center space-x-1">
                          <Sparkles className="w-3 h-3 text-brand-primary" />
                          <span>Quick Add (Press Enter to Save in &lt;10s)</span>
                        </span>
                        <span className="text-[9px] text-brand-muted">Autofills category</span>
                      </div>

                      <div className="grid grid-cols-12 gap-1.5 relative">
                        {/* Description with Autocomplete */}
                        <div className="col-span-7 relative">
                          <input
                            ref={descInputRef}
                            type="text"
                            placeholder="Description (e.g. Shiprocket)"
                            value={quickAdd.partner_id === partner.id ? quickAdd.description : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQuickAdd((cur) => ({
                                ...cur,
                                partner_id: partner.id,
                                description: val,
                                category: detectCategory(val),
                              }));
                              setShowSuggestions(val.length > 1);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleQuickAddSubmit(partner.id);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-brand-border rounded-lg text-xs text-brand-tertiary placeholder-brand-muted/70 focus:outline-none focus:ring-1 focus:ring-brand-primary font-medium"
                          />

                          {/* Autocomplete Dropdown */}
                          {showSuggestions && quickAdd.partner_id === partner.id && (
                            <div className="absolute left-0 top-full mt-1 w-full bg-white border border-brand-border rounded-xl shadow-xl z-30 max-h-40 overflow-y-auto">
                              {descriptionSuggestions
                                .filter((s) => s.toLowerCase().includes(quickAdd.description.toLowerCase()))
                                .slice(0, 5)
                                .map((sugg, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => {
                                      setQuickAdd((cur) => ({
                                        ...cur,
                                        description: sugg,
                                        category: detectCategory(sugg),
                                      }));
                                      setShowSuggestions(false);
                                    }}
                                    className="px-3 py-1.5 text-xs text-brand-tertiary hover:bg-purple-50 cursor-pointer font-medium border-b border-brand-border/30 last:border-0"
                                  >
                                    {sugg}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* Amount */}
                        <div className="col-span-5">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-brand-muted font-bold">
                              ₹
                            </span>
                            <input
                              type="number"
                              placeholder="Amount"
                              value={quickAdd.partner_id === partner.id ? quickAdd.amount : ''}
                              onChange={(e) =>
                                setQuickAdd((cur) => ({
                                  ...cur,
                                  partner_id: partner.id,
                                  amount: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleQuickAddSubmit(partner.id);
                                }
                              }}
                              className="w-full pl-5 pr-2 py-1.5 bg-white border border-brand-border rounded-lg text-xs text-brand-tertiary font-bold focus:outline-none focus:ring-1 focus:ring-brand-primary"
                            />
                          </div>
                        </div>

                        {/* Secondary Quick-Add Options Row */}
                        <div className="col-span-12 flex items-center justify-between gap-1 pt-0.5">
                          <div className="flex items-center space-x-1 text-[10px]">
                            {/* Type Selector */}
                            <select
                              value={quickAdd.partner_id === partner.id ? quickAdd.type : 'EXPENSE'}
                              onChange={(e) =>
                                setQuickAdd((cur) => ({ ...cur, partner_id: partner.id, type: e.target.value }))
                              }
                              className="bg-white border border-brand-border rounded px-1.5 py-1 text-[10px] text-brand-tertiary font-semibold"
                            >
                              <option value="EXPENSE">Expense</option>
                              <option value="CONTRIBUTION">Capital Contrib.</option>
                              <option value="REIMBURSEMENT">Reimbursement</option>
                              <option value="TRANSFER_OUT">Transfer Out</option>
                              <option value="TRANSFER_IN">Transfer In</option>
                            </select>

                            {/* Status Selector */}
                            <select
                              value={quickAdd.partner_id === partner.id ? quickAdd.status : 'PAID'}
                              onChange={(e) =>
                                setQuickAdd((cur) => ({ ...cur, partner_id: partner.id, status: e.target.value }))
                              }
                              className="bg-white border border-brand-border rounded px-1.5 py-1 text-[10px] text-brand-tertiary font-semibold"
                            >
                              <option value="PAID">Paid</option>
                              <option value="PENDING">Pending</option>
                              <option value="RECEIVED">Received</option>
                            </select>

                            {/* Date */}
                            <input
                              type="date"
                              value={quickAdd.partner_id === partner.id ? quickAdd.date : new Date().toISOString().split('T')[0]}
                              onChange={(e) =>
                                setQuickAdd((cur) => ({ ...cur, partner_id: partner.id, date: e.target.value }))
                              }
                              className="bg-white border border-brand-border rounded px-1.5 py-1 text-[10px] text-brand-tertiary"
                            />
                          </div>

                          {/* Quick Add Button */}
                          <button
                            onClick={() => handleQuickAddSubmit(partner.id)}
                            className="px-3 py-1 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1 shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Table Body */}
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto divide-y divide-brand-border/40">
                      {partnerEntries.length === 0 ? (
                        <div className="py-12 text-center text-xs text-brand-muted space-y-1">
                          <p className="font-medium">No expenses recorded yet for {partner.name}.</p>
                          <p className="text-[11px] opacity-70">Use the quick add bar above to enter an expense in seconds.</p>
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[#FAF8FC]/80 text-[10px] font-caps uppercase tracking-wider text-brand-muted border-b border-brand-border/60 sticky top-0 bg-white z-10">
                              <th className="py-2.5 px-3 font-bold">Description</th>
                              <th className="py-2.5 px-3 font-bold text-right">Amount (₹)</th>
                              <th className="py-2.5 px-2 font-bold text-center">Status</th>
                              <th className="py-2.5 px-3 font-bold text-right">Date</th>
                              <th className="py-2.5 px-2 font-bold text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-border/30 text-xs">
                            {partnerEntries.map((entry) => {
                              const isPaid = entry.status === 'PAID';
                              const isPending = entry.status === 'PENDING';
                              const isReceived = entry.status === 'RECEIVED';

                              return (
                                <tr key={entry.id} className="hover:bg-purple-50/40 transition-colors group">
                                  {/* Description (Inline Editable) */}
                                  <td className="py-2 px-3 min-w-[140px]">
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
                                        className="w-full bg-white border border-brand-primary rounded px-1.5 py-0.5 text-xs text-brand-tertiary focus:outline-none"
                                      />
                                    ) : (
                                      <div
                                        onClick={() => setEditingCell({ id: entry.id, field: 'description', value: entry.description })}
                                        className="cursor-pointer font-medium text-brand-tertiary hover:text-brand-primary"
                                        title="Click to edit"
                                      >
                                        <span>{entry.description}</span>
                                        {entry.category && entry.category !== 'Other' && (
                                          <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-slate-100 text-slate-700 font-semibold">
                                            {entry.category}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </td>

                                  {/* Amount (Inline Editable) */}
                                  <td className="py-2 px-3 text-right font-bold text-brand-tertiary min-w-[90px]">
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
                                        className="w-full bg-white border border-brand-primary rounded px-1.5 py-0.5 text-xs text-right font-bold text-brand-tertiary focus:outline-none"
                                      />
                                    ) : (
                                      <span
                                        onClick={() => setEditingCell({ id: entry.id, field: 'amount', value: entry.amount })}
                                        className={`cursor-pointer ${
                                          entry.type === 'CONTRIBUTION'
                                            ? 'text-emerald-700'
                                            : entry.type === 'TRANSFER_IN'
                                            ? 'text-blue-700'
                                            : 'text-brand-tertiary'
                                        }`}
                                        title="Click to edit"
                                      >
                                        ₹{Number(entry.amount).toLocaleString('en-IN')}
                                      </span>
                                    )}
                                  </td>

                                  {/* Status Chip (1-Click Cycle: Paid -> Pending -> Received) */}
                                  <td className="py-2 px-2 text-center">
                                    <button
                                      onClick={() => handleCycleStatus(entry)}
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-transform hover:scale-105 active:scale-95 ${
                                        isPaid
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                          : isPending
                                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                                      }`}
                                      title="Click to cycle status: Paid → Pending → Received"
                                    >
                                      {entry.status}
                                    </button>
                                  </td>

                                  {/* Date (Inline Editable) */}
                                  <td className="py-2 px-3 text-right text-[11px] text-brand-muted font-medium whitespace-nowrap">
                                    {editingCell?.id === entry.id && editingCell?.field === 'date' ? (
                                      <input
                                        type="date"
                                        autoFocus
                                        defaultValue={entry.date}
                                        onBlur={(e) => handleSaveInlineEdit(entry.id, 'date', e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveInlineEdit(entry.id, 'date', e.target.value);
                                          if (e.key === 'Escape') setEditingCell(null);
                                        }}
                                        className="bg-white border border-brand-primary rounded px-1 text-[10px] text-brand-tertiary focus:outline-none"
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

                                  {/* Actions */}
                                  <td className="py-2 px-2 text-right">
                                    <button
                                      onClick={() => handleDeleteEntry(entry)}
                                      className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors opacity-0 group-hover:opacity-100"
                                      title="Delete entry (Offers 8s undo)"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* STICKY LIVE FOOTER (Matches original Excel footer row) */}
                    <div className="mt-auto px-4 py-3 bg-[#FAF8FC] border-t border-brand-border/60 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-caps tracking-wider uppercase text-brand-muted text-[10px] font-bold">
                          Total Expense:
                        </span>
                        <span className="ml-1.5 font-editorial font-bold text-brand-tertiary text-sm">
                          {formatINR(totalPaidExpense)}
                        </span>
                      </div>

                      {totalPending > 0 && (
                        <div className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Pending: {formatINR(totalPending)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EXECUTIVE OVERVIEW DASHBOARD */}
      {/* ========================================================================= */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Business Total Expense */}
            <div className="luxury-card bg-white p-5 rounded-2xl border border-brand-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-caps tracking-wider uppercase text-brand-muted font-bold">
                  Business Total Expense
                </span>
                <div className="p-2 rounded-xl bg-purple-50 text-brand-primary">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-editorial font-bold text-brand-tertiary">
                {formatINR(overviewData?.kpis?.business_total_expense || 0)}
              </div>
              <div className="text-[11px] text-brand-muted">
                Combined verified spend by Yash, Dhruvik & Jeel
              </div>
            </div>

            {/* Total Marketing Spend */}
            <div className="luxury-card bg-white p-5 rounded-2xl border border-brand-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-caps tracking-wider uppercase text-brand-muted font-bold">
                  Marketing & Ad Spend
                </span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-editorial font-bold text-brand-tertiary">
                {formatINR(overviewData?.kpis?.total_marketing_spend || 0)}
              </div>
              <div className="text-[11px] text-brand-muted">
                Includes budget + standard 20% campaign charges
              </div>
            </div>

            {/* Total Pending Unpaid */}
            <div className="luxury-card bg-white p-5 rounded-2xl border border-brand-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-caps tracking-wider uppercase text-brand-muted font-bold">
                  Pending Partner Expenses
                </span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-editorial font-bold text-brand-tertiary">
                {formatINR(overviewData?.kpis?.business_pending || 0)}
              </div>
              <div className="text-[11px] text-brand-muted">
                Unsettled or pending vendor dispatches
              </div>
            </div>

            {/* Net Business Capital */}
            <div className="luxury-card bg-white p-5 rounded-2xl border border-brand-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-caps tracking-wider uppercase text-brand-muted font-bold">
                  Active Partners
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-editorial font-bold text-brand-tertiary">
                3 Partners
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold">
                Equal 33.3% equity and cost sharing
              </div>
            </div>
          </div>

          {/* 3 Partner Summary Cards (Click to Jump to Ledger) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(overviewData?.partners || []).map((partner) => {
              const isCreditor = partner.net_position >= 0;
              return (
                <div
                  key={partner.id}
                  onClick={() => {
                    setActivePartnerId(partner.id);
                    setActiveSubTab('ledgers');
                  }}
                  className="luxury-card bg-white p-6 rounded-3xl border border-brand-border shadow-sm hover:shadow-md cursor-pointer transition-all space-y-4"
                  style={{ borderLeft: `5px solid ${partner.color}` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-serif font-bold text-brand-tertiary">{partner.name}</h3>
                      <span className="text-[10px] text-brand-muted uppercase tracking-wider font-caps">
                        Partner Ledger
                      </span>
                    </div>
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: partner.color }}
                    ></span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-brand-border/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-brand-muted font-medium">Total Expense:</span>
                      <span className="font-bold text-brand-tertiary">{formatINR(partner.total_expense)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-brand-muted font-medium">Pending:</span>
                      <span className="font-semibold text-amber-700">{formatINR(partner.pending_expense)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed border-brand-border/60">
                      <span className="text-brand-muted font-medium">Net Position:</span>
                      <span
                        className={`font-bold ${
                          isCreditor ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {formatINR(partner.net_position)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-brand-primary font-bold flex items-center space-x-1">
                    <span>View {partner.name}'s Table</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Category Distribution Breakdown */}
          <div className="bg-white p-6 rounded-3xl border border-brand-border shadow-sm space-y-4">
            <h3 className="text-sm font-caps uppercase tracking-wider font-bold text-brand-tertiary">
              Expense Distribution by Category
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(overviewData?.categories || []).map((cat, idx) => (
                <div key={idx} className="p-3 bg-[#FAF8FC] rounded-2xl border border-brand-border/60 space-y-1">
                  <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wider truncate">
                    {cat.category || 'Other'}
                  </div>
                  <div className="text-base font-bold text-brand-tertiary font-editorial">
                    {formatINR(cat.total_amount)}
                  </div>
                  <div className="text-[10px] text-brand-muted">{cat.count} transactions</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MARKETING BUDGET TRACKER (WITH 20% CHARGE) */}
      {/* ========================================================================= */}
      {activeSubTab === 'marketing' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-brand-border">
            <div>
              <h2 className="text-base font-serif font-bold text-brand-tertiary">
                Marketing Budget Tracker
              </h2>
              <p className="text-xs text-brand-muted">
                Automatically applies the <strong>20% marketing agency charge</strong> on all campaigns and computes total costs live.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-caps uppercase tracking-wider text-brand-muted font-bold">
                Grand Total Marketing Spend:
              </span>
              <div className="text-xl font-editorial font-bold text-brand-tertiary">
                {formatINR(marketingData?.totals?.grand_total_cost || 0)}
              </div>
            </div>
          </div>

          {/* Marketing Campaigns Table */}
          <div className="bg-white rounded-3xl border border-brand-border shadow-luxury overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF8FC] text-[10px] font-caps uppercase tracking-wider text-brand-muted border-b border-brand-border/60">
                  <th className="py-3 px-4 font-bold">Date</th>
                  <th className="py-3 px-4 font-bold">Campaign / Description</th>
                  <th className="py-3 px-4 font-bold text-right">Budget Amount</th>
                  <th className="py-3 px-4 font-bold text-right">Marketing Charge (20%)</th>
                  <th className="py-3 px-3 font-bold text-center">Charges Status</th>
                  <th className="py-3 px-4 font-bold text-right">Total Cost</th>
                  <th className="py-3 px-3 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {(marketingData?.campaigns || []).map((camp) => (
                  <tr key={camp.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-3 px-4 text-brand-muted font-medium">{formatDateDisplay(camp.date)}</td>
                    <td className="py-3 px-4 font-semibold text-brand-tertiary">{camp.campaign_name}</td>
                    <td className="py-3 px-4 text-right font-bold text-brand-tertiary">
                      {formatINR(camp.budget_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-purple-700">
                      {formatINR(camp.charge_amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          camp.charge_status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {camp.charge_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-brand-tertiary text-sm font-editorial">
                      {formatINR(camp.total_cost)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          camp.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {camp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Grand Total Row */}
              <tfoot>
                <tr className="bg-[#FAF8FC] border-t-2 border-brand-border font-bold text-xs text-brand-tertiary">
                  <td colSpan={2} className="py-3.5 px-4 uppercase tracking-wider font-caps">
                    Grand Total
                  </td>
                  <td className="py-3.5 px-4 text-right font-editorial text-sm">
                    {formatINR(marketingData?.totals?.total_budget || 0)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-editorial text-sm text-purple-700">
                    {formatINR(marketingData?.totals?.total_charges || 0)}
                  </td>
                  <td></td>
                  <td className="py-3.5 px-4 text-right font-editorial text-base text-brand-primary font-bold">
                    {formatINR(marketingData?.totals?.grand_total_cost || 0)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SETTLEMENTS & DEBT RESOLUTION ("WHO OWES WHOM") */}
      {/* ========================================================================= */}
      {activeSubTab === 'settlements' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-brand-border shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-brand-tertiary">
                Settlements & Partner Debt Resolution
              </h2>
              <p className="text-xs text-brand-muted">
                Calculates who owes whom based on net capital contributions and equal 1/3 (33.33%) equity share.
              </p>
            </div>

            {/* Suggested Payments Box */}
            <div className="bg-purple-50/70 p-5 rounded-2xl border border-purple-200/80 space-y-3">
              <div className="text-xs font-bold text-brand-primary font-caps uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Suggested Settlement Transfers</span>
              </div>

              {settlementData?.suggested_payments?.length === 0 ? (
                <div className="text-xs text-emerald-800 font-semibold py-2">
                  ✨ All partner accounts are fully settled and balanced!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(settlementData?.suggested_payments || []).map((sugg, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3.5 rounded-xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <ArrowRightLeft className="w-4 h-4 text-brand-primary" />
                        <div>
                          <span className="text-xs font-bold text-brand-tertiary">
                            {sugg.from_partner_name}
                          </span>
                          <span className="text-xs text-brand-muted mx-2">pays</span>
                          <span className="text-xs font-bold text-brand-tertiary">
                            {sugg.to_partner_name}
                          </span>
                          <div className="text-xs font-editorial font-bold text-purple-700">
                            {formatINR(sugg.amount)}
                          </div>
                        </div>
                      </div>

                      {/* 1-Click Record Settlement Button */}
                      <button
                        onClick={async () => {
                          try {
                            await adminApi.recordFinanceSettlement({
                              from_partner_id: sugg.from_partner_id,
                              to_partner_id: sugg.to_partner_id,
                              amount: sugg.amount,
                              date: new Date().toISOString().split('T')[0],
                              notes: `Settlement transfer of ${formatINR(sugg.amount)}`,
                            });
                            showToast('success', `Recorded settlement: ${sugg.instruction}`);
                            loadAllFinanceData();
                          } catch (err) {
                            showToast('error', err.message || 'Settlement recording failed');
                          }
                        }}
                        className="px-3.5 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                      >
                        Record Settlement
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Partner Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF8FC] text-[10px] font-caps uppercase tracking-wider text-brand-muted border-b border-brand-border">
                    <th className="py-2.5 px-3">Partner</th>
                    <th className="py-2.5 px-3 text-right">Expenses Paid</th>
                    <th className="py-2.5 px-3 text-right">Capital Contrib.</th>
                    <th className="py-2.5 px-3 text-right">Net Position</th>
                    <th className="py-2.5 px-3 text-right">Fair Share (33.3%)</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40">
                  {(settlementData?.partners || []).map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 px-3 font-bold text-brand-tertiary">{p.name}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{formatINR(p.expenses)}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{formatINR(p.contributions)}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{formatINR(p.net_position)}</td>
                      <td className="py-2.5 px-3 text-right text-brand-muted">{formatINR(p.fair_share)}</td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        <span
                          className={
                            p.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }
                        >
                          {p.balance >= 0 ? `+ ${formatINR(p.balance)} (Owed)` : `- ${formatINR(Math.abs(p.balance))} (Owes)`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: REPORTS & EXPORT */}
      {/* ========================================================================= */}
      {activeSubTab === 'export' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-brand-border shadow-luxury space-y-6">
            <div>
              <h2 className="text-lg font-serif font-bold text-brand-tertiary">
                Reports & Live Financial Exports
              </h2>
              <p className="text-xs text-brand-muted">
                Download exact Excel files containing all partner expenses, formulas, and marketing records.
              </p>
            </div>

            {/* Featured Export Card: Download Current Excel Backup */}
            <div className="p-6 bg-gradient-to-r from-[#FAF8FC] via-purple-50/50 to-emerald-50/30 rounded-2xl border-2 border-brand-primary/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-bold text-brand-tertiary">
                    Current Excel Backup (.xlsx)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-brand-muted max-w-xl">
                  Generates an Excel workbook with 3 side-by-side tables for Yash, Dhruvik, and Jeel, real Excel SUM formulas for totals, plus a separate Marketing Budget Tracker sheet.
                </p>
              </div>

              <button
                onClick={handleDownloadExcelBackup}
                disabled={isExporting}
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-2 shrink-0 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Generating Excel...' : 'Download Current Excel Backup'}</span>
              </button>
            </div>

            {/* Individual CSV Export Options */}
            <div className="pt-4 border-t border-brand-border/60">
              <h3 className="text-xs font-caps uppercase tracking-wider font-bold text-brand-muted mb-3">
                Individual Partner CSV Exports
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {partners.map((partner) => (
                  <button
                    key={partner.id}
                    onClick={() => {
                      const pEntries = entries.filter((e) => e.partner_id === partner.id);
                      const csvHeader = 'Description,Amount,Status,Date,Category\n';
                      const csvRows = pEntries
                        .map((e) => `"${e.description.replace(/"/g, '""')}",${e.amount},${e.status},${e.date},"${e.category}"`)
                        .join('\n');
                      const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', `${partner.name}_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      showToast('success', `Exported ${partner.name}'s CSV`);
                    }}
                    className="p-4 bg-[#FAF8FC] hover:bg-purple-50/50 rounded-2xl border border-brand-border text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-brand-tertiary">
                        {partner.name}'s Expenses
                      </div>
                      <div className="text-[10px] text-brand-muted">CSV Format</div>
                    </div>
                    <Download className="w-4 h-4 text-brand-primary" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXCEL PASTE IMPORT MODAL */}
      {/* ========================================================================= */}
      {pasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-brand-primary" />
                <h3 className="text-base font-serif font-bold text-brand-tertiary">
                  Paste Multiple Rows from Excel / Google Sheets
                </h3>
              </div>
              <button
                onClick={() => setPasteModalOpen(false)}
                className="p-1 text-brand-muted hover:text-brand-tertiary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-brand-muted block mb-1">
                  Select Partner to Assign Pasted Rows:
                </label>
                <select
                  value={pastePartnerId}
                  onChange={(e) => setPastePartnerId(Number(e.target.value))}
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs font-semibold text-brand-tertiary"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}'s Ledger
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-brand-muted block mb-1">
                  Paste Rows (Description, Amount, Status, Date):
                </label>
                <textarea
                  rows={5}
                  value={pasteRawText}
                  onChange={(e) => setPasteRawText(e.target.value)}
                  placeholder={`Shiprocket Recharge\t5000\tPaid\t2026-10-20\nHoneycomb Boxes\t7800\tPaid\t2026-10-22`}
                  className="w-full p-3 bg-[#FAF8FC] border border-brand-border rounded-xl text-xs font-mono text-brand-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                ></textarea>
              </div>

              <button
                onClick={handleProcessPastedText}
                className="px-4 py-2 bg-purple-100 text-brand-primary rounded-xl text-xs font-bold hover:bg-purple-200 transition-colors"
              >
                Preview Parsed Rows ({pastePreviewRows.length})
              </button>

              {/* Preview Table */}
              {pastePreviewRows.length > 0 && (
                <div className="border border-brand-border rounded-xl overflow-hidden max-h-48 overflow-y-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-[#FAF8FC] text-[10px] font-caps uppercase tracking-wider text-brand-muted">
                      <tr>
                        <th className="p-2">Description</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2 text-center">Status</th>
                        <th className="p-2 text-right">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40">
                      {pastePreviewRows.map((r, i) => (
                        <tr key={i}>
                          <td className="p-2 font-medium">{r.description}</td>
                          <td className="p-2 text-right font-bold">₹{r.amount}</td>
                          <td className="p-2 text-center">{r.status}</td>
                          <td className="p-2 text-right text-brand-muted">{r.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-brand-border flex items-center justify-end space-x-2">
              <button
                onClick={() => setPasteModalOpen(false)}
                className="px-4 py-2 border border-brand-border rounded-xl text-xs font-semibold text-brand-muted hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPasteImport}
                disabled={pastePreviewRows.length === 0}
                className="px-5 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold hover:bg-brand-primary/90 disabled:opacity-50 transition-all shadow-md"
              >
                Confirm & Import {pastePreviewRows.length} Rows
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
