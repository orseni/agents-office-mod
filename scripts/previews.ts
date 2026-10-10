// Renders the README previews: every state of every avatar, as the terminal
// shows them (each sprite pixel is half a character cell).
//
//   npx tsx scripts/previews.ts            -> docs/<avatar>.gif and docs/states-<avatar>.png
//   npx tsx scripts/previews.ts --sheet    -> also docs/sheet.png (all avatars, one frame)

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { frame } from '../hooks/lib/avatars'
import { flatten } from '../hooks/lib/canvas'
import type { SpriteSize } from '../hooks/lib/avatars'
import { ORCHESTRATOR_LOOK, lookFor } from '../hooks/lib/naming'
import { AVATARS, STATES } from '../hooks/lib/types'
import type { AvatarId, Look, State } from '../hooks/lib/types'
import { gif, png } from './encoders'
import type { Image } from './encoders'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs')
const BG = 0x0d1016
const SCALE = 6
const GAP = 2 // sprite pixels between characters
const FPS = 8
const SECONDS = 3

const LOOKS: Look[] = [ORCHESTRATOR_LOOK, lookFor('blips_firmware'), lookFor('dashboard-api'), lookFor('mobile_app'), lookFor('validator'), lookFor('infra')]

function sheet(avatar: AvatarId, states: readonly State[], t: number, perRow = states.length, size: SpriteSize = 'large'): Image {
  const probe = frame(avatar, 'idle', 0, LOOKS[0]!, Infinity, size)
  const { w: W, h: H } = probe
  // a terminal cell is about twice as tall as it is wide, so a quadrant pixel is 1:2
  const sx = SCALE
  const sy = probe.cell.w === 2 ? SCALE * 2 : SCALE
  const rows = Math.ceil(states.length / perRow)
  const cw = W + GAP
  const ch = H + GAP
  const width = Math.round((perRow * cw + GAP) * sx)
  const height = Math.round((rows * ch + GAP) * sy)
  const rgb = new Uint32Array(width * height).fill(BG)
  states.forEach((st, i) => {
    const cv = frame(avatar, st, t + i * 0.37, LOOKS[i % LOOKS.length]!, Infinity, size)
    const shown = flatten(cv)
    const ox = GAP + (i % perRow) * cw
    const oy = GAP + Math.floor(i / perRow) * ch
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const c = shown[y * W + x]!
        if (c < 0) continue
        for (let py = Math.round((oy + y) * sy); py < Math.round((oy + y + 1) * sy); py++)
          for (let px = Math.round((ox + x) * sx); px < Math.round((ox + x + 1) * sx); px++) rgb[py * width + px] = c
      }
  })
  return { width, height, rgb }
}

mkdirSync(OUT, { recursive: true })
for (const avatar of AVATARS) {
  writeFileSync(join(OUT, `states-${avatar}.png`), png(sheet(avatar, STATES, 0.5, 6)))
  writeFileSync(join(OUT, `states-slim-${avatar}.png`), png(sheet(avatar, STATES, 0.5, 11, 'slim')))
  const slimFrames: Image[] = []
  for (let i = 0; i < FPS * SECONDS; i++) slimFrames.push(sheet(avatar, STATES, i / FPS, 11, 'slim'))
  writeFileSync(join(OUT, `slim-${avatar}.gif`), gif(slimFrames, Math.round(100 / FPS)))
  const frames: Image[] = []
  for (let i = 0; i < FPS * SECONDS; i++) frames.push(sheet(avatar, STATES, i / FPS, 6))
  writeFileSync(join(OUT, `${avatar}.gif`), gif(frames, Math.round(100 / FPS)))
  console.log(`docs/${avatar}.gif, docs/states-${avatar}.png`)
}
