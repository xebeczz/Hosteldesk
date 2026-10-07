import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { CATEGORY_LABELS, type Category, type Priority } from '../api/types'
import Layout from '../components/Layout'

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[]
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']

interface DraftState {
  category?: string
  priority?: string
  title?: string
  description?: string
}

export default function ComplaintNew() {
  const location = useLocation()
  const draft = (location.state as { draft?: DraftState } | null)?.draft
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: draft?.title ?? '',
    description: draft?.description ?? '',
    category: (draft?.category as Category) ?? ('other' as Category),
    priority: (draft?.priority as Priority) ?? ('medium' as Priority),
    room_number: '',
    hostel_block: '',
  })
  const [photo, setPhoto] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data } = await api.post('/complaints', form)
      if (photo) {
        const fd = new FormData()
        fd.append('file', photo)
        await api.post(`/complaints/${data.id}/photos`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
      navigate(`/complaints/${data.id}`)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Could not raise the complaint. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const inputCls = 'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none'

  return (
    <Layout>
      <h1 className="mb-4 text-2xl font-bold">Raise a Complaint</h1>
      {draft && (
        <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          Pre-filled from the AI assistant's suggestion — review and submit.
        </div>
      )}
      <form onSubmit={submit} className="max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="text-sm font-medium">Title</label>
          <input required minLength={3} maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="e.g. Tap leaking in bathroom" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })} className={inputCls}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} className={inputCls}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p} className="capitalize">{p}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Hostel block</label>
            <input required value={form.hostel_block} onChange={(e) => setForm({ ...form, hostel_block: e.target.value })} className={inputCls} placeholder="A" />
          </div>
          <div>
            <label className="text-sm font-medium">Room number</label>
            <input required value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} className={inputCls} placeholder="204" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea required minLength={10} rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder="Describe the issue in detail — where, since when, how severe…" />
        </div>
        <div>
          <label className="text-sm font-medium">Photo (optional, max 5 MB)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm text-slate-600" />
        </div>
        {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <button type="submit" disabled={busy} className="rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
          {busy ? 'Submitting…' : 'Submit Complaint'}
        </button>
      </form>
    </Layout>
  )
}
