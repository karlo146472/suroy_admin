import { supabase } from './supabase'

const BUCKET = 'destination-images'

/** Only these file types are accepted, matching what the mobile app can show. */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

// Photos are shown in small cards and one banner on a phone, so a large original only slows the app down.
const MAX_DIMENSION = 1200
const JPEG_QUALITY = 0.82
/** A photo already this small (and not too wide) is uploaded as it is. */
const SKIP_BELOW_BYTES = 300 * 1024

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/**
 * Scales a big photo down to at most 1200 px on its longest side and saves it as a JPEG. Small photos, and
 * anything the browser can't process, are returned unchanged, so this can never stop an upload.
 */
async function shrinkImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) {
      bitmap.close()
      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return file
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    // Keep the original if shrinking did not actually make it smaller.
    if (!blob || blob.size >= file.size) return file
    return new File([blob], `${file.name.replace(/\.\w+$/, '')}.jpg`, { type: 'image/jpeg' })
  } catch {
    return file
  }
}

/**
 * Uploads one photo to the public "destination-images" bucket and returns its public URL.
 * Only an administrator is allowed to upload (storage policy in supabase/schema.sql). The file name is random,
 * so a new photo never overwrites an old one and caches can't show a stale picture.
 */
export async function uploadDestinationImage(original: File): Promise<string> {
  const file = await shrinkImage(original)
  const path = `${crypto.randomUUID()}.${EXTENSIONS[file.type] ?? 'jpg'}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
  })
  if (error) throw error

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/**
 * Deletes a photo we uploaded earlier, given its public URL. Best effort: a failure is ignored, because a
 * leftover file is harmless and must not make saving a destination fail. URLs that are not in our bucket are skipped.
 */
export async function removeDestinationImage(url: string | null | undefined): Promise<void> {
  if (!url) return
  const marker = `/${BUCKET}/`
  const index = url.indexOf(marker)
  if (index === -1) return
  const path = decodeURIComponent(url.slice(index + marker.length).split('?')[0])
  await supabase.storage.from(BUCKET).remove([path])
}
