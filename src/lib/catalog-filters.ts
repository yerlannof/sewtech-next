import type { Where } from 'payload'

export interface CatalogFilters {
  brand?: number[]
  machineType?: string[]
  purpose?: string[]
  priceMin?: number
  priceMax?: number
  inStock?: boolean
  isNew?: boolean
  isFeatured?: boolean
  speedMin?: number
  speedMax?: number
  needleCount?: number[]
}

export function parseFilters(searchParams: Record<string, string | undefined>): CatalogFilters {
  const filters: CatalogFilters = {}

  if (searchParams.brand) {
    filters.brand = searchParams.brand.split(',').map(Number).filter(Boolean)
  }

  if (searchParams.type) {
    filters.machineType = searchParams.type.split(',').filter(Boolean)
  }

  if (searchParams.purpose) {
    filters.purpose = searchParams.purpose.split(',').filter(Boolean)
  }

  if (searchParams.priceMin) {
    const val = parseInt(searchParams.priceMin)
    if (!isNaN(val)) filters.priceMin = val
  }

  if (searchParams.priceMax) {
    const val = parseInt(searchParams.priceMax)
    if (!isNaN(val)) filters.priceMax = val
  }

  if (searchParams.inStock === '1') {
    filters.inStock = true
  }

  if (searchParams.isNew === '1') {
    filters.isNew = true
  }

  if (searchParams.isFeatured === '1') {
    filters.isFeatured = true
  }

  if (searchParams.speedMin) {
    const val = parseInt(searchParams.speedMin)
    if (!isNaN(val)) filters.speedMin = val
  }

  if (searchParams.speedMax) {
    const val = parseInt(searchParams.speedMax)
    if (!isNaN(val)) filters.speedMax = val
  }

  if (searchParams.needles) {
    filters.needleCount = searchParams.needles.split(',').map(Number).filter(Boolean)
  }

  return filters
}

export function buildPayloadWhere(
  baseWhere: Where,
  filters: CatalogFilters,
): Where {
  const conditions: Where[] = [baseWhere]

  if (filters.brand && filters.brand.length > 0) {
    conditions.push({ brand: { in: filters.brand } })
  }

  if (filters.machineType && filters.machineType.length > 0) {
    conditions.push({ machineType: { in: filters.machineType } })
  }

  if (filters.purpose && filters.purpose.length > 0) {
    conditions.push({ purpose: { in: filters.purpose } })
  }

  if (filters.priceMin) {
    conditions.push({ price: { greater_than_equal: filters.priceMin } })
  }

  if (filters.priceMax) {
    conditions.push({ price: { less_than_equal: filters.priceMax } })
  }

  if (filters.inStock) {
    conditions.push({ inStock: { equals: true } })
  }

  if (filters.isNew) {
    conditions.push({ isNew: { equals: true } })
  }

  if (filters.isFeatured) {
    conditions.push({ isFeatured: { equals: true } })
  }

  if (filters.speedMin) {
    conditions.push({ maxSpeed: { greater_than_equal: filters.speedMin } })
  }

  if (filters.speedMax) {
    conditions.push({ maxSpeed: { less_than_equal: filters.speedMax } })
  }

  if (filters.needleCount && filters.needleCount.length > 0) {
    conditions.push({ needleCount: { in: filters.needleCount } })
  }

  if (conditions.length === 1) return baseWhere

  return { and: conditions }
}

export function buildFilterUrl(
  basePath: string,
  filters: CatalogFilters,
  sort?: string,
): string {
  const params = new URLSearchParams()

  if (filters.brand?.length) params.set('brand', filters.brand.join(','))
  if (filters.machineType?.length) params.set('type', filters.machineType.join(','))
  if (filters.purpose?.length) params.set('purpose', filters.purpose.join(','))
  if (filters.priceMin) params.set('priceMin', String(filters.priceMin))
  if (filters.priceMax) params.set('priceMax', String(filters.priceMax))
  if (filters.inStock) params.set('inStock', '1')
  if (filters.isNew) params.set('isNew', '1')
  if (filters.isFeatured) params.set('isFeatured', '1')
  if (filters.speedMin) params.set('speedMin', String(filters.speedMin))
  if (filters.speedMax) params.set('speedMax', String(filters.speedMax))
  if (filters.needleCount?.length) params.set('needles', filters.needleCount.join(','))
  if (sort && sort !== 'name') params.set('sort', sort)

  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

export const MACHINE_TYPE_LABELS: Record<string, string> = {
  lockstitch: 'Прямострочные',
  overlock: 'Оверлоки',
  coverstitch: 'Распошивальные',
  bartacking: 'Закрепочные',
  buttonhole: 'Петельные',
  'button-sewing': 'Пуговичные',
  zigzag: 'Зигзаг',
  'flat-seam': 'Плоскошовные',
  'post-bed': 'Колонковые',
  'cylinder-bed': 'Рукавные',
  'long-arm': 'Длиннорукавные',
  automatic: 'Автоматы',
  welding: 'Сварочные',
  cutting: 'Раскройные',
  pressing: 'Прессы',
  other: 'Прочие',
}

export const PURPOSE_LABELS: Record<string, string> = {
  apparel: 'Для одежды',
  'non-apparel': 'Для неодежды',
  household: 'Бытовые',
}
