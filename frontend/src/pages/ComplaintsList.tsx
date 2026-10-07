import { useEffect, useState } from 'react'
import api from '../api/client'
import { CATEGORY_LABELS, type Category, type Complaint, type Priority, type Status } from '../api/types'
import ChatWidget from '../components/ChatWidget'
import ComplaintCard from '../components/ComplaintCard'
import EmptyState from '../components/EmptyState'
import Layout from '../components/Layout'

const STATUSES: Status[] = ['open', 'acknowledged', 'in_progress', 'resolved', 'closed']
const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[]
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']

export default function ComplaintsList() {
  const [items, setItems] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('')
  const [unassignedOnly, setUnassignedOnly] = useState(false)
  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    api
      .get<Complaint[]>('/complaints', {
        params: {
          ...(status && { status }),
          ...(category && { category }),
          ...(priority && { priority }),
          ...(unassignedOnly && { unassigned: true }),
          ...(search.trim() && { search: search.trim() }),
          limit: 100,
        },
      })
      .then((r) => setItems(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sel = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm'

  return (
    <Layout>
      <h1 className="mb-4 text-2xl font-bold">Complaints</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search title or description…"
          className="min-w-52 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={sel}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={sel}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className={sel}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p} className="capitalize">{p}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" checked={unassignedOnly} onChange={(e) => setUnassignedOnly(e.target.checked)} />
          Unassigned only
        </label>
        <button onClick={load} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          Filter
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No complaints match these filters" />
      ) : (
        <div className="grid gap-3">
          {items.map((c) => (
            <ComplaintCard key={c.id} complaint={c} />
          ))}
        </div>
      )}
      <ChatWidget />
    </Layout>
  )
}
