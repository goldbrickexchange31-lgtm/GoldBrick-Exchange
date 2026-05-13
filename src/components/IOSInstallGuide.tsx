import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share, PlusSquare } from 'lucide-react';

interface IOSInstallGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IOSInstallGuide({ isOpen, onClose }: IOSInstallGuideProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-secondary border border-border p-6 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4">
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="size-5 text-white/50" />
              </button>
            </div>

            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="size-20 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
                  <img src="/favicon.ico" alt="Logo" className="size-12" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Install GoldBrick</h3>
                <p className="text-white/60 text-sm">Follow these 2 steps to add the app to your iPhone home screen.</p>
              </div>

              <div className="space-y-4 text-left">
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="size-10 rounded-full bg-white/10 flex items-center justify-center font-black text-primary">1</div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">Tap the <span className="text-primary font-bold inline-flex items-center gap-1">Share <Share size={14} /></span> button in Safari.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="size-10 rounded-full bg-white/10 flex items-center justify-center font-black text-primary">2</div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">Scroll down and select <span className="text-primary font-bold inline-flex items-center gap-1">Add to Home Screen <PlusSquare size={14} /></span>.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 uppercase tracking-widest text-xs"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
