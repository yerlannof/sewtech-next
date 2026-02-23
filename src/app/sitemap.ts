import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config })

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/catalog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contacts`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/delivery`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/brands`, changeFrequency: 'monthly', priority: 0.6 },
  ]

  // Products
  const products = await payload.find({
    collection: 'products',
    limit: 0, // Get count
  })
  const allProducts = await payload.find({
    collection: 'products',
    limit: products.totalDocs,
    sort: 'name',
  })
  const productPages: MetadataRoute.Sitemap = allProducts.docs.map((p) => ({
    url: `${BASE_URL}/product/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Categories
  const parentCats = await payload.find({
    collection: 'categories',
    where: { parent: { exists: false }, showInMegaMenu: { equals: true } },
    limit: 100,
  })
  const allCats = await payload.find({
    collection: 'categories',
    limit: 200,
  })

  const categoryPages: MetadataRoute.Sitemap = []
  for (const parent of parentCats.docs) {
    categoryPages.push({
      url: `${BASE_URL}/catalog/${parent.slug}`,
      changeFrequency: 'weekly',
      priority: 0.7,
    })
    const children = allCats.docs.filter((c) => {
      const p = c.parent
      return typeof p === 'number' ? p === parent.id : (p as any)?.id === parent.id
    })
    for (const child of children) {
      categoryPages.push({
        url: `${BASE_URL}/catalog/${parent.slug}/${child.slug}`,
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
  }

  return [...staticPages, ...categoryPages, ...productPages]
}
