// GENERATED FILE. Do not edit.
// Source of truth: the TypeScript in the the-marketing-guys repository (lib/).
// Regenerate with: node tooling/osp-generator/sync-cli-core.mjs
import { asJsonLdArray, extractJsonLdNodes, isJsonLdRecord, isLocalBusinessNode, LOCAL_BUSINESS_TYPES, schemaTerm, typesOf, } from './json-ld.js';
const isRecord = isJsonLdRecord;
const asArray = asJsonLdArray;
export const OSP_CHECKLIST = [
    { item: 1, level: 'L1', requirement: 'Manifest at the well-known path answers 200 as JSON with a CORS header' },
    { item: 2, level: 'L1', requirement: 'Manifest validates against Appendix A, including the numbered constraints' },
    { item: 3, level: 'L1', requirement: 'Exactly one primary location' },
    { item: 4, level: 'L1', requirement: 'Booking windows, request semantics, service model, trades, after-hours note, and interfaces.mcp rules hold' },
    { item: 5, level: 'L1', requirement: 'Home page carries a LocalBusiness JSON-LD node with name, address, telephone, hours, and url matching the manifest' },
    { item: 6, level: 'should', requirement: 'OfferCatalog lists every manifest service (reported, not required)' },
    { item: 7, level: 'L1', requirement: 'One ScheduleAction with a ReservationPending result on the business node, pointing at the schedule page' },
    { item: 8, level: 'L1', requirement: 'No price or certification in the manifest that is absent from the site (or from a source the business controls); no ratings or counts in the manifest' },
    { item: 9, level: 'L2', requirement: 'MCP endpoint answers tools/list with get_business_info, list_services, check_coverage' },
    { item: 10, level: 'should', requirement: 'Server card lists the exposed tools (reported, not required)' },
    { item: 11, level: 'L2', requirement: 'get_business_info.booking.mode is request' },
    { item: 12, level: 'L2', requirement: 'list_services slugs equal manifest slugs' },
    { item: 13, level: 'L2', requirement: 'check_coverage agrees with the manifest for a covered and an uncovered ZIP' },
    { item: 14, level: 'L2', requirement: 'get_reviews, when exposed, carries notice and no placeholder rating' },
    { item: 15, level: 'L2', requirement: 'Rate limiting returns rate_limited, not partial data' },
    { item: 16, level: 'L3', requirement: 'request_service_booking rejects confirmed or contactAuthorized not literal true' },
    { item: 17, level: 'L3', requirement: 'Same requestId twice yields one request' },
    { item: 18, level: 'L3', requirement: 'Success payload has appointmentConfirmed false and a pending status' },
    { item: 19, level: 'L3', requirement: 'check_availability returns source, per-window status, and policy-mode fields' },
    { item: 20, level: 'L3', requirement: 'Confirmation surfaces contain no booked or confirmed-appointment language' },
];
export function checklistItem(num, status, detail) {
    const spec = OSP_CHECKLIST.find((entry) => entry.item === num);
    return { id: `osp-${num}`, item: num, level: spec.level, requirement: spec.requirement, status, detail };
}
export function checklistItemSpec(id) {
    const match = id.match(/^osp-(\d+)$/);
    if (!match)
        return null;
    return OSP_CHECKLIST.find((entry) => entry.item === Number(match[1])) ?? null;
}
export function digits(value) {
    return typeof value === 'string' ? value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '') : '';
}
export function hostOf(value) {
    if (typeof value !== 'string')
        return null;
    try {
        return new URL(value).hostname.toLowerCase().replace(/^www\./, '');
    }
    catch {
        return null;
    }
}
/** Scheme and host compare case-insensitively; path and query are exact apart from a trailing slash. */
export function sameUrl(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string')
        return false;
    const canon = (value) => {
        try {
            const url = new URL(value.trim());
            const path = url.pathname.replace(/\/+$/, '');
            return `${url.protocol.toLowerCase()}//${url.host.toLowerCase()}${path}${url.search}`;
        }
        catch {
            return null;
        }
    };
    const left = canon(a);
    const right = canon(b);
    return left !== null && right !== null && left === right;
}
const isBusinessNode = isLocalBusinessNode;
export function findScheduleAction(node) {
    return asArray(node.potentialAction).find((action) => isRecord(action) && typesOf(action).includes('ScheduleAction')) ?? null;
}
// schema.org accepts the enumeration as its URL or as the bare token; nothing else.
const RESERVATION_PENDING = new Set(['https://schema.org/ReservationPending', 'ReservationPending']);
export function reservationPending(action) {
    const result = isRecord(action.result) ? action.result : null;
    if (!result || !typesOf(result).includes('Reservation'))
        return false;
    // A string only; an object-valued status is rejected outright.
    const status = result.reservationStatus;
    return typeof status === 'string' && RESERVATION_PENDING.has(status.trim());
}
export function pickBusinessNode(nodes) {
    const candidates = nodes.filter(isBusinessNode);
    return candidates.find((node) => findScheduleAction(node)) ?? candidates[0] ?? null;
}
const nonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
/** Field shape of one business node, independent of any manifest. */
function nodeShapeProblems(node) {
    const missing = [];
    if (!nonEmptyString(node.name))
        missing.push('name');
    // telephone: must normalize to exactly 10 NANP digits (a leading 1 is dropped).
    const nodePhone = digits(node.telephone);
    if (!nonEmptyString(node.telephone) || nodePhone.length !== 10)
        missing.push('telephone');
    // url: must parse as an absolute URL.
    let nodeUrl = null;
    if (nonEmptyString(node.url)) {
        try {
            nodeUrl = new URL(node.url);
        }
        catch {
            nodeUrl = null;
        }
    }
    if (!nodeUrl)
        missing.push('url');
    const address = isRecord(node.address) ? node.address : null;
    const addressOk = nonEmptyString(node.address)
        || (!!address && ['streetAddress', 'addressLocality', 'postalCode'].some((part) => nonEmptyString(address[part])));
    if (!addressOk)
        missing.push('address');
    // openingHoursSpecification: a non-empty array of objects, or one object
    // that carries at least one of dayOfWeek, opens, closes.
    const hours = node.openingHoursSpecification;
    const hoursShape = (value) => isRecord(value) && ['dayOfWeek', 'opens', 'closes'].some((part) => part in value);
    const hoursOk = Array.isArray(hours) ? hours.length > 0 && hours.every(hoursShape) : hoursShape(hours);
    if (!hoursOk)
        missing.push('openingHoursSpecification');
    return { problems: missing.length > 0 ? [`missing or malformed ${missing.join(', ')}`] : [], nodePhone, nodeUrl };
}
/**
 * Does this node's facts correspond to one manifest location? The location's
 * phone (falling back to business.phone) and postal code are the reference;
 * the name may be the business display name or the location's own name; the
 * url host is the business host. A page phone or postal code that does not
 * normalize is a mismatch, never a skipped comparison.
 */
function nodeLocationProblems(node, manifest, location, shape) {
    const problems = [];
    const business = isRecord(manifest.business) ? manifest.business : {};
    const locationName = location && typeof location.name === 'string' ? location.name : null;
    if (typeof node.name === 'string' && typeof business.displayName === 'string') {
        const name = node.name.trim().toLowerCase();
        const accepted = [business.displayName, locationName].filter((value) => typeof value === 'string').map((value) => value.trim().toLowerCase());
        if (!accepted.includes(name))
            problems.push(`name "${node.name}" differs from the manifest displayName "${business.displayName}"${locationName ? ` and the location name "${locationName}"` : ''}`);
    }
    const referencePhone = digits(location?.phone) || digits(business.phone);
    if (referencePhone && shape.nodePhone !== referencePhone)
        problems.push(`telephone differs from the manifest phone${locationName ? ` for ${locationName}` : ''}`);
    const nodeHost = shape.nodeUrl ? shape.nodeUrl.hostname.toLowerCase().replace(/^www\./, '') : null;
    const manifestHost = hostOf(business.websiteUrl);
    if (manifestHost && nodeHost !== manifestHost)
        problems.push(`url host ${nodeHost ?? '(unparseable)'} differs from business.websiteUrl host ${manifestHost}`);
    const locationAddress = location && isRecord(location.address) ? location.address : null;
    const referencePostal = locationAddress && typeof locationAddress.postalCode === 'string' ? locationAddress.postalCode.trim() : null;
    const address = isRecord(node.address) ? node.address : null;
    if (referencePostal) {
        if (address) {
            // An object address must carry the same non-empty postalCode; one with
            // only a street or a city is not enough to confirm the location.
            const postal = typeof address.postalCode === 'string' ? address.postalCode.trim() : '';
            if (postal !== referencePostal)
                problems.push(`postalCode ${postal || '(missing)'} differs from the location's ${referencePostal}`);
        }
        else if (nonEmptyString(node.address) && !node.address.includes(referencePostal)) {
            problems.push(`address text does not contain the location's postal code ${referencePostal}`);
        }
    }
    if (address && locationAddress) {
        // Street, city, and region are compared field by field on an object address.
        if (typeof locationAddress.street === 'string' && normalizeStreet(String(address.streetAddress ?? '')) !== normalizeStreet(locationAddress.street)) {
            problems.push(`streetAddress "${String(address.streetAddress ?? '')}" differs from the location's "${locationAddress.street}"`);
        }
        if (typeof locationAddress.city === 'string' && normalizePlain(address.addressLocality) !== normalizePlain(locationAddress.city)) {
            problems.push(`addressLocality "${String(address.addressLocality ?? '')}" differs from the location's "${locationAddress.city}"`);
        }
        if (typeof locationAddress.region === 'string' && normalizePlain(address.addressRegion) !== normalizePlain(locationAddress.region)) {
            problems.push(`addressRegion "${String(address.addressRegion ?? '')}" differs from the location's "${locationAddress.region}"`);
        }
    }
    if (location)
        problems.push(...hoursProblems(node, location).map((problem) => `hours: ${problem}`));
    return problems;
}
const STREET_ABBREVIATIONS = {
    street: 'st', rd: 'rd', road: 'rd', ave: 'ave', avenue: 'ave', hwy: 'hwy', highway: 'hwy', blvd: 'blvd', boulevard: 'blvd',
    dr: 'dr', drive: 'dr', ste: 'ste', suite: 'ste', st: 'st', north: 'n', south: 's', east: 'e', west: 'w', n: 'n', s: 's', e: 'e', w: 'w',
    ln: 'ln', lane: 'ln', ct: 'ct', court: 'ct', pkwy: 'pkwy', parkway: 'pkwy', pl: 'pl', place: 'pl', cir: 'cir', circle: 'cir',
};
/** Lowercase, punctuation stripped, common street words folded to one abbreviation. */
export function normalizeStreet(value) {
    return value
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => STREET_ABBREVIATIONS[word] ?? word)
        .join(' ');
}
function normalizePlain(value) {
    return typeof value === 'string' ? value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim() : '';
}
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
function dayName(value) {
    if (typeof value !== 'string')
        return null;
    const term = schemaTerm(value).toLowerCase();
    return WEEKDAYS.includes(term) ? term : null;
}
/** "08:00", "08:00:00", or "8:00" to "08:00". */
function clockOf(value) {
    if (typeof value !== 'string')
        return null;
    const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match)
        return null;
    return `${match[1].padStart(2, '0')}:${match[2]}`;
}
/**
 * The page's openingHoursSpecification as a day -> {opens, closes} map, then
 * compared with the manifest's weekly hours for the matched location. A day
 * present on one side and absent on the other is a mismatch; "24_hours" is
 * satisfied by 00:00 to 23:59 or 00:00 to 24:00 (or 00:00 to 00:00).
 */
export function hoursProblems(node, location) {
    const hours = isRecord(location.hours) ? location.hours : null;
    const weekly = hours && isRecord(hours.weekly) ? hours.weekly : null;
    if (!weekly)
        return [];
    const page = new Map();
    for (const entry of asArray(node.openingHoursSpecification)) {
        if (!isRecord(entry))
            continue;
        const opens = clockOf(entry.opens);
        const closes = clockOf(entry.closes);
        for (const day of asArray(entry.dayOfWeek)) {
            const name = dayName(day);
            if (name)
                page.set(name, { opens, closes });
        }
    }
    const problems = [];
    for (const day of WEEKDAYS) {
        const manifestDay = weekly[day];
        const pageDay = page.get(day);
        if (manifestDay === 'closed' || manifestDay === undefined) {
            if (pageDay && !(pageDay.opens === '00:00' && pageDay.closes === '00:00'))
                problems.push(`${day}: page lists hours, manifest says closed`);
            continue;
        }
        if (!pageDay) {
            problems.push(`${day}: manifest lists hours, page has no entry`);
            continue;
        }
        if (manifestDay === '24_hours') {
            const allDay = pageDay.opens === '00:00' && (pageDay.closes === '23:59' || pageDay.closes === '24:00' || pageDay.closes === '00:00');
            if (!allDay)
                problems.push(`${day}: manifest says 24 hours, page says ${pageDay.opens ?? '?'} to ${pageDay.closes ?? '?'}`);
            continue;
        }
        if (isRecord(manifestDay)) {
            const open = clockOf(manifestDay.open);
            const close = clockOf(manifestDay.close);
            if (pageDay.opens !== open || pageDay.closes !== close)
                problems.push(`${day}: page ${pageDay.opens ?? '?'} to ${pageDay.closes ?? '?'} versus manifest ${open ?? '?'} to ${close ?? '?'}`);
        }
    }
    return problems;
}
function judgeScheduleAction(node, manifest) {
    const action = findScheduleAction(node);
    const pending = action ? reservationPending(action) : false;
    const target = action && isRecord(action.target) ? action.target : null;
    const urlTemplate = target && typeof target.urlTemplate === 'string' ? target.urlTemplate : null;
    const schedulePage = manifest && isRecord(manifest.interfaces) ? manifest.interfaces.schedulePageUrl : undefined;
    // A string urlTemplate is required; with a manifest in hand it must equal
    // interfaces.schedulePageUrl (spec 8.1 item 2).
    const templateMatches = !!urlTemplate && (!manifest || sameUrl(urlTemplate, schedulePage));
    let item7;
    if (!action)
        item7 = checklistItem(7, 'fail', 'The business node has no potentialAction of type ScheduleAction.');
    else if (!pending)
        item7 = checklistItem(7, 'fail', 'The ScheduleAction result is not a Reservation with reservationStatus https://schema.org/ReservationPending.');
    else if (!urlTemplate)
        item7 = checklistItem(7, 'fail', 'The ScheduleAction has no target.urlTemplate string.');
    else if (!templateMatches)
        item7 = checklistItem(7, 'fail', `The ScheduleAction target.urlTemplate is not interfaces.schedulePageUrl (${String(schedulePage)}).`);
    else
        item7 = checklistItem(7, 'pass', 'One ScheduleAction with a ReservationPending Reservation result, pointing at the schedule page.');
    return { item7, pending: !!action && pending };
}
/**
 * Every business node on the page is judged (a multi-location site carries one
 * node per shop, in any order). Item 5 passes when some node's facts
 * correspond to a manifest location and that same node's ScheduleAction
 * satisfies item 7. When no node passes, the closest one explains why.
 */
export function judgeJsonLd(html, manifest) {
    const nodes = extractJsonLdNodes(html);
    const candidates = nodes.filter(isBusinessNode);
    if (candidates.length === 0) {
        const detail = nodes.length === 0
            ? 'The home page has no JSON-LD script block.'
            : `The home page has ${nodes.length} JSON-LD node(s) but none is a LocalBusiness or a LocalBusiness subtype.`;
        return {
            businessType: null,
            item5: checklistItem(5, 'fail', detail),
            item6: checklistItem(6, 'reported', 'No business node to carry an OfferCatalog.'),
            item7: checklistItem(7, 'fail', detail),
            scheduleAction: false,
        };
    }
    const locations = manifest ? asArray(manifest.locations).filter(isRecord) : [];
    const locationCandidates = locations.length > 0 ? locations : [null];
    const judged = candidates.map((node) => {
        const shape = nodeShapeProblems(node);
        let problems = shape.problems;
        let matchedLocation = null;
        if (manifest) {
            let best = null;
            for (const location of locationCandidates) {
                const locationProblems = nodeLocationProblems(node, manifest, location, shape);
                if (!best || locationProblems.length < best.problems.length)
                    best = { problems: locationProblems, location };
                if (locationProblems.length === 0)
                    break;
            }
            problems = [...shape.problems, ...(best?.problems ?? [])];
            matchedLocation = best?.location ?? null;
        }
        const schedule = judgeScheduleAction(node, manifest);
        return { node, problems, matchedLocation, schedule };
    });
    const passing = judged.find((entry) => entry.problems.length === 0 && entry.schedule.item7.status === 'pass');
    const closest = passing ?? [...judged].sort((a, b) => {
        const scoreA = a.problems.length + (a.schedule.item7.status === 'pass' ? 0 : 1);
        const scoreB = b.problems.length + (b.schedule.item7.status === 'pass' ? 0 : 1);
        return scoreA - scoreB;
    })[0];
    const node = closest.node;
    const businessType = typesOf(node).find((type) => LOCAL_BUSINESS_TYPES.has(type) || type.endsWith('Business')) ?? null;
    const nodeLabel = `${businessType} node${typeof node.name === 'string' ? ` "${node.name}"` : ''}`;
    const locationNote = closest.matchedLocation && typeof closest.matchedLocation.name === 'string' ? ` (location ${closest.matchedLocation.name})` : '';
    const others = candidates.length > 1 ? ` ${candidates.length} business nodes were judged.` : '';
    const item5 = closest.problems.length === 0
        ? checklistItem(5, 'pass', `${nodeLabel} carries name, address, telephone, openingHoursSpecification, and url${manifest ? `, and its name, street, city, region, postal code, telephone, url host, and weekly hours match the manifest${locationNote}` : ''}.${others}`)
        : checklistItem(5, 'fail', `${nodeLabel}: ${closest.problems.join('; ')}.${others}`);
    const item7 = closest.schedule.item7;
    const action = findScheduleAction(node);
    const pending = closest.schedule.pending;
    const catalog = isRecord(node.hasOfferCatalog) ? node.hasOfferCatalog : null;
    const catalogUrls = new Set();
    const catalogIds = new Set();
    const pageKey = (value) => (typeof value === 'string' ? value.split('#')[0].replace(/\/+$/, '').toLowerCase() : null);
    // Catalogs nest (a catalog per category is common), so walk them.
    const walk = (entries, depth) => {
        if (depth > 3)
            return;
        for (const entry of asArray(entries)) {
            if (!isRecord(entry))
                continue;
            if (typesOf(entry).includes('OfferCatalog')) {
                walk(entry.itemListElement, depth + 1);
                continue;
            }
            const offered = isRecord(entry.itemOffered) ? entry.itemOffered : null;
            for (const candidate of [entry.url, offered?.url]) {
                const key = pageKey(candidate);
                if (key)
                    catalogUrls.add(key);
            }
            for (const candidate of [entry['@id'], offered?.['@id']]) {
                const key = pageKey(candidate);
                if (key)
                    catalogIds.add(key);
            }
        }
    };
    if (catalog)
        walk(catalog.itemListElement, 0);
    const serviceUrls = manifest
        ? asArray(manifest.services).filter(isRecord).map((service) => service.url).filter((value) => typeof value === 'string')
        : [];
    let item6;
    if (!catalog)
        item6 = checklistItem(6, 'reported', 'No hasOfferCatalog on the business node.');
    else if (serviceUrls.length === 0)
        item6 = checklistItem(6, 'reported', 'An OfferCatalog is present; the manifest services carry no urls to compare.');
    else {
        const keys = serviceUrls.map((url) => pageKey(url));
        const byUrl = keys.filter((key) => catalogUrls.has(key)).length;
        const byId = keys.filter((key) => !catalogUrls.has(key) && catalogIds.has(key)).length;
        const note = byId > 0 ? ` ${byId} of those match only by @id; the spec asks for a url on each Service or Offer.` : '';
        item6 = checklistItem(6, 'reported', `The OfferCatalog lists ${byUrl + byId} of ${serviceUrls.length} manifest services.${note}`);
    }
    return { businessType, item5, item6, item7, scheduleAction: !!action && pending };
}
