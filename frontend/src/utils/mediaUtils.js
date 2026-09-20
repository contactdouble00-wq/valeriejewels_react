/**
 * VALERIE JEWELS — Media & Image URL Normalization Utilities
 */

/**
 * Normalizes any uploaded media URL to point directly to /api/uploads/
 * Handles legacy/missing /api prefix and ensures HTTPS consistency.
 */
export function normalizeMediaUrl(url) {
  if (!url || typeof url !== 'string') return url || '';
  
  // Convert http:// to https:// on production
  let clean = url.trim();
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && clean.startsWith('http://')) {
    clean = clean.replace(/^http:\/\//i, 'https://');
  }

  // Rewrite /uploads/ to /api/uploads/ if missing /api
  // Matches:
  // "https://valeriejewels.in/uploads/xyz.png" -> "https://valeriejewels.in/api/uploads/xyz.png"
  // "/uploads/xyz.png" -> "/api/uploads/xyz.png"
  clean = clean.replace(/^(https?:\/\/[^\/]+)?\/uploads\//i, (match, domain) => {
    return `${domain || ''}/api/uploads/`;
  });

  return clean;
}

/**
 * Checks if a media item or URL is a video
 */
export function isVideoMedia(item) {
  if (!item) return false;
  if (typeof item === 'object' && item.media_type === 'video') return true;
  const url = typeof item === 'string' ? item : (item.image_url || item.url || '');
  return typeof url === 'string' && /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url);
}

/**
 * Normalizes a product object's media properties
 * - Ensures all image_urls use /api/uploads/
 * - Prevents primary_image from being a video when photo images exist
 */
export function normalizeProductMedia(product) {
  if (!product || typeof product !== 'object') return product;

  const p = { ...product };

  if (p.video_url) {
    p.video_url = normalizeMediaUrl(p.video_url);
  }

  if (p.primary_image) {
    p.primary_image = normalizeMediaUrl(p.primary_image);
  }

  if (Array.isArray(p.images)) {
    p.images = p.images.map((img, idx) => {
      if (typeof img === 'string') {
        const u = normalizeMediaUrl(img);
        return {
          id: `img-${idx}`,
          image_url: u,
          url: u,
          media_type: isVideoMedia(u) ? 'video' : 'image',
          display_order: idx,
          is_primary: idx === 0 ? 1 : 0,
        };
      }
      if (img && typeof img === 'object') {
        const u = normalizeMediaUrl(img.image_url || img.url);
        return {
          ...img,
          image_url: u,
          url: u,
          media_type: img.media_type || (isVideoMedia(u) ? 'video' : 'image'),
        };
      }
      return img;
    });

    // If primary_image is a video file or missing, select the first photo from images
    const isPrimaryVideo = isVideoMedia(p.primary_image);
    if (isPrimaryVideo || !p.primary_image) {
      const firstPhoto = p.images.find((img) => !isVideoMedia(img));
      if (firstPhoto) {
        p.primary_image = firstPhoto.image_url || firstPhoto.url;
      }
    }
  }

  return p;
}
