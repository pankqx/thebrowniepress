import type { ReactNode } from 'react'
import { useData } from '../data/DataContext'
import type { PublicData } from '../lib/types'

/** Renders children once public data is loaded; otherwise a reserved-height skeleton or a recoverable error. */
export function Gate({ children, minHeight = 0 }: { children: (d: PublicData) => ReactNode; minHeight?: number }) {
  const { state, reload } = useData()
  if (state.status === 'loading') return <div className="wrap" style={{ padding: '40px var(--gutter)' }}><div className="skeleton" style={{ minHeight: minHeight || '85vh' }} aria-busy="true" aria-label="Loading" /></div>
  if (state.status === 'error')
    return (
      <div className="wrap" style={{ padding: '56px var(--gutter)' }}>
        <div className="empty" role="alert">
          <h2>Can’t load right now</h2>
          <p className="muted">{state.error}</p>
          <p style={{ marginTop: 16 }}><button className="btn" onClick={reload}>Try again</button></p>
        </div>
      </div>
    )
  return <>{children(state.data)}</>
}

export function SectionHead({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="section-head">
      <div><span className="kicker">{kicker}</span><h2 className="display">{title}</h2></div>
      {children}
    </div>
  )
}
