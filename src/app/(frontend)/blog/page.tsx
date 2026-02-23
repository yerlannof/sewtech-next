import Link from 'next/link'
import Image from 'next/image'
import { getPayload } from 'payload'
import config from '@payload-config'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { Metadata } from 'next'
import type { Media } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Блог — SEWTECH',
  description:
    'Статьи о промышленных швейных машинах, советы по выбору оборудования, обзоры новинок JUKI.',
  alternates: { canonical: '/blog' },
}

export default async function BlogPage() {
  const payload = await getPayload({ config })

  const posts = await payload.find({
    collection: 'blog',
    sort: '-publishedAt',
    limit: 20,
    depth: 1,
  })

  return (
    <div className="container mx-auto px-4 py-6">
      <Breadcrumbs items={[{ label: 'Блог' }]} />

      <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-8">Блог</h1>

      {posts.docs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-2">Статьи скоро появятся</p>
          <p className="text-gray-400 text-sm">Мы готовим полезные материалы о промышленном швейном оборудовании.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.docs.map((post) => {
            const cover = typeof post.coverImage === 'object' ? (post.coverImage as Media) : null
            const coverUrl = cover?.sizes?.card?.url || cover?.url
            const date = post.publishedAt
              ? new Date(post.publishedAt).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : null

            return (
              <article
                key={post.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                {coverUrl && (
                  <div className="aspect-video relative bg-gray-100">
                    <Image
                      src={coverUrl}
                      alt={cover?.alt || post.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                )}
                <div className="p-5">
                  {date && (
                    <p className="text-xs text-gray-400 mb-2">{date}</p>
                  )}
                  <h2 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-[#1B4F72] transition-colors">
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-gray-500 line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-block mt-3 text-sm text-[#1B4F72] font-medium hover:underline"
                  >
                    Читать далее
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
