import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { AdminApi } from './api'
import type { AdminData } from '../lib/types'

interface Toast { id: number; kind: 'ok' | 'err'; text: string }
interface ConfirmOpts { title: string; body: string; confirmLabel?: string; danger?: boolean }

interface Ctx {
  api: AdminApi
  data: AdminData
  reload: () => Promise<void>
  /** Runs a mutation, reports success/failure, and refreshes data. Returns true on success. */
  run: (fn: () => Promise<void>, okText?: string) => Promise<boolean>
  busy: boolean
  confirm: (o: ConfirmOpts) => Promise<boolean>
  toast: (kind: 'ok' | 'err', text: string) => void
}
const C = createContext<Ctx | null>(null)
export const useAdmin = (): Ctx => { const v = useContext(C); if (!v) throw new Error('AdminProvider missing'); return v }

export function AdminProvider({ api, children }: { api: AdminApi; children: ReactNode }) {
  const [data, setData] = useState<AdminData | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [dlg, setDlg] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  const reload = useCallback(async () => {
    try { setData(await api.loadAll()); setLoadErr(null) } catch (e) { setLoadErr((e as Error).message) }
  }, [api])
  useEffect(() => {
    let live = true
    api.loadAll().then((d) => live && setData(d), (e: Error) => live && setLoadErr(e.message))
    return () => { live = false }
  }, [api])

  const toast = useCallback((kind: 'ok' | 'err', text: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, kind, text }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'err' ? 9000 : 3500)
  }, [])

  const run: Ctx['run'] = useCallback(async (fn, okText) => {
    setBusy(true)
    try { await fn(); if (okText) toast('ok', okText); await reload(); return true }
    catch (e) { toast('err', (e as Error).message || 'Something went wrong. Your changes are still on screen.'); return false }
    finally { setBusy(false) }
  }, [reload, toast])

  const confirm: Ctx['confirm'] = useCallback((o) => new Promise((resolve) => setDlg({ ...o, resolve })), [])
  useEffect(() => { if (dlg) dialogRef.current?.showModal() }, [dlg])
  const close = (v: boolean) => { dialogRef.current?.close(); dlg?.resolve(v); setDlg(null) }

  if (loadErr) return (
    <div className="a-center"><div className="a-card" role="alert"><h1>Couldn’t load the dashboard</h1><p>{loadErr}</p><button className="a-btn" onClick={() => void reload()}>Try again</button></div></div>
  )
  if (!data) return <div className="a-center" aria-busy="true">Loading…</div>

  return (
    <C.Provider value={{ api, data, reload, run, busy, confirm, toast }}>
      {children}
      <div className="a-toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className={`a-toast ${t.kind}`} role={t.kind === 'err' ? 'alert' : 'status'}>{t.text}</div>)}</div>
      <dialog ref={dialogRef} className="a-dialog" onCancel={(e) => { e.preventDefault(); close(false) }} aria-labelledby="dlg-t">
        {dlg && (
          <form method="dialog" onSubmit={(e) => { e.preventDefault(); close(true) }}>
            <h2 id="dlg-t">{dlg.title}</h2>
            <p>{dlg.body}</p>
            <div className="a-row end">
              <button type="button" className="a-btn" onClick={() => close(false)} autoFocus>Cancel</button>
              <button type="submit" className={`a-btn ${dlg.danger ? 'danger' : 'primary'}`}>{dlg.confirmLabel ?? 'Confirm'}</button>
            </div>
          </form>
        )}
      </dialog>
    </C.Provider>
  )
}
