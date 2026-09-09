// One-off: extract JSON Schemas and examples from spec/v0.1.md into schemas/ and examples/.
// Run from the repository root: node scripts/extract-from-spec.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const spec = readFileSync(resolve(root, 'spec/v0.1.md'), 'utf8').split('\n')
const BASE = 'https://www.theservicemarketingguys.com/standards/open-service-profile/v0.1/'

function sectionRange(startPattern, depth) {
  const start = spec.findIndex(l => startPattern.test(l))
  if (start < 0) throw new Error(`heading not found: ${startPattern}`)
  const hashes = '#'.repeat(depth)
  let end = spec.length
  for (let i = start + 1; i < spec.length; i++) {
    const m = spec[i].match(/^(#+) /)
    if (m && m[1].length <= depth) { end = i; break }
  }
  return [start, end]
}
function fencesIn([start, end]) {
  const out = []
  for (let i = start; i < end; i++) {
    if (/^```json\s*$/.test(spec[i])) {
      let j = i + 1
      while (j < end && !/^```\s*$/.test(spec[j])) j++
      if (j >= end) throw new Error(`unterminated fence at line ${i + 1}`)
      out.push({ line: i + 1, text: spec.slice(i + 1, j).join('\n') })
      i = j
    }
  }
  return out
}
function write(rel, obj) {
  writeFileSync(resolve(root, rel), JSON.stringify(obj, null, 2) + '\n')
  console.log(`wrote ${rel}`)
}
function withId(obj, rel, description) {
  const out = {}
  if (!obj.$schema) out.$schema = 'https://json-schema.org/draft/2020-12/schema'
  if (!obj.$id) out.$id = BASE + rel
  for (const [k, v] of Object.entries(obj)) out[k] = v
  if (!out.description && description) out.description = description
  return out
}

// Appendix A
const a = fencesIn(sectionRange(/^## Appendix A\./, 2))
if (a.length !== 1) throw new Error(`Appendix A: expected 1 fence, found ${a.length}`)
write('schemas/v0.1/manifest.schema.json', withId(JSON.parse(a[0].text), 'manifest.schema.json'))

// Appendix B
const bRange = sectionRange(/^## Appendix B\./, 2)
const bIntroEnd = spec.findIndex((l, i) => i > bRange[0] && /^### B\.1 /.test(l))
const common = fencesIn([bRange[0], bIntroEnd])
if (common.length !== 1) throw new Error(`Appendix B intro: expected 1 fence, found ${common.length}`)
write('schemas/v0.1/tools/tools-common.schema.json', withId(JSON.parse(common[0].text), 'tools-common.schema.json', 'Shared definitions for Open Service Profile v0.1 tool schemas.'))

const toolHeads = []
for (let i = bRange[0]; i < bRange[1]; i++) {
  const m = spec[i].match(/^### B\.(\d) `([a-z_]+)`/)
  if (m) toolHeads.push({ line: i, name: m[2] })
}
if (toolHeads.length !== 6) throw new Error(`Appendix B: expected 6 tools, found ${toolHeads.length}`)
toolHeads.forEach((t, idx) => {
  const end = idx + 1 < toolHeads.length ? toolHeads[idx + 1].line : bRange[1]
  const f = fencesIn([t.line, end])
  if (f.length !== 2) throw new Error(`${t.name}: expected 2 fences (input, output), found ${f.length}`)
  write(`schemas/v0.1/tools/${t.name}.input.schema.json`, withId(JSON.parse(f[0].text), `${t.name}.input.schema.json`, `Input for the Open Service Profile v0.1 tool ${t.name}.`))
  const outDesc = `Output for the Open Service Profile v0.1 tool ${t.name}: oneOf the success shape or an ErrorResult constrained to this tool's error codes.`
  write(`schemas/v0.1/tools/${t.name}.output.schema.json`, withId(JSON.parse(f[1].text), `${t.name}.output.schema.json`, outDesc))
})

// Appendix C
const cRange = sectionRange(/^## Appendix C\./, 2)
// C.4 is JSON-LD, not a manifest; it is written with a .jsonld extension so validate-examples.mjs skips it.
const names = { 'C.1': 'hvac-two-locations.json', 'C.2': 'auto-repair-single-location.json', 'C.3': 'marine-repair-yard.json', 'C.4': 'hvac-two-locations.level1.jsonld' }
for (let i = cRange[0]; i < cRange[1]; i++) {
  const m = spec[i].match(/^### (C\.\d) /)
  if (!m) continue
  let end = cRange[1]
  for (let j = i + 1; j < cRange[1]; j++) if (/^### /.test(spec[j])) { end = j; break }
  const f = fencesIn([i, end])
  if (f.length !== 1) throw new Error(`${m[1]}: expected 1 fence, found ${f.length}`)
  if (!names[m[1]]) throw new Error(`${m[1]}: no output name mapped`)
  write(`examples/v0.1/${names[m[1]]}`, JSON.parse(f[0].text))
}
