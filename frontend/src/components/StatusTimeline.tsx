import type { Complaint } from '../api/types'
import { STATUS_LABELS, type Status } from '../api/types'

const STEPS: Status[] = ['open', 'acknowledged', 'in_progress', 'resolved', 'closed']

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function StatusTimeline({ complaint }: { complaint: Complaint }) {
  const dates: Record<Status, string | null> = {
    open: complaint.created_at,
    acknowledged: complaint.acknowledged_at,
    in_progress: null,
    resolved: complaint.resolved_at,
    closed: complaint.closed_at,
  }
  const currentIdx = STEPS.indexOf(complaint.status)

  return (
    <ol className="relative border-l-2 border-slate-200 ml-2 space-y-5">
      {STEPS.map((step, i) => {
        const done = i <= currentIdx
        const date = fmtDate(dates[step])
        return (
          <li key={step} className="ml-5">
            <span
              className={`absolute -left-[9px] mt-1 h-4 w-4 rounded-full border-2 ${
                done ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'
              }`}
            />
            <div className={`text-sm font-medium ${done ? 'text-slate-900' : 'text-slate-400'}`}>
              {STATUS_LABELS[step]}
            </div>
            {date && <div className="text-xs text-slate-500">{date}</div>}
          </li>
        )
      })}
    </ol>
  )
}
