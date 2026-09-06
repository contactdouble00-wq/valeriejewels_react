import React from 'react';
import { Tag, Sparkles, ShoppingBag, ArrowRight } from 'lucide-react';
import { useSiteContent } from '../context/SiteContentContext';

export default function BundleSection({ bundles = [], onSelectBundle }) {
  const { content } = useSiteContent();
  const cHead = content?.combosHeader || {};

  if (!bundles || bundles.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-caps uppercase tracking-[0.2em] text-brand-primary font-bold">
            {cHead.eyebrow || 'Curated Pairings'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-editorial font-bold text-brand-tertiary mt-1">
            {cHead.title || 'Jewelry Combo Sets & Duos'}
          </h2>
          <p className="text-sm text-brand-muted mt-1 font-light">
            {cHead.subtitle || 'Expertly styled layered pairings with bundle-exclusive discounts up to 45%.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {bundles.map((bundle) => (
          <div
            key={bundle.id}
            className="luxury-card rounded-2xl p-6 bg-gradient-to-br from-white via-[#FCFBFE] to-[#F8F4FD] border border-brand-border flex flex-col justify-between"
          >
            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between pb-4 border-b border-brand-border">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-caps uppercase tracking-wider font-bold bg-brand-primary text-white shadow-sm">
                  <Sparkles className="w-3 h-3 text-brand-gold" />
                  <span>{bundle.badge_text || 'Curated Bundle'}</span>
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Save ₹{Math.round(bundle.savings_amount || 0)} ({bundle.discount_percentage}% OFF)
                </span>
              </div>

              {/* Title & Description */}
              <div className="mt-4 space-y-2">
                <h3 className="font-editorial text-xl font-bold text-brand-tertiary">
                  {bundle.title}
                </h3>
                <p className="text-xs sm:text-sm text-brand-muted font-light leading-relaxed">
                  {bundle.description}
                </p>
              </div>

              {/* Included Items Stage */}
              {bundle.items && bundle.items.length > 0 && (
                <div className="mt-6 p-4 rounded-xl bg-white border border-brand-border space-y-3">
                  <span className="text-[10px] font-caps uppercase tracking-wider text-brand-tertiary font-bold block">
                    What's in this set:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {bundle.items.map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-3">
                        <img
                          src={item.primary_image || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=400&q=80'}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover border border-brand-border flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-brand-tertiary truncate">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-brand-muted line-through">
                            ₹{Math.round(item.mrp || item.price)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Price & Add Action */}
            <div className="mt-6 pt-4 border-t border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-baseline space-x-3">
                <span className="text-2xl font-bold text-brand-tertiary">
                  ₹{Math.round(bundle.bundle_price).toLocaleString('en-IN')}
                </span>
                <span className="text-sm text-brand-muted line-through font-light">
                  ₹{Math.round(bundle.compare_price).toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-semibold text-emerald-600">
                  Free Express Delivery
                </span>
              </div>

              <button
                onClick={() => onSelectBundle && onSelectBundle(bundle)}
                className="py-2.5 px-6 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold shadow-md hover:shadow-luxury-hover transition-all flex items-center justify-center space-x-2"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add Set to Bag</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
