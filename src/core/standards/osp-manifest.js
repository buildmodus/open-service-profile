// GENERATED FILE. Do not edit.
// Source of truth: the TypeScript in the the-marketing-guys repository (lib/).
// Regenerate with: node tooling/osp-generator/sync-cli-core.mjs
import { OSP_SPEC_VERSION } from './osp-constants.js';
export const OSP_WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const OSP_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const OSP_SLUG = /^[a-z0-9][a-z0-9-]*$/;
const STATE_CODES = {
    alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT',
    delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL',
    indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
    massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT',
    nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA',
    'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
    vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
    'puerto rico': 'PR',
};
/** Two-letter USPS code from a stored state, or undefined when it cannot be read as one. */
export function toRegionCode(state) {
    const trimmed = state?.trim();
    if (!trimmed)
        return undefined;
    if (/^[A-Za-z]{2}$/.test(trimmed))
        return trimmed.toUpperCase();
    return STATE_CODES[trimmed.toLowerCase()];
}
/** First five digits of a ZIP or ZIP+4, or undefined. */
export function toZip5(zip) {
    const match = zip?.trim().match(/^(\d{5})(?:-\d{4})?$/);
    return match ? match[1] : undefined;
}
/** Trimmed text inside the spec's length cap, or undefined. Never truncates: a clipped fact is a changed fact. */
export function clampText(value, max = 600) {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed && trimmed.length <= max ? trimmed : undefined;
}
/** A phone the schema accepts: 7 to 40 characters after trimming. */
export function validPhone(value) {
    const phone = clampText(value, 40);
    return phone && phone.length >= 7 ? phone : undefined;
}
/** An email the schema's format check accepts, inside its length cap. */
export function validEmail(value) {
    const email = clampText(value, 254);
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}
/** A city or location name as a slug: "Haines City" to "haines-city". Empty when nothing survives. */
export function toOspSlug(value) {
    return value
        .normalize('NFKD')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}
/**
 * Facts to manifest. Every optional field is spread in only when the fact
 * passes the schema's own shape test; a fact that fails is dropped and, where
 * the schema requires it, reported as a gap. The builder never substitutes.
 */
export function buildManifestFromFacts(facts) {
    const gaps = [];
    const serviceModel = facts.business.serviceModel;
    const displayName = clampText(facts.business.displayName, 120);
    if (!displayName)
        gaps.push({ code: 'displayName' });
    const trades = Array.from(new Set((facts.business.trades || []).map((trade) => clampText(trade, 60)).filter((trade) => !!trade))).slice(0, 5);
    if (trades.length === 0)
        gaps.push({ code: 'trades' });
    if (!serviceModel)
        gaps.push({ code: 'serviceModel' });
    const timeZone = clampText(facts.business.timeZone, 80);
    if (!timeZone)
        gaps.push({ code: 'timeZone' });
    const phone = validPhone(facts.business.phone);
    if (!phone)
        gaps.push({ code: 'phone' });
    const email = validEmail(facts.business.email);
    const legalName = clampText(facts.business.legalName, 200);
    const description = clampText(facts.business.description);
    const years = facts.business.yearsInBusiness;
    const reviewProfiles = Array.from(new Set((facts.business.reviewProfiles || []).filter((url) => /^https:\/\//.test(url)))).slice(0, 10);
    // Exactly one primary (Appendix A constraint 1): the flagged one, else the
    // first. When the producer does not know which of several is primary, none
    // is flagged and the gap is reported rather than guessed.
    const locations = facts.locations.map((location) => ({ ...location }));
    const primaryUnknown = facts.primaryLocationKnown === false && locations.length > 1 && !locations.some((location) => location.isPrimary);
    if (primaryUnknown) {
        locations.forEach((location) => { location.isPrimary = false; });
        gaps.push({ code: 'primaryLocation' });
    }
    else {
        const primaryIndex = Math.max(0, locations.findIndex((location) => location.isPrimary));
        locations.forEach((location, index) => { location.isPrimary = index === primaryIndex; });
    }
    if (locations.length === 0)
        gaps.push({ code: 'locations' });
    for (const location of locations) {
        if (!location.hours)
            gaps.push({ code: 'location_hours', detail: location.id });
    }
    const services = facts.services;
    if (services.length === 0)
        gaps.push({ code: 'services' });
    // Coverage exists only when it can match something: ZIPs or a radius.
    let coverage;
    const postalCodes = Array.from(new Set((facts.coverage?.postalCodes || []).map((zip) => toZip5(zip)).filter((zip) => !!zip))).sort();
    const radius = (facts.coverage?.radius || []).filter((entry) => OSP_SLUG.test(entry.locationId) && entry.miles > 0 && entry.miles <= 500);
    if (postalCodes.length > 0 || radius.length > 0) {
        coverage = {};
        if (postalCodes.length > 0)
            coverage.postalCodes = postalCodes;
        if (radius.length > 0)
            coverage.radius = radius;
        const areaNames = Array.from(new Set((facts.coverage?.areaNames || []).map((name) => clampText(name, 100)).filter((name) => !!name)));
        if (areaNames.length > 0)
            coverage.areaNames = areaNames;
        const note = clampText(facts.coverage?.note, 200);
        if (note)
            coverage.note = note;
    }
    else if (serviceModel !== 'in_shop') {
        gaps.push({ code: 'coverage' });
    }
    const certifications = Array.from(new Set((facts.certifications || []).map((value) => clampText(value, 120)).filter((value) => !!value)));
    const schedulePageUrl = facts.interfaces.schedulePageUrl;
    if (!schedulePageUrl)
        gaps.push({ code: 'schedulePageUrl' });
    // The booking policy is the business's own statement; a value it has not
    // given is left out and reported, never drafted from the page wording.
    const policy = facts.bookingPolicy;
    if (typeof policy.minimumDaysAhead !== 'number')
        gaps.push({ code: 'bookingPolicy.minimumDaysAhead' });
    if (!policy.weekendRequests)
        gaps.push({ code: 'bookingPolicy.weekendRequests' });
    if (typeof policy.emergencyAvailable !== 'boolean')
        gaps.push({ code: 'bookingPolicy.emergencyAvailable' });
    if (!policy.contactMethods || policy.contactMethods.length === 0)
        gaps.push({ code: 'bookingPolicy.contactMethods' });
    const manifest = {
        specVersion: OSP_SPEC_VERSION,
        updatedAt: facts.updatedAt,
        ...(facts.conformance ? { conformance: facts.conformance } : {}),
        business: {
            displayName: displayName ?? '',
            ...(legalName && legalName !== displayName ? { legalName } : {}),
            trades,
            ...(serviceModel ? { serviceModel } : {}),
            ...(reviewProfiles.length ? { reviewProfiles } : {}),
            ...(description ? { description } : {}),
            websiteUrl: facts.business.websiteUrl,
            ...(phone ? { phone } : {}),
            ...(email ? { email } : {}),
            ...(typeof years === 'number' && Number.isInteger(years) && years >= 0 && years <= 200 ? { yearsInBusiness: years } : {}),
            ...(timeZone ? { timeZone } : {}),
        },
        locations,
        services,
        ...(coverage ? { coverage } : {}),
        ...(certifications.length ? { certifications } : {}),
        bookingPolicy: facts.bookingPolicy,
        bookingSemantics: 'request',
        interfaces: facts.interfaces,
    };
    // An empty displayName is a gap, not a value; the key is left out so the
    // schema reports the missing field rather than a too-short string.
    if (!displayName)
        delete manifest.business.displayName;
    return { manifest, gaps, ready: gaps.length === 0 };
}
function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
function asArray(value) {
    if (Array.isArray(value))
        return value;
    return value === undefined || value === null ? [] : [value];
}
export function isRealCalendarDate(value) {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match)
        return false;
    const [year, month, day] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function timeBefore(open, close) {
    return typeof open === 'string' && typeof close === 'string' && open < close;
}
/**
 * Appendix A's numbered constraints that the schema itself cannot express
 * (or that a schema library might skip): references, uniqueness, time order,
 * calendar dates. Each failure is one plain sentence with a JSON path.
 */
export function manifestConstraintErrors(manifest) {
    const errors = [];
    const locations = asArray(manifest.locations).filter(isRecord);
    const services = asArray(manifest.services).filter(isRecord);
    const locationIds = new Set();
    for (const [index, location] of locations.entries()) {
        const id = typeof location.id === 'string' ? location.id : '';
        if (id && locationIds.has(id))
            errors.push(`$.locations[${index}].id: duplicate location id ${id}`);
        if (id)
            locationIds.add(id);
        const hours = isRecord(location.hours) ? location.hours : null;
        const weekly = hours && isRecord(hours.weekly) ? hours.weekly : null;
        for (const [day, value] of Object.entries(weekly || {})) {
            if (isRecord(value) && !timeBefore(value.open, value.close)) {
                errors.push(`$.locations[${index}].hours.weekly.${day}: open must precede close`);
            }
        }
        for (const [exceptionIndex, exception] of asArray(hours?.exceptions).entries()) {
            if (!isRecord(exception))
                continue;
            if (typeof exception.date === 'string' && !isRealCalendarDate(exception.date)) {
                errors.push(`$.locations[${index}].hours.exceptions[${exceptionIndex}].date: not a calendar date`);
            }
            if ('open' in exception && !timeBefore(exception.open, exception.close)) {
                errors.push(`$.locations[${index}].hours.exceptions[${exceptionIndex}]: open must precede close`);
            }
        }
    }
    const primaries = locations.filter((location) => location.isPrimary === true).length;
    if (primaries !== 1)
        errors.push(`$.locations: ${primaries} primary locations, exactly one required`);
    const slugs = new Set();
    for (const [index, service] of services.entries()) {
        const slug = typeof service.slug === 'string' ? service.slug : '';
        if (slug && slugs.has(slug))
            errors.push(`$.services[${index}].slug: duplicate service slug ${slug}`);
        if (slug)
            slugs.add(slug);
        for (const ref of asArray(service.locationIds)) {
            if (typeof ref === 'string' && !locationIds.has(ref))
                errors.push(`$.services[${index}].locationIds: ${ref} is not a location id`);
        }
    }
    const coverage = isRecord(manifest.coverage) ? manifest.coverage : null;
    for (const [index, radius] of asArray(coverage?.radius).entries()) {
        if (!isRecord(radius) || typeof radius.locationId !== 'string')
            continue;
        const target = locations.find((location) => location.id === radius.locationId);
        if (!target)
            errors.push(`$.coverage.radius[${index}].locationId: ${radius.locationId} is not a location id`);
        else if (!isRecord(target.geo))
            errors.push(`$.coverage.radius[${index}]: location ${radius.locationId} has no geo`);
    }
    const policy = isRecord(manifest.bookingPolicy) ? manifest.bookingPolicy : null;
    const windowIds = new Set();
    for (const [index, window] of asArray(policy?.windows).entries()) {
        if (!isRecord(window))
            continue;
        const id = typeof window.id === 'string' ? window.id : '';
        if (id && windowIds.has(id))
            errors.push(`$.bookingPolicy.windows[${index}].id: duplicate window id ${id}`);
        if (id)
            windowIds.add(id);
        if ('start' in window && 'end' in window && !timeBefore(window.start, window.end)) {
            errors.push(`$.bookingPolicy.windows[${index}]: start must precede end`);
        }
    }
    if (policy && 'afterHoursNote' in policy && policy.emergencyAvailable !== true) {
        errors.push('$.bookingPolicy.afterHoursNote: present while emergencyAvailable is not true');
    }
    return errors;
}
