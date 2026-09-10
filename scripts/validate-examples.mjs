// Validates every example manifest in examples/v0.1/ against schemas/v0.1/manifest.schema.json
// and the ten constraints listed after Appendix A of the specification. The validator itself is
// src/validate.mjs, shared with the generator CLI (bin/open-service-profile.mjs).
// Run: node scripts/validate-examples.mjs            validates every examples/v0.1/*.json
//      node scripts/validate-examples.mjs a.json b.json   validates the given manifest files
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { validateManifest } from '../src/validate.mjs'

const root = resolve(new URL('..', import.meta.url).pathname)
const dir = resolve(root, 'examples/v0.1')
const args = process.argv.slice(2)
const files = args.length
  ? args.map(a => resolve(process.cwd(), a))
  : readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => resolve(dir, f))
let failed = 0
for (const file of files) {
  const name = args.length ? file : file.slice(dir.length + 1)
  const manifest = JSON.parse(readFileSync(file, 'utf8'))
  const errors = validateManifest(manifest)
  if (errors.length) { failed++; console.log(`FAIL ${name}`); errors.forEach(e => console.log(`  ${e}`)) }
  else console.log(`ok   ${name}`)
}
if (failed) { console.log(`${failed} manifest(s) failed`); process.exit(1) }
console.log(`${files.length} manifest(s) valid against schemas/v0.1/manifest.schema.json plus the Appendix A constraints`)
