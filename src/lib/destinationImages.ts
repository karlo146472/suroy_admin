import { supabase } from './supabase'

const BUCKET = 'destination-images'

/** Only these file types are accepted, matching what the mobile app can show. */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/**
 * Uploads one photo to the public "destination-images" bucket and returns its public URL.
 * Only an administrator is allowed to upload (storage policy in supabase/schema.sql). The file name is random,
 * so a new photo never overwrites an old one and caches can't show a stale picture.
 */
export async function uploadDestinationImage(file: File): Promise<string> {
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
