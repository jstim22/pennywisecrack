"use client";

import { useEffect, useRef, useState } from "react";

// Width of an element, kept up to date as it resizes, so an SVG can be drawn
// at its real size and its text stays readable on a phone.
export default function useElementWidth(initial = 680) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(Math.round(entry.contentRect.width), 240));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}
