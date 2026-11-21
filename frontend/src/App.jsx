import { Link, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { session } from './api.js'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Editor from './pages/Editor.jsx'

function Layout() {
  if (!session.token) return <Navigate to="/login" replace />
  const user = session.user

  function logout() {
    session.clear()
    window.location.assign('/login')
  }

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">MathStorage</Link>
        <span className="spacer" />
        <span className="muted">{user?.name || user?.email}</span>
        <button onClick={logout}>Đăng xuất</button>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="documents/:id" element={<Editor />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
