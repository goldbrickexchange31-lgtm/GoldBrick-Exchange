// src/lib/PWAContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface PWAContextType {
  isInstallable: boolean;
  isIOS: boolean;
  showIOSInstructions: boolean;
  setShowIOSInstructions: (show: boolean) => void;
  handleInstallClick: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

// Storage for the browser's install prompt event
let deferredPrompt: any = null;

// Initial check for iOS
const isIOSDevice = typeof window !== 'undefined' && /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isInstallable, setIsInstallable] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkInstallability = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
      
      // If we are already in standalone mode (installed), NEVER show install option
      if (standalone) {
        setIsInstallable(false);
        return;
      }

      // If we have the prompt, it's definitely installable
      if (deferredPrompt) {
        setIsInstallable(true);
      } else if (isIOSDevice) {
        // iOS doesn't support the prompt event, but we can show instructions
        setIsInstallable(true);
      } else {
        // On Android/Chrome, we rely on beforeinstallprompt event to enable the button
        // But we can show it as a fallback if desired. 
        // For now, let's only show if we have the prompt or instructions to give.
        setIsInstallable(!!deferredPrompt);
      }
    };

    // Listen for the browser's native install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      console.log('App: Native beforeinstallprompt captured');
      e.preventDefault();
      deferredPrompt = e;
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      console.log('App: Successfully installed');
      setIsInstallable(false);
      deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Initial check
    checkInstallability();

    // Re-check periodically in case state changes without events
    const interval = setInterval(checkInstallability, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearInterval(interval);
    };
  }, []);

  const handleInstallClick = async () => {
    // 1. Handle iOS (Manual Instructions)
    if (isIOSDevice) {
      setShowIOSInstructions(true);
      return;
    }

    // 2. Handle native prompt available
    if (deferredPrompt) {
      try {
        console.log('App: Triggering native install prompt');
        deferredPrompt.prompt();
        
        const { outcome } = await deferredPrompt.userChoice;
        console.log('App: User PWA install choice:', outcome);
        
        if (outcome === 'accepted') {
          setIsInstallable(false);
          deferredPrompt = null;
        }
      } catch (err) {
        console.error('App: Error triggering PWA prompt:', err);
      }
      return;
    }
    
    // 3. Fallback: No prompt captured yet
    if (!isStandalone && !isIOSDevice) {
      console.warn('App: Install prompt trigger requested but deferredPrompt is missing.');
      // Help the user find the manual option if the automatic one failed
      alert('Installation is available via your browser menu (⋮ or ⋯) -> "Install App" or "Add to Home Screen"');
    }
  };

  return (
    <PWAContext.Provider value={{ 
      isInstallable, 
      isIOS: isIOSDevice, 
      showIOSInstructions, 
      setShowIOSInstructions,
      handleInstallClick 
    }}>
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
}
