// GENERATED FILE. Do not edit.
// Source of truth: the TypeScript in the the-marketing-guys repository (lib/).
// Regenerate with: node tooling/osp-generator/sync-cli-core.mjs
/**
 * JSON-LD helpers shared by the public audit MCP (conformance checks) and the
 * Open Service Profile generator (fact extraction). Pure string and object
 * work, no imports: this file is also compiled into the standalone CLI.
 */
export function isJsonLdRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function asJsonLdArray(value) {
    if (Array.isArray(value))
        return value;
    return value === undefined || value === null ? [] : [value];
}
/**
 * Every JSON-LD node on the page, with @graph arrays and top-level arrays
 * flattened one level. A script block that is not valid JSON is skipped.
 */
export function extractJsonLdNodes(html) {
    const nodes = [];
    const pattern = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    for (const match of html.matchAll(pattern)) {
        let parsed;
        try {
            parsed = JSON.parse(match[1].trim());
        }
        catch {
            continue;
        }
        for (const entry of asJsonLdArray(parsed)) {
            if (!isJsonLdRecord(entry))
                continue;
            if (Array.isArray(entry['@graph'])) {
                for (const graphNode of entry['@graph'])
                    if (isJsonLdRecord(graphNode))
                        nodes.push(graphNode);
            }
            else {
                nodes.push(entry);
            }
        }
    }
    return nodes;
}
/**
 * Expanded JSON-LD spells a type as its full IRI (https://schema.org/Plumber);
 * compact form uses the term. Every comparison works on the terminal term.
 */
export function schemaTerm(value) {
    const trimmed = value.trim();
    const iri = trimmed.match(/^https?:\/\/schema\.org\/(.+)$/i);
    return iri ? iri[1] : trimmed;
}
export function typesOf(node) {
    return asJsonLdArray(node['@type']).filter((value) => typeof value === 'string').map(schemaTerm);
}
export const LOCAL_BUSINESS_TYPES = new Set([
    'LocalBusiness', 'HVACBusiness', 'Plumber', 'Electrician', 'AutoRepair', 'AutoBodyShop', 'AutomotiveBusiness',
    'HomeAndConstructionBusiness', 'RoofingContractor', 'GeneralContractor', 'HousePainter', 'Locksmith',
    'MovingCompany', 'ProfessionalService', 'Store', 'EmergencyService', 'Dentist', 'Physician', 'LegalService',
    'FinancialService', 'RealEstateAgent', 'ChildCare', 'DryCleaningOrLaundry', 'SelfStorage', 'TravelAgency',
    'BoatRepair',
]);
export function isLocalBusinessNode(node) {
    return typesOf(node).some((type) => LOCAL_BUSINESS_TYPES.has(type) || type.endsWith('Business'));
}
// Section 5.2: a manifest MUST NOT carry ratings or review counts. These key
// names, anywhere in the document, are the machine-checkable part of item 8.
const RATING_KEYS = new Set(['aggregaterating', 'ratingvalue', 'reviewcount', 'ratingcount', 'rating', 'ratings', 'reviews', 'reviewrating', 'starrating', 'averagerating', 'bestrating', 'worstrating']);
/** Every path whose key is a rating or count field, anywhere in the document. Iterative, no depth cutoff; the caller's byte cap bounds the work. */
export function ratingFieldPaths(root) {
    const found = [];
    const stack = [{ value: root, path: '$' }];
    while (stack.length > 0) {
        const { value, path } = stack.pop();
        if (!value || typeof value !== 'object')
            continue;
        if (Array.isArray(value)) {
            value.forEach((entry, index) => stack.push({ value: entry, path: `${path}[${index}]` }));
            continue;
        }
        for (const [key, child] of Object.entries(value)) {
            if (RATING_KEYS.has(key.toLowerCase()))
                found.push(`${path}.${key}`);
            stack.push({ value: child, path: `${path}.${key}` });
        }
    }
    return found.sort();
}
