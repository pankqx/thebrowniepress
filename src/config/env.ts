const env = import.meta.env
export const SUPABASE_URL: string = (env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
export const SUPABASE_ANON_KEY: string = env.VITE_SUPABASE_ANON_KEY ?? ''
/** Public origin. Empty until a domain / preview URL is configured; then canonical + sitemap use it. */
export const SITE_URL: string = (env.VITE_SITE_URL ?? '').replace(/\/$/, '')

/** Social-sharing image path (under the public origin). Replace public/og-image.jpg or point this at another file. */
export const OG_IMAGE: string = env.VITE_OG_IMAGE ?? '/og-image.jpg'

export type DataMode = 'supabase' | 'demo' | 'unconfigured'
/**
 * supabase     – real backend (URL + anon key present)
 * demo         – browser-local sample data, NO real security (explicit VITE_DATA_MODE=demo, or `vite dev` without a backend)
 * unconfigured – production build with neither; public site shows a safe fallback, admin is disabled
 */
export const MODE: DataMode =
  env.VITE_DATA_MODE === 'demo'
    ? 'demo'
    : SUPABASE_URL && SUPABASE_ANON_KEY
      ? 'supabase'
      : env.DEV
        ? 'demo'
        : 'unconfigured'

export const PUBLIC_BUCKET = 'media-public'
export const PRIVATE_BUCKET = 'media-private'
