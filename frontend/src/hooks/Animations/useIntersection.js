import { useEffect, useState, useRef } from 'react';

const DEFAULT_OPTS = {
  threshold: 0.2,
  rootMargin: '0px 0px -50px 0px',
};

export function useIntersection(options = DEFAULT_OPTS) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        // Nếu chỉ cần trigger 1 lần thì unobserve
        observer.unobserve(el);
      }
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return { ref, isVisible };
}
