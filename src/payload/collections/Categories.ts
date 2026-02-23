import type { CollectionConfig } from 'payload'

const formatSlug = (val: string): string =>
  val
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: {
    singular: 'Категория',
    plural: 'Категории',
  },
  admin: {
    useAsTitle: 'name',
    group: 'Каталог',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Название',
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
            if (!value && siblingData?.name) {
              return formatSlug(siblingData.name as string)
            }
            return value
          },
        ],
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      label: 'Родительская категория',
      relationTo: 'categories',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Описание',
    },
    {
      name: 'image',
      type: 'upload',
      label: 'Изображение',
      relationTo: 'media',
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Порядок сортировки',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'showInMegaMenu',
      type: 'checkbox',
      label: 'Показывать в мега-меню',
      defaultValue: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'icon',
      type: 'text',
      label: 'Иконка (emoji или CSS class)',
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
