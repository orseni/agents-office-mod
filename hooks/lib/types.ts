/** What an agent is doing, as the office draws it. */
export type State =
  | 'idle'
  | 'thinking'
  | 'reading'
  | 'writing'
  | 'running'
  | 'delegating'
  | 'skill'
  | 'web'
  | 'waiting'
  | 'done'
  | 'error'

export const STATES: readonly State[] = [
  'idle', 'thinking', 'reading', 'writing', 'running', 'delegating', 'skill', 'web', 'waiting', 'done', 'error',
]

/** A character's colors (shirt or body, skin, hair) and, for people, a haircut. */
export type Look = { col: number; skin: number; hair: number; style?: number }

export type AvatarId = 'office' | 'robot' | 'tamagotchi'
export const AVATARS: readonly AvatarId[] = ['office', 'robot', 'tamagotchi']

export type Lang = 'en' | 'pt-BR'
