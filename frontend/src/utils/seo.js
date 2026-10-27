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
  twitterCard = 'summary_large_image',
  jsonLd = null,
}) {
  if (typeof document === 'undefined') return;

  // Save initial state once to restore later
  if (!originalHeadState) {
    const canonicalEl = document.querySelector("link[rel='canonical']");
    const descEl = document.querySelector("meta[name='description']");
    originalHeadState = {
      title: document.title,
      description: descEl ? descEl.getAttribute('content') : '',
      canonical: canonicalEl ? canonicalEl.getAttribute('href') : '',
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
  }

  // Remove dynamic JSON-LD
  const schemaScript = document.getElementById('valerie-dynamic-jsonld');
  if (schemaScript) {
    schemaScript.remove();
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
      }))
    : [
        {
          '@type': 'Offer',
          name: 'Mini Mystery Jar (5/6 Surprise Pieces)',
          price: '499',
          priceCurrency: 'INR',
          priceValidUntil: '2027-12-31',
          availability: 'https://schema.org/InStock',
          url: canonicalUrl,
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@type': 'Organization', name: 'Valerie Jewels', url: 'https://valeriejewels.in/', sameAs: [OFFICIAL_INSTAGRAM_URL, OFFICIAL_AMAZON_STORE_URL] },
        },
        {
          '@type': 'Offer',
          name: 'Classic Mystery Jar (10/12 Surprise Pieces)',
          price: '999',
          priceCurrency: 'INR',
          priceValidUntil: '2027-12-31',
          availability: 'https://schema.org/InStock',
          url: canonicalUrl,
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@type': 'Organization', name: 'Valerie Jewels', url: 'https://valeriejewels.in/', sameAs: [OFFICIAL_INSTAGRAM_URL, OFFICIAL_AMAZON_STORE_URL] },
        },
        {
          '@type': 'Offer',
          name: 'Custom Mystery Jar (20/24 Surprise Pieces)',
          price: '1999',
          priceCurrency: 'INR',
          priceValidUntil: '2027-12-31',
          availability: 'https://schema.org/InStock',
          url: canonicalUrl,
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@type': 'Organization', name: 'Valerie Jewels', url: 'https://valeriejewels.in/', sameAs: [OFFICIAL_INSTAGRAM_URL, OFFICIAL_AMAZON_STORE_URL] },
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
          name: 'Valerie Jewels',
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
        description: 'Valerie Jewels (VALERIÉ) is an Indian everyday luxury jewelry brand crafting anti-tarnish, waterproof 18K gold-plated stainless steel jewellery, signature festive jhumka boxes, and mystery jewellery jars. Follow @valeriejewels.in on Instagram for daily styling inspiration, try-on reels, unboxings, and new releases.',
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
