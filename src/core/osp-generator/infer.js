// GENERATED FILE. Do not edit.
// Source of truth: the TypeScript in the the-marketing-guys repository (lib/).
// Regenerate with: node tooling/osp-generator/sync-cli-core.mjs
import { matchTradePattern, PRIMARY_TYPE_TRADE_MAP } from '../audit/trade-patterns.js';
/**
 * Trade labels and the service model, per spec section 5.2. The trades rule:
 * where schema.org defines a LocalBusiness subtype for the trade, the label
 * is that type name exactly; otherwise a plain lowercase label. Three sources
 * in order of trust: the site's own JSON-LD @type, the Google listing's
 * primary type, and the wording of the home page title and heading. Only the
 * last is an inference, and it is flagged for review.
 */
/** schema.org subtypes that are trades, mapped to the label the spec wants (the type name itself). */
const SCHEMA_TRADE_LABELS = {
    HVACBusiness: 'HVACBusiness',
    Plumber: 'Plumber',
    Electrician: 'Electrician',
    AutoRepair: 'AutoRepair',
    AutoBodyShop: 'AutoBodyShop',
    RoofingContractor: 'RoofingContractor',
    HousePainter: 'HousePainter',
    Locksmith: 'Locksmith',
    MovingCompany: 'MovingCompany',
    GeneralContractor: 'GeneralContractor',
    // Not a schema.org type, but published by marine sites; the spec's own example uses the plain label.
    BoatRepair: 'boat repair',
};
/** The audit's trade keys (trade-patterns.ts) to spec labels. */
const AUDIT_TRADE_LABELS = {
    hvac: 'HVACBusiness',
    plumbing: 'Plumber',
    electrical: 'Electrician',
    roofing: 'RoofingContractor',
    painting: 'HousePainter',
    automotive: 'AutoRepair',
    marine: 'boat repair',
    landscape: 'landscaping',
    locksmith: 'Locksmith',
    'general contractor': 'GeneralContractor',
    'appliance repair': 'appliance repair',
    'pest control': 'pest control',
    'garage door': 'garage door service',
    'pool service': 'pool service',
    cleaning: 'cleaning service',
    handyman: 'handyman',
};
const IN_SHOP_TRADES = new Set(['AutoRepair', 'AutoBodyShop', 'boat repair']);
const ON_SITE_TRADES = new Set([
    'HVACBusiness', 'Plumber', 'Electrician', 'RoofingContractor', 'HousePainter', 'Locksmith', 'MovingCompany',
    'GeneralContractor', 'landscaping', 'appliance repair', 'pest control', 'garage door service', 'pool service',
    'cleaning service', 'handyman',
]);
export function inferTrades(facts) {
    const trades = [];
    const seen = new Set();
    const add = (label, source) => {
        if (!seen.has(label)) {
            seen.add(label);
            trades.push({ value: label, source });
        }
    };
    // 1. The site's own schema.org types.
    for (const type of facts.schemaTypes) {
        const label = SCHEMA_TRADE_LABELS[type.value];
        if (label)
            add(label, type.source);
    }
    // 2. The Google listing's primary type, through the audit's mapping.
    if (trades.length === 0 && facts.placesCategories) {
        for (const category of facts.placesCategories.value) {
            const audit = PRIMARY_TYPE_TRADE_MAP[category.toLowerCase()];
            const label = audit ? AUDIT_TRADE_LABELS[audit] : undefined;
            if (label)
                add(label, facts.placesCategories.source);
        }
    }
    // 3. Wording of the name, title, and heading (an inference, flagged for review).
    let inferredFromWording = false;
    if (trades.length === 0) {
        const wording = [facts.name?.value, facts.description?.value, ...facts.services.slice(0, 5).map((service) => service.name.value)].filter(Boolean).join(' ');
        const audit = matchTradePattern(wording);
        const label = audit ? AUDIT_TRADE_LABELS[audit] : undefined;
        if (label) {
            add(label, facts.name?.source ?? { url: facts.origin, selector: 'title' });
            inferredFromWording = true;
        }
    }
    const labels = trades.map((trade) => trade.value);
    let serviceModel;
    if (labels.length === 1) {
        if (IN_SHOP_TRADES.has(labels[0]))
            serviceModel = 'in_shop';
        else if (ON_SITE_TRADES.has(labels[0]))
            serviceModel = 'on_site';
    }
    return { trades, serviceModel, inferredFromWording };
}
/**
 * IANA zone from a US state. States that span two zones get their larger
 * zone and a review flag from the caller; the spec needs one zone and the
 * address is the only fact that points at it.
 */
const STATE_TIME_ZONES = {
    AL: { zone: 'America/Chicago', split: false }, AK: { zone: 'America/Anchorage', split: true }, AZ: { zone: 'America/Phoenix', split: true },
    AR: { zone: 'America/Chicago', split: false }, CA: { zone: 'America/Los_Angeles', split: false }, CO: { zone: 'America/Denver', split: false },
    CT: { zone: 'America/New_York', split: false }, DE: { zone: 'America/New_York', split: false }, DC: { zone: 'America/New_York', split: false },
    FL: { zone: 'America/New_York', split: true }, GA: { zone: 'America/New_York', split: false }, HI: { zone: 'Pacific/Honolulu', split: false },
    ID: { zone: 'America/Boise', split: true }, IL: { zone: 'America/Chicago', split: false }, IN: { zone: 'America/Indiana/Indianapolis', split: true },
    IA: { zone: 'America/Chicago', split: false }, KS: { zone: 'America/Chicago', split: true }, KY: { zone: 'America/New_York', split: true },
    LA: { zone: 'America/Chicago', split: false }, ME: { zone: 'America/New_York', split: false }, MD: { zone: 'America/New_York', split: false },
    MA: { zone: 'America/New_York', split: false }, MI: { zone: 'America/Detroit', split: true }, MN: { zone: 'America/Chicago', split: false },
    MS: { zone: 'America/Chicago', split: false }, MO: { zone: 'America/Chicago', split: false }, MT: { zone: 'America/Denver', split: false },
    NE: { zone: 'America/Chicago', split: true }, NV: { zone: 'America/Los_Angeles', split: true }, NH: { zone: 'America/New_York', split: false },
    NJ: { zone: 'America/New_York', split: false }, NM: { zone: 'America/Denver', split: false }, NY: { zone: 'America/New_York', split: false },
    NC: { zone: 'America/New_York', split: false }, ND: { zone: 'America/Chicago', split: true }, OH: { zone: 'America/New_York', split: false },
    OK: { zone: 'America/Chicago', split: false }, OR: { zone: 'America/Los_Angeles', split: true }, PA: { zone: 'America/New_York', split: false },
    RI: { zone: 'America/New_York', split: false }, SC: { zone: 'America/New_York', split: false }, SD: { zone: 'America/Chicago', split: true },
    TN: { zone: 'America/Chicago', split: true }, TX: { zone: 'America/Chicago', split: true }, UT: { zone: 'America/Denver', split: false },
    VT: { zone: 'America/New_York', split: false }, VA: { zone: 'America/New_York', split: false }, WA: { zone: 'America/Los_Angeles', split: false },
    WV: { zone: 'America/New_York', split: false }, WI: { zone: 'America/Chicago', split: false }, WY: { zone: 'America/Denver', split: false },
    PR: { zone: 'America/Puerto_Rico', split: false }, VI: { zone: 'America/St_Thomas', split: false }, GU: { zone: 'Pacific/Guam', split: false },
    AS: { zone: 'Pacific/Pago_Pago', split: false }, MP: { zone: 'Pacific/Saipan', split: false },
};
export function timeZoneForRegion(region) {
    return region ? STATE_TIME_ZONES[region] ?? null : null;
}
/** The IANA zones a US address can fall in, for the owner's time-zone question (web select, CLI --time-zone). */
export const US_TIME_ZONES = Array.from(new Set([
    ...Object.values(STATE_TIME_ZONES).map((entry) => entry.zone),
    'America/Adak', 'America/Indiana/Knox', 'America/Kentucky/Louisville', 'America/Menominee', 'America/North_Dakota/Center',
])).sort();
