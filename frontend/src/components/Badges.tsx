import type { Priority, Status } from '../api/types'
import { STATUS_LABELS } from '../api/types'

const STATUS_STYLES: Record<Status, string> = {
  open: 'bg-sky-100 text-sky-800',
  acknowledged: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-violet-100 text-violet-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-200 text-slate-700',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

const PRIORITY_STYLES: Record<Priority, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${PRIORITY_STYLES[priority]}`}>
      {priority}
    </span>
  )
}
