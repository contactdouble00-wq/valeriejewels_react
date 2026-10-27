import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Filter, Copy, Trash2, Edit2, Star,
  UploadCloud, Check, X, AlertCircle, Video, RefreshCw,
  Flame, Download, Upload, GripVertical, Globe, ChevronDown,
  ChevronUp, Sparkles, Film, Play, Eye, ExternalLink, Zap,
  Layers, Package, Tag, Gift, Image as ImageIcon
} from 'lucide-react';
import ProductAssuranceModal from './ProductAssuranceModal';
import AdminProductPreviewModal from './AdminProductPreviewModal';
import FormattedDescription from '../components/FormattedDescription';
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
import { normalizeMediaUrl, isVideoMedia } from '../utils/mediaUtils';

// ─── Sortable Media Tile (Balanced 1:1 Square & Reels Support) ──────────
function SortableMediaTile({ item, index, onRemove, onSetPrimary, onPreview }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id || `media-${index}` });

  const [mediaDims, setMediaDims] = useState(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const rawUrl = typeof item === 'string' ? item : (item.image_url || item.url);
  const url = normalizeMediaUrl(rawUrl);
  const isVideo = item.media_type === 'video' || isVideoMedia(url);
  const isPrimary = item.is_primary || (!isVideo && index === 0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative w-24 h-24 rounded-xl overflow-hidden border-2 group shrink-0 select-none shadow-2xs transition-all ${
        isPrimary ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-gray-200 hover:border-brand-primary/40'
      }`}
    >
      {isVideo ? (
        <div className="w-full h-full bg-[#181420] flex items-center justify-center relative">
          <video
            src={url}
            muted
            className="w-full h-full object-cover pointer-events-none"
            onLoadedMetadata={(e) => {
              setMediaDims({
                w: e.target.videoWidth,
                h: e.target.videoHeight,
                isHd: e.target.videoHeight >= 1080,
              });
            }}
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-white/90 text-brand-tertiary flex items-center justify-center shadow-xs">
              <Play className="w-3 h-3 fill-current ml-0.5" />
            </div>
          </div>
          <span className="absolute bottom-1 inset-x-0 text-center text-[7.5px] font-extrabold bg-brand-primary text-white tracking-wider py-0.5">
            REEL
          </span>
        </div>
      ) : (
        <div className="w-full h-full bg-gray-50 relative">
          <img
            src={url}
            alt={`Product media ${index + 1}`}
            className="w-full h-full object-cover"
            onLoad={(e) => {
              setMediaDims({
                w: e.target.naturalWidth,
                h: e.target.naturalHeight,
                isHd: e.target.naturalWidth >= 1000 && e.target.naturalHeight >= 1000,
              });
            }}
            onError={(e) => {
              if (e.target.src.includes('/uploads/') && !e.target.src.includes('/api/uploads/')) {
                e.target.src = e.target.src.replace('/uploads/', '/api/uploads/');
              }
            }}
          />
          {isPrimary && (
            <span className="absolute bottom-0 inset-x-0 text-center text-[7.5px] font-bold bg-brand-primary text-white py-0.5">
              PRIMARY
            </span>
          )}
        </div>
      )}

      {/* Resolution Badge on Tile */}
      {mediaDims && (
        <span
          className={`absolute top-1 left-1 px-1 py-0.5 rounded text-[7px] font-mono font-bold tracking-tight shadow-xs z-10 pointer-events-none ${
            mediaDims.isHd
              ? 'bg-emerald-700/90 text-white'
              : mediaDims.w >= 800
              ? 'bg-purple-800/90 text-white'
              : 'bg-amber-600/95 text-white'
          }`}
          title={`${mediaDims.w} × ${mediaDims.h} pixels`}
        >
          {mediaDims.w}×{mediaDims.h}
        </span>
      )}

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-0 left-0 right-0 h-6 flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity z-10"
      >
        <GripVertical className="w-3.5 h-3.5 text-white" />
      </div>

      {/* Hover overlay: View + Dimensions + Set Primary + Remove */}
      <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1 z-20">
        {mediaDims && (
          <div className="text-[7.5px] font-mono text-center text-white/95 leading-tight">
            <span className="font-bold">{mediaDims.w} × {mediaDims.h} px</span>
            {mediaDims.isHd ? (
              <span className="block text-emerald-300 font-bold">✓ High Quality</span>
            ) : mediaDims.w < 800 ? (
              <span className="block text-amber-300 font-bold">⚠️ Low Res (&lt;800px)</span>
            ) : null}
          </div>
        )}

        <button
          type="button"
          onClick={() => onPreview && onPreview(item)}
          className="text-[8.5px] font-bold text-white hover:text-purple-200 bg-white/20 hover:bg-brand-primary px-2 py-0.5 rounded cursor-pointer flex items-center space-x-0.5"
          title="View full image in assurance lightbox"
        >
          <Eye className="w-2.5 h-2.5 mr-0.5" />
          <span>View</span>
        </button>
        {!isPrimary && !isVideo && (
          <button
            type="button"
            onClick={() => onSetPrimary(index)}
            className="text-[8.5px] font-bold text-yellow-300 hover:text-yellow-100 whitespace-nowrap bg-black/50 px-1.5 py-0.5 rounded cursor-pointer"
            title="Set as primary photo"
          >
            ⭐ Primary
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-sm transition-transform active:scale-90 cursor-pointer"
          title="Remove media"
        >
          <X className="w-3 h-3 stroke-[2.5]" />
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
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [seoOpen, setSeoOpen] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [assuranceProduct, setAssuranceProduct] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'live' | 'draft'
  const [togglingLiveId, setTogglingLiveId] = useState(null);
  const [previewProduct, setPreviewProduct] = useState(null);
  const csvImportRef = useRef(null);
  const isStaff = currentUser?.role === 'staff';

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // ── Open Product Visual Assurance Modal ────────────────────────────────────
  const handleOpenAssurance = async (product) => {
    setAssuranceProduct(product);
    try {
      const full = await adminApi.getProduct(product.id);
      if (full && full.id === product.id) {
        setAssuranceProduct((curr) => (curr && curr.id === product.id ? full : curr));
      }
    } catch {
      // Keep initial product if background fetch fails
    }
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

  // ── Toggle Live / Storefront Visibility ──────────────────────────────────
  const handleToggleLive = async (product) => {
    const isCurrentLive = Number(product.is_active) !== 0;
    const nextActive = isCurrentLive ? 0 : 1;
    setTogglingLiveId(product.id);

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_active: nextActive } : p))
    );

    // If currently previewing this product, update preview modal state as well
    setPreviewProduct((prev) => (prev && prev.id === product.id ? { ...prev, is_active: nextActive } : prev));

    try {
      const res = await adminApi.toggleProductLive(product.id, nextActive);
      showToast(
        nextActive === 1
          ? `🟢 "${product.name}" is now Live on Storefront`
          : `⚪ "${product.name}" is now Hidden (Admin preview only)`
      );
      notifyCatalogChange();
    } catch (err) {
      // Revert optimistic update
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_active: isCurrentLive ? 1 : 0 } : p))
      );
      setPreviewProduct((prev) => (prev && prev.id === product.id ? { ...prev, is_active: isCurrentLive ? 1 : 0 } : prev));
      showToast(err.message || 'Failed to update live status');
    } finally {
      setTogglingLiveId(null);
    }
  };

  // ── Open Storefront Product Preview ───────────────────────────────────────
  const handleOpenPreview = async (product) => {
    setPreviewProduct(product);
    try {
      const full = await adminApi.getProduct(product.id);
      if (full && full.id === product.id) {
        setPreviewProduct((curr) => (curr && curr.id === product.id ? full : curr));
      }
    } catch {
      // Retain initial product on failure
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

  // ── Quick Toggle Bestseller Section Spotlight ─────────────────────────────
  const handleToggleBestseller = async (p) => {
    const updatedStatus = Number(p.is_bestseller) === 1 ? 0 : 1;
    try {
      await adminApi.updateProduct({ ...p, is_bestseller: updatedStatus });
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, is_bestseller: updatedStatus } : item))
      );
      showToast(updatedStatus ? `⭐ "${p.name}" added to Bestseller Section` : `Removed "${p.name}" from Bestseller Section`);
      notifyCatalogChange();
    } catch (err) {
      showToast(err.message || 'Failed to update bestseller status');
    }
  };

  // ── Category & Mystery Jar Helper ─────────────────────────────────────────
  const checkIsMysteryJar = (product, catList = categories) => {
    if (!product) return false;
    const cat = catList.find((c) => c.id === product.category_id);
    const catSlug = (cat?.slug || '').toLowerCase();
    const catName = (cat?.name || '').toLowerCase();
    const prodName = (product.name || '').toLowerCase();
    const prodSku = (product.sku || '').toUpperCase();
    return (
      catSlug === 'mystery-jar' ||
      catSlug.includes('mystery') ||
      catName.includes('mystery') ||
      prodName.includes('mystery jar') ||
      prodName.includes('mystery') ||
      prodSku.includes('MJAR')
    );
  };

  // ── Variant & Size Management Handlers ────────────────────────────────────
  const handleAddVariant = (customProps = {}) => {
    setEditingProduct((prev) => {
      if (!prev) return prev;
      const vars = Array.isArray(prev.variants) ? [...prev.variants] : [];
      const idx = vars.length + 1;
      const isMystery = checkIsMysteryJar(prev);
      const baseSku = prev.sku || (isMystery ? 'VJ-MJAR-01' : 'VJ');

      const defaultTitle = isMystery ? `Custom Mystery Jar #${idx}` : `Size ${idx}`;
      const defaultOption = isMystery ? `Jar Tier ${idx}` : `Size ${idx}`;

      const newVar = {
        id: null,
        title: customProps.title || defaultTitle,
        option1_name: customProps.option1_name || 'Size',
        option1_value: customProps.option1_value || defaultOption,
        price: customProps.price !== undefined ? customProps.price : (prev.price || (isMystery ? 599 : '')),
        mrp: customProps.mrp !== undefined ? customProps.mrp : (prev.mrp || (isMystery ? 1199 : '')),
        stock_quantity: customProps.stock_quantity !== undefined ? customProps.stock_quantity : 30,
        sku: customProps.sku || `${baseSku}-T${idx}`,
        is_active: 1,
      };

      const updatedVars = [...vars, newVar];
      const activeVars = updatedVars.filter((v) => Number(v.is_active) !== 0 && v.price);
      let newPrice = prev.price;
      let newMrp = prev.mrp;
      if (activeVars.length > 0) {
        const prices = activeVars.map((v) => Number(v.price)).filter((n) => !isNaN(n) && n > 0);
        if (prices.length > 0) {
          newPrice = Math.min(...prices);
          const minVar = activeVars.find((v) => Number(v.price) === newPrice);
          if (minVar && minVar.mrp) newMrp = minVar.mrp;
        }
      }

      return { ...prev, variants: updatedVars, price: newPrice, mrp: newMrp };
    });
  };

  const handleUpdateVariant = (index, field, value) => {
    setEditingProduct((prev) => {
      if (!prev) return prev;
      const vars = Array.isArray(prev.variants) ? [...prev.variants] : [];
      if (!vars[index]) return prev;
      vars[index] = { ...vars[index], [field]: value };
      if (field === 'title' && (!vars[index].option1_value || vars[index].option1_value === vars[index].title)) {
        vars[index].option1_value = value;
      }

      const activeVars = vars.filter((v) => Number(v.is_active) !== 0 && v.price);
      let newPrice = prev.price;
      let newMrp = prev.mrp;
      let newStock = prev.stock_quantity;

      if (activeVars.length > 0) {
        const prices = activeVars.map((v) => Number(v.price)).filter((n) => !isNaN(n) && n > 0);
        if (prices.length > 0) {
          newPrice = Math.min(...prices);
          const matchingVar = activeVars.find((v) => Number(v.price) === newPrice);
          if (matchingVar && matchingVar.mrp) newMrp = matchingVar.mrp;
        }
        const totalStock = vars.reduce((acc, v) => acc + (parseInt(v.stock_quantity, 10) || 0), 0);
        if (totalStock > 0) newStock = totalStock;
      }

      return { ...prev, variants: vars, price: newPrice, mrp: newMrp, stock_quantity: newStock };
    });
  };

  const handleRemoveVariant = (index) => {
    setEditingProduct((prev) => {
      if (!prev) return prev;
      const vars = Array.isArray(prev.variants) ? [...prev.variants] : [];
      vars.splice(index, 1);

      const activeVars = vars.filter((v) => Number(v.is_active) !== 0 && v.price);
      let newPrice = prev.price;
      let newMrp = prev.mrp;
      let newStock = prev.stock_quantity;

      if (activeVars.length > 0) {
        const prices = activeVars.map((v) => Number(v.price)).filter((n) => !isNaN(n) && n > 0);
        if (prices.length > 0) {
          newPrice = Math.min(...prices);
          const matchingVar = activeVars.find((v) => Number(v.price) === newPrice);
          if (matchingVar && matchingVar.mrp) newMrp = matchingVar.mrp;
        }
        const totalStock = vars.reduce((acc, v) => acc + (parseInt(v.stock_quantity, 10) || 0), 0);
        if (totalStock > 0) newStock = totalStock;
      }

      return { ...prev, variants: vars, price: newPrice, mrp: newMrp, stock_quantity: newStock };
    });
  };

  const handleApplyMysteryJarPreset = () => {
    const baseSku = editingProduct?.sku && editingProduct.sku !== 'VJ' ? editingProduct.sku : 'VJ-MJAR-01';
    const presetVariants = [
      {
        id: null,
        title: 'Mini Mystery Jar (5 Surprise Pieces)',
        option1_name: 'Size',
        option1_value: 'Mini (5 Pieces)',
        price: 499,
        mrp: 999,
        stock_quantity: 50,
        sku: `${baseSku}-MINI`,
        is_active: 1,
      },
      {
        id: null,
        title: 'Classic Mystery Jar (10 Surprise Pieces)',
        option1_name: 'Size',
        option1_value: 'Classic (10 Pieces)',
        price: 899,
        mrp: 1799,
        stock_quantity: 50,
        sku: `${baseSku}-CLASSIC`,
        is_active: 1,
      },
      {
        id: null,
        title: 'Grand Mystery Jar (18 Surprise Pieces)',
        option1_name: 'Size',
        option1_value: 'Grand (18 Pieces)',
        price: 1499,
        mrp: 2999,
        stock_quantity: 30,
        sku: `${baseSku}-GRAND`,
        is_active: 1,
      },
    ];

    setEditingProduct((prev) => ({
      ...prev,
      price: 499,
      mrp: 999,
      stock_quantity: 130,
      variants: presetVariants,
    }));
    showToast('✨ Mystery Jar 3-tier preset applied (Mini ₹499, Classic ₹899, Grand ₹1499)');
  };

  const handleApplyStandardSizesPreset = () => {
    const baseSku = editingProduct?.sku || 'VJ-SZ';
    const presetVariants = [
      {
        id: null,
        title: 'Small',
        option1_name: 'Size',
        option1_value: 'Small',
        price: editingProduct?.price || 499,
        mrp: editingProduct?.mrp || 999,
        stock_quantity: 30,
        sku: `${baseSku}-SM`,
        is_active: 1,
      },
      {
        id: null,
        title: 'Medium',
        option1_name: 'Size',
        option1_value: 'Medium',
        price: editingProduct?.price ? Number(editingProduct.price) + 200 : 699,
        mrp: editingProduct?.mrp ? Number(editingProduct.mrp) + 400 : 1399,
        stock_quantity: 30,
        sku: `${baseSku}-MD`,
        is_active: 1,
      },
      {
        id: null,
        title: 'Large',
        option1_name: 'Size',
        option1_value: 'Large',
        price: editingProduct?.price ? Number(editingProduct.price) + 400 : 899,
        mrp: editingProduct?.mrp ? Number(editingProduct.mrp) + 800 : 1799,
        stock_quantity: 20,
        sku: `${baseSku}-LG`,
        is_active: 1,
      },
    ];

    setEditingProduct((prev) => ({
      ...prev,
      variants: presetVariants,
    }));
    showToast('📦 Standard Small / Medium / Large sizes preset applied');
  };

  const handleCategoryChange = (catId) => {
    const selectedCat = categories.find((c) => c.id === catId);
    const isMystery =
      selectedCat?.slug === 'mystery-jar' ||
      (selectedCat?.name || '').toLowerCase().includes('mystery');

    setEditingProduct((prev) => {
      if (!prev) return prev;
      const baseSku = prev.sku && prev.sku !== 'VJ' ? prev.sku : (isMystery ? 'VJ-MJAR-01' : 'VJ');
      const currentVars = Array.isArray(prev.variants) ? prev.variants : [];

      let newVariants = currentVars;
      let newPrice = prev.price;
      let newMrp = prev.mrp;
      let newStock = prev.stock_quantity;
      let newMaterial = prev.material;
      let newPairsCount = prev.pairs_count;

      if (isMystery) {
        newPairsCount = null; // No earring box pairs for mystery jars
        if (!newMaterial || newMaterial === '18K Gold Plated Stainless Steel' || newMaterial === 'Lightweight Stainless Steel' || newMaterial.includes('Anti-Tarnish')) {
          newMaterial = 'Assorted Beads, Chains & Accessories in Glass Jar';
        }
        if (currentVars.length === 0) {
          newVariants = [
            {
              id: null,
              title: 'Mini Mystery Jar (5 Surprise Pieces)',
              option1_name: 'Size',
              option1_value: 'Mini (5 Pieces)',
              price: 499,
              mrp: 999,
              stock_quantity: 50,
              sku: `${baseSku}-MINI`,
              is_active: 1,
            },
            {
              id: null,
              title: 'Classic Mystery Jar (10 Surprise Pieces)',
              option1_name: 'Size',
              option1_value: 'Classic (10 Pieces)',
              price: 899,
              mrp: 1799,
              stock_quantity: 50,
              sku: `${baseSku}-CLASSIC`,
              is_active: 1,
            },
            {
              id: null,
              title: 'Grand Mystery Jar (18 Surprise Pieces)',
              option1_name: 'Size',
              option1_value: 'Grand (18 Pieces)',
              price: 1499,
              mrp: 2999,
              stock_quantity: 30,
              sku: `${baseSku}-GRAND`,
              is_active: 1,
            },
          ];
          newPrice = 499;
          newMrp = 999;
          newStock = 130;
        }
      }

      return {
        ...prev,
        category_id: catId,
        variants: newVariants,
        price: newPrice,
        mrp: newMrp,
        stock_quantity: newStock,
        material: newMaterial,
        pairs_count: newPairsCount,
        sku: baseSku,
      };
    });
  };

  // ── Open Editor ───────────────────────────────────────────────────────────
  const handleOpenEdit = async (product) => {
    let p = product;
    try {
      const full = await adminApi.getProduct(product.id);
      p = full;
    } catch {
      p = product;
    }
    // Ensure media array contains video if video_url is present and normalize all URLs
    let imgs = p.images ? [...p.images] : [];
    imgs = imgs.map((img, i) => {
      const u = normalizeMediaUrl(typeof img === 'string' ? img : (img.image_url || img.url));
      const isVideo = isVideoMedia(img) || isVideoMedia(u);
      return {
        ...(typeof img === 'object' ? img : {}),
        id: img.id || `media-${i}`,
        image_url: u,
        url: u,
        media_type: isVideo ? 'video' : 'image',
        display_order: img.display_order ?? i,
        is_primary: img.is_primary ?? 0,
      };
    });
    if (p.video_url) {
      const normVid = normalizeMediaUrl(p.video_url);
      if (!imgs.some((img) => (typeof img === 'string' ? img : img.image_url) === normVid)) {
        imgs.push({
          id: `reel-${Date.now()}`,
          image_url: normVid,
          url: normVid,
          media_type: 'video',
          display_order: imgs.length,
          is_primary: 0,
        });
      }
    }
    setEditingProduct({
      ...p,
      images: imgs,
      variants: Array.isArray(p.variants) ? p.variants : [],
    });
    setMediaUrlInput('');
    setModalError('');
    setSeoOpen(false);
  };

  // ── Save Product ──────────────────────────────────────────────────────────
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalSaving(true);
    setModalError('');
    try {
      // Keep video_url synced with the first video reel in images if present
      const firstReel = editingProduct.images?.find((m) => {
        const u = typeof m === 'string' ? m : (m.image_url || m.url);
        return m.media_type === 'video' || isVideoMedia(u);
      });
      const normImages = (editingProduct.images || []).map((m, i) => {
        const u = normalizeMediaUrl(typeof m === 'string' ? m : (m.image_url || m.url));
        return {
          ...(typeof m === 'object' ? m : {}),
          image_url: u,
          url: u,
          media_type: m.media_type || (isVideoMedia(u) ? 'video' : 'image'),
          display_order: m.display_order ?? i,
          is_primary: m.is_primary ? 1 : 0,
        };
      });
      const vars = Array.isArray(editingProduct.variants) ? editingProduct.variants : [];
      let finalPrice = editingProduct.price;
      let finalMrp = editingProduct.mrp;
      if (vars.length > 0) {
        const activeVars = vars.filter((v) => Number(v.is_active) !== 0 && v.price);
        if (activeVars.length > 0 && (!finalPrice || finalPrice === '')) {
          finalPrice = Math.min(...activeVars.map((v) => Number(v.price)));
          const matchingVar = activeVars.find((v) => Number(v.price) === finalPrice);
          if (matchingVar && matchingVar.mrp) finalMrp = matchingVar.mrp;
        }
      }

      const payload = {
        ...editingProduct,
        price: finalPrice,
        mrp: finalMrp,
        images: normImages,
        variants: vars,
        video_url: firstReel ? normalizeMediaUrl(typeof firstReel === 'string' ? firstReel : (firstReel.image_url || firstReel.url)) : (editingProduct.video_url || null),
      };

      if (payload.id) {
        await adminApi.updateProduct(payload);
        showToast('Product saved');
      } else {
        await adminApi.createProduct(payload);
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

  // ── Media Upload (Photos + Video Reels) ──────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideoFile = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
    const maxAllowedSize = isVideoFile ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxAllowedSize) {
      showToast(`Selected ${isVideoFile ? 'video' : 'image'} is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max allowed size is ${isVideoFile ? '50MB' : '15MB'}.`);
      e.target.value = '';
      return;
    }

    setUploadingMedia(true);
    try {
      const res = await adminApi.uploadMedia(file);
      const isVideo = res.is_video || isVideoFile;
      const existing = editingProduct.images || [];
      const normUrl = normalizeMediaUrl(res.url);
      const newMedia = {
        id: `media-${Date.now()}`,
        image_url: normUrl,
        url: normUrl,
        media_type: isVideo ? 'video' : 'image',
        display_order: existing.length,
        is_primary: existing.length === 0 && !isVideo ? 1 : 0,
      };
      setEditingProduct((prev) => ({
        ...prev,
        video_url: isVideo ? normUrl : (prev.video_url || null),
        images: [...existing, newMedia],
      }));
      showToast(isVideo ? '🎬 Vertical video reel added to gallery' : '📸 Portrait image added to gallery');
    } catch (err) {
      showToast(err.message || 'Upload failed');
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleAddMediaUrl = () => {
    const rawUrl = mediaUrlInput.trim();
    if (!rawUrl) return;
    const url = normalizeMediaUrl(rawUrl);
    const isVideo = isVideoMedia(url);
    const existing = editingProduct.images || [];
    const newMedia = {
      id: `media-${Date.now()}`,
      image_url: url,
      url,
      media_type: isVideo ? 'video' : 'image',
      display_order: existing.length,
      is_primary: existing.length === 0 && !isVideo ? 1 : 0,
    };
    setEditingProduct((prev) => ({
      ...prev,
      video_url: isVideo ? url : (prev.video_url || null),
      images: [...existing, newMedia],
    }));
    setMediaUrlInput('');
    showToast(isVideo ? '🎬 Video reel added to gallery' : '📸 Image added to gallery');
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

  const liveCount = products.filter((p) => Number(p.is_active) !== 0).length;
  const draftCount = products.filter((p) => Number(p.is_active) === 0).length;

  const filteredProducts = products.filter((p) => {
    if (statusFilter === 'live') return Number(p.is_active) !== 0;
    if (statusFilter === 'draft') return Number(p.is_active) === 0;
    return true;
  });

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
            onClick={() => {
              const defaultCat =
                categories.find(
                  (c) =>
                    c.slug === categoryFilter ||
                    String(c.id) === String(categoryFilter) ||
                    (c.name || '').toLowerCase() === (categoryFilter || '').toLowerCase()
                ) || categories[0];

              const isMystery =
                defaultCat?.slug === 'mystery-jar' ||
                (defaultCat?.name || '').toLowerCase().includes('mystery') ||
                categoryFilter === 'mystery-jar';

              const baseSku = isMystery ? 'VJ-MJAR-01' : '';

              setEditingProduct({
                name: isMystery ? 'Luxury Mystery Jar — Surprise Jewelry' : '',
                sku: baseSku,
                price: isMystery ? 499 : '',
                mrp: isMystery ? 999 : '',
                cost_price: '',
                category_id: defaultCat?.id || 1,
                stock_quantity: isMystery ? 130 : 50,
                is_anti_tarnish: 0,
                pairs_count: isMystery ? null : 6,
                material: isMystery
                  ? 'Assorted Beads, Chains & Accessories in Glass Jar'
                  : 'Lightweight Stainless Steel',
                is_bestseller: 0,
                short_description: isMystery
                  ? 'Curated luxury surprise jewelry inside an aesthetic glass jar with satin ribbon.'
                  : '',
                description: '',
                slug: isMystery ? 'luxury-mystery-jar-surprise-jewelry' : '',
                meta_title: isMystery ? 'Luxury Mystery Jar | Valerie Jewels' : '',
                meta_description: '',
                images: [],
                variants: isMystery
                  ? [
                      {
                        id: null,
                        title: 'Mini Mystery Jar (5 Surprise Pieces)',
                        option1_name: 'Size',
                        option1_value: 'Mini (5 Pieces)',
                        price: 499,
                        mrp: 999,
                        stock_quantity: 50,
                        sku: 'VJ-MJAR-01-MINI',
                        is_active: 1,
                      },
                      {
                        id: null,
                        title: 'Classic Mystery Jar (10 Surprise Pieces)',
                        option1_name: 'Size',
                        option1_value: 'Classic (10 Pieces)',
                        price: 899,
                        mrp: 1799,
                        stock_quantity: 50,
                        sku: 'VJ-MJAR-01-CLASSIC',
                        is_active: 1,
                      },
                      {
                        id: null,
                        title: 'Grand Mystery Jar (18 Surprise Pieces)',
                        option1_name: 'Size',
                        option1_value: 'Grand (18 Pieces)',
                        price: 1499,
                        mrp: 2999,
                        stock_quantity: 30,
                        sku: 'VJ-MJAR-01-GRAND',
                        is_active: 1,
                      },
                    ]
                  : [],
              });
            }}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-wider uppercase font-bold transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-brand-border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU, or tag..."
              className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3.5 py-2 pl-9 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
            />
            <Search className="w-3.5 h-3.5 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
          </form>

          {/* Live / Draft Visibility Segmented Control */}
          <div className="flex items-center p-1 bg-[#FAF8FC] border border-brand-border rounded-xl shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-brand-tertiary shadow-xs'
                  : 'text-brand-muted hover:text-brand-tertiary'
              }`}
            >
              All ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('live')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                statusFilter === 'live'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'live' ? 'bg-white' : 'bg-emerald-500 animate-pulse'}`} />
              <span>Live ({liveCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                statusFilter === 'draft'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'draft' ? 'bg-white' : 'bg-amber-500'}`} />
              <span>Hidden ({draftCount})</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto scrollbar-thin">
          <button
            onClick={() => setCategoryFilter('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${categoryFilter === ''
              ? 'bg-brand-primary text-white font-semibold shadow-xs'
              : 'bg-[#FAF8FC] text-brand-tertiary hover:bg-brand-primary-light'
              }`}
          >
            All Categories
          </button>
          {/* Dynamic category pills from API */}
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.slug)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap flex items-center space-x-1 ${categoryFilter === cat.slug
                ? 'bg-brand-primary text-white font-semibold shadow-xs'
                : (cat.slug.includes('jhumk') || cat.id === 1)
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold'
                  : 'bg-[#FAF8FC] text-brand-tertiary hover:bg-brand-primary-light'
                }`}
            >
              {(cat.slug.includes('jhumk') || cat.id === 1) && <span>🔥</span>}
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-brand-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8FC] border-b border-brand-border text-brand-muted font-caps tracking-wider text-[9.5px] uppercase whitespace-nowrap">
              <tr>
                <th className="py-2.5 px-3">Item & SKU</th>
                <th className="py-2.5 px-2.5">Category</th>
                <th className="py-2.5 px-2.5">Selling Price</th>
                <th className="py-2.5 px-2.5">Stock</th>
                <th className="py-2.5 px-2.5">Live on Store</th>
                <th className="py-2.5 px-2.5">Status / Spotlight</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-muted">
                    Loading catalog inventory...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-muted">
                    No products found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isJhumkaBox = p.category_slug === 'jhumka-boxes' || (p.sku && p.sku.startsWith('VJ-JHM'));
                  const isLow = Number(p.stock_quantity) <= 25;
                  const isLive = Number(p.is_active) !== 0;

                  return (
                    <tr key={p.id} className="hover:bg-[#FAF8FC] transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2.5">
                          {(() => {
                            const rawThumb = p.primary_image || (p.images && p.images.find((img) => !isVideoMedia(img))?.image_url);
                            const thumbUrl = normalizeMediaUrl(rawThumb);
                            const isThumbVideo = isVideoMedia(thumbUrl);

                            return (
                              <button
                                type="button"
                                onClick={() => handleOpenAssurance(p)}
                                className="relative group cursor-pointer rounded-lg overflow-hidden shrink-0 border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                title="Click to view product image (Visual Assurance)"
                              >
                                {isThumbVideo ? (
                                  <div className="w-10 h-10 rounded-lg bg-[#181420] text-brand-primary flex flex-col items-center justify-center relative overflow-hidden">
                                    <Play className="w-3.5 h-3.5 fill-white text-white" />
                                    <span className="text-[6.5px] font-bold text-white uppercase tracking-tighter mt-0.5">REEL</span>
                                  </div>
                                ) : (
                                  <img
                                    src={thumbUrl || '/v-logo.png'}
                                    alt={p.name}
                                    onError={(e) => {
                                      if (e.target.src.includes('/uploads/') && !e.target.src.includes('/api/uploads/')) {
                                        e.target.src = e.target.src.replace('/uploads/', '/api/uploads/');
                                      } else {
                                        e.target.src = '/v-logo.png';
                                      }
                                    }}
                                    className="w-10 h-10 rounded-lg object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                                )}
                                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye className="w-3.5 h-3.5 drop-shadow-sm" />
                                </div>
                              </button>
                            );
                          })()}
                          <div className="min-w-0 max-w-[170px] sm:max-w-[210px] xl:max-w-[260px]">
                            <div className="font-semibold text-brand-tertiary text-xs truncate" title={p.name}>{p.name}</div>
                            <div className="flex items-center space-x-1.5 mt-0.5">
                              <span className="text-[9.5px] text-brand-muted font-mono">{p.sku}</span>
                              <span className="text-gray-300">•</span>
                              <button
                                type="button"
                                onClick={() => handleOpenAssurance(p)}
                                className="inline-flex items-center space-x-0.5 text-[10px] font-semibold text-brand-primary hover:text-brand-primary-hover hover:underline cursor-pointer"
                                title="View product image (Assurance Preview)"
                              >
                                <Eye className="w-2.5 h-2.5" />
                                <span>View</span>
                              </button>
                            </div>
                            {p.video_url && (
                              <span className="inline-flex items-center space-x-1 text-[8.5px] text-brand-primary mt-0.5 whitespace-nowrap">
                                <Video className="w-2.5 h-2.5" />
                                <span>Try-on video linked</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-800 whitespace-nowrap">
                          {p.category_name || 'Jewelry'}
                        </span>
                      </td>

                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <div className="font-semibold text-brand-tertiary text-xs">₹{Number(p.price).toLocaleString('en-IN')}</div>
                        <div className="text-[9.5px] text-brand-muted line-through">₹{Number(p.mrp).toLocaleString('en-IN')}</div>
                        {Boolean(p.variant_count && Number(p.variant_count) > 0) && (
                          <div className="mt-0.5">
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-purple-50 text-brand-primary border border-purple-200 whitespace-nowrap">
                              <Layers className="w-2.5 h-2.5 shrink-0" />
                              <span>{p.variant_count} Sizes</span>
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        {inlineEditingStockId === p.id ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type="number" min="0"
                              value={inlineStockVal}
                              onChange={(e) => setInlineStockVal(e.target.value)}
                              className="w-14 px-1.5 py-0.5 bg-white border border-brand-primary rounded text-xs font-mono"
                              autoFocus
                            />
                            <button onClick={() => handleSaveStock(p.id)} className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded">
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={() => setInlineEditingStockId(null)} className="p-0.5 text-rose-600 hover:bg-rose-50 rounded">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => { setInlineEditingStockId(p.id); setInlineStockVal(p.stock_quantity); }}
                            className="inline-flex items-center space-x-1 cursor-pointer group p-1 rounded hover:bg-gray-100 transition-colors"
                            title="Click to edit stock"
                          >
                            <span className={`font-mono font-bold text-xs ${isLow ? 'text-rose-600' : 'text-brand-tertiary'}`}>
                              {p.stock_quantity}
                            </span>
                            {isLow && <span className="text-[8.5px] text-rose-500 font-semibold">LOW</span>}
                            <span className="text-[9.5px] text-brand-muted opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
                          </div>
                        )}
                      </td>

                      {/* Live / Storefront Toggle Column */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isLive}
                            onClick={() => handleToggleLive(p)}
                            disabled={togglingLiveId === p.id}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-brand-primary ${
                              isLive ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-300 hover:bg-gray-400'
                            } ${togglingLiveId === p.id ? 'opacity-60 cursor-wait' : ''}`}
                            title={isLive ? 'Click to disable (hide from storefront)' : 'Click to make live on storefront'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                                isLive ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            >
                              {togglingLiveId === p.id ? (
                                <RefreshCw className="w-2 h-2 text-gray-500 animate-spin" />
                              ) : isLive ? (
                                <Check className="w-2 h-2 text-emerald-600 stroke-[3]" />
                              ) : (
                                <X className="w-2 h-2 text-gray-400 stroke-[3]" />
                              )}
                            </span>
                          </button>
                          <div className="flex items-center space-x-1">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                            <span className={`text-[9px] font-bold whitespace-nowrap ${isLive ? 'text-emerald-700' : 'text-gray-500'}`}>
                              {isLive ? 'Live on Store' : 'Hidden / Draft'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        {isJhumkaBox && (
                          <div className="flex items-center space-x-1 mb-1 whitespace-nowrap">
                            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded-full text-[8.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Flame className="w-2 h-2 text-amber-600 shrink-0" />
                              <span>Ad Hero</span>
                            </span>
                            <span className="text-[9px] font-bold text-brand-primary">
                              {p.pairs_count || (p.name.match(/(\d+)\s*Pair/i)?.[1] || 6)} Pairs
                            </span>
                          </div>
                        )}
                        <div>
                          <button
                            type="button"
                            onClick={() => handleToggleBestseller(p)}
                            className={`inline-flex items-center space-x-1 text-[9.5px] font-semibold px-2 py-0.5 rounded-full transition-all cursor-pointer whitespace-nowrap leading-tight ${
                              Number(p.is_bestseller) === 1
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 shadow-2xs'
                                : 'bg-gray-100 hover:bg-brand-primary-light text-gray-500 hover:text-brand-primary border border-transparent'
                            }`}
                            title="Click to toggle Bestseller Section spotlight"
                          >
                            <Star className={`w-2.5 h-2.5 shrink-0 ${Number(p.is_bestseller) === 1 ? 'fill-amber-400 text-amber-500' : 'text-gray-400'}`} />
                            <span>{Number(p.is_bestseller) === 1 ? 'Bestseller Section' : 'Add to Bestsellers'}</span>
                          </button>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1">
                          {/* Storefront PDP Preview Action */}
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(p)}
                            className={`inline-flex items-center space-x-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all shadow-2xs cursor-pointer ${
                              !isLive
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-sky-50 hover:bg-sky-600 hover:text-white text-sky-700 border-sky-200'
                            }`}
                            title={!isLive ? "Admin Preview (Preview draft on storefront PDP)" : "Preview Piece on Storefront"}
                          >
                            <Eye className="w-3 h-3" />
                            <span>Preview</span>
                            {!isLive && (
                              <span className="text-[7.5px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-bold uppercase">
                                Draft
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenAssurance(p)}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-purple-50 hover:bg-brand-primary hover:text-white border border-purple-200 text-brand-primary text-[11px] font-semibold transition-all shadow-2xs cursor-pointer"
                            title="Inspect High-Res Photos (Visual Quality Assurance)"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Photos</span>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1 text-brand-muted hover:text-brand-primary hover:bg-brand-primary-light/50 rounded-md transition-colors cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(p.id)}
                            className="p-1 text-brand-muted hover:text-brand-primary hover:bg-brand-primary-light/50 rounded-md transition-colors cursor-pointer"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {!isStaff && (
                            <button
                              onClick={() => setDeletingProduct({ id: p.id, name: p.name })}
                              className="p-1 text-brand-muted hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Delete (Admin Only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

              {/* Contextual Category Determinations & Dynamic Form Rows */}
              {(() => {
                const currentCat = categories.find((c) => c.id === editingProduct.category_id);
                const isMysteryJar = checkIsMysteryJar(editingProduct);
                const isJhumka =
                  editingProduct.category_id === 6 ||
                  currentCat?.slug === 'jhumka-boxes' ||
                  (editingProduct.name || '').toLowerCase().includes('jhumka') ||
                  (editingProduct.sku || '').startsWith('VJ-JHM');
                const variantsList = Array.isArray(editingProduct.variants) ? editingProduct.variants : [];
                const activeVars = variantsList.filter((v) => Number(v.is_active) !== 0 && v.price);
                const pricesList = activeVars.map((v) => Number(v.price)).filter((p) => !isNaN(p) && p > 0);
                const minPrice = pricesList.length > 0 ? Math.min(...pricesList) : null;
                const maxPrice = pricesList.length > 0 ? Math.max(...pricesList) : null;

                return (
                  <>
                    {/* Row 1: Name & SKU */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="font-semibold text-brand-tertiary">Product Title *</label>
                        <input
                          type="text" required
                          value={editingProduct.name || ''}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder={isMysteryJar ? 'e.g. Valerie Luxe Mystery Jar — Curated Surprise Jewels' : 'e.g. Royal Kundan Choker Set'}
                          className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary focus:outline-none focus:border-brand-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-brand-tertiary">SKU Code *</label>
                        <input
                          type="text" required
                          value={editingProduct.sku || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                          placeholder={isMysteryJar ? 'VJ-MJAR-01' : 'VJ-NK-01'}
                          className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary font-mono focus:outline-none focus:border-brand-primary"
                        />
                      </div>
                    </div>

                    {/* Row 2: Category, Stock, Pairs Count (Jhumka only), Packaging/Material */}
                    <div className={`grid grid-cols-1 ${isJhumka ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4`}>
                      <div className="space-y-1 sm:col-span-1">
                        <label className="font-semibold text-brand-tertiary">Category</label>
                        <select
                          value={editingProduct.category_id || categories[0]?.id || 1}
                          onChange={(e) => handleCategoryChange(parseInt(e.target.value, 10))}
                          className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary text-xs focus:outline-none focus:border-brand-primary cursor-pointer"
                        >
                          {categories.length > 0 ? (
                            categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.slug === 'jhumka-boxes' ? '🔥 ' : cat.slug === 'mystery-jar' || (cat.name || '').toLowerCase().includes('mystery') ? '✨ ' : ''}{cat.name}
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
                              <option value={7}>✨ Mystery Jar</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-brand-tertiary flex items-center justify-between">
                          <span>{isMysteryJar ? 'Total Jar Stock' : 'Stock Quantity'}</span>
                          {isMysteryJar && variantsList.length > 0 && (
                            <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              Auto-summed
                            </span>
                          )}
                        </label>
                        <input
                          type="number" min="0" required
                          value={editingProduct.stock_quantity ?? (isMysteryJar ? 130 : 50)}
                          onChange={(e) => setEditingProduct({ ...editingProduct, stock_quantity: parseInt(e.target.value, 10) || 0 })}
                          className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary font-mono focus:outline-none focus:border-brand-primary"
                        />
                      </div>

                      {/* Only show Pairs Inside if this is Jhumka Boxes */}
                      {isJhumka && !isMysteryJar && (
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
                            className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary font-mono focus:outline-none focus:border-brand-primary"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="font-semibold text-brand-tertiary">
                          {isMysteryJar ? 'Packaging / Presentation' : 'Material'}
                        </label>
                        <input
                          type="text"
                          value={editingProduct.material || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, material: e.target.value })}
                          placeholder={isMysteryJar ? 'e.g. Aesthetic Glass Jar with Satin Ribbon & Bow' : 'Lightweight Stainless Steel'}
                          className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary text-xs focus:outline-none focus:border-brand-primary"
                        />
                      </div>
                    </div>

                    {/* Jhumka Box Hero Showcase Dedicated Configuration Banner */}
                    {isJhumka && !isMysteryJar && (
                      <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
                        <div className="space-y-0.5">
                          <div className="font-bold flex items-center gap-1.5 text-amber-900">
                            <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>4 Signature Jhumka Boxes Ad Showcase Configuration</span>
                          </div>
                          <p className="text-[11px] text-amber-800 font-light">
                            Badge on card: <strong className="font-semibold underline">"{editingProduct.pairs_count || (editingProduct.name?.match(/(\d+)\s*Pair/i)?.[1] || 6)} Pairs Inside"</strong> • Box # and per-pair badges are removed for clean visuals
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
                        <div className="flex items-center justify-between">
                          <label className="font-semibold text-brand-tertiary">
                            {isMysteryJar || variantsList.length > 0 ? 'Starting Price (₹) *' : 'Selling Price (₹) *'}
                          </label>
                          {(isMysteryJar || variantsList.length > 0) && (
                            <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              Lowest Size
                            </span>
                          )}
                        </div>
                        <input
                          type="number" step="0.01" disabled={isStaff} required
                          value={editingProduct.price || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                          placeholder={isMysteryJar ? '499' : ''}
                          className={`w-full border border-brand-border rounded-xl px-3 py-2 font-mono ${isStaff ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-[#FAF8FC] text-brand-tertiary'} focus:outline-none focus:border-brand-primary`}
                        />
                        {(isMysteryJar || variantsList.length > 0) && (
                          <p className="text-[10px] text-brand-muted">
                            Shows as "From ₹{editingProduct.price || '499'}" on catalog cards. Tier pricing is set below.
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="font-semibold text-brand-tertiary">
                            {isMysteryJar || variantsList.length > 0 ? 'Strike MRP (₹)' : 'MRP / Strike Price (₹)'}
                          </label>
                          {(isMysteryJar || variantsList.length > 0) && (
                            <span className="text-[10px] text-brand-muted">Strike-through</span>
                          )}
                        </div>
                        <input
                          type="number" step="0.01" disabled={isStaff}
                          value={editingProduct.mrp || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, mrp: e.target.value })}
                          placeholder={isMysteryJar ? '999' : ''}
                          className={`w-full border border-brand-border rounded-xl px-3 py-2 font-mono ${isStaff ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-[#FAF8FC] text-brand-tertiary'} focus:outline-none focus:border-brand-primary`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-brand-tertiary">Cost Price (₹)</label>
                        <input
                          type="number" step="0.01" disabled={isStaff}
                          value={editingProduct.cost_price || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, cost_price: e.target.value })}
                          className={`w-full border border-brand-border rounded-xl px-3 py-2 font-mono ${isStaff ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-[#FAF8FC] text-brand-tertiary'} focus:outline-none focus:border-brand-primary`}
                        />
                      </div>
                    </div>

                    {/* Product Sizes & Pricing (Variants) Section */}
                    <div className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-4 ${
                      isMysteryJar
                        ? 'bg-gradient-to-br from-[#FAF5FF] via-white to-[#FDF4FF] border-brand-primary/40 shadow-xs'
                        : 'bg-[#FAF8FC] border-brand-border'
                    }`}>
                      {/* Header Strip */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isMysteryJar ? 'bg-brand-primary text-white' : 'bg-purple-100 text-brand-primary'
                            }`}>
                              {isMysteryJar ? <Gift className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                            </div>
                            <span className="font-editorial text-sm font-bold text-brand-tertiary">
                              {isMysteryJar ? '✨ Mystery Jar Tiered Sizes & Pricing' : 'Product Sizes & Pricing (Variants)'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-brand-primary border border-brand-primary/30 shadow-2xs">
                              {variantsList.length} {variantsList.length === 1 ? 'Size' : 'Sizes'} Configured
                            </span>
                            {minPrice !== null && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                                ₹{minPrice.toLocaleString('en-IN')}{maxPrice && maxPrice !== minPrice ? ` — ₹${maxPrice.toLocaleString('en-IN')}` : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-brand-muted font-light leading-relaxed">
                            {isMysteryJar
                              ? 'Configure multiple jar sizes (e.g. Mini 5 Pcs, Classic 10 Pcs, Grand 18 Pcs) with individual selling prices, strike MRPs, and stock. Customers will select their desired size on the storefront!'
                              : 'Optionally offer multiple sizes, finishes, or editions for this piece, each with its own selling price and strike-through MRP.'}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {isMysteryJar ? (
                            <>
                              <button
                                type="button"
                                onClick={handleApplyMysteryJarPreset}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-purple-50 text-brand-primary border border-purple-200 hover:bg-purple-100 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                                title="Reset to standard 3-tier Mystery Jar sizes (Mini, Classic, Grand)"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span>Reset 3 Tiers</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddVariant()}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                                title="Add custom jar tier"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Jar Size</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={handleApplyStandardSizesPreset}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white border border-brand-border hover:border-brand-primary text-brand-tertiary text-xs font-semibold shadow-2xs hover:bg-brand-surface transition-all cursor-pointer"
                                title="Apply Small, Medium, Large preset"
                              >
                                <Package className="w-3.5 h-3.5 text-brand-muted" />
                                <span>Small/Med/Large Preset</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddVariant()}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                                title="Add a new custom size/variant row"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Size</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Variants List */}
                      {variantsList.length === 0 ? (
                        <div className="py-6 px-4 rounded-xl border border-dashed border-brand-border bg-white text-center space-y-2">
                          <p className="text-xs text-brand-muted font-light">
                            {isMysteryJar
                              ? 'No jar sizes added yet. Mystery Jars require multiple sizes with different pricing. Click below to add the standard Mystery Jar sizes in 1 click!'
                              : 'Currently selling as a single size at the base price above.'}
                          </p>
                          <div className="flex justify-center gap-2 pt-1">
                            {isMysteryJar ? (
                              <button
                                type="button"
                                onClick={handleApplyMysteryJarPreset}
                                className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold shadow-sm hover:bg-brand-primary-hover transition-all cursor-pointer"
                              >
                                ✨ Add Standard Mystery Jar Sizes (Mini ₹499 / Classic ₹899 / Grand ₹1499)
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddVariant()}
                                className="px-3.5 py-1.5 rounded-xl bg-white border border-brand-border hover:border-brand-primary text-brand-primary text-xs font-semibold shadow-2xs cursor-pointer"
                              >
                                + Add First Size / Variant
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {variantsList.map((variant, vIdx) => {
                            const vPrice = Number(variant.price || 0);
                            const vMrp = Number(variant.mrp || 0);
                            const vDiscount = vMrp > vPrice && vMrp > 0 ? Math.round(((vMrp - vPrice) / vMrp) * 100) : 0;
                            const vActive = Number(variant.is_active) !== 0;

                            return (
                              <div
                                key={variant.id || `var-${vIdx}`}
                                className={`p-4 rounded-xl border transition-all ${
                                  vActive
                                    ? 'bg-white border-brand-border hover:border-brand-primary/50 shadow-2xs'
                                    : 'bg-gray-50/80 border-gray-200 opacity-75'
                                }`}
                              >
                                {/* Tier Card Top Bar */}
                                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-brand-border/60">
                                  <div className="flex items-center space-x-2">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-brand-primary font-mono uppercase">
                                      {isMysteryJar ? `Jar Tier #${vIdx + 1}` : `Size #${vIdx + 1}`}
                                    </span>
                                    <span className="font-semibold text-brand-tertiary text-xs">
                                      {variant.title || (isMysteryJar ? `Jar Size ${vIdx + 1}` : `Size ${vIdx + 1}`)}
                                    </span>
                                    {vPrice > 0 && (
                                      <span className="font-bold text-brand-primary text-xs">
                                        ₹{Math.round(vPrice).toLocaleString('en-IN')}
                                      </span>
                                    )}
                                    {vDiscount > 0 && (
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                        {vDiscount}% OFF (Save ₹{Math.round(vMrp - vPrice)})
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateVariant(vIdx, 'is_active', vActive ? 0 : 1)}
                                      className={`inline-flex items-center space-x-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                                        vActive
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                          : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                                      }`}
                                      title={vActive ? 'Active on storefront (click to hide)' : 'Hidden from storefront (click to enable)'}
                                    >
                                      <Check className={`w-3 h-3 ${vActive ? 'stroke-[2.5]' : 'opacity-40'}`} />
                                      <span>{vActive ? 'Live on Store' : 'Hidden'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveVariant(vIdx)}
                                      className="p-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                                      title="Remove this size tier"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Tier Card Inputs Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                  {/* Size / Edition Title */}
                                  <div className="sm:col-span-5 space-y-1">
                                    <label className="text-[11px] font-semibold text-brand-tertiary flex items-center justify-between">
                                      <span>{isMysteryJar ? 'Jar Tier Name *' : 'Size / Edition Title *'}</span>
                                      <span className="text-[10px] text-brand-muted font-light">Shown to customer</span>
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      value={variant.title || ''}
                                      onChange={(e) => handleUpdateVariant(vIdx, 'title', e.target.value)}
                                      placeholder={isMysteryJar ? 'e.g. Mini Mystery Jar (5 Surprise Pieces)' : 'e.g. Small / 16 inch'}
                                      className="w-full bg-[#FAF8FC] border border-brand-border rounded-lg px-2.5 py-1.5 text-xs text-brand-tertiary font-medium focus:outline-none focus:border-brand-primary"
                                    />
                                  </div>

                                  {/* Selling Price (₹) */}
                                  <div className="sm:col-span-2 space-y-1">
                                    <label className="text-[11px] font-semibold text-brand-tertiary">
                                      Price (₹) *
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      required
                                      value={variant.price ?? ''}
                                      onChange={(e) => handleUpdateVariant(vIdx, 'price', e.target.value)}
                                      placeholder="499"
                                      className="w-full bg-[#FAF8FC] border border-brand-border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-brand-primary focus:outline-none focus:border-brand-primary"
                                    />
                                  </div>

                                  {/* Strike MRP (₹) */}
                                  <div className="sm:col-span-2 space-y-1">
                                    <label className="text-[11px] font-semibold text-brand-tertiary">
                                      Strike MRP (₹)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={variant.mrp ?? ''}
                                      onChange={(e) => handleUpdateVariant(vIdx, 'mrp', e.target.value)}
                                      placeholder="999"
                                      className="w-full bg-[#FAF8FC] border border-brand-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-brand-muted focus:outline-none focus:border-brand-primary"
                                    />
                                  </div>

                                  {/* Stock Quantity */}
                                  <div className="sm:col-span-1 space-y-1">
                                    <label className="text-[11px] font-semibold text-brand-tertiary text-center block">
                                      Stock
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={variant.stock_quantity ?? 50}
                                      onChange={(e) => handleUpdateVariant(vIdx, 'stock_quantity', parseInt(e.target.value, 10) || 0)}
                                      className="w-full bg-[#FAF8FC] border border-brand-border rounded-lg px-2 py-1.5 text-xs font-mono text-center text-brand-tertiary focus:outline-none focus:border-brand-primary"
                                    />
                                  </div>

                                  {/* Variant SKU */}
                                  <div className="sm:col-span-2 space-y-1">
                                    <label className="text-[11px] font-semibold text-brand-tertiary">
                                      Tier SKU
                                    </label>
                                    <input
                                      type="text"
                                      value={variant.sku || ''}
                                      onChange={(e) => handleUpdateVariant(vIdx, 'sku', e.target.value)}
                                      placeholder={isMysteryJar ? `VJ-MJAR-T${vIdx + 1}` : `VJ-SZ${vIdx + 1}`}
                                      className="w-full bg-[#FAF8FC] border border-brand-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-brand-tertiary focus:outline-none focus:border-brand-primary"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Row 4: Descriptions */}
                    <div className="space-y-1">
                      <label className="font-semibold text-brand-tertiary">Short Ad Hook / Summary</label>
                      <input
                        type="text"
                        value={editingProduct.short_description || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, short_description: e.target.value })}
                        placeholder={
                          isMysteryJar
                            ? 'e.g. 100% surprise selection of premium waterproof jewelry packed in an aesthetic ribbon-tied jar...'
                            : 'e.g. 6 handcrafted antique gold & pearl jhumka pairs...'
                        }
                        className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                  </>
                );
              })()}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-brand-tertiary">Detailed Description (About This Piece)</label>
                  <span className="text-[11px] text-brand-muted">Supports paragraphs, points & **bold**</span>
                </div>
                <textarea
                  rows={5}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="Write as paragraphs, or start lines with •, -, 1., or emojis (✨, 💎) to show as points. E.g.:&#10;&#10;✨ **16 Pairs Oxidized Earrings Set**&#10;💎 Beautiful collection of traditional oxidized silver earrings&#10;🌸 Perfect for sarees, kurtis, and festive wear"
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-brand-tertiary font-sans text-xs focus:outline-none focus:border-brand-primary"
                />
                <div className="flex items-start justify-between gap-2 text-[11px] text-brand-muted font-light pt-0.5">
                  <p>
                    💡 <strong>Smart Formatting:</strong> If you write paragraphs, they will appear as paragraphs. If you write points (using bullet dots •, dashes -, numbers 1., or emojis ✨), they automatically render as clean bulleted points on the store.
                  </p>
                </div>

                {editingProduct.description && (
                  <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200/60 mt-1.5 space-y-1">
                    <span className="text-[10px] font-caps uppercase tracking-wider font-bold text-brand-primary block">
                      Live Storefront Preview
                    </span>
                    <div className="text-xs">
                      <FormattedDescription content={editingProduct.description} />
                    </div>
                  </div>
                )}
              </div>

              {/* Row 5: Media — Drag-to-Reorder + Upload + Dimension Guidelines */}
              <div className="space-y-4 pt-3 border-t border-brand-border">

                {/* MadeWidLove High-Quality Dimension Guidelines Banner */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50/90 via-[#FAF7FD] to-brand-primary-light/40 border border-brand-primary/25 text-xs space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-caps tracking-wider uppercase font-bold text-brand-primary flex items-center gap-1.5 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Studio Media Resolution & Quality Standards</span>
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-emerald-800">
                      High-Definition Visuals (Retina 4K Ready)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white/95 p-2.5 rounded-xl border border-brand-border/70 space-y-1">
                      <strong className="block text-brand-tertiary font-bold flex items-center justify-between">
                        <span>📸 Product Photos: 1:1 Square (High Quality)</span>
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">1200 × 1200 px</span>
                      </strong>
                      <p className="text-[10.5px] text-brand-muted font-light leading-relaxed">
                        Recommended: <strong className="font-semibold text-brand-tertiary font-mono">1200 × 1200 px</strong> (Minimum: <strong className="font-semibold text-brand-tertiary font-mono">1000 × 1000 px</strong>). Keeps jewelry crisp, enables sharp 2.4x zoom, and prevents stretching across phones and desktop monitors.
                      </p>
                    </div>
                    <div className="bg-white/95 p-2.5 rounded-xl border border-brand-border/70 space-y-1">
                      <strong className="block text-brand-tertiary font-bold flex items-center justify-between">
                        <span>🎬 Video Reels: 9:16 Vertical HD</span>
                        <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">1080 × 1920 px</span>
                      </strong>
                      <p className="text-[10.5px] text-brand-muted font-light leading-relaxed">
                        Recommended: <strong className="font-semibold text-brand-tertiary font-mono">1080 × 1920 px</strong> (MP4/WebM). Plays live try-on reels and luxury unboxings smoothly in product modals.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="font-semibold text-brand-tertiary flex items-center gap-1.5">
                      <span>Gallery Media (Photos & Video Reels)</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Target: 1200 × 1200 px
                      </span>
                    </span>
                    <p className="text-[10.5px] text-brand-muted mt-0.5">Drag tiles to reorder · Recommended: <strong className="font-mono text-brand-tertiary">1200 × 1200 px</strong> (Min: 1000 × 1000 px) · First photo = storefront primary</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Photo Upload Trigger */}
                    <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 text-brand-tertiary border border-brand-border text-xs font-semibold transition-all shadow-2xs active:scale-95">
                      <ImageIcon className="w-3.5 h-3.5 text-brand-primary" />
                      <span>{uploadingMedia ? 'Uploading...' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploadingMedia}
                      />
                    </label>

                    {/* Dedicated Video Reel Upload Trigger */}
                    <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold transition-all shadow-xs shrink-0 active:scale-95">
                      <Film className="w-4 h-4 text-purple-200" />
                      <span>{uploadingMedia ? 'Uploading Reel...' : 'Upload Video Reel (.mp4)'}</span>
                      <input
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm,video/*,.mp4,.mov,.webm,.m4v"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploadingMedia}
                      />
                    </label>
                  </div>
                </div>

                {/* Sortable Media Grid */}
                {editingProduct.images && editingProduct.images.length > 0 && (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
                    <SortableContext
                      items={editingProduct.images.map((img, i) => img.id || `img-${i}`)}
                      strategy={horizontalListSortingStrategy}
                    >
                      <div className="flex flex-wrap gap-2.5 pt-1">
                        {editingProduct.images.map((img, idx) => (
                          <SortableMediaTile
                            key={img.id || `media-${idx}`}
                            item={img}
                            index={idx}
                            onRemove={handleRemoveImage}
                            onSetPrimary={handleSetPrimary}
                            onPreview={(mediaItem) => {
                              const mediaUrl = typeof mediaItem === 'string' ? mediaItem : (mediaItem.image_url || mediaItem.url);
                              handleOpenAssurance({
                                ...editingProduct,
                                primary_image: mediaUrl,
                              });
                            }}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                {/* Direct Media URL Addition Bar */}
                <div className="p-3 bg-[#FAF8FC] border border-brand-border/80 rounded-xl space-y-2">
                  <label className="text-[11px] font-semibold text-brand-tertiary flex items-center space-x-1.5">
                    <Film className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Add Media URL (High-Res Image URL or MP4 Video Reel)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={mediaUrlInput}
                      onChange={(e) => setMediaUrlInput(e.target.value)}
                      placeholder="https://... (.jpg, .png, .webp or .mp4 vertical reel)"
                      className="flex-1 bg-white border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddMediaUrl}
                      disabled={!mediaUrlInput.trim()}
                      className="px-3 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hover disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
                    >
                      Add to Gallery
                    </button>
                  </div>
                </div>

              </div>

              {/* Row 6: Toggles & Storefront Visibility Card */}
              <div className="space-y-3 pt-2 border-t border-brand-border">
                {/* Storefront Live Status Toggle Card */}
                <div className="p-4 rounded-2xl border border-brand-border bg-[#FAF8FC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-brand-tertiary">Storefront Live Status</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          editingProduct.is_active !== 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {editingProduct.is_active !== 0 ? '🟢 Live on Storefront' : '⚪ Hidden / Draft'}
                      </span>
                    </div>
                    <p className="text-[11px] text-brand-muted mt-1 leading-normal max-w-lg">
                      {editingProduct.is_active !== 0
                        ? 'Active piece — live on the customer storefront across homepage, catalog, search, and bundles.'
                        : 'Hidden piece — unpublished from the customer storefront. Only admins can preview this product.'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(editingProduct)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-brand-primary hover:text-white text-brand-primary border border-purple-200 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                      title="Preview how this piece looks on storefront"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={editingProduct.is_active !== 0}
                      onClick={() =>
                        setEditingProduct((prev) => ({
                          ...prev,
                          is_active: prev.is_active === 0 ? 1 : 0,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 ${
                        editingProduct.is_active !== 0 ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                      title="Toggle live storefront visibility"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                          editingProduct.is_active !== 0 ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      >
                        {editingProduct.is_active !== 0 ? (
                          <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <X className="w-2.5 h-2.5 text-gray-400 stroke-[3]" />
                        )}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editingProduct.is_bestseller}
                      onChange={(e) => setEditingProduct({ ...editingProduct, is_bestseller: e.target.checked ? 1 : 0 })}
                      className="rounded text-brand-primary focus:ring-brand-primary"
                    />
                    <span className="text-brand-tertiary font-medium">Add to Bestselling Section (Homepage Spotlight)</span>
                  </label>
                </div>
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
              <div className="flex items-center justify-between pt-4 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => handleOpenPreview(editingProduct)}
                  className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-brand-primary border border-purple-200 text-xs font-semibold transition-colors flex items-center space-x-1.5"
                  title="Preview Storefront PDP"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Storefront</span>
                </button>

                <div className="flex items-center space-x-3">
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
                    {modalSaving ? 'Saving Product...' : editingProduct.is_active !== 0 ? 'Save & Publish Live' : 'Save as Hidden (Draft)'}
                  </button>
                </div>
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

      {/* Product Assurance Lightbox Modal */}
      <ProductAssuranceModal
        isOpen={Boolean(assuranceProduct)}
        item={assuranceProduct}
        onClose={() => setAssuranceProduct(null)}
        onEdit={(prod) => {
          setAssuranceProduct(null);
          handleOpenEdit(prod);
        }}
      />

      {/* Admin Storefront Product Preview Modal */}
      <AdminProductPreviewModal
        isOpen={Boolean(previewProduct)}
        product={previewProduct}
        onClose={() => setPreviewProduct(null)}
        onToggleLive={handleToggleLive}
        isTogglingLive={previewProduct ? togglingLiveId === previewProduct.id : false}
        onEdit={(prod) => {
          setPreviewProduct(null);
          handleOpenEdit(prod);
        }}
      />
    </div>
  );
}
