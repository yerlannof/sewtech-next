import type { CollectionConfig } from 'payload'

const formatSlug = (val: string): string =>
  val
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

export const Brands: CollectionConfig = {
  slug: 'brands',
  labels: {
    singular: 'Бренд',
    plural: 'Бренды',
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
      name: 'logo',
      type: 'upload',
      label: 'Логотип',
      relationTo: 'media',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Описание',
    },
    {
      name: 'website',
      type: 'text',
      label: 'Сайт производителя',
    },
    {
      name: 'country',
      type: 'text',
      label: 'Страна',
    },
    {
      name: 'isOfficialDistributor',
      type: 'checkbox',
      label: 'Официальный дистрибьютор',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
