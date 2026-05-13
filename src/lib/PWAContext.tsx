import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

interface PWAContextType {
  isInstallable: boolean;
  isIOS: boolean;
  showIOSInstructions: boolean;
  setShowIOSInstructions: (show: boolean) => void;
  handleInstallClick: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

// Storing it outside the component to capture the event as early as possible
let deferredPromptGlobal: any = null;

// Initial check for iOS
const isIOSDevice = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isInstallable, setIsInstallable] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      deferredPromptGlobal = e;
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // If it's iOS and not already in standalone mode, it's "installable"
    if (isIOSDevice && !window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(true);
    }
    
    // Always consider it installable if not in standalone mode, 
    // we will show a guide if beforeinstallprompt wasn't captured
    if (!window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(true);
    }

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
       setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOSDevice) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPromptGlobal) {
      // Fallback: tell user how to install manually
      toast.info('To install: click your browser menu and select "Install App" or "Add to Home Screen"');
      return;
    }

    deferredPromptGlobal.prompt();
    const { outcome } = await deferredPromptGlobal.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }

    deferredPromptGlobal = null;
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
