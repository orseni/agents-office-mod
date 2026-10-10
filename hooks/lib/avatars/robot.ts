// Robot: a TV-headed bot. Its visor is the face, and the eyes on it turn into
// whatever the robot is busy with: a prompt while running, globes on the web,
// stars over a skill. Bubbles use the corner above the head's right side.

import type { Canvas } from '../canvas'
import { mix, ramp, shade } from '../canvas'
import * as fx from '../fx'
import type { Look, State } from '../types'

const OUT = 0x1f1828
export const METAL = { o: OUT, H: 0xf2f5fa, m: 0xc3ccd9, S: 0x8691a8, D: 0x5a6280 }
export const VISOR = 0x141a2c
const VISOR_GLARE = 0x2a3352
const OK = 0x5ee08a
const BAD = 0xff5a5a
const TERM = 0x4ade80

const HEAD = [
  '..oooooooo..',
  '.oHHHmmmmmo.',
  'oHmvvvvvvmSo',
  'oHvgvvvvvvSo',
  'omvvvvvvvvSo',
  'omvvvvvvvvSo',
  'omSvvvvvvSSo',
  '.oSSSSSSSSo.',
  '..oooooooo..',
]

const BODY = [
  '..onno..',
  'oLLcccCo',
  'oLcbbcCo',
  'oLcbbcCo',
  'occcccCo',
  '.oCCCCo.',
]

const LEGS = [
  '.oSo..oSo.',
  'oDDDo.oDDDo',
]

export function drawRobot(cv: Canvas, st: State, t: number, look: Look) {
  const { col } = look
  const body = ramp(col)
  const f = Math.floor(t * 6)
  const hop = st === 'done' ? [0, 1, 2, 1][f % 4]! : 0
  const nod = st === 'idle' && Math.floor(t * 0.8) % 2 ? 1 : 0

  cv.shifted(0, -hop, () => {
    cv.art(3, 18, LEGS, METAL)
    cv.art(4, 12, BODY, { ...METAL, n: METAL.D, c: body.base, L: body.light, C: body.shadow, b: badge(st, col) })

    cv.shifted(0, nod, () => {
      antenna(cv, st, t, f, col)
      cv.art(2, 3, HEAD, { ...METAL, v: st === 'error' ? 0x2a1018 : VISOR, g: VISOR_GLARE })
      // ear bolts
      cv.art(1, 6, ['S', 'D'], METAL)
      cv.art(14, 6, ['S', 'D'], METAL)
      eyes(cv, st, t, f, col)
    })

    arms(cv, st, t, f, col)
  })

  switch (st) {
    case 'idle':
      fx.zzz(cv, t, 12, mix(col, 0xffffff, 0.3))
      break
    case 'thinking':
      fx.thought(cv, t, 9, 0)
      break
    case 'waiting':
      fx.question(cv, t, 10, 0, col)
      break
    case 'done':
      fx.confetti(cv, t)
      break
    case 'error':
      fx.smoke(cv, t, 12)
      break
    case 'delegating':
      fx.plane(cv, t, 10, 2)
      break
  }
}

/** The light on the chest: steady, it only changes color with the state. */
function badge(st: State, col: number) {
  if (st === 'error') return BAD
  if (st === 'done') return OK
  if (st === 'idle') return shade(col, -0.35)
  return mix(col, 0xffffff, 0.6)
}

function antenna(cv: Canvas, st: State, t: number, f: number, col: number) {
  const light =
    st === 'error' ? (f % 2 ? BAD : 0x7a1f1f)
    : st === 'done' ? OK
    : st === 'idle' ? shade(col, -0.5)
    : st === 'delegating' ? (Math.floor(t * 10) % 2 ? 0xffffff : col)
    : f % 6 < 3 ? col : mix(col, 0xffffff, 0.5)
  cv.art(7, 0, ['.oo.', 'oLbo', 'obbo', '.oo.'], { o: OUT, b: light, L: mix(light, 0xffffff, 0.6) })
  cv.px(8, 3, METAL.S)
  if (st === 'delegating') fx.waves(cv, t, 9, 1, col)
}

/** The face on the visor. The visor spans x 4..11, y 5..9. */
function eyes(cv: Canvas, st: State, t: number, f: number, col: number) {
  const glow = mix(col, 0xffffff, 0.55)
  const pair = (rows: readonly string[], y: number, pal: Record<string, number>, lx = 5, rx = 9) => {
    cv.art(lx, y, rows, pal)
    cv.art(rx, y, rows, pal)
  }
  const EYE = { e: col, w: glow }
  switch (st) {
    case 'idle':
      pair(['ee'], 8, { e: shade(col, -0.25) })
      return
    case 'thinking':
      pair(['we', 'ee'], 5, EYE, 6, 10)
      return
    case 'reading': {
      // eyes skimming the page
      const dx = Math.floor(t * 2) % 2
      pair(['ee', 'ee'], 7, EYE, 5 + dx, 9 + dx)
      return
    }
    case 'writing':
      if (f % 16 === 0) pair(['ee'], 7, EYE)
      else pair(['we', 'ee'], 6, EYE)
      cv.rect(7, 9, 2, 1, shade(col, -0.3))
      return
    case 'running':
      // the visor turns into a terminal: a prompt and a blinking cursor
      cv.art(5, 5, ['t..', '.t.', 't..'], { t: TERM })
      if (f % 2) cv.rect(8, 7, 3, 1, TERM)
      return
    case 'web': {
      // two spinning globes
      const k = Math.floor(t * 4) % 2
      const g = k ? ['sl', 'ls'] : ['ls', 'sl']
      pair(g, 6, { s: 0x3a86ff, l: OK })
      return
    }
    case 'skill': {
      const big = f % 4 < 2
      pair(big ? ['.g.', 'gwg', '.g.'] : ['...', '.g.', '...'], 5, { g: fx.GOLD, w: 0xffffff }, 4, 8)
      return
    }
    case 'delegating':
      pair(['.e.', 'e.e'], 6, EYE, 4, 9)
      if (f % 2) cv.rect(7, 9, 2, 1, glow)
      return
    case 'waiting':
      if (f % 14 === 0) pair(['ee'], 7, EYE)
      else pair(['we', 'ee', 'ee'], 5, EYE)
      return
    case 'done':
      pair(['.o.', 'o.o'], 6, { o: OK }, 4, 9)
      cv.art(6, 8, ['o..o', '.oo.'], { o: OK })
      return
    case 'error':
      pair(['r.r', '.r.', 'r.r'], 5, { r: f % 2 ? BAD : 0xb83a3a }, 4, 9)
      return
  }
}

function arms(cv: Canvas, st: State, t: number, f: number, col: number) {
  const M = METAL
  const down = () => {
    cv.art(2, 13, ['.m', 'Hm', 'Sm', 'DD'], M)
    cv.art(12, 13, ['m.', 'mS', 'mS', 'DD'], M)
  }
  const up = (x: number, y: number) => cv.art(x, y, ['DD', 'mS', 'mS', 'mS', 'm.'], M)
  switch (st) {
    case 'writing':
    case 'running': {
      // a floating keyboard, keys lighting under the tapping claws
      cv.art(1, 16, ['kkkkkkkkkkkkkk', 'dddddddddddddd'], { k: 0x434c63, d: 0x2a3042 })
      for (let i = 0; i < 6; i++) cv.px(2 + i * 2, 16, i === f % 6 ? (st === 'running' ? TERM : col) : 0x6b7590)
      cv.art(2, 13, ['.m', 'Hm'], M)
      cv.art(12, 13, ['m.', 'mS'], M)
      cv.art(3, 15 - (f % 2), ['DD'], M)
      cv.art(11, 15 - ((f + 1) % 2), ['DD'], M)
      return
    }
    case 'reading':
      cv.art(3, 13, ['mwwwwwwwwm', '.wllllllw.', '.wllllww..', '.wwwwwww..'].map(r => r.padEnd(10, '.')), { ...M, w: fx.PAPER, l: fx.PAPER_LINE })
      return
    case 'skill':
      fx.book(cv, t, 5, 14, col)
      cv.art(3, 14, ['D'], M)
      cv.art(12, 14, ['D'], M)
      return
    case 'web':
      down()
      return
    case 'thinking':
      cv.art(2, 13, ['.m', 'Hm', 'Sm', 'DD'], M)
      // claw under the chin
      cv.art(12, 9, ['DD', '.m', '.m', 'mm'], M)
      return
    case 'delegating': {
      cv.art(2, 13, ['.m', 'Hm', 'Sm', 'DD'], M)
      // pointing the way the plane flies
      cv.art(12, 12, ['mmDD', 'm...'], M)
      return
    }
    case 'waiting':
      // the raised claw stays clear of the bubble on the right
      up(1, 7 + (Math.floor(t * 3) % 2))
      cv.art(12, 13, ['m.', 'mS', 'mS', 'DD'], M)
      return
    case 'done':
      up(1, 7 + (f % 2))
      up(13, 7 + ((f + 1) % 2))
      return
    case 'error':
      // claws on the head
      cv.art(0, 7, ['DD', 'm.', 'm.', 'm.', 'mm', '.m'], M)
      cv.art(14, 7, ['DD', '.m', '.m', '.m', 'mm', 'm.'], M)
      return
    default:
      down()
  }
}
