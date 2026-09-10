// GENERATED FILE. Do not edit.
// Source of truth: the TypeScript in the the-marketing-guys repository (lib/).
// Regenerate with: node tooling/osp-generator/sync-cli-core.mjs
import { OSP_WEEKDAYS } from '../standards/osp-manifest.js';
/**
 * The Level 1 JSON-LD snippet (spec section 8.1 item 2, in the shape of
 * Appendix C.4): one LocalBusiness node for the primary location carrying
 * name, url, telephone, address, hours, and a ScheduleAction whose result is
 * a pending Reservation, plus the recommended OfferCatalog. Built only from
 * the manifest's established facts. A fact the draft lacks is an HTML comment
 * with its TODO line, never a placeholder value.
 */
const SCHEMA_TYPE = /^[A-Z][A-Za-z]+$/;
const DAY_NAMES = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' };
function openingHours(weekly) {
    const groups = new Map();
    for (const day of OSP_WEEKDAYS) {
        const value = weekly[day];
        if (value === 'closed' || value === undefined)
            continue;
        const span = value === '24_hours' ? { opens: '00:00', closes: '23:59' } : { opens: value.open, closes: value.close };
        const key = `${span.opens}-${span.closes}`;
        const group = groups.get(key) ?? { days: [], ...span };
        group.days.push(DAY_NAMES[day]);
        groups.set(key, group);
    }
    return Array.from(groups.values()).map((group) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: group.days.length === 1 ? group.days[0] : group.days,
        opens: group.opens,
        closes: group.closes,
    }));
}
export function renderLevelOneJsonLd(manifest, facts, todos) {
    const origin = facts.origin;
    const business = manifest.business;
    const primary = manifest.locations.find((location) => location.isPrimary) ?? manifest.locations[0];
    const trade = business.trades[0];
    const node = {
        '@context': 'https://schema.org',
        '@type': trade && SCHEMA_TYPE.test(trade) ? trade : 'LocalBusiness',
        '@id': `${origin}/#business`,
    };
    if (business.displayName)
        node.name = business.displayName;
    if (business.legalName)
        node.legalName = business.legalName;
    node.url = origin;
    const phone = primary?.phone ?? business.phone;
    if (phone)
        node.telephone = phone;
    if (business.email)
        node.email = business.email;
    if (primary) {
        node.address = {
            '@type': 'PostalAddress',
            streetAddress: primary.address.street,
            addressLocality: primary.address.city,
            addressRegion: primary.address.region,
            postalCode: primary.address.postalCode,
            addressCountry: primary.address.country,
        };
        if (primary.geo)
            node.geo = { '@type': 'GeoCoordinates', latitude: primary.geo.latitude, longitude: primary.geo.longitude };
        if (primary.hours)
            node.openingHoursSpecification = openingHours(primary.hours.weekly);
    }
    if (manifest.coverage?.areaNames?.length)
        node.areaServed = manifest.coverage.areaNames.map((name) => ({ '@type': 'City', name }));
    if (business.reviewProfiles?.length)
        node.sameAs = business.reviewProfiles;
    if (manifest.interfaces.schedulePageUrl) {
        node.potentialAction = {
            '@type': 'ScheduleAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: manifest.interfaces.schedulePageUrl,
                inLanguage: 'en-US',
                actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/MobileWebPlatform'],
            },
            result: { '@type': 'Reservation', reservationStatus: 'https://schema.org/ReservationPending' },
        };
    }
    const withUrls = manifest.services.filter((service) => service.url);
    if (withUrls.length > 0) {
        node.hasOfferCatalog = {
            '@type': 'OfferCatalog',
            name: 'Services',
            itemListElement: withUrls.map((service) => ({
                '@type': 'Offer',
                itemOffered: {
                    '@type': 'Service',
                    '@id': `${service.url}#service`,
                    name: service.name,
                    url: service.url,
                    provider: { '@id': `${origin}/#business` },
                },
            })),
        };
    }
    // The facts item 2 needs that this draft lacks, as comments beside the block.
    const wanted = ['business.displayName', 'business.phone', 'locations[0].address', 'locations[0].hours', 'interfaces.schedulePageUrl', 'primaryLocation'];
    const relevant = todos.filter((todo) => todo.kind === 'missing' && wanted.some((field) => todo.field === field || todo.field.startsWith(`${field}.`) || (field === 'locations[0].hours' && /^locations\[\d+\]\.hours/.test(todo.field))));
    const lines = [
        `<!-- Open Service Profile, Level 1 JSON-LD for ${origin}. Paste inside <head> on your home page. -->`,
        '<!-- Built only from facts the draft established. Nothing below was invented; a missing fact is a TODO here, not a placeholder. -->',
        ...relevant.map((todo) => `<!-- ${todo.line} -->`),
        '<script type="application/ld+json">',
        JSON.stringify(node, null, 2).replace(/</g, '\\u003c'),
        '</script>',
    ];
    return `${lines.join('\n')}\n`;
}
