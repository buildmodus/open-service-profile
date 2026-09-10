# Open Service Profile

Open Service Profile (OSP) is a machine-readable description of a local service business, published at `/.well-known/open-service-profile`, that tells AI agents what the business does, where it works, when it is open, and how to request a booking.

It covers dispatch-based and shop-based trades: HVAC, plumbing, electrical, landscaping, auto repair, marine repair, and similar. The manifest carries identity, locations and hours, services, ZIP coverage, and a booking policy. Six tools over the Model Context Protocol let an agent read the profile, check coverage, check availability, and submit a booking request. A booking request is a request, never a confirmation; the specification fixes that semantic so an agent cannot tell a customer an appointment exists when it does not.

## Status

Draft v0.1, published 2026-09-07 and revised 2026-09-09 (0.1.0-draft.4, a text-only revision). The draft is stable enough to implement. Changes before 1.0 arrive as versioned releases with a changelog; see [CONTRIBUTING.md](CONTRIBUTING.md) for how changes are decided.

## Specification

- Canonical, versioned: https://www.theservicemarketingguys.com/standards/open-service-profile/v0.1
- Landing page (latest version): https://www.theservicemarketingguys.com/standards/open-service-profile/

The Markdown in [`spec/`](spec/) is the source text. The website is the canonical rendering, and citations should use the versioned URL above.

## Maintainer

The Service Marketing Guys, an EasyServe company. Issues and pull requests are welcome here.

## What is in this repository

```
spec/
  v0.1.md                         specification source text
schemas/v0.1/
  manifest.schema.json            Appendix A, the manifest document
  tools/
    tools-common.schema.json      shared definitions for tool schemas
    <tool>.input.schema.json      one per tool, Appendix B
    <tool>.output.schema.json     one per tool, Appendix B
examples/v0.1/
  hvac-two-locations.json         Appendix C.1
  auto-repair-single-location.json  Appendix C.2
  marine-repair-yard.json         Appendix C.3
  hvac-two-locations.level1.jsonld  Appendix C.4, Level 1 JSON-LD for the C.1 business
scripts/
  validate-examples.mjs           validates the examples against the manifest schema and the Appendix A constraints
  extract-from-spec.mjs           regenerates schemas/ and examples/ from spec/v0.1.md
bin/
  open-service-profile.mjs        the generator CLI (npx open-service-profile init <url>)
src/
  validate.mjs                    the examples script's and the CLI's validator, a thin call into the generated core
  crawl.mjs                       the CLI's bounded site crawl: pinned connections, private-address policy, host fence
  places.mjs                      optional Google listing lookup (your own key)
  core/                           GENERATED generator core; source of truth is the maintainer's TypeScript
tests/
  cli.test.mjs                    node --test; fixture sites under tests/fixtures/
```

Every tool output schema is `oneOf` a success shape and an error shape. The error shape is `tools-common.schema.json#/$defs/ErrorResult`, constrained in each tool's schema to that tool's error codes.

Run `npm run validate` to check the examples. There are no dependencies.

## Generate your profile

The repository also ships a small command-line tool that drafts a business's Open Service Profile from its own website. It also writes the business's `llms.txt`. Node 20 or newer, no dependencies.

```
npx open-service-profile init example.com
```

It reads up to twelve pages (home, contact, schedule, about, then service and location pages from the sitemap) and writes five files into `./open-service-profile/`:

| file | host it at |
|---|---|
| `open-service-profile.json` | `/.well-known/open-service-profile`, served as `application/json` with `Access-Control-Allow-Origin: *` |
| `llms.txt` | `/llms.txt` |
| `llms-full.txt` | `/llms-full.txt` (every fact with the page it was read from, and how each derived value was produced) |
| `robots-ai-section.txt` | merge into `/robots.txt` (a commented template until you answer the two crawler questions) |
| `jsonld.html` | paste inside `<head>` on the home page (the Level 1 JSON-LD: a LocalBusiness node with a ScheduleAction) |

One rule governs every line: a fact the pages do not state becomes a `# TODO:` line, never a plausible default. No price, hour, service, or certification is invented; a service is listed only from a page that was actually read; ratings or review counts found in the page markup are never copied (the standard forbids them). The draft claims Level 1 only when every Level 1 fact is established, no value is an inference from wording, the manifest validates against Appendix A, and the home page already carries the Level 1 JSON-LD; it never claims Level 2, because the tool builds no MCP server.

Some things no website states, so the tool asks rather than guess: the booking policy (earliest day you accept requests for, weekend requests, emergency or after-hours availability, how you confirm), the two `robots.txt` choices (may AI assistants read your pages; may they be used for training), and, only when the pages do not settle them, the service model (one recognized trade settles it), the primary location (one location is primary by definition), and the time zone (a state in one zone settles it). Pass them as flags, or run in a terminal and answer the questions; unanswered fields stay TODO lines. The three standard windows are written by id only, with no clock times.

```
npx open-service-profile init example.com --min-days-ahead 1 --weekend-requests saturday_only --emergency no --contact-methods call,email --ai-read yes --ai-train no
```

Options:

- `--min-days-ahead <n>` (0 to 60), `--weekend-requests <allowed|saturday_only|not_allowed>`, `--emergency <yes|no>`, `--contact-methods <call,text,email>`: the booking policy, in your own words.
- `--ai-read <yes|no>`, `--ai-train <yes|no>`: the `robots.txt` choices. Without them the section is a commented template that changes nothing.
- `--service-model <on_site|in_shop|both>`, `--primary <city or id>`, `--time-zone <IANA zone>`: asked only when the pages do not settle them.
- `--place-id <id>` also reads the business's Google Business Profile listing through the Places API, using your own `GOOGLE_PLACES_API_KEY`. Listing facts fill only what the site lacks and never override it, and the listing is used only once it is confirmed as this business (its website is the crawled site, or, when it lists none, its phone or its name and postal code match the site).
- `--out <dir>` chooses where the files go. `--json` prints the whole result (manifest, files, TODO list, facts with sources) to stdout instead.
- `--verbose` prints each URL as it is fetched.

The crawl refuses private, loopback, link-local, unique-local, multicast, and cloud-metadata addresses, in IPv4 and in every IPv6 form that embeds an IPv4 address (mapped, compatible, NAT64). Each hostname is resolved once, judged, and the connection is pinned to the judged addresses; redirects and sitemap children may name only the same host or its www twin. There is no switch that loosens this.

The same generator runs as a web tool on the parent site: https://www.theservicemarketingguys.com/tools/open-service-profile

The generator's core (`src/core/`) is generated from the maintainer's TypeScript and carries a header saying so; edit it there, not here. The manifest validator is part of that core, so the web tool, the public audit, this CLI, and `npm run validate` judge a manifest by one implementation. `src/crawl.mjs`, `src/places.mjs`, `src/validate.mjs`, and `bin/` are this repository's own. Run `npm test` for the CLI tests (Node's built-in runner, fixture sites served locally over a pinned connection).

## Implementations

The Service Marketing Guys serves Level 2 manifests on its client sites, built from the same data that drives each site. Example: https://coastalecoheatair.com/.well-known/open-service-profile

Appendix D of the specification lists where the reference implementation and the specification still differ.

## How to propose changes

Open an issue or a pull request. [CONTRIBUTING.md](CONTRIBUTING.md) describes what a proposal should include and how decisions and releases are made. Reports of places where the specification and a real implementation disagree are especially welcome.

## Citation

Cite the versioned specification, not this repository. [CITATION.cff](CITATION.cff) carries the preferred citation, and GitHub's "Cite this repository" button reads it.

## Licensing

Two licenses apply, by artifact:

- Specification text (`spec/`): Creative Commons Attribution 4.0 International. See [LICENSE-SPEC.md](LICENSE-SPEC.md).
- JSON Schemas, examples, scripts, and the generator (`schemas/`, `examples/`, `scripts/`, `src/`, `bin/`, `tests/`): MIT. See [LICENSE](LICENSE).

Copyright 2026 EasyServe LLC.
