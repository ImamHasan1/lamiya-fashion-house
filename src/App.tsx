import { useCallback, useEffect, useMemo, useState } from 'react'
import { categories } from './data/categories'
import { products } from './data/products'
import { loadCatalog } from './data/catalog-api'
import AdminPanel from './components/AdminPanel'
import { isSupabaseConfigured } from './lib/supabase'
import type { Product } from './types/product'
import './App.css'

function App() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(
    isSupabaseConfigured ? [] : products,
  )
  const [catalogCategories, setCatalogCategories] = useState(
    isSupabaseConfigured ? [] : categories,
  )
  const [catalogLoading, setCatalogLoading] = useState(isSupabaseConfigured)
  const [catalogError, setCatalogError] = useState('')
  const [adminPanelOpen, setAdminPanelOpen] = useState(false)

  const refreshCatalog = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setCatalogProducts(products)
      setCatalogCategories(categories)
      setCatalogLoading(false)
      return
    }

    setCatalogLoading(true)
    setCatalogError('')
    try {
      const catalog = await loadCatalog()
      setCatalogProducts(catalog.products)
      setCatalogCategories(catalog.categories)
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Could not load the catalog.')
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let active = true

    void loadCatalog().then((catalog) => {
      if (!active) return
      setCatalogProducts(catalog.products)
      setCatalogCategories(catalog.categories)
    }).catch((error: unknown) => {
      if (active) {
        setCatalogError(error instanceof Error ? error.message : 'Could not load the catalog.')
      }
    }).finally(() => {
      if (active) setCatalogLoading(false)
    })

    return () => {
      active = false
    }
  }, [])

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()

    return catalogProducts.filter((product) => {
      const matchesCategory =
        activeCategory === 'all' || product.categoryId === activeCategory
      const matchesSearch =
        !query ||
        `${product.name} ${product.code} ${product.description} ${product.fabric ?? ''}`
          .toLocaleLowerCase()
          .includes(query)

      return product.isVisible && matchesCategory && matchesSearch
    })
  }, [activeCategory, catalogProducts, search])

  useEffect(() => {
    if (!selectedProduct) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedProduct(null)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [selectedProduct])

  const openProduct = (product: Product) => {
    setSelectedImage(0)
    setSelectedProduct(product)
  }

  const featuredProducts = catalogProducts.filter(
    (product) => product.isVisible && product.isFeatured,
  )

  return (
    <>
      <div className="announcement">
        <span>Thoughtfully stitched, made to feel like you</span>
      </div>

      <header className="site-header">
        <a className="brand" href="#home" aria-label="Lamiya Fashion House home">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span className="brand-copy">
            <strong>Lamiya</strong>
            <small>Fashion House</small>
          </span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#collection">The collection</a>
          <a href="#story">Our story</a>
        </nav>
        <a className="header-link" href="#contact">
          Get in touch <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main id="home">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span /> A little tradition, a lot of you</p>
            <h1 id="hero-title">Everyday grace,<br /><em>beautifully</em> stitched.</h1>
            <p className="hero-description">
              Discover thoughtfully made kamiz for all the ways you show up —
              from slow mornings to special evenings.
            </p>
            <a className="button button-dark" href="#collection">
              Explore the collection <span aria-hidden="true">↘</span>
            </a>
            <div className="hero-note">
              <span className="note-rule" />
              <span>Made for you, here in Bangladesh</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-visual-frame" aria-label="The Lamiya collection">
              <span className="hero-visual-kicker">The Lamiya collection</span>
              <strong>Kamiz,<br /><em>beautifully</em><br />yours.</strong>
              <span className="hero-visual-note">Cut with care · Worn with ease</span>
            </div>
            <div className="hero-stamp" aria-hidden="true">
              <span>MADE WITH</span>
              <b>♥</b>
              <span>CARE</span>
            </div>
          </div>
          <div className="hero-side-label" aria-hidden="true">THE LAMIYA EDIT — 2026</div>
        </section>

        <section className="collection section-wrap" id="collection" aria-labelledby="collection-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">A wardrobe with a little more meaning</p>
              <h2 id="collection-title">Made to be <em>worn</em>.</h2>
            </div>
            <p className="section-intro">
              Find a favourite in our collection of stitched kamiz, chosen for
              their lovely details and easy elegance.
            </p>
          </div>

          <div className="collection-tools">
            <div className="category-list" role="group" aria-label="Filter by category">
              <button
                className={activeCategory === 'all' ? 'category-chip active' : 'category-chip'}
                type="button"
                onClick={() => setActiveCategory('all')}
                aria-pressed={activeCategory === 'all'}
              >
                All pieces
              </button>
              {catalogCategories.map((category) => (
                <button
                  className={activeCategory === category.id ? 'category-chip active' : 'category-chip'}
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  aria-pressed={activeCategory === category.id}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <label className="search-field">
              <span className="search-icon" aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Find a design"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search designs"
              />
            </label>
          </div>

          {catalogError && (
            <div className="catalog-notice" role="alert">
              Could not load the live catalog: {catalogError}
            </div>
          )}
          {catalogLoading ? (
            <p className="catalog-loading" role="status">Loading the collection…</p>
          ) : visibleProducts.length > 0 ? (
            <div className="product-grid">
              {visibleProducts.map((product, index) => {
                const category = catalogCategories.find((item) => item.id === product.categoryId)

                return (
                  <article className={`product-card card-${index % 4}`} key={product.id}>
                    <button
                      className={`product-image-button${product.images.length === 0 ? ' no-product-image' : ''}`}
                      type="button"
                      onClick={() => openProduct(product)}
                      aria-label={`View details for ${product.name}`}
                    >
                      {product.images[0] ? (
                        <img src={product.images[0]} alt={product.imageAlt} loading="lazy" />
                      ) : (
                        <span className="product-text-placeholder" aria-hidden="true">
                          <span>LFH</span>
                          <strong>{product.name}</strong>
                          <small>{category?.name ?? 'Kamiz'}</small>
                        </span>
                      )}
                      {product.isFeatured && <span className="product-badge">A favourite</span>}
                      <span className="image-arrow" aria-hidden="true">↗</span>
                    </button>
                    <div className="product-meta">
                      <div>
                        <p className="product-category">{category?.name ?? 'Kamiz'}</p>
                        <h3>{product.name}</h3>
                      </div>
                      {product.price && (
                        <span className="product-price">
                          ৳{product.price.amount.toLocaleString('en-BD')}
                        </span>
                      )}
                    </div>
                    <button className="details-link" type="button" onClick={() => openProduct(product)}>
                      View details <span aria-hidden="true">→</span>
                    </button>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">✳</span>
              <h3>No designs found just yet.</h3>
              <p>Try another search or browse all of our pieces.</p>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setSearch('')
                  setActiveCategory('all')
                }}
              >
                Show all pieces →
              </button>
            </div>
          )}
          <p className="collection-footnote">A small collection, made with a lot of love.</p>
        </section>

        <section className="featured-strip" aria-labelledby="featured-title">
          {featuredProducts[0]?.images[0] ? (
            <div className="featured-photo">
              <img
                src={featuredProducts[0].images[1] ?? featuredProducts[0].images[0]}
                alt={featuredProducts[0].imageAlt}
                loading="lazy"
              />
              <span className="photo-caption">{featuredProducts[0].name}</span>
            </div>
          ) : (
            <div className="featured-photo featured-photo-text" aria-label="Featured collection statement">
              <span className="featured-monogram" aria-hidden="true">L</span>
              <span className="featured-editorial">Soft cloth.<br />Considered detail.<br /><em>Everyday elegance.</em></span>
              <span className="photo-caption">THE LAMIYA EDIT</span>
            </div>
          )}
          <div className="featured-copy">
            <p className="eyebrow">The little things matter</p>
            <h2 id="featured-title">Made with care.<br /><em>Made for real life.</em></h2>
            <p>
              Soft fabrics, considered details and silhouettes you can make
              your own. Each piece is selected with everyday comfort in mind.
            </p>
            <a className="text-button" href="#collection">
              Find your favourite <span aria-hidden="true">→</span>
            </a>
            <span className="featured-flower" aria-hidden="true">✳</span>
          </div>
        </section>

        <section className="story section-wrap" id="story">
          <p className="eyebrow">A small family business</p>
          <h2>Clothes with a little <em>heart</em>.</h2>
          <p>
            Lamiya Fashion House is a family-run clothing business sharing stitched kamiz
            chosen with care. We believe getting dressed should feel easy,
            personal and a little special.
          </p>
        </section>
      </main>

      <footer className="site-footer" id="contact">
        <a className="brand footer-brand" href="#home" aria-label="Lamiya Fashion House home">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span className="brand-copy">
            <strong>Lamiya</strong>
            <small>Fashion House</small>
          </span>
        </a>
        <p>Beautiful kamiz, thoughtfully chosen.</p>
        <a className="footer-contact" href="mailto:hello@lamiyafashionhouse.com">
          Say hello <span aria-hidden="true">↗</span>
        </a>
        <span className="copyright">© 2026 Lamiya Fashion House. Made with care in Bangladesh.</span>
        <button
          className="footer-admin"
          type="button"
          onClick={() => setAdminPanelOpen(true)}
        >
          Admin
        </button>
      </footer>

      {adminPanelOpen && (
        <AdminPanel
          products={catalogProducts}
          categories={catalogCategories}
          onCatalogChange={refreshCatalog}
          onClose={() => setAdminPanelOpen(false)}
        />
      )}

      {selectedProduct && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedProduct(null)
          }}
        >
          <section className="product-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <button
              className="dialog-close"
              type="button"
              autoFocus
              onClick={() => setSelectedProduct(null)}
              aria-label="Close product details"
            >
              ×
            </button>
            <div className="dialog-gallery">
              {selectedProduct.images[selectedImage] ? (
                <img
                  className="dialog-main-image"
                  src={selectedProduct.images[selectedImage]}
                  alt={selectedProduct.imageAlt}
                />
              ) : (
                <div className="dialog-image-placeholder" role="img" aria-label="No product photo uploaded">
                  <span>LFH</span>
                  <strong>{selectedProduct.name}</strong>
                  <small>Photo coming soon</small>
                </div>
              )}
              {selectedProduct.images.length > 1 && (
                <div className="thumbnail-list" aria-label="More product photos">
                  {selectedProduct.images.map((image, index) => (
                    <button
                      className={selectedImage === index ? 'thumbnail selected' : 'thumbnail'}
                      key={image}
                      type="button"
                      onClick={() => setSelectedImage(index)}
                      aria-label={`View product photo ${index + 1}`}
                      aria-pressed={selectedImage === index}
                    >
                      <img src={image} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="dialog-copy">
              <p className="eyebrow">{catalogCategories.find((item) => item.id === selectedProduct.categoryId)?.name ?? 'Kamiz'}</p>
              <h2 id="dialog-title">{selectedProduct.name}</h2>
              <p className="product-code">DESIGN {selectedProduct.code}</p>
              {selectedProduct.price && (
                <p className="dialog-price">৳{selectedProduct.price.amount.toLocaleString('en-BD')}</p>
              )}
              <p className="dialog-description">{selectedProduct.description}</p>
              <dl className="product-specs">
                {selectedProduct.fabric && (
                  <div><dt>Fabric</dt><dd>{selectedProduct.fabric}</dd></div>
                )}
                {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                  <div><dt>Colours</dt><dd>{selectedProduct.colors.join(', ')}</dd></div>
                )}
                {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                  <div><dt>Sizes</dt><dd>{selectedProduct.sizes.join(', ')}</dd></div>
                )}
              </dl>
              <p className="contact-note">
                Interested in this design? <a href="#contact" onClick={() => setSelectedProduct(null)}>Get in touch with us.</a>
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

export default App
