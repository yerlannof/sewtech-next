import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Пользователь',
    plural: 'Пользователи',
  },
  auth: true,
  admin: {
    useAsTitle: 'name',
    group: 'Система',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Имя',
    },
    {
      name: 'role',
      type: 'select',
      label: 'Роль',
      required: true,
      defaultValue: 'manager',
      options: [
        { label: 'Администратор', value: 'admin' },
        { label: 'Менеджер', value: 'manager' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
