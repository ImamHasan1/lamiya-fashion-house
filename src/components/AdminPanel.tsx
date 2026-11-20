import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  deleteCategory,
  deleteProduct,
  saveCategory,
  saveProduct,
  type ProductDraft,
} from '../data/catalog-api'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Category } from '../types/category'
import type { Product } from '../types/product'

interface AdminPanelProps {
  products: Product[]
  categories: Category[]
  onCatalogChange: () => Promise<void>
  onClose: () => void
}

type ExistingPhoto = { id: string; preview: string; url: string }
type NewPhoto = { id: string; preview: string; file: File }
type EditorPhoto = ExistingPhoto | NewPhoto

function createProductCode() {
  return `MM-${Math.floor(100 + Math.random() * 900)}`
}

function AdminPanel({ products, categories, onCatalogChange, onClose }: AdminPanelProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products')
  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined)
  const [statusMessage, setStatusMessage] = useState('')
  const [operationError, setOperationError] = useState('')

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthError('')
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const isOwner = session?.user.app_metadata.lamiya_admin === true
    || session?.user.app_metadata.lamiya_admin === 'true'
    || session?.user.app_metadata.mamoni_admin === true
    || session?.user.app_metadata.mamoni_admin === 'true'

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    setAuthError('')
    setAuthLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthError(error.message)
      else setPassword('')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not sign in to Supabase.')
    } finally {
      setAuthLoading(false)
    }
  }

  const signOut = async () => {
    if (!supabase) return
    try {
      const { error } = await supabase.auth.signOut()
      if (error) setOperationError(error.message)
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Could not sign out of Supabase.')
    }
  }

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Delete "${product.name}" and its uploaded photos?`)) return
    setOperationError('')
    setStatusMessage('')
    try {
      await deleteProduct(product)
      await onCatalogChange()
      setStatusMessage(`${product.name} was deleted.`)
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Could not delete the product.')
      await onCatalogChange()
    }
  }

  return (
    <div className="admin-panel-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="admin-panel" role="dialog" aria-modal="true" aria-labelledby="admin-title">
        <header className="admin-panel-header">
          <div>
            <p className="eyebrow">Lamiya Fashion House catalogue</p>
            <h2 id="admin-title">Admin panel</h2>
          </div>
          <button className="admin-close" type="button" onClick={onClose} aria-label="Close admin panel">×</button>
        </header>

        {!isSupabaseConfigured ? (
          <div className="admin-setup-message">
            <span className="admin-message-icon" aria-hidden="true">✳</span>
            <h3>Connect Supabase to manage the live catalogue.</h3>
            <p>
              Add your project URL and public anon/publishable key to <code>.env.local</code>,
              then follow the database and owner setup steps in <code>README.md</code>.
              No secret service-role key belongs in this website.
            </p>
          </div>
        ) : authLoading ? (
          <p className="admin-loading" role="status">Checking your owner account…</p>
        ) : !session ? (
          <div className="admin-auth-card">
            <p className="eyebrow">Supabase owner sign-in</p>
            <h3>Sign in to make changes.</h3>
            <p>The prototype gate is not enough to edit products. Use the owner email and password set up in Supabase.</p>
            <form onSubmit={signIn} className="admin-form">
              <label>
                Owner email
                <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>
              <label>
                Supabase password
                <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </label>
              {authError && <p className="admin-form-error" role="alert">{authError}</p>}
              <button className="button button-dark admin-submit" type="submit" disabled={authLoading}>
                {authLoading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        ) : !isOwner ? (
          <div className="admin-setup-message">
            <span className="admin-message-icon" aria-hidden="true">!</span>
            <h3>This Supabase account cannot edit Lamiya Fashion House.</h3>
            <p>Sign in with the owner account marked as an admin in Supabase project setup.</p>
            {authError && <p className="admin-form-error" role="alert">{authError}</p>}
            <button className="admin-secondary-button" type="button" onClick={() => void signOut()}>Sign out</button>
          </div>
        ) : (
          <>
            <div className="admin-toolbar">
              <div className="admin-tabs" role="tablist" aria-label="Admin sections">
                <button type="button" role="tab" aria-selected={activeTab === 'products'} onClick={() => setActiveTab('products')}>
                  Products <span>{products.length}</span>
                </button>
                <button type="button" role="tab" aria-selected={activeTab === 'categories'} onClick={() => setActiveTab('categories')}>
                  Categories <span>{categories.length}</span>
                </button>
              </div>
              <div className="admin-account">
                <span>{session.user.email}</span>
                <button type="button" onClick={() => void signOut()}>Sign out</button>
              </div>
            </div>

            {(statusMessage || operationError) && (
              <p className={operationError ? 'admin-operation-message error' : 'admin-operation-message'} role={operationError ? 'alert' : 'status'}>
                {operationError || statusMessage}
              </p>
            )}

            {activeTab === 'products' ? (
              <section className="admin-content" aria-label="Manage products">
                {editingProduct !== undefined ? (
                  <ProductEditor
                    key={editingProduct?.id ?? 'new'}
                    product={editingProduct}
                    categories={categories}
                    onCancel={() => setEditingProduct(undefined)}
                    onSaved={async () => {
                      await onCatalogChange()
                      setEditingProduct(undefined)
                      setStatusMessage(editingProduct ? 'Product changes saved.' : 'Product added.')
                      setOperationError('')
                    }}
                  />
                ) : (
                  <>
                    <div className="admin-section-heading">
                      <div>
                        <h3>Your products</h3>
                        <p>Add, update, hide, or remove a kamiz from the public catalogue.</p>
                      </div>
                      <button className="admin-primary-button" type="button" onClick={() => {
                        setStatusMessage('')
                        setOperationError('')
                        setEditingProduct(null)
                      }}>+ Add product</button>
                    </div>
                    {products.length === 0 ? (
                      <div className="admin-empty">No products yet. Add the first design to your live catalogue.</div>
                    ) : (
                      <div className="admin-product-list">
                        {products.map((product) => (
                          <article className="admin-product-row" key={product.id}>
                            <div className="admin-product-thumb">
                              {product.images[0] && <img src={product.images[0]} alt="" />}
                            </div>
                            <div className="admin-product-info">
                              <strong>{product.name}</strong>
                              <span>{product.code} · {product.price ? `৳${product.price.amount.toLocaleString('en-BD')}` : 'Price not set'}</span>
                              <small>{product.isVisible ? 'Published' : 'Hidden'}{product.isFeatured ? ' · Featured' : ''}</small>
                            </div>
                            <div className="admin-row-actions">
                              <button type="button" onClick={() => {
                                setStatusMessage('')
                                setOperationError('')
                                setEditingProduct(product)
                              }}>Edit</button>
                              <button className="danger-link" type="button" onClick={() => void handleDeleteProduct(product)}>Delete</button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>
            ) : (
              <CategoryManager
                categories={categories}
                onChanged={onCatalogChange}
                onMessage={(message, error = false) => {
                  setStatusMessage(error ? '' : message)
                  setOperationError(error ? message : '')
                }}
              />
            )}
          </>
        )}
      </section>
    </div>
  )
}

interface ProductEditorProps {
  product: Product | null
  categories: Category[]
  onCancel: () => void
  onSaved: () => Promise<void>
}

function ProductEditor({ product, categories, onCancel, onSaved }: ProductEditorProps) {
  const [name, setName] = useState(product?.name ?? '')
  const [code, setCode] = useState(product?.code ?? createProductCode())
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '')
  const [price, setPrice] = useState(product?.price ? String(product.price.amount) : '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [fabric, setFabric] = useState(product?.fabric ?? '')
  const [colors, setColors] = useState(product?.colors?.join(', ') ?? '')
  const [sizes, setSizes] = useState(product?.sizes?.join(', ') ?? '')
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false)
  const [isVisible, setIsVisible] = useState(product?.isVisible ?? true)
  const [images, setImages] = useState<EditorPhoto[]>(() =>
    product?.images.map((url, index) => ({ id: `${product.id}-photo-${index}`, preview: url, url })) ?? [],
  )
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const closeEditor = () => {
    images.forEach((image) => {
      if ('file' in image) URL.revokeObjectURL(image.preview)
    })
    onCancel()
  }

  const addImages = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.currentTarget.files ?? [])
    const valid: NewPhoto[] = []
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    let validationError = ''

    for (const file of selected) {
      if (!allowedTypes.includes(file.type)) {
        validationError = 'Use JPG, PNG, or WebP photos.'
      } else if (file.size > 10 * 1024 * 1024) {
        validationError = 'Each photo must be 10 MB or smaller.'
      } else {
        valid.push({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) })
      }
    }

    if (valid.length > 0) setImages((current) => [...current, ...valid])
    setFormError(validationError)
    event.currentTarget.value = ''
  }

  const removeImage = (imageId: string) => {
    const removed = images.find((image) => image.id === imageId)
    if (removed && 'file' in removed) URL.revokeObjectURL(removed.preview)
    setImages((current) => current.filter((image) => image.id !== imageId))
  }

  const setMainImage = (imageId: string) => {
    setImages((current) => {
      const selected = current.find((image) => image.id === imageId)
      return selected ? [selected, ...current.filter((image) => image.id !== imageId)] : current
    })
  }

  const submitProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    const parsedPrice = price.trim() === '' ? null : Number(price)

    if (!Number.isFinite(parsedPrice) || (parsedPrice !== null && parsedPrice < 0)) {
      setFormError('Enter a valid non-negative price, or leave it blank.')
      return
    }
    if (images.length === 0) {
      setFormError('Add at least one product photo.')
      return
    }

    const draft: ProductDraft = {
      ...(product ? { id: product.id } : {}),
      name,
      code,
      categoryId: categoryId || null,
      price: parsedPrice,
      description,
      fabric: fabric || null,
      colors: colors.split(',').map((value) => value.trim()).filter(Boolean),
      sizes: sizes.split(',').map((value) => value.trim()).filter(Boolean),
      images: images.map((image) => ('url' in image ? { url: image.url } : { file: image.file })),
      isFeatured,
      isVisible,
    }

    setSaving(true)
    try {
      await saveProduct(draft, product?.images ?? [])
      await onSaved()
      images.forEach((image) => {
        if ('file' in image) URL.revokeObjectURL(image.preview)
      })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save this product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="admin-form product-editor" onSubmit={(event) => void submitProduct(event)}>
      <div className="admin-section-heading editor-heading">
        <div>
          <h3>{product ? 'Edit product' : 'Add a product'}</h3>
          <p>Product details and photos shown on your public catalogue.</p>
        </div>
      </div>
      <div className="admin-form-grid">
        <label>
          Product name *
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />
        </label>
        <label>
          Product code *
          <input value={code} onChange={(event) => setCode(event.target.value)} required maxLength={40} />
        </label>
        <label>
          Category
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">No category</option>
            {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label>
          Price in BDT (optional)
          <input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="e.g. 2500" />
        </label>
        <label className="wide-field">
          Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={2000} />
        </label>
        <label>
          Fabric
          <input value={fabric} onChange={(event) => setFabric(event.target.value)} maxLength={100} placeholder="e.g. Cotton" />
        </label>
        <label>
          Colours <span className="field-hint">Separate with commas</span>
          <input value={colors} onChange={(event) => setColors(event.target.value)} placeholder="Rose, Ivory" />
        </label>
        <label>
          Sizes <span className="field-hint">Separate with commas</span>
          <input value={sizes} onChange={(event) => setSizes(event.target.value)} placeholder="S, M, L, XL" />
        </label>
      </div>

      <div className="admin-image-section">
        <div className="image-section-heading">
          <div>
            <strong>Product photos</strong>
            <p>Choose a main photo; add up to 10 MB JPG, PNG, or WebP files.</p>
          </div>
          <label className="admin-secondary-button upload-button">
            + Upload photos
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addImages} />
          </label>
        </div>
        {images.length > 0 ? (
          <div className="admin-image-list">
            {images.map((image, index) => (
              <div className={`admin-image-tile${index === 0 ? ' main-image' : ''}`} key={image.id}>
                <img src={image.preview} alt={`Product photo ${index + 1} preview`} />
                {index === 0 && <span className="main-image-label">Main photo</span>}
                <div className="admin-image-actions">
                  {index !== 0 && <button type="button" onClick={() => setMainImage(image.id)}>Set as main</button>}
                  <button type="button" className="danger-link" onClick={() => removeImage(image.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-image-empty">No photos added yet.</p>
        )}
      </div>

      <div className="admin-checks">
        <label><input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} /> Feature this design</label>
        <label><input type="checkbox" checked={isVisible} onChange={(event) => setIsVisible(event.target.checked)} /> Publish on the website</label>
      </div>
      {formError && <p className="admin-form-error" role="alert">{formError}</p>}
      <div className="admin-form-actions">
        <button className="admin-secondary-button" type="button" onClick={closeEditor} disabled={saving}>Cancel</button>
        <button className="admin-primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : product ? 'Save changes' : 'Add product'}</button>
      </div>
    </form>
  )
}

interface CategoryManagerProps {
  categories: Category[]
  onChanged: () => Promise<void>
  onMessage: (message: string, error?: boolean) => void
}

function CategoryManager({ categories, onChanged, onMessage }: CategoryManagerProps) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editingName, setEditingName] = useState('')
  const [saving, setSaving] = useState(false)

  const addCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      await saveCategory(newName)
      setNewName('')
      await onChanged()
      onMessage('Category added.')
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Could not add the category.', true)
    } finally {
      setSaving(false)
    }
  }

  const renameCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      await saveCategory(editingName, editingId)
      setEditingId('')
      setEditingName('')
      await onChanged()
      onMessage('Category name updated.')
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Could not rename the category.', true)
    } finally {
      setSaving(false)
    }
  }

  const removeCategory = async (category: Category) => {
    if (!window.confirm(`Delete "${category.name}"? Products in it will remain and have no category.`)) return
    setSaving(true)
    try {
      await deleteCategory(category.id)
      await onChanged()
      onMessage('Category deleted.')
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Could not delete the category.', true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-content category-manager" aria-label="Manage categories">
      <div className="admin-section-heading">
        <div>
          <h3>Your categories</h3>
          <p>Renaming or removing a category never deletes its products.</p>
        </div>
      </div>
      <form className="category-add-form" onSubmit={(event) => void addCategory(event)}>
        <label>
          New category name
          <input value={newName} onChange={(event) => setNewName(event.target.value)} required maxLength={80} placeholder="e.g. Festive wear" />
        </label>
        <button className="admin-primary-button" type="submit" disabled={saving}>Add category</button>
      </form>
      {categories.length === 0 ? (
        <div className="admin-empty">No categories yet. Add one above.</div>
      ) : (
        <div className="admin-category-list">
          {categories.map((category) => (
            <div className="admin-category-row" key={category.id}>
              {editingId === category.id ? (
                <form className="category-rename-form" onSubmit={(event) => void renameCategory(event)}>
                  <input aria-label="Category name" value={editingName} onChange={(event) => setEditingName(event.target.value)} required maxLength={80} />
                  <button type="submit" disabled={saving}>Save</button>
                  <button type="button" onClick={() => setEditingId('')}>Cancel</button>
                </form>
              ) : (
                <>
                  <strong>{category.name}</strong>
                  <div className="admin-row-actions">
                    <button type="button" onClick={() => {
                      setEditingId(category.id)
                      setEditingName(category.name)
                    }}>Rename</button>
                    <button className="danger-link" type="button" disabled={saving} onClick={() => void removeCategory(category)}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default AdminPanel
