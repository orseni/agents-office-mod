// Slim characters: 20x10 pixels drawn with quadrant blocks, ten columns by
// five rows of terminal. Every state is told by the face, a prop and a few
// pixels of effect; the state's name is written beside them.
//
// A pixel is twice as tall as it is wide, so shapes are drawn twice as wide as
// they look. A terminal cell covers 2x2 pixels and shows two colors at most:
// the art keeps every cell to two colors, which is why an eye sits in a cell
// of skin only, the mouth shares the eyes' color, and the screens draw on the
// monitor's own dark instead of a third color.

import type { Canvas } from '../canvas'
import { mix, ramp, shade } from '../canvas'
import { GOLD, PAPER, WHITE } from '../fx'
import type { Look, State } from '../types'
import { palette } from './office'
import { METAL, VISOR } from './robot'

const INK = 0x1f1828
const SEA = 0x3a86ff
const LAND = 0x5ee08a
const TERM = 0x4ade80
const RED = 0xf05252
const PINK = 0xff6b9a
const DROP = 0x6cc8ff
const CONFETTI = [GOLD, LAND, 0x4ac6ff, PINK]
const Z = ['zzzzzz', '...zz.', '.zz...', 'zzzzzz']

/** Effects in the free corner beside a robot or a tamagotchi: x 14..19, y 0..5. */
function corner(cv: Canvas, st: State, t: number, col: number) {
  const x = 14
  const f = Math.floor(t * 6)
  switch (st) {
    case 'thinking': {
      // a cloud whose dots fill in
      const n = Math.floor(t * 3) % 4
      cv.art(x, 0, ['.wwww.', 'wwwwww', '.wwww.'], { w: WHITE })
      for (let i = 0; i < 3; i++) if (i < n) cv.px(x + 1 + i * 2, 1, INK)
      cv.px(x, 4, WHITE)
      return
    }
    case 'idle': {
      const ph = (t * 0.6) % 1
      if (ph < 0.8) cv.art(x, 2 - Math.round(ph * 2), Z, { z: 0xaab2c0 })
      return
    }
    case 'delegating': {
      const ph = (t * 1.1) % 1
      cv.art(x + Math.round(ph * 4) - 2, 4 - Math.round(ph * 4), ['..ww', 'www.'], { w: WHITE })
      return
    }
    case 'waiting':
      cv.art(x + 1, Math.floor(t * 2.5) % 2, ['.qq.', '...q', '..q.', '....', '..q.'], { q: col })
      return
    case 'skill': {
      const spots: Array<[number, number]> = [[1, 0], [4, 1], [2, 3], [5, 4]]
      spots.forEach(([sx, sy], i) => {
        if ((f + i) % 3 === 0) cv.px(x + sx, sy, GOLD)
        else if ((f + i) % 3 === 1) cv.px(x + sx, sy, mix(col, WHITE, 0.6))
      })
      return
    }
    case 'done':
      for (let k = 0; k < 4; k++) {
        const ph = (t * 0.9 + k / 4) % 1
        cv.px(x + ((k * 5 + 1) % 6), Math.round(ph * 5), CONFETTI[(k + f) % 4]!)
      }
      return
    case 'error':
      for (let k = 0; k < 2; k++) {
        const ph = (t * 1.1 + k / 2) % 1
        cv.art(x + 1 + k * 2, 3 - Math.round(ph * 3), ['ss'], { s: ph < 0.5 ? 0xb0b0b0 : 0x6f6f6f })
      }
      return
  }
}

// ---------- office ----------

// Person on x 0..11 (face x 2..9, rows 2-4), monitor on x 12..19, desk on the
// bottom two rows. Above the monitor, one row for sparks and planes.
const HAIRCUTS: readonly (readonly string[])[] = [
  // short
  ['...hHHhhh...', '..hhHHhhhj..'],
  // long, past the shoulders
  ['...hHHhhh...', '..hhHHhhhj..', '.h........j.', '.h........j.', '.h........j.', '.h........j.'],
  // a tuft on the side
  ['...hHHhhhhh.', '..hhHHhhhjj.'],
]

const SLAB = 0x2a3040
const MOUTH = 0x9c3040

export function slimOffice(cv: Canvas, st: State, t: number, look: Look) {
  const P = palette(look)
  const { col } = look
  const f = Math.floor(t * (st === 'running' ? 10 : 6))
  const hop = st === 'done' ? f % 2 : 0
  const rosy = mix(look.skin, 0xc0304a, 0.5)

  cv.shifted(0, -hop, () => {
    // shoulders, a bare neck, then the head: the gap beside the neck sets the head apart
    cv.art(1, 6, ['.LcccccccC', 'LccccccccC'], P)
    cv.art(5, 5, ['ss'], P)
    cv.art(2, 2, ['ssssssss', 'ssssssss', '.ssssss.'], P)
    cv.art(0, 0, HAIRCUTS[(look.style ?? 0) % HAIRCUTS.length]!, P)
    face(cv, st, f, P, rosy)
  })

  cv.art(0, 8, ['LLLLLLLLLLLLLLLLLLLL', 'wwwwwwwwwwwwwwwwwwww'], { L: 0xd39a64, w: 0xa06a43 })
  // the monitor is one dark slab with a lit top edge; screens draw straight on it
  cv.art(12, 1, ['BBBBBBBB', 'bbbbbbbb', 'bbbbbbbb', 'bbbbbbbb', 'bbbbbbbb', 'bbbbbbbb', '...bb...'], { B: 0x6a7389, b: SLAB })
  screen(cv, st, t, f, col)
  hands(cv, st, t, f, P, col, hop)

  // one row of effects over the monitor
  switch (st) {
    case 'done':
      for (let k = 0; k < 4; k++) cv.px(12 + ((k * 5 + f) % 8), 0, CONFETTI[(k + f) % 4]!)
      break
    case 'delegating':
      cv.art(12 + Math.floor(((t * 1.1) % 1) * 6), 0, ['www'], { w: WHITE })
      break
    case 'skill':
      cv.px(13 + ((f * 3) % 6), 0, f % 2 ? GOLD : WHITE)
      break
  }
}

/**
 * Eyes on row 2 at x 3 and 8, wide apart; a small mouth on row 3 at x 5. They
 * sit in different cells, so the mouth keeps its own color next to the skin.
 */
function face(cv: Canvas, st: State, f: number, P: Record<string, number>, mouth: number) {
  const E = P.e!
  const eyes = () => {
    cv.px(3, 2, E)
    cv.px(8, 2, E)
  }
  switch (st) {
    case 'idle':
      cv.rect(2, 2, 2, 1, P.S!)
      cv.rect(8, 2, 2, 1, P.S!)
      return
    case 'thinking':
      // eyes to the side, mouth pulled over
      cv.px(4, 2, E)
      cv.px(9, 2, E)
      cv.px(6, 3, mouth)
      return
    case 'reading':
    case 'skill':
      // looking down at what they hold
      cv.px(3, 3, E)
      cv.px(8, 3, E)
      return
    case 'done':
      cv.art(2, 2, ['.e....e.', 'e.e..e.e'], { e: E })
      cv.px(5, 3, MOUTH)
      return
    case 'error':
      cv.art(2, 2, ['e.e..e.e', '.e....e.'], { e: E })
      cv.px(5, 3, f % 2 ? MOUTH : mouth)
      return
    case 'delegating':
      eyes()
      cv.px(5, 3, f % 2 ? MOUTH : mouth)
      return
    default:
      if (f % 18 !== 0) eyes()
      cv.px(5, 3, mouth)
  }
}

function hands(cv: Canvas, st: State, t: number, f: number, P: Record<string, number>, col: number, hop: number) {
  const s = P.s!
  const arm = { s, C: P.C! }
  switch (st) {
    case 'writing':
    case 'running':
    case 'web':
      // the keyboard lies on the desk; the hands tap just above it
      cv.rect(2, 8, 9, 1, 0xb6bdc9)
      cv.px(3 + (f % 2), 7, s)
      cv.px(7 + ((f + 1) % 2), 7, s)
      return
    case 'reading':
      cv.art(3, 6, ['wllllw', 'wwwwww'], { w: PAPER, l: 0xa3acbd })
      return
    case 'skill':
      cv.art(2, 6, ['wwwwwwww', 'cccccccc'], { w: PAPER, c: shade(col, -0.3) })
      return
    case 'thinking':
      // a hand under the chin
      cv.rect(8, 6, 2, 1, s)
      return
    case 'delegating':
      cv.art(10, 1, ['kk', 'kk', 'kk', 'kk', 's.'], { k: 0x15181f, s })
      return
    case 'waiting':
      cv.art(0, Math.floor(t * 3) % 2, ['s', 's', 'C', 'C', 'C', 'C'], arm)
      return
    case 'done':
      cv.art(0, -hop, ['s', 's', 'C', 'C', 'C', 'C'], arm)
      cv.art(11, -hop, ['s', 's', 'C', 'C', 'C', 'C'], arm)
      return
    case 'error':
      // hands on the head
      cv.art(0, 1, ['ss', 'C.', 'C.', 'C.'], arm)
      cv.art(10, 1, ['ss', '.C', '.C', '.C'], arm)
      return
  }
}

/** Pictures on the monitor's dark, x 13..18, y 2..5. */
function screen(cv: Canvas, st: State, t: number, f: number, col: number) {
  const x = 13
  const y = 2
  switch (st) {
    case 'writing': {
      // two lines of code with a gap between, the second one being typed
      const s = Math.floor(t * 1.5)
      const [ind, len] = CODE[s % CODE.length]!
      cv.rect(x + ind, y, len, 1, col)
      cv.rect(x + 1, y + 2, (f % 5) + 1, 1, mix(col, WHITE, 0.35))
      return
    }
    case 'running': {
      // a prompt, then output scrolling below it
      cv.art(x, y, ['tt.ttt'], { t: TERM })
      const [, len] = CODE[Math.floor(t * 5) % CODE.length]!
      cv.rect(x, y + 2, len, 1, 0x2a9e52)
      if (f % 2) cv.rect(x, y + 3, 2, 1, TERM)
      return
    }
    case 'reading': {
      // a page scrolling by
      const s = Math.floor(t * 1.2)
      cv.rect(x + 1, y, 4, 4, PAPER)
      for (let i = 0; i < 4; i++) if ((i + s) % 2) cv.rect(x + 1, y + i, [3, 4, 2, 4, 3][(i + s) % 5]!, 1, 0xa3acbd)
      return
    }
    case 'web': {
      const k = Math.floor(t * 4)
      cv.art(x, y, ['.ssss.', 'ssssss', 'ssssss', '.ssss.'], { s: SEA })
      cv.px(x + 1 + (k % 4), y + 1, LAND)
      cv.px(x + 1 + ((k + 2) % 4), y + 2, LAND)
      return
    }
    case 'thinking': {
      // an hourglass that turns over now and then
      const full = Math.floor(t * 1.5) % 2
      cv.art(x + 1, y, ['cccc', full ? '.cc.' : '.c..', full ? '.c..' : '.cc.', 'cccc'], { c: col })
      return
    }
    case 'delegating': {
      const k = Math.floor(t * 6) % 7
      cv.art(x + 1, y + 4 - k, ['.cc.', 'cccc', '.cc.'], { c: col })
      return
    }
    case 'skill':
      cv.art(x, y, f % 4 < 2 ? ['..gg..', 'gggggg', '..gg..', '..gg..'] : ['......', '..gg..', '......', '......'], { g: GOLD })
      return
    case 'waiting':
      // a permission dialog: yes and no
      cv.art(x + 1, y, ['wwww', 'wllw', 'wwww', 'GGRR'], { w: WHITE, l: 0xa3acbd, G: f % 2 ? TERM : 0x2f9e5a, R: RED })
      return
    case 'done':
      cv.art(x, y, ['.....c', '....c.', 'c..c..', '.cc...'], { c: TERM })
      return
    case 'error':
      cv.rect(x + 1, y, 4, 4, f % 2 ? 0xc0262d : 0x7f1d1d)
      cv.art(x + 1, y, ['w..w', '.ww.', '.ww.', 'w..w'], { w: WHITE })
      return
    default:
      // idle: the screen dozes
      if ((t * 0.6) % 1 < 0.8) cv.art(x, y, Z, { z: 0x6a7aa8 })
  }
}

const CODE: Array<[number, number]> = [[0, 4], [1, 4], [1, 3], [2, 3], [1, 4], [0, 2], [0, 5], [1, 3]]

// ---------- robot ----------

// Robot on x 0..13 (head x 1..12), effects in the corner at x 14..19.
export function slimRobot(cv: Canvas, st: State, t: number, look: Look) {
  const { col } = look
  const body = ramp(col)
  const f = Math.floor(t * 6)
  const hop = st === 'done' ? f % 2 : 0
  const M = METAL
  const chest = st === 'error' ? RED : st === 'done' ? LAND : mix(col, WHITE, 0.6)

  cv.shifted(0, -hop, () => {
    const light =
      st === 'error' ? (f % 2 ? RED : 0x7a1f1f)
      : st === 'done' ? LAND
      : st === 'idle' ? shade(col, -0.5)
      : st === 'delegating' ? (Math.floor(t * 10) % 2 ? WHITE : col)
      : f % 6 < 3 ? col : mix(col, WHITE, 0.5)
    cv.art(6, 0, ['bb'], { b: light })
    const visor = st === 'error' ? 0x2a1018 : VISOR
    cv.art(1, 1, ['.HHmmmmmmmm.', 'mvvvvvvvvvvS', 'mvvvvvvvvvvS', 'mvvvvvvvvvvS', 'mvvvvvvvvvvS', '.SSSSSSSSSS.'], { ...M, v: visor })
    eyes(cv, st, t, f, col)
    // a short body; the steady chest light gets a cell to itself
    cv.art(4, 7, ['cccccC', 'ccbbcC'], { c: body.base, C: body.shadow, b: chest })
    cv.art(4, 9, ['DD..DD'], M)
    arms(cv, st, t, f, col)
  })
  corner(cv, st, t, col)
}

/** Eyes on the visor, x 2..11, y 2..5; each eye fills whole cells, so it never meets the frame. */
function eyes(cv: Canvas, st: State, t: number, f: number, col: number) {
  const pair = (rows: readonly string[], y: number, pal: Record<string, number>, lx = 4, rx = 8) => {
    cv.art(lx, y, rows, pal)
    cv.art(rx, y, rows, pal)
  }
  const E = { e: col }
  switch (st) {
    case 'idle':
      pair(['ee'], 4, { e: shade(col, -0.25) })
      return
    case 'thinking':
      pair(['ee', 'ee'], 2, E, 5, 9)
      return
    case 'reading': {
      const dx = Math.floor(t * 2) % 2
      pair(['ee', 'ee'], 3, E, 4 + dx, 8 + dx)
      return
    }
    case 'running':
      // the visor turns into a terminal
      cv.art(2, 2, ['tt..', '..tt', 'tt..'], { t: TERM })
      if (f % 2) cv.rect(6, 4, 4, 1, TERM)
      return
    case 'web': {
      const k = Math.floor(t * 4) % 2
      pair(k ? ['sl', 'ls'] : ['ls', 'sl'], 3, { s: SEA, l: LAND })
      return
    }
    case 'skill':
      pair(f % 4 < 2 ? ['.gg.', 'gggg', '.gg.'] : ['....', '.gg.', '....'], 2, { g: GOLD }, 2, 8)
      return
    case 'delegating':
      pair(['.ee.', 'e..e'], 3, E, 2, 8)
      return
    case 'waiting':
      if (f % 14 === 0) pair(['ee'], 4, E)
      else pair(['ee', 'ee', 'ee'], 2, E)
      return
    case 'done':
      pair(['.oo.', 'o..o'], 2, { o: LAND }, 2, 8)
      cv.rect(6, 4, 2, 1, LAND)
      return
    case 'error':
      pair(['r..r', '.rr.', 'r..r'], 2, { r: f % 2 ? RED : 0xb83a3a }, 2, 8)
      return
    default:
      if (f % 16 === 0) pair(['ee'], 4, E)
      else pair(['ee', 'ee'], 3, E)
  }
}

function arms(cv: Canvas, st: State, t: number, f: number, col: number) {
  const M = METAL
  switch (st) {
    case 'writing':
    case 'running': {
      cv.rect(0, 9, 14, 1, 0x434c63)
      const up = f % 2
      cv.art(2, 7, up ? ['mm'] : ['mm', 'DD'], M)
      cv.art(10, 7, up ? ['mm', 'DD'] : ['mm'], M)
      return
    }
    case 'reading':
      cv.art(2, 6, ['mwwwwwwwwm', '.wllllllw.', '.wwwwwwww.'], { ...M, w: PAPER, l: 0xa3acbd })
      return
    case 'skill':
      cv.art(2, 7, ['mwwwwwwwwm', '.cccccccc.'], { ...M, w: PAPER, c: shade(col, -0.3) })
      return
    case 'waiting':
      cv.art(2, 7, ['mm', 'DD'], M)
      cv.art(13, Math.floor(t * 3) % 2, ['D', 'm', 'm', 'm', 'm', 'm', 'm', 'm'], M)
      return
    case 'done':
    case 'error':
      cv.art(0, 1, ['D', 'm', 'm', 'm', 'm', 'm', 'm'], M)
      cv.art(13, 1, ['D', 'm', 'm', 'm', 'm', 'm', 'm'], M)
      return
    case 'delegating':
      cv.art(2, 7, ['mm', 'DD'], M)
      cv.art(10, 7, ['mmmD'], M)
      return
    default:
      cv.art(2, 7, ['mm', 'DD'], M)
      cv.art(10, 7, ['mm', 'DD'], M)
  }
}

// ---------- tamagotchi ----------

// A round creature on x 1..12, effects in the corner at x 14..19.
const BLOB = ['..cccccccc..', '.cccccccccC.', 'cccccccccccC', 'cccccccccccC', 'cccccccccccC', 'cccccccccccC', '.cccccccccC.', '..CCCCCCCC..']

export function slimTamagotchi(cv: Canvas, st: State, t: number, look: Look) {
  const f = Math.floor(t * 6)
  const base = st === 'error' ? shade(look.col, -0.45) : look.col
  const r = ramp(base)
  let dy = 0
  if (st === 'writing' || st === 'web' || st === 'delegating') dy = -(f % 2)
  if (st === 'running' || st === 'done') dy = -[0, 1, 1, 0][f % 4]!
  const squash = st === 'idle' && Math.floor(t * 1.2) % 2 ? 1 : 0
  const tilt = st === 'waiting' ? (Math.floor(t * 1.5) % 2 ? 2 : 0) : 0
  const P = { c: r.base, C: r.shadow, l: r.light }
  const k = { k: INK }

  cv.shifted(tilt, dy, () => {
    cv.art(2, squash, ['cc......cc'], P)
    cv.art(1, 1 + squash, squash ? BLOB.slice(1) : BLOB, P)
    cv.art(3, 9, ['CC....CC'], P)
    cv.art(4, 6, ['llllll'], P)
    const ey = 3 + squash
    switch (st) {
      case 'idle':
        cv.rect(3, ey + 1, 2, 1, r.deep)
        cv.rect(8, ey + 1, 2, 1, r.deep)
        break
      case 'done':
        cv.art(3, ey, ['.k...k.', 'k.k.k.k'], k)
        break
      case 'error':
        cv.art(3, ey, ['k.k.k.k', '.k...k.'], k)
        break
      case 'thinking':
      case 'waiting':
        cv.rect(4, ey - 1, 2, 2, INK)
        cv.rect(8, ey - 1, 2, 2, INK)
        break
      default:
        if (f % 18 === 0) {
          cv.rect(4, ey + 1, 2, 1, INK)
          cv.rect(8, ey + 1, 2, 1, INK)
        } else {
          cv.rect(4, ey, 2, 2, INK)
          cv.rect(8, ey, 2, 2, INK)
        }
    }
    if (st !== 'idle' && !(st === 'delegating' && f % 2)) cv.rect(6, ey + 2, 2, 1, INK)

    switch (st) {
      case 'writing':
      case 'running':
        cv.rect(1, 8, 12, 1, 0xaab3bf)
        cv.px(2 + (f % 10), 8, st === 'running' ? TERM : WHITE)
        break
      case 'reading':
        cv.art(3, 6, ['wwwwww', 'wllllw'], { w: PAPER, l: 0xa3acbd })
        break
      case 'skill':
        cv.art(3, 6, ['wwwwww', 'kkkkkk'], { w: PAPER, k: shade(look.col, -0.4) })
        break
      case 'web':
        cv.art(5, 6, Math.floor(t * 4) % 2 ? ['slls', 'ssss'] : ['ssls', 'slss'], { s: SEA, l: LAND })
        break
    }
  })
  if (st === 'running') cv.px(Math.floor(t * 4) % 2 ? 0 : 13, 2, DROP)
  corner(cv, st, t, look.col)
}
