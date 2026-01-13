import { prisma } from "../db";

/**
 * Save a synthetic crop into `interactive`.
**/

// saves a crop with no parent.  an orphan
export async function saveSyntheticRecord({
  label,
  base64,
  meta,
}: {
  label: string;
  base64: string;
  meta?: Record<string, any>
}): Promise<{ id: number }> {
  const imageBuffer = Buffer.from(base64, "base64")

  const created = await prisma.interactive.create({
    data: {
      image_data: imageBuffer,
      label,
      screenshot_id: null,
      true_id: null,
      metadata: meta
    },
    select: { id: true },
  });

  return created;
}
