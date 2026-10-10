// Names a subagent after the part of the project it works on.
//
// In a repository of git submodules (or any monorepo) the delegation prompt
// usually names the folder the subagent owns. The office reads the project's
// top-level folders and `.gitmodules` paths once, and names each subagent after
// the first of them its prompt mentions. Without a match it falls back to the
// Agent call's own name, its custom type, then its description.

import { hex } from './canvas'
import type { Look } from './types'

export type SpawnFacts = {
  prompt: string
  description: string
  subagentType: string
  name?: string
  cwd?: string
}

const IGNORED = new Set(['node_modules', 'dist', 'build', 'out', 'target', 'vendor', 'docs', 'doc', 'src', 'test', 'tests', 'tmp', 'tasks', 'scripts'])

/** Folder names worth matching, from a root listing and `.gitmodules` text. */
export function projectParts(dirs: readonly string[], gitmodules = ''): string[] {
  const set = new Set<string>()
  for (const d of dirs) if (d.length >= 3 && !d.startsWith('.') && !IGNORED.has(d)) set.add(d)
  for (const m of gitmodules.matchAll(/^\s*path\s*=\s*(.+?)\s*$/gm)) {
    const p = m[1]!
    set.add(p)
    const last = p.split('/').pop()
    if (last && last.length >= 3) set.add(last)
  }
  return [...set].sort((a, b) => b.length - a.length)
}

export function agentName(e: SpawnFacts, parts: readonly string[], root = ''): string {
  if (e.name) return e.name
  if (e.cwd) {
    const rel = root && e.cwd.startsWith(root) ? e.cwd.slice(root.length).replace(/^\/+/, '') : e.cwd
    const last = rel.split('/').filter(Boolean).pop()
    if (last) return last
  }
  const text = `${e.description}\n${e.prompt}`
  let best: { part: string; at: number } | undefined
  for (const part of parts) {
    const at = indexOfWord(text, part)
    if (at >= 0 && (!best || at < best.at)) best = { part, at }
  }
  if (best) return best.part.split('/').pop() ?? best.part
  const type = e.subagentType.split(':').pop() || e.subagentType
  if (type && type !== 'general-purpose' && type !== 'fork') return type
  return e.description.trim().slice(0, 24) || 'subagent'
}

function indexOfWord(text: string, word: string) {
  let from = 0
  for (;;) {
    const at = text.indexOf(word, from)
    if (at < 0) return -1
    const before = text[at - 1] ?? ' '
    const after = text[at + word.length] ?? ' '
    if (!/[\w-]/.test(before) && !/[\w-]/.test(after)) return at
    from = at + 1
  }
}

const PALETTE = ['#ff6b4a', '#4ac6ff', '#b07cff', '#5ee08a', '#ff6b9a', '#36d6c3', '#c3e35b', '#ff9f43', '#7b8cff', '#f78fb3', '#e4c14b', '#59d0ff']
const SKINS = ['#f1c7a1', '#c98d62', '#8d5a3b', '#f3d3b8', '#e0ac80', '#6b4430']
const HAIRS = ['#3a2a1e', '#151515', '#1d1209', '#b5651d', '#6e6e6e', '#d9b44a', '#7a2f2f']
export const ORCHESTRATOR_LOOK: Look = { col: hex('#ffb400'), skin: hex('#f1c7a1'), hair: hex('#3a2a1e') }

export function lookFor(name: string): Look {
  const h = hash(name)
  return {
    col: hex(PALETTE[h % PALETTE.length]!),
    skin: hex(SKINS[(h >>> 4) % SKINS.length]!),
    hair: hex(HAIRS[(h >>> 8) % HAIRS.length]!),
    style: (h >>> 12) % 3,
  }
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
