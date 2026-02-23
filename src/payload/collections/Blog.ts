import type { CollectionConfig } from 'payload'

const formatSlug = (val: string): string =>
  val
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

export const Blog: CollectionConfig = {
  slug: 'blog',
  labels: {
    singular: 'Статья',
    plural: 'Блог',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'publishedAt'],
    group: 'Контент',
  },
  defaultSort: '-publishedAt',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Заголовок',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      label: 'URL (slug)',
      unique: true,
      index: true,
      hooks: {
        beforeValidate: [
          ({ value, siblingData }) => {
            if (!value && siblingData?.title) {
              return formatSlug(siblingData.title as string)
            }
            return value
          },
        ],
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      label: 'Анонс',
    },
    {
      name: 'content',
      type: 'richText',
      label: 'Содержимое',
    },
    {
      name: 'coverImage',
      type: 'upload',
      label: 'Обложка',
      relationTo: 'media',
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Дата публикации',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'dd.MM.yyyy',
        },
      },
    },
    {
      name: 'author',
      type: 'relationship',
      label: 'Автор',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
