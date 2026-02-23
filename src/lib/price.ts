import { getPayload } from 'payload'
import config from '@payload-config'

export type DisplayCurrency = 'KZT' | 'USD'

export interface CurrencySettings {
  exchangeRate: number
  displayCurrency: DisplayCurrency
}

const DEFAULT_SETTINGS: CurrencySettings = {
  exchangeRate: 470,
  displayCurrency: 'KZT',
}

export async function getCurrencySettings(): Promise<CurrencySettings> {
  try {
    const payload = await getPayload({ config })
    const settings = await payload.findGlobal({ slug: 'settings' })
    const currency = settings.currency as { exchangeRate?: number; displayCurrency?: string } | undefined
    return {
      exchangeRate: currency?.exchangeRate || DEFAULT_SETTINGS.exchangeRate,
      displayCurrency: (currency?.displayCurrency as DisplayCurrency) || DEFAULT_SETTINGS.displayCurrency,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function formatPrice(priceUSD: number, rate: number, currency: DisplayCurrency = 'KZT'): string {
  if (currency === 'USD') {
    return `$${new Intl.NumberFormat('en-US').format(priceUSD)}`
  }
  const kzt = Math.round(priceUSD * rate)
  return `${new Intl.NumberFormat('ru-RU').format(kzt)} \u20B8`
}

export function convertToKZT(priceUSD: number, rate: number): number {
  return Math.round(priceUSD * rate)
}
