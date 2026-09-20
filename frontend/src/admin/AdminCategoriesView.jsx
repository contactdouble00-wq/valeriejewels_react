import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Check,
  X,
  AlertCircle,
  Package,
  Flame,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Star,
  Layers
} from 'lucide-react';
import { adminApi } from './adminApi';

export default function AdminCategoriesView({ currentUser, onNavigateTab }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [editingCat, setEditingCat] = useState(null); // null = closed, {} = new, {...} = edit
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [restoringJhumka, setRestoringJhumka] = useState(false);

  const isStaff = currentUser?.role === 'staff';

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getCategories();
      setCategories(data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenNew = () => {
    setEditingCat({ name: '', slug: '', description: '', display_order: categories.length + 1, is_active: 1 });
    setModalError('');
  };

  const handleOpenEdit = (cat) => {
    setEditingCat({ ...cat });
    setModalError('');
  };

  const notifyCategoryChange = () => {
    window.dispatchEvent(new CustomEvent('valerie_categories_updated'));
    try {
      localStorage.setItem('valerie_categories_updated', Date.now().toString());
    } catch {
      // ignore
    }
  };

  const handleRestoreJhumka = async () => {
    setRestoringJhumka(true);
    try {
      await adminApi.restoreJhumkaCategory();
      showToast('🎉 "Jhumka Boxes" section restored and linked to hero products!');
      await loadCategories();
      notifyCategoryChange();
    } catch (err) {
      showToast(err.message || 'Failed to restore Jhumka Boxes category');
    } finally {
      setRestoringJhumka(false);
    }
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalSaving(true);
    setModalError('');
    try {
      if (editingCat.id) {
        await adminApi.updateCategory(editingCat);
        showToast('Category updated successfully');
      } else {
        await adminApi.createCategory(editingCat);
        showToast('Category created successfully');
      }
      setEditingCat(null);
      loadCategories();
      notifyCategoryChange();
    } catch (err) {
      setModalError(err.message || 'Failed to save category');
    } finally {
      setModalSaving(false);
    }
  };

  const [deletingCategory, setDeletingCategory] = useState(null);

  const handleDelete = (id, name, productCount, slug) => {
    if (slug === 'jhumka-boxes') {
      showToast('Cannot delete "Jhumka Boxes" — this is a protected core module for your homepage.');
      return;
    }
    if (productCount > 0) {
      showToast(`Cannot delete "${name}" — ${productCount} products are assigned. Reassign them first.`);
      return;
    }
    setDeletingCategory({ id, name });
  };

  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    const { id, name } = deletingCategory;
    setDeletingCategory(null);
    try {
      await adminApi.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showToast(`Category "${name}" deleted successfully`);
      notifyCategoryChange();
    } catch (err) {
      showToast(err.message || 'Failed to delete category');
    }
  };

  const [togglingId, setTogglingId] = useState(null);

  const handleToggleActive = async (cat) => {
    if (!cat) return;
    const currentActive = Number(cat.is_active) === 1 ? 1 : 0;
    const newActive = currentActive === 1 ? 0 : 1;

    // Optimistic UI update
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, is_active: newActive } : c))
    );
    setTogglingId(cat.id);

    try {
      await adminApi.toggleCategoryActive(cat.id, newActive);
      showToast(`"${cat.name}" is now ${newActive === 1 ? 'visible on storefront' : 'hidden from storefront'}`);
      notifyCategoryChange();
    } catch (err) {
      // Rollback on error
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: currentActive } : c))
      );
      showToast(err.message || 'Failed to update visibility');
    } finally {
      setTogglingId(null);
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (name) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setEditingCat((prev) => ({ ...prev, name, slug: prev.slug || slug }));
  };

  const jhumkaCat = categories.find((c) => c.slug === 'jhumka-boxes');

  return (
    <div className="p-6 sm:p-8 space-y-7 w-full">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-tertiary text-white px-4 py-2.5 rounded-xl shadow-luxury text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-caps tracking-widest uppercase text-brand-primary font-bold">
            Catalog Structure & Navigation
          </span>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-brand-tertiary mt-1">
            Category Management
          </h1>
        </div>
        {!isStaff && (
          <button
            onClick={handleOpenNew}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-wider uppercase font-bold transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Category</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* HERO AD CAMPAIGN SPOTLIGHT: 4 SIGNATURE JHUMKA BOXES DEDICATED HUB */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-r from-[#FAF6FD] via-[#F4EDFC] to-[#FAF7FD] border-2 border-brand-primary/35 rounded-3xl p-5 sm:p-7 shadow-luxury relative overflow-hidden space-y-5">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-brand-gold/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border/60 pb-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-brand-primary text-white text-[10px] font-caps uppercase tracking-wider font-bold shadow-xs">
              <Flame className="w-3.5 h-3.5 text-brand-gold animate-pulse shrink-0" />
              <span>Core Revenue Engine • Homepage Ad Showcase Module</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-editorial font-bold text-brand-tertiary">
              4 Signature Jhumka Boxes — Dedicated Category Hub
            </h2>
            <p className="text-xs text-brand-muted font-light leading-relaxed">
              This special section powers the high-converting <strong className="font-semibold text-brand-tertiary">#jhumka-boxes</strong> hero module on your homepage. It is system-protected against accidental deletion so your live ad campaigns never break.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {jhumkaCat ? (
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  Number(jhumkaCat.is_active) === 1
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${Number(jhumkaCat.is_active) === 1 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span>{Number(jhumkaCat.is_active) === 1 ? 'Active on Storefront' : 'Hidden on Storefront'}</span>
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRestoreJhumka}
                disabled={restoringJhumka}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-primary to-[#281636] text-white text-xs font-caps tracking-wider uppercase font-bold shadow-md hover:opacity-95 active:scale-95 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-brand-gold" />
                <span>{restoringJhumka ? 'Restoring...' : '⚡ 1-Click Restore Jhumka Boxes'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Status & Control Cards Grid */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          
          {/* Card 1: Storefront Visibility */}
          <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-4 border border-brand-border/80 shadow-xs flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[10px] font-caps uppercase tracking-wider text-brand-muted font-bold block mb-1">
                Storefront Display
              </span>
              <div className="font-bold text-sm text-brand-tertiary">
                {jhumkaCat && Number(jhumkaCat.is_active) === 1 ? 'Live on Homepage' : 'Hidden from Homepage'}
              </div>
              <p className="text-[11px] text-brand-muted font-light mt-0.5">
                Displays at section anchor <code className="text-[10px] bg-purple-50 text-brand-primary px-1 py-0.5 rounded font-mono">#jhumka-boxes</code>
              </p>
            </div>

            {jhumkaCat ? (
              <button
                type="button"
                onClick={() => handleToggleActive(jhumkaCat)}
                disabled={togglingId === jhumkaCat.id}
                className={`w-full py-2 px-3 rounded-xl font-caps uppercase tracking-wider text-[11px] font-bold transition-all flex items-center justify-center space-x-1.5 ${
                  Number(jhumkaCat.is_active) === 1
                    ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <span>{Number(jhumkaCat.is_active) === 1 ? 'Toggle: Hide from Store' : 'Toggle: Show on Store'}</span>
              </button>
            ) : (
              <span className="text-[11px] text-amber-700 font-semibold">Section not restored yet</span>
            )}
          </div>

          {/* Card 2: Assigned Box Products */}
          <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-4 border border-brand-border/80 shadow-xs flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[10px] font-caps uppercase tracking-wider text-brand-muted font-bold block mb-1">
                Products in Module
              </span>
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-brand-primary" />
                <span className="font-bold text-sm text-brand-tertiary">
                  {jhumkaCat?.product_count ?? 0} Boxes Linked
                </span>
              </div>
              <p className="text-[11px] text-brand-muted font-light mt-0.5">
                Products tagged with <code className="text-[10px] bg-gray-100 text-gray-700 px-1 py-0.5 rounded font-mono">VJ-JHM</code> or category Jhumka Boxes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('products')}
              className="w-full py-2 px-3 rounded-xl bg-brand-primary-light hover:bg-brand-primary hover:text-white text-brand-primary font-caps uppercase tracking-wider text-[11px] font-bold transition-all flex items-center justify-center space-x-1 border border-brand-border"
            >
              <span>Manage Box Products</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: Copy & Badges Studio */}
          <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-4 border border-brand-border/80 shadow-xs flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[10px] font-caps uppercase tracking-wider text-brand-muted font-bold block mb-1">
                Headlines & Copy
              </span>
              <div className="font-bold text-sm text-brand-tertiary">
                Homepage Studio
              </div>
              <p className="text-[11px] text-brand-muted font-light mt-0.5">
                Edit title line, pairs badge text, subtitle, and trust badges.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('homepage')}
              className="w-full py-2 px-3 rounded-xl bg-brand-primary-light hover:bg-brand-primary hover:text-white text-brand-primary font-caps uppercase tracking-wider text-[11px] font-bold transition-all flex items-center justify-center space-x-1 border border-brand-border"
            >
              <span>Customize Hero Copy</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 4: Protection Status */}
          <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-4 border border-brand-border/80 shadow-xs flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[10px] font-caps uppercase tracking-wider text-brand-muted font-bold block mb-1">
                Protection Status
              </span>
              <div className="flex items-center space-x-1.5 text-brand-primary font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Protected System Hub</span>
              </div>
              <p className="text-[11px] text-brand-muted font-light mt-0.5">
                Immune to accidental deletion. 1-click restore keeps it safe.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRestoreJhumka}
              disabled={restoringJhumka}
              className="w-full py-2 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-caps uppercase tracking-wider text-[11px] font-bold transition-all flex items-center justify-center space-x-1 border border-gray-200"
            >
              <RefreshCw className={`w-3 h-3 ${restoringJhumka ? 'animate-spin' : ''}`} />
              <span>{restoringJhumka ? 'Syncing...' : 'Sync & Ensure Active'}</span>
            </button>
          </div>

        </div>

        {/* Alert banner if category is missing */}
        {!jhumkaCat && (
          <div className="relative z-10 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <strong className="block text-xs font-bold">Jhumka Boxes Category is currently missing!</strong>
                <span className="text-[11px] text-amber-800 font-light">
                  Click the button below to automatically restore the category and reconnect your viral 4 boxes to the homepage.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRestoreJhumka}
              disabled={restoringJhumka}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-caps tracking-wider uppercase font-bold shrink-0 shadow-sm"
            >
              {restoringJhumka ? 'Restoring...' : '⚡ Restore Category Now'}
            </button>
          </div>
        )}
      </section>

      {/* Info Banner */}
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
        <span>Categories with assigned products cannot be deleted. Reassign all products to another category first.</span>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-3xl border border-brand-border overflow-hidden shadow-sm">
        <div className="p-4 border-b border-brand-border bg-[#FAF8FC] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-brand-primary" />
            <h3 className="text-xs font-caps tracking-wider uppercase font-bold text-brand-tertiary">
              All Store Categories ({categories.length})
            </h3>
          </div>
          <span className="text-[11px] text-brand-muted font-light">
            Drag order or toggle storefront display per category
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8FC] border-b border-brand-border text-brand-muted font-caps tracking-wider text-[10px] uppercase">
              <tr>
                <th className="py-3.5 px-4">Order</th>
                <th className="py-3.5 px-4">Category Name</th>
                <th className="py-3.5 px-4">URL Slug</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Products</th>
                <th className="py-3.5 px-4">Storefront Display</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-muted">
                    Loading categories...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-muted">
                    No categories found.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => {
                  const isJhumka = cat.slug === 'jhumka-boxes';
                  return (
                    <tr key={cat.id} className={`transition-colors ${isJhumka ? 'bg-purple-50/30 hover:bg-purple-50/50' : 'hover:bg-[#FAF8FC]'}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <GripVertical className="w-3.5 h-3.5 text-brand-muted/40" />
                          <span className="font-mono text-[10px] text-brand-muted">#{cat.display_order}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {isJhumka && <Flame className="w-3.5 h-3.5 text-brand-gold shrink-0" />}
                          <span className="font-semibold text-brand-tertiary">{cat.name}</span>
                          {isJhumka && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-primary text-white uppercase tracking-wider">
                              Core Hero
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-[10px] text-brand-muted bg-gray-100 px-2 py-0.5 rounded">
                          /{cat.slug}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <span className="text-brand-muted truncate block" title={cat.description}>
                          {cat.description || '—'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <Package className="w-3 h-3 text-brand-muted" />
                          <span className="font-semibold text-brand-tertiary">
                            {cat.product_count ?? 0}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <label className="inline-flex items-center space-x-2 cursor-pointer select-none group py-1">
                          <input
                            type="checkbox"
                            checked={Number(cat.is_active) === 1}
                            onChange={() => handleToggleActive(cat)}
                            disabled={togglingId === cat.id}
                            className="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer accent-brand-primary transition-all disabled:opacity-50"
                          />
                          <span
                            className={`text-[11px] font-semibold transition-colors ${
                              Number(cat.is_active) === 1
                                ? 'text-emerald-700 font-bold'
                                : 'text-gray-400 font-medium'
                            }`}
                          >
                            {Number(cat.is_active) === 1 ? 'Show on Storefront' : 'Hidden'}
                          </span>
                        </label>
                      </td>

                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        {!isStaff && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(cat)}
                              className="p-1.5 text-brand-muted hover:text-brand-primary hover:bg-brand-primary-light/50 rounded-lg transition-colors"
                              title="Edit Category"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {isJhumka ? (
                              <span
                                className="inline-flex items-center space-x-1 p-1.5 text-brand-primary bg-purple-100/70 rounded-lg text-[10px] font-bold"
                                title="Protected Core System Category: Cannot be deleted"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden sm:inline">Protected</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleDelete(cat.id, cat.name, cat.product_count, cat.slug)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  cat.product_count > 0
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-brand-muted hover:text-rose-600 hover:bg-rose-50'
                                }`}
                                title={cat.product_count > 0 ? 'Cannot delete: has products' : 'Delete Category'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
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
      {/* CATEGORY EDITOR MODAL */}
      {/* ========================================================================= */}
      {editingCat && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-brand-border shadow-luxury space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-brand-border">
              <div>
                <span className="text-[10px] font-caps tracking-widest uppercase text-brand-primary font-bold">
                  {editingCat.id ? 'Edit Category' : 'New Category'}
                </span>
                <h3 className="text-xl font-editorial font-bold text-brand-tertiary">
                  {editingCat.id ? editingCat.name : 'Create New Category'}
                </h3>
              </div>
              <button
                onClick={() => setEditingCat(null)}
                className="p-2 text-brand-muted hover:text-brand-tertiary rounded-xl hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              {/* Name */}
              <div className="space-y-1">
                <label className="font-semibold text-brand-tertiary">Category Name *</label>
                <input
                  type="text"
                  required
                  value={editingCat.name || ''}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Bangles & Kadas"
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary"
                />
              </div>

              {/* Slug */}
              <div className="space-y-1">
                <label className="font-semibold text-brand-tertiary">
                  URL Slug
                  <span className="ml-1 text-brand-muted font-normal">(auto-generated, editable)</span>
                </label>
                <div className="flex items-center bg-[#FAF8FC] border border-brand-border rounded-xl overflow-hidden">
                  <span className="px-3 py-2 text-brand-muted bg-gray-50 border-r border-brand-border">/</span>
                  <input
                    type="text"
                    value={editingCat.slug || ''}
                    disabled={editingCat.slug === 'jhumka-boxes'}
                    onChange={(e) =>
                      setEditingCat((prev) => ({
                        ...prev,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                      }))
                    }
                    className="flex-1 bg-transparent px-3 py-2 text-brand-tertiary font-mono focus:outline-none disabled:opacity-60"
                  />
                </div>
                {editingCat.slug === 'jhumka-boxes' && (
                  <span className="text-[10px] text-brand-primary font-semibold">
                    * The slug "jhumka-boxes" is locked because it links directly to the homepage hero ad module.
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-semibold text-brand-tertiary">Description (optional)</label>
                <textarea
                  rows={2}
                  value={editingCat.description || ''}
                  onChange={(e) => setEditingCat((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Short description shown on category pages"
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary"
                />
              </div>

              {/* Display Order */}
              <div className="space-y-1">
                <label className="font-semibold text-brand-tertiary">Display Order</label>
                <input
                  type="number"
                  min="1"
                  value={editingCat.display_order || 1}
                  onChange={(e) =>
                    setEditingCat((prev) => ({ ...prev, display_order: parseInt(e.target.value, 10) }))
                  }
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary font-mono"
                />
              </div>

              {/* Show on Storefront Checkbox */}
              <div className="flex items-center space-x-3 p-3.5 bg-[#FAF8FC] border border-brand-border rounded-xl">
                <input
                  type="checkbox"
                  id="cat-is-active-check"
                  checked={Number(editingCat.is_active ?? 1) === 1}
                  onChange={(e) =>
                    setEditingCat((prev) => ({ ...prev, is_active: e.target.checked ? 1 : 0 }))
                  }
                  className="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer accent-brand-primary"
                />
                <label htmlFor="cat-is-active-check" className="cursor-pointer text-xs font-semibold text-brand-tertiary select-none">
                  Show on Storefront (Header, Navigation & Catalog)
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setEditingCat(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-brand-tertiary text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-6 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold transition-colors shadow-md disabled:opacity-50"
                >
                  {modalSaving ? 'Saving...' : editingCat.id ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-brand-border shadow-luxury space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-editorial font-bold text-brand-tertiary">Delete Category</h3>
              <p className="text-xs text-brand-muted">
                Are you sure you want to delete category <span className="font-semibold text-brand-tertiary">"{deletingCategory.name}"</span>?
              </p>
              <p className="text-[11px] text-brand-muted/80">
                This category has 0 assigned products and can be safely deleted.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-brand-border text-xs font-semibold text-brand-tertiary hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCategory}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
