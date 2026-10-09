// Build-time only (used by scripts/prerender.mjs): renders the first paint of the home page to static HTML so the
// header, headline and hero image show before any JavaScript runs. The client replaces it with the live app.
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { App } from './App'

export function render(url: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>,
  )
}
