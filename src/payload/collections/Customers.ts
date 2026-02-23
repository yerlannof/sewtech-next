import type { CollectionConfig } from 'payload'

export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: {
    singular: 'Клиент',
    plural: 'Клиенты',
  },
  auth: true,
  admin: {
    useAsTitle: 'name',
    group: 'Продажи',
    defaultColumns: ['name', 'email', 'phone', 'city', 'createdAt'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Имя',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Телефон',
    },
    {
      name: 'city',
      type: 'text',
      label: 'Город',
    },
    {
      name: 'company',
      type: 'text',
      label: 'Компания',
    },
  ],
}
