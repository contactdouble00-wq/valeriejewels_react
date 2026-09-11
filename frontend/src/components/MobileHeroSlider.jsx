import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

export const DEFAULT_MOBILE_SLIDES = [
  {
    id: 'slide-1',
    imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=85',
    title: 'The Everyday Diamond Edit',
    subtitle: 'Under ₹999 Luxury Collection',
    buttonText: 'SHOP NOW',
    linkUrl: '#catalog',
    isActive: true,
  },
  {
    id: 'slide-2',
    imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=85',
    title: 'The 4 Signature Jhumka Boxes',
    subtitle: 'Viral 5 to 6 Pair Festive Keepsakes',
    buttonText: 'EXPLORE BOXES',
    linkUrl: '#jhumka-boxes',
    isActive: true,
  },
  {
    id: 'slide-3',
    imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=85',
    title: '18K Anti-Tarnish Everyday Edit',
    subtitle: 'Waterproof & Shower-Safe PVD Gold',
    buttonText: 'SHOP COLLECTION',
    linkUrl: '#catalog',
    isActive: true,
  },
  {
    id: 'slide-4',
    imageUrl: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=900&q=85',
    title: 'Statement Pairings & Duos',
    subtitle: 'Layered Elegance with Free Express Delivery',
    buttonText: 'VIEW PIECES',
    linkUrl: '#jhumka-boxes',
    isActive: true,
  },
];

export default function MobileHeroSlider({
  slides = DEFAULT_MOBILE_SLIDES,
  autoPlay = true,
  interval = 4500,
  onSelectCategory,
}) {
  const activeSlides = (slides && slides.length > 0 ? slides : DEFAULT_MOBILE_SLIDES).filter(
    (s) => s.isActive !== false
  );

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isSwiping = useRef(false);

  // Safety check if currentSlide exceeds bounds
  const totalSlides = activeSlides.length;
  const safeIndex = totalSlides > 0 ? Math.min(currentSlide, totalSlides - 1) : 0;

  const nextSlide = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Auto-play timer
  useEffect(() => {
    if (!autoPlay || isPaused || totalSlides <= 1) return;
    const timer = setInterval(() => {
      nextSlide();
    }, Math.max(interval || 4500, 2500));

    return () => clearInterval(timer);
  }, [autoPlay, isPaused, interval, nextSlide, totalSlides]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
    isSwiping.current = true;
    setIsPaused(true);
  };

  const handleTouchMove = (e) => {
    if (!isSwiping.current) return;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isSwiping.current) return;
    isSwiping.current = false;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 45) {
      nextSlide();
    } else if (distance < -45) {
      prevSlide();
    }
    // Resume auto-play after interaction
    setTimeout(() => setIsPaused(false), 2000);
  };

  const handleSlideClick = (slide) => {
    if (!slide || !slide.linkUrl) return;
    const link = slide.linkUrl;
    if (link === '#jhumka-boxes') {
      onSelectCategory?.('jhumka-boxes');
      const el = document.getElementById('jhumka-boxes');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (link === '#catalog') {
      onSelectCategory?.('all');
      const el = document.getElementById('catalog');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (link.startsWith('#')) {
      const el = document.querySelector(link);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = link;
    }
  };

  if (totalSlides === 0) return null;

  return (
    <div className="w-full select-none">
      {/* Poster Stage Container (Tanishq Style - Exact 1:1 Aspect Ratio) */}
      <div
        className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#FAF7FC] border border-brand-border shadow-xs group"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Slides Track */}
        <div
          className="flex w-full h-full transition-transform duration-500 ease-out will-change-transform"
          style={{ transform: `translateX(-${safeIndex * 100}%)` }}
        >
          {activeSlides.map((slide, idx) => (
            <div
              key={slide.id || idx}
              onClick={() => handleSlideClick(slide)}
              className="relative w-full h-full shrink-0 cursor-pointer overflow-hidden flex items-end"
            >
              {/* Poster Image */}
              <img
                src={slide.imageUrl}
                alt={slide.title || 'Valerie Jewels Exclusive Collection'}
                className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />

              {/* Subtle Gradient Shade for Contrast if Text or Button is present */}
              {(slide.title || slide.buttonText) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
              )}

              {/* Poster Overlay Information & Action Button (Tanishq Style) */}
              <div className="relative z-10 w-full p-4 sm:p-6 flex items-end justify-between gap-3">
                {(slide.title || slide.subtitle) && (
                  <div className="text-white space-y-1 drop-shadow-md max-w-[70%]">
                    {slide.subtitle && (
                      <p className="text-[10px] font-caps uppercase tracking-widest text-white/90 font-semibold">
                        {slide.subtitle}
                      </p>
                    )}
                    {slide.title && (
                      <h3 className="text-lg sm:text-2xl font-editorial font-bold leading-tight text-white">
                        {slide.title}
                      </h3>
                    )}
                  </div>
                )}

                {/* Tanishq Reference Style Clean Action Button */}
                {slide.buttonText && (
                  <div className="shrink-0 ml-auto">
                    <span className="inline-flex items-center space-x-1.5 px-4 py-2 rounded bg-white hover:bg-gray-50 text-brand-tertiary text-[10px] sm:text-xs font-caps tracking-widest uppercase font-bold shadow-lg transition-transform active:scale-95">
                      <span>{slide.buttonText}</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop / Hover Manual Nav Arrows */}
        {totalSlides > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-brand-tertiary shadow-md flex items-center justify-center opacity-0 group-hover:opacity-90 transition-opacity active:scale-95 z-20 cursor-pointer"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-brand-tertiary shadow-md flex items-center justify-center opacity-0 group-hover:opacity-90 transition-opacity active:scale-95 z-20 cursor-pointer"
              aria-label="Next slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Tanishq-Style Diamond Pagination Indicators (Exact Reference Match) */}
      {totalSlides > 1 && (
        <div className="flex items-center justify-center space-x-3 pt-3 pb-1">
          {activeSlides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              className="p-1 cursor-pointer focus:outline-none transition-transform active:scale-125"
              aria-label={`Jump to slide ${idx + 1}`}
            >
              <span
                className={`block transition-all duration-300 transform rotate-45 ${
                  safeIndex === idx
                    ? 'w-2.5 h-2.5 bg-[#8366B0] scale-110 shadow-sm'
                    : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
