"use client";

import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Box,
  CircularProgress,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRef, useState } from "react";
import ImagePreview from "@/components/ImagePreview";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { apiErrorMessage, uploadImage } from "@/lib/api";

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

const ACCEPT = "image/png,image/jpeg,image/gif,image/webp,image/svg+xml";

/**
 * Reusable image field: click/drag-to-upload dropzone with progress, plus an
 * "or paste an image URL" input so existing (e.g. Unsplash) URLs keep working.
 */
export default function ImageUploadField({
  value,
  onChange,
  label = "Image",
}: ImageUploadFieldProps) {
  const { notify } = useSnackbar();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const url = await uploadImage(file, setProgress);
      onChange(url);
      notify("Image uploaded");
    } catch (err) {
      notify(apiErrorMessage(err, "Upload failed"), "error");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Box>
      {label && (
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {label}
        </Typography>
      )}

      <Box sx={{ position: "relative" }}>
        <ImagePreview url={value} />
        {value && !uploading && (
          <IconButton
            size="small"
            onClick={() => onChange("")}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              bgcolor: "background.paper",
              "&:hover": { bgcolor: "background.paper" },
              boxShadow: 1,
            }}
            aria-label="Remove image"
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Box
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!uploading) handleFile(e.dataTransfer.files?.[0]);
        }}
        sx={{
          mt: 1.5,
          p: 2,
          borderRadius: 2,
          border: "2px dashed",
          borderColor: dragOver ? "primary.main" : "divider",
          bgcolor: dragOver ? "action.hover" : "transparent",
          cursor: uploading ? "default" : "pointer",
          textAlign: "center",
          transition: "border-color .2s, background-color .2s",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <Stack spacing={1} alignItems="center">
            <CircularProgress size={24} />
            <Box sx={{ width: "100%", maxWidth: 240 }}>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Uploading… {progress}%
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={0.5} alignItems="center">
            <CloudUploadIcon color="action" />
            <Typography variant="body2" color="text.secondary">
              Click or drag an image here to upload
            </Typography>
            <Typography variant="caption" color="text.disabled">
              PNG, JPG, GIF, WEBP or SVG
            </Typography>
          </Stack>
        )}
      </Box>

      <TextField
        label="or paste an image URL"
        fullWidth
        size="small"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{ mt: 1.5 }}
      />
    </Box>
  );
}
