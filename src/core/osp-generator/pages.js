// GENERATED FILE. Do not edit.
// Source of truth: the TypeScript in the the-marketing-guys repository (lib/).
// Regenerate with: node tooling/osp-generator/sync-cli-core.mjs
/**
 * URL classification and page selection, shared by the platform crawler and
 * the CLI so both fetch the same pages for the same site. Pure.
 */
/** Home, then the single-purpose pages, then services and locations: 12 in all. */
export const PAGE_FETCH_CAP = 12;
/** Sitemap URLs kept for the page list and the service slugs, before the fetch cap. */
export const SITEMAP_URL_CAP = 300;
const SERVICE_PATH = /^\/(?:services?|what-we-do|repairs?|our-services)\/[^/]+(?:\/[^/]+)?\/?$/i;
const LOCATION_PATH = /^\/(?:locations?|shops?|our-locations|stores?)\/[^/]+(?:\/[^/]+)?\/?$/i;
const SERVICE_AREA_PATH = /^\/(?:service-areas?|areas?|areas-we-serve|cities|locations-served)\/[^/]+\/?$/i;
const CONTACT_PATH = /^\/(?:contact(?:-us)?|get-in-touch)\/?$/i;
const ABOUT_PATH = /^\/(?:about(?:-us)?|our-story|who-we-are|our-team|team)\/?$/i;
const SCHEDULE_PATH = /^\/(?:schedule(?:-service|-appointment|-now)?|book(?:-now|-online|-appointment|-service)?|booking|appointments?|request(?:-service|-appointment|-a-quote)?|make-an-appointment)\/?$/i;
export function classifyPath(pathname) {
    const path = pathname.replace(/\/+$/, '') || '/';
    if (path === '/')
        return 'home';
    if (SCHEDULE_PATH.test(path))
        return 'schedule';
    if (CONTACT_PATH.test(path))
        return 'contact';
    if (ABOUT_PATH.test(path))
        return 'about';
    if (SERVICE_AREA_PATH.test(path))
        return 'service-area';
    if (LOCATION_PATH.test(path))
        return 'location';
    if (SERVICE_PATH.test(path))
        return 'service';
    return 'other';
}
/** The redirect and sitemap fence: the same host, or its www twin, nothing else. */
export function isSameHostOrTwin(candidate, allowed) {
    const strip = (host) => host.toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
    return strip(candidate) === strip(allowed);
}
/** Absolute same-origin URL (www twin accepted) with fragment dropped, or null. */
export function sameSiteUrl(candidate, origin, base = origin) {
    let url;
    try {
        url = new URL(candidate, base);
    }
    catch {
        return null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:')
        return null;
    if (!isSameHostOrTwin(url.hostname, new URL(origin).hostname))
        return null;
    url.hash = '';
    return url.toString();
}
/** Drop pagination, feeds, assets, and query-bearing URLs; one entry per path. */
export function cleanSiteUrls(urls, origin) {
    const seen = new Set();
    const out = [];
    for (const raw of urls) {
        const url = sameSiteUrl(raw, origin);
        if (!url)
            continue;
        const parsed = new URL(url);
        if (parsed.search)
            continue;
        if (/\.(?:xml|pdf|jpe?g|png|gif|webp|svg|css|js|ico|mp4|zip|txt)$/i.test(parsed.pathname))
            continue;
        if (/\/(?:page|feed|tag|category|author|wp-json|wp-content)\b/i.test(parsed.pathname))
            continue;
        const key = parsed.pathname.replace(/\/+$/, '') || '/';
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(`${parsed.origin}${key}`);
    }
    return out;
}
/**
 * Which URLs to fetch, in priority order, inside the cap. The home page is
 * always first and counts. Contact, schedule, and about pages carry the
 * business facts; service and location pages fill the remaining slots,
 * alternating so a site with many services still gets its locations.
 */
export function pickPagesToFetch(urls, origin, cap = PAGE_FETCH_CAP) {
    const classified = urls
        .map((url) => ({ url, kind: classifyPath(new URL(url).pathname) }))
        .filter((entry) => entry.kind !== 'home');
    const byKind = (kind) => classified.filter((entry) => entry.kind === kind);
    const picked = [{ url: `${origin}/`, kind: 'home' }];
    const take = (entries, limit) => {
        for (const entry of entries.slice(0, limit)) {
            if (picked.length >= cap)
                return;
            if (!picked.some((existing) => existing.url === entry.url))
                picked.push(entry);
        }
    };
    take(byKind('contact'), 1);
    take(byKind('schedule'), 1);
    take(byKind('about'), 1);
    const services = byKind('service');
    const locations = [...byKind('location'), ...byKind('service-area')];
    let serviceIndex = 0;
    let locationIndex = 0;
    while (picked.length < cap && (serviceIndex < services.length || locationIndex < locations.length)) {
        if (serviceIndex < services.length)
            take([services[serviceIndex++]], 1);
        if (picked.length < cap && locationIndex < locations.length)
            take([locations[locationIndex++]], 1);
    }
    return picked;
}
/** `<loc>` values from a sitemap or sitemap index document. */
export function sitemapLocs(xml) {
    const locs = [];
    for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi))
        locs.push(match[1].trim());
    return locs;
}
export function isSitemapIndex(xml) {
    return /<sitemapindex\b/i.test(xml);
}
/** `Sitemap:` lines from robots.txt. */
export function robotsSitemaps(robots) {
    return robots
        .split(/\r?\n/)
        .map((line) => line.match(/^\s*sitemap:\s*(\S+)/i)?.[1])
        .filter((value) => !!value);
}
