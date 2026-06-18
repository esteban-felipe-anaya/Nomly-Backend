"use client";

import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CropIcon from "@mui/icons-material/Crop";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Box,
  CircularProgress,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import ImageCropDialog from "@/components/ImageCropDialog";
import ImagePreview from "@/components/ImagePreview";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { apiErrorMessage, mediaUrl, uploadImage } from "@/lib/api";
import { getCroppedBlob } from "@/lib/cropImage";

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

const ACCEPT = "image/png,image/jpeg,image/gif,image/webp,image/svg+xml";

/**
 * Reusable image field: click/drag-to-upload dropzone with progress, plus an
 * "or paste an image URL" input so existing (e.g. Unsplash) URLs keep working.
 *
 * Selecting/dropping a file (or pressing "Crop" on an existing image) opens a
 * crop dialog; on confirm the crop is rendered to a Blob and uploaded. SVGs and
 * remote images that taint the canvas (CORS) fall back to a direct upload.
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

  // Crop dialog state. `cropSrc` is the URL shown in the cropper (object URL for
  // local files, mediaUrl for re-cropping). `pendingFile` keeps the original
  // file so we can fall back to uploading uncropped if the canvas is tainted.
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Revoke object URLs we created to avoid leaks.
  useEffect(() => {
    return () => {
      if (cropSrc.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  const doUpload = async (file: File) => {
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

  const closeCrop = () => {
    setCropOpen(false);
    if (cropSrc.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
    setCropSrc("");
    setPendingFile(null);
  };

  const handleFile = (file: File | undefined | null) => {
    if (!file) return;
    // SVGs can't be meaningfully raster-cropped; upload them directly.
    if (file.type === "image/svg+xml") {
      void doUpload(file);
      return;
    }
    setPendingFile(file);
    setCropSrc(URL.createObjectURL(file));
    setCropOpen(true);
  };

  const handleRecropExisting = () => {
    const resolved = mediaUrl(value);
    if (!resolved) return;
    setPendingFile(null);
    setCropSrc(resolved);
    setCropOpen(true);
  };

  const handleCropConfirm = async (area: Area, rotation: number) => {
    setUploading(true);
    try {
      const blob = await getCroppedBlob(cropSrc, area, rotation);
      const file = new File([blob], "image.png", { type: "image/png" });
      closeCrop();
      await doUpload(file);
    } catch {
      // Likely a tainted canvas (remote URL without CORS). Fall back gracefully.
      closeCrop();
      if (pendingFile) {
        notify("Couldn't crop this image — uploading the original.", "warning");
        await doUpload(pendingFile);
      } else {
        notify(
          "Couldn't crop this image (cross-origin). Re-upload it to crop.",
          "warning",
        );
        setUploading(false);
      }
    }
  };

  return (
    <Box>
      {label && (
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {label}
        </Typography>
      )}

      <Box sx={{ position: "relative", width: "100%", maxWidth: 320 }}>
        <ImagePreview url={value} height={200} />
        {value && !uploading && (
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ position: "absolute", top: 8, right: 8 }}
          >
            <Tooltip title="Crop image">
              <IconButton
                size="small"
                onClick={handleRecropExisting}
                sx={{
                  bgcolor: "background.paper",
                  "&:hover": { bgcolor: "background.paper" },
                  boxShadow: 1,
                }}
                aria-label="Crop image"
              >
                <CropIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Remove image">
              <IconButton
                size="small"
                onClick={() => onChange("")}
                sx={{
                  bgcolor: "background.paper",
                  "&:hover": { bgcolor: "background.paper" },
                  boxShadow: 1,
                }}
                aria-label="Remove image"
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
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

      <ImageCropDialog
        open={cropOpen}
        src={cropSrc}
        busy={uploading}
        onCancel={closeCrop}
        onConfirm={handleCropConfirm}
      />
    </Box>
  );
}
