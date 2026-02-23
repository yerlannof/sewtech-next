import type { CollectionConfig } from 'payload'

const formatSlug = (val: string): string =>
  val
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

export const Products: CollectionConfig = {
  slug: 'products',
  labels: {
    singular: 'Товар',
    plural: 'Товары',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'sku', 'brand', 'category', 'price', 'inStock'],
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
      admin: {
        position: 'sidebar',
      },
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
      name: 'sku',
      type: 'text',
      label: 'Артикул (SKU)',
      unique: true,
      index: true,
    },
    {
      name: 'brand',
      type: 'relationship',
      label: 'Бренд',
      relationTo: 'brands',
    },
    {
      name: 'category',
      type: 'relationship',
      label: 'Категория',
      relationTo: 'categories',
    },
    {
      name: 'subcategory',
      type: 'relationship',
      label: 'Подкатегория',
      relationTo: 'categories',
    },
    {
      name: 'price',
      type: 'number',
      label: 'Цена (USD)',
      min: 0,
      admin: {
        description: 'Цена в долларах США. Отображение в тенге — через курс в Настройках сайта.',
      },
    },
    {
      name: 'priceOnRequest',
      type: 'checkbox',
      label: 'Цена по запросу',
      defaultValue: true,
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      label: 'Краткое описание',
    },
    {
      name: 'fullDescription',
      type: 'richText',
      label: 'Полное описание',
    },
    {
      name: 'descriptionHtml',
      type: 'textarea',
      label: 'Описание (HTML)',
      admin: {
        description: 'HTML-описание из OpenCart. Отображается на сайте если fullDescription пустой.',
      },
    },
    {
      name: 'specifications',
      type: 'array',
      label: 'Характеристики',
      labels: {
        singular: 'Характеристика',
        plural: 'Характеристики',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Название',
          required: true,
        },
        {
          name: 'value',
          type: 'text',
          label: 'Значение',
          required: true,
        },
        {
          name: 'unit',
          type: 'text',
          label: 'Ед. измерения',
        },
      ],
    },
    {
      name: 'faq',
      type: 'array',
      label: 'Вопросы и ответы (FAQ)',
      labels: {
        singular: 'Вопрос',
        plural: 'Вопросы',
      },
      fields: [
        {
          name: 'question',
          type: 'text',
          label: 'Вопрос',
          required: true,
        },
        {
          name: 'answer',
          type: 'textarea',
          label: 'Ответ',
          required: true,
        },
      ],
    },
    {
      name: 'errorCodes',
      type: 'array',
      label: 'Коды ошибок',
      labels: {
        singular: 'Код ошибки',
        plural: 'Коды ошибок',
      },
      fields: [
        {
          name: 'code',
          type: 'text',
          label: 'Код',
          required: true,
        },
        {
          name: 'description',
          type: 'text',
          label: 'Описание',
          required: true,
        },
        {
          name: 'solution',
          type: 'textarea',
          label: 'Решение',
        },
      ],
    },
    {
      name: 'images',
      type: 'upload',
      label: 'Изображения',
      relationTo: 'media',
      hasMany: true,
    },
    {
      name: 'documents',
      type: 'upload',
      label: 'Документы (PDF)',
      relationTo: 'media',
      hasMany: true,
    },
    {
      name: 'videos',
      type: 'array',
      label: 'Видео',
      labels: {
        singular: 'Видео',
        plural: 'Видео',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Название',
        },
        {
          name: 'url',
          type: 'text',
          label: 'Ссылка (YouTube/Vimeo)',
          required: true,
        },
      ],
    },
    {
      name: 'inStock',
      type: 'checkbox',
      label: 'В наличии',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'isNew',
      type: 'checkbox',
      label: 'Новинка',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'isFeatured',
      type: 'checkbox',
      label: 'Рекомендуемый',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'machineType',
      type: 'select',
      label: 'Тип машины',
      options: [
        { label: 'Прямострочная', value: 'lockstitch' },
        { label: 'Оверлок', value: 'overlock' },
        { label: 'Распошивальная', value: 'coverstitch' },
        { label: 'Закрепочная', value: 'bartacking' },
        { label: 'Петельная', value: 'buttonhole' },
        { label: 'Пуговичная', value: 'button-sewing' },
        { label: 'Зигзаг', value: 'zigzag' },
        { label: 'Плоскошовная', value: 'flat-seam' },
        { label: 'Колонковая', value: 'post-bed' },
        { label: 'Рукавная', value: 'cylinder-bed' },
        { label: 'Длиннорукавная', value: 'long-arm' },
        { label: 'Автомат', value: 'automatic' },
        { label: 'Сварочная', value: 'welding' },
        { label: 'Раскройная', value: 'cutting' },
        { label: 'Прессовая', value: 'pressing' },
        { label: 'Другое', value: 'other' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'maxSpeed',
      type: 'number',
      label: 'Макс. скорость (ст/мин)',
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'needleCount',
      type: 'number',
      label: 'Количество игл',
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'purpose',
      type: 'select',
      label: 'Назначение',
      options: [
        { label: 'Для одежды (Apparel)', value: 'apparel' },
        { label: 'Для неодежды (Non-apparel)', value: 'non-apparel' },
        { label: 'Бытовая', value: 'household' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'relatedProducts',
      type: 'relationship',
      label: 'Похожие товары',
      relationTo: 'products',
      hasMany: true,
    },
    {
      name: 'accessories',
      type: 'relationship',
      label: 'Аксессуары',
      relationTo: 'products',
      hasMany: true,
    },
    {
      name: 'oldOpencartId',
      type: 'number',
      label: 'ID в OpenCart (миграция)',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'oldSlug',
      type: 'text',
      label: 'Старый URL (редирект)',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
}
