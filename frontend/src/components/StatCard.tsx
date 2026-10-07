export default function StatCard({
  title,
  value,
  sub,
  accent = 'indigo',
}: {
  title: string
  value: string | number
  sub?: string
  accent?: 'indigo' | 'amber' | 'emerald' | 'red' | 'sky' | 'violet'
}) {
  const accents: Record<string, string> = {
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
  }
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</div>
      <div className={`mt-1 inline-block rounded-lg border px-2.5 py-1 text-2xl font-bold ${accents[accent]}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}
