import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authConfigured, signIn, signUp } from './supabaseAuth'
import './AuthPage.css'

export default function AuthPage({ mode, user, onAuthenticated, onSignOut }) {
  const navigate = useNavigate(); const isSignup = mode === 'signup'
  const [fullName, setFullName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true)
    try {
      if (isSignup) {
        const result = await signUp({ email: email.trim(), password, fullName: fullName.trim() })
        if (result.session) { onAuthenticated(result.session); navigate('/') }
        else setMessage('Your account was created. Check your email for the confirmation link, then come back to sign in.')
      } else { const session = await signIn({ email: email.trim(), password }); onAuthenticated(session); navigate('/') }
    } catch (err) { setError(err.message || 'Could not complete that request. Please try again.') }
    finally { setBusy(false) }
  }
  if (user) return <main className="auth-page route-page"><div className="auth-card"><div className="eyebrow">YOUR ACCESSCART ACCOUNT</div><h1>You’re signed in.</h1><p>Signed in as <b>{user.email}</b></p><button className="button primary auth-submit" onClick={onSignOut}>Sign out</button><button className="auth-text-button" onClick={() => navigate('/')}>Continue shopping</button></div></main>
  return <main className="auth-page route-page"><section className="auth-card" aria-labelledby="auth-heading">
    <Link className="auth-brand" to="/"><span className="brand-mark">A</span><span>AccessCart</span></Link><div className="eyebrow">SHOP WITH CLARITY</div>
    <h1 id="auth-heading">{isSignup ? 'Create your account.' : 'Welcome back.'}</h1><p>{isSignup ? 'Sign up to get started with AccessCart.' : 'Sign in to your AccessCart account.'}</p>
    {!authConfigured && <div className="auth-notice" role="status">Add your Supabase project URL and publishable key in <code>frontend/.env</code>, then restart Vite to enable account access.</div>}
    {message && <div className="auth-success" role="status">{message}</div>}{error && <div className="auth-error" role="alert">{error}</div>}
    <form onSubmit={submit}>
      {isSignup && <label>Full name<input autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} required maxLength={80}/></label>}
      <label>Email address<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required/></label>
      <label>Password<input type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6}/></label>
      <button className="button primary auth-submit" type="submit" disabled={busy || !authConfigured}>{busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}</button>
    </form>
    <div className="auth-switch">{isSignup ? 'Already have an account?' : 'New to AccessCart?'} <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Sign in' : 'Create an account'}</Link></div>
    <button className="auth-text-button" onClick={() => navigate('/')}>← Continue as a guest</button>
  </section></main>
}
