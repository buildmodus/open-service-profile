// GENERATED FILE. Do not edit.
// Source of truth: the TypeScript in the the-marketing-guys repository (lib/).
// Regenerate with: node tooling/osp-generator/sync-cli-core.mjs
/**
 * The few HTML readings the generator needs, by regular expression over the
 * raw document. No DOM: the core runs in the CLI with zero dependencies, and
 * the inputs are title, h1, meta tags, and href attributes, which regular
 * expressions read reliably enough for a draft a human reviews.
 */
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'" };
export function decodeEntities(value) {
    return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entity) => {
        const lower = entity.toLowerCase();
        if (lower in ENTITIES)
            return ENTITIES[lower];
        if (lower.startsWith('#x'))
            return String.fromCodePoint(parseInt(lower.slice(2), 16));
        if (lower.startsWith('#'))
            return String.fromCodePoint(parseInt(lower.slice(1), 10));
        return whole;
    });
}
export function collapseSpace(value) {
    return value.replace(/\s+/g, ' ').trim();
}
export function stripTags(fragment) {
    return collapseSpace(decodeEntities(fragment.replace(/<[^>]+>/g, ' ')));
}
export function pageTitle(html) {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = match ? stripTags(match[1]) : '';
    return title || null;
}
export function firstH1(html) {
    const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
    const text = match ? stripTags(match[1]) : '';
    return text || null;
}
/** `<meta name="description">`, `<meta property="og:site_name">`, and friends. */
export function metaContent(html, key) {
    const pattern = new RegExp(`<meta\\b[^>]*(?:name|property)\\s*=\\s*["']${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i');
    const tag = html.match(pattern)?.[0];
    if (!tag)
        return null;
    const content = tag.match(/\bcontent\s*=\s*("([^"]*)"|'([^']*)')/i);
    const value = content ? collapseSpace(decodeEntities(content[2] ?? content[3] ?? '')) : '';
    return value || null;
}
/** Every href on the page, decoded, as written (relative or absolute). */
export function hrefs(html) {
    const out = [];
    for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
        const value = decodeEntities(match[2] ?? match[3] ?? '').trim();
        if (value)
            out.push(value);
    }
    return out;
}
/**
 * Visible text, lowercased, with scripts, styles, and tags removed. Used only
 * for wording checks (does the site say "mobile service"?), never as a fact
 * source on its own. Capped so a huge page cannot dominate the run.
 */
export function visibleText(html, cap = 40_000) {
    const stripped = html
        .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ');
    return stripTags(stripped).toLowerCase().slice(0, cap);
}
/**
 * A page title minus its brand suffix: "AC Repair | Acme Air" to "AC Repair".
 * The separator set is the usual one (pipe, dashes, dots, colon); only the
 * first segment is kept, so a title that leads with the brand loses the page
 * name, which the caller can fall back from with the h1.
 */
export function titleLead(title) {
    const [lead] = title.split(new RegExp(`\\s+[|\u00b7\u2022\u2013\u2014-]\\s+|\\s*:\\s+`));
    return collapseSpace(lead ?? title);
}
/**
 * The brand segment of a page title, judged against the host name: in
 * "Acme Plumbing | Dallas, TX" on acmeplumbing.example the segment whose
 * letters match the domain stem is the brand, wherever it sits. With no
 * match the title is not a name source and the caller moves on.
 */
export function brandFromTitle(title, host) {
    const stem = host.replace(/^www\./, '').split('.')[0]?.replace(/[^a-z0-9]/g, '') ?? '';
    if (!stem)
        return null;
    const parts = title.split(new RegExp(`\\s+[|\u00b7\u2022\u2013\u2014-]\\s+`)).map(collapseSpace).filter(Boolean);
    const letters = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = parts.find((part) => {
        const compact = letters(part);
        return compact.length >= 3 && (compact === stem || compact.includes(stem) || stem.includes(compact));
    });
    return match ?? null;
}
/** `tel:` link targets as dialable digit strings (the leading + kept). */
export function telLinks(html) {
    return hrefs(html)
        .filter((href) => /^tel:/i.test(href))
        .map((href) => decodeURIComponent(href.slice(4)).replace(/[^\d+]/g, ''))
        .filter(Boolean);
}
export function mailtoLinks(html) {
    return hrefs(html)
        .filter((href) => /^mailto:/i.test(href))
        .map((href) => decodeURIComponent(href.slice(7)).split('?')[0].trim())
        .filter(Boolean);
}
/**
 * A US phone in any common written form to E.164 and a national display form.
 * Only 10-digit NANP numbers (with or without a leading 1) are accepted: the
 * spec is US-only, and anything else is not a fact this generator records.
 */
export function normalizeUsPhone(raw) {
    const digits = raw.replace(/\D/g, '');
    const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    if (ten.length !== 10 || /^[01]/.test(ten) || /^[01]/.test(ten.slice(3)))
        return null;
    return { e164: `+1${ten}`, national: `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` };
}
