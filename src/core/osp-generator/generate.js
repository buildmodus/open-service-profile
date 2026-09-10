// GENERATED FILE. Do not edit.
// Source of truth: the TypeScript in the the-marketing-guys repository (lib/).
// Regenerate with: node tooling/osp-generator/sync-cli-core.mjs
import { buildDraft } from './build.js';
import { extractFacts } from './extract.js';
import { renderLevelOneJsonLd } from './jsonld.js';
import { hostingInstructions, renderLlmsFullTxt, renderLlmsTxt, renderRobotsSection } from './llms.js';
/**
 * The pure generator: fetched documents in, five files out. The platform's
 * web tool and the standalone CLI both call this with the pages their own
 * shells fetched, so the same site produces the same draft from either door.
 */
export function generateOpenServiceProfile(input) {
    const facts = extractFacts(input);
    const draft = buildDraft(facts, input);
    const updatedOn = input.now.toISOString().slice(0, 10);
    const origin = facts.origin;
    return {
        origin,
        manifest: draft.manifest,
        level: draft.level,
        todos: draft.todos,
        validation: draft.validation,
        facts: draft.facts,
        derivations: draft.derivations,
        jsonLd: draft.jsonLd,
        pages: input.pages.map((page) => ({ url: page.url, kind: page.kind, fetched: page.fetched, ...(page.status ? { status: page.status } : {}) })),
        sitemapTruncated: input.sitemapTruncated === true,
        ratingsIgnored: facts.ratingsIgnored,
        files: {
            manifest: `${JSON.stringify(draft.manifest, null, 2)}\n`,
            llmsTxt: renderLlmsTxt(draft, facts, updatedOn),
            llmsFullTxt: renderLlmsFullTxt(draft, facts, input.pages, input.sitemapTruncated === true, updatedOn),
            robotsSection: renderRobotsSection(origin, draft.todos, input.answers),
            jsonLd: renderLevelOneJsonLd(draft.manifest, facts, draft.todos),
        },
        hosting: hostingInstructions(origin),
    };
}
export { extractFacts } from './extract.js';
export { buildDraft } from './build.js';
export { classifyPath, cleanSiteUrls, isSameHostOrTwin, isSitemapIndex, PAGE_FETCH_CAP, pickPagesToFetch, robotsSitemaps, sameSiteUrl, SITEMAP_URL_CAP, sitemapLocs } from './pages.js';
