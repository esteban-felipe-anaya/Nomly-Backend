/**
 * Accent palette for colorful nav icons and KPI cards.
 * Stays cohesive with the brand orange (#E0531F) which leads the set.
 */
export interface Accent {
  /** Solid icon color. */
  main: string;
}

export const accents = {
  orange: { main: "#E0531F" },
  green: { main: "#2E9E5B" },
  blue: { main: "#1976D2" },
  purple: { main: "#8E24AA" },
  teal: { main: "#0E9DAA" },
  pink: { main: "#D81B60" },
  amber: { main: "#F2A900" },
  indigo: { main: "#3F51B5" },
  cyan: { main: "#0097A7" },
} as const;

export type AccentKey = keyof typeof accents;

/** A subtly tinted background for a card given an accent color (alpha hex). */
export function tintBg(color: string, alpha = "14"): string {
  return `${color}${alpha}`;
}
