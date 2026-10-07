/* Floating AI assistant widget: troubleshooting chat with offline fallback. */
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import type { ChatMsg, ChatResponse } from '../api/types'

function renderReply(text: string) {
  // Minimal safe rendering: bold (**x**) + line breaks. No raw HTML injection.
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>
        {p.split('\n').map((line, j, arr) => (
          <span key={j}>
            {line}
            {j < arr.length - 1 && <br />}
          </span>
        ))}
      </span>
    ),
  )
}

export default function ChatWidget({ complaintId }: { complaintId?: number }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<ChatResponse['suggested_draft']>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const send = async (text: string) => {
    const msg = text.trim()
    if (!msg || busy) return
    setInput('')
    setDraft(null)
    const next = [...messages, { role: 'user' as const, content: msg }]
    setMessages(next)
    setBusy(true)
    try {
      const { data } = await api.post<ChatResponse>('/ai/chat', {
        message: msg,
        complaint_id: complaintId ?? null,
      })
      setMessages([...next, { role: 'assistant', content: data.reply }])
      if (data.suggested_draft) setDraft(data.suggested_draft)
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Sorry, I could not reach the assistant. Please try again.' }])
    } finally {
      setBusy(false)
      requestAnimationFrame(() => boxRef.current?.scrollTo({ top: 999999 }))
    }
  }

  const useDraft = () => {
    if (!draft) return
    navigate('/complaints/new', { state: { draft } })
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700"
        aria-label="Open AI assistant"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8m-8 4h5m7-2a9 9 0 01-13.2 7.9L4 21l1.2-3.6A9 9 0 1112 3a9 9 0 018 5z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-30 flex h-[480px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="bg-indigo-600 px-4 py-3 text-white">
            <div className="font-semibold">DeskBot Assistant</div>
            <div className="text-xs text-indigo-200">Troubleshooting help · drafts complaints for you</div>
          </div>
          <div ref={boxRef} className="nice-scroll flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.length === 0 && (
              <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
                Hi! Describe a hostel issue — e.g. "tap leaking in room 204" — and I'll suggest fixes or draft a complaint.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                    m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {m.role === 'assistant' ? renderReply(m.content) : m.content}
                </div>
              </div>
            ))}
            {busy && <div className="text-xs text-slate-400">DeskBot is thinking…</div>}
            {draft && (
              <button
                onClick={useDraft}
                className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Use suggested draft → Raise complaint
              </button>
            )}
          </div>
          <form
            className="flex gap-2 border-t border-slate-200 p-3"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the issue…"
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  )
}
