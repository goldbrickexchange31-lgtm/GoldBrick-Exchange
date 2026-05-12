import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.scrollTo(0, 0);
    document.documentElement.scrollTo(0, 0);
    
    // Also handle internal scroll containers with some delay to ensure content is rendered
    const resetScroll = () => {
      const containers = document.querySelectorAll('.overflow-y-auto');
      containers.forEach(c => c.scrollTo(0, 0));
    };
    
    resetScroll();
    const timer = setTimeout(resetScroll, 100);
    const timer2 = setTimeout(resetScroll, 300);
    const timer3 = setTimeout(resetScroll, 600);
    const timer4 = setTimeout(resetScroll, 1200); 
    
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [pathname]);

  return null;
}
