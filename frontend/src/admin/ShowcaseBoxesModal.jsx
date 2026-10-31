import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Search,
  X,
  Check,
  ArrowUp,
  ArrowDown,
  Trash2,
  Package,
  Layers,
  AlertCircle,
  Flame,
  Star
} from 'lucide-react';
import { adminApi } from './adminApi';
import { normalizeMediaUrl } from '../utils/mediaUtils';

export default function ShowcaseBoxesModal({
  isOpen,
  onClose,
  currentBoxIds = [],
  onSaved
}) {
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState('');

  // Fetch all products and categories when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [prods, cats] = await Promise.all([
          adminApi.getProducts().catch(() => []),
          adminApi.getCategories().catch(() => [])
        ]);

        if (!isMounted) return;

        const list = Array.isArray(prods) ? prods : (Array.isArray(prods?.data) ? prods.data : []);
        setAllProducts(list);
        setCategories(Array.isArray(cats) ? cats : []);

        // Initialize selected IDs from currentBoxIds prop
        const initial = Array.isArray(currentBoxIds)
          ? currentBoxIds.map(Number).filter(id => id > 0)
          : [];
        setSelectedIds(initial);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load products');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentBoxIds]);

  // Map of products by ID
  const productMap = useMemo(() => {
    const map = new Map();
    allProducts.forEach(p => {
      if (p && p.id) map.set(Number(p.id), p);
    });
    return map;
  }, [allProducts]);

  // Selected products ordered list
  const selectedProducts = useMemo(() => {
    return selectedIds
      .map(id => productMap.get(Number(id)))
      .filter(Boolean);
  }, [selectedIds, productMap]);

  // Filtered products list for selector table
  const filteredProducts = useMemo(() => {
    return allProducts.filter(p => {
      // 1. Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        const skuMatch = (p.sku || '').toLowerCase().includes(q);
        if (!nameMatch && !skuMatch) return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'all') {
        const catSlug = (p.category_slug || '').toLowerCase();
        const catId = String(p.category_id || '');
        if (catSlug !== selectedCategory && catId !== selectedCategory) {
          return false;
        }
      }

      return true;
    });
  }, [allProducts, search, selectedCategory]);

  // Handlers for slot modification
  const handleToggleProduct = (productId) => {
    const id = Number(productId);
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleRemoveSlot = (index) => {
    setSelectedIds(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveUp = (index) => {
    if (index <= 0) return;
    setSelectedIds(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index) => {
    if (index >= selectedIds.length - 1) return;
    setSelectedIds(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // 1. Save to dedicated dashboard endpoint
      await adminApi.saveShowcaseBoxes(selectedIds);

      // 2. Also sync to homepage settings so storefront immediately adopts the selection
      try {
        const currentSettings = await adminApi.getHomepageSettings();
        const jHero = currentSettings?.jhumkaHero || {};
        await adminApi.updateHomepageSettings({
          ...currentSettings,
          jhumkaHero: {
            ...jHero,
            featuredProductIds: selectedIds
          }
        });
      } catch (settingsErr) {
        console.warn('Sync to homepage settings warning:', settingsErr);
      }

      if (onSaved) onSaved(selectedIds);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save showcase products');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl border border-brand-border shadow-2xl max-w-4xl w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-brand-border/60 pb-3 shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-xl bg-purple-50 text-brand-primary border border-purple-200">
                <Sparkles className="w-5 h-5 text-brand-gold fill-current" />
              </div>
              <div>
                <h3 className="font-editorial text-lg font-bold text-brand-tertiary">
                  Select 4 Signature Showcase Boxes
                </h3>
                <p className="text-xs text-brand-muted">
                  Choose which products appear in the Hero Showcase on the Homepage & Executive Telemetry. Bestsellers are managed separately.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Selected Showcase Slots Tray */}
        <div className="bg-[#FAF8FC] border border-brand-border/80 rounded-2xl p-3.5 space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-brand-tertiary">Active Showcase Slots:</span>
              <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                selectedIds.length === 4
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-purple-100 text-brand-primary'
              }`}>
                {selectedIds.length} Products Selected (Recommended: 4 Boxes)
              </span>
            </div>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-[11px] text-rose-600 hover:underline font-semibold"
              >
                Clear All
              </button>
            )}
          </div>

          {selectedProducts.length === 0 ? (
            <div className="py-4 text-center text-xs text-brand-muted border-2 border-dashed border-brand-border rounded-xl">
              No products selected yet. Click any product below to assign it as Box #1, Box #2, etc.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {selectedProducts.map((p, idx) => {
                const imgUrl = normalizeMediaUrl(p.primary_image || (p.images && p.images[0]?.image_url));
                return (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-xl bg-white border border-brand-primary/30 shadow-2xs flex items-center justify-between space-x-2 relative group"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-brand-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </div>
                      <img
                        src={imgUrl || '/v-logo.png'}
                        alt={p.name}
                        className="w-10 h-10 rounded-lg object-cover border border-brand-border shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-brand-tertiary truncate" title={p.name}>
                          {p.name}
                        </p>
                        <p className="text-[10px] text-brand-primary font-mono font-bold">
                          ₹{Number(p.price).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {/* Order Controls & Delete */}
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        title="Move Left / Earlier"
                        className="p-1 rounded text-gray-400 hover:text-brand-primary hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === selectedProducts.length - 1}
                        title="Move Right / Later"
                        className="p-1 rounded text-gray-400 hover:text-brand-primary hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(idx)}
                        title="Remove from showcase"
                        className="p-1 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Search & Category Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search all products by name, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-brand-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-xl text-[11px] font-semibold border transition-all shrink-0 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                  : 'bg-white text-brand-tertiary border-brand-border hover:bg-gray-50'
              }`}
            >
              All Products ({allProducts.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.slug || String(cat.id))}
                className={`px-3 py-1 rounded-xl text-[11px] font-semibold border transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat.slug || selectedCategory === String(cat.id)
                    ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                    : 'bg-white text-brand-tertiary border-brand-border hover:bg-gray-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Products List */}
        <div className="flex-1 overflow-y-auto border border-brand-border rounded-2xl p-2 divide-y divide-brand-border/60 min-h-[240px]">
          {loading ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-brand-muted">Loading product catalog...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-xs text-brand-muted">
              No products found matching "{search}".
            </div>
          ) : (
            filteredProducts.map((prod) => {
              const isSelected = selectedIds.includes(Number(prod.id));
              const slotIndex = selectedIds.indexOf(Number(prod.id));
              const imgUrl = normalizeMediaUrl(prod.primary_image || (prod.images && prod.images[0]?.image_url));

              return (
                <div
                  key={prod.id}
                  onClick={() => handleToggleProduct(prod.id)}
                  className={`p-2.5 rounded-xl transition-all flex items-center justify-between space-x-3 cursor-pointer ${
                    isSelected
                      ? 'bg-purple-50/70 border border-brand-primary/40 shadow-xs'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <img
                      src={imgUrl || '/v-logo.png'}
                      alt={prod.name}
                      className="w-12 h-12 rounded-xl object-cover border border-brand-border shrink-0 bg-white"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                        <span className="text-[10px] text-brand-muted font-mono">{prod.sku || `ID #${prod.id}`}</span>
                        {prod.category_name && (
                          <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                            {prod.category_name}
                          </span>
                        )}
                        {Boolean(prod.is_bestseller) && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center space-x-0.5">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            <span>Bestseller</span>
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-semibold text-brand-tertiary truncate mt-0.5" title={prod.name}>
                        {prod.name}
                      </h4>
                      <div className="text-[11px] text-brand-muted flex items-center space-x-2 mt-0.5">
                        <span className="font-bold text-brand-primary font-mono">
                          ₹{Number(prod.price).toLocaleString('en-IN')}
                        </span>
                        <span>•</span>
                        <span>Stock: {prod.stock_quantity ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    {isSelected ? (
                      <span className="px-3 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-bold flex items-center space-x-1 shadow-xs">
                        <Check className="w-3.5 h-3.5" />
                        <span>Box #{slotIndex + 1}</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-brand-primary hover:text-white text-brand-tertiary text-xs font-semibold transition-all">
                        + Select as Box
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-brand-border/60 flex items-center justify-between shrink-0">
          <div className="text-xs text-brand-muted">
            <span>Selected: </span>
            <strong className="text-brand-tertiary font-bold">{selectedIds.length}</strong> products for showcase
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-brand-border text-xs font-semibold text-brand-tertiary hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <span>Saving Showcase...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Showcase Products ({selectedIds.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

