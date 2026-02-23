export interface CartItem {
  productId: number
  name: string
  slug: string
  price: number | null
  imageUrl: string | null
  quantity: number
}

export interface ComparisonItem {
  productId: number
  name: string
  slug: string
  imageUrl: string | null
}

export interface FavoriteItem {
  productId: number
  name: string
  slug: string
  price: number | null
  imageUrl: string | null
}
