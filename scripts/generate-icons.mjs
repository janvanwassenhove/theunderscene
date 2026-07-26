/**
 * Generates the PWA icon set with no image dependencies — raw RGBA buffers
 * encoded as PNG through Node's built-in zlib. Keeping this in-repo means the
 * icons are reproducible from source instead of being opaque binaries nobody
 * can regenerate.
 *
 * The mark: a dug isometric tile with a glowing underscore beneath it.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

const INK = [13, 11, 16, 255]
const PAPER = [239, 230, 212, 255]
const ACCENT = [255, 77, 90, 255]
const GOLD = [255, 209, 102, 255]

function crc32(buf) {
  let c
  const table = crc32.table ?? (crc32.table = buildTable())
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff
    crc = (crc >>> 8) ^ table[c]
  }
  return (crc ^ 0xffffffff) >>> 0
}

function buildTable() {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData), 0)
  return Buffer.concat([length, typeAndData, crc])
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

class Canvas {
  constructor(size) {
    this.size = size
    this.data = Buffer.alloc(size * size * 4)
  }

  fill(color) {
    for (let i = 0; i < this.size * this.size; i++) {
      this.data.set(color, i * 4)
    }
  }

  /** Alpha-blends a pixel; `a` is 0..1 coverage on top of the stored colour. */
  blend(x, y, color, a = 1) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size || a <= 0) return
    const i = (y * this.size + x) * 4
    for (let c = 0; c < 3; c++) {
      this.data[i + c] = Math.round(this.data[i + c] * (1 - a) + color[c] * a)
    }
    this.data[i + 3] = Math.max(this.data[i + 3], Math.round(255 * a))
  }

  rect(x0, y0, w, h, color) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) this.blend(x, y, color)
    }
  }

  /** Isometric diamond, 2:1, with 2× supersampling for clean edges. */
  diamond(cx, cy, halfW, color) {
    const halfH = halfW / 2
    for (let y = Math.floor(cy - halfH) - 1; y <= Math.ceil(cy + halfH) + 1; y++) {
      for (let x = Math.floor(cx - halfW) - 1; x <= Math.ceil(cx + halfW) + 1; x++) {
        let hits = 0
        for (const [ox, oy] of [
          [0.25, 0.25],
          [0.75, 0.25],
          [0.25, 0.75],
          [0.75, 0.75],
        ]) {
          const dx = Math.abs(x + ox - cx) / halfW
          const dy = Math.abs(y + oy - cy) / halfH
          if (dx + dy <= 1) hits++
        }
        if (hits) this.blend(x, y, color, hits / 4)
      }
    }
  }
}

function drawIcon(size, { maskable }) {
  const canvas = new Canvas(size)
  canvas.fill(INK)
  const u = size / 512
  // Maskable icons need their content inside the safe circle (80% of the canvas).
  const scale = maskable ? 0.68 : 0.86
  const cx = size / 2
  const cy = size / 2 - 18 * u

  canvas.diamond(cx, cy, 190 * u * scale, ACCENT)
  canvas.diamond(cx, cy + 10 * u * scale, 150 * u * scale, INK)
  canvas.diamond(cx, cy + 6 * u * scale, 96 * u * scale, GOLD)

  const barW = 236 * u * scale
  const barH = 34 * u * scale
  canvas.rect(Math.round(cx - barW / 2), Math.round(cy + 150 * u * scale), Math.round(barW), Math.round(barH), PAPER)

  return encodePng(size, size, canvas.data)
}

mkdirSync(OUT_DIR, { recursive: true })
const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, true],
]

for (const [name, size, maskable] of targets) {
  writeFileSync(join(OUT_DIR, name), drawIcon(size, { maskable }))
  console.log(`icons: ${name} (${size}×${size})`)
}
