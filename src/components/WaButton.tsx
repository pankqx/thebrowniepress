import { buildWhatsAppUrl } from '../lib/whatsapp'

export function WaButton({ number, message, children, className = 'btn btn-primary' }: { number: string; message: string; children: React.ReactNode; className?: string }) {
  const link = buildWhatsAppUrl(number, message)
  if (!link.ok) return <span className="hint">WhatsApp contact isn’t set up yet.</span>
  return <a className={className} href={link.url!} target="_blank" rel="noopener noreferrer">{children}</a>
}
