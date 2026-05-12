import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Also handle internal scroll containers
    const containers = document.querySelectorAll('.overflow-y-auto');
    containers.forEach(c => c.scrollTo(0, 0));
  }, [pathname]);

  return null;
}
