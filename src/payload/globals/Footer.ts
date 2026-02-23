import type { GlobalConfig } from 'payload'

export const Footer: GlobalConfig = {
  slug: 'footer',
  label: 'Подвал сайта',
  fields: [
    {
      name: 'companyName',
      type: 'text',
      label: 'Название компании',
      defaultValue: 'SEWTECH',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Описание компании',
    },
    {
      name: 'contactInfo',
      type: 'group',
      label: 'Контактная информация',
      fields: [
        {
          name: 'address',
          type: 'text',
          label: 'Адрес',
        },
        {
          name: 'phone',
          type: 'text',
          label: 'Телефон',
        },
        {
          name: 'email',
          type: 'text',
          label: 'Email',
        },
        {
          name: 'workHours',
          type: 'text',
          label: 'Время работы',
        },
      ],
    },
    {
      name: 'socialLinks',
      type: 'array',
      label: 'Социальные сети',
      fields: [
        {
          name: 'platform',
          type: 'select',
          label: 'Платформа',
          required: true,
          options: [
            { label: 'WhatsApp', value: 'whatsapp' },
            { label: 'Instagram', value: 'instagram' },
            { label: 'Telegram', value: 'telegram' },
            { label: 'YouTube', value: 'youtube' },
          ],
        },
        {
          name: 'url',
          type: 'text',
          label: 'Ссылка',
          required: true,
        },
      ],
    },
    {
      name: 'footerLinks',
      type: 'array',
      label: 'Группы ссылок',
      fields: [
        {
          name: 'group',
          type: 'text',
          label: 'Название группы',
          required: true,
        },
        {
          name: 'links',
          type: 'array',
          label: 'Ссылки',
          fields: [
            { name: 'label', type: 'text', required: true, label: 'Название' },
            { name: 'url', type: 'text', required: true, label: 'Ссылка' },
          ],
        },
      ],
    },
    {
      name: 'copyright',
      type: 'text',
      label: 'Копирайт',
      defaultValue: '© {year} SEWTECH. Все права защищены.',
    },
  ],
}
