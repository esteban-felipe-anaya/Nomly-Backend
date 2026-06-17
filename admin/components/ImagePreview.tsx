"use client";

import BrokenImageIcon from "@mui/icons-material/BrokenImage";
import { Box } from "@mui/material";

interface ImagePreviewProps {
  url?: string | null;
  height?: number;
  alt?: string;
}

export default function ImagePreview({
  url,
  height = 140,
  alt = "preview",
}: ImagePreviewProps) {
  return (
    <Box
      sx={{
        height,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "action.hover",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <BrokenImageIcon sx={{ color: "text.disabled", fontSize: 40 }} />
      )}
    </Box>
  );
}
