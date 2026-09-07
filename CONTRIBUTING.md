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

- Releases are versioned. The specification text at a versioned URL never changes after release, apart from typographical corrections that do not alter meaning.
- Before 1.0, breaking changes land only in a new minor version (0.2, 0.3). Non-breaking additions may land in a patch.
- After 1.0, breaking changes land only in a new major version.
- Every release has an entry in `CHANGELOG.md` and a versioned URL on the maintainer's site.
- A field or tool is deprecated in one release before it is removed in a later one.

## Implementation reports

If you implement OSP and find that the specification and reality disagree, open an issue describing the disagreement. Appendix D of the specification records known divergences in the maintainer's own implementation; reports from other implementers are the most useful input the specification can receive.

## Conduct

Be direct and specific. Discuss the specification, not the people proposing changes to it.
