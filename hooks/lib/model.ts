// The office's state: who is in the room and what each one is doing. Pure, so
// the hooks module only translates engine events into these calls.

import type { Strings } from './i18n'
import { ORCHESTRATOR_LOOK, lookFor } from './naming'
import { toolState } from './tools'
import type { Look, State } from './types'

export const MAIN = 'main'

export type Agent = {
  id: string
  name: string
  look: Look
  main: boolean
  st: State
  label: string
  arrivedAt: number
  endedAt?: number
  /** A passing state (error, done) ends at this time. */
  until?: number
  tools: number
  tokens: number
  inflight: number
  ended: boolean
}

export type Summary = { total: number; working: number; waiting: number }
export type EndNotice = { agent: Agent; ok: boolean }

const ERROR_HOLD_S = 4
const DONE_HOLD_S = 6
const MAX_ROOM = 12

export class Office {
  t = 0
  dirty = true
  readonly agents = new Map<string, Agent>()
  private s: Strings
  /** Subagents that finished since the last read, for toasts. */
  ended: EndNotice[] = []

  constructor(s: Strings) {
    this.s = s
    this.agents.set(MAIN, this.make(MAIN, s.orchestrator, ORCHESTRATOR_LOOK, true))
    this.set(this.main, 'idle', s.yourTurn)
  }

  get main(): Agent {
    return this.agents.get(MAIN)!
  }

  setStrings(s: Strings) {
    this.s = s
    this.main.name = s.orchestrator
    this.dirty = true
  }

  list(): Agent[] {
    return [...this.agents.values()]
  }

  summary(): Summary {
    let working = 0
    let waiting = 0
    for (const a of this.agents.values()) {
      if (a.st === 'waiting') waiting++
      else if (a.st !== 'idle' && a.st !== 'done' && a.st !== 'error') working++
    }
    return { total: this.agents.size, working, waiting }
  }

  // ---- events ----

  /** A new prompt: the orchestrator starts; whoever finished leaves the room. */
  turnStart() {
    for (const [id, a] of this.agents) if (!a.main && a.ended) this.agents.delete(id)
    this.set(this.main, 'thinking', this.s.thinking)
    this.dirty = true
  }

  spawn(id: string, name: string, description: string, parentId?: string) {
    const a = this.make(id, name, lookFor(name), false)
    this.set(a, 'thinking', description.trim() || this.s.starting)
    this.agents.set(id, a)
    this.evict()
    const parent = parentId ? this.agents.get(parentId) : this.main
    if (parent && parent.st === 'delegating') this.set(parent, 'idle', this.s.waitingSubagents)
    this.dirty = true
  }

  has(agentId: string) {
    return this.agents.has(agentId)
  }

  toolStart(agentId: string | undefined, tool: string, input: Record<string, unknown>) {
    const a = this.find(agentId)
    if (!a) return
    // A finished subagent resumed by a message works again.
    if (a.ended) {
      a.ended = false
      a.endedAt = undefined
    }
    a.inflight += 1
    a.tools += 1
    const [st, label] = toolState(tool, input, this.s)
    this.set(a, st, label)
  }

  toolEnd(agentId: string | undefined, tool: string, isError: boolean) {
    const a = this.find(agentId)
    if (!a) return
    a.inflight = Math.max(0, a.inflight - 1)
    if (a.ended) return
    if (isError && (tool === 'Bash' || tool === 'PowerShell')) {
      this.set(a, 'error', this.s.failed(a.label.replace(/^\$ /, '')), ERROR_HOLD_S)
    } else if (a.inflight === 0 && a.st !== 'error') {
      this.set(a, 'thinking', a.main ? this.s.thinking : this.s.analyzing)
    }
  }

  /** The person is being asked to approve a tool call. */
  permissionAsked(agentId: string | undefined, tool: string) {
    const a = this.find(agentId)
    if (a) this.set(a, 'waiting', this.s.approve(tool))
  }

  turnComplete(agentId: string | undefined, reason: string, tokens = 0) {
    if (!agentId) {
      this.set(this.main, 'done', this.s.taskDone, DONE_HOLD_S)
      return
    }
    const a = this.agents.get(agentId)
    if (!a) return
    a.ended = true
    a.endedAt = this.t
    a.inflight = 0
    a.tokens += tokens
    const ok = reason === 'answer'
    if (ok) this.set(a, 'done', this.s.done)
    else this.set(a, 'error', reason === 'aborted' ? this.s.interrupted : this.s.errored)
    this.ended.push({ agent: a, ok })
  }

  /** Advances the clock and ends passing states. */
  tick(dt: number) {
    this.t += dt
    for (const a of this.agents.values()) {
      if (a.until === undefined || this.t < a.until) continue
      a.until = undefined
      if (a.main && a.st === 'done') this.set(a, 'idle', this.s.yourTurn)
      else if (a.st === 'error' && !a.ended) this.set(a, 'thinking', a.main ? this.s.thinking : this.s.analyzing)
    }
  }

  // ---- helpers ----

  private find(agentId: string | undefined) {
    return agentId ? this.agents.get(agentId) : this.main
  }

  private make(id: string, name: string, look: Look, main: boolean): Agent {
    return { id, name, look, main, st: 'idle', label: '', arrivedAt: this.t, tools: 0, tokens: 0, inflight: 0, ended: false }
  }

  private set(a: Agent, st: State, label: string, holdS?: number) {
    if (a.st !== st || a.label !== label) this.dirty = true
    a.st = st
    a.label = label
    a.until = holdS === undefined ? undefined : this.t + holdS
  }

  private evict() {
    while (this.agents.size > MAX_ROOM) {
      const oldest = this.list().find(a => !a.main && a.ended) ?? this.list().find(a => !a.main)
      if (!oldest) return
      this.agents.delete(oldest.id)
    }
  }
}
