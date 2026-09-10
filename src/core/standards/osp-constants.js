// GENERATED FILE. Do not edit.
// Source of truth: the TypeScript in the the-marketing-guys repository (lib/).
// Regenerate with: node tooling/osp-generator/sync-cli-core.mjs
/**
 * Open Service Profile (OSP): the facts every surface repeats.
 *
 * No I/O and no Node-only imports, so the middleware (well-known rewrite), the
 * manifest builder, the standards pages, and llms.txt all read the same
 * strings. The spec text itself is loaded by lib/standards/open-service-profile.ts.
 */
export const OSP_NAME = 'Open Service Profile';
export const OSP_SHORT_NAME = 'OSP';
/** The manifest schema version this platform emits and the spec this page renders. */
export const OSP_SPEC_VERSION = '0.1';
/** Publication date of Draft v0.1, also the sitemap lastmod for the standards pages. */
export const OSP_PUBLISHED_ON = '2026-09-07';
/** Date of the latest revision to the v0.1 text; the status line names it. */
export const OSP_REVISED_ON = '2026-09-09';
/** Revision counter within v0.1, bumped whenever the text changes on one date. */
export const OSP_REVISION = 4;
/**
 * The status label every surface prints. It must equal the spec's own Status
 * line word for word (tests/standards-page.test.ts asserts exact equality
 * against the Markdown), so a revision bumps this constant and the file together.
 */
export const OSP_STATUS = `Draft v${OSP_SPEC_VERSION}, revised ${OSP_REVISED_ON} (revision ${OSP_REVISION})`;
export const OSP_WELL_KNOWN_PATH = '/.well-known/open-service-profile';
/** Route paths on the parent site (root routes, service market only). */
export const STANDARDS_INDEX_PATH = '/standards';
export const OSP_PATH = '/standards/open-service-profile';
export const OSP_VERSIONED_PATH = `${OSP_PATH}/v${OSP_SPEC_VERSION}`;
export const OSP_LATEST_PATH = `${OSP_PATH}/latest`;
/** The profile generator (web tool), parent site only; the CLI is `npx open-service-profile init <url>`. */
export const OSP_GENERATOR_PATH = '/tools/open-service-profile';
export const OSP_GENERATOR_CLI = 'npx open-service-profile init <url>';
/** First publication of the generator page; its sitemap lastmod. */
export const OSP_GENERATOR_PUBLISHED_ON = '2026-09-10';
const PARENT_ORIGIN = 'https://www.theservicemarketingguys.com';
/** Canonical URL of the standard (the versioned document). */
export const OSP_CANONICAL_URL = `${PARENT_ORIGIN}${OSP_VERSIONED_PATH}`;
/** The generator's absolute URL on the parent site. */
export const OSP_GENERATOR_URL = `${PARENT_ORIGIN}${OSP_GENERATOR_PATH}`;
/** The unversioned landing URL the credit lines and manifests point at. */
export const OSP_STANDARD_URL = `${PARENT_ORIGIN}${OSP_PATH}/`;
export const OSP_BYLINE = 'Maintained by The Service Marketing Guys, an EasyServe company.';
export const OSP_COPYRIGHT = 'Copyright EasyServe LLC. Text CC BY 4.0, schemas and code MIT.';
// The public source repository is not decided yet. When it is, its URL is
// added here and rendered by the standards page footer and the spec preamble.
// Nothing else should hardcode a repository link.
export const OSP_REPOSITORY_URL = null;
