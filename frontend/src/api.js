const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

export const session = {
  get token() {
    return localStorage.getItem('token')
  },
  get user() {
    return JSON.parse(localStorage.getItem('user') || 'null')
  },
  save({ token, user }) {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
  },
  clear() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },
}

/** fetch wrapper: adds JWT, JSON-encodes plain bodies, throws Error(message from backend). */
export async function api(path, { body, method = body ? 'POST' : 'GET', raw = false } = {}) {
  const headers = {}
  if (session.token) headers.Authorization = `Bearer ${session.token}`
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(BASE + path, { method, headers, body })
  } catch {
    throw new Error('Không kết nối được máy chủ')
  }

  if (res.status === 401 && session.token) {
    session.clear()
    window.location.assign('/login')
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Lỗi ${res.status}`)
  }
  if (raw) return res
  return res.status === 204 ? null : res.json()
}
