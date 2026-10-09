import { useEffect, useState, type ReactNode } from 'react'
import { Media } from '../components/Media'
import type { AdminApi, Bucket } from './api'

export function AdminImage({ api, path, bucket, alt }: { api: AdminApi; path: string; bucket: Bucket; alt: string }) {
  const [url, setUrl] = useState<string | null>(path.startsWith('static:') ? null : '')
  const [err, setErr] = useState(false)
  useEffect(() => {
    let live = true
    if (path.startsWith('static:')) return
    api.previewUrl(path, bucket).then((u) => live && setUrl(u), () => live && setErr(true))
    return () => { live = false }
  }, [api, path, bucket])
  if (path.startsWith('static:')) return <Media path={path} alt={alt} sizes="240px" />
  if (err) return <div className="img-fallback">Preview unavailable</div>
  if (!url) return <div className="skeleton" style={{ minHeight: 120 }} />
  return <img src={url} alt={alt} loading="lazy" decoding="async" onError={() => setErr(true)} />
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className="a-field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <p className="a-hint">{hint}</p>}
      {error && <p className="a-err" role="alert">{error}</p>}
    </div>
  )
}

export function Badge({ kind, children }: { kind: 'ok' | 'warn' | 'off' | 'sample'; children: ReactNode }) {
  return <span className={`a-badge ${kind}`}>{children}</span>
}

/** Moves an item one place up/down and returns the new id order. */
export function moved<T extends { id: string }>(list: T[], id: string, dir: -1 | 1): string[] {
  const ids = list.map((x) => x.id)
  const i = ids.indexOf(id), j = i + dir
  if (i < 0 || j < 0 || j >= ids.length) return ids
  ;[ids[i], ids[j]] = [ids[j], ids[i]]
  return ids
}
