// Tamagotchi: a round creature that bounces while it works and naps when idle.

import type { Canvas } from '../canvas'
import { shade } from '../canvas'
import * as fx from '../fx'
import type { Look, State } from '../types'

const INK = 0x1a1a1a
const HALF_WIDTHS = [3, 4, 5, 6, 6, 6, 6, 6, 5, 4]

export function drawTamagotchi(cv: Canvas, st: State, t: number, look: Look) {
  const f = Math.floor(t * 6)
  const base = st === 'error' ? shade(look.col, -0.45) : look.col
  let dy = 0
  if (st === 'writing' || st === 'web') dy = -(f % 2)
  if (st === 'running') dy = -[0, 1, 2, 1][f % 4]!
  if (st === 'done') dy = -[0, 2, 3, 2][f % 4]!
  if (st === 'delegating') dy = -(Math.floor(t * 3) % 2)
  const squash = st === 'idle' && Math.floor(t * 1.2) % 2 ? 1 : 0
  const tilt = st === 'waiting' ? (Math.floor(t * 1.5) % 2 ? 1 : -1) : 0

  cv.rect(4, 18, 8, 1, 0x0d0f14)
  cv.shifted(tilt, dy + squash, () => {
    cv.rect(4, 4, 2, 2, base)
    cv.rect(10, 4, 2, 2, base)
    cv.px(4, 4, shade(base, 0.3))
    cv.px(10, 4, shade(base, 0.3))
    HALF_WIDTHS.forEach((w, i) => {
      if (squash && i === 1) return
      cv.rect(8 - w, 6 + i, w * 2, 1, base)
      cv.px(8 + w - 1, 6 + i, shade(base, -0.25))
    })
    cv.rect(6, 11, 4, 3, shade(base, 0.35))
    face(cv, st, t, f, squash ? 8 : 9)
    cv.rect(5, 16, 2, 1, shade(base, -0.35))
    cv.rect(9, 16, 2, 1, shade(base, -0.35))
    props(cv, st, t, f, look.col)
  })

  switch (st) {
    case 'running': {
      const ph = (t * 2) % 1
      cv.px(13 + Math.round(ph * 2), 7 - Math.round(ph * 2), 0x6cc8ff)
      cv.px(2 - Math.round(ph * 2), 8 - Math.round(ph * 2), 0x6cc8ff)
      break
    }
    case 'idle':
      fx.zzz(cv, t, 12, 0xc9d2dc)
      break
    case 'error': {
      const k = f % 4
      ;([[6, 1], [8, 0], [10, 1], [8, 2]] as const).forEach(([x, y], i) => cv.px(x, y, i === k ? fx.GOLD : 0x6b6b6b))
      break
    }
    case 'done': {
      const ph = (t * 0.8) % 1
      if (ph < 0.8) {
        fx.heart(cv, 1, Math.round(5 - ph * 5), 0xff6b9a)
        fx.heart(cv, 12, Math.round(6 - ph * 5), 0xff6b9a)
      }
      break
    }
    case 'thinking':
      fx.thought(cv, t, 9, 0)
      break
    case 'waiting':
      fx.question(cv, t, 0, 0, look.col)
      break
    case 'delegating':
      fx.plane(cv, t, 11, 9)
      break
  }
}

function face(cv: Canvas, st: State, t: number, f: number, ey: number) {
  switch (st) {
    case 'idle':
      cv.rect(5, ey, 2, 1, INK)
      cv.rect(9, ey, 2, 1, INK)
      return
    case 'done':
      for (const x of [5, 9]) {
        cv.px(x, ey, INK)
        cv.px(x + 1, ey - 1, INK)
      }
      cv.rect(7, ey + 1, 2, 1, INK)
      return
    case 'error':
      for (const x of [4, 9]) {
        cv.px(x, ey - 1, INK)
        cv.px(x + 2, ey - 1, INK)
        cv.px(x + 1, ey, INK)
        cv.px(x, ey + 1, INK)
        cv.px(x + 2, ey + 1, INK)
      }
      return
    case 'delegating':
      eye(cv, 5, ey, 1, 0)
      eye(cv, 9, ey, 1, 0)
      cv.rect(7, ey + 1, 2, 2, f % 2 ? INK : 0x7a2a2a)
      return
    case 'thinking':
      eye(cv, 5, ey, 1, -1)
      eye(cv, 9, ey, 1, -1)
      return
    case 'waiting':
      eye(cv, 5, ey, 0, -1)
      eye(cv, 9, ey, 0, -1)
      cv.px(7, ey + 1, INK)
      return
    case 'skill':
      eye(cv, 5, ey, 1, 1)
      eye(cv, 9, ey, 1, 1)
      if (f % 2) cv.px(5, ey - 1, fx.GOLD)
      return
    case 'reading': {
      const look = [0, 1, 0, 1][f % 4]!
      eye(cv, 5, ey, look, 1)
      eye(cv, 9, ey, look, 1)
      return
    }
    case 'writing':
    case 'web':
      eye(cv, 5, ey, 1, 1)
      eye(cv, 9, ey, 1, 1)
      return
    case 'running':
      eye(cv, 5, ey, 1, 0)
      eye(cv, 9, ey, 1, 0)
      cv.px(4, ey - 2, INK)
      cv.px(11, ey - 2, INK)
      return
  }
  void t
}

/** A 2x2 white eye with its pupil at (lx, ly) offsets: lx 0|1, ly -1|0|1. */
function eye(cv: Canvas, x: number, ey: number, lx: number, ly: number) {
  cv.rect(x, ey - 1, 2, 2, 0xffffff)
  cv.px(x + lx, ey - 1 + (ly > 0 ? 1 : 0), INK)
  if (ly < 0) cv.px(x + lx, ey - 1, INK)
}

function props(cv: Canvas, st: State, t: number, f: number, col: number) {
  switch (st) {
    case 'writing':
      cv.rect(3, 13, 10, 1, 0xaab3bf)
      cv.rect(4, 12, 8, 1, 0x5b6778)
      cv.px(5 + (f % 6), 12, 0xffffff)
      return
    case 'running':
      cv.rect(3, 13, 10, 1, 0xaab3bf)
      cv.rect(4, 12, 8, 1, 0x050a05)
      cv.px(5 + (f % 6), 12, 0x3ddc5a)
      return
    case 'reading':
      fx.paper(cv, 6, 12)
      return
    case 'skill':
      fx.book(cv, t, 5, 13, col)
      return
    case 'web':
      fx.globe(cv, t, 6, 12)
      return
  }
}
