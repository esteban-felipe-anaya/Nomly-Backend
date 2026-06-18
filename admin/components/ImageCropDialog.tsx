"use client";

import RotateRightIcon from "@mui/icons-material/RotateRight";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

interface AspectOption {
  label: string;
  value: number | undefined;
}

const ASPECTS: AspectOption[] = [
  { label: "Free", value: undefined },
  { label: "1:1", value: 1 },
  { label: "16:9", value: 16 / 9 },
  { label: "4:3", value: 4 / 3 },
];

interface ImageCropDialogProps {
  open: boolean;
  /** Object URL or remote media URL to crop. */
  src: string;
  onCancel: () => void;
  /** Receives the final crop pixel area + rotation so the caller can render it. */
  onConfirm: (area: Area, rotation: number) => void;
  busy?: boolean;
}

/**
 * MUI dialog wrapping react-easy-crop: draggable crop, zoom slider, rotate, and
 * an aspect-ratio selector. Emits the cropped pixel area so the caller can
 * render it to a canvas (see lib/cropImage).
 */
export default function ImageCropDialog({
  open,
  src,
  onCancel,
  onConfirm,
  busy = false,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  const handleConfirm = () => {
    if (areaPixels) onConfirm(areaPixels, rotation);
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Crop image</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: 320,
            bgcolor: "action.hover",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
            />
          )}
        </Box>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={aspect ?? "free"}
          onChange={(_, v) => {
            if (v === null) return;
            setAspect(v === "free" ? undefined : (v as number));
          }}
          sx={{ mt: 2, flexWrap: "wrap" }}
        >
          {ASPECTS.map((a) => (
            <ToggleButton key={a.label} value={a.value ?? "free"}>
              {a.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Stack spacing={1} sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Zoom
          </Typography>
          <Slider
            value={zoom}
            min={1}
            max={3}
            step={0.01}
            onChange={(_, v) => setZoom(v as number)}
            aria-label="Zoom"
          />
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
          <Tooltip title="Rotate 90°">
            <IconButton
              onClick={() => setRotation((r) => (r + 90) % 360)}
              aria-label="Rotate 90 degrees"
            >
              <RotateRightIcon />
            </IconButton>
          </Tooltip>
          <Box sx={{ flex: 1 }}>
            <Slider
              value={rotation}
              min={0}
              max={360}
              step={1}
              onChange={(_, v) => setRotation(v as number)}
              aria-label="Rotation"
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={busy || !areaPixels}
        >
          {busy ? "Uploading…" : "Apply & upload"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
