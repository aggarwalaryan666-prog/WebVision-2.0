import { useEffect, useRef, useState } from 'react'
import './ChatWidget.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const welcome = { role: 'assistant', content: 'Hi! I can help you compare products, understand Value Scores, and find an option that fits your priorities.' }
const languages = [
  { code: 'en-IN', label: 'English' }, { code: 'hi-IN', label: 'हिन्दी' }, { code: 'bn-IN', label: 'বাংলা' },
  { code: 'ta-IN', label: 'தமிழ்' }, { code: 'te-IN', label: 'తెలుగు' }, { code: 'kn-IN', label: 'ಕನ್ನಡ' },
  { code: 'ml-IN', label: 'മലയാളം' }, { code: 'mr-IN', label: 'मराठी' }, { code: 'pa-IN', label: 'ਪੰਜਾਬੀ' },
]

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
  const [language, setLanguage] = useState('en-IN')
  const [listening, setListening] = useState(false)
  const [voiceNotice, setVoiceNotice] = useState('')
  const [speakingId, setSpeakingId] = useState(null)
  const bottomRef = useRef(null)
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const discardRecordingRef = useRef(false)

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

  useEffect(() => () => {
    discardRecordingRef.current = true
    clearTimeout(timerRef.current)
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    streamRef.current?.getTracks().forEach(track => track.stop())
    window.speechSynthesis?.cancel()
  }, [])

  function audioAsBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
      reader.onerror = () => reject(new Error('Could not read the audio recording. Try again or type your question.'))
      reader.readAsDataURL(blob)
    })
  }

  async function processRecording(blob, selectedLanguage, previousMessages) {
    if (!blob.size) { setVoiceNotice('I didn’t hear any audio. Try again or type your question.'); return }
    if (blob.size > 5 * 1024 * 1024) { setVoiceNotice('That recording is too large. Keep it under 15 seconds and try again.'); return }
    if (!apiAvailable || !enabled) { setVoiceNotice(apiAvailable ? 'Add GEMINI_API_KEY to server/.env to enable voice questions.' : 'I can’t reach the AccessCart API. Start the backend and try again.'); return }
    setBusy(true)
    setVoiceNotice('Sending audio to Gemini…')
    try {
      const audioBase64 = await audioAsBase64(blob)
      const mimeType = (blob.type || 'audio/webm').split(';')[0].trim().toLowerCase()
      const response = await fetch(`${API}/chat/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: selectedLanguage,
          messages: previousMessages.filter(message => message.role !== 'assistant' || message !== welcome).slice(-12),
          audioBase64,
          mimeType,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Gemini could not process this recording. Try again or type your question.')
      const transcript = data.transcript?.trim()
      if (!transcript || !data.reply) throw new Error('Gemini returned an empty voice response. Please try again.')
      setMessages(current => [...current, { role: 'user', content: transcript }, { role: 'assistant', content: data.reply, language: selectedLanguage }])
      setVoiceNotice('')
      speak(data.reply, selectedLanguage, `voice-${Date.now()}`)
    } catch (error) {
      setVoiceNotice(error.message || 'Voice input failed. Try again or type your question.')
    } finally { setBusy(false) }
  }

  async function listen() {
    if (listening) {
      clearTimeout(timerRef.current)
      recorderRef.current?.stop()
      return
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setVoiceNotice('Audio recording is not supported in this browser. You can still type your message.')
      return
    }
    setVoiceNotice('')
    try {
      if (!enabled || !apiAvailable) {
        setVoiceNotice(apiAvailable ? 'Add GEMINI_API_KEY to server/.env to enable voice questions.' : 'I can’t reach the AccessCart API. Start the backend and try again.')
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const supportedTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4']
      const mimeType = supportedTypes.find(type => window.MediaRecorder.isTypeSupported?.(type))
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      const selectedLanguage = language
      const previousMessages = messages
      streamRef.current = stream
      recorderRef.current = recorder
      chunksRef.current = []
      discardRecordingRef.current = false
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data) }
      recorder.onerror = () => setVoiceNotice('Microphone recording failed. Check your microphone and try again.')
      recorder.onstop = () => {
        clearTimeout(timerRef.current)
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' })
        chunksRef.current = []
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
        recorderRef.current = null
        setListening(false)
        if (!discardRecordingRef.current) processRecording(blob, selectedLanguage, previousMessages)
      }
      recorder.start()
      setListening(true)
      setVoiceNotice('Recording… Speak now, then tap the mic to send.')
      timerRef.current = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, 15_000)
    } catch (error) {
      setListening(false)
      const notice = error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError'
        ? 'Allow microphone access for this site, then try again.'
        : error.name === 'NotFoundError'
          ? 'No microphone was found. Connect one or type your message.'
          : 'Voice recording could not start. Check microphone permission and try again.'
      setVoiceNotice(notice)
    }
  }

  function speak(text, selectedLanguage, id) {
    if (!('speechSynthesis' in window)) { setVoiceNotice('Spoken replies are not supported in this browser.'); return }
    if (speakingId === id) { window.speechSynthesis.cancel(); setSpeakingId(null); return }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = selectedLanguage || language
    utterance.rate = 0.95
    utterance.onend = () => setSpeakingId(null)
    utterance.onerror = event => {
      setSpeakingId(null)
      if (!['canceled', 'interrupted'].includes(event.error)) setVoiceNotice('No suitable speech voice is available for this language on your device.')
    }
    setSpeakingId(id)
    window.speechSynthesis.speak(utterance)
  }

  async function sendMessage(event) {
    event.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    const responseLanguage = language
    const nextMessages = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setVoiceNotice('')
    if (!apiAvailable || !enabled) {
      setMessages([...nextMessages, { role: 'assistant', content: apiAvailable ? 'The chatbot is not configured yet. Add GEMINI_API_KEY to server/.env, then restart the API.' : 'I can’t reach the AccessCart API. Start the backend and try again.' }])
      return
    }
    setBusy(true)
    try {
      const response = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: responseLanguage, messages: nextMessages.filter(message => message.role !== 'assistant' || message !== welcome).slice(-12) }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'The assistant could not reply. Please try again.')
      setMessages(current => [...current, { role: 'assistant', content: data.reply, language: responseLanguage }])
    } catch (error) {
      setMessages(current => [...current, { role: 'assistant', content: error.message || 'The assistant could not reply. Please try again.' }])
    } finally { setBusy(false) }
  }

  function newChat() {
    discardRecordingRef.current = true
    clearTimeout(timerRef.current)
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    streamRef.current?.getTracks().forEach(track => track.stop())
    window.speechSynthesis?.cancel()
    setListening(false); setSpeakingId(null); setVoiceNotice('')
    setMessages([welcome]); setInput('')
  }

  function closeChat() {
    discardRecordingRef.current = true
    clearTimeout(timerRef.current)
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    streamRef.current?.getTracks().forEach(track => track.stop())
    window.speechSynthesis?.cancel()
    setListening(false); setSpeakingId(null); setVoiceNotice(''); setOpen(false)
  }

  return <>
    {open && <section className="shop-chat-panel" aria-label="AccessCart AI shopping assistant">
      <header className="shop-chat-header"><div><span className="shop-chat-avatar">A</span><div><b>AccessCart assistant</b><small>{enabled ? 'Multilingual product help' : 'Setup needed'}</small></div></div><div><button type="button" onClick={newChat} aria-label="Start a new chat" title="New chat">↻</button><button type="button" onClick={closeChat} aria-label="Close chat">×</button></div></header>
      <div className="shop-chat-messages" aria-live="polite" aria-relevant="additions text">
        {messages.map((message, index) => <div key={`${index}-${message.role}`} className={`shop-chat-message ${message.role}`}><div className="shop-chat-bubble">{formatMessage(message.content)}{message.role === 'assistant' && index > 0 && <button className="shop-chat-speak" type="button" onClick={() => speak(message.content, message.language || language, `message-${index}`)} aria-label={speakingId === `message-${index}` ? 'Stop spoken reply' : 'Listen to reply'}>{speakingId === `message-${index}` ? '■ Stop' : '🔊 Listen'}</button>}</div></div>)}
        {busy && <div className="shop-chat-message assistant"><div className="shop-chat-bubble chat-typing" aria-label="Assistant is responding">Thinking…</div></div>}
        <div ref={bottomRef}/>
      </div>
      {!enabled && <p className="shop-chat-setup">{apiAvailable ? 'Add GEMINI_API_KEY to server/.env and restart the backend to enable AI replies.' : 'Start the backend to check chatbot availability.'}</p>}
      <div className="shop-chat-language-row"><label htmlFor="shop-chat-language">Language</label><select id="shop-chat-language" value={language} onChange={event => { setLanguage(event.target.value); setVoiceNotice('') }}>{languages.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</select><span>Voice in and replies out</span></div>
      {voiceNotice && <p className="shop-chat-voice-notice" role="status">{voiceNotice}</p>}
      <form className="shop-chat-form" onSubmit={sendMessage}>
        <button className={`shop-chat-mic ${listening ? 'is-listening' : ''}`} type="button" onClick={listen} aria-label={listening ? 'Stop recording and send' : `Record a question in ${languages.find(item => item.code === language)?.label || 'selected language'}`} disabled={busy}>{listening ? '■' : '🎙'}</button>
        <input value={input} onChange={event => setInput(event.target.value)} maxLength={1200} placeholder={listening ? 'Recording… tap mic to send' : 'Ask about products…'} aria-label="Message the shopping assistant" disabled={busy}/>
        <button type="submit" aria-label="Send message" disabled={busy || !input.trim() || !enabled}>➤</button>
      </form>
      <small className="shop-chat-disclaimer">Messages, audio recordings, and product data are sent to Google Gemini; AccessCart does not save chat history. Free-tier data may be used to improve Google products. Spoken replies depend on voices available on your device.</small>
    </section>}
    <button className={`shop-chat-launcher ${open ? 'is-open' : ''}`} type="button" onClick={() => open ? closeChat() : setOpen(true)} aria-expanded={open} aria-label={open ? 'Close shopping assistant' : 'Open AI shopping assistant'}>
      <span aria-hidden="true">{open ? '×' : '✦'}</span>{!open && <b>Ask AccessCart</b>}
    </button>
  </>
}
