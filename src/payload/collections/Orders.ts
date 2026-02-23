import type { CollectionConfig } from 'payload'

export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: {
    singular: 'Заказ',
    plural: 'Заказы',
  },
  admin: {
    useAsTitle: 'orderNumber',
    group: 'Продажи',
    defaultColumns: ['orderNumber', 'customerName', 'customerPhone', 'status', 'createdAt'],
  },
  fields: [
    {
      name: 'orderNumber',
      type: 'text',
      label: 'Номер заказа',
      required: true,
      unique: true,
      admin: { readOnly: true },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'customerName',
          type: 'text',
          label: 'Имя клиента',
          required: true,
        },
        {
          name: 'customerPhone',
          type: 'text',
          label: 'Телефон',
          required: true,
        },
      ],
    },
    {
      name: 'customerEmail',
      type: 'email',
      label: 'Email',
    },
    {
      name: 'comment',
      type: 'textarea',
      label: 'Комментарий',
    },
    {
      name: 'items',
      type: 'array',
      label: 'Товары',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          label: 'Товар',
        },
        {
          name: 'productName',
          type: 'text',
          label: 'Название товара',
          required: true,
        },
        {
          name: 'quantity',
          type: 'number',
          label: 'Кол-во',
          required: true,
          min: 1,
          defaultValue: 1,
        },
        {
          name: 'price',
          type: 'number',
          label: 'Цена (KZT)',
        },
      ],
    },
    {
      name: 'totalAmount',
      type: 'number',
      label: 'Сумма (KZT)',
      admin: { readOnly: true },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Статус',
      defaultValue: 'new',
      options: [
        { label: 'Новый', value: 'new' },
        { label: 'В обработке', value: 'processing' },
        { label: 'Завершен', value: 'completed' },
        { label: 'Отменен', value: 'cancelled' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'customer',
      type: 'relationship',
      label: 'Клиент',
      relationTo: 'customers',
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
