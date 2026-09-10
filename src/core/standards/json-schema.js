// GENERATED FILE. Do not edit.
// Source of truth: the TypeScript in the the-marketing-guys repository (lib/).
// Regenerate with: node tooling/osp-generator/sync-cli-core.mjs
/**
 * A deliberately small JSON Schema (draft 2020-12 subset) checker, shared by
 * the tests and the public audit MCP, so the Open Service Profile manifest is
 * validated against the schema embedded in the spec text without a validator dependency.
 *
 * Supported: type, required, properties, additionalProperties (false rejects
 * unlisted keys; a schema value validates them), dependentRequired, items,
 * contains with minContains and maxContains, enum, const, pattern, minLength,
 * maxLength, minItems, maxItems, uniqueItems, minimum, maximum,
 * exclusiveMinimum, exclusiveMaximum, $ref into #/$defs, allOf, not, oneOf,
 * anyOf, if/then/else, format (date-time and date as strict RFC 3339 with a
 * real calendar check, uri as an absolute URL with a scheme, email). Anything
 * else is ignored, which can only make the check more lenient.
 */
// Own-property checks only. `in` walks the prototype chain, so a document key
// named constructor or __proto__ would satisfy `required`, dodge
// `additionalProperties: false`, and skip its own property schema.
const hasOwn = (record, key) => Object.prototype.hasOwnProperty.call(record, key);
// RFC 3339 date-time: full-date "T" full-time, with a Z or numeric offset.
const RFC3339_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;
const RFC3339_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
function isRealCalendarDate(year, month, day) {
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
export function isRfc3339DateTime(value) {
    const match = value.match(RFC3339_DATE_TIME);
    if (!match)
        return false;
    const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
    if (!isRealCalendarDate(year, month, day))
        return false;
    // No leap second: 60 is not a valid seconds value here.
    if (hour > 23 || minute > 59 || second > 59)
        return false;
    const offset = match[8];
    if (offset !== 'Z' && offset !== 'z') {
        const [offsetHours, offsetMinutes] = offset.slice(1).split(':').map(Number);
        if (offsetHours > 23 || offsetMinutes > 59)
            return false;
    }
    return true;
}
export function isRfc3339Date(value) {
    const match = value.match(RFC3339_DATE);
    if (!match)
        return false;
    const [year, month, day] = match.slice(1).map(Number);
    return isRealCalendarDate(year, month, day);
}
export function isAbsoluteUri(value) {
    if (!/^[a-z][a-z0-9+.-]*:/i.test(value))
        return false;
    try {
        const parsed = new URL(value);
        return parsed.protocol.length > 1;
    }
    catch {
        return false;
    }
}
export function validateJsonSchema(value, schema, root = schema, path = '$') {
    const errors = [];
    const fail = (message) => errors.push(`${path}: ${message}`);
    const resolved = resolveRef(schema, root);
    if (hasOwn(resolved, 'const') && !deepEqual(value, resolved.const))
        fail(`expected const ${JSON.stringify(resolved.const)}`);
    if (Array.isArray(resolved.enum) && !resolved.enum.some((option) => deepEqual(option, value))) {
        fail(`expected one of ${JSON.stringify(resolved.enum)}, got ${JSON.stringify(value)}`);
    }
    if (typeof resolved.type === 'string' && !matchesType(value, resolved.type)) {
        fail(`expected type ${resolved.type}, got ${describe(value)}`);
        return errors;
    }
    if (typeof value === 'string') {
        if (typeof resolved.minLength === 'number' && value.length < resolved.minLength)
            fail(`shorter than ${resolved.minLength}`);
        if (typeof resolved.maxLength === 'number' && value.length > resolved.maxLength)
            fail(`longer than ${resolved.maxLength}`);
        if (typeof resolved.pattern === 'string' && !new RegExp(resolved.pattern).test(value))
            fail(`does not match ${resolved.pattern}: ${value}`);
        if (resolved.format === 'date-time' && !isRfc3339DateTime(value))
            fail(`not an RFC 3339 date-time: ${value}`);
        if (resolved.format === 'date' && !isRfc3339Date(value))
            fail(`not a calendar date: ${value}`);
        if (resolved.format === 'uri' && !isAbsoluteUri(value))
            fail(`not a uri: ${value}`);
        if (resolved.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
            fail(`not an email: ${value}`);
    }
    if (typeof value === 'number') {
        if (typeof resolved.minimum === 'number' && value < resolved.minimum)
            fail(`below minimum ${resolved.minimum}`);
        if (typeof resolved.maximum === 'number' && value > resolved.maximum)
            fail(`above maximum ${resolved.maximum}`);
        if (typeof resolved.exclusiveMinimum === 'number' && value <= resolved.exclusiveMinimum)
            fail(`not above ${resolved.exclusiveMinimum}`);
        if (typeof resolved.exclusiveMaximum === 'number' && value >= resolved.exclusiveMaximum)
            fail(`not below ${resolved.exclusiveMaximum}`);
    }
    if (Array.isArray(value)) {
        if (typeof resolved.minItems === 'number' && value.length < resolved.minItems)
            fail(`fewer than ${resolved.minItems} items`);
        if (typeof resolved.maxItems === 'number' && value.length > resolved.maxItems)
            fail(`more than ${resolved.maxItems} items`);
        if (resolved.uniqueItems === true) {
            const seen = new Set(value.map((item) => JSON.stringify(item)));
            if (seen.size !== value.length)
                fail('items are not unique');
        }
        if (resolved.items && typeof resolved.items === 'object') {
            value.forEach((item, index) => errors.push(...validateJsonSchema(item, resolved.items, root, `${path}[${index}]`)));
        }
        if (resolved.contains && typeof resolved.contains === 'object') {
            const matching = value.filter((item) => validateJsonSchema(item, resolved.contains, root, path).length === 0).length;
            const min = typeof resolved.minContains === 'number' ? resolved.minContains : 1;
            if (matching < min)
                fail(`only ${matching} item(s) match contains, at least ${min} required`);
            if (typeof resolved.maxContains === 'number' && matching > resolved.maxContains)
                fail(`${matching} items match contains, at most ${resolved.maxContains} allowed`);
        }
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const record = value;
        for (const key of resolved.required || []) {
            if (!hasOwn(record, key))
                fail(`missing required property ${key}`);
        }
        const properties = resolved.properties || {};
        for (const [key, propertySchema] of Object.entries(properties)) {
            if (hasOwn(record, key))
                errors.push(...validateJsonSchema(record[key], propertySchema, root, `${path}.${key}`));
        }
        const propertyNames = resolved.propertyNames;
        if (propertyNames?.pattern) {
            for (const key of Object.keys(record)) {
                if (!new RegExp(propertyNames.pattern).test(key))
                    fail(`property name ${key} does not match ${propertyNames.pattern}`);
            }
        }
        if (hasOwn(resolved, 'additionalProperties')) {
            const extra = Object.keys(record).filter((key) => !hasOwn(properties, key));
            if (resolved.additionalProperties === false && extra.length > 0)
                fail(`unexpected properties: ${extra.join(', ')}`);
            if (resolved.additionalProperties && typeof resolved.additionalProperties === 'object') {
                for (const key of extra)
                    errors.push(...validateJsonSchema(record[key], resolved.additionalProperties, root, `${path}.${key}`));
            }
        }
        const dependentRequired = resolved.dependentRequired;
        for (const [trigger, needed] of Object.entries(dependentRequired || {})) {
            if (hasOwn(record, trigger))
                for (const key of needed)
                    if (!hasOwn(record, key))
                        fail(`${trigger} requires ${key}`);
        }
    }
    if (Array.isArray(resolved.allOf)) {
        for (const option of resolved.allOf)
            errors.push(...validateJsonSchema(value, option, root, path));
    }
    if (resolved.not && typeof resolved.not === 'object') {
        if (validateJsonSchema(value, resolved.not, root, path).length === 0)
            fail('matched a not schema');
    }
    if (Array.isArray(resolved.oneOf)) {
        const passing = resolved.oneOf.filter((option) => validateJsonSchema(value, option, root, path).length === 0).length;
        if (passing !== 1)
            fail(`expected exactly one oneOf branch to match, ${passing} did`);
    }
    if (Array.isArray(resolved.anyOf)) {
        const passing = resolved.anyOf.some((option) => validateJsonSchema(value, option, root, path).length === 0);
        if (!passing)
            fail('no anyOf branch matched');
    }
    if (resolved.if && typeof resolved.if === 'object') {
        const condition = validateJsonSchema(value, resolved.if, root, path).length === 0;
        if (condition && resolved.then)
            errors.push(...validateJsonSchema(value, resolved.then, root, path));
        if (!condition && resolved.else)
            errors.push(...validateJsonSchema(value, resolved.else, root, path));
    }
    return errors;
}
function resolveRef(schema, root) {
    const ref = schema.$ref;
    if (typeof ref !== 'string')
        return schema;
    if (!ref.startsWith('#/'))
        throw new Error(`unsupported $ref ${ref}`);
    let target = root;
    for (const segment of ref.slice(2).split('/')) {
        target = target?.[segment];
    }
    if (!target || typeof target !== 'object')
        throw new Error(`unresolved $ref ${ref}`);
    // Sibling keywords next to $ref are honored too (draft 2020-12 semantics).
    const siblings = Object.fromEntries(Object.entries(schema).filter(([key]) => key !== '$ref'));
    return { ...target, ...siblings };
}
function matchesType(value, type) {
    switch (type) {
        case 'object': return !!value && typeof value === 'object' && !Array.isArray(value);
        case 'array': return Array.isArray(value);
        case 'string': return typeof value === 'string';
        case 'number': return typeof value === 'number' && Number.isFinite(value);
        case 'integer': return typeof value === 'number' && Number.isInteger(value);
        case 'boolean': return typeof value === 'boolean';
        case 'null': return value === null;
        default: return true;
    }
}
function describe(value) {
    if (value === null)
        return 'null';
    if (Array.isArray(value))
        return 'array';
    return typeof value;
}
function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}
/**
 * Pull the first fenced ```json block out of ONE Markdown section: from the
 * given heading to the next heading of the same depth. Bounded on purpose, so
 * a removed fence fails here instead of silently validating against the next
 * section's schema.
 */
export function extractJsonBlockAfterHeading(markdown, heading) {
    const start = markdown.indexOf(heading);
    if (start < 0)
        throw new Error(`heading not found: ${heading}`);
    const depth = heading.match(/^(#+)\s/)?.[1] ?? '##';
    const nextHeading = new RegExp(`\\n${depth} `, 'g');
    nextHeading.lastIndex = start + heading.length;
    const sectionEnd = nextHeading.exec(markdown)?.index ?? markdown.length;
    const section = markdown.slice(start, sectionEnd);
    const fence = section.indexOf('```json\n');
    if (fence < 0)
        throw new Error(`no json block inside the section ${heading}`);
    const end = section.indexOf('\n```', fence + 8);
    if (end < 0)
        throw new Error(`unterminated json block inside the section ${heading}`);
    return JSON.parse(section.slice(fence + 8, end));
}
