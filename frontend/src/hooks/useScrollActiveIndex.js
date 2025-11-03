// Custom hook để xử lý scroll active index

import { useEffect, useRef, useState } from 'react';

const useScrollActiveIndex = (isClient = true) => {
  const cardRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!isClient) return;

    const updateActiveIndex = () => {
      const centerY = window.innerHeight / 2;
      let bestIdx = 0;
      let bestDistance = Infinity;

      cardRefs.current.forEach((card, idx) => {
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const distance = Math.abs(cardCenter - centerY);

        // Only consider cards that are at least partially visible
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIdx = idx;
          }
        }
      });

      setActiveIndex(bestIdx);
    };

    // Intersection Observer for better performance
    const observer = new IntersectionObserver(
      entries => {
        // Throttle the update to avoid too many re-renders
        requestAnimationFrame(updateActiveIndex);
      },
      {
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: '-20% 0px -20% 0px',
      }
    );

    // Observe all cards
    cardRefs.current.forEach(card => {
      if (card) observer.observe(card);
    });

    // Also listen to scroll for more responsive updates
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateActiveIndex();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial update
    updateActiveIndex();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isClient]);

  return { cardRefs, activeIndex };
};

export default useScrollActiveIndex;
