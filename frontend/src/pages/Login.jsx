import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { api, session } from '../api.js'

export default function Login() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  if (session.token) return <Navigate to="/" replace />

  async function onSuccess({ credential }) {
    setError('')
    try {
      session.save(await api('/api/auth/google', { body: { credential } }))
      navigate('/', { replace: true })
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <main className="login">
      <h1>MathStorage</h1>
      <p className="muted">Chuyển tài liệu toán (ảnh, PDF) thành LaTeX có thể chỉnh sửa.</p>
      <GoogleLogin onSuccess={onSuccess} onError={() => setError('Đăng nhập Google thất bại')} />
      {error && <p role="alert" className="error">{error}</p>}
    </main>
  )
}
