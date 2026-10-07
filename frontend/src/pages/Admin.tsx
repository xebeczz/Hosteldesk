import { useEffect, useState } from 'react'
import api from '../api/client'
import type { DashboardStats, Role, User } from '../api/types'
import { CategoryChart, StatusChart } from '../components/Charts'
import EmptyState from '../components/EmptyState'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'

export default function Admin() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'student' as Role, hostel_block: '', room_number: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    Promise.all([api.get<DashboardStats>('/dashboard/stats'), api.get<User[]>('/users', { params: search ? { search } : {} })])
      .then(([s, u]) => {
        setStats(s.data)
        setUsers(u.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleActive = async (u: User) => {
    await api.patch(`/users/${u.id}`, { is_active: !u.is_active })
    load()
  }

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/users', {
        email: newUser.email,
        password: newUser.password,
        full_name: newUser.full_name,
        role: newUser.role,
        hostel_block: newUser.hostel_block || undefined,
        room_number: newUser.room_number || undefined,
      })
      setNewUser({ email: '', password: '', full_name: '', role: 'student', hostel_block: '', room_number: '' })
      load()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Could not create user.')
    }
  }

  const inputCls = 'rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'

  return (
    <Layout>
      <h1 className="mb-4 text-2xl font-bold">Admin</h1>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Complaints" value={stats.total} accent="indigo" />
            <StatCard title="SLA Breaches" value={stats.sla_breaches} accent="red" />
            <StatCard title="Avg Resolution" value={stats.avg_resolution_hours != null ? `${stats.avg_resolution_hours}h` : '—'} accent="emerald" />
            <StatCard title="Avg Rating" value={stats.avg_rating != null ? `${stats.avg_rating}/5` : '—'} accent="amber" />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-semibold">By Category</h2>
              <CategoryChart data={stats.by_category} />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-semibold">By Status</h2>
              <StatusChart data={stats.by_status} />
            </div>
          </div>
        </>
      ) : (
        <EmptyState title="Could not load analytics" />
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">Users</h2>
      <div className="mb-3 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search name or email…"
          className="max-w-sm flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <button onClick={load} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          Search
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Block / Room</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-2.5 font-medium">{u.full_name}</td>
                <td className="px-4 py-2.5 text-slate-600">{u.email}</td>
                <td className="px-4 py-2.5 capitalize">{u.role}</td>
                <td className="px-4 py-2.5 text-slate-600">{[u.hostel_block, u.room_number].filter(Boolean).join(' / ') || '—'}</td>
                <td className="px-4 py-2.5">{u.is_active ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2.5">
                  <button onClick={() => toggleActive(u)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-50">
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Add user</h2>
      <form onSubmit={createUser} className="grid max-w-3xl gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <input required placeholder="Full name" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} className={inputCls} />
        <input required type="email" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className={inputCls} />
        <input required type="password" minLength={6} placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className={inputCls} />
        <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })} className={inputCls}>
          <option value="student">Student</option>
          <option value="warden">Warden</option>
          <option value="admin">Admin</option>
        </select>
        <input placeholder="Hostel block" value={newUser.hostel_block} onChange={(e) => setNewUser({ ...newUser, hostel_block: e.target.value })} className={inputCls} />
        <input placeholder="Room" value={newUser.room_number} onChange={(e) => setNewUser({ ...newUser, room_number: e.target.value })} className={inputCls} />
        {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</div>}
        <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 sm:col-span-2">
          Create user
        </button>
      </form>
    </Layout>
  )
}
