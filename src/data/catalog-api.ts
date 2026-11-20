import type { Category } from '../types/category'
import type { Product } from '../types/product'
import { requireSupabase, type CategoryRow, type ProductRow } from '../lib/supabase'

const imageBucket = 'product-images'

export interface ProductImageDraft {
  url?: string
  file?: File
}

export interface ProductDraft {
  id?: string
  name: string
  code: string
  categoryId: string | null
  price: number | null
  description: string
  fabric: string | null
  colors: string[]
  sizes: string[]
  images: ProductImageDraft[]
  isFeatured: boolean
  isVisible: boolean
}

export interface Catalog {
  products: Product[]
  categories: Category[]
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    categoryId: row.category_id,
    price: row.price === null ? undefined : { amount: row.price, currency: 'BDT' },
    description: row.description,
    fabric: row.fabric ?? undefined,
    colors: row.colors,
    sizes: row.sizes,
    images: row.images,
    imageAlt: row.image_alt,
    isFeatured: row.is_featured,
    isVisible: row.is_visible,
    createdAt: row.created_at,
  }
}

function mapCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name }
}

export async function loadCatalog(): Promise<Catalog> {
  const client = requireSupabase()
  const [productsResult, categoriesResult] = await Promise.all([
    client.from('products').select('*').order('created_at', { ascending: false }),
    client.from('categories').select('*').order('name'),
  ])

  if (productsResult.error) throw productsResult.error
  if (categoriesResult.error) throw categoriesResult.error

  return {
    products: productsResult.data.map(mapProduct),
    categories: categoriesResult.data.map(mapCategory),
  }
}

function getStoragePath(publicUrl: string): string | null {
  const url = new URL(publicUrl)
  const marker = `/storage/v1/object/public/${imageBucket}/`
  const pathStart = url.pathname.indexOf(marker)
  return pathStart < 0
    ? null
    : decodeURIComponent(url.pathname.slice(pathStart + marker.length))
}

async function removeStoragePaths(paths: string[]) {
  if (paths.length === 0) return null
  const { error } = await requireSupabase().storage.from(imageBucket).remove(paths)
  return error
}

async function uploadProductImages(images: ProductImageDraft[]) {
  const client = requireSupabase()
  const urls: string[] = []
  const uploadedPaths: string[] = []

  for (const image of images) {
    if (image.url) {
      urls.push(image.url)
      continue
    }
    if (!image.file) {
      throw new Error('A product photo is missing its upload file.')
    }

    const extension = image.file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `products/${crypto.randomUUID()}.${extension}`
    const { error } = await client.storage.from(imageBucket).upload(path, image.file, {
      cacheControl: '3600',
      contentType: image.file.type,
      upsert: false,
    })

    if (error) {
      const cleanupError = await removeStoragePaths(uploadedPaths)
      if (cleanupError) {
        throw new Error(`${error.message} Uploaded photos could not be cleaned up: ${cleanupError.message}`)
      }
      throw error
    }

    uploadedPaths.push(path)
    urls.push(client.storage.from(imageBucket).getPublicUrl(path).data.publicUrl)
  }

  return { urls, uploadedPaths }
}

export async function saveProduct(draft: ProductDraft, previousImages: string[] = []) {
  const client = requireSupabase()
  const { urls, uploadedPaths } = await uploadProductImages(draft.images)
  const row = {
    name: draft.name.trim(),
    code: draft.code.trim(),
    category_id: draft.categoryId,
    price: draft.price,
    description: draft.description.trim(),
    fabric: draft.fabric?.trim() || null,
    colors: draft.colors,
    sizes: draft.sizes,
    images: urls,
    image_alt: `${draft.name.trim()} stitched kamiz`,
    is_featured: draft.isFeatured,
    is_visible: draft.isVisible,
  }

  const result = draft.id
    ? await client.from('products').update(row).eq('id', draft.id)
    : await client.from('products').insert(row)

  if (result.error) {
    const cleanupError = await removeStoragePaths(uploadedPaths)
    if (cleanupError) {
      throw new Error(`${result.error.message} Uploaded photos could not be cleaned up: ${cleanupError.message}`)
    }
    throw result.error
  }

  const retainedUrls = new Set(urls)
  const removedPaths = previousImages
    .filter((url) => !retainedUrls.has(url))
    .map(getStoragePath)
    .filter((path): path is string => path !== null)
  const cleanupError = await removeStoragePaths(removedPaths)
  if (cleanupError) {
    throw new Error(`Product saved, but an old photo could not be removed: ${cleanupError.message}`)
  }
}

export async function deleteProduct(product: Product) {
  const { error } = await requireSupabase().from('products').delete().eq('id', product.id)
  if (error) throw error

  const paths = product.images
    .map(getStoragePath)
    .filter((path): path is string => path !== null)
  const cleanupError = await removeStoragePaths(paths)
  if (cleanupError) {
    throw new Error(`Product deleted, but its photos could not be removed: ${cleanupError.message}`)
  }
}

export async function saveCategory(name: string, categoryId?: string) {
  const client = requireSupabase()
  const result = categoryId
    ? await client.from('categories').update({ name: name.trim() }).eq('id', categoryId)
    : await client.from('categories').insert({ name: name.trim() })
  if (result.error) throw result.error
}

export async function deleteCategory(categoryId: string) {
  const { error } = await requireSupabase().from('categories').delete().eq('id', categoryId)
  if (error) throw error
}
