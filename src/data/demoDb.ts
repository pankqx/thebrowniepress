// Browser-local demo database. NOT secure and NOT shared between visitors:
// it exists so the storefront and dashboard can be evaluated without a backend.
import seed from './seed.json'
import type { AdminData } from '../lib/types'

const KEY = 'bp-demo-db-v1'

export function loadDemo(): AdminData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as AdminData
  } catch { /* storage may be unavailable */ }
  return structuredClone(seed) as unknown as AdminData
}

let memory: AdminData | null = null
export function getDemo(): AdminData {
  if (!memory) memory = loadDemo()
  return memory
}
export function saveDemo(db: AdminData): void {
  memory = db
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* quota or blocked: keep in memory */ }
}
export function resetDemo(): AdminData {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
  memory = null
  return getDemo()
}
