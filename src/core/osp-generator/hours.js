// GENERATED FILE. Do not edit.
// Source of truth: the TypeScript in the the-marketing-guys repository (lib/).
// Regenerate with: node tooling/osp-generator/sync-cli-core.mjs
import { OSP_WEEKDAYS } from '../standards/osp-manifest.js';
import { asJsonLdArray, isJsonLdRecord, schemaTerm } from '../standards/json-ld.js';
/**
 * Opening hours in the shapes the sources publish, to the spec's weekly table.
 * Three readers: schema.org openingHoursSpecification objects, schema.org
 * openingHours strings ("Mo-Fr 08:00-17:00"), and Places regularOpeningHours
 * periods. Every reader follows one rule: a table is returned only when every
 * listed day reads cleanly. A day the source lists is the source's statement;
 * a day it does not list is closed, which is how schema.org and Places define
 * their tables. One unreadable entry drops the whole table, because filling
 * the rest in would invent hours.
 */
const DAY_ALIASES = {
    monday: 'monday', mo: 'monday', mon: 'monday',
    tuesday: 'tuesday', tu: 'tuesday', tue: 'tuesday', tues: 'tuesday',
    wednesday: 'wednesday', we: 'wednesday', wed: 'wednesday',
    thursday: 'thursday', th: 'thursday', thu: 'thursday', thur: 'thursday', thurs: 'thursday',
    friday: 'friday', fr: 'friday', fri: 'friday',
    saturday: 'saturday', sa: 'saturday', sat: 'saturday',
    sunday: 'sunday', su: 'sunday', sun: 'sunday',
};
export function dayOf(value) {
    if (typeof value !== 'string')
        return null;
    return DAY_ALIASES[schemaTerm(value).toLowerCase().trim()] ?? null;
}
const NO_HOURS = { hours: null, midnightDays: [] };
/** "08:00", "08:00:00", "8:00", "8:00 AM", or "24:00" to "HH:MM"; null when unreadable. 24:00 is kept as written, never rewritten to 23:59. */
export function clockOf(value) {
    if (typeof value !== 'string')
        return null;
    const text = value.trim().toLowerCase();
    const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?$/) ?? text.match(/^(\d{1,2})\s*(am|pm)$/)?.map((part, index) => (index === 2 ? '00' : part));
    if (!match)
        return null;
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const meridiem = match[3]?.replace(/\./g, '');
    if (meridiem === 'pm' && hour < 12)
        hour += 12;
    if (meridiem === 'am' && hour === 12)
        hour = 0;
    if (!Number.isInteger(hour) || hour > 24 || minute > 59)
        return null;
    if (hour === 24 && minute !== 0)
        return null;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
/**
 * One span to the spec's day value. Google's documented conventions: 00:00 to
 * 00:00 is closed, 00:00 to 23:59 or 24:00 is all day. A partial day that
 * closes at midnight cannot be written in the spec's table (close must be a
 * clock time after open); it is reported as 'midnight' and the caller drops
 * the table and says which day, rather than rewriting the closing time.
 */
function spanToDay(open, close) {
    if (open === '00:00' && close === '00:00')
        return 'closed';
    if (open === '00:00' && (close === '23:59' || close === '24:00'))
        return '24_hours';
    if (close === '24:00')
        return 'midnight';
    if (open >= close)
        return null;
    return { open, close };
}
function emptyWeek() {
    return { monday: null, tuesday: null, wednesday: null, thursday: null, friday: null, saturday: null, sunday: null };
}
function finish(week, midnightDays) {
    if (midnightDays.length > 0)
        return { hours: null, midnightDays };
    if (!OSP_WEEKDAYS.some((day) => week[day] !== null))
        return NO_HOURS;
    const weekly = {};
    for (const day of OSP_WEEKDAYS)
        weekly[day] = week[day] ?? 'closed';
    return { hours: { weekly }, midnightDays: [] };
}
/** schema.org openingHoursSpecification: one object or an array. Seasonal entries (validFrom/validThrough) are skipped. */
export function hoursFromSpecification(spec) {
    const entries = asJsonLdArray(spec).filter(isJsonLdRecord);
    if (entries.length === 0)
        return NO_HOURS;
    const week = emptyWeek();
    const midnight = [];
    for (const entry of entries) {
        if ('validFrom' in entry || 'validThrough' in entry)
            continue;
        const days = asJsonLdArray(entry.dayOfWeek).map(dayOf);
        if (days.length === 0 || days.some((day) => day === null)) {
            // PublicHolidays and unknown tokens: not a weekday table entry.
            if (days.length > 0 && asJsonLdArray(entry.dayOfWeek).every((value) => typeof value === 'string' && /holiday/i.test(value)))
                continue;
            return NO_HOURS;
        }
        const open = clockOf(entry.opens);
        const close = clockOf(entry.closes);
        let value;
        if (open === null && close === null && !('opens' in entry) && !('closes' in entry))
            value = 'closed';
        else if (open === null || close === null)
            return NO_HOURS;
        else
            value = spanToDay(open, close);
        if (value === null)
            return NO_HOURS;
        if (value === 'midnight') {
            midnight.push(...days);
            continue;
        }
        for (const day of days)
            week[day] = value;
    }
    return finish(week, midnight);
}
/** schema.org openingHours strings: "Mo-Fr 08:00-17:00", "Sa 09:00-14:00", "Mo,We,Fr 09:00-17:00", "Mo-Su 00:00-23:59". */
export function hoursFromStrings(values) {
    const lines = asJsonLdArray(values).filter((value) => typeof value === 'string').flatMap((value) => value.split(/[;\n]/));
    const cleaned = lines.map((line) => line.trim()).filter(Boolean);
    if (cleaned.length === 0)
        return NO_HOURS;
    const week = emptyWeek();
    const midnight = [];
    for (const line of cleaned) {
        const match = line.match(/^([A-Za-z,\- ]+?)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
        if (!match)
            return NO_HOURS;
        const days = [];
        for (const token of match[1].split(',').map((part) => part.trim()).filter(Boolean)) {
            const range = token.split('-').map((part) => dayOf(part.trim()));
            if (range.some((day) => day === null))
                return NO_HOURS;
            if (range.length === 1)
                days.push(range[0]);
            else if (range.length === 2) {
                const from = OSP_WEEKDAYS.indexOf(range[0]);
                const to = OSP_WEEKDAYS.indexOf(range[1]);
                for (let index = from;; index = (index + 1) % 7) {
                    days.push(OSP_WEEKDAYS[index]);
                    if (index === to)
                        break;
                }
            }
            else
                return NO_HOURS;
        }
        const open = clockOf(match[2]);
        const close = clockOf(match[3]);
        if (open === null || close === null)
            return NO_HOURS;
        const value = spanToDay(open, close);
        if (value === null)
            return NO_HOURS;
        if (value === 'midnight') {
            midnight.push(...days);
            continue;
        }
        for (const day of days)
            week[day] = value;
    }
    return finish(week, midnight);
}
/** Places API (New) regularOpeningHours.periods; day 0 is Sunday. */
export function hoursFromPlacesPeriods(periods) {
    if (!periods || periods.length === 0)
        return NO_HOURS;
    const byIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    if (periods.length === 1 && !periods[0].close && periods[0].open.day === 0 && periods[0].open.hour === 0 && periods[0].open.minute === 0) {
        const weekly = {};
        for (const day of OSP_WEEKDAYS)
            weekly[day] = '24_hours';
        return { hours: { weekly }, midnightDays: [] };
    }
    const week = emptyWeek();
    const midnight = [];
    const clock = (point) => `${String(point.hour).padStart(2, '0')}:${String(point.minute).padStart(2, '0')}`;
    for (const period of periods) {
        const day = byIndex[period.open.day];
        if (!day || !period.close)
            return NO_HOURS;
        let close = clock(period.close);
        if (period.close.day !== period.open.day) {
            // Closing at 00:00 the next day is closing at midnight: written as 24:00
            // and judged by spanToDay (all day, or unrepresentable). Anything later is unreadable.
            if (period.close.hour === 0 && period.close.minute === 0 && period.close.day === (period.open.day + 1) % 7)
                close = '24:00';
            else
                return NO_HOURS;
        }
        const value = spanToDay(clock(period.open), close);
        if (value === null)
            return NO_HOURS;
        if (value === 'midnight') {
            midnight.push(day);
            continue;
        }
        // Two periods on one day (a lunch break) cannot be expressed; keep the first and widen nothing.
        if (week[day] !== null)
            return NO_HOURS;
        week[day] = value;
    }
    return finish(week, midnight);
}
/** Monday to Sunday in the order the spec uses, for the llms files. */
export function hoursLines(hours, format) {
    return OSP_WEEKDAYS.map((day) => `- **${day.charAt(0).toUpperCase() + day.slice(1)}**: ${format(hours.weekly[day])}`);
}
export function formatDayHours(value) {
    if (value === 'closed')
        return 'Closed';
    if (value === '24_hours')
        return '24 Hours';
    return `${value.open} - ${value.close}`;
}
