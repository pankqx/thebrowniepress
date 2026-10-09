import { sniffImageType } from '../lib/validation'

export const MAX_UPLOAD_MB = 15

/**
 * Validates the REAL file type from its bytes (not its name or reported MIME), then resizes and re-encodes to WebP.
 * Re-encoding also removes EXIF metadata such as GPS location.
 */
export async function prepareImage(file: File, maxDim: number): Promise<Blob> {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`“${file.name}” is larger than ${MAX_UPLOAD_MB} MB.`)
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (!sniffImageType(head)) throw new Error(`“${file.name}” isn’t a JPEG, PNG or WebP photo.`)
  let bmp: ImageBitmap
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch { throw new Error(`“${file.name}” couldn’t be read as an image.`) }
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale))
  const h = Math.max(1, Math.round(bmp.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser can’t process images.')
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.82))
  if (!blob || blob.type !== 'image/webp') {
    const jpg: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.84))
    if (!jpg) throw new Error('Couldn’t compress the image.')
    return checkSize(jpg)
  }
  return checkSize(blob)
}
const checkSize = (b: Blob) => { if (b.size > 5 * 1024 * 1024) throw new Error('The compressed image is still over 5 MB. Please use a smaller photo.'); return b }
