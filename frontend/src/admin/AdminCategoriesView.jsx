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
} from 'lucide-react';
import { adminApi } from './adminApi';

export default function AdminCategoriesView({ currentUser }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [editingCat, setEditingCat] = useState(null); // null = closed, {} = new, {...} = edit
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');

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
    setEditingCat({ name: '', slug: '', description: '', display_order: categories.length + 1 });
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

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalSaving(true);
    setModalError('');
    try {
      if (editingCat.id) {
        await adminApi.updateCategory(editingCat);
        showToast('Category updated');
      } else {
        await adminApi.createCategory(editingCat);
        showToast('Category created');
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

  const handleDelete = (id, name, productCount) => {
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

  // Auto-generate slug from name
  const handleNameChange = (name) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setEditingCat((prev) => ({ ...prev, name, slug: prev.slug || slug }));
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-tertiary text-white px-4 py-2.5 rounded-xl shadow-luxury text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-caps tracking-widest uppercase text-brand-primary font-bold">
            Catalog Structure
          </span>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-brand-tertiary mt-1">
            Category Management
          </h1>
        </div>
        {!isStaff && (
          <button
            onClick={handleOpenNew}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-wider uppercase font-bold transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        )}
      </div>

      {/* Info Banner */}
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
        ⚠️ Categories with assigned products cannot be deleted. Reassign all products to another category first.
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-3xl border border-brand-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8FC] border-b border-brand-border text-brand-muted font-caps tracking-wider text-[10px] uppercase">
              <tr>
                <th className="py-3.5 px-4">Order</th>
                <th className="py-3.5 px-4">Category Name</th>
                <th className="py-3.5 px-4">URL Slug</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Products</th>
                <th className="py-3.5 px-4">Status</th>
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
                    <tr key={cat.id} className="hover:bg-[#FAF8FC] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <GripVertical className="w-3.5 h-3.5 text-brand-muted/40" />
                          <span className="font-mono text-[10px] text-brand-muted">#{cat.display_order}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {isJhumka && <Flame className="w-3.5 h-3.5 text-rose-500" />}
                          <span className="font-semibold text-brand-tertiary">{cat.name}</span>
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
                        {Number(cat.is_active) === 1 ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-700">
                            <Check className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-brand-muted">Inactive</span>
                        )}
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
                            <button
                              onClick={() => handleDelete(cat.id, cat.name, cat.product_count)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                cat.product_count > 0
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-brand-muted hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title={cat.product_count > 0 ? 'Cannot delete: has products' : 'Delete Category'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
                    onChange={(e) =>
                      setEditingCat((prev) => ({
                        ...prev,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                      }))
                    }
                    className="flex-1 bg-transparent px-3 py-2 text-brand-tertiary font-mono focus:outline-none"
                  />
                </div>
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

              {/* Display Order + Active Toggle */}
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-1">
                  <label className="font-semibold text-brand-tertiary">Status</label>
                  <select
                    value={editingCat.is_active ?? 1}
                    onChange={(e) =>
                      setEditingCat((prev) => ({ ...prev, is_active: parseInt(e.target.value, 10) }))
                    }
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary"
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Hidden</option>
                  </select>
                </div>
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
