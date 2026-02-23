import type { GlobalConfig } from 'payload'

export const Header: GlobalConfig = {
  slug: 'header',
  label: 'Шапка сайта',
  fields: [
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Логотип',
    },
    {
      name: 'navigation',
      type: 'array',
      label: 'Навигация',
      fields: [
        { name: 'label', type: 'text', required: true, label: 'Название' },
        { name: 'url', type: 'text', required: true, label: 'Ссылка' },
        {
          name: 'children',
          type: 'array',
          label: 'Подменю',
          fields: [
            { name: 'label', type: 'text', required: true, label: 'Название' },
            { name: 'url', type: 'text', required: true, label: 'Ссылка' },
          ],
        },
      ],
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Телефон',
    },
    {
      name: 'searchPlaceholder',
      type: 'text',
      label: 'Плейсхолдер поиска',
      defaultValue: 'Поиск по каталогу...',
    },
  ],
}
