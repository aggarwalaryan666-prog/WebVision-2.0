import express from 'express'
import cors from 'cors'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const app = express()
const port = process.env.PORT || 4000
const productsPath = fileURLToPath(new URL('./data/products.json', import.meta.url))
const products = JSON.parse(await readFile(productsPath, 'utf8'))
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
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
app.get('/api/products', (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase()
  const category = String(req.query.category || '').trim().toLowerCase()
  let list = products.filter(p => (!query || `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(query)) && (!category || p.category.toLowerCase() === category))
  if (req.query.sort === 'price-asc') list = [...list].sort((a,b) => a.price - b.price)
  if (req.query.sort === 'price-desc') list = [...list].sort((a,b) => b.price - a.price)
  if (req.query.sort === 'rating') list = [...list].sort((a,b) => b.rating - a.rating)
  res.json(list)
})
app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id)
  if (!product) return res.status(404).json({ error: 'Product not found' })
  res.json({ ...product, insights: insights(product) })
})
app.get('/api/compare', (req, res) => {
  const ids = String(req.query.ids || '').split(',').filter(Boolean)
  if (!ids.length || ids.length > 3) return res.status(400).json({ error: 'Select between one and three product IDs' })
  if (ids.some(id => !products.some(p => p.id === id))) return res.status(404).json({ error: 'One or more products were not found' })
  res.json(ids.map(id => { const p = products.find(item => item.id === id); return { ...p, insights: insights(p) } }))
})
app.post('/api/insights', (req, res) => {
  const ids = req.body?.ids
  if (!Array.isArray(ids) || ids.length > 12 || ids.some(id => typeof id !== 'string')) return res.status(400).json({ error: 'ids must be an array of up to 12 product IDs' })
  const found = products.filter(p => ids.includes(p.id))
  res.json(found.map(p => insights(p)))
})
app.post('/api/recommend', (req, res) => {
  const { ids, preference } = req.body || {}
  const allowed = ['lowest-price', 'best-features', 'best-warranty', 'best-value']
  if (!Array.isArray(ids) || !ids.length || ids.length > 12 || ids.some(id => typeof id !== 'string') || !allowed.includes(preference)) return res.status(400).json({ error: 'Provide product IDs and a valid preference' })
  const options = products.filter(p => ids.includes(p.id))
  if (!options.length) return res.status(404).json({ error: 'No matching products were found' })
  const score = p => preference === 'lowest-price' ? -p.price : preference === 'best-features' ? p.features.length : preference === 'best-warranty' ? p.warranty : insights(p).score
  const chosen = [...options].sort((a,b) => score(b) - score(a))[0]
  const reason = preference === 'lowest-price' ? `At ₹${chosen.price.toLocaleString('en-IN')}, it has the lowest listed price in this selection.` : preference === 'best-features' ? `It has ${chosen.features.length} listed features, the most in this selection.` : preference === 'best-warranty' ? `It includes a ${chosen.warranty}-month warranty, the longest in this selection.` : `It has the highest Value Score (${insights(chosen).score}/100) in this selection.`
  res.json({ product: chosen, preference, reason })
})
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Something went wrong on the server' }) })
app.listen(port, () => console.log(`VALUEWISE API running at http://localhost:${port}`))
