import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Filter, Copy, Trash2, Edit2, Star,
  UploadCloud, Check, X, AlertCircle, Video, RefreshCw,
  Flame, Download, Upload, GripVertical, Globe, ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { adminApi } from './adminApi';

// ─── Sortable Image Tile ───────────────────────────────────────────────────────
function SortableImageTile({ img, index, onRemove, onSetPrimary }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: img.id || `img-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const url = typeof img === 'string' ? img : img.image_url;
  const isPrimary = img.is_primary || index === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative w-20 h-20 rounded-xl overflow-hidden border-2 group shrink-0 select-none"
      style={{ ...style, borderColor: isPrimary ? '#8366B0' : '#e5e7eb' }}
    >
      <img src={url} alt={`Product image ${index + 1}`} className="w-full h-full object-cover" />

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-0 left-0 right-0 h-6 flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity"
      >
        <GripVertical className="w-3 h-3 text-white" />
      </div>

      {/* Primary badge */}
      {isPrimary && (
        <span className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-bold bg-brand-primary text-white py-0.5">
          PRIMARY
        </span>
      )}

      {/* Hover overlay: Set Primary + Remove */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
        {!isPrimary && (
          <button
            type="button"
            onClick={() => onSetPrimary(index)}
            className="text-[9px] font-bold text-yellow-300 hover:text-yellow-100 whitespace-nowrap"
            title="Set as primary image"
          >
            ⭐ Set Primary
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="bg-rose-600 text-white rounded-full p-0.5"
          title="Remove image"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AdminProductsView({ currentUser }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [inlineEditingStockId, setInlineEditingStockId] = useState(null);
  const [inlineStockVal, setInlineStockVal] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [seoOpen, setSeoOpen] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const csvImportRef = useRef(null);

  const isStaff = currentUser?.role === 'staff';

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // ── Load categories for dynamic dropdown ──────────────────────────────────
  const loadCategories = async () => {
    try {
      const data = await adminApi.getCategories();
      setCategories(data || []);
    } catch {
      // Fallback — keep empty; product editor will degrade gracefully
    }
  };

  // ── Load products ─────────────────────────────────────────────────────────
  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getProducts({ search, category: categoryFilter });
      setProducts(res || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { loadProducts(); }, [categoryFilter]);

  const handleSearchSubmit = (e) => { e.preventDefault(); loadProducts(); };

  // ── Inline Stock Update ───────────────────────────────────────────────────
  const handleSaveStock = async (productId) => {
    const qty = parseInt(inlineStockVal, 10);
    if (isNaN(qty) || qty < 0) return;
    try {
      await adminApi.updateStock(productId, qty);
      setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, stock_quantity: qty } : p));
      setInlineEditingStockId(null);
      showToast('Stock updated');
    } catch (err) {
      showToast(err.message || 'Failed to update stock');
    }
  };

  // ── Duplicate ─────────────────────────────────────────────────────────────
  const handleDuplicate = async (productId) => {
    try {
      const res = await adminApi.duplicateProduct(productId);
      showToast(`Duplicated as "${res.name}"`);
      loadProducts();
    } catch (err) {
      showToast(err.message || 'Duplicate failed');
    }
  };

  const [deletingProduct, setDeletingProduct] = useState(null);

  const notifyCatalogChange = () => {
    window.dispatchEvent(new CustomEvent('valerie_categories_updated'));
    window.dispatchEvent(new CustomEvent('valerie_catalog_updated'));
    try {
      localStorage.setItem('valerie_categories_updated', Date.now().toString());
      localStorage.setItem('valerie_catalog_updated', Date.now().toString());
    } catch {
      // ignore
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const confirmDeleteProduct = async () => {
    if (!deletingProduct) return;
    const { id, name } = deletingProduct;
    setDeletingProduct(null);
    try {
      const res = await adminApi.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast(res?.message || `"${name}" removed successfully`);
      notifyCatalogChange();
    } catch (err) {
      showToast(err.message || 'Delete failed');
    }
  };

  // ── Open Editor ───────────────────────────────────────────────────────────
  const handleOpenEdit = async (product) => {
    try {
      const full = await adminApi.getProduct(product.id);
      setEditingProduct(full);
    } catch {
      setEditingProduct(product);
    }
    setModalError('');
    setSeoOpen(false);
  };

  // ── Save Product ──────────────────────────────────────────────────────────
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalSaving(true);
    setModalError('');
    try {
      if (editingProduct.id) {
        await adminApi.updateProduct(editingProduct);
        showToast('Product saved');
      } else {
        await adminApi.createProduct(editingProduct);
        showToast('Product created');
      }
      setEditingProduct(null);
      loadProducts();
      notifyCatalogChange();
    } catch (err) {
      setModalError(err.message || 'Failed to save product');
    } finally {
      setModalSaving(false);
    }
  };

  // ── Media Upload ──────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    try {
      const res = await adminApi.uploadMedia(file);
      if (res.is_video) {
        setEditingProduct((prev) => ({ ...prev, video_url: res.url }));
        showToast('Demo video uploaded');
      } else {
        const existing = editingProduct.images || [];
        const newImg = {
          id: `new-${Date.now()}`,
          image_url: res.url,
          display_order: existing.length,
          is_primary: existing.length === 0 ? 1 : 0,
        };
        setEditingProduct((prev) => ({ ...prev, images: [...existing, newImg] }));
        showToast('Image uploaded');
      }
    } catch (err) {
      showToast(err.message || 'Upload failed');
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  // ── Image Drag-to-Reorder ─────────────────────────────────────────────────
  const handleImageDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const images = editingProduct.images || [];
    const ids = images.map((img, i) => img.id || `img-${i}`);
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    const reordered = arrayMove(images, oldIndex, newIndex).map((img, i) => ({
      ...img,
      display_order: i,
      is_primary: i === 0 ? 1 : 0,
    }));
    setEditingProduct((prev) => ({ ...prev, images: reordered }));
  };

  // ── Set Primary Image ─────────────────────────────────────────────────────
  const handleSetPrimary = (primaryIndex) => {
    const images = (editingProduct.images || []).map((img, i) => ({
      ...img,
      is_primary: i === primaryIndex ? 1 : 0,
    }));
    // Move primary to front
    const primary = images.splice(primaryIndex, 1)[0];
    images.unshift(primary);
    const reordered = images.map((img, i) => ({ ...img, display_order: i }));
    setEditingProduct((prev) => ({ ...prev, images: reordered }));
  };

  // ── Remove Image ──────────────────────────────────────────────────────────
  const handleRemoveImage = (removeIndex) => {
    const updated = (editingProduct.images || [])
      .filter((_, i) => i !== removeIndex)
      .map((img, i) => ({ ...img, display_order: i, is_primary: i === 0 ? 1 : 0 }));
    setEditingProduct((prev) => ({ ...prev, images: updated }));
  };

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const handleExportCsv = () => {
    const url = adminApi.exportProductsCsvUrl();
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    a.click();
    showToast('CSV download started');
  };

  // ── CSV Import ─────────────────────────────────────────────────────────────
  const handleImportCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingCsv(true);
    showToast('Importing CSV...');
    try {
      const res = await adminApi.importProductsCsv(file);
      showToast(`✅ ${res.created} created, ${res.updated} updated${res.errors?.length ? `, ${res.errors.length} errors` : ''}`);
      loadProducts();
    } catch (err) {
      showToast(err.message || 'CSV import failed');
    } finally {
      setImportingCsv(false);
      e.target.value = '';
    }
  };

  // ── Auto-generate slug from name ──────────────────────────────────────────
  const handleNameChange = (name) => {
    setEditingProduct((prev) => ({
      ...prev,
      name,
      slug: prev.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      meta_title: prev.meta_title || `${name} | Valerie Jewels`,
    }));
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 w-full">
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
            Catalog Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-brand-tertiary mt-1">
            Products & Inventory Control
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* CSV Toolbar (admin only) */}
          {!isStaff && (
            <>
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-colors"
                title="Export all products to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-semibold transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{importingCsv ? 'Importing...' : 'Import CSV'}</span>
                <input
                  ref={csvImportRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleImportCsv}
                  className="hidden"
                  disabled={importingCsv}
                />
              </label>
            </>
          )}

          <button
            onClick={() =>
              setEditingProduct({
                name: '', sku: '', price: '', mrp: '', cost_price: '',
                category_id: categories[0]?.id || 1,
                stock_quantity: 50, is_anti_tarnish: 1,
                pairs_count: 6,
                material: '18K Gold Plated Stainless Steel',
                is_bestseller: 0, short_description: '', description: '',
                slug: '', meta_title: '', meta_description: '', images: [],
              })
            }
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-wider uppercase font-bold transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-brand-border flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, or tag..."
            className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2 pl-9 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
          />
          <Search className="w-3.5 h-3.5 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setCategoryFilter('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
              categoryFilter === ''
                ? 'bg-brand-primary text-white font-semibold shadow-xs'
                : 'bg-[#FAF8FC] text-brand-tertiary hover:bg-brand-primary-light'
            }`}
          >
            All
          </button>
          {/* Jhumka Boxes special pill */}
          <button
            onClick={() => setCategoryFilter('jhumka-boxes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap flex items-center space-x-1 ${
              categoryFilter === 'jhumka-boxes'
                ? 'bg-rose-500 text-white font-semibold shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <span>🔥 4 Jhumka Boxes</span>
          </button>
          {/* Dynamic category pills from API */}
          {categories
            .filter((c) => c.slug !== 'jhumka-boxes')
            .map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.slug)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                  categoryFilter === cat.slug
                    ? 'bg-brand-primary text-white font-semibold'
                    : 'bg-[#FAF8FC] text-brand-tertiary hover:bg-brand-primary-light'
                }`}
              >
                {cat.name}
              </button>
            ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-brand-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8FC] border-b border-brand-border text-brand-muted font-caps tracking-wider text-[10px] uppercase">
              <tr>
                <th className="py-3.5 px-4">Item & SKU</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Selling Price</th>
                <th className="py-3.5 px-4">Stock (Quick Edit)</th>
                <th className="py-3.5 px-4">Status / Ad Hero</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-brand-muted">
                    Loading catalog inventory...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-brand-muted">
                    No products found matching criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isJhumkaBox = p.category_slug === 'jhumka-boxes' || (p.sku && p.sku.startsWith('VJ-JHM'));
                  const isLow = Number(p.stock_quantity) <= 25;

                  return (
                    <tr key={p.id} className="hover:bg-[#FAF8FC] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={p.primary_image || 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=200&q=80'}
                            alt={p.name}
                            className="w-12 h-12 rounded-xl object-cover border border-brand-border shrink-0"
                          />
                          <div className="min-w-0 max-w-xs">
                            <div className="font-semibold text-brand-tertiary truncate" title={p.name}>{p.name}</div>
                            <div className="text-[10px] text-brand-muted font-mono">{p.sku}</div>
                            {p.video_url && (
                              <span className="inline-flex items-center space-x-1 text-[9px] text-brand-primary mt-0.5">
                                <Video className="w-2.5 h-2.5" />
                                <span>Try-on video linked</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800">
                          {p.category_name || 'Jewelry'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-brand-tertiary">₹{Number(p.price).toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-brand-muted line-through">₹{Number(p.mrp).toLocaleString('en-IN')}</div>
                      </td>

                      <td className="py-3 px-4">
                        {inlineEditingStockId === p.id ? (
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="number" min="0"
                              value={inlineStockVal}
                              onChange={(e) => setInlineStockVal(e.target.value)}
                              className="w-16 px-2 py-1 bg-white border border-brand-primary rounded text-xs font-mono"
                              autoFocus
                            />
                            <button onClick={() => handleSaveStock(p.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setInlineEditingStockId(null)} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => { setInlineEditingStockId(p.id); setInlineStockVal(p.stock_quantity); }}
                            className="inline-flex items-center space-x-1 cursor-pointer group p-1 rounded hover:bg-gray-100 transition-colors"
                            title="Click to edit stock"
                          >
                            <span className={`font-mono font-bold ${isLow ? 'text-rose-600' : 'text-brand-tertiary'}`}>
                              {p.stock_quantity}
                            </span>
                            {isLow && <span className="text-[9px] text-rose-500">LOW</span>}
                            <span className="text-[10px] text-brand-muted opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 space-y-1">
                        {isJhumkaBox && (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Flame className="w-2.5 h-2.5 text-amber-600" />
                              <span>Ad Hero Box</span>
                            </span>
                            <div className="text-[10px] font-bold text-brand-primary">
                              {p.pairs_count || (p.name.match(/(\d+)\s*Pair/i)?.[1] || 6)} Pairs Inside
                            </div>
                          </div>
                        )}
                        <div>
                          {Number(p.is_bestseller) === 1 ? (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-700">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>Bestseller</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-brand-muted">Standard</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-brand-muted hover:text-brand-primary hover:bg-brand-primary-light/50 rounded-lg transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(p.id)}
                          className="p-1.5 text-brand-muted hover:text-brand-primary hover:bg-brand-primary-light/50 rounded-lg transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {!isStaff && (
                          <button
                            onClick={() => setDeletingProduct({ id: p.id, name: p.name })}
                            className="p-1.5 text-brand-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete (Admin Only)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
      {/* PRODUCT EDITOR MODAL */}
      {/* ========================================================================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 border border-brand-border shadow-luxury space-y-6 my-8 animate-in fade-in zoom-in-95">

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-brand-border">
              <div>
                <span className="text-[10px] font-caps tracking-widest uppercase text-brand-primary font-bold">
                  {editingProduct.id ? 'Edit Catalog Item' : 'New Catalog Item'}
                </span>
                <h3 className="text-xl font-editorial font-bold text-brand-tertiary">
                  {editingProduct.id ? editingProduct.name || 'Edit Product' : 'Create New Jewelry Piece'}
                </h3>
              </div>
              <button onClick={() => setEditingProduct(null)} className="p-2 text-brand-muted hover:text-brand-tertiary rounded-xl hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            {isStaff && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                ⚠️ Staff Account: Price and MRP fields are read-only.
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-5 text-xs">

              {/* Row 1: Name & SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-brand-tertiary">Product Title *</label>
                  <input
                    type="text" required
                    value={editingProduct.name || ''}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-brand-tertiary">SKU Code *</label>
                  <input
                    type="text" required
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary font-mono"
                  />
                </div>
              </div>

              {/* Row 2: Category, Stock, Pairs Count, Material */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1 sm:col-span-1">
                  <label className="font-semibold text-brand-tertiary">Category</label>
                  <select
                    value={editingProduct.category_id || categories[0]?.id || 1}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category_id: parseInt(e.target.value, 10) })}
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary text-xs"
                  >
                    {categories.length > 0 ? (
                      categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.slug === 'jhumka-boxes' ? '🔥 ' : ''}{cat.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value={1}>Necklaces</option>
                        <option value={2}>Rings</option>
                        <option value={3}>Earrings</option>
                        <option value={4}>Bracelets</option>
                        <option value={5}>Combos & Sets</option>
                        <option value={6}>🔥 Jhumka Boxes</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-brand-tertiary">Stock Quantity</label>
                  <input
                    type="number" min="0" required
                    value={editingProduct.stock_quantity ?? 50}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock_quantity: parseInt(e.target.value, 10) })}
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-brand-tertiary flex items-center justify-between">
                    <span>Pairs Inside</span>
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1 rounded">Boxes</span>
                  </label>
                  <input
                    type="number" min="1" max="50"
                    value={editingProduct.pairs_count ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, pairs_count: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                    placeholder="e.g. 6 (or 5)"
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-brand-tertiary">Material</label>
                  <input
                    type="text"
                    value={editingProduct.material || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, material: e.target.value })}
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary text-xs"
                  />
                </div>
              </div>

              {/* Jhumka Box Hero Showcase Dedicated Configuration Banner */}
              {(editingProduct.category_id === 6 ||
                categories.find((c) => c.id === editingProduct.category_id)?.slug === 'jhumka-boxes' ||
                editingProduct.name?.toLowerCase().includes('jhumka') ||
                editingProduct.sku?.startsWith('VJ-JHM')) && (
                <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
                  <div className="space-y-0.5">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900">
                      <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>4 Signature Jhumka Boxes Ad Showcase Configuration</span>
                    </div>
                    <p className="text-[11px] text-amber-800 font-light">
                      Badge on card: <strong className="font-semibold underline">"{editingProduct.pairs_count || (editingProduct.name?.match(/(\d+)\s*Pair/i)?.[1] || 6)} Pairs Inside"</strong> • Automatic per-pair value calculation: <strong className="font-semibold">₹{editingProduct.price ? Math.round(Number(editingProduct.price) / (Number(editingProduct.pairs_count) || Number(editingProduct.name?.match(/(\d+)\s*Pair/i)?.[1]) || 6)) : 0}/pair</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-[11px] font-semibold text-amber-900">Pairs inside box:</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={editingProduct.pairs_count ?? (editingProduct.name?.match(/(\d+)\s*Pair/i)?.[1] || 6)}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          pairs_count: e.target.value === '' ? '' : parseInt(e.target.value, 10),
                        })
                      }
                      className="w-16 bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-center font-mono font-bold text-amber-900 shadow-2xs focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
              )}

              {/* Row 3: Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-brand-tertiary">Selling Price (₹) *</label>
                  <input
                    type="number" step="0.01" disabled={isStaff} required
                    value={editingProduct.price || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    className={`w-full border border-brand-border rounded-xl px-3 py-2 font-mono ${isStaff ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-[#FAF8FC] text-brand-tertiary'}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-brand-tertiary">MRP / Strike Price (₹)</label>
                  <input
                    type="number" step="0.01" disabled={isStaff}
                    value={editingProduct.mrp || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, mrp: e.target.value })}
                    className={`w-full border border-brand-border rounded-xl px-3 py-2 font-mono ${isStaff ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-[#FAF8FC] text-brand-tertiary'}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-brand-tertiary">Cost Price (₹)</label>
                  <input
                    type="number" step="0.01" disabled={isStaff}
                    value={editingProduct.cost_price || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, cost_price: e.target.value })}
                    className={`w-full border border-brand-border rounded-xl px-3 py-2 font-mono ${isStaff ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-[#FAF8FC] text-brand-tertiary'}`}
                  />
                </div>
              </div>

              {/* Row 4: Descriptions */}
              <div className="space-y-1">
                <label className="font-semibold text-brand-tertiary">Short Ad Hook / Summary</label>
                <input
                  type="text"
                  value={editingProduct.short_description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, short_description: e.target.value })}
                  placeholder="e.g. 6 handcrafted antique gold & pearl jhumka pairs..."
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-brand-tertiary">Detailed Description</label>
                <textarea
                  rows={3}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary"
                />
              </div>

              {/* Row 5: Media — Drag-to-Reorder + Upload */}
              <div className="space-y-3 pt-2 border-t border-brand-border">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-brand-tertiary">Product Images & Video</span>
                    <p className="text-[10px] text-brand-muted mt-0.5">Drag to reorder · First image = primary storefront image · ⭐ to set primary</p>
                  </div>
                  <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-[#FAF8FC] hover:bg-brand-primary-light text-brand-primary border border-brand-border text-xs font-semibold transition-colors">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{uploadingMedia ? 'Uploading...' : 'Upload'}</span>
                    <input
                      type="file" accept="image/*,video/mp4,video/quicktime"
                      onChange={handleFileUpload} className="hidden" disabled={uploadingMedia}
                    />
                  </label>
                </div>

                {/* Sortable Image Grid */}
                {editingProduct.images && editingProduct.images.length > 0 && (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
                    <SortableContext
                      items={editingProduct.images.map((img, i) => img.id || `img-${i}`)}
                      strategy={horizontalListSortingStrategy}
                    >
                      <div className="flex flex-wrap gap-2 pt-1">
                        {editingProduct.images.map((img, idx) => (
                          <SortableImageTile
                            key={img.id || `img-${idx}`}
                            img={img}
                            index={idx}
                            onRemove={handleRemoveImage}
                            onSetPrimary={handleSetPrimary}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                {/* Video URL */}
                <div className="space-y-1">
                  <label className="text-[11px] text-brand-muted flex items-center space-x-1">
                    <Video className="w-3 h-3" />
                    <span>Video URL (Demo / Unboxing / Try-On)</span>
                  </label>
                  <input
                    type="url"
                    value={editingProduct.video_url || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, video_url: e.target.value })}
                    placeholder="https://... or upload above"
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-tertiary"
                  />
                </div>
              </div>

              {/* Row 6: Toggles */}
              <div className="flex flex-wrap gap-6 pt-2 border-t border-brand-border">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingProduct.is_bestseller}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_bestseller: e.target.checked ? 1 : 0 })}
                    className="rounded text-brand-primary focus:ring-brand-primary"
                  />
                  <span className="text-brand-tertiary font-medium">Bestseller Spotlight Flag</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingProduct.is_anti_tarnish}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_anti_tarnish: e.target.checked ? 1 : 0 })}
                    className="rounded text-brand-primary focus:ring-brand-primary"
                  />
                  <span className="text-brand-tertiary font-medium">18K Anti-Tarnish Certified</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.is_active !== 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_active: e.target.checked ? 1 : 0 })}
                    className="rounded text-brand-primary focus:ring-brand-primary"
                  />
                  <span className="text-brand-tertiary font-medium">Published (visible on storefront)</span>
                </label>
              </div>

              {/* Row 7: SEO Accordion */}
              <div className="border border-brand-border rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSeoOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#FAF8FC] hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-brand-primary" />
                    <span className="text-xs font-semibold text-brand-tertiary">SEO & Discoverability</span>
                    <span className="text-[10px] text-brand-muted">(slug, meta title, meta description)</span>
                  </div>
                  {seoOpen ? (
                    <ChevronUp className="w-4 h-4 text-brand-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-brand-muted" />
                  )}
                </button>

                {seoOpen && (
                  <div className="p-4 space-y-4 border-t border-brand-border">
                    {/* URL Slug */}
                    <div className="space-y-1">
                      <label className="font-semibold text-brand-tertiary">URL Slug</label>
                      <div className="flex items-center bg-[#FAF8FC] border border-brand-border rounded-xl overflow-hidden">
                        <span className="px-3 py-2 text-brand-muted bg-gray-50 border-r border-brand-border text-xs">/products/</span>
                        <input
                          type="text"
                          value={editingProduct.slug || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                          placeholder="product-url-slug"
                          className="flex-1 bg-transparent px-3 py-2 text-brand-tertiary font-mono text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Meta Title */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-brand-tertiary">Meta Title</label>
                        <span className={`text-[10px] ${(editingProduct.meta_title || '').length > 60 ? 'text-rose-500' : 'text-brand-muted'}`}>
                          {(editingProduct.meta_title || '').length}/60
                        </span>
                      </div>
                      <input
                        type="text"
                        value={editingProduct.meta_title || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, meta_title: e.target.value })}
                        placeholder="Product Name | Valerie Jewels"
                        className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary"
                      />
                    </div>

                    {/* Meta Description */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-brand-tertiary">Meta Description</label>
                        <span className={`text-[10px] ${(editingProduct.meta_description || '').length > 160 ? 'text-rose-500' : 'text-brand-muted'}`}>
                          {(editingProduct.meta_description || '').length}/160
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={editingProduct.meta_description || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, meta_description: e.target.value })}
                        placeholder="Concise product description for search engines and social sharing..."
                        className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary"
                      />
                      <p className="text-[10px] text-brand-muted">Shown in Google search results. Aim for 120–160 characters.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-brand-tertiary text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-6 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold transition-colors shadow-md disabled:opacity-50"
                >
                  {modalSaving ? 'Saving Product...' : 'Save & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-brand-border shadow-luxury space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-editorial font-bold text-brand-tertiary">Delete Product</h3>
              <p className="text-xs text-brand-muted">
                Are you sure you want to delete <span className="font-semibold text-brand-tertiary">"{deletingProduct.name}"</span>?
              </p>
              <p className="text-[11px] text-brand-muted/80">
                Products with order history will be safely archived; un-ordered items will be permanently removed.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-brand-border text-xs font-semibold text-brand-tertiary hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
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
