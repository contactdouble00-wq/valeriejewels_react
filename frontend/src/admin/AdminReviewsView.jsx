import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Star, Search, Filter, Plus, Edit2, Trash2, CheckCircle2, XCircle,
  AlertCircle, Upload, Image as ImageIcon, ChevronDown, ChevronRight,
  Eye, RefreshCw, Sparkles, Check, X, Tag, ExternalLink, Sliders,
  ShieldCheck, ArrowUpDown, Layers, Camera
} from 'lucide-react';
import { adminApi } from './adminApi';

export default function AdminReviewsView({ currentUser }) {
  // Main view navigation: 'reviews' list or 'category_ratings'
  const [activeSubTab, setActiveSubTab] = useState('reviews');

  // Loading & notification states
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // Reviews data & stats
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    with_photos: 0,
    avg_rating: 4.9,
    breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total_items: 0, total_pages: 1 });

  // Filters for Reviews tab
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [photosOnlyFilter, setPhotosOnlyFilter] = useState(false);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Category Ratings data
  const [categoryData, setCategoryData] = useState([]);
  const [categoryRatingsLoading, setCategoryRatingsLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [categorySearch, setCategorySearch] = useState('');

  // Products dropdown for Add/Edit Modal
  const [productsDropdown, setProductsDropdown] = useState([]);

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [formData, setFormData] = useState({
    product_id: '',
    reviewer_name: '',
    rating: 5,
    title: '',
    comment: '',
    is_verified_buyer: 1,
    status: 'approved',
    created_at: new Date().toISOString().slice(0, 10),
    image_url: '',
    images: []
  });

  // Photo Upload State inside Modal
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Lightbox Image Preview Modal
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);

  // Delete Confirm Modal
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, isBulk: false, reviewId: null });

  const showToast = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Fetch reviews list
  const fetchReviews = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        search,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        rating: ratingFilter ? Number(ratingFilter) : undefined,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
        with_photos: photosOnlyFilter ? 1 : undefined,
      };
      const res = await adminApi.getReviews(params);
      if (res) {
        setReviews(res.reviews || []);
        if (res.stats) setStats(res.stats);
        if (res.pagination) setPagination(res.pagination);
        setSelectedIds([]);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Category Ratings
  const fetchCategoryRatings = async () => {
    setCategoryRatingsLoading(true);
    try {
      const res = await adminApi.getCategoryRatings();
      if (res && res.categories) {
        setCategoryData(res.categories);
        // Expand all categories by default on first load
        const initialExpanded = {};
        res.categories.forEach((cat) => {
          initialExpanded[cat.id] = true;
        });
        setExpandedCategories((prev) => (Object.keys(prev).length === 0 ? initialExpanded : prev));
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to load category ratings');
    } finally {
      setCategoryRatingsLoading(false);
    }
  };

  // Fetch products dropdown for review assignment
  const fetchProductsDropdown = async () => {
    try {
      const res = await adminApi.getProductsDropdown();
      if (res) setProductsDropdown(res);
    } catch (err) {
      console.warn('Failed to load products dropdown:', err);
    }
  };

  useEffect(() => {
    fetchReviews(1);
    fetchProductsDropdown();
  }, [statusFilter, ratingFilter, categoryFilter, photosOnlyFilter]);

  useEffect(() => {
    if (activeSubTab === 'category_ratings') {
      fetchCategoryRatings();
    }
  }, [activeSubTab]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReviews(1);
  };

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingReview(null);
    setFormData({
      product_id: productsDropdown[0]?.id || '',
      reviewer_name: '',
      rating: 5,
      title: '',
      comment: '',
      is_verified_buyer: 1,
      status: 'approved',
      created_at: new Date().toISOString().slice(0, 10),
      image_url: '',
      images: []
    });
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (review) => {
    setEditingReview(review);
    setFormData({
      product_id: review.product_id,
      reviewer_name: review.reviewer_name,
      rating: review.rating,
      title: review.title || '',
      comment: review.comment || '',
      is_verified_buyer: review.is_verified_buyer ? 1 : 0,
      status: review.status || 'approved',
      created_at: review.created_at ? review.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
      image_url: review.image_url || '',
      images: Array.isArray(review.images) ? [...review.images] : (review.image_url ? [review.image_url] : [])
    });
    setModalOpen(true);
  };

  // Handle photo upload inside Add/Edit modal
  const handlePhotoFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please upload an image file (JPG, PNG, WEBP).');
      return;
    }

    setUploadingPhoto(true);
    try {
      const res = await adminApi.uploadReviewPhoto(file);
      if (res && res.url) {
        setFormData((prev) => {
          const nextImages = prev.images ? [...prev.images, res.url] : [res.url];
          return {
            ...prev,
            image_url: prev.image_url || res.url,
            images: nextImages
          };
        });
        showToast('success', 'Review photo uploaded successfully!');
      }
    } catch (err) {
      showToast('error', err.message || 'Photo upload failed');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove photo from review form
  const handleRemovePhoto = (photoUrl) => {
    setFormData((prev) => {
      const nextImages = (prev.images || []).filter((u) => u !== photoUrl);
      return {
        ...prev,
        images: nextImages,
        image_url: nextImages.length > 0 ? nextImages[0] : ''
      };
    });
  };

  // Submit Review Form (Create or Update)
  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!formData.product_id) {
      showToast('error', 'Please select a product.');
      return;
    }
    if (!formData.reviewer_name.trim()) {
      showToast('error', 'Reviewer name is required.');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        ...formData,
        product_id: Number(formData.product_id),
        rating: Number(formData.rating),
        is_verified_buyer: Number(formData.is_verified_buyer),
      };

      if (editingReview) {
        await adminApi.updateReview({ ...payload, id: editingReview.id });
        showToast('success', 'Review updated successfully.');
      } else {
        await adminApi.createReview(payload);
        showToast('success', 'New review created successfully.');
      }
      setModalOpen(false);
      fetchReviews(pagination.page);
    } catch (err) {
      showToast('error', err.message || 'Failed to save review');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Toggle Status
  const handleToggleStatus = async (review, newStatus) => {
    try {
      await adminApi.updateReview({ id: review.id, status: newStatus });
      showToast('success', `Review marked as ${newStatus}.`);
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      showToast('error', err.message || 'Failed to update review status');
    }
  };

  // Delete Handlers
  const handleConfirmDelete = async () => {
    setActionLoading(true);
    try {
      if (deleteConfirm.isBulk) {
        await adminApi.bulkDeleteReviews(selectedIds);
        showToast('success', `${selectedIds.length} reviews deleted successfully.`);
        setSelectedIds([]);
      } else if (deleteConfirm.reviewId) {
        await adminApi.deleteReview(deleteConfirm.reviewId);
        showToast('success', 'Review deleted successfully.');
      }
      setDeleteConfirm({ open: false, isBulk: false, reviewId: null });
      fetchReviews(pagination.page);
    } catch (err) {
      showToast('error', err.message || 'Deletion failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Status Update
  const handleBulkStatusChange = async (newStatus) => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    try {
      await adminApi.bulkUpdateReviewStatus(selectedIds, newStatus);
      showToast('success', `${selectedIds.length} reviews marked as ${newStatus}.`);
      setSelectedIds([]);
      fetchReviews(pagination.page);
    } catch (err) {
      showToast('error', err.message || 'Bulk status change failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Select all logic
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(reviews.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Category Rating Preset Apply
  const [categoryPresetInputs, setCategoryPresetInputs] = useState({});

  const handleApplyCategoryPreset = async (categoryId) => {
    const preset = categoryPresetInputs[categoryId] || { rating: 4.9, count: 128 };
    setActionLoading(true);
    try {
      const res = await adminApi.bulkCategoryRating(
        categoryId,
        Number(preset.rating || 4.9),
        preset.count ? Number(preset.count) : null,
        true
      );
      showToast('success', res?.message || `Category rating set to ${preset.rating}★`);
      fetchCategoryRatings();
    } catch (err) {
      showToast('error', err.message || 'Failed to update category ratings');
    } finally {
      setActionLoading(false);
    }
  };

  // Individual product rating update in Category tab
  const handleSaveProductRating = async (productId, ratingAvg, reviewCount) => {
    try {
      await adminApi.updateProductRating(productId, ratingAvg, reviewCount);
      showToast('success', 'Product rating override saved!');
      // Update local state immediately
      setCategoryData((prev) =>
        prev.map((cat) => ({
          ...cat,
          products: cat.products.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  rating_avg: ratingAvg,
                  review_count: reviewCount,
                  effective_rating: ratingAvg || 4.9,
                  effective_reviews_count: reviewCount || p.real_reviews_count || 128,
                }
              : p
          ),
        }))
      );
    } catch (err) {
      showToast('error', err.message || 'Failed to save product rating');
    }
  };

  // Toggle Category accordion
  const toggleCategoryExpand = (catId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Filtered categories
  const filteredCategoryData = useMemo(() => {
    if (!categorySearch.trim()) return categoryData;
    const q = categorySearch.toLowerCase();
    return categoryData.map((cat) => {
      const matchesCatName = cat.name.toLowerCase().includes(q);
      const filteredProds = cat.products.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))
      );
      if (matchesCatName) return cat;
      return {
        ...cat,
        products: filteredProds,
      };
    }).filter((cat) => cat.products.length > 0 || cat.name.toLowerCase().includes(q));
  }, [categoryData, categorySearch]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-xs font-semibold animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header & Sub-Tab Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border/60 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Star className="w-5 h-5 fill-current" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-brand-tertiary">
                Customer Reviews & Rating Control
              </h1>
              <p className="text-xs text-brand-muted font-light mt-0.5">
                Manage genuine buyer feedback, upload customer review photos, and set category-wise average ratings across the store.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-brand-border shadow-sm">
          <button
            onClick={() => setActiveSubTab('reviews')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeSubTab === 'reviews'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-brand-tertiary hover:text-brand-primary hover:bg-[#FAF8FC]'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Customer Reviews</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
              {stats.total}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('category_ratings')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeSubTab === 'category_ratings'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-brand-tertiary hover:text-brand-primary hover:bg-[#FAF8FC]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Category-wise Rating Tuner</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-caps tracking-wider uppercase text-brand-muted font-semibold">
            Total Reviews
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-brand-tertiary font-sans">{stats.total}</span>
            <span className="text-xs text-emerald-600 font-medium">All Time</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-caps tracking-wider uppercase text-emerald-700 font-semibold flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Approved</span>
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-700 font-sans">{stats.approved}</span>
            <span className="text-[11px] text-brand-muted">Visible Live</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-caps tracking-wider uppercase text-amber-700 font-semibold flex items-center space-x-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending Moderation</span>
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-amber-700 font-sans">{stats.pending}</span>
            <span className="text-[11px] text-amber-600 font-medium">Review Needed</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-caps tracking-wider uppercase text-indigo-700 font-semibold flex items-center space-x-1">
            <Camera className="w-3.5 h-3.5 text-indigo-600" />
            <span>With Photos</span>
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-indigo-700 font-sans">{stats.with_photos}</span>
            <span className="text-[11px] text-indigo-600">Visual Proof</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-caps tracking-wider uppercase text-amber-600 font-semibold flex items-center space-x-1">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
            <span>Catalog Average</span>
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <div className="flex items-center space-x-1">
              <span className="text-2xl font-bold text-brand-tertiary font-sans">{stats.avg_rating}</span>
              <span className="text-amber-500">★</span>
            </div>
            <span className="text-[11px] text-brand-muted">Benchmark</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 1: CUSTOMER REVIEWS MANAGEMENT
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'reviews' && (
        <div className="space-y-4">
          {/* Controls & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search reviews by customer name, title, comment, or product..."
                  className="w-full pl-9 pr-24 py-2.5 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary/90 transition-colors"
                >
                  Search
                </button>
              </form>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fetchReviews(pagination.page)}
                  className="p-2.5 rounded-xl border border-brand-border hover:bg-[#FAF8FC] text-brand-tertiary text-xs transition-colors"
                  title="Refresh Reviews"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-semibold flex items-center space-x-2 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Review (+ Photo)</span>
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-brand-border/40 text-xs">
              <span className="text-[11px] font-caps tracking-wider text-brand-muted uppercase font-bold mr-1">
                Filter By:
              </span>

              {/* Status Select */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-brand-border bg-white text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
              >
                <option value="all">All Statuses ({stats.total})</option>
                <option value="approved">Approved ({stats.approved})</option>
                <option value="pending">Pending ({stats.pending})</option>
                <option value="rejected">Rejected ({stats.rejected})</option>
              </select>

              {/* Rating Select */}
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-brand-border bg-white text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
              >
                <option value="">All Star Ratings</option>
                <option value="5">★★★★★ (5 Stars)</option>
                <option value="4">★★★★☆ (4 Stars)</option>
                <option value="3">★★★☆☆ (3 Stars)</option>
                <option value="2">★★☆☆☆ (2 Stars)</option>
                <option value="1">★☆☆☆☆ (1 Star)</option>
              </select>

              {/* Photos Only Toggle */}
              <button
                onClick={() => setPhotosOnlyFilter(!photosOnlyFilter)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                  photosOnlyFilter
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'border-brand-border bg-white text-brand-muted hover:text-brand-tertiary'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Photos Only ({stats.with_photos})</span>
              </button>

              {(search || statusFilter !== 'all' || ratingFilter || photosOnlyFilter) && (
                <button
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                    setRatingFilter('');
                    setPhotosOnlyFilter(false);
                    fetchReviews(1);
                  }}
                  className="text-xs text-brand-primary hover:underline ml-auto font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>

          {/* Bulk Action Toolbar (When Items Selected) */}
          {selectedIds.length > 0 && (
            <div className="bg-brand-primary/5 border border-brand-primary/20 p-3 rounded-2xl flex items-center justify-between text-xs animate-fade-in">
              <div className="flex items-center space-x-2 font-semibold text-brand-primary">
                <span>{selectedIds.length} review(s) selected</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkStatusChange('approved')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve Selected</span>
                </button>

                <button
                  onClick={() => handleBulkStatusChange('rejected')}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors flex items-center space-x-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reject Selected</span>
                </button>

                <button
                  onClick={() => setDeleteConfirm({ open: true, isBulk: true, reviewId: null })}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected</span>
                </button>
              </div>
            </div>
          )}

          {/* Reviews List Table */}
          <div className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-brand-muted text-xs flex flex-col items-center space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-brand-primary" />
                <span>Loading customer reviews...</span>
              </div>
            ) : reviews.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <Star className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-brand-tertiary">No reviews match your criteria</h3>
                <p className="text-xs text-brand-muted max-w-sm mx-auto">
                  Try adjusting your filters or click "Add Review" to create a new customer review with photos.
                </p>
                <button
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary/95 transition-all"
                >
                  Add First Review
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8FC] border-b border-brand-border text-brand-muted font-caps tracking-wider text-[11px]">
                      <th className="p-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === reviews.length && reviews.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-brand-border text-brand-primary focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="py-4 px-3 font-semibold">Reviewer & Status</th>
                      <th className="py-4 px-3 font-semibold">Product</th>
                      <th className="py-4 px-3 font-semibold">Rating & Review</th>
                      <th className="py-4 px-3 font-semibold">Customer Photo(s)</th>
                      <th className="py-4 px-3 font-semibold">Date</th>
                      <th className="py-4 px-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/60">
                    {reviews.map((rev) => {
                      const isSelected = selectedIds.includes(rev.id);
                      return (
                        <tr
                          key={rev.id}
                          className={`hover:bg-[#FCFAFE] transition-colors ${
                            isSelected ? 'bg-brand-primary/5' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOne(rev.id)}
                              className="rounded border-brand-border text-brand-primary focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* Reviewer & Verification Status */}
                          <td className="py-4 px-3 align-top min-w-[150px]">
                            <div className="font-semibold text-brand-tertiary flex items-center space-x-1.5">
                              <span>{rev.reviewer_name}</span>
                              {rev.is_verified_buyer ? (
                                <span title="Verified Buyer">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 flex items-center space-x-1.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                  rev.status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : rev.status === 'pending'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {rev.status}
                              </span>
                            </div>
                          </td>

                          {/* Product Info */}
                          <td className="py-4 px-3 align-top min-w-[180px]">
                            <div className="flex items-center space-x-2.5">
                              {rev.product_primary_image ? (
                                <img
                                  src={rev.product_primary_image}
                                  alt={rev.product_name}
                                  className="w-10 h-10 rounded-lg object-cover border border-brand-border shrink-0 bg-brand-light"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-brand-light border border-brand-border flex items-center justify-center text-brand-muted shrink-0">
                                  <Tag className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-medium text-brand-tertiary line-clamp-1 block">
                                  {rev.product_name || `Product #${rev.product_id}`}
                                </span>
                                {rev.category_name && (
                                  <span className="text-[10.5px] text-brand-muted block">
                                    {rev.category_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Rating & Review Text */}
                          <td className="py-4 px-3 align-top max-w-[280px]">
                            <div className="flex items-center space-x-0.5 text-amber-500 mb-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < rev.rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'fill-gray-200 text-gray-200'
                                  }`}
                                />
                              ))}
                              <span className="ml-1 text-[11px] font-bold text-brand-tertiary">
                                {rev.rating}.0
                              </span>
                            </div>
                            {rev.title && (
                              <h4 className="font-semibold text-brand-tertiary text-xs line-clamp-1">
                                {rev.title}
                              </h4>
                            )}
                            <p className="text-brand-muted text-[11.5px] font-light leading-relaxed line-clamp-2 mt-0.5">
                              {rev.comment}
                            </p>
                          </td>

                          {/* Customer Photo(s) */}
                          <td className="py-4 px-3 align-top min-w-[130px]">
                            {rev.images && rev.images.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {rev.images.slice(0, 3).map((imgUrl, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => setPreviewPhotoUrl(imgUrl)}
                                    className="relative w-10 h-10 rounded-lg overflow-hidden border border-brand-border hover:scale-105 transition-transform cursor-pointer group shadow-xs"
                                  >
                                    <img
                                      src={imgUrl}
                                      alt="Customer review photo"
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                      <Eye className="w-3.5 h-3.5" />
                                    </div>
                                  </div>
                                ))}
                                {rev.images.length > 3 && (
                                  <span className="text-[10px] text-brand-muted font-semibold">
                                    +{rev.images.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : rev.image_url ? (
                              <div
                                onClick={() => setPreviewPhotoUrl(rev.image_url)}
                                className="relative w-10 h-10 rounded-lg overflow-hidden border border-brand-border hover:scale-105 transition-transform cursor-pointer group shadow-xs"
                              >
                                <img
                                  src={rev.image_url}
                                  alt="Customer review photo"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                  <Eye className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-brand-muted font-light italic">
                                No photo
                              </span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-4 px-3 align-top text-brand-muted text-[11px] whitespace-nowrap">
                            {rev.created_at ? rev.created_at.slice(0, 10) : '—'}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1.5">
                              {rev.status !== 'approved' && (
                                <button
                                  onClick={() => handleToggleStatus(rev, 'approved')}
                                  title="Approve review"
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}

                              {rev.status !== 'rejected' && (
                                <button
                                  onClick={() => handleToggleStatus(rev, 'rejected')}
                                  title="Reject review"
                                  className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenEditModal(rev)}
                                title="Edit review"
                                className="p-1.5 rounded-lg text-brand-primary hover:bg-[#FAF8FC] transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() =>
                                  setDeleteConfirm({ open: true, isBulk: false, reviewId: rev.id })
                                }
                                title="Delete review"
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination footer */}
            {pagination.total_pages > 1 && (
              <div className="p-4 border-t border-brand-border flex items-center justify-between text-xs text-brand-muted">
                <span>
                  Showing {reviews.length} of {pagination.total_items} reviews (Page {pagination.page} of {pagination.total_pages})
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchReviews(pagination.page - 1)}
                    className="px-3 py-1.5 rounded-lg border border-brand-border disabled:opacity-40 hover:bg-[#FAF8FC] text-brand-tertiary transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={pagination.page >= pagination.total_pages}
                    onClick={() => fetchReviews(pagination.page + 1)}
                    className="px-3 py-1.5 rounded-lg border border-brand-border disabled:opacity-40 hover:bg-[#FAF8FC] text-brand-tertiary transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 2: CATEGORY-WISE PRODUCT RATING TUNER
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'category_ratings' && (
        <div className="space-y-6">
          {/* Header Explanation Banner */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <span className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
                <Sliders className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-serif font-bold text-brand-tertiary">
                  Category & Product Rating Override Atelier
                </h3>
                <p className="text-xs text-brand-muted font-light mt-0.5 leading-relaxed">
                  Here you can set the exact average star rating (e.g. 4.9, 4.8, 5.0) and review counts for entire categories or individual products. When you save a rating, it immediately updates the storefront product cards and modals!
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={fetchCategoryRatings}
                className="px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-semibold hover:bg-amber-100/50 transition-colors flex items-center space-x-1.5 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${categoryRatingsLoading ? 'animate-spin' : ''}`} />
                <span>Reload Catalog</span>
              </button>
            </div>
          </div>

          {/* Search bar inside Category ratings */}
          <div className="bg-white p-3 rounded-2xl border border-brand-border shadow-sm flex items-center">
            <Search className="w-4 h-4 text-brand-muted ml-2 mr-2" />
            <input
              type="text"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Search category or product by name or SKU..."
              className="w-full text-xs text-brand-tertiary focus:outline-none"
            />
            {categorySearch && (
              <button
                onClick={() => setCategorySearch('')}
                className="text-xs text-brand-muted hover:text-brand-tertiary p-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Categories Accordion Cards */}
          {categoryRatingsLoading ? (
            <div className="p-12 text-center text-brand-muted text-xs flex flex-col items-center space-y-3 bg-white rounded-2xl border border-brand-border">
              <RefreshCw className="w-6 h-6 animate-spin text-brand-primary" />
              <span>Loading category-wise product ratings...</span>
            </div>
          ) : filteredCategoryData.length === 0 ? (
            <div className="p-12 text-center text-brand-muted text-xs bg-white rounded-2xl border border-brand-border">
              No categories or products found matching your search.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCategoryData.map((category) => {
                const isExpanded = !!expandedCategories[category.id];
                const presetState = categoryPresetInputs[category.id] || {
                  rating: category.rating_avg || 4.9,
                  count: 128,
                };

                return (
                  <div
                    key={category.id}
                    className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden transition-all"
                  >
                    {/* Category Header Card */}
                    <div
                      onClick={() => toggleCategoryExpand(category.id)}
                      className="p-4 sm:p-5 bg-[#FAF8FC] hover:bg-[#F6F2F9] cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors select-none"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="p-1 rounded-lg bg-white border border-brand-border text-brand-tertiary">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-brand-primary" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-brand-muted" />
                          )}
                        </span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-serif font-bold text-base text-brand-tertiary">
                              {category.name}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-primary/10 text-brand-primary">
                              {category.products?.length || 0} Products
                            </span>
                          </div>
                          <span className="text-[11px] text-brand-muted font-light">
                            Slug: <code className="text-brand-tertiary font-mono">{category.slug}</code> • Current Category Avg:{' '}
                            <span className="font-semibold text-amber-600">
                              {category.average_product_rating || 4.9} ★
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Category-Wide Quick Preset Tuner */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex flex-wrap items-center gap-2 bg-white p-2.5 rounded-xl border border-brand-border shadow-xs"
                      >
                        <span className="text-[10.5px] font-caps tracking-wider text-brand-muted uppercase font-bold">
                          Category Preset:
                        </span>

                        <div className="flex items-center space-x-1">
                          <label className="text-[10px] text-brand-muted">Avg:</label>
                          <input
                            type="number"
                            step="0.1"
                            min="1.0"
                            max="5.0"
                            value={presetState.rating}
                            onChange={(e) =>
                              setCategoryPresetInputs((prev) => ({
                                ...prev,
                                [category.id]: {
                                  ...presetState,
                                  rating: e.target.value,
                                },
                              }))
                            }
                            className="w-16 px-2 py-1 text-xs rounded-lg border border-brand-border font-bold text-amber-600 focus:outline-none focus:border-brand-primary text-center"
                          />
                        </div>

                        <div className="flex items-center space-x-1">
                          <label className="text-[10px] text-brand-muted">Count:</label>
                          <input
                            type="number"
                            min="1"
                            max="9999"
                            value={presetState.count}
                            onChange={(e) =>
                              setCategoryPresetInputs((prev) => ({
                                ...prev,
                                [category.id]: {
                                  ...presetState,
                                  count: e.target.value,
                                },
                              }))
                            }
                            className="w-16 px-2 py-1 text-xs rounded-lg border border-brand-border font-medium text-brand-tertiary focus:outline-none focus:border-brand-primary text-center"
                          />
                        </div>

                        <button
                          disabled={actionLoading}
                          onClick={() => handleApplyCategoryPreset(category.id)}
                          className="px-3 py-1 rounded-lg bg-brand-primary hover:bg-brand-primary/95 text-white text-[11px] font-semibold transition-all shadow-xs"
                        >
                          Apply to All in {category.name}
                        </button>
                      </div>
                    </div>

                    {/* Products Grid / Table inside Category */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 border-t border-brand-border">
                        {category.products?.length === 0 ? (
                          <div className="py-6 text-center text-xs text-brand-muted">
                            No products currently assigned to this category.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="text-brand-muted font-caps tracking-wider text-[10.5px] border-b border-brand-border pb-2">
                                  <th className="pb-3 px-2 font-semibold">Product</th>
                                  <th className="pb-3 px-3 font-semibold">Price</th>
                                  <th className="pb-3 px-3 font-semibold">Real Buyer Reviews</th>
                                  <th className="pb-3 px-3 font-semibold">Display Average Rating</th>
                                  <th className="pb-3 px-3 font-semibold">Display Review Count</th>
                                  <th className="pb-3 px-3 text-right font-semibold">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-brand-border/40">
                                {category.products.map((product) => (
                                  <ProductRatingRow
                                    key={product.id}
                                    product={product}
                                    onSave={(ratingAvg, reviewCount) =>
                                      handleSaveProductRating(product.id, ratingAvg, reviewCount)
                                    }
                                  />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: ADD / EDIT CUSTOMER REVIEW (+ PHOTO UPLOAD)
         ───────────────────────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-brand-border">
            {/* Modal Header */}
            <div className="p-5 border-b border-brand-border flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
                  <Star className="w-4 h-4 fill-current" />
                </span>
                <h3 className="font-serif font-bold text-base text-brand-tertiary">
                  {editingReview ? 'Edit Customer Review' : 'Create New Customer Review'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-brand-muted hover:text-brand-tertiary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveReview} className="p-5 space-y-4 text-xs">
              {/* Product Selection */}
              <div>
                <label className="block font-semibold text-brand-tertiary mb-1">
                  Product <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary bg-white"
                  required
                >
                  <option value="">— Select Target Product —</option>
                  {productsDropdown.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) {p.category_name ? `• ${p.category_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reviewer Name & Star Rating Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-brand-tertiary mb-1">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.reviewer_name}
                    onChange={(e) => setFormData({ ...formData, reviewer_name: e.target.value })}
                    placeholder="e.g. Ananya Sharma"
                    className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-brand-tertiary mb-1">
                    Star Rating <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center space-x-1.5 py-1">
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <button
                        type="button"
                        key={starVal}
                        onClick={() => setFormData({ ...formData, rating: starVal })}
                        className="p-1 hover:scale-125 transition-transform"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            starVal <= formData.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'fill-gray-200 text-gray-200'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 font-bold text-brand-tertiary text-xs">
                      {formData.rating}.0 Stars
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Title */}
              <div>
                <label className="block font-semibold text-brand-tertiary mb-1">
                  Review Headline / Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Stunning craftsmanship and completely waterproof!"
                  className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>

              {/* Review Comment */}
              <div>
                <label className="block font-semibold text-brand-tertiary mb-1">
                  Review Text / Feedback <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  placeholder="Write the customer's detailed feedback, unboxing impressions, or anti-tarnish test results..."
                  className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary leading-relaxed"
                />
              </div>

              {/* Product Photo Upload Section */}
              <div className="bg-[#FAF8FC] p-4 rounded-xl border border-brand-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Camera className="w-4 h-4 text-brand-primary" />
                    <span className="font-semibold text-brand-tertiary text-xs">
                      Customer Product Photos
                    </span>
                  </div>
                  <span className="text-[11px] text-brand-muted">JPG, PNG, WEBP (Max 15MB)</span>
                </div>

                {/* Uploaded Photos Preview List */}
                {formData.images && formData.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {formData.images.map((photoUrl, idx) => (
                      <div
                        key={idx}
                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-brand-border group shadow-xs bg-white"
                      >
                        <img
                          src={photoUrl}
                          alt={`Review photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photoUrl)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white opacity-90 hover:opacity-100 transition-opacity shadow-sm"
                          title="Remove photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* File Upload Trigger */}
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoFileUpload}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-white border border-brand-border hover:bg-white/80 text-brand-tertiary font-semibold flex items-center space-x-1.5 shadow-xs transition-colors"
                  >
                    <Upload className={`w-3.5 h-3.5 ${uploadingPhoto ? 'animate-spin' : ''}`} />
                    <span>{uploadingPhoto ? 'Uploading photo...' : 'Upload Review Photo'}</span>
                  </button>

                  <span className="text-[11px] text-brand-muted">or paste photo URL below</span>
                </div>

                {/* Direct Image URL input */}
                <div>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        image_url: val,
                        images: val ? [val] : [],
                      }));
                    }}
                    placeholder="https://.../review-photo.jpg"
                    className="w-full px-3 py-1.5 rounded-lg border border-brand-border text-xs focus:outline-none focus:border-brand-primary bg-white"
                  />
                </div>
              </div>

              {/* Status, Verified Buyer, & Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-brand-tertiary mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary bg-white"
                  >
                    <option value="approved">Approved (Live)</option>
                    <option value="pending">Pending Moderation</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-brand-tertiary mb-1">
                    Verified Buyer
                  </label>
                  <select
                    value={formData.is_verified_buyer}
                    onChange={(e) =>
                      setFormData({ ...formData, is_verified_buyer: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary bg-white"
                  >
                    <option value={1}>Yes (Show Green Badge)</option>
                    <option value={0}>No Badge</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-brand-tertiary mb-1">Review Date</label>
                  <input
                    type="date"
                    value={formData.created_at}
                    onChange={(e) => setFormData({ ...formData, created_at: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary bg-white"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-brand-border flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-brand-border hover:bg-[#FAF8FC] text-brand-tertiary font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-white font-semibold flex items-center space-x-1.5 shadow-sm transition-all"
                >
                  {actionLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{editingReview ? 'Save Changes' : 'Create Review'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          LIGHTBOX MODAL FOR REVIEW PHOTO INSPECTION
         ───────────────────────────────────────────────────────────────────────────── */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <button
            onClick={() => setPreviewPhotoUrl(null)}
            className="absolute top-5 right-5 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewPhotoUrl}
            alt="Customer review photo preview"
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          DELETE CONFIRMATION MODAL
         ───────────────────────────────────────────────────────────────────────────── */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 border border-brand-border shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-brand-tertiary">
                {deleteConfirm.isBulk
                  ? `Delete ${selectedIds.length} Reviews?`
                  : 'Delete Customer Review?'}
              </h3>
              <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                This action is permanent and cannot be undone. Are you sure you want to remove this
                customer review from the database?
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setDeleteConfirm({ open: false, isBulk: false, reviewId: null })
                }
                className="flex-1 py-2 rounded-xl border border-brand-border hover:bg-[#FAF8FC] text-brand-tertiary text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center justify-center space-x-1"
              >
                {actionLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Interactive Product Rating Row in Category View
// ─────────────────────────────────────────────────────────────────────────────
function ProductRatingRow({ product, onSave }) {
  const [ratingVal, setRatingVal] = useState(
    product.rating_avg !== null && product.rating_avg !== undefined
      ? product.rating_avg
      : product.effective_rating || 4.9
  );
  const [countVal, setCountVal] = useState(
    product.review_count !== null && product.review_count !== undefined
      ? product.review_count
      : product.effective_reviews_count || 128
  );
  const [dirty, setDirty] = useState(false);

  const handleSaveRow = () => {
    onSave(ratingVal ? Number(ratingVal) : null, countVal ? Number(countVal) : null);
    setDirty(false);
  };

  return (
    <tr className="hover:bg-[#FCFAFE] transition-colors">
      {/* Product Thumbnail & Name */}
      <td className="py-3 px-2 align-middle">
        <div className="flex items-center space-x-2.5">
          {product.primary_image ? (
            <img
              src={product.primary_image}
              alt={product.name}
              className="w-9 h-9 rounded-lg object-cover border border-brand-border shrink-0 bg-brand-light"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-brand-light border border-brand-border flex items-center justify-center text-brand-muted shrink-0">
              <Tag className="w-3.5 h-3.5" />
            </div>
          )}
          <div className="min-w-0">
            <span className="font-semibold text-brand-tertiary line-clamp-1 block text-xs">
              {product.name}
            </span>
            <span className="text-[10px] text-brand-muted font-mono">{product.sku}</span>
          </div>
        </div>
      </td>

      {/* Selling Price */}
      <td className="py-3 px-3 align-middle font-bold text-brand-tertiary text-xs">
        ₹{Math.round(product.price).toLocaleString('en-IN')}
      </td>

      {/* Real Reviews */}
      <td className="py-3 px-3 align-middle text-xs">
        {product.real_reviews_count > 0 ? (
          <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border border-emerald-200">
            <span>{product.real_reviews_count} Reviews</span>
            <span>({product.real_reviews_avg}★)</span>
          </span>
        ) : (
          <span className="text-brand-muted text-[11px] font-light">0 real reviews</span>
        )}
      </td>

      {/* Target Display Rating Input */}
      <td className="py-3 px-3 align-middle">
        <div className="flex items-center space-x-1.5">
          <input
            type="number"
            step="0.1"
            min="1.0"
            max="5.0"
            value={ratingVal}
            onChange={(e) => {
              setRatingVal(e.target.value);
              setDirty(true);
            }}
            className="w-16 px-2 py-1 text-xs rounded-lg border border-brand-border font-bold text-amber-600 focus:outline-none focus:border-brand-primary text-center bg-white shadow-xs"
          />
          <span className="text-amber-500 font-bold">★</span>
          {/* Quick preset buttons */}
          <button
            type="button"
            onClick={() => {
              setRatingVal(4.9);
              setDirty(true);
            }}
            className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold"
            title="Set to 4.9"
          >
            4.9
          </button>
          <button
            type="button"
            onClick={() => {
              setRatingVal(5.0);
              setDirty(true);
            }}
            className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold"
            title="Set to 5.0"
          >
            5.0
          </button>
        </div>
      </td>

      {/* Target Review Count Input */}
      <td className="py-3 px-3 align-middle">
        <div className="flex items-center space-x-1">
          <input
            type="number"
            min="1"
            max="99999"
            value={countVal}
            onChange={(e) => {
              setCountVal(e.target.value);
              setDirty(true);
            }}
            className="w-20 px-2 py-1 text-xs rounded-lg border border-brand-border font-medium text-brand-tertiary focus:outline-none focus:border-brand-primary text-center bg-white shadow-xs"
          />
          <span className="text-brand-muted text-[11px]">reviews</span>
        </div>
      </td>

      {/* Action / Save Button */}
      <td className="py-3 px-3 align-middle text-right">
        <button
          onClick={handleSaveRow}
          disabled={!dirty}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            dirty
              ? 'bg-brand-primary text-white shadow-sm hover:bg-brand-primary/95'
              : 'bg-gray-100 text-gray-400 cursor-default'
          }`}
        >
          Save
        </button>
      </td>
    </tr>
  );
}
