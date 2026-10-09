import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadPublic } from './publicSource'
import type { PublicData } from '../lib/types'

type State =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: PublicData; error: null }
  | { status: 'error'; data: null; error: string }

interface Ctx { state: State; reload: () => void }
const C = createContext<Ctx | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading', data: null, error: null })
  const [n, setN] = useState(0)
  const reload = useCallback(() => { setState({ status: 'loading', data: null, error: null }); setN((x) => x + 1) }, [])
  useEffect(() => {
    let live = true
    loadPublic().then(
      (data) => live && setState({ status: 'ready', data, error: null }),
      (e: Error) => live && setState({ status: 'error', data: null, error: e.message || 'Something went wrong.' }),
    )
    return () => { live = false }
  }, [n])
  const value = useMemo(() => ({ state, reload }), [state, reload])
  return <C.Provider value={value}>{children}</C.Provider>
}

export function useData(): Ctx {
  const v = useContext(C)
  if (!v) throw new Error('DataProvider missing')
  return v
}
