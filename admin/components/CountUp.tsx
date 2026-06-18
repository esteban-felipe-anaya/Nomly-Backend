"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  value: number;
  /** Format the (interpolated) numeric value into the display string. */
  format?: (n: number) => string;
  duration?: number;
}

/**
 * Animates a number from 0 up to `value` on mount. Respects prefers-reduced-motion
 * (jumps straight to the final value). `format` controls currency/min formatting.
 */
export default function CountUp({
  value,
  format = (n) => String(Math.round(n)),
  duration = 1.1,
}: CountUpProps) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(() =>
    reduced ? format(value) : format(0),
  );
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      setDisplay(format(value));
      return;
    }
    const from = last.current ?? 0;
    last.current = value;
    const controls = animate(from, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(format(latest)),
    });
    return () => controls.stop();
    // format is stable per render-site; value drives the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced, duration]);

  return <>{display}</>;
}
