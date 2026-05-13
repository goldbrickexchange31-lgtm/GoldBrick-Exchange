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

// Catch the prompt event as early as possible
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Dispatch a custom event so the hook can react
    window.dispatchEvent(new CustomEvent('pwa-install-ready'));
  });
}

// Initial check for iOS
const isIOSDevice = typeof window !== 'undefined' && /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isInstallable, setIsInstallable] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    const checkInstallability = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      
      // If we have the prompt OR it's iOS and not already installed, show install option
      if ((deferredPrompt || isIOSDevice) && !isStandalone) {
        setIsInstallable(true);
      } else if (!isStandalone) {
        // Fallback: Show button even if prompt was missed, clicking will handle it
        setIsInstallable(true);
      } else {
        setIsInstallable(false);
      }
    };

    const onInstallReady = () => {
      setIsInstallable(true);
    };

    window.addEventListener('pwa-install-ready', onInstallReady);
    window.addEventListener('appinstalled', () => setIsInstallable(false));
    
    checkInstallability();

    return () => {
      window.removeEventListener('pwa-install-ready', onInstallReady);
    };
  }, []);

  const handleInstallClick = async () => {
    // 1. Handle iOS
    if (isIOSDevice) {
      setShowIOSInstructions(true);
      return;
    }

    // 2. Handle prompt available
    if (deferredPrompt) {
      try {
        const promptEvent = deferredPrompt;
        // The prompt() method must be called within a user gesture.
        promptEvent.prompt();
        
        const { outcome } = await promptEvent.userChoice;
        console.log('User PWA install choice:', outcome);
        
        if (outcome === 'accepted') {
          setIsInstallable(false);
          deferredPrompt = null;
        }
      } catch (err) {
        console.error('Error triggering PWA prompt:', err);
      }
      return;
    }
    
    // 3. Fallback: No prompt captured
    // In some browsers, we can try to trigger it via hidden link or just let the user know
    console.log('PWA Prompt not available yet.');
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

