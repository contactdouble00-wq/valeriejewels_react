/**
 * VALERIE JEWELS — Dynamic SEO & Structured Data Engine
 * Manages document title, meta tags, canonical links, OpenGraph, Twitter Cards,
 * and Schema.org JSON-LD structured data for Google Search rich snippets.
 */

export const OFFICIAL_INSTAGRAM_URL = 'https://www.instagram.com/valeriejewels.in/';
export const OFFICIAL_AMAZON_STORE_URL = 'https://www.amazon.in/stores/page/4CBE4608-DBC2-4CD2-9FDF-DB829C1C9DF2';

let originalHeadState = null;

export function setPageSeo({
  title,
  description,
  canonicalUrl,
  ogType = 'website',
  ogTitle,
  ogDescription,
  ogImage,
  productPrice = null,
  twitterCard = 'summary_large_image',
  jsonLd = null,
}) {
  if (typeof document === 'undefined') return;

  // Save initial state once to restore later
  if (!originalHeadState) {
    const canonicalEl = document.querySelector("link[rel='canonical']");
    const descEl = document.querySelector("meta[name='description']");
    const ogTitleEl = document.querySelector("meta[property='og:title']");
    const ogDescEl = document.querySelector("meta[property='og:description']");
    const ogUrlEl = document.querySelector("meta[property='og:url']");
    const ogImageEl = document.querySelector("meta[property='og:image']");
    const ogTypeEl = document.querySelector("meta[property='og:type']");
    originalHeadState = {
      title: document.title,
      description: descEl ? descEl.getAttribute('content') : '',
      canonical: canonicalEl ? canonicalEl.getAttribute('href') : '',
      ogTitle: ogTitleEl ? ogTitleEl.getAttribute('content') : '',
      ogDesc: ogDescEl ? ogDescEl.getAttribute('content') : '',
      ogUrl: ogUrlEl ? ogUrlEl.getAttribute('content') : '',
      ogImage: ogImageEl ? ogImageEl.getAttribute('content') : '',
      ogType: ogTypeEl ? ogTypeEl.getAttribute('content') : 'website',
    };
  }

  // 1. Document Title
  if (title) {
    document.title = title;
  }

  // 2. Meta Description
  if (description) {
    let descMeta = document.querySelector("meta[name='description']");
    if (!descMeta) {
      descMeta = document.createElement('meta');
      descMeta.setAttribute('name', 'description');
      document.head.appendChild(descMeta);
    }
    descMeta.setAttribute('content', description);
  }

  // 3. Canonical URL
  if (canonicalUrl) {
    let canonicalLink = document.querySelector("link[rel='canonical']");
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);
  }

  // 4. OpenGraph Tags
  const setMetaProperty = (property, content) => {
    if (!content) return;
    let el = document.querySelector(`meta[property='${property}']`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMetaProperty('og:title', ogTitle || title);
  setMetaProperty('og:description', ogDescription || description);
  setMetaProperty('og:url', canonicalUrl || window.location.href);
  setMetaProperty('og:type', ogType);
  if (ogImage) setMetaProperty('og:image', ogImage);

  if (ogType === 'product' && productPrice) {
    setMetaProperty('product:price:amount', String(productPrice));
    setMetaProperty('product:price:currency', 'INR');
    setMetaProperty('product:availability', 'in stock');
  }

  // 5. Twitter Card Tags
  const setMetaName = (name, content) => {
    if (!content) return;
    let el = document.querySelector(`meta[name='${name}']`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMetaName('twitter:card', twitterCard);
  setMetaName('twitter:title', ogTitle || title);
  setMetaName('twitter:description', ogDescription || description);
  if (ogImage) setMetaName('twitter:image', ogImage);

  // 6. JSON-LD Structured Data Schema
  let schemaScript = document.getElementById('valerie-dynamic-jsonld');
  if (jsonLd) {
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = 'valerie-dynamic-jsonld';
      schemaScript.type = 'application/ld+json';
      document.head.appendChild(schemaScript);
    }
    schemaScript.textContent = JSON.stringify(jsonLd);
  } else if (schemaScript) {
    schemaScript.remove();
  }
}

export function restorePageSeo() {
  if (typeof document === 'undefined') return;

  if (originalHeadState) {
    document.title = originalHeadState.title;
    const descMeta = document.querySelector("meta[name='description']");
    if (descMeta) {
      descMeta.setAttribute('content', originalHeadState.description);
    }
    const canonicalLink = document.querySelector("link[rel='canonical']");
    if (canonicalLink) {
      if (originalHeadState.canonical) {
        canonicalLink.setAttribute('href', originalHeadState.canonical);
      } else {
        canonicalLink.remove();
      }
    }
    const ogTitle = document.querySelector("meta[property='og:title']");
    if (ogTitle) ogTitle.setAttribute('content', originalHeadState.ogTitle || originalHeadState.title);
    const ogDesc = document.querySelector("meta[property='og:description']");
    if (ogDesc) ogDesc.setAttribute('content', originalHeadState.ogDesc || originalHeadState.description);
    const ogUrl = document.querySelector("meta[property='og:url']");
    if (ogUrl) ogUrl.setAttribute('content', originalHeadState.ogUrl || 'https://valeriejewels.in/');
    const ogImg = document.querySelector("meta[property='og:image']");
    if (ogImg) ogImg.setAttribute('content', originalHeadState.ogImage || 'https://valeriejewels.in/v-logo.png');
    const ogType = document.querySelector("meta[property='og:type']");
    if (ogType) ogType.setAttribute('content', originalHeadState.ogType || 'website');

    // Remove product specific meta properties if any
    document.querySelectorAll("meta[property^='product:']").forEach((el) => el.remove());
  }

  // Remove dynamic JSON-LD
  const schemaScript = document.getElementById('valerie-dynamic-jsonld');
  if (schemaScript) {
    schemaScript.remove();
  }
}

export function toAbsoluteUrl(url) {
  if (!url) return 'https://valeriejewels.in/v-logo.png';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const clean = url.startsWith('/') ? url : `/${url}`;
  return `https://valeriejewels.in${clean}`;
}

export function cleanDescriptionText(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/[#*`_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const COMMON_RETURN_POLICY = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'IN',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 7,
  returnMethod: 'https://schema.org/ReturnByMail',
  returnFees: 'https://schema.org/FreeReturn',
};

const COMMON_SHIPPING_DETAILS = {
  '@type': 'OfferShippingDetails',
  shippingRate: {
    '@type': 'MonetaryAmount',
    value: '0',
    currency: 'INR',
  },
  shippingDestination: {
    '@type': 'DefinedRegion',
    addressCountry: 'IN',
  },
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    handlingTime: {
      '@type': 'QuantitativeValue',
      minValue: 0,
      maxValue: 1,
      unitCode: 'DAY',
    },
    transitTime: {
      '@type': 'QuantitativeValue',
      minValue: 3,
      maxValue: 7,
      unitCode: 'DAY',
    },
  },
};

/**
 * Universal SEO & Structured Data for Any Product (PDP)
 * Injects Google Search rich-snippet compliant Schema.org Product, BreadcrumbList,
 * Offers with priceValidUntil, shippingDetails, returnPolicy, and OpenGraph/Twitter tags.
 */
export function setProductSeo(product, selectedVariant = null) {
  if (!product || !product.name) return;

  const isMystery = Boolean(
    product.slug === 'mystery-jewellery-jar' ||
    product.slug === 'mystery-jar' ||
    product.category_slug === 'mystery-jar' ||
    (product.name || '').toLowerCase().includes('mystery')
  );

  if (isMystery) {
    setMysteryJewelleryJarSeo(product);
    return;
  }

  const rawSlug = product.slug || '';
  const cleanSlug = rawSlug.replace(/^\/+/, '');
  const canonicalUrl = `https://valeriejewels.in/${cleanSlug}`;

  const rawImg =
    product.primary_image ||
    product.images?.[0]?.image_url ||
    product.images?.[0]?.url ||
    (typeof product.images?.[0] === 'string' ? product.images[0] : null) ||
    'https://valeriejewels.in/hero-jewelry-model.jpg';

  const primaryImg = toAbsoluteUrl(rawImg);

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
      .map((img) => toAbsoluteUrl(img?.image_url || img?.url || (typeof img === 'string' ? img : '')))
      .filter((url) => url && !url.endsWith('.mp4') && !url.endsWith('.webm'))
    : [primaryImg];

  if (!images.includes(primaryImg)) {
    images.unshift(primaryImg);
  }

  const currentPrice = selectedVariant?.price
    ? Math.round(Number(selectedVariant.price))
    : Math.round(Number(product.price || 999));

  let cleanDesc = cleanDescriptionText(product.short_description || product.description || '');
  if (!cleanDesc || cleanDesc.length < 30) {
    cleanDesc = `Buy ${product.name} online at Valerie Jewels. Handcrafted Indian everyday luxury jewelry, anti-tarnish finish, 5-7 days express delivery across India. Free shipping & COD available.`;
  }

  const metaDescription = cleanDesc.length > 155 ? `${cleanDesc.slice(0, 152)}...` : cleanDesc;
  const pageTitle = `${product.name} | Buy Online | Valerie Jewels`;

  const buildOffer = (v = null) => {
    const offerPrice = v?.price ? Math.round(Number(v.price)) : currentPrice;
    const offerName = v ? `${product.name} - ${v.title || v.option1_value || 'Standard'}` : product.name;
    const offerSku = v?.sku || product.sku || `VJ-${cleanSlug || product.id}`;

    return {
      '@type': 'Offer',
      name: offerName,
      sku: offerSku,
      price: String(offerPrice),
      priceCurrency: 'INR',
      priceValidUntil: '2027-12-31',
      availability: product.is_active === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      url: canonicalUrl,
      seller: {
        '@type': 'Organization',
        name: 'Valerie Jewels',
        url: 'https://valeriejewels.in/',
        sameAs: [OFFICIAL_INSTAGRAM_URL, OFFICIAL_AMAZON_STORE_URL],
      },
      hasMerchantReturnPolicy: COMMON_RETURN_POLICY,
      shippingDetails: COMMON_SHIPPING_DETAILS,
    };
  };

  const offers = Array.isArray(product.variants) && product.variants.length > 0
    ? product.variants.map((v) => buildOffer(v))
    : [buildOffer(null)];

  const catName = product.category_name || (cleanSlug.includes('jhumka') ? 'Jhumka Boxes' : 'Jewelry');
  const catSlug = product.category_slug || (cleanSlug.includes('jhumka') ? 'jhumka-boxes' : 'all');
  const catUrl = catSlug === 'jhumka-boxes' ? 'https://valeriejewels.in/jhumka-boxes' : 'https://valeriejewels.in/';

  const ratingValue = String(product.rating_avg || '4.9');
  const reviewCount = String(product.review_count || '48');

  // Rich FAQ accordion Schema for Jhumka Boxes to secure Google Search SERP sitelinks
  const isJhumka = cleanSlug.includes('jhumka') || (product.name || '').toLowerCase().includes('jhumka');
  const faqSchema = isJhumka ? {
    '@type': 'FAQPage',
    '@id': `${canonicalUrl}#faq`,
    mainEntity: [
      {
        '@type': 'Question',
        name: `How many pairs of earrings are included in ${product.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `This signature box includes curated pairs of handcrafted ethnic earrings designed for weddings, festive celebrations, and lightweight everyday styling.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Are Valerie pieces anti-tarnish and comfortable for all-day wear?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! All Valerie Jewels pieces are crafted with hypoallergenic materials and anti-tarnish finish, engineered to be lightweight without pulling on earlobes.',
        },
      },
      {
        '@type': 'Question',
        name: 'What are the delivery and payment options?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Valerie Jewels offers free express delivery across India in 5–7 business days, with cash on delivery (COD) and secure prepaid checkout available.',
        },
      },
    ],
  } : null;

  const graphItems = [
    {
      '@type': 'Product',
      '@id': `${canonicalUrl}#product`,
      name: product.name,
      url: canonicalUrl,
      description: cleanDesc,
      image: images,
      sku: product.sku || `VJ-${cleanSlug || product.id}`,
      mpn: product.sku || `VJ-${cleanSlug || product.id}`,
      brand: {
        '@type': 'Brand',
        name: 'VALERIÉ',
        url: 'https://valeriejewels.in/',
        sameAs: [OFFICIAL_INSTAGRAM_URL, OFFICIAL_AMAZON_STORE_URL],
      },
      category: `Jewelry > ${catName}`,
      material: product.material || 'Anti-Tarnish 316L Stainless Steel & Micro Gold Polish',
      offers: offers.length === 1 ? offers[0] : offers,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue,
        reviewCount,
        bestRating: '5',
        worstRating: '1',
      },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${canonicalUrl}#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://valeriejewels.in/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: catName,
          item: catUrl,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: product.name,
          item: canonicalUrl,
        },
      ],
    },
  ];

  if (faqSchema) {
    graphItems.push(faqSchema);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': graphItems,
  };

  setPageSeo({
    title: pageTitle,
    description: metaDescription,
    canonicalUrl,
    ogType: 'product',
    ogTitle: `${product.name} | Valerie Jewels`,
    ogDescription: metaDescription,
    ogImage: primaryImg,
    productPrice: currentPrice,
    twitterCard: 'summary_large_image',
    jsonLd,
  });
}

/**
 * Category-level SEO presets (e.g. /jhumka-boxes)
 */
export function setCategorySeo(categorySlug) {
  if (categorySlug === 'jhumka-boxes' || categorySlug === 'jhumkha-box') {
    const title = 'Signature Jhumka Boxes | Festive Ethnic Earring Sets | Valerie Jewels';
    const description = 'Shop viral handcrafted Indian ethnic Jhumka boxes at Valerie Jewels. 5-pair and 6-pair artisanal festive editions, lightweight everyday designs, Kundan, Chandbali & pastel collections.';
    const canonicalUrl = 'https://valeriejewels.in/jhumka-boxes';
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          '@id': `${canonicalUrl}#collection`,
          name: 'Signature Festive Jhumka Boxes',
          url: canonicalUrl,
          description,
          breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://valeriejewels.in/' },
              { '@type': 'ListItem', position: 2, name: 'Jhumka Boxes', item: canonicalUrl },
            ],
          },
        },
      ],
    };
    setPageSeo({
      title,
      description,
      canonicalUrl,
      ogTitle: title,
      ogDescription: description,
      ogImage: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1200&h=1600&q=85',
      jsonLd,
    });
  }
}

/**
 * High-ranking SEO Preset for Mystery Jewellery Jar
 */
export function setMysteryJewelleryJarSeo(product = null) {
  const primaryImg =
    product?.primary_image ||
    product?.images?.[0]?.image_url ||
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80';

  const title = 'Mystery Jewellery Jar | Surprise Handcrafted Fine Jewelry | Valerie Jewels';
  const description =
    "Unbox the unexpected with Valerie's Mystery Jewellery Jar. Handcrafted anti-tarnish fine jewelry, surprise earrings, rings, charms, bracelets & necklaces with guaranteed 2× retail value packed in a signature glass keepsake jar.";
  const canonicalUrl = 'https://valeriejewels.in/mystery-jewellery-jar';

  const offers = (product?.variants && product.variants.length > 0)
    ? product.variants.map((v) => ({
      '@type': 'Offer',
      name: v.title || v.option1_value || 'Mystery Jar Edition',
      price: String(Math.round(Number(v.price || 499))),
      priceCurrency: 'INR',
      priceValidUntil: '2027-12-31',
      availability: 'https://schema.org/InStock',
      url: canonicalUrl,
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'Valerie Jewels',
        url: 'https://valeriejewels.in/',
        sameAs: [OFFICIAL_INSTAGRAM_URL, OFFICIAL_AMAZON_STORE_URL],
      },
      hasMerchantReturnPolicy: COMMON_RETURN_POLICY,
      shippingDetails: COMMON_SHIPPING_DETAILS,
    }))
    : [
      {
        '@type': 'Offer',
        name: 'Mini Mystery Jar (5/6 Surprise Pieces)',
        price: '999',
        priceCurrency: 'INR',
        priceValidUntil: '2027-12-31',
        availability: 'https://schema.org/InStock',
        url: canonicalUrl,
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: 'Valerie Jewels', url: 'https://valeriejewels.in/', sameAs: [OFFICIAL_INSTAGRAM_URL, OFFICIAL_AMAZON_STORE_URL] },
        hasMerchantReturnPolicy: COMMON_RETURN_POLICY,
        shippingDetails: COMMON_SHIPPING_DETAILS,
      },
      {
        '@type': 'Offer',
        name: 'Classic Mystery Jar (10/12 Surprise Pieces)',
        price: '1999',
        priceCurrency: 'INR',
        priceValidUntil: '2027-12-31',
        availability: 'https://schema.org/InStock',
        url: canonicalUrl,
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: 'Valerie Jewels', url: 'https://valeriejewels.in/', sameAs: [OFFICIAL_INSTAGRAM_URL, OFFICIAL_AMAZON_STORE_URL] },
        hasMerchantReturnPolicy: COMMON_RETURN_POLICY,
        shippingDetails: COMMON_SHIPPING_DETAILS,
      },
      {
        '@type': 'Offer',
        name: 'Custom Mystery Jar (20/24 Surprise Pieces)',
        price: '4999',
        priceCurrency: 'INR',
        priceValidUntil: '2027-12-31',
        availability: 'https://schema.org/InStock',
        url: canonicalUrl,
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: 'Valerie Jewels', url: 'https://valeriejewels.in/', sameAs: [OFFICIAL_INSTAGRAM_URL, OFFICIAL_AMAZON_STORE_URL] },
        hasMerchantReturnPolicy: COMMON_RETURN_POLICY,
        shippingDetails: COMMON_SHIPPING_DETAILS,
      },
    ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${canonicalUrl}#product`,
        name: 'Valerie Signature Mystery Jewellery Jar',
        url: canonicalUrl,
        description,
        image: [primaryImg],
        sku: product?.sku || 'VJ-MJAR-01',
        brand: {
          '@type': 'Brand',
          name: 'VALERIÉ',
          url: 'https://valeriejewels.in/',
          sameAs: [
            OFFICIAL_INSTAGRAM_URL,
            OFFICIAL_AMAZON_STORE_URL
          ],
        },
        category: 'Jewelry > Mystery Jars & Gift Sets',
        material: 'Stainless Steel, 18K Gold Plated, Crystal Beads',
        offers,
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: String(product?.rating_avg || '4.9'),
          reviewCount: String(product?.review_count || '86'),
          bestRating: '5',
          worstRating: '1',
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://valeriejewels.in/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Mystery Jewellery Jar',
            item: canonicalUrl,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is inside the Mystery Jewellery Jar?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Every Valerie Mystery Jewellery Jar is handpicked with a delightful selection of anti-tarnish rings, earrings, charms, bracelets, and necklaces in gold tones and colorful crystal beads.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is the guaranteed value of the Mystery Jewellery Jar?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'We guarantee the retail value of the jewelry pieces inside is at least 2× what you pay.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is the jewelry inside the Mystery Jar anti-tarnish and waterproof?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, Valerie pieces are crafted with anti-tarnish stainless steel and premium materials designed for daily wear without rusting or fading.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I choose my jar size or edition?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, you can choose between Mini (5/6 pieces), Classic (10/12 pieces), or Custom (20/24 pieces) editions.',
            },
          },
        ],
      },
    ],
  };

  setPageSeo({
    title,
    description,
    canonicalUrl,
    ogType: 'product',
    ogTitle: 'Mystery Jewellery Jar - Curated Surprise Fine Jewelry | Valerie Jewels',
    ogDescription: description,
    ogImage: primaryImg,
    productPrice: 999,
    twitterCard: 'summary_large_image',
    jsonLd,
  });
}

/**
 * Returns complete Organization & JewelryStore Schema.org graph
 * Explicitly associates the official Instagram link and Amazon store with Valerie Jewels
 * for Google Knowledge Graph, Search snippets, and Google AI Overviews.
 */
export function getBrandOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['JewelryStore', 'OnlineStore', 'Organization'],
        '@id': 'https://valeriejewels.in/#organization',
        name: 'Valerie Jewels',
        alternateName: ['VALERIÉ', 'Valerie Jewels India', 'Valerie Signature', 'Valerie'],
        url: 'https://valeriejewels.in/',
        logo: 'https://valeriejewels.in/v-logo.png',
        image: 'https://valeriejewels.in/v-logo.png',
        description: 'Valerie Jewels (VALERIÉ) is an Indian everyday luxury jewelry brand offering signature festive jhumka boxes, surprise mystery jewellery jars, and curated everyday jewellery. Follow @valeriejewels.in on Instagram for daily styling inspiration, try-on reels, unboxings, and new releases.',
        email: 'orders@valeriejewels.in',
        telephone: '+919023422392',
        priceRange: '₹499 - ₹2999',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Patel Chowk',
          addressLocality: 'Rajkot',
          addressRegion: 'Gujarat',
          postalCode: '360001',
          addressCountry: 'IN'
        },
        sameAs: [
          OFFICIAL_INSTAGRAM_URL,
          OFFICIAL_AMAZON_STORE_URL
        ]
      },
      {
        '@type': 'WebSite',
        '@id': 'https://valeriejewels.in/#website',
        url: 'https://valeriejewels.in/',
        name: 'Valerie Jewels',
        publisher: {
          '@id': 'https://valeriejewels.in/#organization'
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://valeriejewels.in/?search={search_term_string}',
          'query-input': 'required name=search_term_string'
        }
      }
    ]
  };
}

/**
 * Injects or updates brand-level Organization Schema.org in document head
 */
export function initBrandSchema() {
  if (typeof document === 'undefined') return;
  let el = document.getElementById('valerie-brand-jsonld');
  if (!el) {
    el = document.createElement('script');
    el.id = 'valerie-brand-jsonld';
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(getBrandOrganizationSchema());
}
