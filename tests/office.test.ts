import { describe, expect, test } from 'claude-code/testing'

const PLUGIN = 'submodules-agent-office'
const band = (maxRows = 30) => ({
  hasSurvey: false,
  isWorking: false,
  maxRows,
  bodyColumns: 120,
  scroll: { offset: 0, bodyRows: maxRows - 1 },
  view: {},
})

describe('agent office band', () => {
  for (const surface of ['terminal', 'desktop'] as const) {
    test(`draws the orchestrator (${surface})`, async $ => {
      const ui = await $.ui.mount({ plugin: PLUGIN, surface, component: 'AbovePrompt', props: band() })
      expect((await ui.find({ text: 'orchestrator' }))?.text).toContain('orchestrator')
    })
  }

  test('cards with sprites when the band is tall enough, a list when it is not', async $ => {
    const tall = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'AbovePrompt', props: band(30) })
    expect(await tall.find({ key: 'agent-main-office' })).toBeDefined()
    const short = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'AbovePrompt', props: band(4) })
    expect(await short.find({ key: 'agent-main-office' })).toBeUndefined()
    expect(await short.find({ text: 'orchestrator' })).toBeDefined()
  })

  test('a delegated subagent gets a character', async ($, on) => {
    on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'ag-1' }))
    await $.agent.spawn({
      tool_use_id: 'toolu_1',
      prompt: 'Review the diff.',
      description: 'review diff',
      subagentType: 'feature-dev:code-reviewer',
      provider: { plugin: 'engine', tier: 'core' },
      parentModel: 'claude-opus-5-5',
      background: false,
      fork: false,
    })
    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'AbovePrompt', props: band() })
    expect(await ui.find({ text: 'code-reviewer' })).toBeDefined()
    expect(await ui.find({ key: 'agent-ag-1-office' })).toBeDefined()
  })

  test('the hide button gives the band back to the engine', async $ => {
    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'AbovePrompt', props: band() })
    await ui.press({ key: 'hide' })
    expect(await ui.find({ text: 'orchestrator' })).toBeUndefined()
  })

  test('pt-BR strings', { options: { language: 'pt-BR' } }, async $ => {
    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'AbovePrompt', props: band() })
    expect(await ui.find({ text: 'orquestrador' })).toBeDefined()
  })
})
