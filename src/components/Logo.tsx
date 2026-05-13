import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "h-12" }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src="/logo.svg" 
        alt="GoldBrick Logo" 
        className="h-full w-auto"
      />
      <div className="flex flex-col justify-center">
        <div className="text-2xl font-black italic vibrant-text tracking-tighter leading-none">
          GOLDBRICK
        </div>
        <div className="flex items-center gap-2 mt-1 px-1">
          <div className="h-[0.5px] flex-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <span className="text-[10px] font-bold text-primary tracking-[0.5em] uppercase leading-none">
            INVESTMENTS
          </span>
          <div className="h-[0.5px] flex-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
        </div>
      </div>
    </div>
  );
};
