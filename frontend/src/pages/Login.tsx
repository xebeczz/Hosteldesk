import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch {
      setError('Incorrect email or password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold">HostelDesk</h1>
          <p className="text-sm text-slate-500">Sign in to your hostel account</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              placeholder="you@hosteldesk.io"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          New student? <Link to="/register" className="font-medium text-indigo-600 hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  )
}
