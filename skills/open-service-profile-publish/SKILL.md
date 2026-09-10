---
name: open-service-profile-publish
description: Use when a developer or site owner wants to publish an Open Service Profile (OSP) for a local service business (HVAC, plumbing, electrical, auto repair, marine repair, landscaping, and similar trades) so AI agents can read its services, coverage, hours, and booking policy, or asks about llms.txt, agent readiness, "agent-ready", or the /.well-known/open-service-profile manifest for such a business. Covers drafting the profile from the business's own website with the open-service-profile CLI, resolving its TODO lines without guessing, hosting the five output files (manifest at /.well-known/open-service-profile, llms.txt, llms-full.txt, a robots.txt section, home-page JSON-LD), meeting Level 1, verifying with the public audit MCP, and what Level 2 adds. Not for acting on a customer's behalf (see open-service-profile).
---

# Open Service Profile, publisher side

Open Service Profile (OSP) v0.1 is one JSON manifest at a fixed path plus, at Level 2
and up, MCP tools. You are helping someone publish a correct profile for a business
they control. One rule governs every step: a fact the business's pages do not state is
never filled in with a plausible default (spec 8.1 item 4, 5.2, 5.4, 5.6, 5.7).

Spec: https://www.theservicemarketingguys.com/standards/open-service-profile/v0.1
(section numbers below refer to it). Checklist and flag tables: `reference.md`.

## 1. Draft with the CLI

Node 20 or newer, no dependencies, no install step beyond `npx`:

```
npx open-service-profile init <url> [options]
```

The tool reads up to twelve of the site's own pages and writes five files to
`./open-service-profile/` (or `--out <dir>`). Some facts no website states, so the
tool asks for them; pass them as flags or answer interactively. Never answer for the
owner; ask them.

Owner-answer flags (from `--help`):

| flag | values | meaning |
|---|---|---|
| `--min-days-ahead <n>` | 0 to 60 | earliest day requests are accepted for, in days from today; 1 is tomorrow |
| `--weekend-requests <v>` | `allowed`, `saturday_only`, `not_allowed` | |
| `--emergency <yes\|no>` | | whether urgent calls are taken outside published hours |
| `--contact-methods <list>` | `call`, `text`, `email`, comma-separated | how the business confirms a request |
| `--service-model <v>` | `on_site`, `in_shop`, `both` | asked only when the pages name no recognized trade, or more than one |
| `--primary <city or id>` | | which location is primary, when the pages list several |
| `--time-zone <zone>` | IANA, e.g. `America/Chicago` | asked only when the state spans two zones |
| `--ai-read <yes\|no>` | | robots.txt: may AI assistants read the public pages |
| `--ai-train <yes\|no>` | | robots.txt: may the pages be used for model training |

Other options: `--place-id <id>` (also reads the Google Business Profile listing with
the owner's own `GOOGLE_PLACES_API_KEY`; listing facts fill gaps only and never
override the site), `--out <dir>`, `--json` (print the result instead of writing files),
`--verbose`.

Example with every owner answer given:

```
npx open-service-profile init example.com --min-days-ahead 1 --weekend-requests saturday_only --emergency no --contact-methods call,email --ai-read yes --ai-train no
```

## 2. Resolve every TODO line

Every fact the pages did not establish becomes a line in the output files, and the
manifest's TODOs are printed beside it:

```
# TODO: <field>: not found on <host>; add it to your website or Google Business Profile, then re-run.
# TODO: bookingPolicy.<field>: your website does not state this; answer it in the form (or pass --<flag>) and re-run.
# TODO (review): <field>: <why the generator wants the owner to confirm this value>
```

Resolve each one in exactly one of two ways: fix the website (or the Google listing)
so the fact is published, or pass the owner's answer as a flag. Then run `init` again.
Never edit a value into the manifest by hand to make a TODO disappear; that is an
invented fact. A `(review)` line marks a value the tool filled in that the owner must
confirm before publishing (a trade inferred from page wording, a time zone read from a
state that spans two, a missing description). An unconfirmed inference keeps the draft
from claiming Level 1.

The draft carries `"conformance": { "level": 1 }` only when every Level 1 fact is
established, no value is an inference, the manifest validates against Appendix A, and
the home page already carries the Level 1 JSON-LD. It never claims Level 2: the tool
builds no MCP server.

## 3. Host the five files

| file | where | requirements |
|---|---|---|
| `open-service-profile.json` | `https://<origin>/.well-known/open-service-profile` (no extension) | 4.1: HTTPS, status 200, `Content-Type: application/json`, `Access-Control-Allow-Origin: *`. SHOULD send `Cache-Control` max-age of 1 to 24 hours and `ETag` or `Last-Modified`. MAY also serve at `/.well-known/open-service-profile.json`. Serve on the host the sitemap uses; the bare or www twin SHOULD redirect to it. |
| `llms.txt` | `https://<origin>/llms.txt` | Lists the manifest with a one-line description and, at Level 2 and up, the MCP endpoint (4.2). |
| `llms-full.txt` | `https://<origin>/llms-full.txt` | Every fact with the page it was read from and how each derived value was produced. |
| `robots-ai-section.txt` | merged into the existing `https://<origin>/robots.txt` | Merge; do not replace. Keep every existing `Disallow` line, and copy them into each named group (a named `User-agent` group does not inherit the `*` group's rules). Until `--ai-read` and `--ai-train` are answered the section is commented out and changes nothing. OSP itself changes no crawler policy (4.3). |
| `jsonld.html` | inside `<head>` on the home page | The Level 1 JSON-LD: a `LocalBusiness` (or trade subtype) node with one `ScheduleAction` whose `result` is a `Reservation` with `reservationStatus` `ReservationPending` (8.1 item 2). |

Optional but recommended (4.2): an HTTP `Link` header on HTML pages,
`Link: </.well-known/open-service-profile>; rel="service-profile"; type="application/json"`.

A business that is not ready MUST return 404 at the well-known path (4.1). Never
publish a placeholder manifest.

## 4. Level 1 requirements (8.1) and self-checks (8.4)

Level 1 is a read-only profile:

1. Manifest served per 4.1 and valid per Appendix A.
2. Home page JSON-LD: one `LocalBusiness` node (or subtype such as `HVACBusiness`,
   `Plumber`, `Electrician`, `AutoRepair`) whose `name`, `address`, `telephone`,
   `openingHoursSpecification`, and `url` match the manifest, carrying one
   `potentialAction` of type `ScheduleAction` with `target.urlTemplate` equal to
   `interfaces.schedulePageUrl` and `result` a `Reservation` with `ReservationPending`.
   `hasOfferCatalog` listing each service, and per-service actions, are SHOULD.
3. `bookingSemantics` is `"request"`; `business.serviceModel` and `business.trades`
   are declared.
4. No invented facts: every price, certification, hour, and service appears on the
   business's own pages or comes from a source the business controls.

Checklist items 1 to 8 (8.4) apply at Level 1. A publisher can self-check:

- Item 1: `curl -sI https://<origin>/.well-known/open-service-profile` shows 200,
  `content-type: application/json`, `access-control-allow-origin: *`.
- Items 2 to 4: `node scripts/validate-examples.mjs path/to/open-service-profile.json`
  from a checkout of this repository validates against Appendix A plus its ten listed
  constraints (exactly one primary location, at least one window, custom windows carry
  start, end, label, `afterHoursNote` only with `emergencyAvailable: true`,
  `interfaces.mcp` present when level is 2 or 3, open before close, start before end).
- Items 5 and 7: view the home page source; confirm the business node and its
  `ScheduleAction` with `ReservationPending`. Item 6 (OfferCatalog) is reported, not required.
- Item 8: compare every price, certification, hour, and service against the live pages;
  confirm no `aggregateRating`, `ratingValue`, `reviewCount`, or similar key appears
  anywhere in the manifest.

## 5. Verify with the public audit MCP

Endpoint: `https://www.theservicemarketingguys.com/api/audit-mcp` (MCP Streamable
HTTP, anonymous, read-only). Tool: `check_agent_readiness` with `{ "url": "<site>" }`.
It is synchronous, answers in about 30 seconds, and reuses a check from the last hour.

Read the result:

- `openServiceProfile.levelClaimed`: the `conformance.level` the manifest states, or
  null. `openServiceProfile.levelVerified`: 0 or 1. The automated checks cover Level 1
  only (items 1 to 5 and 7, plus the machine-checkable part of 8). A Level 2 or 3
  claim is reported, not assessed, and not downgraded; its runtime requirements need
  an MCP client.
- `openServiceProfile.items[]`: one row per 8.4 item with `status` `pass`, `fail`,
  `reported`, or `not_checked`, and a detail line. `uncheckedItems` lists the
  `not_checked` items; 8 is among them unless the ratings scan failed it.
- Item 8 (provenance, "no invented facts") cannot be machine-checked beyond the
  ratings-key scan. It remains the business's responsibility; say so.
- `headline` and `nextStep` are plain-English summaries. `schemaErrors` lists
  Appendix A failures. Errors: `invalid_input`, `rate_limited`, `target_unreachable`
  (the manifest could not be fetched; no verdict was recorded).

## 6. Two prohibitions

- **Ratings (5.2).** A manifest MUST NOT carry ratings or review counts. `reviewProfiles`
  holds URLs only. Fresh review data comes from `get_reviews` at Level 2. The CLI never
  copies a rating from page markup; do not add one by hand.
- **Invented facts (8.1 item 4, 5.4, 5.6, 5.7).** No estimated or normalized price, no
  certification inferred from a trade or a template, no hour the business does not
  keep, no `afterHoursNote` or `description` claiming what the site does not say.

OSP makes no claim about how a business is placed in search results or AI answers
(2.1). Do not make one on its behalf.

## 7. Beyond Level 1

Level 2 (8.2) adds an MCP Streamable HTTP endpoint at `interfaces.mcp.url` exposing
`get_business_info`, `list_services`, and `check_coverage` per section 6 (`get_reviews`
SHOULD), anonymous and rate-limited, returning `rate_limited` rather than stale data,
with outputs that agree with the manifest (same slugs, location ids, policy values). The
business SHOULD publish a server card at `interfaces.mcp.serverCardUrl` listing the
tools (4.3 gives the shape). Claim `"conformance": { "level": 2 }` only once that
server is live; the schema requires `interfaces.mcp` for level 2 or 3 and consumers
verify the claim (8).

Level 3 (8.3) adds `request_service_booking` (6.7) with safe retries keyed on
`requestId` and server-side provenance (7.3), `check_availability` (6.5) at least in
`policy` mode, and the rule that no confirmation surface says an appointment is booked
(7.4). The CLI builds none of this, and the public audit does not assess it.

## 8. Common mistakes

- **Hours the business does not keep.** Copying a template's 8 to 5, or marking a day
  open because a listing elsewhere says so. Hours come from the business's own pages
  (8.1 item 4). A day without published hours is a TODO, not a guess.
- **`emergency` as a day value.** A weekday value is `"closed"`, `"24_hours"`, or
  `{open, close}` (5.3.2). Express after-hours service as `"closed"` plus
  `bookingPolicy.emergencyAvailable: true` and, when the site states terms, an
  `afterHoursNote` in the business's words.
- **Windows with invented times.** The fixed ids `Morning`, `Afternoon`, `Evening` need
  no `start` or `end` (5.7.1); the CLI writes ids only. Add clock times only when the
  business commits to them. Custom windows must carry `start`, `end`, and `label`.
- **Copying another business's listing.** Services, certifications, prices,
  descriptions, and coverage belong to this business and its pages (5.2, 5.4, 5.5,
  5.6). A template from a similar shop is an invented fact.
- **Claiming Level 2 without a live server.** `interfaces.mcp.url` must answer
  `tools/list` with the three core tools (8.2, 8.4 item 9). Until it does, claim Level 1.
- **Publishing a placeholder.** Not ready means 404 at the well-known path (4.1).
- **Hand-editing a TODO away.** Fix the source or pass the owner's flag, then re-run.
