// GENERATED FILE. Do not edit.
// Source of truth: the TypeScript in the the-marketing-guys repository (lib/).
// Regenerate with: node tooling/osp-generator/sync-cli-core.mjs
import { asJsonLdArray, extractJsonLdNodes, isJsonLdRecord, isLocalBusinessNode, ratingFieldPaths, typesOf, } from '../standards/json-ld.js';
import { clampText, toRegionCode, toZip5, toOspSlug, OSP_SLUG } from '../standards/osp-manifest.js';
import { hoursFromPlacesPeriods, hoursFromSpecification, hoursFromStrings } from './hours.js';
import { brandFromTitle, firstH1, mailtoLinks, metaContent, normalizeUsPhone, pageTitle, stripTags, telLinks, titleLead, visibleText } from './html.js';
import { findScheduleAction } from '../standards/osp-jsonld.js';
import { classifyPath, isSameHostOrTwin } from './pages.js';
/**
 * Facts with provenance, from the fetched pages, the sitemap, and (when the
 * shell supplied one) the Google listing. Every value carries the URL and the
 * selector it came from, so the web tool can show where each line of the
 * manifest originates and a reader can check it.
 *
 * Order of trust: the site's own JSON-LD, then the page markup (title, tel:
 * and mailto: links, address element), then the Google listing, which fills
 * gaps and never overrides the site. Nothing here guesses: a field a source
 * does not carry stays undefined and becomes a TODO downstream.
 */
const MAX_SERVICES = 60;
const US_COUNTRY = new Set(['', 'us', 'usa', 'united states', 'united states of america', 'u.s.', 'u.s.a.']);
const jsonLd = (url) => ({ url, selector: 'json-ld' });
function countryOk(value) {
    const name = typeof value === 'string' ? value : isJsonLdRecord(value) && typeof value.name === 'string' ? value.name : '';
    return US_COUNTRY.has(name.trim().toLowerCase());
}
/** A schema.org PostalAddress or a one-line US address to the spec's Address, or null when any part is missing. */
export function parseAddress(value) {
    if (isJsonLdRecord(value)) {
        if (!countryOk(value.addressCountry))
            return null;
        const street = clampText(asJsonLdArray(value.streetAddress).filter((part) => typeof part === 'string').join(', '), 200);
        const city = clampText(value.addressLocality, 100);
        const region = toRegionCode(typeof value.addressRegion === 'string' ? value.addressRegion : undefined);
        const postalCode = toZip5(typeof value.postalCode === 'string' ? value.postalCode : undefined);
        if (!street || !city || !region || !postalCode)
            return null;
        return { street, city, region, postalCode, country: 'US' };
    }
    if (typeof value === 'string') {
        const match = value.replace(/\s+/g, ' ').trim().match(/^(.+?),\s*([^,]+?),\s*([A-Za-z .]{2,20}?)\s+(\d{5})(?:-\d{4})?(?:,\s*(?:US|USA|United States))?$/i);
        if (!match)
            return null;
        const region = toRegionCode(match[3].trim());
        if (!region)
            return null;
        return { street: match[1].trim(), city: match[2].trim(), region, postalCode: match[4], country: 'US' };
    }
    return null;
}
function geoOf(node) {
    const geo = isJsonLdRecord(node.geo) ? node.geo : null;
    if (!geo)
        return null;
    const latitude = Number(geo.latitude);
    const longitude = Number(geo.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180)
        return null;
    return { latitude, longitude };
}
function hoursOf(node) {
    const spec = hoursFromSpecification(node.openingHoursSpecification);
    if (spec.hours || spec.midnightDays.length > 0)
        return spec;
    return hoursFromStrings(node.openingHours);
}
function phoneOf(value) {
    for (const entry of asJsonLdArray(value)) {
        if (typeof entry !== 'string')
            continue;
        const phone = normalizeUsPhone(entry);
        if (phone)
            return phone.e164;
    }
    return undefined;
}
function emailOf(value) {
    for (const entry of asJsonLdArray(value)) {
        if (typeof entry !== 'string')
            continue;
        const email = entry.replace(/^mailto:/i, '').trim();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return email;
    }
    return undefined;
}
/** Business nodes on a page, including the nested location, department, and subOrganization nodes. */
function businessNodes(html) {
    const all = extractJsonLdNodes(html);
    const nodes = [];
    const visit = (node, depth) => {
        if (isLocalBusinessNode(node))
            nodes.push(node);
        if (depth > 2)
            return;
        for (const key of ['location', 'department', 'subOrganization', 'containsPlace']) {
            for (const child of asJsonLdArray(node[key]))
                if (isJsonLdRecord(child))
                    visit(child, depth + 1);
        }
    };
    for (const node of all)
        visit(node, 0);
    return { nodes, all };
}
function isOrganizationNode(node) {
    return typesOf(node).includes('Organization') && (node.address !== undefined || node.telephone !== undefined);
}
function addressKey(address) {
    return `${address.street}|${address.postalCode}`.toLowerCase();
}
/**
 * The schedule page a ScheduleAction's target names, as an absolute URL on
 * this site, or null. The site's own markup stating the address is a fact
 * (spec 8.1 item 2 requires exactly this value in interfaces.schedulePageUrl),
 * so it needs no fetch, but it must be on the crawled host or its www twin
 * and must be a page address: an RFC 6570 query expansion at the end
 * ({?service,zip}) or a query string carrying placeholders is dropped, and a
 * template with any other placeholder (a path variable) is not a URL and is
 * not used.
 */
export function scheduleTargetUrl(target, origin) {
    if (!isJsonLdRecord(target))
        return null;
    const raw = typeof target.urlTemplate === 'string' ? target.urlTemplate : typeof target.url === 'string' ? target.url : '';
    let template = raw.trim().replace(/\{[?&][^{}]*\}$/, '');
    const queryAt = template.indexOf('?');
    if (queryAt >= 0 && template.slice(queryAt).includes('{'))
        template = template.slice(0, queryAt);
    if (!template || /[{}]/.test(template))
        return null;
    const absolute = /^https?:\/\//i.test(template);
    if (!absolute && !template.startsWith('/'))
        return null;
    let url;
    try {
        url = new URL(template, `${origin}/`);
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
/** The slug a service URL carries (its last path segment). Never a name: a slug is not a fact about the service. */
function serviceFromUrl(url) {
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (!last)
        return null;
    const slug = OSP_SLUG.test(last) ? last.slice(0, 80) : toOspSlug(last);
    return slug ? { slug } : null;
}
function offerServices(node, url) {
    const out = [];
    const pushItem = (item) => {
        if (!isJsonLdRecord(item))
            return;
        const offered = isJsonLdRecord(item.itemOffered) ? item.itemOffered : item;
        const name = clampText(offered.name, 120);
        if (!name)
            return;
        const itemUrl = typeof offered.url === 'string' ? offered.url : typeof item.url === 'string' ? item.url : undefined;
        const fromUrl = itemUrl ? (() => { try {
            return serviceFromUrl(itemUrl);
        }
        catch {
            return null;
        } })() : null;
        const slug = fromUrl?.slug ?? toOspSlug(name);
        if (!slug)
            return;
        const description = clampText(offered.description);
        out.push({ slug, name: { value: name, source: jsonLd(url) }, ...(itemUrl ? { url: itemUrl } : {}), ...(description ? { description: { value: description, source: jsonLd(url) } } : {}) });
    };
    for (const catalog of asJsonLdArray(node.hasOfferCatalog)) {
        if (!isJsonLdRecord(catalog))
            continue;
        for (const element of asJsonLdArray(catalog.itemListElement)) {
            if (isJsonLdRecord(element) && Array.isArray(element.itemListElement))
                element.itemListElement.forEach(pushItem);
            else
                pushItem(element);
        }
    }
    asJsonLdArray(node.makesOffer).forEach(pushItem);
    return out;
}
function placesAddress(listing) {
    const parts = listing.address;
    if (parts && !countryOk(parts.country ?? ''))
        return null;
    const fromParts = parts && parts.street && parts.city && parts.region && parts.postalCode
        ? { street: parts.street, city: parts.city, region: toRegionCode(parts.region), postalCode: toZip5(parts.postalCode) }
        : null;
    if (fromParts?.region && fromParts.postalCode)
        return { street: fromParts.street, city: fromParts.city, region: fromParts.region, postalCode: fromParts.postalCode, country: 'US' };
    return listing.formattedAddress ? parseAddress(listing.formattedAddress) : null;
}
/** The rule for using a Google listing at all; null means it could not be confirmed as this business. */
export function confirmListing(listing, facts, seenAddresses) {
    const strip = (host) => host.toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
    if (listing.website) {
        try {
            const host = strip(new URL(listing.website).hostname);
            return host === strip(facts.host) ? 'website' : null;
        }
        catch {
            return null;
        }
    }
    const phone = listing.nationalPhone ?? listing.internationalPhone;
    const listed = phone ? normalizeUsPhone(phone) : null;
    if (listed && facts.phone && listed.e164 === facts.phone.value)
        return 'phone';
    const name = listing.displayName?.trim().toLowerCase();
    const address = placesAddress(listing);
    if (name && facts.name && name === facts.name.value.trim().toLowerCase() && address && facts.locations.some((location) => location.address.value.postalCode === address.postalCode))
        return 'name+postal';
    void seenAddresses;
    return null;
}
export function extractFacts(input) {
    const origin = input.origin.replace(/\/$/, '');
    const host = new URL(origin).hostname.replace(/^www\./, '');
    const pages = input.pages;
    const read = (page) => page.fetched && !!page.html && (page.status ?? 200) === 200;
    const home = pages.find((page) => page.kind === 'home' && read(page)) ?? pages.find(read);
    const contact = pages.find((page) => page.kind === 'contact' && read(page));
    const facts = {
        origin,
        host,
        schemaTypes: [],
        locations: [],
        sameAs: [],
        areaZips: [],
        areaNames: [],
        services: [],
        ratingsIgnored: [],
        text: '',
        unreadServiceUrls: [],
        midnightDays: [],
        listingUnconfirmed: false,
    };
    facts.homeHtml = home?.html;
    // ---- JSON-LD across every fetched page; the home page's node is primary.
    const primaryCandidates = [];
    const locationCandidates = [];
    const seenTypes = new Set();
    for (const page of pages) {
        if (!read(page))
            continue;
        const { nodes, all } = businessNodes(page.html);
        const candidates = nodes.length > 0 ? nodes : all.filter(isOrganizationNode);
        for (const node of candidates) {
            for (const path of ratingFieldPaths(node))
                facts.ratingsIgnored.push({ url: page.url, path });
            for (const type of typesOf(node)) {
                if (!seenTypes.has(type)) {
                    seenTypes.add(type);
                    facts.schemaTypes.push({ value: type, source: jsonLd(page.url) });
                }
            }
            if (page.kind === 'home' || page.kind === 'about' || page.kind === 'contact')
                primaryCandidates.push({ node, url: page.url });
            locationCandidates.push({ node, url: page.url, kind: page.kind });
        }
    }
    const primary = primaryCandidates.find((entry) => isLocalBusinessNode(entry.node)) ?? primaryCandidates[0] ?? locationCandidates.find((entry) => isLocalBusinessNode(entry.node)) ?? locationCandidates[0];
    if (primary) {
        const { node, url } = primary;
        const name = clampText(node.name, 120);
        if (name)
            facts.name = { value: name, source: jsonLd(url) };
        const legalName = clampText(node.legalName, 200);
        if (legalName)
            facts.legalName = { value: legalName, source: jsonLd(url) };
        const description = clampText(node.description);
        if (description)
            facts.description = { value: description, source: jsonLd(url) };
        const phone = phoneOf(node.telephone);
        if (phone)
            facts.phone = { value: phone, source: jsonLd(url) };
        const email = emailOf(node.email);
        if (email)
            facts.email = { value: email, source: jsonLd(url) };
        for (const same of asJsonLdArray(node.sameAs)) {
            if (typeof same === 'string' && /^https:\/\//i.test(same.trim()))
                facts.sameAs.push({ value: same.trim(), source: jsonLd(url) });
        }
        for (const area of asJsonLdArray(node.areaServed)) {
            if (typeof area === 'string') {
                const zip = toZip5(area);
                if (zip)
                    facts.areaZips.push({ value: zip, source: jsonLd(url) });
                else if (clampText(area, 100))
                    facts.areaNames.push({ value: area.trim(), source: jsonLd(url) });
            }
            else if (isJsonLdRecord(area)) {
                const zip = toZip5(typeof area.postalCode === 'string' ? area.postalCode : undefined);
                const name = clampText(area.name, 100) ?? clampText(isJsonLdRecord(area.address) ? area.address.addressLocality : undefined, 100);
                if (zip)
                    facts.areaZips.push({ value: zip, source: jsonLd(url) });
                else if (name)
                    facts.areaNames.push({ value: name, source: jsonLd(url) });
            }
        }
        // yearsInBusiness needs the anniversary, so only a complete foundingDate
        // (year, month, day) counts; a bare year is reported, not rounded.
        const founding = typeof node.foundingDate === 'string' ? node.foundingDate.trim() : '';
        const fullDate = founding.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (fullDate) {
            const [year, month, day] = fullDate.slice(1).map(Number);
            const now = input.now;
            let years = now.getUTCFullYear() - year;
            if (now.getUTCMonth() + 1 < month || (now.getUTCMonth() + 1 === month && now.getUTCDate() < day))
                years -= 1;
            if (years >= 0 && years <= 200)
                facts.yearsInBusiness = { value: years, source: jsonLd(url) };
        }
        else if (/^\d{4}(?:-\d{2})?$/.test(founding)) {
            facts.foundingYearOnly = { value: founding, source: jsonLd(url) };
        }
        const hours = hoursOf(node);
        if (hours.hours)
            facts.hours = { value: hours.hours, source: jsonLd(url) };
        else if (hours.midnightDays.length > 0)
            facts.midnightDays.push({ locationIndex: -1, days: hours.midnightDays });
    }
    // Locations: every business node with a complete US address, one per address.
    const seenAddresses = new Set();
    const locationPageUrl = (node, url, kind) => {
        if (kind === 'location')
            return url;
        if (typeof node.url !== 'string')
            return undefined;
        try {
            const candidate = new URL(node.url);
            const sameHost = candidate.hostname.replace(/^www\./, '') === host;
            return sameHost && classifyPath(candidate.pathname) === 'location' ? candidate.toString() : undefined;
        }
        catch {
            return undefined;
        }
    };
    for (const { node, url, kind } of locationCandidates) {
        const address = parseAddress(node.address);
        if (!address)
            continue;
        if (seenAddresses.has(addressKey(address))) {
            // The same premises seen again (its own page after the home page's
            // nested node): the page is its pageUrl and fills what the first sighting lacked.
            const existing = facts.locations.find((entry) => addressKey(entry.address.value) === addressKey(address));
            if (existing) {
                const pageUrl = locationPageUrl(node, url, kind);
                if (pageUrl && !existing.pageUrl)
                    existing.pageUrl = pageUrl;
                if (!existing.hours) {
                    const hours = hoursOf(node);
                    if (hours.hours)
                        existing.hours = { value: hours.hours, source: jsonLd(url) };
                    else if (hours.midnightDays.length > 0)
                        facts.midnightDays.push({ locationIndex: facts.locations.indexOf(existing), days: hours.midnightDays });
                }
                if (!existing.phone) {
                    const phone = phoneOf(node.telephone);
                    if (phone)
                        existing.phone = { value: phone, source: jsonLd(url) };
                }
            }
            continue;
        }
        seenAddresses.add(addressKey(address));
        const location = { address: { value: address, source: jsonLd(url) } };
        const name = clampText(node.name, 120);
        if (name)
            location.name = { value: name, source: jsonLd(url) };
        const geo = geoOf(node);
        if (geo)
            location.geo = { value: geo, source: jsonLd(url) };
        const phone = phoneOf(node.telephone);
        if (phone)
            location.phone = { value: phone, source: jsonLd(url) };
        const email = emailOf(node.email);
        if (email)
            location.email = { value: email, source: jsonLd(url) };
        const hours = hoursOf(node);
        if (hours.hours)
            location.hours = { value: hours.hours, source: jsonLd(url) };
        else if (hours.midnightDays.length > 0)
            facts.midnightDays.push({ locationIndex: facts.locations.length, days: hours.midnightDays });
        const pageUrl = locationPageUrl(node, url, kind);
        if (pageUrl)
            location.pageUrl = pageUrl;
        facts.locations.push(location);
    }
    // Services from JSON-LD offers and Service nodes, then from the sitemap.
    const serviceSlugs = new Set();
    const addService = (service) => {
        if (facts.services.length >= MAX_SERVICES || serviceSlugs.has(service.slug))
            return;
        serviceSlugs.add(service.slug);
        facts.services.push(service);
    };
    for (const { node, url } of locationCandidates)
        offerServices(node, url).forEach(addService);
    for (const page of pages) {
        if (!read(page))
            continue;
        for (const node of extractJsonLdNodes(page.html)) {
            if (!typesOf(node).includes('Service'))
                continue;
            const name = clampText(node.name, 120);
            if (!name)
                continue;
            const serviceUrl = typeof node.url === 'string' ? node.url : page.kind === 'service' ? page.url : undefined;
            const fromUrl = serviceUrl ? (() => { try {
                return serviceFromUrl(serviceUrl);
            }
            catch {
                return null;
            } })() : null;
            const slug = fromUrl?.slug ?? toOspSlug(name);
            if (!slug)
                continue;
            const description = clampText(node.description);
            addService({ slug, name: { value: name, source: jsonLd(page.url) }, ...(serviceUrl ? { url: serviceUrl } : {}), ...(description ? { description: { value: description, source: jsonLd(page.url) } } : {}) });
        }
    }
    const serviceUrls = input.sitemapUrls.filter((url) => { try {
        return classifyPath(new URL(url).pathname) === 'service';
    }
    catch {
        return false;
    } });
    for (const url of serviceUrls) {
        const fromUrl = serviceFromUrl(url);
        if (!fromUrl)
            continue;
        if (serviceSlugs.has(fromUrl.slug))
            continue;
        const page = pages.find((entry) => entry.url === url);
        if (page && read(page)) {
            const title = pageTitle(page.html);
            const h1 = firstH1(page.html);
            const name = clampText(h1 ?? (title ? titleLead(title) : undefined), 120);
            if (name) {
                const description = clampText(metaContent(page.html, 'description'));
                addService({ slug: fromUrl.slug, name: { value: name, source: { url, selector: h1 ? 'h1' : 'title' } }, url, ...(description ? { description: { value: description, source: { url, selector: 'meta[name="description"]' } } } : {}) });
                continue;
            }
        }
        // Past the cap, not 200, or no title and no H1: listed for the owner, never named from the slug.
        facts.unreadServiceUrls.push(url);
    }
    // ---- Page markup fills what JSON-LD did not say.
    if (home?.html) {
        const title = pageTitle(home.html);
        if (!facts.name) {
            const siteName = metaContent(home.html, 'og:site_name');
            const fromTitle = title ? brandFromTitle(title, host) : null;
            const name = clampText(siteName ?? fromTitle, 120);
            if (name)
                facts.name = { value: name, source: { url: home.url, selector: siteName ? 'meta[property="og:site_name"]' : 'title' } };
        }
        if (!facts.description) {
            const description = clampText(metaContent(home.html, 'description'));
            if (description)
                facts.description = { value: description, source: { url: home.url, selector: 'meta[name="description"]' } };
        }
    }
    for (const page of [home, contact]) {
        if (!page || !read(page) || !page.html)
            continue;
        if (!facts.phone) {
            const found = telLinks(page.html).map(normalizeUsPhone).find((phone) => phone);
            if (found)
                facts.phone = { value: found.e164, source: { url: page.url, selector: 'a[href^="tel:"]' } };
        }
        if (!facts.email) {
            const found = mailtoLinks(page.html).find((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
            if (found)
                facts.email = { value: found, source: { url: page.url, selector: 'a[href^="mailto:"]' } };
        }
        if (facts.locations.length === 0) {
            const block = page.html.match(/<address\b[^>]*>([\s\S]*?)<\/address>/i)?.[1];
            const text = block ? stripTags(block.replace(/<br\s*\/?>/gi, ', ')).slice(0, 400) : '';
            const address = text ? parseAddress(text.replace(/\s*,\s*/g, ', ').replace(/(, )+/g, ', ')) : null;
            if (address)
                facts.locations.push({ address: { value: address, source: { url: page.url, selector: 'address' } } });
        }
    }
    // ---- The Google listing fills gaps; it never overrides the site, and it is
    // used only once confirmed as this business: its website host is the crawled
    // host (www twin allowed), or, when it lists no website, its phone matches
    // the site's phone, or its name and postal code match the site's. Otherwise
    // nothing from it is used and the draft says so.
    const listing = input.places;
    if (listing) {
        const confirmedBy = confirmListing(listing, facts, seenAddresses);
        if (!confirmedBy) {
            facts.listingUnconfirmed = true;
        }
        else {
            facts.listingConfirmedBy = confirmedBy;
            const source = { url: listing.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${listing.placeId}`, selector: 'places' };
            if (!facts.name && listing.displayName)
                facts.name = { value: listing.displayName.slice(0, 120), source };
            const phone = listing.nationalPhone ?? listing.internationalPhone;
            const normalized = phone ? normalizeUsPhone(phone) : null;
            if (!facts.phone && normalized)
                facts.phone = { value: normalized.e164, source };
            const address = placesAddress(listing);
            if (address && !seenAddresses.has(addressKey(address)) && facts.locations.length === 0) {
                const location = { address: { value: address, source } };
                if (listing.displayName)
                    location.name = { value: listing.displayName.slice(0, 120), source };
                if (typeof listing.latitude === 'number' && typeof listing.longitude === 'number')
                    location.geo = { value: { latitude: listing.latitude, longitude: listing.longitude }, source };
                if (normalized)
                    location.phone = { value: normalized.e164, source };
                facts.locations.push(location);
                seenAddresses.add(addressKey(address));
            }
            const hours = hoursFromPlacesPeriods(listing.periods);
            if (hours.hours) {
                if (!facts.hours)
                    facts.hours = { value: hours.hours, source };
                for (const location of facts.locations) {
                    if (!location.hours && (facts.locations.length === 1 || addressKey(location.address.value) === (address ? addressKey(address) : '')))
                        location.hours = { value: hours.hours, source };
                }
            }
            else if (hours.midnightDays.length > 0 && facts.locations.length === 1 && !facts.locations[0].hours) {
                facts.midnightDays.push({ locationIndex: 0, days: hours.midnightDays });
            }
            const categories = [listing.primaryType, ...(listing.types ?? [])].filter((value) => !!value);
            if (categories.length > 0)
                facts.placesCategories = { value: categories, source };
            facts.sameAs.push({ value: source.url, source });
        }
    }
    // Business-level hours apply to a location that has none of its own (a single-location site
    // usually publishes one table on the business node, which IS the location).
    if (facts.hours && facts.locations.length === 1 && !facts.locations[0].hours)
        facts.locations[0].hours = facts.hours;
    // ---- Schedule page and contact page.
    const readPages = pages.filter(read);
    const readOfKind = (kind) => readPages.find((page) => page.kind === kind);
    const contactPage = readOfKind('contact');
    // The page's own heading names it in llms.txt; the title's lead is the
    // fallback. Never a label of this tool's choosing.
    const labelOf = (page) => {
        const title = pageTitle(page.html);
        const heading = firstH1(page.html);
        return clampText(heading ?? (title ? titleLead(title) : undefined), 120);
    };
    const samePage = (a, b) => {
        try {
            const left = new URL(a);
            const right = new URL(b);
            return isSameHostOrTwin(left.hostname, right.hostname) && left.pathname.replace(/\/+$/, '') === right.pathname.replace(/\/+$/, '') && left.search === right.search;
        }
        catch {
            return false;
        }
    };
    // First the site's own JSON-LD: a business node's ScheduleAction naming a
    // page on this host states the schedule page the same way it states the
    // phone or the address, whether or not that page was inside the fetch cap.
    // The Level 1 check compares the page's target to this same value.
    for (const { node, url } of [...(primary ? [primary] : []), ...locationCandidates]) {
        const action = findScheduleAction(node);
        if (!action)
            continue;
        const target = scheduleTargetUrl(action.target, origin);
        if (!target)
            continue;
        facts.schedulePageUrl = { value: target, source: jsonLd(url) };
        const targetPage = readPages.find((page) => samePage(page.url, target));
        const label = targetPage ? labelOf(targetPage) : clampText(action.name, 120);
        if (label)
            facts.schedulePageTitle = label;
        break;
    }
    // Otherwise only a page this run read with a 200: the schedule page, or the contact page in its place.
    const schedulePage = readOfKind('schedule') ?? contactPage;
    if (!facts.schedulePageUrl && schedulePage) {
        facts.schedulePageUrl = { value: schedulePage.url, source: { url: schedulePage.url, selector: 'sitemap' } };
        const label = labelOf(schedulePage);
        if (label)
            facts.schedulePageTitle = label;
    }
    if (contactPage)
        facts.contactPageUrl = contactPage.url;
    facts.text = readPages.map((page) => visibleText(page.html, 20_000)).join(' ').slice(0, 80_000);
    return facts;
}
