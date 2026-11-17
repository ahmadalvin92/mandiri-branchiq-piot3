import React from 'react';

/**
 * Official Bank Mandiri Logo from folder (mandiri_logo.png / mandiri_tanpa background.jpg)
 */
export function MandiriOfficialLogo({ className = "h-10 sm:h-12 w-auto" }) {
  return (
    <div className="flex items-center shrink-0">
      <img
        src="/mandiri_logo.png"
        alt="Bank Mandiri"
        className={`${className} object-contain drop-shadow-xs transition-transform hover:scale-102`}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = '/mandiri_tanpa background.jpg';
        }}
      />
    </div>
  );
}

/**
 * Custom Emblem for KC Jakarta Pondok Indah Office 3 (Branch 10125)
 * Combines Bank Mandiri corporate badge with Office Tower 3 architectural identity
 */
export function PondokIndahEmblem({ className = "h-12 w-12 sm:h-14 sm:w-14" }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <div className="relative w-full h-full flex flex-col items-center justify-center p-1.5 rounded-2xl bg-gradient-to-br from-[#003D79] via-[#00254D] to-[#001833] border-2 border-[#FFB81C] shadow-md group hover:scale-105 transition-transform duration-300 overflow-hidden">
        
        {/* Subtle Gold Ribbon Header Glow */}
        <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-[#FFB81C]/25 blur-sm pointer-events-none"></div>

        {/* Building & Tower Vector Icon */}
        <svg
          viewBox="0 0 60 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-7 h-7 text-[#FFB81C] mb-0.5"
        >
          {/* Skyscraper Building Silhouettes */}
          <path d="M12 44 L12 22 L20 18 L20 44 Z" fill="#93C5FD" opacity="0.8" />
          <path d="M40 44 L40 18 L48 22 L48 44 Z" fill="#60A5FA" opacity="0.9" />
          <path d="M22 44 L22 10 L30 4 L38 10 L38 44 Z" fill="#FFB81C" />
          
          {/* Tower Floor Lines */}
          <line x1="24" y1="14" x2="36" y2="14" stroke="#00254D" strokeWidth="1.2" />
          <line x1="24" y1="20" x2="36" y2="20" stroke="#00254D" strokeWidth="1.2" />
          <line x1="24" y1="26" x2="36" y2="26" stroke="#00254D" strokeWidth="1.2" />
          <line x1="24" y1="32" x2="36" y2="32" stroke="#00254D" strokeWidth="1.2" />
          <line x1="24" y1="38" x2="36" y2="38" stroke="#00254D" strokeWidth="1.2" />

          {/* Mandiri Wave Arch */}
          <path 
            d="M6 44 C 18 39, 42 39, 54 44" 
            stroke="#FFB81C" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
          />
        </svg>

        {/* Branch Code Label */}
        <span className="text-[9px] font-black tracking-wider text-[#FFB81C] uppercase font-mono leading-none">
          KC 10125
        </span>
      </div>
    </div>
  );
}
