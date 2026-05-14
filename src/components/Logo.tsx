import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "h-12" }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="h-full w-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="blue-premium" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0057ff" />
            <stop offset="100%" stopColor="#003dcb" />
          </linearGradient>
        </defs>

        <g transform="translate(5, 5) scale(0.9)">
          <rect x="0" y="0" width="100" height="100" rx="22" fill="url(#blue-premium)" />
          <path
            d="M50 20 L76 35 V65 L50 80 L24 65 V35 Z"
            fill="white"
            opacity="0.1"
          />
          <path
            d="M65 35 C65 35 58 30 50 30 C40 30 33 37 33 50 C33 63 40 70 50 70 C58 70 65 65 65 65 V55 H50"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </svg>
      
      <div className="flex flex-col justify-center">
        <div className="text-2xl font-black italic tracking-tighter leading-none text-white">
          GOLDBRICK
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-[1px] flex-1 bg-white/20" />
          <span className="text-[9px] font-bold text-white/60 tracking-[0.3em] uppercase leading-none">
            EXCHANGE
          </span>
          <div className="h-[1px] flex-1 bg-white/20" />
        </div>
      </div>
    </div>
  );
};
