import type { CollectionAfterReadHook, CollectionConfig } from 'payload'
import blobMap from '../../data/blob-map.json'

// Build lowercase lookup for case-insensitive matching
const blobUrls = blobMap as Record<string, string>
const blobUrlsLower: Record<string, string> = {}
for (const [key, val] of Object.entries(blobUrls)) {
  blobUrlsLower[key.toLowerCase()] = val
}

function getBlobUrl(filename: string | null | undefined): string | undefined {
  if (!filename) return undefined
  return blobUrls[filename] || blobUrlsLower[filename.toLowerCase()]
}

const resolveBlobUrls: CollectionAfterReadHook = ({ doc }) => {
  if (!doc?.filename) return doc

  // Replace main URL
  const mainBlob = getBlobUrl(doc.filename)
  if (mainBlob) {
    doc.url = mainBlob
  }

  // Replace size variant URLs
  if (doc.sizes && typeof doc.sizes === 'object') {
    for (const sizeKey of Object.keys(doc.sizes)) {
      const size = doc.sizes[sizeKey]
      if (size?.filename) {
        const sizeBlob = getBlobUrl(size.filename)
        if (sizeBlob) {
          size.url = sizeBlob
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
