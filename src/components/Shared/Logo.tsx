import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', showText = true, size = 'md' }) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Signature Revolve Geometric Faceted Diamond/Ribbon Mark */}
      <div className={`relative shrink-0 flex items-center justify-center ${iconSizes[size]}`}>
        <svg viewBox="0 0 32 32" fill="none" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="facetTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
            <linearGradient id="facetLeft" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#6D28D9" />
            </linearGradient>
            <linearGradient id="facetRight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#4C1D95" />
            </linearGradient>
          </defs>
          {/* Top light facet */}
          <path d="M12 4 L26 8 L18 16 L8 12 Z" fill="url(#facetTop)" />
          {/* Left vibrant facet */}
          <path d="M8 12 L18 16 L14 28 L4 20 Z" fill="url(#facetLeft)" />
          {/* Right/Bottom deep facet */}
          <path d="M18 16 L26 8 L22 24 L14 28 Z" fill="url(#facetRight)" />
        </svg>
      </div>

      {showText && (
        <div className="flex items-center tracking-tight font-bold">
          <span className={`text-white tracking-tight ${textSizes[size]}`}>
            Supply<span className="text-[#A78BFA]">Flow</span>
          </span>
        </div>
      )}
    </div>
  );
};

