// Validates every example manifest in examples/v0.1/ against schemas/v0.1/manifest.schema.json
// and the ten constraints listed after Appendix A of the specification.
// No dependencies. Supports the JSON Schema 2020-12 subset the manifest schema uses:
// type, required, properties, additionalProperties (boolean), propertyNames, enum, const,
// pattern, minLength, maxLength, minimum, maximum, items, minItems, maxItems, uniqueItems,
// $ref (local #/$defs and sibling files by relative path), if/then/else, oneOf, anyOf, allOf,
// not, and the formats date-time, email, uri.
// Run: node scripts/validate-examples.mjs
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const schemaPath = resolve(root, 'schemas/v0.1/manifest.schema.json')
const rootSchema = JSON.parse(readFileSync(schemaPath, 'utf8'))
const fileCache = new Map([[schemaPath, rootSchema]])

function loadRef(ref, baseFile) {
  const [file, frag = ''] = ref.split('#')
  const target = file ? resolve(dirname(baseFile), file) : baseFile
  if (!fileCache.has(target)) fileCache.set(target, JSON.parse(readFileSync(target, 'utf8')))
  let node = fileCache.get(target)
  for (const part of frag.split('/').filter(Boolean)) {
    node = node[part.replace(/~1/g, '/').replace(/~0/g, '~')]
    if (node === undefined) throw new Error(`unresolvable $ref ${ref}`)
  }
  return { schema: node, file: target }
}

const typeOf = v => v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v
const formats = {
  'date-time': v => !Number.isNaN(Date.parse(v)) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(v),
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  uri: v => { try { new URL(v); return true } catch { return false } },
}

function validate(schema, value, path, file, errors) {
  if (schema === true) return
  if (schema === false) { errors.push(`${path}: schema false`); return }
  if (schema.$ref) {
    const r = loadRef(schema.$ref, file)
    validate(r.schema, value, path, r.file, errors)
  }
  const t = typeOf(value)
  if (schema.type) {
    const types = [].concat(schema.type)
    const ok = types.some(x => x === t || (x === 'number' && t === 'integer'))
    if (!ok) { errors.push(`${path}: expected ${types.join('|')}, got ${t}`); return }
  }
  if ('const' in schema && JSON.stringify(schema.const) !== JSON.stringify(value)) errors.push(`${path}: must equal ${JSON.stringify(schema.const)}`)
  if (schema.enum && !schema.enum.some(e => JSON.stringify(e) === JSON.stringify(value))) errors.push(`${path}: not in enum ${JSON.stringify(schema.enum)}`)
  if (t === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path}: shorter than ${schema.minLength}`)
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${path}: longer than ${schema.maxLength}`)
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) errors.push(`${path}: does not match ${schema.pattern}`)
    if (schema.format && formats[schema.format] && !formats[schema.format](value)) errors.push(`${path}: invalid ${schema.format}`)
  }
  if (t === 'integer' || t === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: below ${schema.minimum}`)
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: above ${schema.maximum}`)
  }
  if (t === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: fewer than ${schema.minItems} items`)
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path}: more than ${schema.maxItems} items`)
    if (schema.uniqueItems && new Set(value.map(v => JSON.stringify(v))).size !== value.length) errors.push(`${path}: items not unique`)
    if (schema.items) value.forEach((v, i) => validate(schema.items, v, `${path}[${i}]`, file, errors))
  }
  if (t === 'object') {
    for (const k of schema.required || []) if (!(k in value)) errors.push(`${path}: missing required ${k}`)
    const props = schema.properties || {}
    for (const [k, v] of Object.entries(value)) {
      if (k in props) validate(props[k], v, `${path}.${k}`, file, errors)
      else if (schema.additionalProperties === false) errors.push(`${path}: unexpected property ${k}`)
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') validate(schema.additionalProperties, v, `${path}.${k}`, file, errors)
      if (schema.propertyNames) validate(schema.propertyNames, k, `${path} (property name ${k})`, file, errors)
    }
  }
  const passes = s => { const e = []; validate(s, value, path, file, e); return e.length === 0 }
  if (schema.if) {
    const branch = passes(schema.if) ? schema.then : schema.else
    if (branch) validate(branch, value, path, file, errors)
  }
  if (schema.allOf) schema.allOf.forEach(s => validate(s, value, path, file, errors))
  if (schema.anyOf && !schema.anyOf.some(passes)) errors.push(`${path}: matches none of anyOf`)
  if (schema.oneOf && schema.oneOf.filter(passes).length !== 1) errors.push(`${path}: must match exactly one of oneOf`)
  if (schema.not && passes(schema.not)) errors.push(`${path}: must not match schema`)
}

function constraints(m, errors) {
  const locIds = (m.locations || []).map(l => l.id)
  const primaries = (m.locations || []).filter(l => l.isPrimary === true).length
  if (primaries !== 1) errors.push(`constraint 1: expected exactly one isPrimary location, found ${primaries}`)
  for (const r of m.coverage?.radius || []) {
    if (!locIds.includes(r.locationId)) errors.push(`constraint 2: coverage.radius locationId ${r.locationId} names no location`)
    const loc = (m.locations || []).find(l => l.id === r.locationId)
    if (loc && !loc.geo) errors.push(`constraint 3: location ${r.locationId} referenced by coverage.radius has no geo`)
  }
  for (const s of m.services || []) for (const id of s.locationIds || []) if (!locIds.includes(id)) errors.push(`constraint 2: service ${s.slug} locationIds names no location ${id}`)
  const dup = arr => arr.filter((x, i) => arr.indexOf(x) !== i)
  if (dup((m.services || []).map(s => s.slug)).length) errors.push(`constraint 4: duplicate service slugs ${dup((m.services || []).map(s => s.slug))}`)
  if (dup(locIds).length) errors.push(`constraint 4: duplicate location ids ${dup(locIds)}`)
  const winIds = (m.bookingPolicy?.windows || []).map(w => w.id)
  if (dup(winIds).length) errors.push(`constraint 4: duplicate window ids ${dup(winIds)}`)
  if (m.bookingPolicy?.afterHoursNote && m.bookingPolicy.emergencyAvailable !== true) errors.push('constraint 5: afterHoursNote present but emergencyAvailable is not true')
  for (const l of m.locations || []) for (const [day, h] of Object.entries(l.hours?.weekly || {})) {
    if (h && typeof h === 'object' && h.open && h.close && h.open !== '24_hours' && h.open >= h.close) errors.push(`constraint 6: ${l.id} ${day} open ${h.open} not before close ${h.close}`)
  }
  if (['on_site', 'both'].includes(m.business?.serviceModel) && !m.coverage) errors.push('constraint 7: coverage required for on_site or both')
  for (const w of m.bookingPolicy?.windows || []) if (w.start && w.end && w.start >= w.end) errors.push(`constraint 10: window ${w.id} start not before end`)
}

const dir = resolve(root, 'examples/v0.1')
let failed = 0
for (const name of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  const manifest = JSON.parse(readFileSync(resolve(dir, name), 'utf8'))
  const errors = []
  validate(rootSchema, manifest, '$', schemaPath, errors)
  constraints(manifest, errors)
  if (errors.length) { failed++; console.log(`FAIL ${name}`); errors.forEach(e => console.log(`  ${e}`)) }
  else console.log(`ok   ${name}`)
}
if (failed) { console.log(`${failed} example(s) failed`); process.exit(1) }
console.log('all examples valid against schemas/v0.1/manifest.schema.json plus the Appendix A constraints')
