import type { CollectionConfig } from 'payload'

const formatSlug = (val: string): string =>
  val
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: 'Страница',
    plural: 'Страницы',
  },
  admin: {
    useAsTitle: 'title',
    group: 'Контент',
  },
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
      name: 'content',
      type: 'richText',
      label: 'Содержимое',
    },
    {
      name: 'layout',
      type: 'select',
      label: 'Шаблон',
      defaultValue: 'default',
      options: [
        { label: 'Стандартная', value: 'default' },
        { label: 'О компании', value: 'about' },
        { label: 'Контакты', value: 'contacts' },
        { label: 'Доставка и оплата', value: 'delivery' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
