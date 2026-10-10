import type { AgentInfo, Register } from 'claude-code'

import { CELLS, cells } from './lib/avatars'
import type { SpriteSize } from './lib/avatars'
import { toHex } from './lib/canvas'
import { compactNumber, duration, strings } from './lib/i18n'
import type { Strings } from './lib/i18n'
import { Office } from './lib/model'
import type { Agent } from './lib/model'
import { agentName, projectParts } from './lib/naming'
import { AVATARS } from './lib/types'
import type { AvatarId, Lang, State } from './lib/types'

// Agent Office: a band above the prompt where the orchestrator and every
// subagent it delegates to sit as pixel-art characters, animated by what each
// one is doing now.

const COMMAND = 'agent-office'
const FPS = 8
/** Large cards: the sprite above four lines of text. */
const LARGE_CARD = 19
const LARGE_ROWS = 1 + CELLS.large.rows + 4
/** Slim cards: the sprite with four lines of text beside it. */
const SLIM_TEXT = 18
const SLIM_CARD = CELLS.slim.columns + 1 + SLIM_TEXT + 2
const SLIM_ROWS = 1 + CELLS.slim.rows
const STORE_AVATAR = 'avatar'
const STORE_HIDDEN = 'hidden'

const STATE_COLOR: Record<State, string> = {
  idle: '#7d8698',
  thinking: '#e4c14b',
  reading: '#4ac6ff',
  writing: '#ffb400',
  running: '#b07cff',
  delegating: '#ff9f43',
  skill: '#f78fb3',
  web: '#59d0ff',
  waiting: '#ff6b9a',
  done: '#5ee08a',
  error: '#ff5a5a',
}

const AVATAR_ALIASES: Record<string, AvatarId> = {
  office: 'office', escritorio: 'office', 'escritório': 'office', desk: 'office',
  robot: 'robot', robo: 'robot', 'robô': 'robot', bot: 'robot',
  tamagotchi: 'tamagotchi', tamagoshi: 'tamagotchi', pet: 'tamagotchi', blob: 'tamagotchi',
}
const SHOW = new Set(['show', 'open', 'mostrar', 'abrir'])
const HIDE = new Set(['hide', 'close', 'esconder', 'fechar'])

const isAvatar = (v: unknown): v is AvatarId => typeof v === 'string' && (AVATARS as readonly string[]).includes(v)

export const register: Register = (on, options) => {
  const lang: Lang = options.language === 'pt-BR' ? 'pt-BR' : 'en'
  const s: Strings = strings(lang)
  const statusLine = options.statusLine !== false
  const notify = options.notify === true
  const size: SpriteSize = options.large === true ? 'large' : 'slim'
  const cardWidth = size === 'large' ? LARGE_CARD : SLIM_CARD
  const cardRows = size === 'large' ? LARGE_ROWS : SLIM_ROWS

  const office = new Office(s)
  let avatar: AvatarId = isAvatar(options.avatar) ? options.avatar : 'office'
  let hidden = options.showOnStart === false
  /** The band's id as the engine draws it, and the Raster keys on screen now. */
  let bandId: string | undefined
  let mounted = new Set<string>()
  /** The avatar is part of the key: a new avatar mounts a fresh Raster instead of reusing the old one. */
  const rasterKey = (a: Agent) => `agent-${a.id}-${avatar}`
  let blitRefusalLogged = false
  let lastStatus: string | undefined
  let parts: string[] = []
  let root = ''
  /** Every subagent seen spawning, so one resumed after it left the room comes back under its name. */
  const known: Known = new Map()
  const room = (): Room => ({ office, known, parts, root })

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: `${s.title}: ${s.tagline}`,
      argumentHint: '[hide | show] [office | robot | tamagotchi]',
    })

    // Choices made in the band outlive the session.
    const [storedAvatar, storedHidden] = await Promise.all([$.store.get(STORE_AVATAR), $.store.get(STORE_HIDDEN)])
    if (isAvatar(storedAvatar)) avatar = storedAvatar
    if (typeof storedHidden === 'boolean') hidden = storedHidden

    // Folder names subagents are named after: top-level dirs and submodules.
    try {
      root = await $.session.root()
      const [entries, gitmodules] = await Promise.all([
        $.fs.list(root),
        $.fs.exists(`${root}/.gitmodules`).then(ok => (ok ? $.fs.read(`${root}/.gitmodules`) : '')),
      ])
      const text = typeof gitmodules === 'string' ? gitmodules : String((gitmodules as { text?: string })?.text ?? '')
      parts = projectParts(entries.filter(x => x.kind === 'dir').map(x => x.name), text)
    } catch {
      parts = []
    }

    // Subagents already at work when this module loaded (a reload mid-session).
    try {
      for (const i of await $.agent.list()) {
        if (i.status === 'running' || i.status === 'pending' || i.status === 'waiting') await adopt($, room(), i.id, i)
      }
    } catch {
      // the room starts with the orchestrator alone
    }

    $.clock.every(Math.round(1000 / FPS), () => {
      office.tick(1 / FPS)
      for (const { agent, ok } of office.ended.splice(0)) {
        if (!notify) continue
        $.ui.toast(ok ? s.toastDone(agent.name, duration((agent.endedAt ?? office.t) - agent.arrivedAt)) : s.toastFailed(agent.name))
      }
      if (statusLine) {
        const sum = office.summary()
        const text =
          sum.working || sum.waiting
            ? `${s.title} · ${sum.working} ${s.working}${sum.waiting ? ` · ${sum.waiting} ${s.waitingCount}` : ''}`
            : undefined
        if (text !== lastStatus) {
          lastStatus = text
          $.ui.status(text)
        }
      }
      if (office.dirty) {
        office.dirty = false
        $.ui.invalidate('ui.render')
        return
      }
      if (!bandId) return
      for (const a of office.list()) {
        const key = rasterKey(a)
        if (!mounted.has(key)) continue
        void $.ui
          .blit({ requestId: bandId, key, cells: cells(avatar, a.st, office.t, a.look, office.t - a.arrivedAt, size) })
          .then(
            r => {
              if (!('deny' in r && r.deny)) return
              mounted.delete(key)
              if (!blitRefusalLogged) {
                blitRefusalLogged = true
                $.ui.log(`${s.title}: repaint refused (${r.deny})`, { to: 'debug' })
              }
            },
            () => mounted.delete(key),
          )
      }
    })

    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const words = e.args.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const said: string[] = []
    if (words.length === 0) {
      hidden = !hidden
      said.push(hidden ? s.hidden : s.shown)
    }
    for (const w of words) {
      const a = AVATAR_ALIASES[w]
      if (a) {
        avatar = a
        hidden = false
        await $.store.set(STORE_AVATAR, a).catch(() => {})
        said.push(s.avatarSet(s.avatars[a]))
      } else if (SHOW.has(w)) {
        hidden = false
        said.push(s.shown)
      } else if (HIDE.has(w)) {
        hidden = true
        said.push(s.hidden)
      } else {
        return { text: s.help }
      }
    }
    office.dirty = true
    await $.store.set(STORE_HIDDEN, hidden).catch(() => {})
    return { text: said.join(' ') }
  })

  on('turn.start', ($, e, next) => {
    safe(() => office.turnStart())
    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const res = await next(e)
    if ('agentId' in res && res.agentId) {
      let name = e.description
      try {
        name = agentName(
          { prompt: e.prompt, description: e.description, subagentType: e.subagentType, name: e.name, cwd: e.cwd },
          parts,
          root,
        )
      } catch {
        // keep the description
      }
      known.set(res.agentId, { name, description: e.description, parentId: e.parentAgentId })
      safe(() => office.spawn(res.agentId!, name, e.description, e.parentAgentId))
    }
    return res
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId && !office.has(e.agentId)) await adopt($, room(), e.agentId).catch(() => {})
    safe(() => office.toolStart(e.agentId, e.tool, e as unknown as Record<string, unknown>))
    let isError = false
    try {
      const res = await next(e)
      isError = Boolean(res && 'isError' in res && res.isError)
      return res
    } finally {
      safe(() => office.toolEnd(e.agentId, e.tool, isError))
    }
  })

  on('classic.PermissionRequest', async ($, e, next) => {
    safe(() => office.permissionAsked(e.agent_id, e.tool_name))
    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    const u = e.usage
    const tokens = u ? u.input_tokens + u.output_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens : 0
    safe(() => office.turnComplete(e.agentId, e.reason, tokens))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (hidden || e.props.hasSurvey) {
      mounted = new Set()
      return next(e)
    }
    const { Box, Text, Button } = $.ui.resolve(e)
    const Raster = e.surface === 'terminal' ? $.ui.resolve(e).Raster : undefined
    bandId = e.requestId
    const width = e.props.bodyColumns || 80
    // Right to left: the orchestrator holds the right end, subagents line up to its left.
    const agents = office.list().reverse()
    const sum = office.summary()
    // Cards when they fit the band's height; one line per agent otherwise.
    const asCards = Boolean(Raster) && e.props.maxRows >= cardRows && width >= cardWidth
    mounted = asCards ? new Set(agents.map(rasterKey)) : new Set()

    const hide = () => {
      hidden = true
      office.dirty = true
      $.store.set(STORE_HIDDEN, true).catch(() => {})
    }

    const header = (
      <Box flexDirection="row" columnGap={1}>
        <Text bold color="#ffb400">
          {s.title}
        </Text>
        <Box flexGrow={1}>
          <Text dimColor wrap="truncate-end">
            {s.agents(sum.total)} · {sum.working} {s.working}
            {sum.waiting ? ` · ${sum.waiting} ${s.waitingCount}` : ''}
          </Text>
        </Box>
        <Button key="hide" label={s.hide} plain dimColor onPress={hide} />
      </Box>
    )

    const meta = (a: Agent) => {
      const bits = [duration((a.endedAt ?? office.t) - a.arrivedAt)]
      if (a.tools) bits.push(s.tools(a.tools))
      if (a.tokens) bits.push(s.tokens(compactNumber(a.tokens)))
      return bits.join(' · ')
    }

    const sprite = (a: Agent) =>
      Raster ? (
        <Raster
          key={rasterKey(a)}
          columns={CELLS[size].columns}
          rows={CELLS[size].rows}
          cells={cells(avatar, a.st, office.t, a.look, office.t - a.arrivedAt, size)}
        />
      ) : null
    const lines = (a: Agent) => [
      <Text key="n" bold color={toHex(a.look.col)} wrap="truncate-end">
        {a.name}
      </Text>,
      <Text key="s" color={STATE_COLOR[a.st]} wrap="truncate-end">
        ● {s.states[a.st]}
      </Text>,
      <Text key="l" dimColor wrap="truncate-end">
        {a.label || ' '}
      </Text>,
      <Text key="m" dimColor wrap="truncate-end">
        {meta(a)}
      </Text>,
    ]

    const body = asCards ? (
      <Box flexDirection="row" flexWrap="wrap" justifyContent="flex-end">
        {agents.map(a =>
          size === 'large' ? (
            <Box key={`card-${a.id}`} flexDirection="column" width={LARGE_CARD}>
              {sprite(a)}
              {lines(a)}
            </Box>
          ) : (
            <Box key={`card-${a.id}`} flexDirection="row" width={SLIM_CARD} columnGap={1}>
              {sprite(a)}
              <Box flexDirection="column" width={SLIM_TEXT}>
                {lines(a)}
              </Box>
            </Box>
          ),
        )}
      </Box>
    ) : (
      <Box flexDirection="column">
        {agents.map(a => (
          <Box key={`row-${a.id}`} flexDirection="row" columnGap={1}>
            <Text color={toHex(a.look.col)}>■</Text>
            <Box width={22}>
              <Text bold wrap="truncate-end">
                {a.name}
              </Text>
            </Box>
            <Box width={16}>
              <Text color={STATE_COLOR[a.st]} wrap="truncate-end">
                {s.states[a.st]}
              </Text>
            </Box>
            <Box flexGrow={1}>
              <Text dimColor wrap="truncate-end">
                {a.label}
              </Text>
            </Box>
            <Text dimColor>{meta(a)}</Text>
          </Box>
        ))}
      </Box>
    )

    return (
      <Box flexDirection="column">
        {header}
        {body}
      </Box>
    )
  })
}

type Known = Map<string, { name: string; description: string; parentId?: string }>
type Room = { office: Office; known: Known; parts: string[]; root: string }

/**
 * Seats a subagent the office has not seen spawn: one resumed by a message
 * after it left the room, or one already running when this module loaded.
 */
async function adopt($: { agent: { list: () => Promise<AgentInfo[]> } }, r: Room, id: string, info?: AgentInfo) {
  if (r.office.has(id)) return
  let k = r.known.get(id)
  if (!k) {
    const i = info ?? (await $.agent.list().catch(() => [] as AgentInfo[])).find(x => x.id === id)
    const description = i?.description ?? ''
    let name = description.trim().slice(0, 24) || 'subagent'
    try {
      name = agentName({ prompt: '', description, subagentType: i?.type ?? '' }, r.parts, r.root)
    } catch {
      // keep the description
    }
    k = { name, description, parentId: i?.parentId }
    r.known.set(id, k)
  }
  const seat = k
  if (!r.office.has(id)) safe(() => r.office.spawn(id, seat.name, seat.description, seat.parentId))
}

/** The office is decoration: a fault in it must never stand in the way of a tool call or a turn. */
function safe(fn: () => void) {
  try {
    fn()
  } catch {
    // drawn state may lag; the session goes on
  }
}
