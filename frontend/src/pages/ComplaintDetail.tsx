import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/client'
import { CATEGORY_LABELS, STATUS_LABELS, type Comment, type Complaint, type Status, type User } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { PriorityBadge, StatusBadge } from '../components/Badges'
import ChatWidget from '../components/ChatWidget'
import Layout from '../components/Layout'
import StatusTimeline from '../components/StatusTimeline'

const NEXT_STATUS: Partial<Record<Status, Status>> = {
  open: 'acknowledged',
  acknowledged: 'in_progress',
  in_progress: 'resolved',
  resolved: 'closed',
}

const ACTION_LABEL: Partial<Record<Status, string>> = {
  acknowledged: 'Acknowledge',
  in_progress: 'Start Work',
  resolved: 'Mark Resolved',
  closed: 'Close',
}

export default function ComplaintDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [wardens, setWardens] = useState<User[]>([])
  const [comment, setComment] = useState('')
  const [assignId, setAssignId] = useState('')
  const [rating, setRating] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!id) return
    Promise.all([
      api.get<Complaint>(`/complaints/${id}`),
      api.get<Comment[]>(`/complaints/${id}/comments`),
      ...(user?.role !== 'student' ? [api.get<User[]>('/users', { params: { role: 'warden' } })] : []),
    ])
      .then(([c, cm, w]) => {
        setComplaint(c.data)
        setComments(cm.data)
        if (w) setWardens(w.data)
        setRating(c.data.rating_score ?? 0)
      })
      .catch(() => setError('Complaint not found or you do not have access.'))
      .finally(() => setLoading(false))
  }, [id, user?.role])

  useEffect(() => {
    load()
  }, [load])

  const act = async (fn: () => Promise<unknown>) => {
    setError('')
    try {
      await fn()
      load()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Action failed.')
    }
  }

  const changeStatus = (s: Status) => act(() => api.post(`/complaints/${id}/status`, { status: s }))
  const assign = () => assignId && act(() => api.post(`/complaints/${id}/assign`, { warden_id: Number(assignId) }))
  const sendComment = () =>
    comment.trim() &&
    act(async () => {
      await api.post(`/complaints/${id}/comments`, { body: comment.trim() })
      setComment('')
    })
  const submitRating = (score: number) =>
    act(async () => {
      await api.post(`/complaints/${id}/rating`, { score })
      setRating(score)
    })

  if (loading) return <Layout><div className="h-64 animate-pulse rounded-2xl bg-slate-200" /></Layout>
  if (!complaint) return <Layout><div className="rounded-2xl bg-red-50 p-6 text-red-700">{error || 'Not found.'}</div></Layout>

  const isOwner = user?.id === complaint.student_id
  const isStaff = user?.role === 'warden' || user?.role === 'admin'
  const next = NEXT_STATUS[complaint.status]
  const canAdvance =
    next === 'closed' ? isOwner || isStaff : isStaff

  return (
    <Layout>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500">Complaint #{complaint.id}</div>
          <h1 className="text-2xl font-bold">{complaint.title}</h1>
          <div className="mt-1 text-sm text-slate-500">
            {CATEGORY_LABELS[complaint.category]} · Block {complaint.hostel_block}, Room {complaint.room_number} ·
            raised by {complaint.student_name ?? '—'}
            {complaint.warden_name ? ` · assigned to ${complaint.warden_name}` : ' · unassigned'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={complaint.status} />
          <PriorityBadge priority={complaint.priority} />
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 font-semibold">Description</h2>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{complaint.description}</p>
            {complaint.photo_urls.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {complaint.photo_urls.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer">
                    <img src={u} alt="complaint photo" className="h-28 w-28 rounded-xl border border-slate-200 object-cover" />
                  </a>
                ))}
              </div>
            )}
            {complaint.sla_breached && (
              <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                SLA breached — this complaint is overdue.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Comments</h2>
            <div className="mb-4 max-w-none space-y-3">
              {comments.length === 0 && <div className="text-sm text-slate-500">No comments yet.</div>}
              {comments.map((c) => (
                <div key={c.id} className="rounded-xl bg-slate-50 p-3">
                  <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{c.user_name}</span>
                    <span className="capitalize rounded bg-slate-200 px-1.5 py-0.5">{c.user_role}</span>
                    <span>{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-slate-800">{c.body}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendComment()}
                placeholder="Write a comment…"
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <button onClick={sendComment} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Post
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Progress</h2>
            <StatusTimeline complaint={complaint} />
          </div>

          {(isStaff || (next === 'closed' && isOwner)) && next && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-semibold">Actions</h2>
              {canAdvance && (
                <button
                  onClick={() => changeStatus(next)}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  {ACTION_LABEL[next] ?? `Move to ${STATUS_LABELS[next]}`}
                </button>
              )}
              {isStaff && complaint.status !== 'closed' && (
                <div className="mt-3">
                  <label className="text-xs font-medium text-slate-500">Assign warden</label>
                  <div className="mt-1 flex gap-2">
                    <select
                      value={assignId}
                      onChange={(e) => setAssignId(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-300 px-2 py-2 text-sm"
                    >
                      <option value="">Select…</option>
                      {wardens.map((w) => (
                        <option key={w.id} value={w.id}>{w.full_name}</option>
                      ))}
                    </select>
                    <button onClick={assign} disabled={!assignId} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
                      Assign
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isOwner && complaint.status === 'resolved' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-2 font-semibold">Rate the resolution</h2>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => submitRating(s)}
                    className={`text-2xl ${s <= rating ? 'text-amber-400' : 'text-slate-300'}`}
                    aria-label={`Rate ${s}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              {complaint.rating_score != null && <div className="mt-1 text-xs text-slate-500">You rated this {complaint.rating_score}/5.</div>}
            </div>
          )}
        </div>
      </div>
      <ChatWidget complaintId={complaint.id} />
    </Layout>
  )
}
