// Node-only checks of the pure parts (state model, naming, encoding), runnable
// without Claude Code:  npx tsx scripts/model-check.ts

import assert from 'node:assert/strict'

import { cells } from '../hooks/lib/avatars'
import { COLS, ROWS } from '../hooks/lib/canvas'
import { strings } from '../hooks/lib/i18n'
import { MAIN, Office } from '../hooks/lib/model'
import { agentName, projectParts } from '../hooks/lib/naming'
import { AVATARS, STATES } from '../hooks/lib/types'

const s = strings('en')
let n = 0
const check = (name: string, fn: () => void) => {
  fn()
  n++
  console.log(`ok - ${name}`)
}

check('every avatar draws every state as a full Raster', () => {
  for (const a of AVATARS)
    for (const st of STATES) {
      const look = { col: 0xff6b4a, skin: 0xf1c7a1, hair: 0x151515 }
      assert.equal(Buffer.from(cells(a, st, 1.3, look), 'base64').length, COLS * ROWS * 12)
      assert.equal(Buffer.from(cells(a, st, 1.3, look, Infinity, 'slim'), 'base64').length, 10 * 5 * 12)
    }
})

check('a delegation shows the subagent and parks the orchestrator', () => {
  const o = new Office(s)
  o.turnStart()
  o.toolStart(undefined, 'Agent', { description: 'fix timer' })
  assert.equal(o.main.st, 'delegating')
  o.spawn('a1', 'blips_firmware', 'fix timer')
  assert.equal(o.agents.get('a1')?.st, 'thinking')
  assert.equal(o.main.st, 'idle')
  assert.equal(o.main.label, s.waitingSubagents)
})

check('tools map to states, skills and the web included', () => {
  const o = new Office(s)
  o.spawn('a1', 'api', 'x')
  o.toolStart('a1', 'Skill', { skill: 'superpowers:brainstorming' })
  assert.equal(o.agents.get('a1')?.st, 'skill')
  o.toolEnd('a1', 'Skill', false)
  o.toolStart('a1', 'WebFetch', { url: 'https://example.com/a' })
  assert.equal(o.agents.get('a1')?.label, 'WebFetch example.com')
  o.toolEnd('a1', 'WebFetch', false)
  assert.equal(o.agents.get('a1')?.st, 'thinking')
})

check('a failing Bash shows an error, then recovers', () => {
  const o = new Office(s)
  o.toolStart(undefined, 'Bash', { command: 'make test' })
  o.toolEnd(undefined, 'Bash', true)
  assert.equal(o.main.st, 'error')
  for (let i = 0; i < 40; i++) o.tick(0.125)
  assert.equal(o.main.st, 'thinking')
})

check('questions and permission prompts mean the human is needed', () => {
  const o = new Office(s)
  o.toolStart(undefined, 'AskUserQuestion', {})
  assert.equal(o.main.st, 'waiting')
  o.toolEnd(undefined, 'AskUserQuestion', false)
  o.spawn('a1', 'api', 'x')
  o.toolStart('a1', 'Bash', { command: 'rm -rf build' })
  o.permissionAsked('a1', 'Bash')
  assert.equal(o.agents.get('a1')?.st, 'waiting')
  assert.equal(o.summary().waiting, 1)
})

check('a finished subagent leaves the room at the next prompt', () => {
  const o = new Office(s)
  o.spawn('a1', 'api', 'x')
  o.turnComplete('a1', 'answer', 1200)
  assert.equal(o.agents.get('a1')?.st, 'done')
  assert.equal(o.ended.length, 1)
  o.turnComplete(undefined, 'answer')
  assert.equal(o.main.st, 'done')
  o.turnStart()
  assert.equal(o.agents.has('a1'), false)
  assert.ok(o.agents.has(MAIN))
})

check('a finished subagent resumed by a message works again', () => {
  const o = new Office(s)
  o.spawn('a1', 'api', 'x')
  o.turnComplete('a1', 'answer')
  assert.equal(o.agents.get('a1')?.ended, true)
  o.toolStart('a1', 'Bash', { command: 'make test' })
  const a = o.agents.get('a1')!
  assert.equal(a.ended, false)
  assert.equal(a.endedAt, undefined)
  assert.equal(a.st, 'running')
  assert.equal(o.summary().working, 1)
})

check('subagents are named after the folder their prompt names', () => {
  const parts = projectParts(['neuronio-dashboard', 'neuronio-dashboard-api', 'docs', '.claude'], '[submodule "fw"]\n\tpath = firmware/blips_firmware\n')
  const prompt = 'Voce esta atuando como agente especialista de neuronio-dashboard-api.\nNao toque em neuronio-dashboard.'
  assert.equal(agentName({ prompt, description: 'add endpoint', subagentType: 'general-purpose' }, parts), 'neuronio-dashboard-api')
  assert.equal(agentName({ prompt: 'work in firmware/blips_firmware', description: 'x', subagentType: 'general-purpose' }, parts), 'blips_firmware')
  assert.equal(agentName({ prompt: 'review', description: 'review diff', subagentType: 'feature-dev:code-reviewer' }, parts), 'code-reviewer')
  assert.equal(agentName({ prompt: 'p', description: 'd', subagentType: 'general-purpose', name: 'scout' }, parts), 'scout')
})

console.log(`\n${n} checks passed`)
