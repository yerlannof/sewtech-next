import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { customerName, customerPhone, customerEmail, comment, items } = body

    if (!customerName || !customerPhone || !items?.length) {
      return NextResponse.json(
        { error: 'Заполните обязательные поля' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config })

    // Generate order number: ST-YYYYMMDD-XXXX
    const now = new Date()
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.floor(1000 + Math.random() * 9000)
    const orderNumber = `ST-${datePart}-${random}`

    const totalAmount = items.reduce(
      (sum: number, item: { price?: number; quantity: number }) =>
        sum + (item.price || 0) * item.quantity,
      0,
    )

    const order = await payload.create({
      collection: 'orders',
      data: {
        orderNumber,
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        comment: comment || undefined,
        items: items.map((item: { productId?: number; productName: string; quantity: number; price?: number }) => ({
          product: item.productId || undefined,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price || undefined,
        })),
        totalAmount: totalAmount || undefined,
        status: 'new',
      },
    })

    return NextResponse.json({ success: true, orderNumber: order.orderNumber })
  } catch (err) {
    console.error('Order creation error:', err)
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 },
    )
  }
}
