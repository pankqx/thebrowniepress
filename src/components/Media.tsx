import { useState, type CSSProperties } from 'react'
import manifest from '../data/imageManifest.json'
import { PUBLIC_BUCKET, SUPABASE_URL } from '../config/env'

type M = Record<string, { widths: number[]; ratio: [number, number] }>
const MAN = manifest as unknown as M

export function mediaUrl(path: string): string {
  if (path.startsWith('data:') || path.startsWith('http') || path.startsWith('blob:')) return path
  return `${SUPABASE_URL}/storage/v1/object/public/${PUBLIC_BUCKET}/${path}`
}

interface Props {
  path: string
  alt: string
  sizes?: string
  priority?: boolean
  className?: string
  style?: CSSProperties
}

/** Responsive, lazy image with a graceful fallback. `static:<name>` resolves to bundled AVIF/WebP placeholders. */
export function Media({ path, alt, sizes = '100vw', priority, className, style }: Props) {
  const [failed, setFailed] = useState(false)
  if (failed) return <div className="img-fallback" role="img" aria-label={alt || 'Image unavailable'}>Image unavailable</div>
  const common = {
    alt,
    className,
    style,
    decoding: 'async' as const,
    loading: priority ? ('eager' as const) : ('lazy' as const),
    fetchPriority: priority ? ('high' as const) : undefined,
    onError: () => setFailed(true),
  }
  if (path.startsWith('static:')) {
    const name = path.slice(7)
    const m = MAN[name]
    if (!m) return <div className="img-fallback">Image unavailable</div>
    const set = (ext: string) => m.widths.map((w) => `/img/${name}-${w}.${ext} ${w}w`).join(', ')
    const largest = m.widths[m.widths.length - 1]
    const h = Math.round((m.ratio[1] / m.ratio[0]) * largest)
    return (
      <picture>
        <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
        <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
        <img src={`/img/${name}-${largest}.webp`} srcSet={set('webp')} sizes={sizes} width={largest} height={h} {...common} />
      </picture>
    )
  }
  return <img src={mediaUrl(path)} {...common} />
}
