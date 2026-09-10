# OSP v0.1 publisher reference

Section numbers refer to
https://www.theservicemarketingguys.com/standards/open-service-profile/v0.1.

## Conformance checklist (8.4)

| # | requirement | L1 | L2 | L3 | how to verify |
|---|---|---|---|---|---|
| 1 | Manifest at well-known path, 200, JSON, CORS | x | x | x | fetch and validate |
| 2 | Manifest validates against Appendix A | x | x | x | schema validation |
| 3 | Exactly one primary location | x | x | x | schema |
| 4 | At least one window; custom windows carry start, end, label; `bookingSemantics` = request; `serviceModel` and `trades` declared; `afterHoursNote` only with `emergencyAvailable` true; `interfaces.mcp` present when level is 2 or 3 | x | x | x | schema |
| 5 | LocalBusiness JSON-LD with name, address, telephone, hours, and url | x | x | x | parse HTML |
| 6 | OfferCatalog lists every manifest service (SHOULD; reported, not required) | | | | compare slugs to catalog urls |
| 7 | One ScheduleAction with ReservationPending on the business node (per-service actions SHOULD; reported, not required) | x | x | x | parse HTML |
| 8 | No price or certification in manifest absent from site; no ratings or counts in the manifest | x | x | x | crawl and compare |
| 9 | MCP endpoint answers `tools/list` with `get_business_info`, `list_services`, `check_coverage` | | x | x | MCP client |
| 10 | Server card lists the exposed tools (SHOULD; reported, not required) | | | | fetch |
| 11 | `get_business_info.booking.mode` = request | | x | x | call |
| 12 | `list_services` slugs equal manifest slugs | | x | x | call and compare |
| 13 | `check_coverage` agrees with manifest for a sampled covered and uncovered ZIP | | x | x | call |
| 14 | `get_reviews`, when exposed, carries `notice` and no placeholder rating | | x | x | call |
| 15 | Rate limiting returns `rate_limited`, not partial data | | x | x | burst test |
| 16 | `request_service_booking` rejects `confirmed` or `contactAuthorized` not literal true | | | x | call with false |
| 17 | Same `requestId` twice yields one request | | | x | call twice |
| 18 | Success payload has `appointmentConfirmed: false` and `status` pending | | | x | call |
| 19 | `check_availability` returns `source`, per-window `status`, no `available` in policy mode, and `sourceNote` in policy mode | | | x | call |
| 20 | Confirmation email or page contains no "booked" or "confirmed appointment" language | | | x | inspect |

## Appendix A constraints beyond the schema

A validator checks these in addition to the JSON Schema:

1. Exactly one location has `isPrimary: true`.
2. Every `coverage.radius[].locationId` and `services[].locationIds[]` names an existing location.
3. Every location referenced by `coverage.radius` has `geo`.
4. Service slugs, location ids, and window ids are unique.
5. `bookingPolicy.afterHoursNote` present implies `bookingPolicy.emergencyAvailable: true`.
6. `hours.weekly` open times precede close times except for `24_hours`.
7. `coverage` is present when `business.serviceModel` is `on_site` or `both`.
8. `bookingPolicy.requiresAddress`, when absent, reads as `true` for `on_site` and `both`, `false` for `in_shop`.
9. `bookingPolicy.vehicleDetailsAccepted` is meaningful only for `both` (the schema rejects it otherwise).
10. Window `start` precedes `end`.

Dates must exist on the calendar (no `2026-02-30`), whether or not the schema library enforces `format: date`.

## Level 1 field minimum (5.1 to 5.9)

| path | requirement |
|---|---|
| `specVersion` | `"0.1"` |
| `updatedAt` | RFC 3339 date-time |
| `business.displayName`, `trades` (1 to 5 labels), `serviceModel`, `websiteUrl`, `phone`, `timeZone` | required |
| `locations[]` | at least one; each with `id`, `name`, `isPrimary`, `address` (US: `street`, `city`, two-letter `region`, five-digit `postalCode`, `country: "US"`), `hours.weekly` with all seven days |
| `services[]` | at least one; each with `slug` (`^[a-z0-9][a-z0-9-]*$`) and `name` |
| `coverage` | required for `on_site` and `both`; `postalCodes` (five-digit) or `radius` (`{ locationId, miles }`, location needs `geo`) |
| `bookingPolicy.windows` (1+), `minimumDaysAhead` (0 to 60), `weekendRequests`, `emergencyAvailable`, `contactMethods` (1+) | required |
| `bookingSemantics` | `"request"` |
| `interfaces.schedulePageUrl` | required; the human booking page, or the contact page |

Trade labels (5.2): where schema.org defines a `LocalBusiness` subtype, use its exact
name (`HVACBusiness`, `Plumber`, `Electrician`, `AutoRepair`, `RoofingContractor`,
`HousePainter`, `Locksmith`, `MovingCompany`, `GeneralContractor`); otherwise a plain
lowercase label such as `"boat repair"`.

## Generator output, file by file

| file | path on the site | notes |
|---|---|---|
| `open-service-profile.json` | `/.well-known/open-service-profile` | `application/json`, `Access-Control-Allow-Origin: *` (4.1) |
| `llms.txt` | `/llms.txt` | lists the manifest (4.2) |
| `llms-full.txt` | `/llms-full.txt` | every fact with its source page |
| `robots-ai-section.txt` | merged into `/robots.txt` | a commented template until `--ai-read` and `--ai-train` are answered |
| `jsonld.html` | inside `<head>` on `/` | the Level 1 JSON-LD (8.1 item 2) |

Re-run `npx open-service-profile init <url>` after every website change that touches a
published fact, and update `updatedAt`.

## Server card shape (4.3), for Level 2

```json
{
  "serverInfo": { "name": "<business display name>", "version": "1.0.0" },
  "transport": { "type": "streamable-http", "url": "<interfaces.mcp.url>" },
  "capabilities": {
    "tools": [
      { "name": "get_business_info" },
      { "name": "list_services" },
      { "name": "check_coverage" },
      { "name": "get_reviews" }
    ]
  }
}
```

Published at `/.well-known/mcp/server-card.json` and referenced from
`interfaces.mcp.serverCardUrl`. List only tools the server actually implements, with the
exact OSP names.

## Audit MCP result fields

`check_agent_readiness { url }` at `https://www.theservicemarketingguys.com/api/audit-mcp`:

| field | meaning |
|---|---|
| `headline` | one-paragraph verdict |
| `openServiceProfile.manifest.status`, `httpStatus`, `contentType`, `cors` | what the fetch of the well-known path found |
| `openServiceProfile.levelClaimed` | `conformance.level` from the manifest, or null |
| `openServiceProfile.levelVerified` | 0 or 1; automated checks cover Level 1 only |
| `openServiceProfile.items[]` | 8.4 rows with `status` `pass`, `fail`, `reported`, `not_checked` and a detail line |
| `openServiceProfile.uncheckedItems` | the `not_checked` items: the Level 2 and 3 items, and 8 unless the ratings scan failed it |
| `openServiceProfile.schemaErrors` | Appendix A failures |
| `openServiceProfile.jsonLd` | whether the home page was fetched, the business `@type` found, and whether a `ScheduleAction` was present |
| `nextStep` | what to do next, in plain English |

Errors: `invalid_input` (with `fields`), `rate_limited`, `target_unreachable`.
