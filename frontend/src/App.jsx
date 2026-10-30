import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AuthPage from './AuthPage.jsx'
import { getSession, signOut, subscribeToAuth } from './supabaseAuth.js'
import './VoiceSearch.css'
import './App.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const money = value => `₹${Number(value).toLocaleString('en-IN')}`

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const productId = location.pathname.match(/^\/products\/([^/]+)$/)?.[1]
  const view = productId ? 'product' : ({ '/': 'shop', '/search': 'shop', '/compare': 'compare', '/cart': 'cart', '/wishlist': 'wishlist', '/recommendations': 'recommendations', '/accessibility': 'accessibility', '/login': 'login', '/signup': 'signup', '/account': 'account' }[location.pathname] || 'notFound')
  const [products, setProducts] = useState([])
  const [catalog, setCatalog] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All products')
  const [sort, setSort] = useState('featured')
  const [minRating, setMinRating] = useState(0)
  const [maxPrice, setMaxPrice] = useState(20000)
  const [detail, setDetail] = useState(null)
  const [productNotFoundId, setProductNotFoundId] = useState(null)
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('accesscart-cart') || localStorage.getItem('vw-cart') || '{}'))
  const [wishlist, setWishlist] = useState(() => JSON.parse(localStorage.getItem('accesscart-wishlist') || localStorage.getItem('vw-wishlist') || '[]'))
  const [compare, setCompare] = useState(() => JSON.parse(localStorage.getItem('accesscart-compare') || '[]'))
  const [textScale, setTextScale] = useState(1)
  const [contrast, setContrast] = useState(false)
  const [accessOpen, setAccessOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [reading, setReading] = useState(false)
  const [speechPaused, setSpeechPaused] = useState(false)
  const [recommendation, setRecommendation] = useState(null)
  const [preference, setPreference] = useState('best-value')
  const [error, setError] = useState('')
  const [comparisonProducts, setComparisonProducts] = useState([])
  const [authSession, setAuthSession] = useState(null)
  const authUser = authSession?.user || null

  useEffect(() => { localStorage.setItem('accesscart-cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem('accesscart-wishlist', JSON.stringify(wishlist)) }, [wishlist])
  useEffect(() => { localStorage.setItem('accesscart-compare', JSON.stringify(compare)) }, [compare])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [location.pathname])
  useEffect(() => { fetch(`${API}/products`).then(r => r.json()).then(setCatalog).catch(() => {}) }, [])
  useEffect(() => {
    const unsubscribe = subscribeToAuth(setAuthSession)
    getSession().then(setAuthSession).catch(() => setAuthSession(null))
    return unsubscribe
  }, [])
  useEffect(() => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (category !== 'All products') params.set('category', category)
    if (sort !== 'featured') params.set('sort', sort)
    fetch(`${API}/products?${params}`).then(r => { if (!r.ok) throw new Error('Could not load products'); return r.json() }).then(setProducts).catch(() => setError('Can’t reach the shop right now. Start the backend with npm run dev in the server folder.'))
  }, [query, category, sort])
  useEffect(() => {
    if (!productId) return
    let active = true
    fetch(`${API}/products/${productId}`).then(r => { if (!r.ok) throw new Error('Product not found'); return r.json() }).then(product => { if (active) {setDetail(product);setProductNotFoundId(null)} }).catch(() => { if (active) { const cached=catalog.find(p => p.id === productId); setDetail(cached || null); setProductNotFoundId(cached?null:productId) } })
    return () => { active = false }
  }, [productId, catalog])
  useEffect(() => {
    if (view !== 'compare' || !compare.length) return
    let active = true
    fetch(`${API}/compare?ids=${compare.join(',')}`).then(r => { if (!r.ok) throw new Error(); return r.json() }).then(data => { if (active) setComparisonProducts(data) }).catch(() => { if (active) setError('Could not load the comparison. Please check the API.') })
    return () => { active = false }
  }, [view, compare])

  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0)
  const cartItems = Object.entries(cart).map(([id, qty]) => ({ product: catalog.find(p => p.id === id), qty })).filter(item => item.product)
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.qty, 0)
  const categories = ['All products', ...new Set(catalog.map(p => p.category))]
  const visibleProducts = products.filter(product => product.rating >= minRating && product.price <= maxPrice)
  const routeProduct = detail?.id === productId ? detail : null
  const selectedComparisonProducts = comparisonProducts.filter(product => compare.includes(product.id))

  function addToCart(product) { setCart(old => ({ ...old, [product.id]: (old[product.id] || 0) + 1 })) }
  function changeQty(id, delta) { setCart(old => { const next = { ...old, [id]: (old[id] || 0) + delta }; if (next[id] <= 0) delete next[id]; return next }) }
  function toggleWish(id) { setWishlist(old => old.includes(id) ? old.filter(item => item !== id) : [...old, id]) }
  function toggleCompare(id) { setCompare(old => old.includes(id) ? old.filter(item => item !== id) : old.length < 3 ? [...old, id] : old) }
  function startVoice() {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Speech) { setError('Voice search is not supported in this browser. Type in the search box instead.'); return }
    const recognition = new Speech(); recognition.lang = 'en-IN'; recognition.interimResults = false
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => { setListening(false); setError('Microphone access was unavailable. You can still type your search.') }
    recognition.onresult = event => { setQuery(event.results[0][0].transcript); navigate('/search') }
    recognition.start()
  }
  function speak(text) {
    if (!('speechSynthesis' in window)) { setError('Read aloud is not supported in this browser.'); return }
    if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); setReading(false); setSpeechPaused(false); return }
    const utterance = new SpeechSynthesisUtterance(text); utterance.rate = 0.95; utterance.onend = () => {setReading(false);setSpeechPaused(false)}; utterance.onerror = () => {setReading(false);setSpeechPaused(false)}; setReading(true); setSpeechPaused(false); window.speechSynthesis.speak(utterance)
  }
  function togglePause() { if (!reading) return; if (window.speechSynthesis.paused) {window.speechSynthesis.resume();setSpeechPaused(false)} else {window.speechSynthesis.pause();setSpeechPaused(true)} }
  function stopReading() { window.speechSynthesis?.cancel(); setReading(false); setSpeechPaused(false) }
  function openDetail(product) {
    setDetail(product)
    navigate(`/products/${product.id}`)
  }
  async function getRecommendation() {
    try { const response = await fetch(`${API}/recommend`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: catalog.map(p => p.id), preference }) }); if (!response.ok) throw new Error(); setRecommendation(await response.json()) }
    catch { setError('Could not prepare a recommendation. Please check that the API is running.') }
  }
  async function openCompare() {
    navigate('/compare')
  }
  return <div className={`app accesscart-shell ${contrast ? 'high-contrast' : ''} ${textScale > 1 ? 'large-text' : ''}`} style={{ zoom: textScale }}>
    <header className="topbar">
      <button className="brand" onClick={() => { setCategory('All products'); setQuery(''); navigate('/') }} aria-label="AccessCart home"><span className="brand-mark">A</span><span>AccessCart<small>SHOP SMARTER. SHOP ACCESSIBLY.</small></span></button>
      <button className="delivery-location" onClick={() => setError('This demo uses local sample products; delivery location is not connected.')}><span>⌖</span><span><small>Delivering to</small><b>Choose your location</b></span></button>
      <form className="search" onSubmit={e => { e.preventDefault(); navigate('/search') }}><select aria-label="Search category" value={category} onChange={e=>{setCategory(e.target.value);navigate('/search')}}>{categories.map(item=><option key={item}>{item}</option>)}</select><input aria-label="Search products" value={query} onChange={e => { setQuery(e.target.value); navigate('/search') }} placeholder="Search AccessCart"/><button className={`mic ${listening ? 'is-listening' : ''}`} type="button" onClick={startVoice} title="Search products by voice on any page" aria-label={listening ? 'Listening for a product search' : 'Search products by voice'}>{listening?'Listening…':'🎙 Voice search'}</button><button className="search-submit" aria-label="Search">⌕</button></form>
      <div className="header-actions"><span className="language-label">🇮🇳 EN</span><button onClick={() => navigate(authUser ? '/account' : '/login')} className="account-button"><small>Hello, {authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'shopper'}</small><b>{authUser ? 'Your account' : 'Sign in / Join'}</b></button><button onClick={() => setAccessOpen(open=>!open)} className="icon-button accessibility-button" aria-label="Open accessibility quick settings" aria-expanded={accessOpen}>◐ <span>Access</span></button><button onClick={() => navigate('/cart')} className="icon-button cart-button" aria-label={`Cart, ${cartCount} items`}>🛒<span>Cart</span>{cartCount > 0 && <b className="count">{cartCount}</b>}</button></div>
    </header>
    {accessOpen&&<section className="access-panel" aria-label="Accessibility quick settings"><div className="access-panel-heading"><div><b>Accessibility quick settings</b><span>Adjust the page from anywhere.</span></div><button className="close-small" onClick={()=>setAccessOpen(false)} aria-label="Close accessibility settings">×</button></div><div className="access-text-control"><div><b>Text size</b><span>{Math.round(textScale*100)}%</span></div><div><button onClick={()=>setTextScale(scale=>Math.max(1,+(scale-.15).toFixed(2)))} disabled={textScale<=1} aria-label="Decrease text size">A−</button><button onClick={()=>setTextScale(scale=>Math.min(1.3,+(scale+.15).toFixed(2)))} disabled={textScale>=1.3} aria-label="Increase text size">A+</button></div></div><button className="contrast-toggle" aria-pressed={contrast} onClick={()=>setContrast(value=>!value)}><span>High contrast</span><b>{contrast?'On':'Off'}</b></button><button className="access-more" onClick={()=>{setAccessOpen(false);navigate('/accessibility')}}>More accessibility options <span>→</span></button></section>}
    <nav className="category-nav" aria-label="Shop navigation"><button className="nav-all" onClick={()=>{setCategory('All products');navigate('/')}}>☰ All</button><button onClick={()=>{setSort('rating');setCategory('All products');navigate('/search')}}>Top rated</button>{categories.filter(item=>item!=='All products').map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => { setCategory(item); navigate('/search') }}>{item}</button>)}<button onClick={()=>navigate('/wishlist')}>Saved</button><button onClick={openCompare}>Compare {compare.length > 0 && <b>{compare.length}</b>}</button><button onClick={()=>navigate('/accessibility')}>AccessCart accessibility</button><button onClick={()=>navigate('/recommendations')}>Recommendations</button></nav>

    {(view === 'shop' || view === 'wishlist') && <main className="results-layout">
      <aside className="filter-sidebar"><div className="filter-heading"><b>Filters</b><button onClick={()=>{setCategory('All products');setQuery('');setMinRating(0);setMaxPrice(20000)}}>Clear all</button></div>
        <section className="filter-group"><h3>Department</h3>{categories.map(item=><button key={item} className={`filter-category ${category===item?'chosen':''}`} onClick={()=>{setCategory(item);if(view!=='wishlist')navigate('/search')}}>{item}</button>)}</section>
        <section className="filter-group"><h3>Price</h3><label className="price-filter">Up to <b>₹{maxPrice.toLocaleString('en-IN')}</b><input aria-label="Maximum price" type="range" min="1000" max="20000" step="500" value={maxPrice} onChange={e=>setMaxPrice(Number(e.target.value))}/></label><div className="range-labels"><span>₹1,000</span><span>₹20,000+</span></div></section>
        <section className="filter-group"><h3>Customer review</h3>{[4,3,2,1].map(value=><button key={value} className={`rating-filter ${minRating===value?'chosen':''}`} onClick={()=>setMinRating(minRating===value?0:value)}><span>{Array.from({length:5},(_,index)=><i key={index} className={index<value?'lit':''}>★</i>)}</span><b>&amp; up</b></button>)}</section>
        <section className="filter-group"><h3>AccessCart picks</h3><button className="filter-category" onClick={()=>navigate('/recommendations')}>✳ Find best overall value</button><button className="filter-category" onClick={()=>navigate('/accessibility')}>◐ Accessibility options</button></section>
      </aside>
      <section className="results-content"><div className="results-banner"><div><span>ACCESSCART · SHOP WITH CLARITY</span><b>More than a price tag. A better way to choose.</b></div><button onClick={()=>{setPreference('best-value');getRecommendation()}}>Get a recommendation <b>→</b></button></div>
        <div className="results-toolbar"><div><h1>{view==='wishlist'?'Saved items':query?`Results for “${query}”`:category==='All products'?'Discover products':category}</h1><span>{(view==='wishlist'?catalog.filter(p=>wishlist.includes(p.id)):visibleProducts).length} results</span></div><label>Sort by: <select value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="rating">Customer rating</option></select></label></div>
        <div className="listing-product-grid">{(view==='wishlist'?catalog.filter(p=>wishlist.includes(p.id)):visibleProducts).map(p=><ProductCard key={p.id} product={p} onOpen={openDetail} onAdd={addToCart} compared={compare.includes(p.id)} onCompare={toggleCompare} wished={wishlist.includes(p.id)} onWish={toggleWish}/>)}</div>
        {(view==='wishlist'?catalog.filter(p=>wishlist.includes(p.id)):visibleProducts).length===0&&!error&&<div className="empty-state">{view==='wishlist'?'No saved items yet.':'No products match these filters.'}<button onClick={()=>{navigate('/search');setCategory('All products');setQuery('');setMinRating(0);setMaxPrice(20000)}}>Clear filters</button></div>}
      </section>
    </main>}

    {view === 'compare' && <main className="compare-page"><button className="back-link" onClick={()=>navigate('/search')}>← Back to finds</button><div className="eyebrow">SIDE BY SIDE, NICE AND CLEAR</div><h1>Make a choice <em>that feels right.</em></h1><p className="compare-disclaimer">A quick look at the things that matter. Sample review insights are illustrative, not verified customer feedback.</p>{selectedComparisonProducts.length===0?<div className="empty-state">Choose products to compare from the catalog. Your comparison selection is saved on this device.<button onClick={()=>navigate('/search')}>Browse products →</button></div>:<div className="compare-scroll"><table className="compare-table"><thead><tr><th scope="col" className="compare-label">Compare</th>{selectedComparisonProducts.map(p=><th scope="col" className="compare-product" key={p.id}><div className="compare-product-card"><img src={p.image} alt=""/><b>{p.name}</b><div className="price">{money(p.price)}</div><button className="button primary" onClick={()=>addToCart(p)}>Add to bag</button></div></th>)}</tr></thead><tbody>{[['Rating',p=>`★ ${p.rating} / 5`],['Warranty',p=>`${p.warranty} months`],['Features',p=>p.features.join(' · ')],['Value score',p=>`${p.insights?.score ?? '—'} / 100`],['What people like',p=>p.insights?.positive?.map(x=>x.theme).join(', ') || 'No sample review insights'],['What to consider',p=>p.insights?.negative?.map(x=>x.theme).join(', ') || 'No recurring concern in sample reviews']].map(([label,get])=><tr key={label}><th scope="row" className="compare-row-label">{label}</th>{selectedComparisonProducts.map(p=><td key={p.id}>{get(p)}</td>)}</tr>)}</tbody></table></div>}<div className="compare-recommend"><div><span className="eyebrow">A LITTLE HELP DECIDING</span><h2>What matters <em>most?</em></h2></div><select value={preference} onChange={e=>setPreference(e.target.value)}><option value="best-value">Best overall value</option><option value="lowest-price">Lowest price</option><option value="best-features">Best features</option><option value="best-warranty">Best warranty</option></select><button className="button primary" onClick={async()=>{try{const r=await fetch(`${API}/recommend`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:selectedComparisonProducts.map(p=>p.id),preference})});if(!r.ok)throw new Error();setRecommendation(await r.json())}catch{setError('Could not prepare the recommendation.')}}}>Recommend ↗</button>{recommendation&&<div className="recommendation-result"><b>{recommendation.product.name}</b><span>{recommendation.reason}</span></div>}</div></main>}

    {view==='recommendations'&&<main className="route-page recommendation-page"><button className="back-link" onClick={()=>navigate('/search')}>← Back to products</button><div className="eyebrow">YOUR PRIORITIES, YOUR PICK</div><h1>What matters <em>most to you?</em></h1><p>Choose a priority and AccessCart will recommend a product from the sample catalog with a clear reason.</p><div className="recommendation-controls"><label htmlFor="recommendation-priority">Your priority</label><select id="recommendation-priority" value={preference} onChange={e=>{setPreference(e.target.value);setRecommendation(null)}}><option value="best-value">Best overall value</option><option value="lowest-price">Lowest price</option><option value="best-features">Best features</option><option value="best-warranty">Best warranty</option></select><button className="button primary" onClick={getRecommendation}>Find my match ↗</button></div>{recommendation&&<article className="recommendation-card"><div className="eyebrow">RECOMMENDED FOR YOU</div><h2>{recommendation.product.name}</h2><div className="recommendation-price">{money(recommendation.product.price)} · ★ {recommendation.product.rating}</div><p>{recommendation.reason}</p><button className="button primary" onClick={()=>openDetail(recommendation.product)}>View product details →</button></article>}</main>}
    {view==='accessibility'&&<main className="route-page accessibility-page"><button className="back-link" onClick={()=>navigate('/')}>← Back to store</button><div className="eyebrow">ACCESSCART ACCESSIBILITY</div><h1>Make shopping <em>work for you.</em></h1><p>Adjust the interface or choose an assistive feature. These settings apply while you browse this session.</p><div className="accessibility-options"><section><div><h2>Text size</h2><p>Current size: {Math.round(textScale*100)}%. Increase or decrease the whole interface.</p></div><div className="access-route-size"><button className="button secondary" onClick={()=>setTextScale(scale=>Math.max(1,+(scale-.15).toFixed(2)))} disabled={textScale<=1} aria-label="Decrease text size">A− Smaller</button><button className="button secondary" onClick={()=>setTextScale(scale=>Math.min(1.3,+(scale+.15).toFixed(2)))} disabled={textScale>=1.3} aria-label="Increase text size">A+ Larger</button></div></section><section><div><h2>Contrast</h2><p>Use stronger text and surface contrast.</p></div><button className="button secondary" aria-pressed={contrast} onClick={()=>setContrast(value=>!value)}>{contrast?'High contrast is on':'Enable high contrast'}</button></section><section><div><h2>Read aloud</h2><p>Listen to a short introduction to AccessCart.</p></div><div className="read-controls"><button className="read-button" onClick={()=>speak('Welcome to AccessCart. Search products, compare your choices, and use the accessibility settings that work for you.')}>🔊 Read introduction</button>{reading&&<><button onClick={togglePause}>{speechPaused?'▶ Resume':'Ⅱ Pause'}</button><button onClick={stopReading}>■ Stop</button></>}</div></section><section><div><h2>Voice search</h2><p>Use the “Voice search” button beside the site-wide search bar from any page. Browser speech-recognition support and microphone permission are required.</p></div><button className="button secondary" onClick={startVoice}>{listening?'Listening…':'◉ Start voice search'}</button></section></div><div className="accessibility-note">Keyboard users can navigate with Tab and Enter. Voice search is optional; typed search is always available.</div></main>}
    {(view==='login'||view==='signup'||view==='account')&&<AuthPage mode={view==='signup'?'signup':'login'} user={authUser} onAuthenticated={setAuthSession} onSignOut={async()=>{try{await signOut()}catch{setAuthSession(null);setError('Could not reach Supabase to sign out. Please try again.')}}}/>}
    {view==='notFound'&&<main className="route-page"><div className="eyebrow">PAGE NOT FOUND</div><h1>That page isn’t here.</h1><p>Try the store catalog or use the navigation above.</p><button className="button primary" onClick={()=>navigate('/')}>Go to the store</button></main>}

    <footer className="footer"><div className="footer-brand"><span className="brand-mark">A</span><span>AccessCart<small>SHOP SMARTER. SHOP ACCESSIBLY.</small></span></div><span>Smarter shopping, made more accessible. <b>✳</b></span><span>© 2026 AccessCart <i>·</i> Product and review data are samples.</span></footer>
    {compare.length>0 && <button className="compare-floating" onClick={openCompare}>⇄ Compare {compare.length} {compare.length===1?'item':'items'} <span>→</span></button>}
    {view==='cart'&&<main className="route-page cart-route"><button className="back-link" onClick={()=>navigate('/search')}>← Continue shopping</button><div className="route-heading"><div className="eyebrow">YOUR EVERYDAY PICKS</div><h1>Your bag <em>({cartCount})</em></h1></div>{cartItems.length===0?<div className="empty-state">Your bag’s waiting for something good.<button onClick={()=>navigate('/search')}>Explore products →</button></div>:<div className="cart-page-layout"><section className="cart-items">{cartItems.map(({product,qty})=><div className="cart-item" key={product.id}><img src={product.image} alt={product.name}/><div className="cart-info"><b>{product.name}</b><span>{money(product.price)}</span><div className="quantity"><button onClick={()=>changeQty(product.id,-1)} aria-label="Decrease quantity">−</button><span>{qty}</span><button onClick={()=>changeQty(product.id,1)} aria-label="Increase quantity">+</button></div></div><button className="remove" onClick={()=>setCart(old=>{const next={...old};delete next[product.id];return next})}>Remove</button></div>)}</section><aside className="cart-summary"><h2>Order summary</h2><div className="subtotal"><span>Subtotal ({cartCount} items)</span><b>{money(subtotal)}</b></div><small>Shipping and taxes calculated at checkout.</small><button className="button primary checkout" onClick={()=>setError('Checkout is a demo. No payment will be collected.')}>Continue to checkout ↗</button><div className="demo-note">Demo checkout · no payment collected</div></aside></div>}</main>}

    {view==='product'&&<main className="route-page product-route"><button className="back-link" onClick={()=>navigate('/search')}>← Back to products</button>{productNotFoundId===productId?<div className="empty-state">We couldn’t find that product.<button onClick={()=>navigate('/')}>Browse products →</button></div>:!routeProduct?<div className="empty-state">Loading product details…</div>:<section className="detail-modal route-detail"><div className="detail-image"><img src={routeProduct.image} alt={routeProduct.name}/>{routeProduct.tag&&<span className="product-tag">{routeProduct.tag}</span>}</div><div className="detail-content"><div className="eyebrow">{routeProduct.category} · ACCESSCART PICK</div><h1>{routeProduct.name}</h1><div className="detail-rating">★★★★★ <b>{routeProduct.rating}</b> <span>({routeProduct.reviewsCount} sample ratings)</span></div><div className="detail-price">{money(routeProduct.price)} <small>· {routeProduct.warranty} month warranty</small></div><p>{routeProduct.description}</p><button className="simple-toggle" onClick={()=>setDetail({...routeProduct, showSimple:!routeProduct.showSimple})}>◉ {routeProduct.showSimple?'Hide':'Show'} in simpler language</button>{routeProduct.showSimple&&<p className="simple-copy">{routeProduct.simple}</p>}<div className="read-controls"><button className="read-button" onClick={()=>speak(`${routeProduct.name}. ${routeProduct.description}. Review insight: ${routeProduct.insights?.positive?.map(x=>x.theme).join(', ')||'No recurring positive themes'}.`)}>🔊 Read description & insights</button>{reading&&<><button onClick={togglePause}>{speechPaused?'▶ Resume':'Ⅱ Pause'}</button><button onClick={stopReading}>■ Stop</button></>}</div><div className="feature-list"><b>Thoughtful details</b>{routeProduct.features.map(f=><span key={f}>✓ {f}</span>)}</div>{routeProduct.insights&&<div className="insight-box"><div className="insight-title"><b>What sample reviews mention</b><span>{routeProduct.insights.sampleReviewCount} sample reviews</span></div><div><small>LOVED</small><span>{routeProduct.insights.positive?.map(x=>x.theme).join(' · ')||'No recurring theme yet'}</span></div><div><small>TO CONSIDER</small><span>{routeProduct.insights.negative?.map(x=>x.theme).join(' · ')||'No recurring concern in sample reviews'}</span></div><div className="score-summary"><b>Value Score <strong>{routeProduct.insights.score}/100</strong></b><div className="score-components"><span>Review quality <b>{routeProduct.insights.reviewQuality}/100 · 30%</b></span><span>Feature suitability <b>{routeProduct.insights.featureSuitability}/100 · 25%</b></span><span>Warranty <b>{routeProduct.insights.warranty}/100 · 20%</b></span><span>Price value <b>{routeProduct.insights.priceValue}/100 · 25%</b></span></div></div><p className="sample-note">Sample reviews for demonstration only. Not verified customer feedback. Score is a guide, not a durability guarantee.</p></div>}<div className="detail-actions"><button className="button primary" onClick={()=>addToCart(routeProduct)}>Add to cart · {money(routeProduct.price)}</button><button className="wish-detail" onClick={()=>toggleWish(routeProduct.id)}>{wishlist.includes(routeProduct.id)?'♥ Saved':'♡ Save'}</button></div></div></section>}</main>}

    {error && <div className="toast" role="status"><span>{error}</span><button onClick={()=>setError('')} aria-label="Dismiss">×</button></div>}
  </div>
}

function ProductCard({product:p,onOpen,onAdd,compared,onCompare,wished,onWish}) {
 return <article className="product-card"><button className="card-image" onClick={()=>onOpen(p)} aria-label={`View ${p.name}`}><img src={p.image} alt={p.name} loading="lazy" style={{backgroundColor:p.color}}/>{p.tag&&<span className="product-tag">{p.tag}</span>}<span className="image-arrow">↗</span></button><div className="card-meta"><span>{p.category}</span><button onClick={()=>onWish(p.id)} className={wished?'wish active':'wish'} aria-label={wished?'Remove from saved':'Save for later'}>{wished?'♥':'♡'}</button></div><button className="product-title" onClick={()=>onOpen(p)}>{p.name}</button><div className="rating">★★★★★ <b>{p.rating}</b> <span>({p.reviewsCount})</span></div><div className="product-bottom"><b>{money(p.price)}</b><button className="add-button" onClick={()=>onAdd(p)} aria-label={`Add ${p.name} to bag`}>+ Add</button></div><div className="card-actions"><button onClick={()=>onCompare(p.id)} className={compared?'compared':''}>{compared?'✓ Added to compare':'⇄ Compare'}</button><span>{p.warranty} mo warranty</span></div></article>
}
export default App
