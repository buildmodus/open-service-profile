// The CLI's fetch shell: a bounded read of one business site over a pinned connection.
//
// The owner runs this against their own site, so the posture is lighter than a public server's,
// but the address rules are the same ones the web tool applies:
//
//   - every hostname is resolved ONCE, every answer is judged against the address policy below
//     (private, loopback, link-local, unique-local, multicast, cloud metadata, IPv4-mapped
//     addresses judged by what they embed, and the translation ranges, IPv4-compatible and both
//     NAT64 prefixes, refused outright), and the socket then connects
//     to exactly the addresses that were judged. A DNS answer that changes between the check and
//     the connect cannot redirect the request.
//   - the host fence applies to the FIRST request of every document, not only to redirects: a
//     sitemap child on another host is never fetched, and a redirect may land only on the same
//     host or its www twin.
//   - every response has a byte cap; gzip sitemaps are decoded with a cap on the compressed and
//     the decoded size; the whole run has one time budget.
//
// The page plan (which URLs, how many) is the generator core's, so the CLI and the web tool
// fetch the same pages for the same site. The transport and the resolver are injectable so the
// tests run against a local server; there is no environment switch that loosens the policy.
import http from 'node:http'
import https from 'node:https'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { gunzipSync } from 'node:zlib'
import {
  cleanSiteUrls,
  isSameHostOrTwin,
  isSitemapIndex,
  PAGE_FETCH_CAP,
  pickPagesToFetch,
  robotsSitemaps,
  SITEMAP_URL_CAP,
  sitemapLocs,
} from './core/osp-generator/generate.js'
import { hrefs } from './core/osp-generator/html.js'

const HOME_TIMEOUT_MS = 10_000
const PAGE_TIMEOUT_MS = 8_000
const SITEMAP_TIMEOUT_MS = 6_000
const PAGE_MAX_BYTES = 2 * 1024 * 1024
const SITEMAP_MAX_BYTES = 1024 * 1024
const ROBOTS_MAX_BYTES = 64 * 1024
const MAX_SITEMAP_DOCUMENTS = 3
const MAX_REDIRECT_HOPS = 3
const USER_AGENT = 'open-service-profile-cli/0.1 (+https://www.theservicemarketingguys.com/standards/open-service-profile)'

export class CrawlError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

class TimeoutError extends Error {
  constructor() {
    super('timeout')
    this.name = 'TimeoutError'
  }
}

/* ---------- Address policy ---------- */

export function isBlockedIpv4(address) {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true
  const [a, b] = parts
  if (a === 0) return true // 0.0.0.0/8, this host
  if (a === 10) return true // private
  if (a === 127) return true // loopback
  if (a === 169 && b === 254) return true // link-local, including cloud metadata (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true // private
  if (a === 192 && b === 168) return true // private
  if (a === 100 && b >= 64 && b <= 127) return true // carrier-grade NAT
  if (a === 192 && b === 0) return true // IETF protocol assignments
  if (a >= 224) return true // multicast, reserved, broadcast
  return false
}

/** Eight 16-bit groups from any textual IPv6 form (compressed, zoned, bracketed, dotted tail), or null. */
export function parseIpv6(address) {
  let text = String(address ?? '').trim().toLowerCase().replace(/^\[|\]$/g, '').split('%')[0]
  if (!text || /[^0-9a-f:.]/.test(text)) return null
  // A dotted IPv4 tail becomes its two hex groups.
  const dotted = text.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/)
  if (dotted) {
    const octets = dotted[2].split('.').map(Number)
    if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet > 255)) return null
    text = `${dotted[1]}${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`
  }
  const halves = text.split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  if ([...head, ...tail].some((group) => group === '' || group.length > 4)) return null
  const missing = 8 - head.length - tail.length
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail].map((group) => parseInt(group, 16))
  return groups.length === 8 ? groups : null
}

function embeddedIpv4(high, low) {
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.')
}

export function isBlockedIpv6(address) {
  const g = parseIpv6(address)
  if (!g) return true
  const zero96 = g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0
  if (zero96 && g[6] === 0 && g[7] === 0) return true // :: unspecified
  if (zero96 && g[6] === 0 && g[7] === 1) return true // ::1 loopback
  if (zero96) return true // ::/96 IPv4-compatible (deprecated): a translation range, never a legitimate target
  if (g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0xffff) return isBlockedIpv4(embeddedIpv4(g[6], g[7])) // ::ffff:a.b.c.d IPv4-mapped
  if (g[0] === 0x64 && g[1] === 0xff9b && (g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0 || g[2] === 1)) return true // 64:ff9b::/96 NAT64 and 64:ff9b:1::/48 local-use NAT64: refused whatever they embed
  if ((g[0] & 0xfe00) === 0xfc00) return true // fc00::/7 unique local (cloud metadata fd00:ec2::254 included)
  if ((g[0] & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
  if ((g[0] & 0xffc0) === 0xfec0) return true // fec0::/10 site-local (deprecated)
  if ((g[0] & 0xff00) === 0xff00) return true // ff00::/8 multicast
  return false
}

export function isBlockedAddress(address, family) {
  return family === 6 ? isBlockedIpv6(address) : isBlockedIpv4(address)
}

/**
 * Resolves a hostname once (or judges a literal), applies the policy to every answer, and hands
 * back the addresses the connection must use. One private answer among several refuses the host.
 */
export async function resolvePublicAddresses(hostname, resolve = (host) => lookup(host, { all: true })) {
  const bare = hostname.replace(/^\[|\]$/g, '')
  const literal = isIP(bare)
  if (literal) return isBlockedAddress(bare, literal) ? { ok: false, code: 'blocked_host' } : { ok: true, addresses: [{ address: bare, family: literal }] }
  let records
  try {
    records = await resolve(bare)
  } catch {
    return { ok: false, code: 'unresolvable_host' }
  }
  if (!records || records.length === 0) return { ok: false, code: 'unresolvable_host' }
  if (records.some((record) => isBlockedAddress(record.address, record.family))) return { ok: false, code: 'blocked_host' }
  return { ok: true, addresses: records }
}

/** Normalizes the address the user typed; throws CrawlError for anything that is not a public http(s) site. */
export function normalizeSiteUrl(input) {
  let raw = String(input ?? '').trim()
  if (!raw) throw new CrawlError('invalid_url', 'A website address is required.')
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new CrawlError('invalid_url', `Not a URL: ${input}`)
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new CrawlError('invalid_url', 'Only http and https sites are read.')
  if (url.username || url.password) throw new CrawlError('invalid_url', 'Addresses with a user name or password are not read.')
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) throw new CrawlError('blocked_host', `${host} is a local name, not a public website.`)
  const family = isIP(host)
  if (family && isBlockedAddress(host, family)) throw new CrawlError('blocked_host', `${host} is a private or reserved address, not a public website.`)
  if (!host.includes('.') && family === 0) throw new CrawlError('invalid_url', `${host} has no top-level domain.`)
  return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`
}

/* ---------- The pinned transport ---------- */

function pinnedLookup(addresses) {
  return (_hostname, options, callback) => {
    const wanted = options.family === 4 || options.family === 6 ? addresses.filter((entry) => entry.family === options.family) : addresses
    const chosen = wanted.length > 0 ? wanted : addresses
    if (options.all) {
      callback(null, chosen)
      return
    }
    callback(null, chosen[0].address, chosen[0].family)
  }
}

/**
 * One request over Node's http/https client with a lookup that answers only the addresses the
 * policy judged, so the socket connects to those and nothing else. Host header and TLS
 * servername stay the original hostname. Never follows redirects itself. Resolves to
 * { status, headers, read(maxBytes), destroy() }; read resolves null when the cap is passed.
 */
export function pinnedTransport({ url, addresses, accept, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http
    const request = client.request({
      protocol: url.protocol,
      host: url.hostname,
      servername: url.protocol === 'https:' ? url.hostname : undefined,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      agent: false,
      lookup: pinnedLookup(addresses),
      headers: { Accept: accept, 'User-Agent': USER_AGENT, Host: url.host },
    })
    let settled = false
    const timer = setTimeout(() => { request.destroy(new TimeoutError()) }, timeoutMs)
    request.on('response', (response) => {
      settled = true
      let failure = null
      response.on('error', (error) => { failure = error })
      const headers = new Headers()
      for (const [key, value] of Object.entries(response.headers)) {
        if (typeof value === 'string') headers.set(key, value)
        else if (Array.isArray(value)) headers.set(key, value.join(', '))
      }
      const destroy = () => { clearTimeout(timer); if (!response.destroyed) response.destroy() }
      resolve({
        status: response.statusCode ?? 0,
        headers,
        destroy,
        read: (maxBytes) => new Promise((done, fail) => {
          if (failure) { fail(failure); return }
          const chunks = []
          let total = 0
          response.on('data', (chunk) => {
            total += chunk.length
            if (total > maxBytes) { destroy(); done(null); return }
            chunks.push(chunk)
          })
          response.on('end', () => { clearTimeout(timer); done(Buffer.concat(chunks)) })
          response.on('error', (error) => { clearTimeout(timer); fail(error) })
          response.on('close', () => { if (!response.complete) fail(failure ?? new TimeoutError()) })
        }),
      })
    })
    request.on('error', (error) => { clearTimeout(timer); if (!settled) reject(error) })
    request.end()
  })
}

/* ---------- One document ---------- */

/** Binds one await to the remaining deadline, so a resolver or transport that never settles cannot hold the run. */
function withinDeadline(work, ms) {
  if (ms <= 0) return Promise.reject(new TimeoutError())
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms)
    work.then((value) => { clearTimeout(timer); resolve(value) }, (error) => { clearTimeout(timer); reject(error) })
  })
}

/**
 * Fetches one document with the fence on the first request and on every redirect hop, the
 * address policy on every hostname, the byte cap, and bounded gzip decoding when asked.
 * Returns { ok: true, status, url, text } or { ok: false, code, status? }.
 */
export async function fetchDocument(url, { timeoutMs, maxBytes, accept, sameSiteAs, decodeGzip = false, resolveAddresses = resolvePublicAddresses, transport = pinnedTransport }) {
  let current
  try {
    current = new URL(url)
  } catch {
    return { ok: false, code: 'invalid_url' }
  }
  if (current.protocol !== 'https:' && current.protocol !== 'http:') return { ok: false, code: 'invalid_url' }
  const site = sameSiteAs ?? current.hostname
  if (!isSameHostOrTwin(current.hostname, site)) return { ok: false, code: 'redirect_offsite' }
  const deadline = Date.now() + timeoutMs
  const remaining = () => deadline - Date.now()
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
    // DNS counts against the same deadline as the hops and the body read, on
    // the first request and on every redirect hop alike.
    let resolved
    try {
      resolved = await withinDeadline(resolveAddresses(current.hostname), remaining())
    } catch (error) {
      return { ok: false, code: error?.name === 'TimeoutError' ? 'timeout' : 'unresolvable_host' }
    }
    if (!resolved.ok) return { ok: false, code: resolved.code }
    if (remaining() <= 0) return { ok: false, code: 'timeout' }
    let response
    try {
      response = await withinDeadline(transport({ url: current, addresses: resolved.addresses, accept, timeoutMs: remaining() }), remaining())
    } catch (error) {
      return { ok: false, code: error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'timeout' : 'fetch_failed' }
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      response.destroy()
      if (!location) return { ok: false, code: 'fetch_failed', status: response.status }
      let next
      try {
        next = new URL(location, current)
      } catch {
        return { ok: false, code: 'fetch_failed', status: response.status }
      }
      if (next.protocol !== 'https:' && next.protocol !== 'http:') return { ok: false, code: 'blocked_host', status: response.status }
      if (next.username || next.password) return { ok: false, code: 'blocked_host', status: response.status }
      if (!isSameHostOrTwin(next.hostname, site)) return { ok: false, code: 'redirect_offsite', status: response.status }
      next.hash = ''
      current = next
      continue
    }
    const declared = Number(response.headers.get('content-length') || '0')
    if (declared > maxBytes) {
      response.destroy()
      return { ok: false, code: 'too_large', status: response.status }
    }
    let body
    try {
      body = await response.read(maxBytes)
    } catch (error) {
      response.destroy()
      return { ok: false, code: error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'timeout' : 'fetch_failed', status: response.status }
    }
    if (body === null) return { ok: false, code: 'too_large', status: response.status }
    let text
    if (decodeGzip) {
      const gzipped = /\bgzip\b/i.test(response.headers.get('content-encoding') || '') || /\.gz$/i.test(current.pathname) || (body.length > 2 && body[0] === 0x1f && body[1] === 0x8b)
      if (!gzipped) text = body.toString('utf8')
      else {
        try {
          // The compressed size was capped by the reader; maxOutputLength caps the decoded size.
          text = gunzipSync(body, { maxOutputLength: maxBytes }).toString('utf8')
        } catch (error) {
          const tooBig = error instanceof RangeError || (error instanceof Error && /maxOutputLength|buffer/i.test(error.message))
          return { ok: false, code: tooBig ? 'too_large' : 'fetch_failed', status: response.status }
        }
      }
    } else {
      text = body.toString('utf8')
    }
    return { ok: true, status: response.status, url: current.toString(), text }
  }
  return { ok: false, code: 'too_many_redirects' }
}

const FAILURE_MESSAGES = {
  invalid_url: 'That does not look like a public website address.',
  blocked_host: 'That address points at a private or internal network, which this tool does not read.',
  unresolvable_host: 'That host name did not resolve. Check the spelling and try again.',
  fetch_failed: 'The home page did not answer with a readable page on that host or its www twin.',
  too_large: 'The home page is larger than this tool reads.',
  redirect_offsite: 'The home page redirects to a different site. Run the tool against the address it redirects to.',
  too_many_redirects: 'The home page redirected too many times.',
  timeout: 'The site took too long to answer. Try again in a minute.',
}

/* ---------- The crawl ---------- */

/**
 * Crawl one site into the generator core's input: home first, then the pages the core's plan
 * picks, inside the cap. Throws CrawlError when the home page cannot be read. `transport` and
 * `resolveAddresses` are the test seams; production uses the pinned transport and real DNS.
 */
export async function crawlSite(rawUrl, { resolveAddresses = resolvePublicAddresses, transport = pinnedTransport, now = new Date(), maxPages = PAGE_FETCH_CAP, budgetMs = 40_000, log = () => {} } = {}) {
  const normalized = normalizeSiteUrl(rawUrl)
  const startedAt = Date.now()
  const remaining = () => Math.max(0, budgetMs - (Date.now() - startedAt))
  const get = (url, timeoutMs, maxBytes, accept, sameSiteAs, decodeGzip = false) => {
    log(`GET ${url}`)
    return fetchDocument(url, { timeoutMs: Math.min(timeoutMs, remaining()), maxBytes, accept, sameSiteAs, decodeGzip, resolveAddresses, transport })
  }

  const requested = new URL(normalized)
  const hosts = [requested.hostname]
  if (!isIP(requested.hostname.replace(/^\[|\]$/g, ''))) hosts.push(requested.hostname.startsWith('www.') ? requested.hostname.slice(4) : `www.${requested.hostname}`)
  let origin = requested.origin
  let home = null
  let failure = null
  for (const host of hosts) {
    const candidate = `${requested.protocol}//${host}${requested.port ? `:${requested.port}` : ''}`
    const response = await get(`${candidate}/`, HOME_TIMEOUT_MS, PAGE_MAX_BYTES, 'text/html,application/xhtml+xml', host)
    if (response.ok && response.status < 400) {
      home = response
      origin = new URL(response.url).origin
      break
    }
    failure = response.ok ? { code: 'fetch_failed', status: response.status } : response
    // A policy failure on the named host is final; only connectivity earns the twin a try.
    if (['invalid_url', 'blocked_host', 'redirect_offsite', 'too_large'].includes(failure.code)) break
  }
  if (!home) throw new CrawlError(failure?.code ?? 'fetch_failed', FAILURE_MESSAGES[failure?.code] ?? FAILURE_MESSAGES.fetch_failed)
  const site = new URL(origin).hostname

  // Every sitemap URL, from robots.txt or a sitemap index, passes the host fence before it is
  // queued; fetchDocument enforces it again on the request itself.
  const onSite = (url) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
      return isSameHostOrTwin(parsed.hostname, site) ? parsed.toString() : null
    } catch {
      return null
    }
  }
  const sitemapCandidates = []
  const robots = await get(`${origin}/robots.txt`, SITEMAP_TIMEOUT_MS, ROBOTS_MAX_BYTES, 'text/plain', site)
  if (robots.ok && robots.status === 200) {
    for (const url of robotsSitemaps(robots.text)) {
      const allowed = onSite(url)
      if (allowed) sitemapCandidates.push(allowed)
    }
  }
  if (sitemapCandidates.length === 0) sitemapCandidates.push(`${origin}/sitemap.xml`)

  const locs = []
  let documents = 0
  let complete = true
  const queue = [...sitemapCandidates]
  while (queue.length > 0 && documents < MAX_SITEMAP_DOCUMENTS && remaining() > 0) {
    const url = queue.shift()
    const response = await get(url, SITEMAP_TIMEOUT_MS, SITEMAP_MAX_BYTES, 'application/xml,text/xml', site, true)
    documents += 1
    if (!response.ok || response.status !== 200) {
      if (!response.ok && response.code === 'timeout') complete = false
      continue
    }
    if (isSitemapIndex(response.text)) {
      const children = sitemapLocs(response.text).map(onSite).filter(Boolean)
      queue.push(...children.slice(0, MAX_SITEMAP_DOCUMENTS))
    } else {
      locs.push(...sitemapLocs(response.text))
    }
    if (locs.length >= SITEMAP_URL_CAP * 2) break
  }
  if (queue.length > 0) complete = false
  let sitemapUrls = cleanSiteUrls(locs, origin)
  const sitemapTruncated = sitemapUrls.length > SITEMAP_URL_CAP
  if (sitemapTruncated) sitemapUrls = sitemapUrls.slice(0, SITEMAP_URL_CAP)
  if (sitemapUrls.length === 0) {
    sitemapUrls = cleanSiteUrls(hrefs(home.text).map((href) => { try { return new URL(href, `${origin}/`).toString() } catch { return '' } }).filter(Boolean), origin).slice(0, SITEMAP_URL_CAP)
  }

  const picked = pickPagesToFetch(sitemapUrls, origin, maxPages)
  const pages = [{ url: `${origin}/`, kind: 'home', html: home.text, status: home.status, fetched: true }]
  for (const entry of picked.filter((item) => item.kind !== 'home')) {
    if (remaining() <= 0) {
      complete = false
      pages.push({ url: entry.url, kind: entry.kind, fetched: false })
      continue
    }
    const response = await get(entry.url, PAGE_TIMEOUT_MS, PAGE_MAX_BYTES, 'text/html,application/xhtml+xml', site)
    if (response.ok && response.status < 400) pages.push({ url: entry.url, kind: entry.kind, html: response.text, status: response.status, fetched: true })
    else {
      if (!response.ok && (response.code === 'timeout' || response.code === 'fetch_failed')) complete = false
      pages.push({ url: entry.url, kind: entry.kind, fetched: false, ...(response.ok ? { status: response.status } : {}) })
    }
  }
  return { origin, pages, sitemapUrls, sitemapTruncated, now, complete }
}
