/**
 * Upload a file directly to S3 using a backend-generated presigned URL.
 * The Content-Type header must match exactly what was specified when the presigned URL was created.
 */
export async function uploadViaPresignedUrl(presignedUrl: string, file: File): Promise<void> {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!response.ok) {
    throw new Error(`S3 upload failed: ${response.status}`);
  }
}
