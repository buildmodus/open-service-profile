# Open Service Profile

Open Service Profile (OSP) is a machine-readable description of a local service business, published at `/.well-known/open-service-profile`, that tells AI agents what the business does, where it works, when it is open, and how to request a booking.

It covers dispatch-based and shop-based trades: HVAC, plumbing, electrical, landscaping, auto repair, marine repair, and similar. The manifest carries identity, locations and hours, services, ZIP coverage, and a booking policy. Six tools over the Model Context Protocol let an agent read the profile, check coverage, check availability, and submit a booking request. A booking request is a request, never a confirmation; the specification fixes that semantic so an agent cannot tell a customer an appointment exists when it does not.

## Status

Draft v0.1, published 2026-09-07. The draft is stable enough to implement. Changes before 1.0 arrive as versioned releases with a changelog; see [CONTRIBUTING.md](CONTRIBUTING.md) for how changes are decided.

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
  auto-repair-single-bay.json     Appendix C.2
  marine-repair-yard.json         Appendix C.3
scripts/
  validate-examples.mjs           validates the examples against the manifest schema and the Appendix A constraints
  extract-from-spec.mjs           regenerates schemas/ and examples/ from spec/v0.1.md
```

Tool error results share one shape, `tools-common.schema.json#/$defs/ErrorResult`; the `request_service_booking` output schema describes the success case only.

Run `npm run validate` to check the examples. There are no dependencies.

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
- JSON Schemas, examples, and scripts (`schemas/`, `examples/`, `scripts/`): MIT. See [LICENSE](LICENSE).

Copyright 2026 EasyServe LLC.
