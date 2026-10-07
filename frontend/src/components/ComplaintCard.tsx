import { Link } from 'react-router-dom'
import { CATEGORY_LABELS, type Complaint } from '../api/types'
import { PriorityBadge, StatusBadge } from './Badges'

export default function ComplaintCard({ complaint }: { complaint: Complaint }) {
  return (
    <Link
      to={`/complaints/${complaint.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-indigo-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-900">{complaint.title}</div>
          <div className="mt-0.5 text-xs text-slate-500">
            #{complaint.id} · {CATEGORY_LABELS[complaint.category]} · Block {complaint.hostel_block}, Room {complaint.room_number}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={complaint.status} />
          <PriorityBadge priority={complaint.priority} />
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{complaint.description}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>
          {complaint.student_name ?? '—'}
          {complaint.warden_name ? ` → ${complaint.warden_name}` : ' · Unassigned'}
        </span>
        <span className="flex items-center gap-2">
          {complaint.sla_breached && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">SLA breached</span>
          )}
          {new Date(complaint.created_at).toLocaleDateString()}
        </span>
      </div>
    </Link>
  )
}
