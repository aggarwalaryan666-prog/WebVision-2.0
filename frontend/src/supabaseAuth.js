const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '')
const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()
const sessionKey = 'accesscart-supabase-session'
const authEvent = 'accesscart-auth-change'

export const authConfigured = Boolean(supabaseUrl && publishableKey)

function announce(session) { window.dispatchEvent(new CustomEvent(authEvent, { detail: session })) }
function saveSession(session) {
  if (session?.access_token) {
    const normalized = { ...session, expires_at: session.expires_at || Math.floor(Date.now() / 1000) + (session.expires_in || 3600) }
    localStorage.setItem(sessionKey, JSON.stringify(normalized)); announce(normalized); return normalized
  }
  localStorage.removeItem(sessionKey); announce(null); return null
}
function currentSession() {
  try { return JSON.parse(localStorage.getItem(sessionKey) || 'null') }
  catch { localStorage.removeItem(sessionKey); return null }
}
async function authRequest(path, { method = 'POST', body, accessToken } = {}) {
  if (!authConfigured) throw new Error('Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to frontend/.env, then restart the storefront.')
  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, { method, headers: { apikey: publishableKey, 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.msg || result.message || result.error_description || result.error || 'Authentication failed. Please try again.')
  return result
}
export async function signUp({ email, password, fullName }) {
  const result = await authRequest('signup', { body: { email, password, data: { full_name: fullName } } })
  const session = result.access_token ? result : null; saveSession(session); return { user: result.user, session }
}
export async function signIn({ email, password }) {
  const result = await authRequest('token?grant_type=password', { body: { email, password } }); saveSession(result); return result
}
export async function signOut() {
  const session = currentSession()
  let logoutError
  if (session?.access_token) {
    try { await authRequest('logout', { accessToken: session.access_token }) }
    catch (error) { logoutError = error }
  }
  saveSession(null)
  if (logoutError) throw logoutError
}
export async function getSession() {
  const session = currentSession(); if (!session) return null
  if (session.expires_at && session.expires_at > Math.floor(Date.now() / 1000) + 60) return session
  if (!session.refresh_token) return saveSession(null)
  try { return saveSession(await authRequest('token?grant_type=refresh_token', { body: { refresh_token: session.refresh_token } })) }
  catch { return saveSession(null) }
}
export function subscribeToAuth(callback) {
  const handler = event => callback(event.detail); const storageHandler = event => { if (event.key === sessionKey) callback(currentSession()) }
  window.addEventListener(authEvent, handler); window.addEventListener('storage', storageHandler)
  return () => { window.removeEventListener(authEvent, handler); window.removeEventListener('storage', storageHandler) }
}
