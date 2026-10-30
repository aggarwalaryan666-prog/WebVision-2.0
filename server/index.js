import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const app = express()
const port = process.env.PORT || 4000
const productsPath = fileURLToPath(new URL('./data/products.json', import.meta.url))
const supabaseUrl = process.env.SUPABASE_URL?.trim()
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim()
if (Boolean(supabaseUrl) !== Boolean(supabaseKey)) {
  throw new Error('Set both SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in server/.env, or leave both blank to use local JSON data.')
}
const supabase = supabaseUrl ? createClient(supabaseUrl, supabaseKey) : null
const localProducts = JSON.parse(await readFile(productsPath, 'utf8'))
function normalizeProduct(row) {
  return {
    id: row.id, name: row.name, category: row.category, price: Number(row.price), rating: Number(row.rating),
    reviewsCount: Number(row.reviews_count ?? row.reviewsCount ?? 0),
    warranty: Number(row.warranty_months ?? row.warranty ?? 0),
    image: row.image_url ?? row.image ?? '', color: row.color ?? '#f1f1ed', tag: row.tag ?? '',
    description: row.description ?? '', simple: row.simple_description ?? row.simple ?? '',
    features: row.features ?? [], reviews: row.sample_reviews ?? row.reviews ?? [],
  }
}
async function getProducts() {
  if (!supabase) return localProducts
  const { data, error } = await supabase.from('products').select('*').order('name')
  if (error) throw error
  return (data ?? []).map(normalizeProduct)
}
app.use(cors({ origin: true }))
app.use(express.json({ limit: '32kb' }))

const okThemes = ['comfortable', 'battery life', 'sound quality', 'build quality', 'easy to clean', 'easy setup', 'smooth', 'grip', 'comfortable fit', 'noise cancellation', 'lightweight', 'easy to use', 'value', 'reliable', 'bright screen', 'quiet']
const badThemes = ['price is high', 'pricey', 'slow charging', 'heating', 'confusing', 'bulky', 'wobbly', 'runs a little small', 'tricky', 'snug', 'sediment', 'takes a day', 'by mistake']
function phraseCounts(reviews, dictionary) {
  return dictionary.map(theme => ({ theme, count: reviews.filter(review => review.toLowerCase().includes(theme)).length })).filter(item => item.count > 0).sort((a,b) => b.count - a.count).slice(0, 3)
}
function insights(product) {
  const reviews = Array.isArray(product.reviews) ? product.reviews : []
  const positive = phraseCounts(reviews, okThemes)
  const negative = phraseCounts(reviews, badThemes)
  const reviewQuality = Math.round((product.rating / 5) * 100)
  const featureSuitability = Math.min(100, 55 + product.features.length * 8)
  const warranty = Math.min(100, Math.round(product.warranty / 24 * 100))
  const priceValue = Math.max(35, Math.min(100, Math.round(100 - product.price / 320)))
  const score = Math.round(reviewQuality * .3 + featureSuitability * .25 + warranty * .2 + priceValue * .25)
  return { productId: product.id, sampleReviewCount: reviews.length, positive, negative, reviewQuality, featureSuitability, warranty, priceValue, score,
    note: 'A transparent estimate based on the listed factors. It is not a durability guarantee. Reviews shown are sample data, not verified customer feedback.' }
}
app.get('/api/health', async (_req, res) => {
  if (!supabase) return res.json({ status: 'ok', dataSource: 'local-json' })
  const { error } = await supabase.from('products').select('id').limit(1)
  if (error) return res.status(503).json({ status: 'error', dataSource: 'supabase', error: 'Supabase is configured but unavailable. Check server/.env and run the Supabase schema.' })
  res.json({ status: 'ok', dataSource: 'supabase' })
})
app.get('/api/products', async (req, res, next) => {
 try {
  const products = await getProducts()
  const query = String(req.query.q || '').trim().toLowerCase()
  const category = String(req.query.category || '').trim().toLowerCase()
  let list = products.filter(p => (!query || `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(query)) && (!category || p.category.toLowerCase() === category))
  if (req.query.sort === 'price-asc') list = [...list].sort((a,b) => a.price - b.price)
  if (req.query.sort === 'price-desc') list = [...list].sort((a,b) => b.price - a.price)
  if (req.query.sort === 'rating') list = [...list].sort((a,b) => b.rating - a.rating)
  res.json(list)
 } catch (error) { next(error) }
})
app.get('/api/products/:id', async (req, res, next) => {
 try {
  const products = await getProducts()
  const product = products.find(p => p.id === req.params.id)
  if (!product) return res.status(404).json({ error: 'Product not found' })
  res.json({ ...product, insights: insights(product) })
 } catch (error) { next(error) }
})
app.get('/api/compare', async (req, res, next) => {
 try {
  const products = await getProducts()
  const ids = String(req.query.ids || '').split(',').filter(Boolean)
  if (!ids.length || ids.length > 3) return res.status(400).json({ error: 'Select between one and three product IDs' })
  if (ids.some(id => !products.some(p => p.id === id))) return res.status(404).json({ error: 'One or more products were not found' })
  res.json(ids.map(id => { const p = products.find(item => item.id === id); return { ...p, insights: insights(p) } }))
 } catch (error) { next(error) }
})
app.post('/api/insights', async (req, res, next) => {
 try {
  const products = await getProducts()
  const ids = req.body?.ids
  if (!Array.isArray(ids) || ids.length > 12 || ids.some(id => typeof id !== 'string')) return res.status(400).json({ error: 'ids must be an array of up to 12 product IDs' })
  const found = products.filter(p => ids.includes(p.id))
  res.json(found.map(p => insights(p)))
 } catch (error) { next(error) }
})
app.post('/api/recommend', async (req, res, next) => {
 try {
  const products = await getProducts()
  const { ids, preference } = req.body || {}
  const allowed = ['lowest-price', 'best-features', 'best-warranty', 'best-value']
  if (!Array.isArray(ids) || !ids.length || ids.length > 12 || ids.some(id => typeof id !== 'string') || !allowed.includes(preference)) return res.status(400).json({ error: 'Provide product IDs and a valid preference' })
  const options = products.filter(p => ids.includes(p.id))
  if (!options.length) return res.status(404).json({ error: 'No matching products were found' })
  const score = p => preference === 'lowest-price' ? -p.price : preference === 'best-features' ? p.features.length : preference === 'best-warranty' ? p.warranty : insights(p).score
  const chosen = [...options].sort((a,b) => score(b) - score(a))[0]
  const reason = preference === 'lowest-price' ? `At ₹${chosen.price.toLocaleString('en-IN')}, it has the lowest listed price in this selection.` : preference === 'best-features' ? `It has ${chosen.features.length} listed features, the most in this selection.` : preference === 'best-warranty' ? `It includes a ${chosen.warranty}-month warranty, the longest in this selection.` : `It has the highest Value Score (${insights(chosen).score}/100) in this selection.`
  res.json({ product: chosen, preference, reason })
 } catch (error) { next(error) }
})
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Something went wrong on the server' }) })
app.listen(port, () => console.log(`ACCESSCART API running at http://localhost:${port}`))
