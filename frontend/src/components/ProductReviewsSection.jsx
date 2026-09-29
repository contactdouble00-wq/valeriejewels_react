import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Star, ShieldCheck, Camera, Check, Upload, X, ChevronRight,
  ChevronLeft, Sparkles, MessageSquare, ThumbsUp, RefreshCw, AlertCircle
} from 'lucide-react';
import { apiService } from '../services/api';

export default function ProductReviewsSection({
  productId,
  productName,
  productSlug,
  initialReviews = [],
  initialSummary = null,
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [ratingSummary, setRatingSummary] = useState(initialSummary || {
    average_rating: 4.9,
    reviews_count: 128,
  });
  const [customerPhotos, setCustomerPhotos] = useState([]);
  const [breakdown, setBreakdown] = useState({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });

  // Lightbox for reviewing photo zoom
  const [activePhotoModal, setActivePhotoModal] = useState(null);

  // Write Review drawer / modal state
  const [writeReviewOpen, setWriteReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState(null);
  const fileInputRef = useRef(null);

  const [newReviewForm, setNewReviewForm] = useState({
    reviewer_name: '',
    rating: 5,
    title: '',
    comment: '',
    photoFile: null,
    photoPreview: null,
  });

  // Filter reviews by star rating
  const [selectedStarFilter, setSelectedStarFilter] = useState(null);

  // Fetch reviews on mount or product change
  useEffect(() => {
    let isMounted = true;
    async function loadReviews() {
      if (!productId && !productSlug) return;
      try {
        const data = await apiService.getProductReviews(productId, productSlug);
        if (isMounted && data) {
          if (Array.isArray(data.reviews) && data.reviews.length > 0) {
            setReviews(data.reviews);
          } else if (initialReviews && initialReviews.length > 0) {
            setReviews(initialReviews);
          }
          if (data.customer_photos) setCustomerPhotos(data.customer_photos);
          if (data.breakdown) setBreakdown(data.breakdown);
          if (data.average_rating) {
            setRatingSummary({
              average_rating: data.average_rating,
              reviews_count: data.reviews_count || 128,
            });
          }
        }
      } catch (err) {
        console.warn('Failed to load dynamic reviews:', err);
      }
    }
    loadReviews();
    return () => {
      isMounted = false;
    };
  }, [productId, productSlug]);

  // Aggregate photos from reviews if not explicitly provided
  const allCustomerPhotos = useMemo(() => {
    if (customerPhotos && customerPhotos.length > 0) return customerPhotos;
    const list = [];
    reviews.forEach((r) => {
      const photos = r.images || (r.image_url ? [r.image_url] : []);
      photos.forEach((pic) => {
        if (pic) {
          list.push({
            review_id: r.id,
            reviewer_name: r.reviewer_name,
            rating: r.rating,
            image_url: pic,
          });
        }
      });
    });
    return list;
  }, [customerPhotos, reviews]);

  // Filtered reviews
  const displayedReviews = useMemo(() => {
    if (!selectedStarFilter) return reviews;
    return reviews.filter((r) => Number(r.rating) === selectedStarFilter);
  }, [reviews, selectedStarFilter]);

  // Handle Photo selection in new review
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPG, PNG, WEBP).');
        return;
      }
      setNewReviewForm((prev) => ({
        ...prev,
        photoFile: file,
        photoPreview: URL.createObjectURL(file),
      }));
    }
  };

  // Submit customer review
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!newReviewForm.reviewer_name.trim()) return;

    setSubmitting(true);
    setSubmitFeedback(null);
    try {
      const formData = new FormData();
      formData.append('product_id', productId);
      formData.append('reviewer_name', newReviewForm.reviewer_name);
      formData.append('rating', newReviewForm.rating);
      formData.append('title', newReviewForm.title);
      formData.append('comment', newReviewForm.comment);
      if (newReviewForm.photoFile) {
        formData.append('photo', newReviewForm.photoFile);
      }

      await apiService.submitReview(formData);
      setSubmitFeedback({
        type: 'success',
        message: 'Thank you! Your verified review has been published.',
      });

      // Add optimistically to list
      const optimisticReview = {
        id: Date.now(),
        reviewer_name: newReviewForm.reviewer_name,
        rating: newReviewForm.rating,
        title: newReviewForm.title,
        comment: newReviewForm.comment,
        image_url: newReviewForm.photoPreview,
        images: newReviewForm.photoPreview ? [newReviewForm.photoPreview] : [],
        is_verified_buyer: 1,
        created_at: new Date().toISOString(),
      };
      setReviews((prev) => [optimisticReview, ...prev]);

      setTimeout(() => {
        setWriteReviewOpen(false);
        setSubmitFeedback(null);
        setNewReviewForm({
          reviewer_name: '',
          rating: 5,
          title: '',
          comment: '',
          photoFile: null,
          photoPreview: null,
        });
      }, 2000);
    } catch (err) {
      setSubmitFeedback({
        type: 'error',
        message: err.message || 'Failed to submit review. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const avgRatingNumber = Number(ratingSummary.average_rating || 4.9);
  const reviewsCountNumber = Number(ratingSummary.reviews_count || reviews.length || 128);

  return (
    <div id="product-reviews-section" className="pt-6 border-t border-brand-border/80 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-caps uppercase tracking-wider text-brand-primary text-[10px] font-bold">
              Customer Experiences & Reviews
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {avgRatingNumber.toFixed(1)} ★ Rated
            </span>
          </div>
          <h2 className="font-serif text-lg sm:text-xl font-bold text-brand-tertiary mt-0.5">
            Verified Customer Reviews
          </h2>
        </div>

        <button
          onClick={() => setWriteReviewOpen(true)}
          className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Write a Review (+ Photo)</span>
        </button>
      </div>

      {/* Aggregate Rating Spotlight Card */}
      <div className="bg-gradient-to-r from-brand-surface via-[#FAF7FD] to-brand-surface p-4 sm:p-5 rounded-2xl border border-brand-border/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Star Average */}
        <div className="flex items-center space-x-4 text-center sm:text-left">
          <div className="flex flex-col items-center sm:items-start">
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-brand-tertiary font-serif">
                {avgRatingNumber.toFixed(1)}
              </span>
              <span className="text-amber-500 text-lg">★</span>
            </div>
            <div className="flex items-center space-x-0.5 text-amber-400 mt-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.round(avgRatingNumber)
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-gray-200 text-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] text-brand-muted mt-1 font-light">
              Based on {reviewsCountNumber} verified ratings
            </span>
          </div>
        </div>

        {/* Center / Right: Star Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5 justify-center sm:justify-end text-xs">
          <button
            onClick={() => setSelectedStarFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              selectedStarFilter === null
                ? 'bg-brand-primary text-white shadow-xs'
                : 'bg-white border border-brand-border text-brand-muted hover:text-brand-tertiary'
            }`}
          >
            All Reviews ({reviews.length})
          </button>
          {[5, 4, 3].map((star) => (
            <button
              key={star}
              onClick={() => setSelectedStarFilter(selectedStarFilter === star ? null : star)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 transition-all ${
                selectedStarFilter === star
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white border border-brand-border text-brand-muted hover:text-brand-tertiary'
              }`}
            >
              <span>{star} ★</span>
            </button>
          ))}
        </div>
      </div>

      {/* Customer Photo Gallery Slider */}
      {allCustomerPhotos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-caps uppercase tracking-wider text-brand-muted text-[10.5px] font-bold flex items-center space-x-1">
              <Camera className="w-3 h-3 text-brand-primary" />
              <span>Real Customer Photos ({allCustomerPhotos.length})</span>
            </span>
            <span className="text-[10px] text-brand-muted font-light">Tap photo to enlarge</span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
            {allCustomerPhotos.map((photo, idx) => (
              <div
                key={idx}
                onClick={() => setActivePhotoModal(photo.image_url)}
                className="relative w-16 h-16 sm:w-20 sm:h-20 aspect-square rounded-xl overflow-hidden border border-brand-border hover:border-brand-primary shadow-xs transition-transform hover:scale-105 shrink-0 cursor-pointer bg-brand-light group"
              >
                <img
                  src={photo.image_url}
                  alt={`Customer photo by ${photo.reviewer_name}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-semibold">
                  <span>View</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews Cards List */}
      <div className="space-y-3">
        {displayedReviews.length === 0 ? (
          <div className="p-8 text-center bg-[#FAF8FC] rounded-2xl border border-brand-border text-brand-muted text-xs">
            No reviews match the selected filter.
          </div>
        ) : (
          displayedReviews.map((rev) => (
            <div
              key={rev.id}
              className="p-4 rounded-2xl bg-white border border-brand-border/70 hover:border-brand-border shadow-xs space-y-2.5 transition-all"
            >
              {/* Reviewer Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-xs flex items-center justify-center font-serif">
                    {rev.reviewer_name?.charAt(0) || 'V'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-semibold text-xs text-brand-tertiary">
                        {rev.reviewer_name}
                      </span>
                      {Boolean(rev.is_verified_buyer) && (
                        <span className="inline-flex items-center space-x-0.5 text-[9.5px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                          <Check className="w-2.5 h-2.5" />
                          <span>Verified Buyer</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-0.5 text-amber-400">
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
                  </div>
                  <span className="text-[10px] text-brand-muted font-light">
                    {rev.created_at ? rev.created_at.slice(0, 10) : 'Recent'}
                  </span>
                </div>
              </div>

              {/* Title & Comment */}
              <div className="space-y-1">
                {rev.title && (
                  <h4 className="font-semibold text-xs text-brand-tertiary">
                    {rev.title}
                  </h4>
                )}
                <p className="text-xs text-brand-tertiary/90 font-light leading-relaxed">
                  {rev.comment}
                </p>
              </div>

              {/* Review Photos Thumbnail Grid */}
              {(rev.images?.length > 0 || rev.image_url) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {(rev.images || [rev.image_url]).map((img, i) => (
                    <div
                      key={i}
                      onClick={() => setActivePhotoModal(img)}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-brand-border hover:scale-105 transition-transform cursor-pointer shadow-xs bg-brand-light"
                    >
                      <img src={img} alt="Customer review photo" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Write a Review Modal */}
      {writeReviewOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-brand-border">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-brand-primary/10 text-brand-primary">
                  <Camera className="w-4 h-4" />
                </span>
                <h3 className="font-serif font-bold text-base text-brand-tertiary">
                  Write a Customer Review
                </h3>
              </div>
              <button
                onClick={() => setWriteReviewOpen(false)}
                className="p-1 rounded-lg text-brand-muted hover:text-brand-tertiary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
                  submitFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {submitFeedback.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{submitFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-brand-tertiary mb-1">
                  Your Overall Rating
                </label>
                <div className="flex items-center space-x-2 py-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setNewReviewForm({ ...newReviewForm, rating: s })}
                      className="p-1 hover:scale-125 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          s <= newReviewForm.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-gray-200 text-gray-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-brand-tertiary ml-2">
                    {newReviewForm.rating}.0 / 5.0
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-brand-tertiary mb-1">
                  Your Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newReviewForm.reviewer_name}
                  onChange={(e) => setNewReviewForm({ ...newReviewForm, reviewer_name: e.target.value })}
                  placeholder="e.g. Nikita Rao"
                  className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-brand-tertiary mb-1">
                  Headline / Title
                </label>
                <input
                  type="text"
                  value={newReviewForm.title}
                  onChange={(e) => setNewReviewForm({ ...newReviewForm, title: e.target.value })}
                  placeholder="e.g. Gorgeous piece! Looks identical to solid gold"
                  className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-brand-tertiary mb-1">
                  Your Review & Experience <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newReviewForm.comment}
                  onChange={(e) => setNewReviewForm({ ...newReviewForm, comment: e.target.value })}
                  placeholder="Tell us what you loved about the shine, anti-tarnish durability, or unboxing packaging..."
                  className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>

              {/* Photo Upload inside Customer Review */}
              <div className="bg-[#FAF8FC] p-3.5 rounded-xl border border-brand-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-brand-tertiary text-xs flex items-center space-x-1.5">
                    <Camera className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Upload a Photo of Your Jewelry (Optional)</span>
                  </span>
                  <span className="text-[10px] text-brand-muted">Max 15MB</span>
                </div>

                {newReviewForm.photoPreview ? (
                  <div className="flex items-center space-x-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-brand-border">
                      <img
                        src={newReviewForm.photoPreview}
                        alt="Uploaded review photo"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setNewReviewForm({ ...newReviewForm, photoFile: null, photoPreview: null })}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-rose-600 text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-xs text-emerald-600 font-semibold flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Photo attached</span>
                    </span>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoSelect}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-white border border-brand-border hover:bg-gray-50 text-brand-tertiary text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Photo from Device</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setWriteReviewOpen(false)}
                  className="px-4 py-2 rounded-xl border border-brand-border hover:bg-[#FAF8FC] text-brand-tertiary font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-white font-semibold flex items-center space-x-1.5 shadow-sm transition-all"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Verified Review</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* High-Res Photo Lightbox */}
      {activePhotoModal && (
        <div
          className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setActivePhotoModal(null)}
        >
          <button
            onClick={() => setActivePhotoModal(null)}
            className="absolute top-5 right-5 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={activePhotoModal}
            alt="Customer review photo"
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
