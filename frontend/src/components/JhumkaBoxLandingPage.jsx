import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  ShoppingBag,
  Star,
  ShieldCheck,
  Check,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Heart,
  Eye,
  Truck,
  RotateCcw,
  Zap,
  Award,
  Layers,
  Flame,
  ExternalLink
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { apiService } from '../services/api';

const FAQS = [
  {
    q: "What is included inside the Valerie Jewels Jhumka Box?",
    a: "Our signature Jhumka Box collection includes either the 16-Pair Vintage Oxidized Silver Collection or the 6-Pair Royal Noor 18K Micro-Gold Festive Set. Each set arrives pre-organized inside our custom-fitted, rigid luxury velvet keepsake organizer with individual compartments and secure closures."
  },
  {
    q: "Will these jhumkas tarnish or turn black over time?",
    a: "No! Unlike standard fashion jewelry, our oxidized silver pieces are crafted using German silver brass alloy with an electroplated protective seal. Our gold editions use 18K micro-gold vacuum plating that resists sweat, moisture, and daily oxidation."
  },
  {
    q: "Are the earrings heavy on the ears?",
    a: "Every piece has been engineered to be ultra-lightweight (under 12-18g per pair depending on design). They feature hypoallergenic, smooth surgical-grade brass hooks that prevent earlobe stretching, so you can dance and wear them comfortably all day and night."
  },
  {
    q: "How does Valerie Jewels compare to other 12-pair jhumka boxes online?",
    a: "Competitors offer only 12 pairs with repetitive designs packed in flimsy plastic or velvet pouches. Valerie Jewels delivers 16 distinct, handcrafted traditional designs (Dome, Peacock, Chandbali, Temple, Mirror, Floral Filigree) in a heavy-duty luxury organizer box at less than ₹82 per pair."
  },
  {
    q: "Is Cash on Delivery (COD) and Free Shipping available?",
    a: "Yes! We offer 100% Free Express Shipping across all pin codes in India. Cash on Delivery (COD) is available with instant SMS order verification. Orders are dispatched from Jaipur/Mumbai within 24 hours."
  },
  {
    q: "Can I gift the Jhumka Box directly to someone?",
    a: "Absolutely! The Jhumka Box comes packaged in our signature Valerie Jewels embossed gift packaging with ribbon detailing. You can enter the recipient's address at checkout, and no invoice price will be displayed on the gift box."
  }
];

const COMPARISON_ROWS = [
  { feature: "Total Pairs Included", valerie: "16 Curated Pairs", competitor: "Only 12 Basic Pairs", highlight: true },
  { feature: "Price Per Pair", valerie: "Under ₹82 / pair", competitor: "₹125+ / pair", highlight: true },
  { feature: "Organizer Box", valerie: "Rigid Luxury Velvet Keepsake Box", competitor: "Flimsy Velvet Pouch / Soft Box", highlight: false },
  { feature: "Anti-Tarnish Seal", valerie: "Triple-Dip Electroplated Coat", competitor: "Standard Uncoated Brass", highlight: false },
  { feature: "Ear Hook Comfort", valerie: "Hypoallergenic Earlobe-Safe Hooks", competitor: "Standard Heavy Metal Hooks", highlight: false },
  { feature: "Dispatch Time", valerie: "Dispatched in 24 Hours", competitor: "3 to 5 Business Days", highlight: false },
  { feature: "Payment Options", valerie: "COD + Prepaid + UPI Instant", competitor: "Prepaid Only or High COD Fees", highlight: false }
];

const REVIEWS = [
  {
    name: "Ananya Sharma",
    city: "New Delhi",
    rating: 5,
    verified: true,
    date: "2 days ago",
    title: "16 pairs for this price is unbeatable!",
    comment: "I saw the 12-pair boxes on Everlasting and other sites for almost the same price, but Valerie gives 16 pairs! Every single design is different. The dome jhumkas and the peacock drops are heavy looking yet so light on the ear. The velvet box keeps them all organized."
  },
  {
    name: "Pooja Reddy",
    city: "Hyderabad",
    rating: 5,
    verified: true,
    date: "5 days ago",
    title: "The velvet box itself feels like pure luxury.",
    comment: "Ordered via COD and got it in 3 days. The packaging is gorgeous. None of the pairs have tarnished even after 3 wedding functions in humid weather. Highly recommend to all ethnic lovers!"
  },
  {
    name: "Meera Kulkarni",
    city: "Mumbai",
    rating: 5,
    verified: true,
    date: "1 week ago",
    title: "Bought 2 boxes—one for me, one for my sister",
    comment: "The extra 10% coupon worked automatically. We divided the pieces between daily office kurtis and grand lehenga events. Outstanding quality!"
  }
];

export default function JhumkaBoxLandingPage({
  onOpenPdp,
  onBuyNow,
  onNavigateHome,
  allProducts = []
}) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [openFaqIdx, setOpenFaqIdx] = useState(0);
  const [activeTab, setActiveTab] = useState('16-pairs'); // '16-pairs' | '6-pairs-gold'
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Dynamic SEO Metadata & Schema Injection
  useEffect(() => {
    const originalTitle = document.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    const originalDesc = metaDesc ? metaDesc.getAttribute('content') : '';

    // Set keyword-targeted Title & Meta Description
    document.title = "Jhumka Box - 16 Pairs Luxury Oxidized & Gold Jhumki Organizer Box | Valerie Jewels";
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        "Shop the viral Jhumka Box online in India at Valerie Jewels. Handcrafted 16-pair oxidized & 6-pair 18K micro-gold plated jhumkas in a velvet luxury organizer. Free shipping & COD available."
      );
    }

    // Set or Update Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    let createdCanonical = false;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
      createdCanonical = true;
    }
    const originalCanonical = canonical.getAttribute('href');
    canonical.setAttribute('href', 'https://valeriejewels.in/jhumka-box');

    // Inject Google Rich Snippet JSON-LD Schema (Product + FAQPage)
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.id = 'vj-jhumka-box-schema';
    schemaScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Product",
          "@id": "https://valeriejewels.in/jhumka-box#product",
          "name": "16 Pairs Oxidized Silver Jhumka Box Set for Women",
          "alternateName": "Jhumkha Box Luxury Keepsake Organizer",
          "image": [
            "https://valeriejewels.in/api/uploads/img_24a8464b38f849eb7ab6a286e7d9782a.png",
            "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80"
          ],
          "description": "Handcrafted vintage collection of 16 pairs traditional Indian ethnic jhumka & dangle earrings in a luxury rigid velvet keepsake organizer box. Features anti-tarnish protective coating and lightweight comfort hooks.",
          "sku": "VJ-OXD-016",
          "brand": {
            "@type": "Brand",
            "name": "Valerie Jewels"
          },
          "offers": {
            "@type": "Offer",
            "url": "https://valeriejewels.in/jhumka-box",
            "priceCurrency": "INR",
            "price": "1299",
            "priceValidUntil": "2027-12-31",
            "itemCondition": "https://schema.org/NewCondition",
            "availability": "https://schema.org/InStock",
            "seller": {
              "@type": "Organization",
              "name": "Valerie Jewels"
            }
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": "1240",
            "bestRating": "5",
            "worstRating": "1"
          }
        },
        {
          "@type": "FAQPage",
          "@id": "https://valeriejewels.in/jhumka-box#faqs",
          "mainEntity": FAQS.map((f) => ({
            "@type": "Question",
            "name": f.q,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": f.a
            }
          }))
        }
      ]
    });
    document.head.appendChild(schemaScript);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Clean up on component unmount to ensure 0 regression on other views
    return () => {
      document.title = originalTitle;
      if (metaDesc && originalDesc) {
        metaDesc.setAttribute('content', originalDesc);
      }
      if (createdCanonical && canonical.parentNode) {
        canonical.parentNode.removeChild(canonical);
      } else if (canonical && originalCanonical) {
        canonical.setAttribute('href', originalCanonical);
      }
      const existingSchema = document.getElementById('vj-jhumka-box-schema');
      if (existingSchema && existingSchema.parentNode) {
        existingSchema.parentNode.removeChild(existingSchema);
      }
    };
  }, []);

  // Fetch or filter jhumka products
  useEffect(() => {
    let isMounted = true;
    async function loadJhumkaProducts() {
      try {
        setLoading(true);
        const res = await apiService.getProducts({ category: 'jhumkha-box' });
        if (isMounted && res?.products && res.products.length > 0) {
          setFeaturedProducts(res.products);
        } else if (isMounted && allProducts.length > 0) {
          const filtered = allProducts.filter(
            (p) =>
              (p.slug || '').includes('jhumk') ||
              (p.name || '').toLowerCase().includes('jhumk') ||
              p.category_id === 1 ||
              p.id === 6
          );
          setFeaturedProducts(filtered);
        }
      } catch (_) {
        // Fallback gracefully
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadJhumkaProducts();
    return () => { isMounted = false; };
  }, [allProducts]);

  // Main 16-pair product data fallback
  const main16PairProduct = featuredProducts.find((p) => p.id === 6 || (p.slug || '').includes('16-pair')) || {
    id: 6,
    name: "16 Pairs Oxidized Silver Earrings Set for Women | Traditional Indian Ethnic Jhumka Box",
    slug: "16-pairs-oxidized-silver-earrings-set-for-women-traditional-indian-ethnic-jhumka-dangle-earrings",
    price: 1299,
    mrp: 2499,
    pairs_count: 16,
    material: "German Silver Alloy with Vintage Oxidized Silver Polish",
    primary_image: "https://valeriejewels.in/api/uploads/img_24a8464b38f849eb7ab6a286e7d9782a.png",
    rating_avg: 4.9,
    review_count: 840
  };

  // 6-pair gold product data fallback
  const gold6PairProduct = featuredProducts.find((p) => p.id === 1 || (p.slug || '').includes('royal-noor')) || {
    id: 1,
    name: "The Royal Noor Jhumka Box (6 Pair Festive Edition)",
    slug: "royal-noor-jhumka-box",
    price: 1799,
    mrp: 3499,
    pairs_count: 6,
    material: "18K Micro-Gold Plated Stainless Steel with Micro-Pearls",
    primary_image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80",
    rating_avg: 4.8,
    review_count: 165
  };

  const activeProduct = activeTab === '16-pairs' ? main16PairProduct : gold6PairProduct;
  const discountPercent = activeProduct.mrp && activeProduct.mrp > activeProduct.price
    ? Math.round(((activeProduct.mrp - activeProduct.price) / activeProduct.mrp) * 100)
    : 48;

  return (
    <div className="space-y-10 sm:space-y-16 animate-in fade-in duration-300">

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-brand-muted">
        <button
          onClick={onNavigateHome}
          className="hover:text-brand-primary transition-colors underline-offset-4 hover:underline"
        >
          Home
        </button>
        <span>/</span>
        <button
          onClick={onNavigateHome}
          className="hover:text-brand-primary transition-colors underline-offset-4 hover:underline"
        >
          Jewelry Boxes
        </button>
        <span>/</span>
        <span className="text-brand-tertiary font-semibold">Jhumka Box Collection</span>
      </nav>

      {/* Hero Header with Trust Badges */}
      <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-caps tracking-widest uppercase font-bold">
          <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
          <span>India's #1 Trending Jhumka Box • 4.9★ Rated</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-editorial font-bold text-brand-tertiary tracking-tight leading-[1.12]">
          The Viral <span className="text-brand-primary font-normal italic">Jhumka Box</span>
        </h1>

        <p className="text-sm sm:text-base text-brand-muted font-light leading-relaxed max-w-2xl mx-auto">
          Why settle for just 12 pairs in a pouch? Enjoy <strong className="font-semibold text-brand-tertiary">16 handcrafted anti-tarnish pairs</strong> in our rigid luxury keepsake organizer. Delivered free to your doorstep across India.
        </p>

        {/* Quick Highlights Bar */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[11px] sm:text-xs text-brand-tertiary font-medium">
          <span className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-full border border-brand-border shadow-2xs">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>16 Unique Designs</span>
          </span>
          <span className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-full border border-brand-border shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />
            <span>100% Anti-Tarnish</span>
          </span>
          <span className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-full border border-brand-border shadow-2xs">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span>Free Shipping + COD</span>
          </span>
          <span className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-full border border-brand-border shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Free Velvet Box</span>
          </span>
        </div>
      </div>

      {/* Main Interactive Showcase (Selector between 16-Pair Oxidized and 6-Pair Gold) */}
      <section className="bg-gradient-to-b from-[#FAF7FD] via-white to-[#FAF7FD] rounded-2xl sm:rounded-3xl border border-brand-border p-4 sm:p-8 lg:p-10 shadow-sm space-y-6">

        {/* Edition Selector Tabs */}
        <div className="flex items-center justify-center gap-2 max-w-md mx-auto p-1 bg-brand-primary-light/40 rounded-xl border border-brand-border">
          <button
            onClick={() => setActiveTab('16-pairs')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-caps tracking-wider uppercase font-bold transition-all ${activeTab === '16-pairs'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-brand-tertiary hover:text-brand-primary'
              }`}
          >
            🔥 16-Pair Oxidized (₹1,299)
          </button>
          <button
            onClick={() => setActiveTab('6-pairs-gold')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-caps tracking-wider uppercase font-bold transition-all ${activeTab === '6-pairs-gold'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-brand-tertiary hover:text-brand-primary'
              }`}
          >
            ✨ 6-Pair 18K Gold (₹1,799)
          </button>
        </div>

        {/* Product Card Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">

          {/* Left Column: Visual Showcase */}
          <div className="lg:col-span-6 space-y-3">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-brand-border shadow-md group">
              <img
                src={activeProduct.primary_image || (Array.isArray(activeProduct.images) ? (activeProduct.images[0]?.image_url || activeProduct.images[0]?.url || activeProduct.images[0]) : '')}
                alt={activeProduct.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                <span className="px-2.5 py-1 rounded-full bg-brand-primary text-white text-[10px] font-caps tracking-wider uppercase font-bold shadow-sm">
                  {discountPercent}% OFF
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-caps tracking-wider uppercase font-bold shadow-sm">
                  In Stock & Ready to Ship
                </span>
              </div>

              {/* Wishlist Button */}
              <button
                onClick={() => toggleWishlist(activeProduct)}
                className="absolute top-3 right-3 p-2.5 rounded-full bg-white/90 backdrop-blur-xs text-brand-tertiary hover:text-brand-primary shadow-sm transition-colors"
                title="Save to Wishlist"
              >
                <Heart
                  className={`w-4 h-4 ${isInWishlist(activeProduct.id)
                      ? 'fill-rose-500 text-rose-500'
                      : 'text-brand-tertiary'
                    }`}
                />
              </button>

              <div className="absolute bottom-3 left-3 right-3 py-2 px-3 bg-black/65 backdrop-blur-xs text-white text-xs rounded-xl flex items-center justify-between">
                <span>Includes Rigid Keepsake Velvet Box</span>
                <span className="text-brand-gold font-bold">Free Gift Included</span>
              </div>
            </div>

            {/* Quick View Trigger */}
            <div className="text-center">
              <button
                onClick={() => onOpenPdp && onOpenPdp(activeProduct.slug, activeProduct)}
                className="inline-flex items-center space-x-1.5 text-xs text-brand-primary hover:text-brand-primary-hover font-semibold underline underline-offset-4"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Full High-Resolution Gallery & Specs</span>
              </button>
            </div>
          </div>

          {/* Right Column: Pricing & Conversion Engine */}
          <div className="lg:col-span-6 space-y-5">

            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs">
                <div className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="font-bold text-brand-tertiary">4.9 / 5.0</span>
                <span className="text-brand-muted">({activeProduct.review_count || 840} verified ratings)</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-editorial font-bold text-brand-tertiary leading-tight">
                {activeProduct.name}
              </h2>

              <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
                Handcrafted German silver and micro-plated finish. Each pair is uniquely shaped: classic domes, chandelier drops, temple peacocks, and floral motifs. Hypoallergenic and skin-safe for everyday festive comfort.
              </p>
            </div>

            {/* Pricing Section */}
            <div className="p-4 rounded-xl bg-white border border-brand-border space-y-2">
              <div className="flex items-baseline space-x-3">
                <span className="text-3xl font-editorial font-bold text-brand-primary">
                  ₹{Number(activeProduct.price).toLocaleString('en-IN')}
                </span>
                {activeProduct.mrp && (
                  <span className="text-base text-brand-muted line-through">
                    ₹{Number(activeProduct.mrp).toLocaleString('en-IN')}
                  </span>
                )}
                <span className="text-xs font-caps tracking-wider uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Save ₹{(Number(activeProduct.mrp || activeProduct.price) - Number(activeProduct.price)).toLocaleString('en-IN')} ({discountPercent}%)
                </span>
              </div>

              <p className="text-[11px] text-brand-muted flex items-center space-x-1">
                <span>Inclusive of all taxes • Only</span>
                <strong className="text-brand-tertiary font-bold">
                  ₹{Math.round(activeProduct.price / (activeProduct.pairs_count || 16))} per pair!
                </strong>
              </p>
            </div>

            {/* Special Multi-Pack Discount Code Banner */}
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-amber-900 font-medium">
                  Buy 2 or more → Get Extra 10% Off with code: <strong className="font-mono font-bold text-amber-950">VALERIE10</strong>
                </span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3 pt-1">
              <button
                onClick={() => onBuyNow && onBuyNow(activeProduct)}
                className="w-full py-3.5 px-6 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs sm:text-sm font-caps tracking-widest uppercase font-bold shadow-md hover:shadow-luxury-hover transition-all flex items-center justify-center space-x-2"
              >
                <Zap className="w-4 h-4 text-brand-gold fill-brand-gold" />
                <span>Buy Now (Fast 1-Click Checkout)</span>
              </button>

              <button
                onClick={() => addToCart(activeProduct, null, 1, true)}
                className="w-full py-3 px-6 rounded-xl bg-white border-2 border-brand-primary text-brand-primary hover:bg-brand-primary-light/40 text-xs sm:text-sm font-caps tracking-wider uppercase font-bold transition-all flex items-center justify-center space-x-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add To Bag</span>
              </button>
            </div>

            {/* Trust Reassurance Badges */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-brand-border/60 text-center">
              <div className="p-2 rounded-lg bg-gray-50/60">
                <Truck className="w-4 h-4 text-brand-primary mx-auto mb-1" />
                <p className="text-[10px] font-bold text-brand-tertiary">Free Shipping</p>
                <p className="text-[9px] text-brand-muted">All India Pin Codes</p>
              </div>
              <div className="p-2 rounded-lg bg-gray-50/60">
                <RotateCcw className="w-4 h-4 text-brand-primary mx-auto mb-1" />
                <p className="text-[10px] font-bold text-brand-tertiary">Easy Exchange</p>
                <p className="text-[9px] text-brand-muted">Transit Damage Covered</p>
              </div>
              <div className="p-2 rounded-lg bg-gray-50/60">
                <ShieldCheck className="w-4 h-4 text-brand-primary mx-auto mb-1" />
                <p className="text-[10px] font-bold text-brand-tertiary">Cash on Delivery</p>
                <p className="text-[9px] text-brand-muted">Pay at Your Doorstep</p>
              </div>
            </div>

          </div>

        </div>

      </section>

      {/* Comparison Table Section: Valerie Jewels vs Competitor */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-caps tracking-[0.2em] text-brand-primary font-bold uppercase">
            Head-to-Head Comparison
          </span>
          <h2 className="text-2xl sm:text-4xl font-editorial font-bold text-brand-tertiary">
            Why Valerie Jewels Beats The Market
          </h2>
          <p className="text-xs sm:text-sm text-brand-muted font-light">
            See how our viral Jhumka Box compares directly to standard 12-pair competitor listings online.
          </p>
        </div>

        <div className="overflow-x-auto bg-white rounded-2xl border border-brand-border shadow-xs">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-brand-border bg-gray-50/70">
                <th className="p-3 sm:p-4 font-caps tracking-wider uppercase text-brand-muted text-[11px] font-semibold">
                  Feature / Specification
                </th>
                <th className="p-3 sm:p-4 font-caps tracking-wider uppercase text-brand-primary text-xs font-bold bg-brand-primary-light/40 border-x border-brand-border">
                  ✨ Valerie Jewels Jhumka Box
                </th>
                <th className="p-3 sm:p-4 font-caps tracking-wider uppercase text-brand-muted text-[11px] font-semibold">
                  Standard 12-Pair Competitor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/40 transition-colors">
                  <td className="p-3 sm:p-4 font-medium text-brand-tertiary">
                    {row.feature}
                  </td>
                  <td className="p-3 sm:p-4 font-bold text-brand-primary bg-brand-primary-light/20 border-x border-brand-border">
                    <span className="inline-flex items-center space-x-1.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{row.valerie}</span>
                    </span>
                  </td>
                  <td className="p-3 sm:p-4 text-brand-muted">
                    {row.competitor}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Customer Reviews & Social Proof */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-caps tracking-[0.2em] text-brand-primary font-bold uppercase">
              Customer Love
            </span>
            <h2 className="text-2xl sm:text-4xl font-editorial font-bold text-brand-tertiary mt-1">
              What Jhumka Lovers Are Saying
            </h2>
          </div>
          <div className="flex items-center space-x-2 text-xs text-brand-muted">
            <span className="font-bold text-brand-tertiary">1,240+</span>
            <span>Happy Customers Across India</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {REVIEWS.map((rev, i) => (
            <div key={i} className="luxury-card rounded-2xl p-5 bg-white border border-brand-border shadow-xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-amber-400">
                    {[...Array(rev.rating)].map((_, idx) => (
                      <Star key={idx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-[10px] text-brand-muted">{rev.date}</span>
                </div>
                <h4 className="text-xs font-bold text-brand-tertiary font-caps tracking-wide">
                  "{rev.title}"
                </h4>
                <p className="text-xs text-brand-muted font-light leading-relaxed">
                  {rev.comment}
                </p>
              </div>

              <div className="pt-3 border-t border-brand-border flex items-center justify-between text-[11px]">
                <div>
                  <span className="font-semibold text-brand-tertiary">{rev.name}</span>
                  <span className="text-brand-muted"> • {rev.city}</span>
                </div>
                {rev.verified && (
                  <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-caps tracking-[0.2em] text-brand-primary font-bold uppercase">
            Got Questions?
          </span>
          <h2 className="text-2xl sm:text-4xl font-editorial font-bold text-brand-tertiary">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-brand-muted font-light">
            Everything you need to know about our Jhumka Boxes, shipping, materials, and care.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-brand-border overflow-hidden transition-all shadow-2xs"
              >
                <button
                  onClick={() => setOpenFaqIdx(isOpen ? -1 : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between space-x-4 hover:bg-gray-50/50 transition-colors"
                >
                  <span className="text-xs sm:text-sm font-semibold text-brand-tertiary">
                    {faq.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-brand-primary shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-brand-muted shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-brand-muted font-light leading-relaxed border-t border-brand-border/40 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-brand-tertiary via-[#2D2240] to-brand-tertiary text-white p-6 sm:p-12 text-center space-y-5 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-xl mx-auto space-y-3">
          <span className="text-[10px] sm:text-xs font-caps tracking-[0.2em] text-brand-gold font-bold uppercase">
            Limited Festive Edition Stock
          </span>
          <h2 className="text-2xl sm:text-4xl font-editorial font-bold tracking-tight">
            Claim Your 16-Pair Luxury Jhumka Box Today
          </h2>
          <p className="text-xs sm:text-sm text-white/80 font-light leading-relaxed">
            Free shipping across all India pin codes. 24h dispatch with live SMS order tracking.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onBuyNow && onBuyNow(main16PairProduct)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <Zap className="w-4 h-4 text-brand-gold fill-brand-gold" />
              <span>Buy 16-Pair Box Now (₹1,299)</span>
            </button>
            <button
              onClick={onNavigateHome}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-caps tracking-wider uppercase font-semibold transition-all"
            >
              Explore Full Valerie Catalog
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
