import { Link, Navigate, Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { session } from './api.js'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'

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

// Data router (not <BrowserRouter>) because Editor needs useBlocker and route-level lazy loading.
const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      {
        path: 'documents/:id',
        // Editor pulls in KaTeX + markdown (~70% of the bundle); load it only when opened.
        lazy: () => import('./pages/Editor.jsx').then((m) => ({ Component: m.default })),
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
