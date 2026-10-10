// Minimal PNG and animated-GIF encoders for the preview images. Node only;
// the mod itself never imports this file.

import { deflateSync } from 'node:zlib'

export type Image = { width: number; height: number; rgb: Uint32Array } // 0xRRGGBB per pixel

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf: Uint8Array) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function png(img: Image): Buffer {
  const raw = Buffer.alloc((img.width * 3 + 1) * img.height)
  let o = 0
  for (let y = 0; y < img.height; y++) {
    raw[o++] = 0
    for (let x = 0; x < img.width; x++) {
      const c = img.rgb[y * img.width + x]!
      raw[o++] = (c >> 16) & 255
      raw[o++] = (c >> 8) & 255
      raw[o++] = c & 255
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(td))
    return Buffer.concat([len, td, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(img.width, 0)
  ihdr.writeUInt32BE(img.height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** An animated GIF from frames sharing one palette of at most 256 colors. */
export function gif(frames: Image[], delayCs: number): Buffer {
  const { width, height } = frames[0]!
  const palette: number[] = []
  const index = new Map<number, number>()
  for (const f of frames) for (const c of f.rgb) if (!index.has(c)) {
    if (palette.length >= 256) throw new Error('more than 256 colors')
    index.set(c, palette.length)
    palette.push(c)
  }
  let bits = 1
  while (1 << bits < palette.length) bits++
  const size = 1 << bits
  const out: number[] = []
  const u16 = (n: number) => out.push(n & 255, (n >> 8) & 255)
  out.push(...Buffer.from('GIF89a'))
  u16(width)
  u16(height)
  out.push(0xf0 | (bits - 1), 0, 0)
  for (let i = 0; i < size; i++) {
    const c = palette[i] ?? 0
    out.push((c >> 16) & 255, (c >> 8) & 255, c & 255)
  }
  out.push(0x21, 0xff, 0x0b, ...Buffer.from('NETSCAPE2.0'), 3, 1, 0, 0, 0)
  for (const f of frames) {
    out.push(0x21, 0xf9, 4, 0)
    u16(delayCs)
    out.push(0, 0)
    out.push(0x2c)
    u16(0)
    u16(0)
    u16(width)
    u16(height)
    out.push(0)
    const minCode = Math.max(2, bits)
    out.push(minCode)
    const data = lzw(f.rgb, index, minCode)
    for (let i = 0; i < data.length; i += 255) {
      const block = data.slice(i, i + 255)
      out.push(block.length, ...block)
    }
    out.push(0)
  }
  out.push(0x3b)
  return Buffer.from(out)
}

function lzw(pixels: Uint32Array, index: Map<number, number>, minCode: number): number[] {
  const clear = 1 << minCode
  const eoi = clear + 1
  const bytes: number[] = []
  let cur = 0
  let curBits = 0
  let codeSize = minCode + 1
  const emit = (code: number) => {
    cur |= code << curBits
    curBits += codeSize
    while (curBits >= 8) {
      bytes.push(cur & 255)
      cur >>= 8
      curBits -= 8
    }
  }
  let dict = new Map<string, number>()
  let next = eoi + 1
  emit(clear)
  let prefix = String(index.get(pixels[0]!)!)
  for (let i = 1; i < pixels.length; i++) {
    const k = String(index.get(pixels[i]!)!)
    const pk = prefix + ',' + k
    if (dict.has(pk)) {
      prefix = pk
      continue
    }
    emit(dict.get(prefix) ?? Number(prefix))
    if (next < 4096) {
      dict.set(pk, next++)
      if (next > 1 << codeSize && codeSize < 12) codeSize++
    } else {
      emit(clear)
      dict = new Map()
      next = eoi + 1
      codeSize = minCode + 1
    }
    prefix = k
  }
  emit(dict.get(prefix) ?? Number(prefix))
  emit(eoi)
  if (curBits > 0) bytes.push(cur & 255)
  return bytes
}
