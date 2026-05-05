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
          <linearGradient id="blue-primary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0066FF" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="blue-shadow" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="blue-highlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>

        <g transform="translate(5, 5) scale(0.9)">
          {/* Hexagon Frame / Shadow base */}
          <path
            d="M50 0 L93.3 25 V75 L50 100 L6.7 75 V25 Z"
            fill="#1E3A8A"
            opacity="0.1"
          />
          
          {/* Main Hexagon Body */}
          <path
            d="M50 2 L91.3 26 V74 L50 98 L8.7 74 V26 Z"
            fill="url(#blue-primary)"
          />

          {/* Simple Bold 'G' Icon */}
          <text
            x="50"
            y="62"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontSize="64"
            fontWeight="900"
            fill="white"
            opacity="0.9"
            textAnchor="middle"
            dominantBaseline="middle"
            className="tracking-tighter"
          >
            G
          </text>
          
          {/* Front Bevel highlight for depth */}
          <path
            d="M50 2 L91.3 26 V30 L50 6 L8.7 30 V26 Z"
            fill="url(#blue-highlight)"
            opacity="0.3"
          />
        </g>
      </svg>
      
      <div className="flex flex-col justify-center">
        <div className="text-2xl font-black italic vibrant-text tracking-tighter leading-none">
          GOLDBRICK
        </div>
        <div className="flex items-center gap-2 mt-1 px-1">
          <div className="h-[0.5px] flex-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <span className="text-[10px] font-bold text-primary tracking-[0.5em] uppercase leading-none">
            EXCHANGE
          </span>
          <div className="h-[0.5px] flex-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
        </div>
      </div>
    </div>
  );
};
