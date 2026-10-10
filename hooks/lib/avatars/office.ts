// Office: a person at a desk. The monitor mirrors what they are doing.
//
// The 16x20 canvas is split into zones so nothing piles up: the person sits on
// the left (x 0..9), the monitor stands on the right (x 10..15), and bubbles and
// flying things use the free corner above the monitor (x 9..15, y 0..6).

import type { Canvas } from '../canvas'
import { lift, mix, ramp } from '../canvas'
import * as fx from '../fx'
import type { Look, State } from '../types'

const OUT = 0x1f1828
const EYE = 0x1f1828
const MOUTH = 0x9c3040
const BLUSH = 0xff7a8a
const WHITE = 0xf4f6fa

export type Pal = Record<string, number>

/** Outline, hair, skin and shirt ramps for a person, keyed for `Canvas.art`. */
export function palette(look: Look): Pal {
  const hair = ramp(apart(lift(look.hair, 0x48), look.skin))
  const skin = ramp(look.skin)
  const shirt = ramp(look.col)
  return {
    o: OUT,
    h: hair.base, H: hair.light, j: hair.shadow,
    s: skin.base, S: skin.shadow, p: mix(skin.base, BLUSH, 0.45),
    c: shirt.base, C: shirt.shadow, L: shirt.light, D: shirt.deep,
    e: luma(look.skin) < 120 ? 0xfdf6e8 : EYE, m: MOUTH, w: WHITE,
  }
}

const luma = (c: number) => 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255)

/** Hair as bright as the skin melts into the face; push it lighter so the two read apart. */
function apart(hair: number, skin: number) {
  return Math.abs(luma(hair) - luma(skin)) < 45 ? mix(hair, 0xfff1c4, 0.3) : hair
}

// ---------- the person ----------

// Heads are drawn at (1, 3) in face coordinates, one row above where they land.
// The fill itself is rounded (not just the outline), so the shape still reads
// on a dark terminal where the outline disappears.
const HAIRCUTS: readonly (readonly string[])[] = [
  // short
  [
    '..oooo..',
    '.ohHHho.',
    'ohHhhhjo',
    'ohhjhhjo',
    'ohssssho',
    'osssssSo',
    'osssssSo',
    '.opsspo.',
    '..oooo..',
  ],
  // long, falling past the shoulders
  [
    '..oooo..',
    '.ohHHho.',
    'ohHhhhjo',
    'hhhhjhjj',
    'hhssssjj',
    'hsssssSj',
    'hsssssSj',
    'hopsspoj',
    'hHoooojj',
    'hh....jj',
    'h......j',
  ],
  // a bun on top
  [
    '...oo...',
    '..oHho..',
    '..oooo..',
    '.ohHHho.',
    'ohHhhhjo',
    'ohhhjhjo',
    'ohssssho',
    'osssssSo',
    'osssssSo',
    '.opsspo.',
    '..oooo..',
  ],
]

const TORSO = [
  'ocLSSLco',
  'occcccCo',
  'occcccCo',
  'occcccCo',
  'occcccCo',
]

/** Eyes and mouth, drawn over the head at (1, 3). */
function face(cv: Canvas, st: State, f: number, P: Pal) {
  const E = P.e!
  const blink = f % 18 === 0
  // dark skin gets a light glint on top of each eye, or the eyes vanish
  const eyes = (x1: number, x2: number, y: number) => {
    for (const x of [x1, x2]) {
      cv.px(x, y + 1, EYE)
      if (!blink) cv.px(x, y, P.e!)
    }
  }
  switch (st) {
    case 'idle':
      cv.rect(2, 9, 2, 1, P.S!)
      cv.rect(5, 9, 2, 1, P.S!)
      cv.px(6, 10, P.S!)
      return
    case 'thinking':
      // looking up, mouth to one side
      cv.px(4, 7, E)
      cv.px(6, 7, E)
      cv.px(6, 10, P.S!)
      return
    case 'reading':
    case 'skill':
      // looking down at what they hold
      cv.px(3, 9, E)
      cv.px(6, 9, E)
      cv.px(5, 10, P.S!)
      return
    case 'delegating':
      eyes(3, 6, 8)
      if (f % 2) cv.rect(4, 10, 2, 1, MOUTH)
      else cv.px(5, 10, MOUTH)
      return
    case 'waiting':
      eyes(3, 6, 8)
      cv.px(5, 10, MOUTH)
      return
    case 'done':
      for (const x of [2, 5]) {
        cv.px(x, 9, E)
        cv.px(x + 1, 8, E)
        cv.px(x + 2, 9, E)
      }
      cv.rect(4, 10, 2, 1, MOUTH)
      return
    case 'error':
      // squeezed shut, mouth wobbling
      cv.px(2, 8, E)
      cv.px(3, 9, E)
      cv.px(7, 8, E)
      cv.px(6, 9, E)
      cv.px(4 + (f % 2), 10, MOUTH)
      cv.px(5 - (f % 2), 10, E)
      return
    default:
      eyes(3, 6, 8)
      cv.px(5, 10, P.S!)
  }
}

/** Arms, hands and whatever they hold. */
function hands(cv: Canvas, st: State, t: number, f: number, P: Pal, col: number) {
  const s = P.s!
  const arm = { s, C: P.C! }
  const RAISED = ['s', 's', 'C', 'C', 'C', 'C', 'C']
  switch (st) {
    case 'writing':
    case 'running':
    case 'web':
      cv.art(2, 15, ['gKgKgKg', 'kkkkkkk'], { g: 0xd9dee7, K: 0xa9b1c0, k: 0x6f7889 })
      cv.px(3 + (f % 2), 14 + (f % 2), s)
      cv.px(6 + ((f + 1) % 2), 14 + ((f + 1) % 2), s)
      return
    case 'reading':
      cv.art(2, 11, ['wwwwww', 'wllllw', 'wlllww', 'wllllw', 'wwwwww'], { w: fx.PAPER, l: fx.PAPER_LINE })
      cv.px(1, 13, s)
      cv.px(8, 13, s)
      return
    case 'skill':
      fx.book(cv, t, 2, 13, col)
      cv.px(1, 14, s)
      cv.px(8, 14, s)
      return
    case 'thinking':
      // a fist under the chin
      cv.art(6, 10, ['ss.', '.CC', '..C'], arm)
      return
    case 'delegating':
      // a phone at the ear
      cv.art(8, 5, ['kk', 'kg', 'kk', 'ss', '.C', '.C'], { k: 0x2a2f3c, g: col, ...arm })
      return
    case 'waiting':
      cv.art(0, 4 + (Math.floor(t * 3) % 2), RAISED, arm)
      return
    case 'done': {
      const up = f % 2
      cv.art(0, 4 - up, RAISED, arm)
      cv.art(9, 4 - up, RAISED, arm)
      return
    }
    case 'error':
      // hands on the head
      cv.art(0, 5, ['ss', 'C.', 'C.', 'C.', 'C.', 'C.'], arm)
      cv.art(8, 5, ['ss', '.C', '.C', '.C', '.C', '.C'], arm)
      return
    case 'idle':
      cv.px(3, 15, s)
      return
  }
}

// ---------- the room ----------

const DESK = [
  'LLLLLLLLLLLLLLLL',
  'wwwwwwwwwwwwwwww',
  'dddddddddddddddd',
  '.DD..........DD.',
]
const WOOD = { L: 0xd39a64, w: 0xa86f45, d: 0x6e432b, D: 0x4a2c20 }

const MONITOR = [
  'BBBBBB',
  'B....b',
  'B....b',
  'B....b',
  'B....b',
  'B....b',
  'bbbbbb',
  '..nn..',
  '.ffff.',
]
const CASE = { B: 0x59627a, b: 0x3a4152, n: 0x2c3240, f: 0x3a4152 }

/** The 4x5 screen at (11, 9). */
function screen(cv: Canvas, st: State, t: number, f: number, col: number) {
  const x = 11
  const y = 9
  switch (st) {
    case 'writing': {
      cv.rect(x, y, 4, 5, 0x161b2e)
      const tones = [col, 0xff7eb6, 0x8be9fd, 0xf1fa8c]
      const s = Math.floor(t * 1.5)
      for (let i = 0; i < 4; i++) {
        const [ind, len] = CODE[(i + s) % CODE.length]!
        cv.rect(x + ind, y + i, len, 1, tones[(i + s) % tones.length]!)
      }
      if (f % 2) cv.px(x + (s % 3), y + 4, WHITE)
      return
    }
    case 'running': {
      cv.rect(x, y, 4, 5, 0x070c08)
      const s = Math.floor(t * 5)
      for (let i = 0; i < 4; i++) {
        const [ind, len] = CODE[(i + s) % CODE.length]!
        cv.rect(x + ind, y + i, len, 1, 0x1f7a3d)
      }
      cv.px(x, y + 4, 0x4ade80)
      if (f % 2) cv.px(x + 2, y + 4, 0x4ade80)
      return
    }
    case 'reading': {
      cv.rect(x, y, 4, 5, 0xeef1f6)
      const s = Math.floor(t * 1.2)
      for (let i = 0; i < 5; i++) {
        const len = [3, 4, 2, 4, 3, 1][(i + s) % 6]!
        if ((i + s) % 6 !== 5) cv.rect(x, y + i, len, 1, i === 2 ? col : 0xa3acbd)
      }
      return
    }
    case 'web':
      cv.rect(x, y, 4, 5, 0x0d1b3a)
      fx.globe(cv, t, x, y)
      cv.px(x + (f % 4), y + 4, 0x8be9fd)
      return
    case 'thinking': {
      cv.rect(x, y, 4, 5, 0x161b2e)
      const ring: Array<[number, number]> = [[1, 1], [2, 1], [2, 2], [1, 2]]
      const k = Math.floor(t * 6) % 4
      ring.forEach(([rx, ry], i) => cv.px(x + rx, y + 1 + ry, i === k ? WHITE : i === (k + 3) % 4 ? col : 0x2c3350))
      return
    }
    case 'delegating': {
      cv.rect(x, y, 4, 5, 0x161b2e)
      const k = Math.floor(t * 6) % 7
      cv.art(x, y + 4 - k, ['.c.', 'ccc', '.c.', '.c.'], { c: col })
      return
    }
    case 'skill': {
      cv.rect(x, y, 4, 5, 0x241a40)
      const big = f % 4 < 2
      if (big) cv.art(x, y + 1, ['.g.', 'gGg', '.g.'], { g: fx.GOLD, G: WHITE })
      else cv.px(x + 1, y + 2, fx.GOLD)
      cv.px(x + 3, y + (f % 3 === 0 ? 0 : 4), mix(col, WHITE, 0.4))
      return
    }
    case 'waiting':
      cv.rect(x, y, 4, 5, 0x1b2133)
      cv.art(x, y + 1, ['wwww', 'wllw', f % 2 ? 'GGRR' : 'ggrr'], { w: WHITE, l: 0xa3acbd, G: 0x4ade80, g: 0x2f9e5a, R: 0xf87171, r: 0xb04848 })
      return
    case 'done':
      cv.rect(x, y, 4, 5, 0x14532d)
      cv.art(x, y + 1, ['...c', '..c.', 'c.c.', '.c..'], { c: 0x86efac })
      return
    case 'error':
      cv.rect(x, y, 4, 5, f % 2 ? 0xc0262d : 0x7f1d1d)
      cv.art(x, y, ['w..w', '.ww.', '.ww.', 'w..w'], { w: WHITE })
      return
    default: {
      // idle: a starry screensaver
      cv.rect(x, y, 4, 5, 0x0b1020)
      const k = Math.floor(t * 2)
      cv.px(x + (k % 4), y + ((k * 3) % 5), 0x6a7aa8)
      cv.px(x + ((k + 2) % 4), y + ((k * 3 + 2) % 5), 0x3a4670)
    }
  }
}

const CODE: Array<[number, number]> = [[0, 3], [1, 3], [1, 2], [2, 2], [1, 3], [0, 1], [0, 4], [1, 2]]

// ---------- the scene ----------

export function drawOffice(cv: Canvas, st: State, t: number, look: Look) {
  const P = palette(look)
  const f = Math.floor(t * (st === 'running' ? 10 : 6))
  const hop = st === 'done' ? f % 2 : 0
  const nod = st === 'idle' && Math.floor(t * 0.8) % 2 ? 1 : 0

  cv.shifted(0, -hop, () => {
    cv.art(1, 11, TORSO, P)
    cv.shifted(0, nod - 1, () => {
      const cut = look.style ?? 0
      cv.art(1, cut === 2 ? 1 : 3, HAIRCUTS[cut % HAIRCUTS.length]!, P)
      face(cv, st, f, P)
    })
  })

  cv.art(0, 16, DESK, WOOD)
  cv.art(10, 8, MONITOR, CASE)
  screen(cv, st, t, f, look.col)
  cv.px(14, 14, st === 'idle' ? 0x3a4152 : st === 'error' ? 0xf87171 : 0x4ade80)

  cv.shifted(0, st === 'done' ? -hop : 0, () => hands(cv, st, t, f, P, look.col))

  switch (st) {
    case 'idle': {
      cv.art(7, 13, ['.ww', 'wmm', '.mm'], { w: 0xe8ecf2, m: 0xb9c0cc })
      const ph = (t * 0.9) % 1
      if (ph < 0.7) cv.px(8 + (Math.floor(t * 3) % 2), 12 - Math.round(ph * 3), 0xcfd5de)
      fx.zzz(cv, t, 10, 0x9aa3ad)
      break
    }
    case 'thinking':
      fx.thought(cv, t, 9, 0)
      break
    case 'delegating':
      fx.plane(cv, t, 9, 3)
      break
    case 'waiting':
      fx.question(cv, t, 10, 0, look.col)
      break
    case 'done':
      fx.confetti(cv, t)
      break
    case 'error':
      fx.sweat(cv, t, 9, 3)
      break
  }
}
