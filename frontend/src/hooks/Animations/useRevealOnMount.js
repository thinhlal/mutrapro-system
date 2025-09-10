import { useEffect, useState } from "react";

export function useRevealOnMount(delayMs = 0) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return isVisible;
}
