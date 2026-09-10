// Optional Google listing lookup for the CLI: one Places API (New) details call with the
// owner's own key (GOOGLE_PLACES_API_KEY). Facts only; ratings and review counts are never
// requested, because the standard forbids them in the manifest.
const FIELDS = [
  'id', 'displayName', 'formattedAddress', 'addressComponents', 'nationalPhoneNumber', 'internationalPhoneNumber',
  'websiteUri', 'primaryType', 'primaryTypeDisplayName', 'types', 'location', 'regularOpeningHours', 'googleMapsUri',
]

const str = (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined)

/** Places API (New) place record to the generator core's PlacesListing shape. */
export function toPlacesListing(record) {
  if (!record || typeof record.id !== 'string') return null
  const address = {}
  let streetNumber
  let route
  for (const component of record.addressComponents || []) {
    const types = Array.isArray(component.types) ? component.types : []
    if (types.includes('street_number')) streetNumber = str(component.longText)
    if (types.includes('route')) route = str(component.longText)
    if (types.includes('locality')) address.city = str(component.longText)
    if (types.includes('administrative_area_level_1')) address.region = str(component.shortText)
    if (types.includes('postal_code')) address.postalCode = str(component.longText)
    if (types.includes('country')) address.country = str(component.shortText)
  }
  if (streetNumber || route) address.street = [streetNumber, route].filter(Boolean).join(' ')
  const periods = Array.isArray(record.regularOpeningHours?.periods)
    ? record.regularOpeningHours.periods.filter((period) => period?.open && typeof period.open.day === 'number' && typeof period.open.hour === 'number' && typeof period.open.minute === 'number')
    : undefined
  const latitude = record.location?.latitude
  const longitude = record.location?.longitude
  return {
    placeId: record.id,
    displayName: str(record.displayName?.text),
    formattedAddress: str(record.formattedAddress),
    address,
    nationalPhone: str(record.nationalPhoneNumber),
    internationalPhone: str(record.internationalPhoneNumber),
    website: str(record.websiteUri),
    primaryType: str(record.primaryType),
    primaryTypeDisplayName: str(record.primaryTypeDisplayName?.text),
    types: Array.isArray(record.types) ? record.types.filter((type) => typeof type === 'string') : undefined,
    periods,
    ...(typeof latitude === 'number' && typeof longitude === 'number' ? { latitude, longitude } : {}),
    googleMapsUri: str(record.googleMapsUri),
  }
}

export async function fetchPlaceListing(placeId, { apiKey = process.env.GOOGLE_PLACES_API_KEY, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY is not set. The listing lookup needs your own Places API key; the site-only draft runs without it.')
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(placeId)) throw new Error('That does not look like a Google place id.')
  const response = await fetchImpl(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': FIELDS.join(',') },
    signal: AbortSignal.timeout(4000),
  })
  if (!response.ok) throw new Error(`The Places API answered ${response.status} for that place id.`)
  return toPlacesListing(await response.json())
}
