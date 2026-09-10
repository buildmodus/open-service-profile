// GENERATED FILE. Do not edit.
// Source of truth: the TypeScript in the the-marketing-guys repository (lib/).
// Regenerate with: node tooling/osp-generator/sync-cli-core.mjs
import { buildManifestFromFacts, toOspSlug, } from '../standards/osp-manifest.js';
import { OSP_CANONICAL_URL } from '../standards/osp-constants.js';
import { judgeJsonLd } from '../standards/osp-jsonld.js';
import { inferTrades, timeZoneForRegion } from './infer.js';
import { answerTodo, bookingTodo, descriptionTodo, guessTodo, JSONLD_TODO, missingTodo, reviewTodo } from './todo.js';
/**
 * Established facts to a draft manifest, through the same pure builder our
 * tenant sites use (lib/standards/osp-manifest.ts). Every Level 1 gap the
 * builder reports becomes a `# TODO:` line. Two kinds of value appear that no
 * page states: derivations from an established fact (one recognized trade to
 * the service model, a one-zone state to its time zone, the window ids the
 * standard defines) and the owner's own answers. Where a field has both, the
 * owner's answer wins and the derivation is not made. Anything else is a TODO.
 *
 * The Level 1 claim is made only when no fact is missing, no review item is a
 * guess, Appendix A validates, and the crawled home page's JSON-LD passes the
 * same checks the public audit runs (spec 8.1 item 2).
 */
const REVIEW_SITES = [/^maps\.google\./i, /^(?:[a-z]+\.)?google\.com\/maps/i, /^yelp\.com/i, /^bbb\.org/i, /^angi\.com/i, /^facebook\.com\/[^/]+\/reviews/i];
const IANA_ZONE = /^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+$/;
const SPEC_WINDOW_NOTE = 'the three standard window ids (Morning, Afternoon, Evening) with no clock times, as the standard defines them; in policy mode the standard applies its default boundaries (08:00 to 12:00, 12:00 to 17:00, 17:00 to 20:00), which are not published as facts. Add your own times or windows if yours differ.';
function locationId(location, taken, index) {
    const base = toOspSlug(location.address.value.city) || `location-${index + 1}`;
    let id = base;
    if (taken.has(id)) {
        const number = location.address.value.street.match(/^\d+/)?.[0];
        id = number ? `${base}-${number}` : `${base}-${index + 1}`;
    }
    while (taken.has(id))
        id = `${id}-x`;
    taken.add(id);
    return id;
}
function gapTodo(gap, host, locations) {
    switch (gap.code) {
        case 'displayName': return missingTodo('business.displayName', host);
        case 'trades': return missingTodo('business.trades', host);
        case 'serviceModel': return answerTodo('business.serviceModel', 'serviceModel');
        case 'timeZone': return answerTodo('business.timeZone', 'timeZone');
        case 'phone': return missingTodo('business.phone', host);
        case 'locations': return missingTodo('locations[0].address', host);
        case 'location_hours': {
            const index = Math.max(0, locations.findIndex((location) => location.id === gap.detail));
            return missingTodo(`locations[${index}].hours`, host);
        }
        case 'services': return missingTodo('services', host);
        case 'coverage': return missingTodo('coverage.postalCodes', host);
        case 'schedulePageUrl': return missingTodo('interfaces.schedulePageUrl', host);
        case 'primaryLocation': return answerTodo('locations[].isPrimary', 'primaryLocation');
        case 'bookingPolicy.minimumDaysAhead': return bookingTodo('minimumDaysAhead');
        case 'bookingPolicy.weekendRequests': return bookingTodo('weekendRequests');
        case 'bookingPolicy.emergencyAvailable': return bookingTodo('emergencyAvailable');
        case 'bookingPolicy.contactMethods': return bookingTodo('contactMethods');
    }
}
const DAY_LABEL = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' };
export function buildDraft(facts, input) {
    const todos = [];
    const shown = [];
    const derivations = [];
    const answers = input.answers ?? {};
    const owner = { url: facts.origin, selector: 'owner' };
    const show = (field, value, source) => {
        shown.push({ field, value: typeof value === 'string' ? value : JSON.stringify(value), source });
    };
    // ---- Trades and the service model.
    const trade = inferTrades(facts);
    trade.trades.forEach((entry, index) => show(`business.trades[${index}]`, entry.value, entry.source));
    if (trade.inferredFromWording)
        todos.push(guessTodo('business.trades', 'inferred from the wording of your site, not from a typed source; confirm it, or add a LocalBusiness type to your JSON-LD and re-run. The draft claims no level while this stands.'));
    // The owner's answer always wins over a derivation; the trade-derived model
    // is written, and labeled as a derivation, only when the owner gave none.
    let serviceModel;
    if (answers.serviceModel === 'on_site' || answers.serviceModel === 'in_shop' || answers.serviceModel === 'both') {
        serviceModel = answers.serviceModel;
        show('business.serviceModel', serviceModel, owner);
    }
    else if (trade.serviceModel) {
        serviceModel = trade.serviceModel;
        const first = trade.trades[0];
        show('business.serviceModel', serviceModel, { ...first.source, selector: `${first.source.selector} (derived from trade)` });
        derivations.push(`business.serviceModel ${serviceModel}: derived from the one recognized trade ${first.value} (auto and marine repair are in_shop; HVAC, plumbing, electrical, and the other home trades are on_site).`);
    }
    // ---- Identity.
    if (facts.name)
        show('business.displayName', facts.name.value, facts.name.source);
    if (facts.name && facts.name.source.selector !== 'json-ld' && facts.name.source.selector !== 'places') {
        todos.push(reviewTodo('business.displayName', `read from the page ${facts.name.source.selector}; confirm it is the name customers know.`));
    }
    if (facts.legalName)
        show('business.legalName', facts.legalName.value, facts.legalName.source);
    if (facts.description)
        show('business.description', facts.description.value, facts.description.source);
    else
        todos.push(descriptionTodo(facts.host));
    if (facts.phone)
        show('business.phone', facts.phone.value, facts.phone.source);
    if (facts.email)
        show('business.email', facts.email.value, facts.email.source);
    if (facts.yearsInBusiness)
        show('business.yearsInBusiness', facts.yearsInBusiness.value, facts.yearsInBusiness.source);
    if (facts.foundingYearOnly)
        todos.push(reviewTodo('business.yearsInBusiness', `your foundingDate gives only ${facts.foundingYearOnly.value}, so the anniversary is unknown and no yearsInBusiness was written; add the month and day to foundingDate, or set yearsInBusiness yourself.`));
    // ---- Locations, with the primary chosen by the owner when there are several.
    const taken = new Set();
    const wantedPrimary = answers.primaryLocation?.trim().toLowerCase();
    let primaryKnown = facts.locations.length <= 1;
    const locations = facts.locations.map((location, index) => {
        const id = locationId(location, taken, index);
        const entry = {
            id,
            name: location.name?.value ?? facts.name?.value ?? location.address.value.city,
            isPrimary: false,
            address: location.address.value,
        };
        if (facts.locations.length === 1)
            entry.isPrimary = true;
        else if (wantedPrimary && (id === wantedPrimary || toOspSlug(location.address.value.city) === toOspSlug(wantedPrimary) || location.address.value.city.toLowerCase() === wantedPrimary)) {
            entry.isPrimary = true;
            primaryKnown = true;
            show(`locations[${index}].isPrimary`, 'true', owner);
        }
        show(`locations[${index}].address`, `${entry.address.street}, ${entry.address.city}, ${entry.address.region} ${entry.address.postalCode}`, location.address.source);
        derivations.push(`locations[${index}].address.country US: the region ${entry.address.region} is a USPS state code and ${entry.address.postalCode} is a five-digit ZIP; the source names no other country.`);
        if (location.geo) {
            entry.geo = location.geo.value;
            show(`locations[${index}].geo`, `${entry.geo.latitude}, ${entry.geo.longitude}`, location.geo.source);
        }
        if (location.phone && location.phone.value !== facts.phone?.value) {
            entry.phone = location.phone.value;
            show(`locations[${index}].phone`, entry.phone, location.phone.source);
        }
        if (location.email && location.email.value !== facts.email?.value)
            entry.email = location.email.value;
        if (location.hours) {
            entry.hours = location.hours.value;
            show(`locations[${index}].hours`, location.hours.value.weekly, location.hours.source);
        }
        if (location.pageUrl)
            entry.pageUrl = location.pageUrl;
        return entry;
    });
    if (facts.locations.length > 1 && wantedPrimary && !primaryKnown) {
        todos.push(reviewTodo('locations[].isPrimary', `no location matched the primary you named (${answers.primaryLocation}); the ids are ${locations.map((location) => location.id).join(', ')}.`));
    }
    for (const entry of facts.midnightDays) {
        const index = entry.locationIndex < 0 ? 0 : entry.locationIndex;
        const days = entry.days.map((day) => DAY_LABEL[day] ?? day).join(', ');
        todos.push({ field: `locations[${index}].hours`, kind: 'missing', line: `# TODO: locations[${index}].hours: ${days} close${entry.days.length === 1 ? 's' : ''} at midnight. Keep your actual hours unchanged. This draft cannot represent this interval, so leave it unpublished until supported.` });
    }
    // ---- Services: only pages this run read, or JSON-LD offers; unread URLs are listed, never named.
    const services = facts.services.map((service) => ({
        slug: service.slug,
        name: service.name.value,
        ...(service.description ? { description: service.description.value } : {}),
        ...(service.url ? { url: service.url } : {}),
    }));
    facts.services.forEach((service, index) => show(`services[${index}]`, `${service.name.value} (${service.slug})`, service.name.source));
    if (facts.unreadServiceUrls.length > 0) {
        // A review item, not a missing fact: every service the manifest lists was
        // read, so the draft states nothing false; the owner decides about the rest.
        todos.push({ field: 'services', kind: 'review', line: `# TODO: these service URLs were not read (cap or error); re-run or add them by hand:\n${facts.unreadServiceUrls.map((url) => `#   ${url}`).join('\n')}` });
    }
    // ---- Coverage.
    const postalCodes = facts.areaZips.map((zip) => zip.value);
    const areaNames = facts.areaNames.map((name) => name.value);
    facts.areaZips.forEach((zip, index) => show(`coverage.postalCodes[${index}]`, zip.value, zip.source));
    facts.areaNames.forEach((name, index) => show(`coverage.areaNames[${index}]`, name.value, name.source));
    // ---- Time zone: the owner's answer first; otherwise a one-zone state is a derivation, and a split state stays a TODO.
    const primaryLocation = locations.find((location) => location.isPrimary) ?? locations[0];
    const region = primaryLocation?.address.region;
    const zone = timeZoneForRegion(region);
    let timeZone;
    if (answers.timeZone && IANA_ZONE.test(answers.timeZone.trim())) {
        timeZone = answers.timeZone.trim();
        show('business.timeZone', timeZone, owner);
    }
    else if (zone && !zone.split) {
        timeZone = zone.zone;
        const source = facts.locations[locations.indexOf(primaryLocation)]?.address.source ?? facts.locations[0].address.source;
        show('business.timeZone', timeZone, { ...source, selector: `${source.selector} (derived from the state ${region})` });
        derivations.push(`business.timeZone ${timeZone}: derived from the state ${region}, which lies in one time zone.`);
    }
    // ---- Booking policy: the owner's answers and the standard's window ids.
    const bookingPolicy = { windows: [{ id: 'Morning' }, { id: 'Afternoon' }, { id: 'Evening' }] };
    show('bookingPolicy.windows', 'Morning, Afternoon, Evening', { url: `${OSP_CANONICAL_URL}#5-7-1-window`, selector: 'spec default' });
    derivations.push('bookingPolicy.windows: the three fixed window ids the standard defines, with no clock times.');
    todos.push(reviewTodo('bookingPolicy.windows', SPEC_WINDOW_NOTE));
    if (typeof answers.minimumDaysAhead === 'number' && Number.isInteger(answers.minimumDaysAhead) && answers.minimumDaysAhead >= 0 && answers.minimumDaysAhead <= 60) {
        bookingPolicy.minimumDaysAhead = answers.minimumDaysAhead;
        show('bookingPolicy.minimumDaysAhead', String(answers.minimumDaysAhead), owner);
    }
    if (answers.weekendRequests === 'allowed' || answers.weekendRequests === 'not_allowed' || answers.weekendRequests === 'saturday_only') {
        bookingPolicy.weekendRequests = answers.weekendRequests;
        show('bookingPolicy.weekendRequests', answers.weekendRequests, owner);
    }
    if (typeof answers.emergencyAvailable === 'boolean') {
        bookingPolicy.emergencyAvailable = answers.emergencyAvailable;
        show('bookingPolicy.emergencyAvailable', String(answers.emergencyAvailable), owner);
    }
    const methods = Array.from(new Set((answers.contactMethods ?? []).filter((method) => method === 'call' || method === 'text' || method === 'email')));
    if (methods.length > 0) {
        bookingPolicy.contactMethods = methods;
        show('bookingPolicy.contactMethods', methods.join(', '), owner);
    }
    // ---- Review profiles, schedule page, listing.
    const reviewProfiles = facts.sameAs.map((same) => same.value).filter((url) => REVIEW_SITES.some((pattern) => pattern.test(url.replace(/^https?:\/\/(?:www\.)?/, ''))));
    facts.sameAs.filter((same) => reviewProfiles.includes(same.value)).forEach((same, index) => show(`business.reviewProfiles[${index}]`, same.value, same.source));
    if (facts.schedulePageUrl)
        show('interfaces.schedulePageUrl', facts.schedulePageUrl.value, facts.schedulePageUrl.source);
    todos.push(reviewTodo('interfaces.llmsTxtUrl', 'after you upload llms.txt, add interfaces.llmsTxtUrl with its address.'));
    if (facts.listingUnconfirmed)
        todos.push({ field: 'places', kind: 'review', line: '# TODO: the Google listing could not be confirmed as this business; check the place id.' });
    const manifestFacts = {
        updatedAt: input.now.toISOString(),
        business: {
            displayName: facts.name?.value,
            legalName: facts.legalName?.value,
            trades: trade.trades.map((entry) => entry.value),
            serviceModel,
            reviewProfiles,
            description: facts.description?.value,
            websiteUrl: facts.origin,
            phone: facts.phone?.value,
            email: facts.email?.value,
            yearsInBusiness: facts.yearsInBusiness?.value,
            timeZone,
        },
        locations,
        primaryLocationKnown: primaryKnown,
        services,
        coverage: { postalCodes, areaNames },
        bookingPolicy,
        interfaces: {
            schedulePageUrl: facts.schedulePageUrl?.value,
        },
    };
    const first = buildManifestFromFacts(manifestFacts);
    for (const gap of first.gaps)
        todos.push(gapTodo(gap, facts.host, first.manifest.locations));
    const validation = input.validate ? input.validate(first.manifest) : [];
    // Spec 8.1 item 2 on the crawled home page, judged by the audit's own code.
    let jsonLd;
    if (facts.homeHtml) {
        const verdict = judgeJsonLd(facts.homeHtml, first.manifest);
        const passes = verdict.item5.status === 'pass' && verdict.item7.status === 'pass';
        jsonLd = { checked: true, passes, detail: passes ? verdict.item5.detail : [verdict.item5, verdict.item7].filter((item) => item.status !== 'pass').map((item) => item.detail).join(' ') };
    }
    else {
        jsonLd = { checked: false, passes: false, detail: 'The home page was not read, so its JSON-LD could not be checked.' };
    }
    if (!jsonLd.passes)
        todos.push(JSONLD_TODO);
    const missing = todos.some((todo) => todo.kind === 'missing');
    const guessed = todos.some((todo) => todo.guess === true);
    const eligible = first.ready && !missing && !guessed && validation.length === 0 && jsonLd.passes;
    // The Level 1 claim needs a successful Appendix A validation of the FINAL
    // document, the one that carries `conformance`. No validator, no claim (and
    // a note saying so); a candidate that fails stays unclaimed and the draft
    // hands back the validated-clean manifest without `conformance`, with the
    // candidate's errors reported. Never Level 2: the generator builds no MCP server.
    let manifest = first.manifest;
    let level = null;
    let finalValidation = validation;
    if (eligible && !input.validate) {
        todos.push(reviewTodo('conformance', 'every Level 1 fact is present, but this run had no Appendix A validator, so no level is claimed; validate the manifest against the schema before publishing a conformance claim.'));
    }
    else if (eligible && input.validate) {
        const candidate = buildManifestFromFacts({ ...manifestFacts, conformance: { level: 1 } }).manifest;
        const errors = input.validate(candidate);
        if (errors.length === 0) {
            manifest = candidate;
            level = 1;
        }
        else {
            finalValidation = errors;
        }
    }
    // Missing first, then review, each group in manifest order.
    const order = (todo) => (todo.kind === 'missing' ? 0 : 1);
    todos.sort((a, b) => order(a) - order(b));
    return { manifest, level, todos, validation: finalValidation, facts: shown, derivations, jsonLd };
}
