// GENERATED FILE. Do not edit.
// Source of truth: the TypeScript in the the-marketing-guys repository (lib/).
// Regenerate with: node tooling/osp-generator/sync-cli-core.mjs
import { buildRobotsAiSection } from '../seo/robots-policy.js';
import { OSP_STANDARD_URL, OSP_WELL_KNOWN_PATH } from '../standards/osp-constants.js';
import { formatDayHours, hoursLines } from './hours.js';
import { normalizeUsPhone } from './html.js';
import { todoBlock, todosUnder } from './todo.js';
/**
 * The text files, in the section order our client sites publish
 * (app/client/[slug]/llms.txt/route.ts): title, summary line, Overview,
 * Contact Information, Locations for a multi-location business, Hours of
 * Operation, the pages about services, Service Areas, the contact page, and
 * the standard's credit line. Every sentence is a fact the sources carry or
 * a TODO line in the same `# TODO:` shape the manifest's TODO list uses: no
 * generated tagline, no synthesized overview, no assertion about how requests
 * are confirmed or that any file is already published.
 */
function national(e164) {
    if (!e164)
        return undefined;
    return normalizeUsPhone(e164)?.national ?? e164;
}
function addressLine(manifest, index = 0) {
    const location = manifest.locations[index];
    if (!location)
        return null;
    const { street, city, region, postalCode } = location.address;
    return `${street}, ${city}, ${region} ${postalCode}`;
}
function todoLines(todos, prefix, kind) {
    return todoBlock(todosUnder(todos, prefix).filter((todo) => !kind || todo.kind === kind));
}
export function renderLlmsTxt(draft, facts, updatedOn) {
    const { manifest, todos } = draft;
    const origin = facts.origin;
    const name = manifest.business.displayName;
    const lines = [];
    // The title is the business's name or the TODO that asks for it; never the host name.
    lines.push(name ? `# ${name}` : todoLines(todos, 'business.displayName', 'missing')[0] ?? '# TODO: business.displayName', '');
    if (manifest.business.description)
        lines.push(`> ${manifest.business.description}`, '');
    lines.push('## Overview', '');
    if (manifest.business.description)
        lines.push(manifest.business.description);
    else
        lines.push(...todoLines(todos, 'business.description'));
    lines.push('');
    lines.push('## Contact Information', '');
    lines.push(`- **Website**: ${origin}`);
    const phone = national(manifest.business.phone);
    if (phone)
        lines.push(`- **Phone**: ${phone}`);
    else
        lines.push(...todoLines(todos, 'business.phone', 'missing'));
    if (manifest.business.email)
        lines.push(`- **Email**: ${manifest.business.email}`);
    const address = addressLine(manifest);
    if (address)
        lines.push(`- **Address**: ${address}`);
    else
        lines.push(...todoLines(todos, 'locations[0].address', 'missing'));
    lines.push('');
    if (manifest.locations.length > 1) {
        lines.push('## Locations', '');
        manifest.locations.forEach((location, index) => {
            lines.push(`### ${location.name}${location.isPrimary ? ' (primary)' : ''}`, '');
            lines.push(`- **Address**: ${addressLine(manifest, index)}`);
            const locationPhone = national(location.phone ?? manifest.business.phone);
            if (locationPhone)
                lines.push(`- **Phone**: ${locationPhone}`);
            if (location.hours)
                lines.push(...hoursLines(location.hours, formatDayHours).map((line) => line.replace('- **', '- **Hours, ')));
            else
                lines.push(...todoLines(todos, `locations[${index}].hours`, 'missing'));
            if (location.pageUrl)
                lines.push(`- **Page**: ${location.pageUrl}`);
            lines.push('');
        });
        lines.push(...todoLines(todos, 'locations[].isPrimary', 'missing'));
        if (todosUnder(todos, 'locations[].isPrimary').length > 0)
            lines.push('');
    }
    lines.push('## Hours of Operation', '');
    const primaryIndex = Math.max(0, manifest.locations.findIndex((location) => location.isPrimary));
    const primaryHours = manifest.locations[primaryIndex]?.hours;
    if (primaryHours) {
        lines.push(...hoursLines(primaryHours, formatDayHours));
        if (primaryHours.note)
            lines.push('', primaryHours.note);
    }
    else {
        const hoursTodos = todoLines(todos, `locations[${primaryIndex}].hours`, 'missing');
        lines.push(...(hoursTodos.length > 0 ? hoursTodos : todoLines(todos, 'locations[0].address', 'missing')));
    }
    lines.push('');
    lines.push('## Pages about services', '');
    for (const service of manifest.services) {
        lines.push(service.url ? `- [${service.name}](${service.url})` : `- ${service.name}`);
    }
    if (manifest.services.length === 0)
        lines.push(...todoLines(todos, 'services', 'missing'));
    lines.push(...todoLines(todos, 'services', 'review'));
    lines.push('');
    if (manifest.business.serviceModel !== 'in_shop') {
        lines.push('## Service Areas', '');
        if (manifest.coverage?.areaNames?.length) {
            for (const area of manifest.coverage.areaNames)
                lines.push(`- ${area}`);
        }
        if (manifest.coverage?.postalCodes?.length) {
            if (manifest.coverage.areaNames?.length)
                lines.push('');
            lines.push(`ZIP codes served: ${manifest.coverage.postalCodes.join(', ')}`);
        }
        if (!manifest.coverage)
            lines.push(...todoLines(todos, 'coverage', 'missing'));
        lines.push('');
    }
    lines.push('## Contact page', '');
    if (manifest.interfaces.schedulePageUrl)
        lines.push(`- **${facts.schedulePageTitle ?? 'Contact page'}**: ${manifest.interfaces.schedulePageUrl}`);
    else
        lines.push(...todoLines(todos, 'interfaces.schedulePageUrl', 'missing'));
    if (phone)
        lines.push(`- **Phone**: ${phone}`);
    lines.push(...todoLines(todos, 'bookingPolicy', 'missing'));
    lines.push('');
    lines.push('---', '');
    lines.push(`For the most up-to-date information, visit ${origin}`, '');
    lines.push(`Open Service Profile: ${OSP_STANDARD_URL}`, '');
    lines.push(`Last updated: ${updatedOn}`);
    return lines.join('\n');
}
export function renderLlmsFullTxt(draft, facts, pages, sitemapTruncated, updatedOn) {
    const { manifest, todos, level, validation, derivations } = draft;
    const origin = facts.origin;
    const name = manifest.business.displayName;
    const lines = [];
    lines.push(name ? `# ${name}: Full Site Guide` : `# Full Site Guide for ${origin}`, '');
    lines.push(`> Facts published on ${facts.host}${facts.listingConfirmedBy ? ' and its Google Business Profile' : ''}, each with the page it was read from.`, '');
    lines.push(`Summary guide: ${origin}/llms.txt (once uploaded)`, '');
    lines.push('## Business facts', '');
    lines.push('Each line names the source so a reader can check it. Nothing below came from a template.', '');
    for (const fact of draft.facts) {
        const value = fact.value.length > 200 ? `${fact.value.slice(0, 197)}...` : fact.value;
        lines.push(`- **${fact.field}**: ${value} (source: ${fact.source.url}, ${fact.source.selector})`);
    }
    if (draft.facts.length === 0)
        lines.push('No business facts could be read from the pages fetched.');
    lines.push('');
    if (manifest.locations.length > 0) {
        lines.push('## Locations', '');
        manifest.locations.forEach((location, index) => {
            lines.push(`### ${location.name}${location.isPrimary ? ' (primary)' : ''}`, '');
            lines.push(`- **Address**: ${addressLine(manifest, index)}`);
            if (location.geo)
                lines.push(`- **Coordinates**: ${location.geo.latitude}, ${location.geo.longitude}`);
            const phone = national(location.phone ?? manifest.business.phone);
            if (phone)
                lines.push(`- **Phone**: ${phone}`);
            if (location.hours)
                lines.push(...hoursLines(location.hours, formatDayHours));
            else
                lines.push(...todoLines(todos, `locations[${index}].hours`, 'missing'));
            lines.push('');
        });
    }
    if (manifest.services.length > 0) {
        lines.push('## Pages about services', '');
        for (const service of manifest.services) {
            lines.push(`- **${service.name}** (${service.slug})${service.url ? `: ${service.url}` : ''}`);
        }
        lines.push('');
    }
    lines.push('## How these facts were produced', '');
    lines.push('Values read from a page carry that page as their source above. The draft also made these derivations, each from an established fact and nothing else:', '');
    for (const derivation of derivations)
        lines.push(`- ${derivation}`);
    if (derivations.length === 0)
        lines.push('- None.');
    lines.push('');
    const unresolved = todos.filter((todo) => todo.kind === 'missing' || todo.guess);
    if (unresolved.length > 0) {
        lines.push('Unresolved before this draft can claim Level 1:', '');
        lines.push(...todoBlock(unresolved), '');
    }
    const review = todos.filter((todo) => todo.kind === 'review' && !todo.guess);
    if (review.length > 0) {
        lines.push('Review before publishing:', '');
        lines.push(...todoBlock(review), '');
    }
    lines.push('## Pages read', '');
    lines.push(`${pages.filter((page) => page.fetched).length} of ${pages.length} listed pages were fetched for this draft${sitemapTruncated ? '; the sitemap was longer than the list kept here' : ''}.`, '');
    for (const page of pages)
        lines.push(`- ${page.url} (${page.kind}${page.fetched ? '' : ', not fetched'}${page.status && page.status !== 200 ? `, HTTP ${page.status}` : ''})`);
    lines.push('');
    if (facts.ratingsIgnored.length > 0) {
        lines.push('## Not copied', '');
        lines.push(`Rating and review-count fields were found in the page markup (${facts.ratingsIgnored.map((entry) => entry.path).slice(0, 6).join(', ')}${facts.ratingsIgnored.length > 6 ? ', ...' : ''}). The Open Service Profile standard forbids ratings and counts in the manifest, so none were carried into these files.`, '');
    }
    lines.push('## Open Service Profile draft', '');
    lines.push(`- **Manifest, once published**: ${origin}${OSP_WELL_KNOWN_PATH}`);
    lines.push(`- **Conformance**: ${level === 1 ? 'Level 1 claimed (every Level 1 fact established, the home page carries the Level 1 JSON-LD, and the document validates against Appendix A)' : 'no level claimed; resolve the items above first'}`);
    lines.push(`- **Standard**: ${OSP_STANDARD_URL}`);
    if (validation.length > 0) {
        lines.push('', 'Validation against Appendix A:', '');
        for (const error of validation)
            lines.push(`- ${error}`);
    }
    lines.push('', '---', '', `Last updated: ${updatedOn}`);
    return lines.join('\n');
}
export function renderRobotsSection(origin, todos, answers) {
    const section = buildRobotsAiSection({ baseUrl: origin, answers: { aiRead: answers?.aiRead, aiTrain: answers?.aiTrain } });
    const missing = todos.filter((todo) => todo.kind === 'missing');
    if (missing.length === 0)
        return section;
    return `${section}\n\n# Resolve before publishing the files above:\n${todoBlock(missing).join('\n')}`;
}
export function hostingInstructions(origin) {
    return [
        { file: 'open-service-profile.json', path: `${origin}${OSP_WELL_KNOWN_PATH}`, note: 'Serve the JSON at this exact path, with Content-Type application/json and Access-Control-Allow-Origin: *. The path has no file extension.' },
        { file: 'llms.txt', path: `${origin}/llms.txt`, note: 'Serve as text/plain at the site root.' },
        { file: 'llms-full.txt', path: `${origin}/llms-full.txt`, note: 'Serve as text/plain at the site root.' },
        { file: 'robots-ai-section.txt', path: `${origin}/robots.txt`, note: 'Merge this section into your existing robots.txt. Commented groups change nothing until you answer the two crawler questions.' },
        { file: 'jsonld.html', path: `${origin}/`, note: 'Paste the script block inside <head> on your home page. The Level 1 claim needs it there.' },
    ];
}
