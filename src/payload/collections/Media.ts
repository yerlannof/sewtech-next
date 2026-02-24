import type { CollectionAfterReadHook, CollectionConfig } from 'payload'
import { existsSync } from 'fs'
import { resolve } from 'path'

// Only use blob fallback if media files are not on disk
// Once Railway volume is populated, this hook does nothing
let blobUrls: Record<string, string> = {}
let blobUrlsLower: Record<string, string> = {}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const blobMap = require('../../data/blob-map.json')
  blobUrls = blobMap as Record<string, string>
  for (const [key, val] of Object.entries(blobUrls)) {
    blobUrlsLower[key.toLowerCase()] = val as string
  }
} catch {
  // blob-map.json not found — media is served from disk
}

function getBlobUrl(filename: string | null | undefined): string | undefined {
  if (!filename) return undefined
  return blobUrls[filename] || blobUrlsLower[filename.toLowerCase()]
}

const resolveBlobUrls: CollectionAfterReadHook = ({ doc }) => {
  if (!doc?.filename) return doc

  // If the file exists on disk, Payload serves it natively — skip blob lookup
  const mediaPath = resolve(process.cwd(), 'media', doc.filename)
  if (existsSync(mediaPath)) return doc

  // File not on disk — try blob URL fallback
  const mainBlob = getBlobUrl(doc.filename)
  if (mainBlob) {
    doc.url = mainBlob
  }

  if (doc.sizes && typeof doc.sizes === 'object') {
    for (const sizeKey of Object.keys(doc.sizes)) {
      const size = doc.sizes[sizeKey]
      if (size?.filename) {
        const sizePath = resolve(process.cwd(), 'media', size.filename)
        if (!existsSync(sizePath)) {
          const sizeBlob = getBlobUrl(size.filename)
          if (sizeBlob) {
            size.url = sizeBlob
          }
        }
      }
    }
  }

  return doc
}

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'Медиафайл',
    plural: 'Медиафайлы',
  },
  access: {
    read: () => true,
  },
  admin: {
    group: 'Контент',
  },
  hooks: {
    afterRead: [resolveBlobUrls],
  },
  upload: {
    staticDir: 'media',
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
      },
      {
        name: 'card',
        width: 768,
        height: undefined,
        position: 'centre',
      },
      {
        name: 'feature',
        width: 1920,
        height: undefined,
        position: 'centre',
      },
    ],
    mimeTypes: ['image/*', 'application/pdf'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Альтернативный текст',
    },
  ],
}
