import { prisma } from "../db";

/**
 * Save a synthetic crop into `image_crop`.
 *
 * - `id`: full DOM element id (e.g. "label_submit+primary")
 * - `base64`: raw base64 of the cropped image (no data: prefix; tolerated if present)
 * - `ogWidth` / `ogHeight`: original pixel dimensions of the crop (before any resizing)
 *
 * Stores:
 * - image_data = bytes
 * - og_label = suffix after "label_"
 * - og_width = ogWidth
 * - aspect_ratio = ogWidth / ogHeight
 */

// saves a crop with no parent.  an orphan
export async function saveSyntheticCrop({
  label,
  base64,
  ogWidth,
  ogHeight,
}: {
  label: string;
  base64: string;
  ogWidth: number;
  ogHeight: number;
}): Promise<{ id: number }> {
  const imageBuffer = Buffer.from(base64, "base64")

  const aspectRatio = ogHeight > 0 ? ogWidth / ogHeight : 0;

  const created = await prisma.image_crop.create({
    data: {
      image_data: imageBuffer,
      og_label: label,
      og_width: ogWidth,
      aspect_ratio: aspectRatio,
      screenshot_id: null,
      true_id: null,
    },
    select: { id: true },
  });

  return created;
}
