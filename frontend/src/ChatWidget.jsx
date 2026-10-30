import { useEffect, useRef, useState } from 'react'
import './ChatWidget.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const welcome = { role: 'assistant', content: 'Hi! I can help you compare products, understand Value Scores, and find an option that fits your priorities.' }

function inlineFormatting(text, keyPrefix) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={`${keyPrefix}-${index}`}>{part.slice(1, -1)}</em>
    return part
  })
}

function formatMessage(content) {
  const lines = content.replace(/\\([*_])/g, '$1').replace(/\\\s*$/gm, '').split(/\r?\n/)
  return lines.map((line, index) => {
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/)
    const heading = line.match(/^#{1,3}\s+(.*)$/)
    if (bullet) return <div className="chat-message-list-item" key={index}><span aria-hidden="true">•</span><span>{inlineFormatting(bullet[1], `b${index}`)}</span></div>
    if (numbered) return <div className="chat-message-list-item" key={index}><span aria-hidden="true">{numbered[1]}.</span><span>{inlineFormatting(numbered[2], `n${index}`)}</span></div>
    if (heading) return <p className="chat-message-line chat-message-heading" key={index}>{inlineFormatting(heading[1], `h${index}`)}</p>
    if (!line.trim()) return <div className="chat-message-spacer" key={index} aria-hidden="true"/>
    return <p className="chat-message-line" key={index}>{inlineFormatting(line, `p${index}`)}</p>
  })
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [apiAvailable, setApiAvailable] = useState(true)
  const [messages, setMessages] = useState([welcome])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    let active = true
    fetch(`${API}/chat/status`).then(response => {
      if (!response.ok) throw new Error('API unavailable')
      return response.json()
    }).then(status => { if (active) { setEnabled(status.enabled); setApiAvailable(true) } })
      .catch(() => { if (active) setApiAvailable(false) })
    return () => { active = false }
  }, [])

  useEffect(() => { if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, busy, open])

  async function sendMessage(event) {
    event.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    const nextMessages = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    if (!apiAvailable || !enabled) {
      setMessages([...nextMessages, { role: 'assistant', content: apiAvailable ? 'The chatbot is not configured yet. Add GEMINI_API_KEY to server/.env, then restart the API.' : 'I can’t reach the AccessCart API. Start the backend and try again.' }])
      return
    }
    setBusy(true)
    try {
      const response = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.filter(message => message.role !== 'assistant' || message !== welcome).slice(-12) }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'The assistant could not reply. Please try again.')
      setMessages(current => [...current, { role: 'assistant', content: data.reply }])
    } catch (error) {
      setMessages(current => [...current, { role: 'assistant', content: error.message || 'The assistant could not reply. Please try again.' }])
    } finally { setBusy(false) }
  }

  function newChat() { setMessages([welcome]); setInput('') }

  return <>
    {open && <section className="shop-chat-panel" aria-label="AccessCart AI shopping assistant">
      <header className="shop-chat-header"><div><span className="shop-chat-avatar">A</span><div><b>AccessCart assistant</b><small>{enabled ? 'Product help, powered by AI' : 'Setup needed'}</small></div></div><div><button type="button" onClick={newChat} aria-label="Start a new chat" title="New chat">↻</button><button type="button" onClick={() => setOpen(false)} aria-label="Close chat">×</button></div></header>
      <div className="shop-chat-messages" aria-live="polite" aria-relevant="additions text">
        {messages.map((message, index) => <div key={`${index}-${message.role}`} className={`shop-chat-message ${message.role}`}><div className="shop-chat-bubble">{formatMessage(message.content)}</div></div>)}
        {busy && <div className="shop-chat-message assistant"><div className="shop-chat-bubble chat-typing" aria-label="Assistant is responding">Thinking…</div></div>}
        <div ref={bottomRef}/>
      </div>
      {!enabled && <p className="shop-chat-setup">{apiAvailable ? 'Add GEMINI_API_KEY to server/.env and restart the backend to enable AI replies.' : 'Start the backend to check chatbot availability.'}</p>}
      <form className="shop-chat-form" onSubmit={sendMessage}>
        <input value={input} onChange={event => setInput(event.target.value)} maxLength={1200} placeholder="Ask about products…" aria-label="Message the shopping assistant" disabled={busy}/>
        <button type="submit" aria-label="Send message" disabled={busy || !input.trim() || !enabled}>➤</button>
      </form>
      <small className="shop-chat-disclaimer">Messages and product data are sent to Google Gemini; AccessCart does not save chat history. Avoid sensitive information. Free-tier data may be used to improve Google products.</small>
    </section>}
    <button className={`shop-chat-launcher ${open ? 'is-open' : ''}`} type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={open ? 'Close shopping assistant' : 'Open AI shopping assistant'}>
      <span aria-hidden="true">{open ? '×' : '✦'}</span>{!open && <b>Ask AccessCart</b>}
    </button>
  </>
}
