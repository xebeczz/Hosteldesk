import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', full_name: '', hostel_block: '', room_number: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await register({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        hostel_block: form.hostel_block || undefined,
        room_number: form.room_number || undefined,
      })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Registration failed. Try a different email.')
    } finally {
      setBusy(false)
    }
  }

  const inputCls = 'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none'

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold">Create student account</h1>
        <p className="mb-6 text-sm text-slate-500">Raise and track hostel complaints</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Full name</label>
            <input required value={form.full_name} onChange={set('full_name')} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input required type="email" value={form.email} onChange={set('email')} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium">Password (min 6 chars)</label>
            <input required type="password" minLength={6} value={form.password} onChange={set('password')} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Hostel block</label>
              <input value={form.hostel_block} onChange={set('hostel_block')} className={inputCls} placeholder="A" />
            </div>
            <div>
              <label className="text-sm font-medium">Room</label>
              <input value={form.room_number} onChange={set('room_number')} className={inputCls} placeholder="204" />
            </div>
          </div>
          {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already registered? <Link to="/login" className="font-medium text-indigo-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
