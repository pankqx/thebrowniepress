/** Brownie-press emblem: circular type around a brownie block. Decorative. */
export function Stamp({ className }: { className?: string }) {
  return (
    <svg className={`stamp ${className ?? ''}`} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs><path id="ring" d="M60,60 m-47,0 a47,47 0 1,1 94,0 a47,47 0 1,1 -94,0" /></defs>
      <text><textPath href="#ring" startOffset="0">THE BROWNIE PRESS • MADE TO SHARE • </textPath></text>
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" transform="translate(60 60)">
        <path d="M-22,-4 L0,-14 L22,-4 L22,8 L0,18 L-22,8 Z" />
        <path d="M-22,-4 L0,6 L22,-4 M0,6 L0,18" />
        <path d="M-14,-7 l8,4 M-4,-11 l6,3 M6,-4 l6,3" opacity=".7" />
      </g>
    </svg>
  )
}
