import { useEffect, useRef, useState } from "react";

export function useInView<T extends HTMLElement>(options?: { once?: boolean }) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const once = options?.once ?? true;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.unobserve(node);
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  return { ref, inView };
}
