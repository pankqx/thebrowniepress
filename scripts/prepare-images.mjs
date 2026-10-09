// Generates responsive AVIF/WebP images from assets/source into public/img.
// All source images are PLACEHOLDERS derived from the owner's reference posters
// (AI-style artwork). They are NOT photographs of the owner's brownies and must be
// replaced through the admin dashboard. See docs/DESIGN.md.
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'

const S = 'assets/source/'
const OUT = 'public/img/'
mkdirSync(OUT, { recursive: true })

const jobs = [
  { name: 'hero', src: 'poster-white.jpg', box: [630, 385, 624, 730], widths: [480, 624] },
  { name: 'stack-dark', src: 'poster-red.png', box: [800, 1000, 900, 900], widths: [480, 900] },
  { name: 'texture', src: 'poster-white.jpg', box: [640, 520, 520, 460], widths: [360, 520] },
  { name: 'drip', src: 'poster-white.jpg', box: [600, 752, 654, 380], widths: [480, 654] },
  { name: 'p-triple', src: 'menu-reference.jpg', box: [44, 487, 338, 278], widths: [338] },
  { name: 'p-cheesecake', src: 'menu-reference.jpg', box: [44, 787, 338, 274], widths: [338] },
  { name: 'p-ganache', src: 'menu-reference.jpg', box: [44, 1086, 338, 268], widths: [338] },
]

const manifest = {}
for (const j of jobs) {
  const [left, top, width, height] = j.box
  const base = sharp(S + j.src).extract({ left, top, width, height })
  for (const w of j.widths) {
    const h = Math.round((height / width) * w)
    const resized = base.clone().resize(w, h, { fit: 'fill' })
    await resized.clone().avif({ quality: 52, effort: 6 }).toFile(`${OUT}${j.name}-${w}.avif`)
    await resized.clone().webp({ quality: 78, effort: 6 }).toFile(`${OUT}${j.name}-${w}.webp`)
  }
  manifest[j.name] = { widths: j.widths, ratio: [width, height] }
}

// Logo / favicon / social image (logo reference supplied by the owner)
await sharp(S + 'logo-red.jpg').resize(192, 192).png({ compressionLevel: 9 }).toFile('public/icon-192.png')
await sharp(S + 'logo-red.jpg').resize(512, 512).webp({ quality: 85 }).toFile(OUT + 'logo-512.webp')
await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#B71919' } })
  .composite([{ input: await sharp(S + 'logo-red.jpg').resize(630, 630).toBuffer(), gravity: 'center' }])
  .jpeg({ quality: 82, mozjpeg: true }).toFile('public/og-image.jpg')

writeFileSync('src/data/imageManifest.json', JSON.stringify(manifest, null, 2))
console.log('images done')
