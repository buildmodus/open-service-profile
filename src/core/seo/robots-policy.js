// GENERATED FILE. Do not edit.
// Source of truth: the TypeScript in the the-marketing-guys repository (lib/).
// Regenerate with: node tooling/osp-generator/sync-cli-core.mjs
// Policy: every crawler is welcome on public pages. Search indexing,
// answer-engine retrieval, user-requested fetches, and model training all get
// the same access; only private application surfaces stay out. These are
// marketing sites whose purpose is to be known and cited by every assistant,
// so there is nothing to gain from withholding content from training.
const CONTENT_SIGNAL = 'Content-Signal: search=yes, ai-train=yes, ai-input=yes';
// Named explicitly so intent is unambiguous per vendor. A bot that finds its
// own group uses only that group, so every token here must carry the same
// rules as the wildcard; unlisted bots fall through to `*` with equal access.
const NAMED_BOTS = [
    // Google: Search, AI Overviews, AI Mode (Googlebot); Gemini grounding + training
    'Googlebot',
    'Google-Extended',
    // Microsoft: Bing index powers Copilot answers
    'bingbot',
    // OpenAI: ChatGPT search index, user browsing, training
    'OAI-SearchBot',
    'ChatGPT-User',
    'GPTBot',
    // Anthropic: Claude search index, user fetches, training
    'Claude-SearchBot',
    'Claude-User',
    'ClaudeBot',
    // Perplexity: index + user fetches
    'PerplexityBot',
    'Perplexity-User',
    // Apple: Siri, Spotlight, Safari; Applebot-Extended is the training opt-in
    'Applebot',
    'Applebot-Extended',
    // Meta AI: search index, user fetches, training
    'Meta-WebIndexer',
    'meta-externalfetcher',
    'meta-externalagent',
    // Amazon: Alexa search, user fetches, training
    'Amzn-SearchBot',
    'Amzn-User',
    'Amazonbot',
    // Mistral: index, user fetches, training
    'MistralAI-Index',
    'MistralAI-User',
    'MistralAI-Training',
    // DuckDuckGo DuckAssist, You.com search
    'DuckAssistBot',
    'YouBot',
    // Common Crawl: open corpus many models train on
    'CCBot',
];
// Public agent surfaces that live under /api/ but are advertised in llms.txt
// and the api-catalog, so they must stay crawlable. They are listed as
// explicit Allow rules ahead of `Disallow: /api/` (and ahead of the wildcard
// group's `/*.json`) so the longest-match rule resolves in their favor.
const PUBLIC_API_PATHS = ['/api/mcp', '/api/openapi.json'];
function privatePaths(kind) {
    const paths = [
        '/api/',
        '/admin/',
        '/dashboard/',
        '/login',
        '/workspace',
        '/private/',
    ];
    if (kind === 'platform')
        paths.push('/client/');
    if (kind === 'client')
        paths.push('/search');
    return paths;
}
function allowedGroup(userAgents, disallowedPaths, publicApiPaths = PUBLIC_API_PATHS) {
    return [
        ...userAgents.map((bot) => `User-agent: ${bot}`),
        CONTENT_SIGNAL,
        'Allow: /',
        ...publicApiPaths.map((path) => `Allow: ${path}`),
        ...disallowedPaths.map((path) => `Disallow: ${path}`),
    ].join('\n');
}
export function buildPublicRobotsTxt({ baseUrl, kind, }) {
    const disallowedPaths = privatePaths(kind);
    const wildcardPaths = [...disallowedPaths, '/*.json'];
    return `# Robots.txt for ${baseUrl}
# Policy: all crawlers are welcome on public pages, including search engines,
# answer engines, user-requested fetchers, and model-training crawlers. Only
# private application surfaces are disallowed. Content-Signal is supplemental
# metadata; enforceable crawler access is defined by the User-agent rules.

${allowedGroup(['*'], wildcardPaths)}

# Search, answer engines, user-requested retrieval, and model training
${allowedGroup(NAMED_BOTS, disallowedPaths)}

Sitemap: ${baseUrl}/sitemap.xml

# Machine-readable site summaries
# ${baseUrl}/llms.txt
# ${baseUrl}/llms-full.txt`;
}
/**
 * The AI crawler tokens grouped by what each vendor documents the token as
 * controlling, so the generator can write a section that says only what an
 * owner answered to two questions: may assistants READ the public pages
 * (search and answer indexing, fetches a user asked for), and may the pages be
 * used for model TRAINING. Same names as NAMED_BOTS, plus the training-only
 * tokens the platform has no reason to name (Bytespider, the legacy
 * anthropic-ai).
 *
 * Read (indexing or user-requested fetching, no training):
 *   OAI-SearchBot (ChatGPT search index), ChatGPT-User (user-requested fetch);
 *   Claude-SearchBot (index), Claude-User (user-requested fetch);
 *   PerplexityBot (index), Perplexity-User (user-requested fetch);
 *   Applebot (Siri, Spotlight, Safari search; training is Applebot-Extended);
 *   Meta-WebIndexer (index), meta-externalfetcher (user-requested fetch);
 *   Amzn-SearchBot (index), Amzn-User (user-requested fetch);
 *   MistralAI-Index, MistralAI-User; DuckAssistBot; YouBot.
 * Train:
 *   GPTBot, ClaudeBot, anthropic-ai (legacy Anthropic token), Applebot-Extended,
 *   MistralAI-Training, CCBot (the Common Crawl corpus), Bytespider (ByteDance).
 * Inseparable, so they follow the TRAINING answer and the output says so:
 *   Google-Extended controls Gemini training AND Gemini grounding with one
 *   token; meta-externalagent is documented for training AND indexing;
 *   Amazonbot is documented for Alexa answers AND training. "Reading yes,
 *   training no" must not allow any of them.
 */
export const AI_READ_BOTS = [
    'OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User',
    'Applebot', 'Meta-WebIndexer', 'meta-externalfetcher', 'Amzn-SearchBot', 'Amzn-User', 'MistralAI-Index', 'MistralAI-User',
    'DuckAssistBot', 'YouBot',
];
export const AI_TRAIN_BOTS = [
    'GPTBot', 'ClaudeBot', 'anthropic-ai', 'Google-Extended', 'Applebot-Extended', 'meta-externalagent', 'Amazonbot',
    'Bytespider', 'MistralAI-Training', 'CCBot',
];
/** Tokens whose vendor gives one switch for training and for reading; each is in AI_TRAIN_BOTS and the output explains why. */
export const AI_INSEPARABLE_BOTS = {
    'Google-Extended': 'one token controls Gemini model training and Gemini grounding together, so it follows your training answer',
    'meta-externalagent': 'Meta documents it for model training and for indexing together, so it follows your training answer',
    Amazonbot: 'Amazon documents it for Alexa answers and for model training together, so it follows your training answer',
};
const DISALLOW_NOTE = '# A named group does not inherit the Disallow lines of your User-agent: * group; copy them into each group below.';
/**
 * One group. An allowing group repeats the Disallow lines the caller passed
 * (the owner's own private paths), because a crawler that finds its own group
 * uses only that group. A denying group needs none.
 */
function directiveGroup(bots, allow, disallow = []) {
    return [
        ...bots.map((bot) => `User-agent: ${bot}`),
        allow ? 'Allow: /' : 'Disallow: /',
        ...(allow ? disallow.map((path) => `Disallow: ${path}`) : []),
    ].join('\n');
}
function templateGroup(bots, disallow) {
    return directiveGroup(bots, true, disallow).split('\n').map((line) => `# ${line.replace('Allow: /', 'Allow: /   (or Disallow: /)')}`);
}
/** Normalizes the owner's Disallow paths: one per line, the leading slash kept, blanks dropped. */
function cleanDisallow(paths) {
    return Array.from(new Set((paths ?? []).map((path) => path.trim()).filter((path) => path.startsWith('/') && path !== '/')));
}
/**
 * The AI-crawler section for a site this platform does not host, written
 * only from what the owner answered. No answer, no directive: an unanswered
 * question produces a fully commented template with a TODO line, never an
 * Allow that widens access the owner did not state. With answers, each group
 * carries the directive the owner chose, repeats the owner's Disallow paths
 * (a named group does not inherit the wildcard group's), and Content-Signal
 * repeats the same choices (search is left to the owner's existing rules and
 * is not asserted). Tokens that cannot separate reading from training sit in
 * the training group, each with a comment line saying so.
 */
export function buildRobotsAiSection({ baseUrl, answers = {}, disallow }) {
    const paths = cleanDisallow(disallow);
    const lines = [
        `# AI crawler access for ${baseUrl}`,
        '# Merge this section into your existing robots.txt; it does not replace it.',
        '# Each group below names the crawlers of one kind and the answer you gave.',
        DISALLOW_NOTE,
    ];
    const readAnswered = typeof answers.aiRead === 'boolean';
    const trainAnswered = typeof answers.aiTrain === 'boolean';
    lines.push('');
    if (readAnswered) {
        lines.push('# AI assistants reading public pages (search, answers, user-requested fetches):', directiveGroup(AI_READ_BOTS, answers.aiRead === true, paths));
    }
    else {
        lines.push('# TODO: robots.aiRead: your website does not state this; answer it in the form (or pass --ai-read) and re-run.');
        lines.push('# Until then this group is a template (commented out) and changes nothing:');
        lines.push(...templateGroup(AI_READ_BOTS, paths));
    }
    lines.push('');
    const inseparable = AI_TRAIN_BOTS.filter((bot) => bot in AI_INSEPARABLE_BOTS).map((bot) => `# ${bot}: ${AI_INSEPARABLE_BOTS[bot]}.`);
    if (trainAnswered) {
        lines.push('# Model training crawlers:', ...inseparable, directiveGroup(AI_TRAIN_BOTS, answers.aiTrain === true, paths));
    }
    else {
        lines.push('# TODO: robots.aiTrain: your website does not state this; answer it in the form (or pass --ai-train) and re-run.');
        lines.push('# Until then this group is a template (commented out) and changes nothing:');
        lines.push(...inseparable);
        lines.push(...templateGroup(AI_TRAIN_BOTS, paths));
    }
    lines.push('');
    if (readAnswered && trainAnswered) {
        lines.push('# Supplemental metadata; the User-agent rules above are what crawlers enforce.');
        lines.push(`Content-Signal: ai-train=${answers.aiTrain ? 'yes' : 'no'}, ai-input=${answers.aiRead ? 'yes' : 'no'}`);
    }
    else {
        lines.push('# Content-Signal is written once both answers are given.');
    }
    lines.push('', '# Machine-readable site summaries (uncomment after you upload them)', `# ${baseUrl}/llms.txt`, `# ${baseUrl}/llms-full.txt`);
    return lines.join('\n');
}
