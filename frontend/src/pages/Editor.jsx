import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { api } from '../api.js'
import { toPreviewMarkdown } from '../mathDelims.js'

const REMARK = [remarkGfm, remarkMath]
// throwOnError: false renders a broken formula in red instead of crashing the preview.
const REHYPE = [[rehypeKatex, { throwOnError: false, strict: false }]]

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [doc, setDoc] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  // Deferred value keeps typing responsive while KaTeX re-renders the preview.
  const preview = useDeferredValue(content)
  const markdown = useMemo(() => toPreviewMarkdown(preview), [preview])
  const dirty = doc !== null && (content !== (doc.content ?? '') || title !== doc.title)

  // In-app navigation (links, back button) with unsaved edits; tab close is handled by beforeunload below.
  const deleted = useRef(false)
  const blocker = useBlocker(() => dirty && !deleted.current)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ thay đổi?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  useEffect(() => {
    api(`/api/documents/${id}`)
      .then((d) => {
        setDoc(d)
        setTitle(d.title)
        setContent(d.content ?? '')
      })
      .catch((e) => setMsg({ text: e.message, error: true }))
  }, [id])

  useEffect(() => {
    if (!dirty) return
    const warn = (e) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function run(action, doneText) {
    setBusy(true)
    setMsg(null)
    try {
      await action()
      if (doneText) setMsg({ text: doneText })
    } catch (e) {
      setMsg({ text: e.message, error: true })
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    await api(`/api/documents/${id}`, { method: 'PUT', body: { title, content } })
    setDoc((d) => ({ ...d, title, content }))
  }

  const download = () =>
    run(async () => {
      if (dirty) await save() // the server builds the .tex from the saved copy
      const blob = await (await api(`/api/documents/${id}/download`, { raw: true })).blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = title.replace(/\.[^.]+$/, '') + '.tex'
      a.click()
      URL.revokeObjectURL(a.href)
    })

  const remove = () => {
    if (!window.confirm(`Xoá "${doc.title}"? Không thể hoàn tác.`)) return
    run(async () => {
      await api(`/api/documents/${id}`, { method: 'DELETE' })
      deleted.current = true // nothing left to save, don't ask
      navigate('/', { replace: true })
    })
  }

  if (!doc) return msg ? <p role="alert" className="error">{msg.text}</p> : <p className="muted">Đang tải…</p>
  if (doc.status !== 'done') {
    return <p className={doc.status === 'failed' ? 'error' : 'muted'}>{doc.error || 'Tài liệu đang được xử lý…'}</p>
  }

  const isPdf = new URL(doc.original_url, window.location.href).pathname.toLowerCase().endsWith('.pdf')

  return (
    <>
      <div className="toolbar">
        <input aria-label="Tên tài liệu" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button disabled={busy || !dirty} onClick={() => run(save, 'Đã lưu')}>Lưu</button>
        <button disabled={busy} onClick={download}>Tải .tex</button>
        <button disabled={busy} className="danger" onClick={remove}>Xoá</button>
        <span role="status" className={msg?.error ? 'error' : 'muted'}>
          {msg?.text ?? (dirty ? 'Chưa lưu' : '')}
        </span>
      </div>

      <div className="editor">
        <section aria-label="Bản gốc">
          {isPdf ? <iframe src={doc.original_url} title="Bản gốc" /> : <img src={doc.original_url} alt="Bản gốc" />}
        </section>
        <textarea
          aria-label="Nội dung"
          spellCheck={false}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <section aria-label="Xem trước" className="preview">
          <ReactMarkdown remarkPlugins={REMARK} rehypePlugins={REHYPE}>
            {markdown}
          </ReactMarkdown>
        </section>
      </div>
    </>
  )
}
