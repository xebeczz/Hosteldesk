/* Axios client with JWT attach + silent refresh on 401. */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const api = axios.create({ baseURL: '/api/v1' })

function getTokens() {
  return {
    access: localStorage.getItem('hd_access'),
    refresh: localStorage.getItem('hd_refresh'),
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { access } = getTokens()
  if (access) config.headers.Authorization = `Bearer ${access}`
  return config
})

let refreshing: Promise<string | null> | null = null

async function refreshAccess(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      const { refresh } = getTokens()
      if (!refresh) return null
      try {
        const { data } = await axios.post('/api/v1/auth/refresh', { refresh_token: refresh })
        localStorage.setItem('hd_access', data.access_token)
        localStorage.setItem('hd_refresh', data.refresh_token)
        return data.access_token as string
      } catch {
        localStorage.removeItem('hd_access')
        localStorage.removeItem('hd_refresh')
        return null
      } finally {
        refreshing = null
      }
    })()
  }
  return refreshing
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    if (error.response?.status === 401 && original && !original._retried && !original.url?.includes('/auth/')) {
      original._retried = true
      const token = await refreshAccess()
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api
