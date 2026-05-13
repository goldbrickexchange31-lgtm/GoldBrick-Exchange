import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    
    // Also handle internal scroll containers with some delay to ensure content is rendered
    const resetScroll = () => {
      const containers = document.querySelectorAll('.overflow-y-auto');
      containers.forEach(c => c.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
    };
    
    resetScroll();
    const timer = setTimeout(resetScroll, 50);
    const timer2 = setTimeout(resetScroll, 200);
    const timer3 = setTimeout(resetScroll, 500);
    const timer4 = setTimeout(resetScroll, 1000); 
    
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [pathname]);

  return null;
}
