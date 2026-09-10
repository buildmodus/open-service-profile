// GENERATED FILE. Do not edit.
// Source of truth: the TypeScript in the the-marketing-guys repository (lib/).
// Regenerate with: node tooling/osp-generator/sync-cli-core.mjs
/**
 * The TODO convention, one shape in every file the generator writes:
 *
 *   # TODO: <field>: not found on <site>; add it to your website or Google Business Profile, then re-run.
 *
 * A fact the sources did not establish is never defaulted; it becomes one of
 * these lines. The `#` prefix is a comment in robots.txt and a loud heading in
 * the two llms files, which is deliberate: a draft with a TODO in it is not
 * finished, and the line should be impossible to miss. The manifest JSON
 * cannot carry comments, so its TODOs travel in `todos[]` and are printed
 * beside it (the web tool) or to the terminal (the CLI).
 *
 * Two kinds. `missing` is a fact the sources did not carry. `review` is a
 * value the generator did fill in and the business must confirm before it
 * publishes: a draft policy, a trade inferred from page wording, a time zone
 * read from a state that spans two.
 */
export function missingTodo(field, host) {
    return {
        field,
        kind: 'missing',
        line: `# TODO: ${field}: not found on ${host}; add it to your website or Google Business Profile, then re-run.`,
    };
}
export function reviewTodo(field, why) {
    return {
        field,
        kind: 'review',
        line: `# TODO (review): ${field}: ${why}`,
    };
}
/** CLI flag for each owner answer; the web tool asks the same questions. */
export const ANSWER_FLAGS = {
    minimumDaysAhead: '--min-days-ahead',
    weekendRequests: '--weekend-requests',
    emergencyAvailable: '--emergency',
    contactMethods: '--contact-methods',
    serviceModel: '--service-model',
    primaryLocation: '--primary',
    timeZone: '--time-zone',
    aiRead: '--ai-read',
    aiTrain: '--ai-train',
};
/** @deprecated the booking subset of ANSWER_FLAGS, kept for the first review round. */
export const BOOKING_FLAGS = ANSWER_FLAGS;
/** A value no website states: the owner answers it, in the form or by flag. */
export function answerTodo(manifestField, answer) {
    return {
        field: manifestField,
        kind: 'missing',
        line: `# TODO: ${manifestField}: your website does not state this; answer it in the form (or pass ${ANSWER_FLAGS[answer]}) and re-run.`,
    };
}
export function bookingTodo(field) {
    return answerTodo(`bookingPolicy.${field}`, field);
}
/** A review note that records an inference from wording: it blocks the Level 1 claim until confirmed. */
export function guessTodo(field, why) {
    return { ...reviewTodo(field, why), guess: true };
}
/** llms.txt needs the site's own words for its summary; nothing is written in their place. Optional in the manifest, so review, not missing. */
export function descriptionTodo(host) {
    return {
        field: 'business.description',
        kind: 'review',
        line: `# TODO (review): business.description: not found on ${host}; add a meta description or a description in your JSON-LD, then re-run. Until then the summary line and Overview stay empty.`,
    };
}
/** The one TODO a crawled home page earns when it lacks the Level 1 JSON-LD. */
export const JSONLD_TODO = {
    field: 'jsonld',
    kind: 'missing',
    line: '# TODO: jsonld: your home page does not carry the Level 1 JSON-LD. Resolve the snippet\'s missing facts, publish it on your home page, then check the published page again.',
};
/** TODO lines whose field sits under the given manifest path (business., locations, coverage ...). */
export function todosUnder(todos, prefix) {
    return todos.filter((todo) => todo.field === prefix || todo.field.startsWith(`${prefix}.`) || todo.field.startsWith(`${prefix}[`));
}
export function todoBlock(todos) {
    return todos.map((todo) => todo.line);
}
