import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import sharp from 'sharp'

import { Products } from './collections/Products'
import { Categories } from './collections/Categories'
import { Brands } from './collections/Brands'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Blog } from './collections/Blog'
import { Users } from './collections/Users'
import { Orders } from './collections/Orders'
import { Customers } from './collections/Customers'
import { Header } from './globals/Header'
import { Footer } from './globals/Footer'
import { Settings } from './globals/Settings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — SEWTECH Admin',
    },
  },

  collections: [Products, Categories, Brands, Media, Pages, Blog, Users, Orders, Customers],

  globals: [Header, Footer, Settings],

  editor: lexicalEditor(),

  secret: process.env.PAYLOAD_SECRET || 'default-secret',

  typescript: {
    outputFile: path.resolve(dirname, '../payload-types.ts'),
  },

  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),

  sharp,

  plugins: [
    seoPlugin({
      collections: ['products', 'categories', 'brands', 'pages', 'blog'],
      uploadsCollection: 'media',
      generateTitle: ({ doc }) =>
        `${(doc as Record<string, unknown>).name || (doc as Record<string, unknown>).title || ''} | SEWTECH Алматы`,
      generateDescription: ({ doc }) =>
        ((doc as Record<string, unknown>).shortDescription as string) || '',
    }),
    redirectsPlugin({
      collections: ['products', 'categories', 'pages'],
    }),
    ...(process.env.BLOB_READ_WRITE_TOKEN
      ? [
          vercelBlobStorage({
            collections: {
              media: true,
            },
            token: process.env.BLOB_READ_WRITE_TOKEN,
          }),
        ]
      : []),
  ],
})
