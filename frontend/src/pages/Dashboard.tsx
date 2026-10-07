import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { Complaint, DashboardStats } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import ChatWidget from '../components/ChatWidget'
import ComplaintCard from '../components/ComplaintCard'
import EmptyState from '../components/EmptyState'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get<DashboardStats>('/dashboard/stats'), api.get<Complaint[]>('/complaints', { params: { limit: 5 } })])
      .then(([s, c]) => {
        setStats(s.data)
        setRecent(c.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const headline =
    user?.role === 'student'
      ? 'My complaints at a glance'
      : user?.role === 'warden'
        ? 'Hostel maintenance queue'
        : 'Hostel operations overview'

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user?.full_name?.split(' ')[0]}</h1>
          <p className="text-sm text-slate-500">{headline}</p>
        </div>
        {user?.role === 'student' && (
          <Link to="/complaints/new" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            + Raise Complaint
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total" value={stats.total} accent="indigo" />
            <StatCard title="Open" value={stats.by_status.open ?? 0} accent="sky" sub="Awaiting acknowledgement" />
            <StatCard title="In Progress" value={stats.by_status.in_progress ?? 0} accent="violet" />
            <StatCard title="SLA Breaches" value={stats.sla_breaches} accent="red" sub="Overdue, unresolved" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Avg Resolution"
              value={stats.avg_resolution_hours != null ? `${stats.avg_resolution_hours}h` : '—'}
              accent="emerald"
            />
            <StatCard
              title="Avg Rating"
              value={stats.avg_rating != null ? `${stats.avg_rating} / 5` : '—'}
              accent="amber"
              sub="Student satisfaction"
            />
            {user?.role !== 'student' && <StatCard title="Unassigned" value={stats.unassigned} accent="amber" sub="Open, no warden" />}
            <StatCard title="Resolved" value={stats.by_status.resolved ?? 0} accent="emerald" />
          </div>

          <h2 className="mb-3 mt-8 text-lg font-semibold">Recent complaints</h2>
          {recent.length === 0 ? (
            <EmptyState title="No complaints yet" hint={user?.role === 'student' ? 'Raise your first complaint to get started.' : undefined} />
          ) : (
            <div className="grid gap-3">
              {recent.map((c) => (
                <ComplaintCard key={c.id} complaint={c} />
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState title="Could not load dashboard" />
      )}
      <ChatWidget />
    </Layout>
  )
}
