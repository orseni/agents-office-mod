import type { AvatarId, Lang, State } from './types'

type Strings = {
  title: string
  orchestrator: string
  states: Record<State, string>
  avatars: Record<AvatarId, string>
  tagline: string
  agents: (n: number) => string
  working: string
  waitingCount: string
  thinking: string
  analyzing: string
  waitingSubagents: string
  yourTurn: string
  idle: string
  starting: string
  delegating: (what: string) => string
  messaging: (to: string) => string
  answerQuestion: string
  approvePlan: string
  approve: (tool: string) => string
  planning: string
  done: string
  taskDone: string
  failed: (what: string) => string
  interrupted: string
  errored: string
  tools: (n: number) => string
  tokens: (n: string) => string
  hide: string
  shown: string
  hidden: string
  avatarSet: (a: string) => string
  help: string
  toastDone: (name: string, time: string) => string
  toastFailed: (name: string) => string
}

const en: Strings = {
  title: 'Agent Office',
  orchestrator: 'orchestrator',
  states: {
    idle: 'idle', thinking: 'thinking', reading: 'reading', writing: 'writing', running: 'running',
    delegating: 'delegating', skill: 'skill', web: 'web', waiting: 'needs you', done: 'done', error: 'error',
  },
  avatars: { office: 'Office', robot: 'Robot', tamagotchi: 'Tamagotchi' },
  tagline: 'your agents as live pixel art, above the prompt',
  agents: n => `${n} ${n === 1 ? 'agent' : 'agents'}`,
  working: 'working',
  waitingCount: 'need you',
  thinking: 'thinking',
  analyzing: 'analyzing',
  waitingSubagents: 'waiting for subagents',
  yourTurn: 'your turn',
  idle: 'idle',
  starting: 'starting',
  delegating: what => `delegating ${what}`.trim(),
  messaging: to => `messaging ${to}`.trim(),
  answerQuestion: 'waiting for your answer',
  approvePlan: 'waiting for plan approval',
  approve: tool => `approve ${tool}?`,
  planning: 'planning',
  done: 'done',
  taskDone: 'task done',
  failed: what => `failed: ${what}`,
  interrupted: 'interrupted',
  errored: 'stopped on an error',
  tools: n => `${n} ${n === 1 ? 'tool' : 'tools'}`,
  tokens: n => `${n} tok`,
  hide: 'hide',
  shown: 'Agent Office shown.',
  hidden: 'Agent Office hidden. /agent-office brings it back.',
  avatarSet: a => `Avatar set to ${a}.`,
  help: 'Usage: /agent-office [hide | show] [office | robot | tamagotchi]   e.g. /agent-office robot',
  toastDone: (name, time) => `✓ ${name} done in ${time}`,
  toastFailed: name => `✗ ${name} stopped with an error`,
}

const ptBR: Strings = {
  title: 'Escritório dos Agentes',
  orchestrator: 'orquestrador',
  states: {
    idle: 'ocioso', thinking: 'pensando', reading: 'lendo', writing: 'editando', running: 'executando',
    delegating: 'delegando', skill: 'skill', web: 'web', waiting: 'precisa de você', done: 'concluído', error: 'erro',
  },
  avatars: { office: 'Escritório', robot: 'Robô', tamagotchi: 'Tamagotchi' },
  tagline: 'seus agentes em pixel art, ao vivo, acima do prompt',
  agents: n => `${n} ${n === 1 ? 'agente' : 'agentes'}`,
  working: 'trabalhando',
  waitingCount: 'precisam de você',
  thinking: 'pensando',
  analyzing: 'analisando',
  waitingSubagents: 'aguardando subagentes',
  yourTurn: 'sua vez',
  idle: 'ocioso',
  starting: 'começando',
  delegating: what => `delegando ${what}`.trim(),
  messaging: to => `mensagem para ${to}`.trim(),
  answerQuestion: 'aguardando sua resposta',
  approvePlan: 'aguardando aprovar o plano',
  approve: tool => `aprovar ${tool}?`,
  planning: 'planejando',
  done: 'concluído',
  taskDone: 'tarefa concluída',
  failed: what => `falhou: ${what}`,
  interrupted: 'interrompido',
  errored: 'parou num erro',
  tools: n => `${n} ${n === 1 ? 'ferramenta' : 'ferramentas'}`,
  tokens: n => `${n} tok`,
  hide: 'esconder',
  shown: 'Escritório visível.',
  hidden: 'Escritório escondido. /agent-office traz de volta.',
  avatarSet: a => `Avatar trocado para ${a}.`,
  help: 'Uso: /agent-office [esconder | mostrar] [escritorio | robo | tamagotchi]   ex.: /agent-office robo',
  toastDone: (name, time) => `✓ ${name} concluiu em ${time}`,
  toastFailed: name => `✗ ${name} parou num erro`,
}

export type { Strings }
export function strings(lang: Lang): Strings {
  return lang === 'pt-BR' ? ptBR : en
}

export function duration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m${String(s % 60).padStart(2, '0')}s`
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`
}

export function compactNumber(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}
