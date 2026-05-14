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

      // If we have the prompt OR it's iOS, we can consider it installable
      if (deferredPrompt || isIOSDevice) {
        setIsInstallable(true);
      } else {
        // Fallback: Show button to allow manual instructions if prompt was missed
        setIsInstallable(true);
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
    // Show a manual instruction toast or modal
    if (!isStandalone) {
      if (isIOSDevice) {
        setShowIOSInstructions(true);
      } else {
        alert('To install this app: \n1. Click your browser menu (⋮ or ⋯)\n2. Select "Install App" or "Add to Home Screen"');
      }
    }
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

