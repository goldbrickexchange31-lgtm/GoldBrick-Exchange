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
let pwaUpdateCallback: (() => void) | null = null;

// Initial check for iOS
const isIOSDevice = typeof window !== 'undefined' && (/iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1));

// Universal listener (outside component to catch early events)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('FCM/PWA: Native beforeinstallprompt captured early');
    e.preventDefault();
    deferredPrompt = e;
    if (pwaUpdateCallback) pwaUpdateCallback();
  });

  window.addEventListener('appinstalled', () => {
    console.log('FCM/PWA: App successfully installed');
    deferredPrompt = null;
    if (pwaUpdateCallback) pwaUpdateCallback();
  });
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isInstallable, setIsInstallable] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    const checkInstallability = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      
      // If we are already in standalone (installed), hide button
      if (isStandalone) {
        setIsInstallable(false);
        return;
      }

      // Show if we have the prompt OR if it's iOS (manual instructions)
      setIsInstallable(!!deferredPrompt || isIOSDevice);
    };

    // Register callback for early events
    pwaUpdateCallback = checkInstallability;
    
    // Initial check
    checkInstallability();

    // Verify Service Worker registration Status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          console.log('FCM/PWA: Active Service Worker found:', reg.scope);
        } else {
          console.warn('FCM/PWA: No active Service Worker found. Installability may be compromised.');
        }
      });
    }

    return () => {
      pwaUpdateCallback = null;
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('App: Install prompt unavailable');
      // If it's iOS, we can still show instructions through the UI (not alert)
      if (isIOSDevice) {
        setShowIOSInstructions(true);
      }
      return;
    }

    try {
      console.log('App: Triggering native install prompt');
      deferredPrompt.prompt();
      
      const { outcome } = await deferredPrompt.userChoice;
      console.log('App: Install result:', outcome);
      
      if (outcome === 'accepted') {
        console.log('App: User installed app');
        setIsInstallable(false);
        deferredPrompt = null;
      }
    } catch (err) {
      console.error('App: Error triggering PWA prompt:', err);
      deferredPrompt = null;
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
