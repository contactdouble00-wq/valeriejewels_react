import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ShoppingBag,
  ExternalLink,
  Flame,
  Heart,
  Eye,
  Check
} from 'lucide-react';
import InstagramIcon from './InstagramIcon';
import { useCart } from '../context/CartContext';
import { useSiteContent } from '../context/SiteContentContext';

const DEFAULT_REELS = [
  {
    id: 'reel-1',
    title: 'Unboxing the Valerie Signature Mystery Jewellery Jar',
    caption: 'Every jar contains surprise rings, earrings, charms & necklaces guaranteed 2x what you pay! ✨ Packed in our keepsake glass jar.',
    videoUrl: '/api/uploads/sample_jewelry_reel_1.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
    productSlug: 'mystery-jewellery-jar',
    productName: 'Valerie Signature Mystery Jewellery Jar',
    productPrice: 999,
    productMrp: 1999,
    tag: '🔥 Viral Bestseller',
  },
  {
    id: 'reel-2',
    title: '16 Pairs Traditional Oxidized Silver Jhumka Box Try-On',
    caption: '16 pairs of handcrafted ethnic dangle jhumkas with zero earache design. Handcrafted for festive luxury. 🌸',
    videoUrl: '/api/uploads/sample_jewelry_reel_2.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80',
    productSlug: 'jhumka-boxes',
    productName: '16 Pairs Oxidized Silver Earrings Box Set',
    productPrice: 999,
    productMrp: 1999,
    tag: '✨ 16 Pairs Inside',
  },
];

export default function ReelsShortsPage({ onReturnToStore, onOpenPdp }) {
  const { addToCart } = useCart();
  const { content } = useSiteContent();
  const [playingReelId, setPlayingReelId] = useState('reel-1');
  const [isMuted, setIsMuted] = useState(true);

  const instagramUrl = content?.customerSupport?.instagramUrl || 'https://www.instagram.com/valeriejewels.in/';
  const instagramHandle = content?.customerSupport?.instagramHandle || '@valeriejewels.in';

  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Shorts & Reels | Video Try-Ons & Unboxings | Valerie Jewels';

    let metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc ? metaDesc.getAttribute('content') : '';
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Watch real customer unboxings, viral styling shorts, and try-on reels for Valerie Jewels handcrafted jhumka boxes and mystery jewellery jars.'
      );
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc) metaDesc.setAttribute('content', prevDesc);
    };
  }, []);

  const handleGoHome = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (onReturnToStore) {
      onReturnToStore();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFBFE] text-brand-tertiary antialiased flex flex-col">
      {/* 1. Global Announcement */}
      <div className="bg-gradient-to-r from-[#26153D] via-[#372248] to-[#26153D] text-white text-[11px] py-2 px-4 text-center font-medium tracking-wider flex items-center justify-center space-x-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        <span>
          WATCH VIRAL REELS • FOLLOW{' '}
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-300 font-bold underline underline-offset-2"
          >
            {instagramHandle}
          </a>{' '}
          ON INSTAGRAM FOR DAILY STYLING DROPS
        </span>
      </div>

      {/* 2. Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-brand-border px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <button
          onClick={handleGoHome}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-brand-tertiary hover:text-brand-primary hover:bg-brand-surface transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2]" />
          <span>Return to Boutique</span>
        </button>

        <a href="/" onClick={handleGoHome} className="flex items-center">
          <img src="/valerie.png" alt="VALERIÉ" className="h-6 sm:h-7 w-auto object-contain" />
        </a>

        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-purple-50 text-brand-primary border border-purple-200 text-xs font-bold hover:bg-purple-100 transition-colors shadow-2xs"
        >
          <InstagramIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Follow on Instagram</span>
          <span className="sm:hidden">Instagram</span>
        </a>
      </header>

      {/* 3. Hero Introduction */}
      <div className="bg-gradient-to-b from-white via-purple-50/25 to-[#FCFBFE] border-b border-brand-border/60 py-10 sm:py-12 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-primary-light text-brand-primary text-xs font-bold font-caps tracking-wider uppercase">
            <Flame className="w-3.5 h-3.5 text-brand-gold fill-current" />
            <span>Valerie Video Atelier • Shorts & Reels</span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl md:text-5xl font-bold text-brand-tertiary tracking-tight">
            Real Customer Try-Ons & Unboxings
          </h1>
          <p className="text-xs sm:text-sm text-brand-muted max-w-xl mx-auto font-light leading-relaxed">
            See our pieces in motion. Watch authentic unboxings, ear try-on videos, and styling inspiration
            for our signature keepsake boxes and viral mystery jars.
          </p>
        </div>
      </div>

      {/* 4. Reels Grid Showcase */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {DEFAULT_REELS.map((reel) => {
            const isSelected = playingReelId === reel.id;

            return (
              <div
                key={reel.id}
                className="bg-white rounded-3xl overflow-hidden border border-brand-border shadow-md flex flex-col justify-between hover:shadow-luxury transition-all"
              >
                {/* 9:16 Mobile-Optimized Video Container */}
                <div className="relative aspect-[9/14] sm:aspect-[9/13] bg-[#181424] overflow-hidden group">
                  <video
                    src={reel.videoUrl}
                    poster={reel.posterUrl}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    className="w-full h-full object-cover"
                  />

                  {/* Top Overlay Badge */}
                  <div className="absolute top-3 left-3 z-10 flex items-center space-x-2">
                    <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10.5px] font-bold">
                      {reel.tag}
                    </span>
                  </div>

                  {/* Sound Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors cursor-pointer"
                    title={isMuted ? 'Unmute video' : 'Mute video'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  {/* Bottom Gradient Overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

                  {/* On-Video Caption */}
                  <div className="absolute bottom-3 inset-x-3 text-white space-y-1 z-10">
                    <h3 className="font-serif font-bold text-sm leading-snug drop-shadow-sm">
                      {reel.title}
                    </h3>
                    <p className="text-[11px] text-white/80 line-clamp-2 font-light">
                      {reel.caption}
                    </p>
                  </div>
                </div>

                {/* Attached Product Action Card */}
                <div className="p-4 sm:p-5 bg-[#FAF8FC] border-t border-brand-border flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-brand-tertiary truncate">
                      {reel.productName}
                    </h4>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-sm font-bold text-brand-primary font-mono">
                        ₹{reel.productPrice}
                      </span>
                      {reel.productMrp > reel.productPrice && (
                        <span className="text-xs text-brand-muted line-through">
                          ₹{reel.productMrp}
                        </span>
                      )}
                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700">
                        Save 50%
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenPdp) {
                        onOpenPdp(reel.productSlug);
                      } else {
                        window.location.href = `/${reel.productSlug}`;
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover active:scale-95 text-white text-xs font-caps tracking-wider uppercase font-bold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>View Piece</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Instagram CTA Card */}
        <div className="bg-gradient-to-br from-purple-50 via-white to-pink-50/40 rounded-3xl p-6 sm:p-8 border border-purple-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-1.5 max-w-lg">
            <div className="flex items-center justify-center sm:justify-start space-x-2 text-xs font-bold text-[#bc1888]">
              <InstagramIcon className="w-4 h-4" />
              <span>Verified Atelier Instagram</span>
            </div>
            <h3 className="font-editorial text-xl sm:text-2xl font-bold text-brand-tertiary">
              More Try-On Reels on Instagram
            </h3>
            <p className="text-xs text-brand-muted font-light leading-relaxed">
              We post new try-ons, unboxings, jewelry care guides, and customer testimonials daily on <strong>{instagramHandle}</strong>.
            </p>
          </div>

          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-700 via-pink-600 to-amber-500 hover:opacity-95 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
          >
            <InstagramIcon className="w-4 h-4" />
            <span>Watch on Instagram</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </main>

      {/* 5. Minimal Footer */}
      <footer className="bg-white border-t border-brand-border py-6 px-4 text-center text-xs text-brand-muted font-light">
        <p>© {new Date().getFullYear()} Valerie Jewels (VALERIÉ). Handcrafted with elegance.</p>
      </footer>
    </div>
  );
}
