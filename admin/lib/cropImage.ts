import type { Area } from "react-easy-crop";

/** Loads an image element, requesting CORS access so a remote source can be drawn to a canvas. */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (e) => reject(e));
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

/**
 * Renders the selected crop (with optional rotation) of `imageSrc` to a canvas
 * and returns it as a PNG Blob. Throws if the source image taints the canvas
 * (e.g. a remote URL without CORS headers), which the caller can fall back from.
 */
export async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
): Promise<Blob> {
  const image = await createImage(imageSrc);

  const rotRad = (rotation * Math.PI) / 180;

  // Bounding box of the rotated image, used to size a scratch canvas.
  const bBoxWidth =
    Math.abs(Math.cos(rotRad) * image.width) +
    Math.abs(Math.sin(rotRad) * image.height);
  const bBoxHeight =
    Math.abs(Math.sin(rotRad) * image.width) +
    Math.abs(Math.cos(rotRad) * image.height);

  const scratch = document.createElement("canvas");
  scratch.width = bBoxWidth;
  scratch.height = bBoxHeight;
  const scratchCtx = scratch.getContext("2d");
  if (!scratchCtx) throw new Error("Canvas context unavailable");

  scratchCtx.translate(bBoxWidth / 2, bBoxHeight / 2);
  scratchCtx.rotate(rotRad);
  scratchCtx.translate(-image.width / 2, -image.height / 2);
  scratchCtx.drawImage(image, 0, 0);

  // Extract just the cropped region into the output canvas.
  const out = document.createElement("canvas");
  out.width = Math.round(pixelCrop.width);
  out.height = Math.round(pixelCrop.height);
  const outCtx = out.getContext("2d");
  if (!outCtx) throw new Error("Canvas context unavailable");

  outCtx.drawImage(
    scratch,
    Math.round(pixelCrop.x),
    Math.round(pixelCrop.y),
    Math.round(pixelCrop.width),
    Math.round(pixelCrop.height),
    0,
    0,
    Math.round(pixelCrop.width),
    Math.round(pixelCrop.height),
  );

  return new Promise((resolve, reject) => {
    out.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to render crop"));
    }, "image/png");
  });
}
