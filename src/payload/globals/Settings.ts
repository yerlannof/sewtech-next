import type { GlobalConfig } from 'payload'

export const Settings: GlobalConfig = {
  slug: 'settings',
  label: 'Настройки сайта',
  fields: [
    {
      name: 'siteName',
      type: 'text',
      label: 'Название сайта',
      defaultValue: 'SEWTECH',
    },
    {
      name: 'siteDescription',
      type: 'textarea',
      label: 'Описание сайта',
    },
    {
      name: 'phones',
      type: 'array',
      label: 'Телефоны',
      fields: [
        {
          name: 'number',
          type: 'text',
          label: 'Номер',
          required: true,
        },
        {
          name: 'label',
          type: 'text',
          label: 'Подпись',
        },
      ],
    },
    {
      name: 'addresses',
      type: 'array',
      label: 'Адреса',
      fields: [
        {
          name: 'city',
          type: 'text',
          label: 'Город',
          required: true,
        },
        {
          name: 'address',
          type: 'text',
          label: 'Адрес',
          required: true,
        },
        {
          name: 'mapUrl',
          type: 'text',
          label: 'Ссылка на карту',
        },
      ],
    },
    {
      name: 'whatsapp',
      type: 'text',
      label: 'WhatsApp номер',
    },
    {
      name: 'yandexMetrikaId',
      type: 'text',
      label: 'ID Яндекс.Метрики',
      admin: {
        description: 'Числовой ID счётчика Яндекс.Метрики',
      },
    },
    {
      name: 'googleAnalyticsId',
      type: 'text',
      label: 'ID Google Analytics',
      admin: {
        description: 'Идентификатор вида G-XXXXXXXXXX',
      },
    },
    {
      name: 'googleVerification',
      type: 'text',
      label: 'Код верификации Google',
      admin: {
        description: 'Значение meta-тега google-site-verification для Search Console',
      },
    },
    {
      name: 'yandexVerification',
      type: 'text',
      label: 'Код верификации Яндекс',
      admin: {
        description: 'Значение meta-тега yandex-verification для Яндекс.Вебмастера',
      },
    },
    {
      name: 'maintenanceMode',
      type: 'checkbox',
      label: 'Режим обслуживания',
      defaultValue: false,
      admin: {
        description: 'Включить заглушку "сайт на обслуживании" для посетителей',
      },
    },
  ],
}
