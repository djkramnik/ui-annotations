// uploadDirectoryToS3.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';


let s3: S3Client

export const getS3Client = () => {
  if (!s3) {
    s3 = new S3Client({
      // Or rely on env/config: AWS_REGION / AWS_DEFAULT_REGION / shared config
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }
  return s3
}

/**
 * Async generator that yields full file paths recursively under a directory.
 */
async function* walkDir(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

/**
 * Upload all files under localDir to the given S3 bucket.
 *
 * S3 keys are the paths relative to localDir, optionally prefixed.
 *
 * Example:
 *   localDir = /tmp/yolo
 *   prefix   = "yolo"
 *   file     = /tmp/yolo/images/train/img1.png
 *   key      = yolo/images/train/img1.png
 */
export async function uploadDirectoryToS3({
  localDir,
  bucket,
  prefix,
}: {
  localDir: string
  bucket: string
  prefix?: string
}): Promise<void> {
  const s3 = getS3Client()
  const absRoot = path.resolve(localDir);

  // Normalize prefix: strip leading/trailing slashes, allow undefined
  let normalizedPrefix = prefix?.trim() ?? '';
  normalizedPrefix = normalizedPrefix.replace(/^\/+|\/+$/g, ''); // remove leading/trailing /

  for await (const filePath of walkDir(absRoot)) {
    const relativePath = path.relative(absRoot, filePath);
    const relativePosix = relativePath.split(path.sep).join('/'); // ensure forward slashes

    const key = normalizedPrefix
      ? `${normalizedPrefix}/${relativePosix}`
      : relativePosix;

    console.log(`Uploading ${filePath} -> s3://${bucket}/${key}`);

    const bodyStream = createReadStream(filePath);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bodyStream,
    });

    await s3.send(command);
  }
}
