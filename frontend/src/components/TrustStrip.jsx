import React from 'react';
import { ShieldCheck, Droplet, Sparkles, Truck, RotateCcw, Award } from 'lucide-react';

export default function TrustStrip() {
  const pillars = [
    {
      icon: ShieldCheck,
      title: '100% Anti-Tarnish',
      desc: 'High-grade 18K PVD coating guaranteed not to fade or tarnish.',
    },
    {
      icon: Droplet,
      title: 'Water & Sweat Proof',
      desc: 'Wear comfortably in the shower, gym, or pool with zero worry.',
    },
    {
      icon: Sparkles,
      title: 'Hypoallergenic Skin-Safe',
      desc: 'Zero nickel, zero lead. Designed for the most sensitive skin.',
    },
    {
      icon: Truck,
      title: 'Shiprocket Express',
      desc: 'Dispatched via premium couriers across 29,000+ Indian pincodes.',
    },
  ];

  return (
    <section className="bg-white rounded-2xl p-5 sm:p-8 border border-brand-border shadow-sm">
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {pillars.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex items-start space-x-3.5">
              <div className="p-2.5 rounded-xl bg-brand-primary-light text-brand-primary flex-shrink-0">
                <Icon className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-caps uppercase tracking-wider font-bold text-brand-tertiary">
                  {item.title}
                </h4>
                <p className="text-xs text-brand-muted font-light leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
