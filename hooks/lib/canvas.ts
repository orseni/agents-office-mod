// A tiny pixel canvas. Sprites are drawn on a pixel grid and packed into
// terminal cells. Large sprites are 16x20 pixels, two per cell with the
// upper/lower half blocks (16x10 cells). Slim ones are 20x10 pixels, four per
// cell with the quadrant blocks (10x5 cells): twice the detail across in the
// same room, with pixels twice as tall as they are wide. (`Raster` only takes
// characters of the Basic Multilingual Plane, which rules out the sextants.)
// A cell holds two colors at most, so a quadrant cell keeps the two that cover
// most of it and moves any other pixel to the nearer of them.

export const W = 16
export const H = 20
export const COLS = W
export const ROWS = H / 2
export const SLIM_W = 20
export const SLIM_H = 10

/** Pixels per terminal cell: half blocks are 1x2, quadrants 2x2. */
export type CellShape = { w: 1; h: 2 } | { w: 2; h: 2 }
export const HALF: CellShape = { w: 1, h: 2 }
export const QUADRANT: CellShape = { w: 2, h: 2 }

/** Terminal default color, as `Raster` cells spell it. */
const DEFAULT = 0x01000000

export class Canvas {
  readonly fb: Int32Array
  readonly w: number
  readonly h: number
  /** Horizontal and vertical offset applied to every draw call. */
  ox = 0
  oy = 0

  readonly cell: CellShape

  constructor(w = W, h = H, cell: CellShape = HALF) {
    this.w = w
    this.h = h
    this.cell = cell
    this.fb = new Int32Array(w * h)
  }

  clear() {
    this.fb.fill(-1)
    this.ox = 0
    this.oy = 0
  }

  rect(x: number, y: number, w: number, h: number, c: number) {
    for (let j = 0; j < h; j++) {
      const yy = y + j + this.oy
      if (yy < 0 || yy >= this.h) continue
      for (let i = 0; i < w; i++) {
        const xx = x + i + this.ox
        if (xx < 0 || xx >= this.w) continue
        this.fb[yy * this.w + xx] = c
      }
    }
  }

  px(x: number, y: number, c: number) {
    this.rect(x, y, 1, 1, c)
  }

  /** Draws pixel art written as text rows: each character is a key of `pal`, anything else is transparent. */
  art(x: number, y: number, rows: readonly string[], pal: Readonly<Record<string, number>>) {
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j]!
      for (let i = 0; i < row.length; i++) {
        const c = pal[row[i]!]
        if (c !== undefined) this.px(x + i, y + j, c)
      }
    }
  }

  /** Runs `draw` with the offset moved by (dx, dy), then restores it. */
  shifted(dx: number, dy: number, draw: () => void) {
    this.ox += dx
    this.oy += dy
    try {
      draw()
    } finally {
      this.ox -= dx
      this.oy -= dy
    }
  }

  get(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1
    return this.fb[y * this.w + x] ?? -1
  }
}

/** Packs the canvas into `Raster` cells: base64 of [codePoint, fg, bg] u32 triplets. */
export function encode(cv: Canvas): string {
  const { w: cw, h: ch } = cv.cell
  const cols = Math.ceil(cv.w / cw)
  const rows = Math.ceil(cv.h / ch)
  const words = new Uint32Array(cols * rows * 3)
  const px = new Array<number>(cw * ch)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) px[j * cw + i] = cv.get(c * cw + i, r * ch + j)
      const [fg, bg] = twoColors(px)
      let mask = 0
      px.forEach((p, k) => {
        if (fg >= 0 && nearer(p, fg, bg)) mask |= 1 << k
      })
      words.set([glyph(cv.cell, mask), fg >= 0 ? fg : DEFAULT, bg >= 0 ? bg : DEFAULT], (r * cols + c) * 3)
    }
  }
  return toBase64(new Uint8Array(words.buffer))
}

/** The canvas as the terminal shows it: every cell cut down to its two colors. For previews. */
export function flatten(cv: Canvas): Int32Array {
  const { w: cw, h: ch } = cv.cell
  const out = new Int32Array(cv.w * cv.h)
  const px = new Array<number>(cw * ch)
  for (let y0 = 0; y0 < cv.h; y0 += ch)
    for (let x0 = 0; x0 < cv.w; x0 += cw) {
      for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) px[j * cw + i] = cv.get(x0 + i, y0 + j)
      const [fg, bg] = twoColors(px)
      for (let j = 0; j < ch; j++)
        for (let i = 0; i < cw; i++) {
          if (x0 + i >= cv.w || y0 + j >= cv.h) continue
          out[(y0 + j) * cv.w + x0 + i] = fg >= 0 && nearer(px[j * cw + i]!, fg, bg) ? fg : bg
        }
    }
  return out
}

/** The two colors a cell keeps: the most common ones, transparency (-1) counting as a color. */
function twoColors(px: readonly number[]): [number, number] {
  const count = new Map<number, number>()
  for (const p of px) count.set(p, (count.get(p) ?? 0) + 1)
  const ranked = [...count].sort((a, b) => b[1] - a[1]).map(e => e[0])
  const a = ranked[0]!
  const b = ranked[1] ?? -1
  // the foreground must be a real color; transparency can only be the background
  return a < 0 ? [b, a] : [a, b]
}

/** Whether pixel `p` lands on the foreground `fg` rather than the background `bg`. */
function nearer(p: number, fg: number, bg: number) {
  if (p === fg) return true
  if (p === bg) return false
  if (bg < 0) return p >= 0 // a stray color next to transparency keeps the shape
  if (p < 0) return false
  return dist(p, fg) <= dist(p, bg)
}

function dist(a: number, b: number) {
  const dr = ((a >> 16) & 255) - ((b >> 16) & 255)
  const dg = ((a >> 8) & 255) - ((b >> 8) & 255)
  const db = (a & 255) - (b & 255)
  return 2 * dr * dr + 4 * dg * dg + 3 * db * db
}

/** The block character drawing `mask` (bit k = pixel k, row by row) in the foreground. */
function glyph(cell: CellShape, mask: number) {
  return (cell.w === 1 ? HALVES : QUADRANTS)[mask]!
}

const HALVES = [0x20, 0x2580, 0x2584, 0x2588]
// ' ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█'
const QUADRANTS = [0x20, 0x2598, 0x259d, 0x2580, 0x2596, 0x258c, 0x259e, 0x259b, 0x2597, 0x259a, 0x2590, 0x259c, 0x2584, 0x2599, 0x259f, 0x2588]

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
function toBase64(bytes: Uint8Array): string {
  const native = (bytes as unknown as { toBase64?: () => string }).toBase64
  if (typeof native === 'function') return native.call(bytes)
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1] ?? 0
    const c = bytes[i + 2] ?? 0
    const n = (a << 16) | (b << 8) | c
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63]! : '='
    out += i + 2 < bytes.length ? B64[n & 63]! : '='
  }
  return out
}

export const hex = (s: string) => parseInt(s.replace('#', ''), 16)
export const toHex = (c: number) => '#' + c.toString(16).padStart(6, '0')

/** Moves a color toward black (amt < 0) or white (amt > 0). */
export function shade(c: number, amt: number) {
  const m = amt < 0 ? 0 : 255
  const k = Math.abs(amt)
  const ch = (v: number) => Math.round(v + (m - v) * k)
  return (ch((c >> 16) & 255) << 16) | (ch((c >> 8) & 255) << 8) | ch(c & 255)
}

/** Blends `a` toward `b` by `k` (0..1). */
export function mix(a: number, b: number, k: number) {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k)
  return (ch(16) << 16) | (ch(8) << 8) | ch(0)
}

const COOL = 0x2b1d5c
const WARM = 0xfff1c4

/** A shading ramp for one material, hue-shifted the way pixel artists do: shadows lean cool, lights lean warm. */
export function ramp(c: number) {
  return {
    light: mix(c, WARM, 0.45),
    base: c,
    shadow: mix(shade(c, -0.3), COOL, 0.25),
    deep: mix(shade(c, -0.55), COOL, 0.35),
  }
}

/** Raises a color that would vanish on a dark terminal to a minimum brightness, keeping its hue. */
export function lift(c: number, min = 0x40) {
  const r = (c >> 16) & 255
  const g = (c >> 8) & 255
  const b = c & 255
  const l = Math.max(r, g, b)
  if (l >= min) return c
  const k = (min - l) / 255
  return mix(c, 0x6a6488, k * 2.2)
}
