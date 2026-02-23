import { getPayload } from 'payload'
import config from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get('ids')
  if (!ids) {
    return NextResponse.json({ error: 'ids parameter required' }, { status: 400 })
  }

  const idList = ids.split(',').map(Number).filter(Boolean)
  if (idList.length === 0 || idList.length > 10) {
    return NextResponse.json({ error: 'Provide 1-10 valid ids' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'products',
    where: { id: { in: idList } },
    depth: 1,
    limit: 10,
  })

  return NextResponse.json({ docs: result.docs })
}
