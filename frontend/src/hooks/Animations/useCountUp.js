import { useEffect, useRef, useState } from "react";

/**
 * Đếm tăng dần từ 0 → to trong khoảng duration (ms).
 * Chỉ chạy khi start === true. Tự cleanup khi unmount.
 */
export function useCountUp(to, duration = 2000, start = true) {
  const [value, setValue] = useState(0);
  const rafId = useRef(null);

  useEffect(() => {
    if (!start) return;

    const begin = performance.now();
    const animate = (now) => {
      const t = Math.min((now - begin) / duration, 1);
      setValue(Math.round(to * t));
      if (t < 1) {
        rafId.current = requestAnimationFrame(animate);
      }
    };

    rafId.current = requestAnimationFrame(animate);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [to, duration, start]);

  return value;
}
