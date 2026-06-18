"use client";

import { Box } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { fadeSlideUp } from "@/lib/motion";

/**
 * Wraps page content with a fade + slight slide entrance. Re-runs on route
 * change (keyed by pathname) so navigating between pages animates the content.
 */
export default function MotionContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion() ?? false;
  const pathname = usePathname();
  return (
    <Box
      component={motion.div}
      key={pathname}
      variants={fadeSlideUp(reduced)}
      initial="hidden"
      animate="visible"
    >
      {children}
    </Box>
  );
}
