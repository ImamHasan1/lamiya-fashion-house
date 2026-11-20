export type CategoryRow = {
  id: string
  name: string
  created_at: string
}

export type ProductRow = {
  id: string
  name: string
  code: string
  category_id: string | null
  price: number | null
  description: string
  fabric: string | null
  colors: string[]
  sizes: string[]
  images: string[]
  image_alt: string
  is_featured: boolean
  is_visible: boolean
  created_at: string
}

type Table<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

type CategoryInsert = Omit<CategoryRow, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}

type ProductInsert = Omit<ProductRow, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}

export interface Database {
  public: {
    Tables: {
      categories: Table<CategoryRow, CategoryInsert, Partial<CategoryInsert>>
      products: Table<ProductRow, ProductInsert, Partial<ProductInsert>>
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
