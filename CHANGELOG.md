# Changelog

## 0.1.0-draft.3, 2026-09-07

Corrections from an outside review checked against sources. No new tools.

- Prior-art table rewritten: schema.org `Service` already carries `areaServed`, `hoursAvailable`, and `availableChannel`, and `ReservationPending` expresses an unconfirmed request; Reserve with Google supports asynchronous merchant confirmation but requires real-time slot inventory; UCP added lodging and food in 2026; Local Service MCP (Lokuli / BookingClaw) added as the marketplace counterpart; the MCP server card convention is still a working-group draft.
- Section 4.3 labels the server card shape an OSP convention, to be replaced by the MCP Server Card format when published.
- Section 2.1 states OSP claims correctness for agents, not search visibility, subject to the published interoperability experiment.
- `check_coverage`: `matchedBy: "unknown"` distinguishes not evaluated (radius published, not evaluated) from not covered (`none`); six-step evaluation order.
- `check_availability`: each window carries `status` `requestable`, `available`, or `closed`; policy mode never emits `available`; agents describe requestable windows as accepting requests. Terminology gains requestable and available windows.
- Level 1 shrinks to the manifest plus one business node with one `ScheduleAction`; OfferCatalog and per-service actions are SHOULD.
- Level 2 core is `get_business_info`, `list_services`, `check_coverage`; `get_reviews` and the server card are SHOULD; `interfaces.mcp.serverCardUrl` is optional in the manifest schema.

## 0.1.0-draft.2, 2026-09-07

Corrections from cross-family review of the first draft. No new tools.

- Every tool output schema is `oneOf` the success shape and an error shape; the error shape constrains `error` to that tool's codes, `date_too_soon` requires `minimumDaysAhead`, and the location errors require `locations`.
- `invalid_input` with `fields` added to every tool for schema-invalid or malformed input; `booking_request_failed` is downstream failure only. Validation failures are tool results, not transport errors.
- `check_coverage` gains an evaluation order: ZIP list, location ZIP, optional advisory radius match, `in_shop` without coverage answers covered, otherwise `none`. `matchedBy` is required and gains `in_shop` and `none`. ZIP centroid source is implementation-defined and deferred.
- Policy-mode availability uses default window boundaries (Morning 08:00 to 12:00, Afternoon 12:00 to 17:00, Evening 17:00 to 20:00) when a fixed window publishes none; a window is offered only if it overlaps open hours.
- `customer.vehicle` is ignored, never rejected, when the service model does not accept it. `vehicleDetailsAccepted` is allowed only when `serviceModel` is `both`.
- Manifest schema: `interfaces.mcp` required when `conformance.level` is 2 or 3; exactly one primary location via `contains`; `afterHoursNote` implies `emergencyAvailable` via `if`/`then`; `CalendarDate` carries `format: date` with a real-date rule; `timeZone` pattern; `region` is a USPS code enum; hours exceptions are two closed shapes.
- Tool schemas: `Window` mirrors the manifest `Window`; `get_business_info.booking.emergencyAvailable` required; `get_reviews` requires `note` when no aggregate.
- Section 4.3 gains a normative minimal MCP server card shape. Appendix C.4 adds a complete Level 1 JSON-LD example covering all five services of the C.1 manifest.
- Section 9 versioning rule resolved: before 1.0 a MINOR release may carry breaking changes, each listed in the changelog with a migration note; CONTRIBUTING mirrors section 9 word for word.
- Appendix D corrected: four read tools live, `check_availability` absent; `ReservationConfirmed` is outside v0.1.
- Repository: validator supports `contains`, `exclusiveMinimum`, real calendar dates, stricter email and URI checks, and file arguments; `package.json` license is `(MIT AND CC-BY-4.0)`; CITATION.cff lists both licenses.

## 0.1.0-draft, 2026-09-07

Initial public draft of Open Service Profile: the well-known manifest, six tools (`get_business_info`, `list_services`, `check_coverage`, `check_availability`, `get_reviews`, `request_service_booking`), consent and provenance rules, three conformance levels, JSON Schemas, three example manifests, and a mapping to schema.org and UCP.
