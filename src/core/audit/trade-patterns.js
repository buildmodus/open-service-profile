// GENERATED FILE. Do not edit.
// Source of truth: the TypeScript in the the-marketing-guys repository (lib/).
// Regenerate with: node tooling/osp-generator/sync-cli-core.mjs
/**
 * Trade classification tables shared by the audit engines (inferAuditTrade in
 * engines.ts) and the Open Service Profile generator. Pure data plus one
 * matcher, no imports: the generator's copy of this file is compiled into the
 * standalone CLI, so it must stay free of `@/` aliases and Node built-ins.
 */
export const TRADE_PATTERNS = [
    { trade: 'marine', patterns: [/marine/, /boat/, /outboard/] },
    { trade: 'automotive', patterns: [/auto/, /car repair/, /mechanic/, /vehicle repair/] },
    { trade: 'hvac', patterns: [/hvac/, /heating/, /air conditioning/, /furnace/] },
    { trade: 'landscape', patterns: [/landscap/, /lawn/, /tree service/, /irrigation/] },
    { trade: 'plumbing', patterns: [/plumb/, /drain/, /water heater/] },
    { trade: 'electrical', patterns: [/electrician/, /electrical/] },
    { trade: 'roofing', patterns: [/roof/] },
    { trade: 'general contractor', patterns: [/general contractor/, /remodel/, /construction/] },
    { trade: 'painting', patterns: [/paint/] },
    { trade: 'appliance repair', patterns: [/appliance repair/, /major appliance/] },
    { trade: 'pest control', patterns: [/pest control/, /exterminat/] },
    { trade: 'garage door', patterns: [/garage door/] },
    { trade: 'locksmith', patterns: [/locksmith/] },
    { trade: 'pool service', patterns: [/pool service/, /pool cleaning/, /swimming pool contractor/] },
    { trade: 'cleaning', patterns: [/house cleaning/, /cleaning service/, /cleaner/, /maid service/, /janitorial/] },
    { trade: 'handyman', patterns: [/handyman/, /handy person/] },
];
// general_contractor is deliberately absent: Google Places has no HVAC type, so
// GBP categories without a supported type (notably "HVAC contractor") collapse
// to general_contractor in both primaryType and primaryTypeDisplayName. Treating
// it as a real signal zeroes both audit axes for HVAC businesses; real GCs still
// classify via the category scan in inferAuditTrade.
export const PRIMARY_TYPE_TRADE_MAP = {
    plumber: 'plumbing',
    electrician: 'electrical',
    roofing_contractor: 'roofing',
    painter: 'painting',
    car_repair: 'automotive',
    tire_shop: 'automotive',
    hvac_contractor: 'hvac',
    landscaper: 'landscape',
    locksmith: 'locksmith',
    appliance_repair_service: 'appliance repair',
    pest_control_service: 'pest control',
    garage_door_supplier: 'garage door',
    swimming_pool: 'pool service',
    pool_cleaning_service: 'pool service',
    house_cleaning_service: 'cleaning',
    cleaning_service: 'cleaning',
    handyman: 'handyman',
};
/** The first trade whose patterns match the lowercased text, or null. */
export function matchTradePattern(text) {
    const haystack = text.toLowerCase().replace(/_/g, ' ');
    return TRADE_PATTERNS.find(({ patterns }) => patterns.some((pattern) => pattern.test(haystack)))?.trade ?? null;
}
