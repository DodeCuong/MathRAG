import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

const ACCEPT = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
const MAX_MB = 20 // keep in sync with MAX_CONTENT_LENGTH in backend/app/__init__.py
const STATUS = { processing: 'Đang xử lý', done: 'Hoàn tất', failed: 'Lỗi' }

export default function Dashboard() {
  const [docs, setDocs] = useState(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const load = useCallback(
    () => api('/api/documents').then(setDocs).catch((e) => setError(e.message)),
    [],
  )
  useEffect(() => {
    load()
  }, [load])

  const processing = docs?.some((d) => d.status === 'processing')
  useEffect(() => {
    if (!processing) return
    const timer = setInterval(load, 3000)
    return () => clearInterval(timer)
  }, [processing, load])

  async function upload(file) {
    setError('')
    if (!file) return
    if (!ACCEPT.includes(file.type)) return setError('Chỉ nhận PDF hoặc ảnh (PNG, JPG, WEBP).')
    if (file.size > MAX_MB * 1024 * 1024) return setError(`File tối đa ${MAX_MB}MB.`)

    const form = new FormData()
    form.append('file', file)
    setUploading(true)
    try {
      await api('/api/documents', { body: form })
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <label
        className={`dropzone${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          upload(e.dataTransfer.files[0])
        }}
      >
        <input
          type="file"
          accept={ACCEPT.join(',')}
          disabled={uploading}
          onChange={(e) => {
            upload(e.target.files[0])
            e.target.value = ''
          }}
        />
        {uploading ? 'Đang tải lên…' : `Kéo thả hoặc bấm để chọn PDF / ảnh (tối đa ${MAX_MB}MB)`}
      </label>
      {error && <p role="alert" className="error">{error}</p>}

      <h2>Tài liệu của bạn</h2>
      {docs === null && !error && <p className="muted">Đang tải…</p>}
      {docs?.length === 0 && <p className="muted">Chưa có tài liệu nào.</p>}
      <ul className="doclist">
        {docs?.map((d) => (
          <li key={d.id}>
            {d.status === 'done' ? <Link to={`/documents/${d.id}`}>{d.title}</Link> : <span>{d.title}</span>}
            <span className={`badge ${d.status}`}>{STATUS[d.status] ?? d.status}</span>
            <span className="muted">{new Date(d.created_at).toLocaleString('vi-VN')}</span>
            {d.status === 'failed' && <p className="error">{d.error}</p>}
          </li>
        ))}
      </ul>
    </>
  )
}
