import React, { useState } from 'react';
import { Sparkles, Lock, ArrowRight, Shield, Clock, MessageCircle } from 'lucide-react';

export default function UnderDevelopmentGate({ onUnlock }) {
  const [showModal, setShowModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

  const handleUnlock = (e) => {
    if (e) e.preventDefault();
    const clean = passcode.trim().toLowerCase();
    if (clean === 'valerie2026' || clean === 'vj2026' || clean === 'admin' || clean === 'valerie') {
      try {
        localStorage.setItem('vj_preview_mode', 'true');
      } catch (err) {
        console.error(err);
      }
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2500);
    }
  };

  return (
    React.createElement('div', { className: 'min-h-screen bg-[#0B0910] text-[#EDE8F5] relative overflow-hidden flex flex-col justify-between font-sans selection:bg-[#8366B0]/30' },
      React.createElement('div', { className: 'absolute top-[-15%] left-1/2 -translate-x-1/2 w-[650px] h-[650px] bg-gradient-to-b from-[#8366B0]/18 via-[#C5A880]/10 to-transparent rounded-full blur-[120px] pointer-events-none' }),
      React.createElement('header', { className: 'relative z-10 w-full px-6 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-sm' },
        React.createElement('div', { className: 'flex items-center space-x-3' },
          React.createElement('img', { src: '/valerie.png', alt: 'Valerie Jewels', className: 'h-9 w-auto object-contain brightness-110 drop-shadow-[0_0_12px_rgba(197,168,128,0.2)]' }),
          React.createElement('span', { className: 'text-xs tracking-[0.25em] text-[#C5A880] uppercase font-semibold hidden sm:inline-block' }, 'Atelier Valerie')
        ),
        React.createElement('button', {
          onClick: () => setShowModal(true),
          className: 'text-xs tracking-wider uppercase px-3.5 py-1.5 rounded-full border border-white/10 hover:border-[#8366B0]/60 text-white/70 hover:text-white transition-all flex items-center space-x-1.5 bg-white/[0.02] hover:bg-[#8366B0]/10 cursor-pointer'
        },
          React.createElement(Lock, { className: 'w-3.5 h-3.5 text-[#C5A880]' }),
          React.createElement('span', null, 'Staff Access')
        )
      ),
      React.createElement('main', { className: 'relative z-10 max-w-2xl mx-auto px-6 py-12 flex flex-col items-center text-center my-auto' },
        React.createElement('div', { className: 'inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#8366B0]/15 border border-[#8366B0]/30 text-[#C5A880] text-xs font-medium tracking-widest uppercase mb-6 shadow-[0_0_20px_rgba(131,102,176,0.15)]' },
          React.createElement('span', { className: 'w-2 h-2 rounded-full bg-[#C5A880] animate-ping inline-block' }),
          React.createElement('span', null, 'Atelier Under Development')
        ),
        React.createElement('h1', { className: 'text-3xl sm:text-5xl font-serif tracking-tight text-white leading-tight sm:leading-snug mb-4' },
          'Crafting Something ',
          React.createElement('br', { className: 'hidden sm:inline' }),
          React.createElement('span', { className: 'bg-gradient-to-r from-[#EDE8F5] via-[#C5A880] to-[#8366B0] bg-clip-text text-transparent italic font-normal' }, 'Extraordinary')
        ),
        React.createElement('p', { className: 'text-sm sm:text-base text-white/60 max-w-lg leading-relaxed mb-8 font-light' },
          'Our digital atelier is currently undergoing final preparations. We are putting the finishing touches on our exclusive 18K Anti-Tarnish fine jewelry collections.'
        ),
        React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-10 text-left' },
          React.createElement('div', { className: 'p-4 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-md hover:border-[#8366B0]/30 transition-all' },
            React.createElement(Sparkles, { className: 'w-4 h-4 text-[#C5A880] mb-2' }),
            React.createElement('h4', { className: 'text-xs font-semibold text-white tracking-wide uppercase mb-1' }, '18K Gold PVD'),
            React.createElement('p', { className: 'text-[11px] text-white/50 leading-relaxed' }, 'Waterproof, sweatproof, hypoallergenic everyday luxury.')
          ),
          React.createElement('div', { className: 'p-4 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-md hover:border-[#8366B0]/30 transition-all' },
            React.createElement(Shield, { className: 'w-4 h-4 text-[#C5A880] mb-2' }),
            React.createElement('h4', { className: 'text-xs font-semibold text-white tracking-wide uppercase mb-1' }, 'Bespoke Craft'),
            React.createElement('p', { className: 'text-[11px] text-white/50 leading-relaxed' }, 'Multi-point quality inspected at our Rajkot atelier.')
          ),
          React.createElement('div', { className: 'p-4 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-md hover:border-[#8366B0]/30 transition-all' },
            React.createElement(Clock, { className: 'w-4 h-4 text-[#C5A880] mb-2' }),
            React.createElement('h4', { className: 'text-xs font-semibold text-white tracking-wide uppercase mb-1' }, 'Opening Soon'),
            React.createElement('p', { className: 'text-[11px] text-white/50 leading-relaxed' }, 'Full catalog, custom gifting & express insured delivery.')
          )
        ),
        React.createElement('a', {
          href: 'https://wa.me/919173468255?text=Hello%20Valerie%20Jewels,%20I%20would%20like%20to%20inquire%20about%20your%20jewelry%20collection.',
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'inline-flex items-center space-x-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-[#8366B0] to-[#6b5093] hover:from-[#9072bd] hover:to-[#785ba3] text-white text-xs font-medium tracking-widest uppercase shadow-[0_4px_25px_rgba(131,102,176,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]'
        },
          React.createElement(MessageCircle, { className: 'w-4 h-4' }),
          React.createElement('span', null, 'Private Inquiries via WhatsApp')
        )
      ),
      React.createElement('footer', { className: 'relative z-10 w-full px-6 py-6 text-center border-t border-white/5 text-[11px] text-white/40 tracking-wider' },
        React.createElement('p', null, '© 2026 Valerie Jewels Atelier Private Limited. All rights reserved.')
      ),
      showModal && React.createElement('div', { className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md' },
        React.createElement('div', { className: 'bg-[#13111C] border border-[#8366B0]/30 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_50px_rgba(131,102,176,0.2)] text-left relative' },
          React.createElement('div', { className: 'flex items-center justify-between mb-4' },
            React.createElement('div', { className: 'flex items-center space-x-2 text-[#C5A880]' },
              React.createElement(Lock, { className: 'w-4 h-4' }),
              React.createElement('span', { className: 'text-xs uppercase tracking-widest font-semibold' }, 'Atelier Preview Access')
            ),
            React.createElement('button', { onClick: () => setShowModal(false), className: 'text-white/40 hover:text-white text-xs uppercase' }, '✕')
          ),
          React.createElement('p', { className: 'text-xs text-white/60 mb-6' }, 'Enter your staff passcode or administrator PIN to bypass the development gate and view the live website.'),
          React.createElement('form', { onSubmit: handleUnlock, className: 'space-y-4' },
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-[11px] uppercase tracking-wider text-white/50 mb-2 font-medium' }, 'Passcode'),
              React.createElement('input', {
                type: 'password',
                autoFocus: true,
                placeholder: 'Enter staff passcode...',
                value: passcode,
                onChange: (e) => setPasscode(e.target.value),
                className: 'w-full px-4 py-3 rounded-xl bg-white/[0.04] border text-white text-sm focus:outline-none transition-all ' + (error ? 'border-red-500 bg-red-500/10' : 'border-white/10 focus:border-[#8366B0]')
              }),
              error && React.createElement('p', { className: 'text-[11px] text-red-400 mt-1.5' }, 'Invalid passcode. Try Valerie2026')
            ),
            React.createElement('div', { className: 'flex items-center space-x-3 pt-2' },
              React.createElement('button', {
                type: 'submit',
                className: 'flex-1 py-3 px-4 rounded-xl bg-[#8366B0] hover:bg-[#9072bd] text-white text-xs font-semibold tracking-wider uppercase transition-all shadow-[0_4px_15px_rgba(131,102,176,0.3)] flex items-center justify-center space-x-1.5 cursor-pointer'
              },
                React.createElement('span', null, 'Unlock Live Website'),
                React.createElement(ArrowRight, { className: 'w-3.5 h-3.5' })
              ),
              React.createElement('a', {
                href: '/vj-manage-x1126',
                className: 'py-3 px-4 rounded-xl border border-white/10 hover:border-white/20 text-white/70 hover:text-white text-xs tracking-wider uppercase transition-all flex items-center justify-center'
              }, 'Admin Login')
            )
          )
        )
      )
    )
  );
}

export function DevPreviewFloatingBadge({ onLock }) {
  return (
    React.createElement('div', { className: 'fixed bottom-4 right-4 z-50 flex items-center space-x-2 bg-[#13111C]/95 border border-[#8366B0]/50 rounded-full px-3.5 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-md' },
      React.createElement('span', { className: 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse' }),
      React.createElement('span', { className: 'text-[11px] tracking-wider uppercase font-semibold text-white/90' }, 'Live Preview Mode Active'),
      React.createElement('span', { className: 'text-[10px] text-white/40 hidden sm:inline' }, '• (Public sees Under Dev screen)'),
      React.createElement('button', {
        onClick: onLock,
        className: 'ml-1 text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full bg-[#8366B0]/30 hover:bg-[#8366B0]/60 text-white transition-all font-medium cursor-pointer',
        title: 'Re-lock site to view public development screen'
      }, 'Lock Site')
    )
  );
}