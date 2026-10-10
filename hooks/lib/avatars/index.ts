import { Canvas, H, QUADRANT, SLIM_H, SLIM_W, W, encode } from '../canvas'
import { arrival } from '../fx'
import type { AvatarId, Look, State } from '../types'
import { drawOffice } from './office'
import { drawRobot } from './robot'
import { slimOffice, slimRobot, slimTamagotchi } from './slim'
import { drawTamagotchi } from './tamagotchi'

type Draw = (cv: Canvas, st: State, t: number, look: Look) => void
export type SpriteSize = 'slim' | 'large'

const DRAW: Record<SpriteSize, Record<AvatarId, Draw>> = {
  large: { office: drawOffice, robot: drawRobot, tamagotchi: drawTamagotchi },
  slim: { office: slimOffice, robot: slimRobot, tamagotchi: slimTamagotchi },
}

const CANVAS: Record<SpriteSize, Canvas> = {
  large: new Canvas(W, H),
  slim: new Canvas(SLIM_W, SLIM_H, QUADRANT),
}

/** Columns and rows a sprite of this size takes in the terminal. */
export const CELLS: Record<SpriteSize, { columns: number; rows: number }> = {
  large: { columns: W, rows: H / 2 },
  slim: { columns: SLIM_W / QUADRANT.w, rows: SLIM_H / QUADRANT.h },
}

/** Draws one frame of a character. `age` is seconds since it arrived. */
export function frame(avatar: AvatarId, st: State, t: number, look: Look, age = Infinity, size: SpriteSize = 'large'): Canvas {
  const cv = CANVAS[size]
  cv.clear()
  DRAW[size][avatar](cv, st, t, look)
  cv.ox = 0
  cv.oy = 0
  if (size === 'large') arrival(cv, age)
  else if (age < 0.8 && Math.floor(age * 8) % 2) {
    cv.px(0, 0, 0xffd34d)
    cv.px(cv.w - 1, cv.h - 1, 0xffd34d)
  }
  return cv
}

/** One frame, packed as `Raster` cells. */
export function cells(avatar: AvatarId, st: State, t: number, look: Look, age = Infinity, size: SpriteSize = 'large'): string {
  return encode(frame(avatar, st, t, look, age, size))
}
