import type { Media } from '@/payload-types'

/**
 * Get the best available image URL for a media object.
 * On Vercel, URLs go through /api/media/file/ which middleware redirects to blob storage.
 * Locally, URLs point to local files.
 */
export function getImageUrl(media: Media | null | undefined): string | null {
  if (!media) return null
  return media.sizes?.thumbnail?.url || media.url || null
}

/**
 * Get the full-size image URL for product detail pages.
 */
export function getFullImageUrl(media: Media | null | undefined): string | null {
  if (!media) return null
  return media.sizes?.card?.url || media.url || null
}
