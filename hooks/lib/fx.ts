// Effects every avatar shares: speech and thought bubbles, props held in the
// hands, things that fly out, and the particles of the end states.

import type { Canvas } from './canvas'
import { shade } from './canvas'

export const WHITE = 0xf4f6fa
export const INK = 0x1a1d24
export const PAPER = 0xefe9da
export const PAPER_LINE = 0x9aa3ad
export const GOLD = 0xffd34d

/** A thought bubble with three dots filling in, its tail pointing down-left. */
export function thought(cv: Canvas, t: number, x: number, y: number) {
  cv.rect(x + 1, y, 5, 1, WHITE)
  cv.rect(x, y + 1, 7, 2, WHITE)
  cv.rect(x + 1, y + 3, 5, 1, WHITE)
  const n = Math.floor(t * 3) % 4
  for (let i = 0; i < 3; i++) cv.px(x + 1 + i * 2, y + 2, i < n ? INK : WHITE)
  cv.px(x, y + 4, WHITE)
  cv.px(x - 1, y + 5, shade(WHITE, -0.25))
}

/** A speech bubble holding a question mark, bobbing to draw the eye. */
export function question(cv: Canvas, t: number, x: number, y: number, col: number) {
  const bob = Math.floor(t * 2.5) % 2
  cv.shifted(0, bob, () => {
    cv.rect(x + 1, y, 4, 1, WHITE)
    cv.rect(x, y + 1, 6, 5, WHITE)
    cv.rect(x + 1, y + 6, 4, 1, WHITE)
    cv.px(x + 1, y + 7, WHITE)
    cv.px(x + 2, y + 1, col)
    cv.px(x + 3, y + 1, col)
    cv.px(x + 4, y + 2, col)
    cv.px(x + 3, y + 3, col)
    cv.px(x + 3, y + 5, col)
  })
}

/** A paper plane leaving toward the right edge: work handed to someone else. */
export function plane(cv: Canvas, t: number, x0: number, y: number) {
  const ph = (t * 1.1) % 1
  const x = x0 + Math.round(ph * (16 - x0))
  cv.px(x - 3, y + 1, shade(WHITE, -0.45))
  cv.px(x - 5, y + 1, shade(WHITE, -0.6))
  cv.rect(x, y, 3, 1, WHITE)
  cv.px(x + 1, y + 1, shade(WHITE, -0.3))
  cv.px(x, y - 1, WHITE)
}

/** Radio waves from a point, for an antenna or a phone. */
export function waves(cv: Canvas, t: number, x: number, y: number, col: number) {
  const n = Math.floor(t * 4) % 3
  for (let k = 0; k <= n; k++) {
    cv.px(x + 1 + k, y - 1 - k, shade(col, 0.2 * k))
    cv.px(x + 1 + k, y + 1 + k, shade(col, 0.2 * k))
    cv.px(x + 2 + k, y, shade(col, 0.2 * k))
  }
}

/** A sheet of paper with two lines of text. */
export function paper(cv: Canvas, x: number, y: number) {
  cv.rect(x, y, 5, 4, PAPER)
  cv.rect(x + 1, y + 1, 3, 1, PAPER_LINE)
  cv.rect(x + 1, y + 2, 2, 1, PAPER_LINE)
}

/** An open book in the agent's color, with sparkles: a skill being consulted. */
export function book(cv: Canvas, t: number, x: number, y: number, col: number) {
  cv.rect(x, y, 3, 2, PAPER)
  cv.rect(x + 3, y, 3, 2, shade(PAPER, -0.1))
  cv.px(x + 1, y, PAPER_LINE)
  cv.px(x + 4, y + 1, PAPER_LINE)
  cv.rect(x, y + 2, 6, 1, col)
  cv.px(x + 2, y + 2, shade(col, -0.35))
  cv.px(x + 3, y + 2, shade(col, -0.35))
  const spots: Array<[number, number]> = [[x - 1, y - 2], [x + 3, y - 3], [x + 6, y - 1], [x + 1, y - 4]]
  const f = Math.floor(t * 5)
  spots.forEach(([sx, sy], i) => {
    if ((f + i) % 3 === 0) cv.px(sx, sy, GOLD)
    else if ((f + i) % 3 === 1) cv.px(sx, sy, shade(col, 0.6))
  })
}

/** A small spinning globe: the web. */
export function globe(cv: Canvas, t: number, x: number, y: number) {
  const SEA = 0x3a86ff
  const LAND = 0x5ee08a
  cv.rect(x + 1, y, 2, 1, SEA)
  cv.rect(x, y + 1, 4, 2, SEA)
  cv.rect(x + 1, y + 3, 2, 1, SEA)
  const k = Math.floor(t * 4)
  cv.px(x + (k % 4), y + 1, LAND)
  cv.px(x + ((k + 1) % 4), y + 2, LAND)
  cv.px(x + 1 + (k % 2), y + (k % 2 ? 0 : 3), LAND)
}

/** A big Z drifting up with a small one trailing behind: asleep. */
export function zzz(cv: Canvas, t: number, x: number, c: number) {
  const ph = (t * 0.6) % 1
  const y = Math.round(3 - ph * 3)
  if (ph < 0.85) cv.art(x, y, ['zzzz', '..z.', '.z..', 'zzzz'], { z: c })
  if (ph > 0.35) cv.art(x - 2, y + 5, ['zzz', '.z.', 'zzz'], { z: shade(c, -0.35) })
}

export function confetti(cv: Canvas, t: number) {
  const cs = [GOLD, 0x5ee08a, 0x4ac6ff, 0xff6b9a]
  for (let k = 0; k < 6; k++) {
    const ph = (t * 0.9 + k / 6) % 1
    cv.px((k * 5 + 1) % 16, Math.round(ph * 8), cs[k % 4]!)
  }
}

export function heart(cv: Canvas, x: number, y: number, c: number) {
  cv.px(x, y, c)
  cv.px(x + 2, y, c)
  cv.rect(x, y + 1, 3, 1, c)
  cv.px(x + 1, y + 2, c)
}

export function smoke(cv: Canvas, t: number, x: number) {
  for (let k = 0; k < 3; k++) {
    const ph = (t * 1.1 + k / 3) % 1
    if (ph > 0.85) continue
    cv.rect(x + (k % 2), Math.round(5 - ph * 5), 2, 2, ph < 0.4 ? 0xb0b0b0 : 0x7a7a7a)
  }
}

export function sweat(cv: Canvas, t: number, x: number, y: number) {
  cv.px(x, y + Math.round(((t * 1.5) % 1) * 3), 0x6cc8ff)
}

/** A ring of sparkles for an agent that just arrived. */
export function arrival(cv: Canvas, age: number) {
  if (age > 1.2) return
  const r = Math.round(2 + age * 6)
  const pts: Array<[number, number]> = [[8, 10 - r], [8 + r, 10], [8, 10 + r], [8 - r, 10], [8 + r - 2, 10 - r + 2], [8 - r + 2, 10 + r - 2]]
  for (const [x, y] of pts) cv.px(x, y, age < 0.6 ? GOLD : WHITE)
}
