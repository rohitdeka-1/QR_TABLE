import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'qr-restaurant';
const PUBLIC_URL_BASE = process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://your-bucket.r2.cloudflarestorage.com';

/**
 * Upload a file to Cloudflare R2
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} fileName - Original file name
 * @param {string} folder - Folder path (e.g., 'categories', 'menu-items')
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export async function uploadToR2(fileBuffer, fileName, folder, mimeType) {
  const timestamp = Date.now();
  const fileKey = `${folder}/${timestamp}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  try {
    await s3Client.send(command);
    const publicUrl = `${PUBLIC_URL_BASE}/${fileKey}`;
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw new Error('Failed to upload file to Cloudflare R2');
  }
}

/**
 * Delete a file from Cloudflare R2
 * @param {string} fileKey - The S3 key of the file to delete
 * @returns {Promise<void>}
 */
export async function deleteFromR2(fileKey) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  try {
    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting from R2:', error);
    throw new Error('Failed to delete file from Cloudflare R2');
  }
}

/**
 * Extract file key from a public URL
 * @param {string} publicUrl - Public URL of the file
 * @returns {string} File key
 */
export function extractFileKeyFromUrl(publicUrl) {
  if (!publicUrl) return null;
  const baseUrl = PUBLIC_URL_BASE + '/';
  if (publicUrl.startsWith(baseUrl)) {
    return publicUrl.slice(baseUrl.length);
  }
  return null;
}
