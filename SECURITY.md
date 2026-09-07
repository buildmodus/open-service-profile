# Security

Open Service Profile is a specification with reference schemas and examples. It runs no code on your behalf, but a defect in its text or schemas can cause harm to implementers and to the customers their agents serve. Examples: a contract that lets an agent present a booking request as a confirmed appointment, a field that invites publication of personal data, or a schema that accepts a value the specification forbids.

## Reporting

Email team@easyserve.solutions with the subject line "OSP security". Include the specification section or schema file, the harm you see, and, when possible, a corrected reading.

You will receive an acknowledgement within 5 business days. Confirmed problems are fixed in a versioned release and recorded in `CHANGELOG.md`, with credit if you want it.

There is no bounty program.

## Scope

In scope: the specification text, the JSON Schemas, the example manifests, and the scripts in this repository.

Out of scope: individual implementations, including the maintainer's own client sites. Report those to the site operator.
