import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useSiteContent } from '../context/SiteContentContext';

export const DEFAULT_AMAZON_STORE_URL = 'https://www.amazon.in/s?rh=n%3A1951048031%2Cp_4%3AHOUSE%2BOF%2BVJ';
export const DEFAULT_AMAZON_STORE_NAME = 'HOUSE OF VJ';

/**
 * 100% Authentic Original Amazon Vector Wordmark Logo
 * Official black 'amazon' typography with the iconic curved #FF9900 orange smile arrow from 'a' to 'z'
 */
export function OriginalAmazonLogo({ className = "h-4 w-auto", textColor = "#111827", style }) {
  return (
    <svg
      viewBox="0 0 603 182"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Amazon Logo"
    >
      {/* Curved orange smile arrow */}
      <path
        d="m 374.00642,142.18404 c -34.99948,25.79739 -85.72909,39.56123 -129.40634,39.56123 -61.24255,0 -116.37656,-22.65135 -158.08757,-60.32496 -3.2771,-2.96252 -0.34083,-6.9999 3.59171,-4.69283 45.01431,26.19064 100.67269,41.94697 158.16623,41.94697 38.774689,0 81.4295,-8.02237 120.6499,-24.67006 5.92501,-2.51683 10.87999,3.88009 5.08607,8.17965"
        fill="#FF9900"
      />
      {/* Orange arrow tip */}
      <path
        d="m 388.55678,125.53635 c -4.45688,-5.71527 -29.57261,-2.70033 -40.84585,-1.36327 -3.43442,0.41947 -3.95874,-2.56925 -0.86517,-4.71905 20.00346,-14.07844 52.82696,-10.01483 56.65462,-5.2958 3.82764,4.74526 -0.99624,37.64741 -19.79373,53.35128 -2.88385,2.41195 -5.63662,1.12734 -4.35198,-2.07113 4.2209,-10.53917 13.68519,-34.16054 9.20211,-39.90203"
        fill="#FF9900"
      />
      {/* Letter 'z' */}
      <path
        d="M 348.49744,20.06598 V 6.38079 c 0,-2.07113 1.57301,-3.46062 3.46062,-3.46062 h 61.26875 c 1.96628,0 3.53929,1.41571 3.53929,3.46062 v 11.71893 c -0.0262,1.96626 -1.67788,4.53551 -4.61418,8.59912 l -31.74859,45.32893 c 11.79759,-0.28837 24.25059,1.46814 34.94706,7.49802 2.41195,1.36327 3.06737,3.35575 3.25089,5.32203 V 99.4506 c 0,1.99248 -2.20222,4.32576 -4.5093,3.1198 -18.84992,-9.88376 -43.887,-10.95865 -64.72939,0.10487 -2.12356,1.15354 -4.35199,-1.15354 -4.35199,-3.14602 V 85.66054 c 0,-2.22843 0.0262,-6.02989 2.25463,-9.41186 l 36.78224,-52.74829 h -32.01076 c -1.96626,0 -3.53927,-1.38948 -3.53927,-3.43441"
        fill={textColor}
      />
      {/* Letter 'm' */}
      <path
        d="m 124.99883,105.45424 h -18.64017 c -1.78273,-0.13107 -3.19845,-1.46813 -3.32954,-3.17224 V 6.61676 c 0,-1.91383 1.59923,-3.43442 3.59171,-3.43442 h 17.38176 c 1.80898,0.0786 3.25089,1.46814 3.38199,3.19845 v 12.50545 h 0.34082 c 4.53551,-12.08598 13.05597,-17.7226 24.53896,-17.7226 11.66649,0 18.95477,5.63662 24.19814,17.7226 4.5093,-12.08598 14.76008,-17.7226 25.74495,-17.7226 7.81262,0 16.35931,3.22467 21.57646,10.46052 5.89879,8.04857 4.69281,19.74128 4.69281,29.99208 l -0.0262,60.37739 c 0,1.91383 -1.59923,3.46061 -3.59171,3.46061 h -18.61397 c -1.86138,-0.13107 -3.35574,-1.62543 -3.35574,-3.46061 V 51.29025 c 0,-4.03739 0.36702,-14.10466 -0.52434,-17.93233 -1.38949,-6.42311 -5.55797,-8.23209 -10.95865,-8.23209 -4.5093,0 -9.22833,3.01494 -11.14216,7.83885 -1.91383,4.8239 -1.73031,12.89867 -1.73031,18.32557 v 50.70338 c 0,1.91383 -1.59923,3.46061 -3.59171,3.46061 h -18.61395 c -1.88761,-0.13107 -3.35576,-1.62543 -3.35576,-3.46061 L 152.946,51.29025 c 0,-10.67025 1.75651,-26.37415 -11.48298,-26.37415 -13.39682,0 -12.87248,15.31063 -12.87248,26.37415 v 50.70338 c 0,1.91383 -1.59923,3.46061 -3.59171,3.46061"
        fill={textColor}
      />
      {/* Letter 'o' */}
      <path
        d="m 469.51439,1.16364 c 27.65877,0 42.62858,23.75246 42.62858,53.95427 0,29.17934 -16.54284,52.32881 -42.62858,52.32881 -27.16066,0 -41.94697,-23.75246 -41.94697,-53.35127 0,-29.78234 14.96983,-52.93181 41.94697,-52.93181 m 0.15729,19.53156 c -13.73761,0 -14.60278,18.71881 -14.60278,30.38532 0,11.69271 -0.18352,36.65114 14.44549,36.65114 14.44548,0 15.12712,-20.13452 15.12712,-32.40403 0,-8.07477 -0.34082,-17.72257 -2.779,-25.3779 -2.09735,-6.65906 -6.26581,-9.25453 -12.19083,-9.25453"
        fill={textColor}
      />
      {/* Letter 'n' */}
      <path
        d="M 548.00762,105.45424 H 529.4461 c -1.86141,-0.13107 -3.35577,-1.62543 -3.35577,-3.46061 l -0.0262,-95.69149 c 0.1573,-1.75653 1.7041,-3.1198 3.59171,-3.1198 h 17.27691 c 1.62543,0.0786 2.96249,1.17976 3.32954,2.67412 v 14.62899 h 0.3408 c 5.21717,-13.0822 12.53165,-19.32181 25.40412,-19.32181 8.36317,0 16.51662,3.01494 21.75999,11.27324 4.87633,7.65532 4.87633,20.5278 4.87633,29.78233 v 60.22011 c -0.20973,1.67786 -1.75653,3.01492 -3.59169,3.01492 h -18.69262 c -1.70411,-0.13107 -3.11982,-1.38948 -3.30332,-3.01492 V 50.47753 c 0,-10.46052 1.20597,-25.77117 -11.66651,-25.77117 -4.5355,0 -8.70399,3.04117 -10.77512,7.65532 -2.62167,5.84637 -2.96249,11.66651 -2.96249,18.11585 v 51.5161 c -0.0262,1.91383 -1.65166,3.46061 -3.64414,3.46061"
        fill={textColor}
      />
      {/* First letter 'a' */}
      <path
        d="M 55.288261,59.75829 V 55.7209 c -13.475471,0 -27.711211,2.88385 -27.711211,18.77125 0,8.04857 4.16847,13.50169 11.32567,13.50169 5.24337,0 9.93618,-3.22467 12.8987,-8.46805 3.670341,-6.44935 3.486841,-12.50544 3.486841,-19.7675 m 18.79747,45.43378 c -1.23219,1.10111 -3.01495,1.17976 -4.40444,0.4457 -6.18716,-5.1385 -7.28828,-7.52423 -10.69647,-12.42678 -10.224571,10.4343 -17.460401,13.55409 -30.726141,13.55409 -15.67768,0 -27.89471,-9.67401 -27.89471,-29.04824 0,-15.12713 8.20587,-25.43035 19.87236,-30.46398 10.1197,-4.45688 24.25058,-5.24337 35.051931,-6.47556 v -2.41195 c 0,-4.43066 0.34082,-9.67403 -2.25465,-13.50167 -2.280881,-3.43442 -6.632861,-4.85013 -10.460531,-4.85013 -7.10475,0 -13.44924,3.64414 -14.99603,11.19459 -0.31461,1.67789 -1.5468,3.32955 -3.22467,3.4082 L 6.26276,32.67628 C 4.74218,32.33548 3.0643,31.10327 3.48377,28.76999 7.65225,6.85271 27.44596,0.24605 45.16856,0.24605 c 9.071011,0 20.921021,2.41195 28.078221,9.28076 9.07104,8.46804 8.20587,19.7675 8.20587,32.06321 v 29.04826 c 0,8.73022 3.61794,12.55786 7.02613,17.27691 1.20597,1.67786 1.46814,3.69656 -0.05244,4.95497 -3.80144,3.17225 -10.56538,9.07104 -14.28819,12.37436 l -0.05242,-0.0525"
        fill={textColor}
      />
      {/* Second letter 'a' */}
      <path
        transform="translate(244.36719, 0)"
        d="M 55.288261,59.75829 V 55.7209 c -13.475471,0 -27.711211,2.88385 -27.711211,18.77125 0,8.04857 4.16847,13.50169 11.32567,13.50169 5.24337,0 9.93618,-3.22467 12.8987,-8.46805 3.670341,-6.44935 3.486841,-12.50544 3.486841,-19.7675 m 18.79747,45.43378 c -1.23219,1.10111 -3.01495,1.17976 -4.40444,0.4457 -6.18716,-5.1385 -7.28828,-7.52423 -10.69647,-12.42678 -10.224571,10.4343 -17.460401,13.55409 -30.726141,13.55409 -15.67768,0 -27.89471,-9.67401 -27.89471,-29.04824 0,-15.12713 8.20587,-25.43035 19.87236,-30.46398 10.1197,-4.45688 24.25058,-5.24337 35.051931,-6.47556 v -2.41195 c 0,-4.43066 0.34082,-9.67403 -2.25465,-13.50167 -2.280881,-3.43442 -6.632861,-4.85013 -10.460531,-4.85013 -7.10475,0 -13.44924,3.64414 -14.99603,11.19459 -0.31461,1.67789 -1.5468,3.32955 -3.22467,3.4082 L 6.26276,32.67628 C 4.74218,32.33548 3.0643,31.10327 3.48377,28.76999 7.65225,6.85271 27.44596,0.24605 45.16856,0.24605 c 9.071011,0 20.921021,2.41195 28.078221,9.28076 9.07104,8.46804 8.20587,19.7675 8.20587,32.06321 v 29.04826 c 0,8.73022 3.61794,12.55786 7.02613,17.27691 1.20597,1.67786 1.46814,3.69656 -0.05244,4.95497 -3.80144,3.17225 -10.56538,9.07104 -14.28819,12.37436 l -0.05242,-0.0525"
        fill={textColor}
      />
    </svg>
  );
}

export default function AmazonTrustBadge({ variant = 'strip', className = '' }) {
  const { content } = useSiteContent();
  const amazon = content?.amazonStore || {};
  
  if (amazon.enabled === false || amazon.enabled === 'false') {
    return null;
  }

  const storeUrl = amazon.url || DEFAULT_AMAZON_STORE_URL;
  const storeName = amazon.storeName || DEFAULT_AMAZON_STORE_NAME;

  // 1. Variant: Trust Strip on Homepage (Below Pillars)
  if (variant === 'strip') {
    return (
      <div className={`mt-5 pt-4 border-t border-brand-border/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${className}`}>
        <div className="flex items-center space-x-3 text-brand-tertiary">
          <div className="h-7 px-2.5 bg-white border border-brand-border/90 rounded-lg shadow-2xs flex items-center justify-center shrink-0">
            <OriginalAmazonLogo className="h-3.5 w-auto" />
          </div>
          <span className="text-xs font-medium text-brand-tertiary">
            Also available on <strong className="font-bold text-brand-tertiary">Amazon India</strong>
            <span className="text-brand-muted font-light hidden sm:inline"> — Verified storefront: <span className="font-semibold text-brand-tertiary">{storeName}</span></span>
          </span>
        </div>
        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1.5 text-brand-primary hover:text-brand-primary/80 font-semibold text-xs transition-colors shrink-0 group"
          title={`Visit ${storeName} on Amazon India`}
        >
          <span>Visit Amazon Store</span>
          <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>
    );
  }

  // 2. Variant: Product Detail Modal (PDP)
  if (variant === 'pdp') {
    return (
      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`p-3 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50/60 via-white to-amber-50/30 hover:border-amber-400 hover:shadow-xs transition-all flex items-center justify-between group ${className}`}
        title={`Explore ${storeName} on Amazon`}
      >
        <div className="flex items-center space-x-3">
          <div className="h-8 px-2.5 bg-white rounded-lg border border-amber-200 shadow-2xs flex items-center justify-center shrink-0">
            <OriginalAmazonLogo className="h-4 w-auto" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-brand-tertiary block text-[11.5px]">Also Available on Amazon</span>
              <span className="text-[8.5px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-full border border-amber-300/60">
                Verified
              </span>
            </div>
            <span className="text-[10px] text-brand-muted font-light">Official Storefront: {storeName}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-medium text-brand-primary group-hover:translate-x-0.5 transition-transform">
          <span>View Store</span>
          <ExternalLink className="w-3 h-3" />
        </div>
      </a>
    );
  }

  // 3. Variant: Global Footer Tagline Badge
  if (variant === 'footer') {
    return (
      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#FAF7FC] border border-brand-border hover:border-brand-primary/50 text-xs text-brand-tertiary font-medium transition-all group ${className}`}
        title={`Visit ${storeName} on Amazon`}
      >
        <span className="text-brand-muted text-[11px] font-light">Also on</span>
        <OriginalAmazonLogo className="h-3.5 w-auto" />
        <span className="text-brand-muted font-light text-[11px]">({storeName})</span>
        <ExternalLink className="w-3 h-3 text-brand-muted group-hover:text-brand-primary transition-colors" />
      </a>
    );
  }

  // 4. Variant: Mobile Sidebar Drawer
  if (variant === 'sidebar') {
    return (
      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`w-full py-2.5 px-3 rounded-xl bg-amber-50/70 hover:bg-amber-100/70 text-brand-tertiary border border-amber-200/60 text-xs font-medium flex items-center justify-between transition-colors ${className}`}
        title={`Visit ${storeName} on Amazon`}
      >
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-brand-muted font-light">Also on</span>
          <div className="bg-white px-2 py-0.5 rounded border border-amber-200/80 shadow-2xs flex items-center">
            <OriginalAmazonLogo className="h-3 w-auto" />
          </div>
          <span className="text-[11px] font-semibold text-brand-tertiary">({storeName})</span>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-brand-muted" />
      </a>
    );
  }

  return null;
}
