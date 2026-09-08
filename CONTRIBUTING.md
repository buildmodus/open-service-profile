# Contributing to Open Service Profile

## How to propose a change

Open an issue to discuss a problem or a pull request with the change itself. Either is fine. Pull requests should edit `spec/v0.1.md` (or the current draft file) and, when a schema changes, regenerate `schemas/` and `examples/` with `node scripts/extract-from-spec.mjs` so the appendices and the extracted files stay identical. Run `npm run validate` before opening the request.

## What a proposal includes

1. The problem: what an agent, a business, or an implementer cannot do today, with a concrete case.
2. The change: the exact text, field, or tool contract you propose, in the specification's register.
3. The effect on existing implementers: which conformance level it touches, whether an existing manifest or tool response would become invalid, and how an implementer migrates.

## Decision authority

Anyone may propose. The Service Marketing Guys, as maintainer, reviews proposals and approves releases. Review is on the merits of the three items above. A declined proposal receives a stated reason.

## How changes ship

This section mirrors section 9 of the specification word for word; where they differ, the specification governs.

- OSP uses semantic versioning. `specVersion` in the manifest is `MAJOR.MINOR`.
- A PATCH release corrects text only. It does not change schemas.
- A MINOR release MAY add optional fields, tool output fields, enumeration values, and error codes. Consumers MUST ignore unknown fields.
- Before 1.0, a MINOR release MAY contain breaking changes and MUST list each one in the changelog with a migration note.
- After 1.0, breaking changes ship only in a MAJOR release.
- A deprecated construct keeps working for the prior MINOR for at least six months after the release that deprecates it.
- `bookingSemantics` values beyond `request` are a breaking change and follow the rules above.
- Each release publishes a changelog in this document and a tagged release in the repository.
- Proposals, issues, and discussion happen in the GitHub issue tracker at the repository URL. The maintainer decides; decisions are recorded in the changelog with their issue links.
- This document's canonical URL is versioned. `/standards/open-service-profile/latest` redirects to the newest release.

## Implementation reports

If you implement OSP and find that the specification and reality disagree, open an issue describing the disagreement. Appendix D of the specification records known divergences in the maintainer's own implementation; reports from other implementers are the most useful input the specification can receive.

## Conduct

Be direct and specific. Discuss the specification, not the people proposing changes to it.
