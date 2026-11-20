export interface Product {
  id: string
  name: string
  code: string
  categoryId: string | null
  price?: {
    amount: number
    currency: 'BDT'
  }
  description: string
  fabric?: string
  colors?: string[]
  sizes?: string[]
  images: string[]
  imageAlt: string
  isFeatured: boolean
  isVisible: boolean
  createdAt: string
}
