// Which state a tool call puts an agent in, and the short line shown under it.

import type { Strings } from './i18n'
import type { State } from './types'

const base = (p: unknown) => String(p ?? '').split('/').filter(Boolean).pop() ?? ''
const firstLine = (s: unknown) => String(s ?? '').split('\n')[0]!.trim()

export function toolState(tool: string, input: Record<string, unknown>, s: Strings): [State, string] {
  switch (tool) {
    case 'Read':
    case 'NotebookRead':
      return ['reading', `Read ${base(input.file_path ?? input.notebook_path)}`]
    case 'Grep':
      return ['reading', `Grep ${firstLine(input.pattern)}`]
    case 'Glob':
      return ['reading', `Glob ${firstLine(input.pattern)}`]
    case 'LSP':
    case 'ToolSearch':
      return ['reading', tool]
    case 'Edit':
    case 'MultiEdit':
    case 'Write':
    case 'NotebookEdit':
      return ['writing', `${tool} ${base(input.file_path ?? input.notebook_path)}`]
    case 'Bash':
    case 'PowerShell':
      return ['running', `$ ${firstLine(input.command)}`]
    case 'Monitor':
    case 'BashOutput':
    case 'KillShell':
    case 'TaskStop':
      return ['running', tool]
    case 'Agent':
    case 'Task':
      return ['delegating', s.delegating(firstLine(input.description))]
    case 'SendMessage':
      return ['delegating', s.messaging(firstLine(input.to))]
    case 'Workflow':
      return ['delegating', s.delegating('workflow')]
    case 'Skill':
      return ['skill', `${firstLine(input.skill)}`]
    case 'WebFetch':
      return ['web', `WebFetch ${hostOf(input.url)}`]
    case 'WebSearch':
      return ['web', `WebSearch ${firstLine(input.query)}`]
    case 'AskUserQuestion':
      return ['waiting', s.answerQuestion]
    case 'ExitPlanMode':
      return ['waiting', s.approvePlan]
    case 'TodoWrite':
    case 'TaskCreate':
    case 'TaskUpdate':
    case 'EnterPlanMode':
      return ['thinking', s.planning]
  }
  if (tool.startsWith('mcp__')) {
    const [, server = '', name = tool] = tool.split('__')
    const webby = /browser|chrome|playwright|fetch|search|web/i.test(server + name)
    return [webby ? 'web' : 'running', `${server.replace(/^claude_ai_/, '')}:${name}`]
  }
  return ['thinking', tool]
}

function hostOf(url: unknown) {
  try {
    return new URL(String(url)).host
  } catch {
    return ''
  }
}
