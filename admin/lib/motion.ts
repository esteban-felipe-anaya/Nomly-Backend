import type { Variants } from "framer-motion";

/**
 * Shared motion variants. Components read `useReducedMotion()` and pass the
 * result to these builders so animations are disabled / reduced when the user
 * prefers reduced motion.
 */

export function fadeSlideUp(reduced: boolean): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] },
    },
  };
}

export function staggerContainer(reduced: boolean): Variants {
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduced ? 0 : 0.07,
        delayChildren: reduced ? 0 : 0.05,
      },
    },
  };
}

export function scaleIn(reduced: boolean): Variants {
  return {
    hidden: { opacity: 0, scale: reduced ? 1 : 0.96 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: reduced ? 0 : 0.35, ease: "easeOut" },
    },
  };
}
