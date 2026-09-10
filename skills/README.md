# Agent Skills for Open Service Profile

Two skills in the Agent Skills format (a `SKILL.md` with YAML frontmatter per directory), written for models rather than people.

- `open-service-profile/` is for an agent acting on behalf of a customer: find a business's manifest, read services, coverage, hours, and booking policy, call the OSP tools over MCP, and send a booking request under the consent rule. It never describes a request as a confirmed appointment.
- `open-service-profile-publish/` is for a developer or site owner: draft the profile with `npx open-service-profile init`, resolve every TODO without guessing, host the five files, meet Level 1, and verify with the public audit MCP.

Install both with the Agent Skills CLI:

    npx skills add buildmodus/open-service-profile

Every statement in the skills traces to the specification (`spec/v0.1.md`, cited by section) or to the CLI's `--help` output.
