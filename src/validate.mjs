// Validates a manifest against schemas/v0.1/manifest.schema.json plus the Appendix A constraints
// the schema cannot express. The checker itself is the generator core's (src/core/standards/
// json-schema.js and osp-manifest.js, generated from the maintainer's TypeScript), so the web
// tool, the public audit, this CLI, and scripts/validate-examples.mjs judge a manifest by one
// implementation. No dependencies.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { validateJsonSchema } from './core/standards/json-schema.js'
import { manifestConstraintErrors } from './core/standards/osp-manifest.js'

// fileURLToPath, not .pathname: a checkout path with a space (or a Windows drive) must still resolve.
export const schemaPath = fileURLToPath(new URL('../schemas/v0.1/manifest.schema.json', import.meta.url))
const rootSchema = JSON.parse(readFileSync(schemaPath, 'utf8'))

/** Every schema and constraint failure for one manifest, as plain lines; empty when it is valid. */
export function validateManifest(manifest) {
  const errors = validateJsonSchema(manifest, rootSchema)
  if (manifest && typeof manifest === 'object' && !Array.isArray(manifest)) errors.push(...manifestConstraintErrors(manifest))
  return errors
}
