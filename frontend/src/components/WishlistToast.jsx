import React from 'react';
import { Heart, X, ArrowRight } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';

export default function WishlistToast() {
  const { toast, dismissToast, openWishlist } = useWishlist();

  if (!toast.show) return null;

  const isAdd = toast.type === 'add';

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 animate-slide-up max-w-[90vw] sm:max-w-sm">
      <div className="bg-brand-tertiary text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isAdd ? 'bg-brand-primary text-white' : 'bg-white/10 text-white/70'
          }`}>
            <Heart className={`w-4 h-4 ${isAdd ? 'fill-white' : ''}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">
              {toast.message}
            </p>
            {isAdd && (
              <button
                onClick={() => {
                  dismissToast();
                  openWishlist();
                }}
                className="text-[11px] text-brand-primary-light hover:text-white font-semibold inline-flex items-center gap-1 mt-0.5"
              >
                <span>View Saved Pieces</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={dismissToast}
          className="p-1 text-white/50 hover:text-white transition-colors shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
