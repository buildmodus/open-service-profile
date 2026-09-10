# OSP v0.1 consumer examples

The calls below follow the specification's own examples (sections 6.2 to 6.7). Hosts,
names, and numbers are fictional. MCP tool inputs and outputs are JSON objects.

## Discovery

```
GET https://example.com/.well-known/open-service-profile
200 OK
Content-Type: application/json
Access-Control-Allow-Origin: *
```

Read `specVersion`, `business.serviceModel`, `bookingPolicy`, and `interfaces.mcp.url`.
A 404 here means no profile is published; use the page JSON-LD and the phone instead.

## get_business_info

Input: `{}`

Output (abridged):

```json
{
  "name": "Coastal Comfort Heating & Air",
  "trades": ["HVACBusiness"],
  "serviceModel": "on_site",
  "phone": "+1 386 555 0142",
  "timeZone": "America/New_York",
  "locations": [
    { "id": "daytona", "name": "Daytona Beach", "isPrimary": true, "address": {}, "hours": {} }
  ],
  "booking": {
    "tool": "request_service_booking",
    "mode": "request",
    "userApprovalRequired": true,
    "businessConfirmationRequired": true,
    "minimumDaysAhead": 1,
    "weekendRequests": "not_allowed",
    "windows": [
      { "id": "Morning", "start": "08:00", "end": "12:00" },
      { "id": "Afternoon", "start": "12:00", "end": "17:00" }
    ],
    "contactMethods": ["call", "text", "email"],
    "emergencyAvailable": true,
    "afterHoursNote": "Emergency line answered around the clock. After-hours dispatch fee stated when you call."
  },
  "canonicalSiteUrl": "https://example.com"
}
```

`booking.mode` is `request`. The `windows` carry `start` and `end`, so a customer who
says "around 10" maps to `Morning` by clock time.

## list_services

Input: `{}` or `{ "location": "daytona" }`

```json
{
  "services": [
    { "slug": "ac-repair", "name": "AC repair", "category": "cooling", "url": "https://example.com/services/cooling/ac-repair", "bookable": true, "pricePresentation": null }
  ],
  "canonicalSiteUrl": "https://example.com"
}
```

`pricePresentation: null` means the business quotes on request. Say that; do not estimate.

## check_coverage

Input: `{ "zip": "33844" }`

Covered by ZIP list:

```json
{ "covered": true, "areaName": "Haines City", "areaUrl": "https://example.com/service-areas/haines-city", "matchedBy": "postalCodes", "canonicalSiteUrl": "https://example.com" }
```

Not evaluated (radius published, server did not compute it). Say "could not confirm",
not "not covered":

```json
{ "covered": false, "matchedBy": "unknown", "phone": "+1 863 555 0100", "message": "This ZIP is not in the published ZIP list and radius coverage was not evaluated. Confirm with the business.", "canonicalSiteUrl": "https://example.com" }
```

Not covered:

```json
{ "covered": false, "matchedBy": "none", "phone": "+1 863 555 0100", "message": "This ZIP is outside the published service area. The business may still help by arrangement; call to ask.", "canonicalSiteUrl": "https://example.com" }
```

Either way the customer may still send a request; coverage is not a gate.

## check_availability

Input: `{ "serviceSlug": "ac-repair", "from": "2026-09-08", "to": "2026-09-14", "location": "daytona" }`

```json
{
  "source": "policy",
  "sourceNote": "Derived from published hours and booking policy, not from a live calendar. A requestable window may be full; the business confirms.",
  "serviceSlug": "ac-repair",
  "timeZone": "America/New_York",
  "windowDefinitions": [
    { "id": "Morning", "start": "08:00", "end": "12:00" },
    { "id": "Afternoon", "start": "12:00", "end": "17:00" },
    { "id": "Evening", "start": "17:00", "end": "20:00" }
  ],
  "days": [
    { "date": "2026-09-08", "status": "open", "windows": [ { "id": "Morning", "status": "requestable" }, { "id": "Afternoon", "status": "requestable" }, { "id": "Evening", "status": "closed" } ] },
    { "date": "2026-09-12", "status": "closed", "reason": "weekend_requests_not_allowed", "windows": [] }
  ],
  "canonicalSiteUrl": "https://example.com"
}
```

Wording for the customer: "Coastal Comfort accepts requests for the Morning and
Afternoon windows on September 8. They do not take weekend requests. This comes from
their published policy, not a live calendar, so they confirm whether they have room."

## request_service_booking

Only after the customer has seen and approved the service, date, window, and contact
details (7.1).

Input:

```json
{
  "requestId": "6f1d2c1e-6b9a-4e3e-9c0b-2a6f0e7f1a11",
  "confirmed": true,
  "serviceSlug": "ac-repair",
  "preferredDate": "2026-09-09",
  "preferredTime": "Morning",
  "location": "daytona",
  "customer": {
    "name": "Jordan Ellis",
    "phone": "+1 386 555 0199",
    "address": "44 Palm Ct",
    "city": "Ormond Beach",
    "state": "FL",
    "zip": "32174",
    "notes": "Unit runs but no cold air since Sunday.",
    "contactMethod": "text",
    "contactAuthorized": true
  },
  "agent": { "channel": "mcp", "name": "Example Assistant", "version": "2.3" }
}
```

Success:

```json
{
  "success": true,
  "requestId": "6f1d2c1e-6b9a-4e3e-9c0b-2a6f0e7f1a11",
  "duplicate": false,
  "status": "pending_business_confirmation",
  "appointmentConfirmed": false,
  "service": { "slug": "ac-repair", "name": "AC repair", "url": "https://example.com/services/cooling/ac-repair" },
  "preferredDate": "2026-09-09",
  "preferredTime": "Morning",
  "location": { "id": "daytona", "name": "Daytona Beach" },
  "coverageVerified": true,
  "schedulingRecordCreated": false,
  "confirmationNote": "Our office texts within one business hour to confirm the arrival window.",
  "message": "The service request was received. The business must still confirm the appointment and exact arrival time.",
  "canonicalSiteUrl": "https://example.com"
}
```

Wording for the customer: "Your request for AC repair on September 9, morning window,
was received. Coastal Comfort will text you within one business hour to confirm the
appointment and arrival window. Nothing is booked until they confirm."

Error, date too soon:

```json
{ "error": "date_too_soon", "message": "The earliest date this business accepts requests for is tomorrow.", "minimumDaysAhead": 1 }
```

Ask the customer for a later date, then send a fresh request with a new `requestId`.

Retry after `rate_limited` or a dropped connection: resend the identical body with the
same `requestId`. A `duplicate: true` result means the first attempt landed; tell the
customer one request exists.
