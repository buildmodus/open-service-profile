// Tests for the generator CLI, on Node's built-in runner: node --test tests/
//
// Fixture sites are static files under tests/fixtures/, served from a local http server started
// here. The crawl shell refuses loopback addresses by design and has no switch that loosens
// that, so the fixture runs inject the resolver seam: hostnames such as palmettoair.test are
// "resolved" to 127.0.0.1 and the REAL pinned transport connects there, which also proves the
// socket uses the judged address and keeps the original Host header. The refusals themselves
// are tested with the real resolver.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import http from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, extname, join, resolve } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'
import { main } from '../bin/open-service-profile.mjs'
import { generateOpenServiceProfile } from '../src/core/osp-generator/generate.js'
import { crawlSite, CrawlError, fetchDocument, isBlockedIpv4, isBlockedIpv6, normalizeSiteUrl, parseIpv6, resolvePublicAddresses } from '../src/crawl.mjs'
import { validateManifest } from '../src/validate.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const bin = join(root, 'bin', 'open-service-profile.mjs')
const fixtures = join(here, 'fixtures')
const ANSWER_FLAGS = ['--min-days-ahead', '1', '--weekend-requests', 'saturday_only', '--emergency', 'no', '--contact-methods', 'call,email', '--time-zone', 'America/New_York', '--ai-read', 'yes', '--ai-train', 'no']
const ANSWERS = { minimumDaysAhead: 1, weekendRequests: 'saturday_only', emergencyAvailable: false, contactMethods: ['call', 'email'], timeZone: 'America/New_York', aiRead: true, aiTrain: false }
const BOOKING = { minimumDaysAhead: 1, weekendRequests: 'saturday_only', emergencyAvailable: false, contactMethods: ['call', 'email'] }
const TYPES = { '.html': 'text/html; charset=utf-8', '.xml': 'application/xml', '.txt': 'text/plain', '.gz': 'application/gzip' }
const EM_DASH = String.fromCharCode(0x2014)

/** Every hostname resolves to the fixture server; the pinned transport then connects there. */
const toLoopback = async () => ({ ok: true, addresses: [{ address: '127.0.0.1', family: 4 }] })

/**
 * Serves one fixture directory, plus `extra` (path to { body, type, status, headers }) for
 * documents a test composes. `__ORIGIN__` in files becomes the origin the request named (its
 * Host header), so the same server answers as any hostname a test points at it.
 */
function serve(fixture, extra = {}) {
  const dir = fixture ? join(fixtures, fixture) : null
  const requests = []
  const server = http.createServer((request, response) => {
    const origin = `http://${request.headers.host}`
    const path = new URL(request.url, origin).pathname
    requests.push({ host: request.headers.host, path })
    if (extra[path]) {
      const entry = extra[path]
      response.writeHead(entry.status ?? 200, { 'content-type': entry.type ?? 'text/plain', ...(entry.headers ?? {}) })
      response.end(typeof entry.body === 'string' ? entry.body.replaceAll('__ORIGIN__', origin) : entry.body)
      return
    }
    const candidates = dir && path !== '/' ? [path.slice(1), `${path.slice(1)}.html`, `${path.slice(1)}/index.html`] : dir ? ['index.html'] : []
    const file = candidates.map((candidate) => join(dir, candidate)).find((candidate) => existsSync(candidate) && statSync(candidate).isFile())
    if (!file) {
      response.writeHead(404, { 'content-type': 'text/plain' })
      response.end('not found')
      return
    }
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    response.end(readFileSync(file, 'utf8').replaceAll('__ORIGIN__', origin))
  })
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done({ server, port: server.address().port, requests, originFor: (host) => `http://${host}:${server.address().port}` })))
}

/**
 * The local server speaks http, and the standard's URL fields require https. Validation is part
 * of what the core tests prove, so the crawl output (a plain object) is re-homed onto an https
 * origin before generation; the crawl itself is tested as is.
 */
function onHttps(crawl, origin, host) {
  const { now, ...rest } = crawl
  return { ...JSON.parse(JSON.stringify(rest).replaceAll(origin, `https://${host}`)), now }
}

function run(args, env = {}) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [bin, ...args], { env: { ...process.env, ...env }, cwd: root })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('close', (code) => done({ code, stdout, stderr }))
  })
}

/** main() in-process with the resolver seam, capturing stdout and stderr. */
async function runMain(args) {
  let stdout = ''
  let stderr = ''
  const io = {
    stdout: { write: (chunk) => { stdout += chunk } },
    stderr: { write: (chunk) => { stderr += chunk } },
    stdin: { isTTY: false },
    env: {},
    crawlOptions: { resolveAddresses: toLoopback, now: new Date('2026-09-10T12:00:00Z') },
  }
  const code = await main(args, io)
  return { code, stdout, stderr }
}

describe('complete HVAC fixture', () => {
  let site
  let origin
  let out
  before(async () => {
    site = await serve('complete-hvac')
    origin = site.originFor('palmettoair.test')
    out = mkdtempSync(join(tmpdir(), 'osp-cli-'))
  })
  after(() => {
    site.server.close()
    rmSync(out, { recursive: true, force: true })
  })

  it('crawls over the pinned connection with the original Host header, and without answers claims no level and invents nothing', async () => {
    const crawl = await crawlSite(origin, { resolveAddresses: toLoopback, now: new Date('2026-09-10T12:00:00Z') })
    assert.equal(crawl.origin, origin)
    assert.equal(crawl.complete, true)
    assert.ok(site.requests.every((entry) => entry.host === `palmettoair.test:${site.port}`))
    assert.deepEqual(crawl.pages.map((page) => page.kind), ['home', 'contact', 'schedule', 'service', 'service'])
    const unanswered = generateOpenServiceProfile({ ...onHttps(crawl, origin, 'palmettoair.example'), validate: validateManifest })
    assert.equal(unanswered.level, null)
    assert.equal(unanswered.manifest.conformance, undefined)
    // Window ids only, no clock times; FL spans two zones so the zone is asked, not guessed.
    assert.deepEqual(unanswered.manifest.bookingPolicy, { windows: [{ id: 'Morning' }, { id: 'Afternoon' }, { id: 'Evening' }] })
    assert.equal(unanswered.manifest.business.timeZone, undefined)
    assert.deepEqual(unanswered.todos.filter((todo) => todo.kind === 'missing').map((todo) => todo.field), ['business.timeZone', 'bookingPolicy.minimumDaysAhead', 'bookingPolicy.weekendRequests', 'bookingPolicy.emergencyAvailable', 'bookingPolicy.contactMethods'])
    assert.match(unanswered.files.llmsTxt, /# TODO: bookingPolicy\.contactMethods: your website does not state this; answer it in the form \(or pass --contact-methods\) and re-run\./)
    // The home page's own JSON-LD passes the Level 1 check; the robots section is all comments.
    assert.deepEqual({ checked: unanswered.jsonLd.checked, passes: unanswered.jsonLd.passes }, { checked: true, passes: true })
    assert.ok(unanswered.files.robotsSection.split('\n').filter((line) => line.trim()).every((line) => line.startsWith('#')))
    assert.match(unanswered.files.robotsSection, /# TODO: robots\.aiRead/)
  })

  it('reaches Level 1 with the owner\'s answers and validates through the shared core validator', async () => {
    const crawl = await crawlSite(origin, { resolveAddresses: toLoopback, now: new Date('2026-09-10T12:00:00Z') })
    const result = generateOpenServiceProfile({ ...onHttps(crawl, origin, 'palmettoair.example'), answers: ANSWERS, validate: validateManifest })
    assert.equal(result.level, 1)
    assert.deepEqual(result.validation, [])
    assert.deepEqual(validateManifest(result.manifest), [])
    assert.deepEqual(result.manifest.conformance, { level: 1 })
    assert.equal(result.manifest.business.displayName, 'Palmetto Air & Heat')
    assert.deepEqual(result.manifest.business.trades, ['HVACBusiness'])
    assert.equal(result.manifest.business.serviceModel, 'on_site')
    assert.equal(result.manifest.business.timeZone, 'America/New_York')
    assert.equal(result.manifest.business.phone, '+13865550142')
    assert.deepEqual(result.manifest.coverage, { postalCodes: ['32114', '32117', '32174'], areaNames: ['Ormond Beach'] })
    assert.deepEqual(result.manifest.services.map((service) => service.slug), ['ac-repair', 'heating-repair'])
    assert.deepEqual(result.manifest.bookingPolicy, { windows: [{ id: 'Morning' }, { id: 'Afternoon' }, { id: 'Evening' }], ...BOOKING })
    assert.deepEqual(result.manifest.interfaces, { schedulePageUrl: 'https://palmettoair.example/schedule' })
    // The fixture carries an aggregateRating; the manifest must not.
    assert.doesNotMatch(JSON.stringify(result.manifest), /aggregateRating|ratingValue|reviewCount|4\.9/)
    assert.deepEqual(result.ratingsIgnored.map((entry) => entry.path), ['$.aggregateRating', '$.aggregateRating.ratingValue', '$.aggregateRating.reviewCount'])
    assert.deepEqual(result.todos.filter((todo) => todo.kind === 'missing'), [])
    assert.ok(result.files.llmsTxt.startsWith('# Palmetto Air & Heat\n'))
    assert.doesNotMatch(result.files.llmsTxt, /# TODO:|Schedule Service|years in business|confirms/)
    assert.match(result.files.llmsFullTxt, /## How these facts were produced/)
    // robots: the two answers become directives; Content-Signal repeats them.
    assert.match(result.files.robotsSection, /User-agent: ChatGPT-User\n(?:User-agent: [^\n]+\n)*Allow: \//)
    assert.match(result.files.robotsSection, /User-agent: GPTBot\n(?:User-agent: [^\n]+\n)*Disallow: \//)
    assert.match(result.files.robotsSection, /Content-Signal: ai-train=no, ai-input=yes/)
    // The fifth file: the Level 1 JSON-LD snippet.
    const snippet = result.files.jsonLd.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/)?.[1]
    const node = JSON.parse(snippet ?? '{}')
    assert.equal(node['@type'], 'HVACBusiness')
    assert.equal(node.potentialAction['@type'], 'ScheduleAction')
    assert.equal(node.potentialAction.result.reservationStatus, 'https://schema.org/ReservationPending')
    for (const text of Object.values(result.files)) assert.ok(!text.includes(EM_DASH))
  })

  it('the bin writes the five files; on a plain-http origin the only validation failures are the https rule', async () => {
    const { code, stdout, stderr } = await runMain(['init', origin, '--out', out, ...ANSWER_FLAGS])
    assert.equal(code, 0, stderr)
    assert.deepEqual(readdirSync(out).sort(), ['jsonld.html', 'llms-full.txt', 'llms.txt', 'open-service-profile.json', 'robots-ai-section.txt'])
    const manifest = JSON.parse(readFileSync(join(out, 'open-service-profile.json'), 'utf8'))
    assert.equal(manifest.business.displayName, 'Palmetto Air & Heat')
    assert.doesNotMatch(stdout, /Missing facts|Not answered/)
    assert.match(stdout, /claims no level yet/)
    const errors = validateManifest(manifest)
    assert.ok(errors.length > 0)
    assert.ok(errors.every((line) => /\^https:\/\//.test(line)), errors.join('\n'))
    assert.match(stdout, /Rating and review-count fields/)
    assert.match(readFileSync(join(out, 'robots-ai-section.txt'), 'utf8'), /User-agent: GPTBot\n(?:User-agent: [^\n]+\n)*Disallow: \//)
    assert.match(readFileSync(join(out, 'jsonld.html'), 'utf8'), /"@type": "ScheduleAction"/)
  })

  it('--json prints the result to stdout and writes nothing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'osp-json-'))
    const { code, stdout } = await runMain(['init', origin, '--json', '--out', dir, ...ANSWER_FLAGS])
    assert.equal(code, 0)
    const result = JSON.parse(stdout)
    assert.equal(result.manifest.business.phone, '+13865550142')
    assert.deepEqual(result.manifest.bookingPolicy.contactMethods, ['call', 'email'])
    assert.equal(result.todos.filter((todo) => todo.kind === 'missing').length, 0)
    assert.deepEqual(readdirSync(dir), [])
    rmSync(dir, { recursive: true, force: true })
  })

  it('without flags and without a terminal the bin leaves the answer TODO lines and rejects bad flag values', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'osp-noflags-'))
    const { code, stdout } = await runMain(['init', origin, '--out', dir])
    assert.equal(code, 0)
    assert.match(stdout, /Not answered/)
    assert.match(stdout, /# TODO: bookingPolicy\.minimumDaysAhead: your website does not state this; answer it in the form \(or pass --min-days-ahead\) and re-run\./)
    assert.match(stdout, /# TODO: business\.timeZone: your website does not state this; answer it in the form \(or pass --time-zone\) and re-run\./)
    assert.doesNotMatch(stdout, /Missing facts/)
    rmSync(dir, { recursive: true, force: true })
    for (const [flag, value, message] of [['--min-days-ahead', '90', /0 to 60/], ['--service-model', 'mobile', /on_site, in_shop, or both/], ['--time-zone', 'EST', /IANA zone/], ['--ai-read', 'maybe', /yes or no/]]) {
      const bad = await runMain(['init', origin, flag, value])
      assert.equal(bad.code, 2, flag)
      assert.match(bad.stderr, message)
    }
  })
})

describe('fixture missing phone and hours', () => {
  let site
  let origin
  before(async () => { site = await serve('missing-facts'); origin = site.originFor('acmeplumbing.test') })
  after(() => site.server.close())

  it('emits TODO lines for the missing facts, claims no level, and invents nothing', async () => {
    const crawl = await crawlSite(origin, { resolveAddresses: toLoopback })
    const result = generateOpenServiceProfile({ ...onHttps(crawl, origin, 'acmeplumbing.example'), answers: ANSWERS, validate: validateManifest })
    assert.equal(result.level, null)
    assert.equal(result.manifest.conformance, undefined)
    assert.equal(result.manifest.business.phone, undefined)
    assert.equal(result.manifest.locations[0].hours, undefined)
    assert.deepEqual(result.manifest.business.trades, ['Plumber'])
    assert.deepEqual(result.manifest.coverage, { postalCodes: ['75201', '75226'] })
    const missing = result.todos.filter((todo) => todo.kind === 'missing').map((todo) => todo.field)
    assert.ok(missing.includes('business.phone') && missing.includes('locations[0].hours'))
    const host = 'acmeplumbing.example'
    const phoneLine = `# TODO: business.phone: not found on ${host}; add it to your website or Google Business Profile, then re-run.`
    assert.ok(result.todos.some((todo) => todo.line === phoneLine))
    assert.ok(result.files.llmsTxt.includes(phoneLine))
    assert.match(result.files.robotsSection, /# TODO: locations\[0\]\.hours/)
    assert.ok(result.validation.length > 0)
    // The contact page falls in for the schedule page, as the spec allows; the manifest JSON stays valid JSON.
    assert.equal(result.manifest.interfaces.schedulePageUrl, 'https://acmeplumbing.example/contact')
    assert.deepEqual(JSON.parse(result.files.manifest), result.manifest)
  })

  it('the bin exits 0 with the TODO list on stdout', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'osp-missing-'))
    const { code, stdout } = await runMain(['init', origin, '--out', dir, ...ANSWER_FLAGS])
    assert.equal(code, 0)
    assert.match(stdout, /claims no level yet/)
    assert.match(stdout, /# TODO: business\.phone/)
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('host fence and sitemap handling', () => {
  let site
  let origin
  const children = (port) => `<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>http://evil.test:${port}/sitemap.xml</loc></sitemap><sitemap><loc>__ORIGIN__/sitemap-pages.xml.gz</loc></sitemap><sitemap><loc>http://www.palmettoair.test:${port}/sitemap-services.xml</loc></sitemap></sitemapindex>`
  const pages = '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>__ORIGIN__/</loc></url><url><loc>__ORIGIN__/contact</loc></url><url><loc>__ORIGIN__/schedule</loc></url></urlset>'
  const services = '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>__ORIGIN__/services/ac-repair</loc></url><url><loc>__ORIGIN__/services/heating-repair</loc></url></urlset>'
  before(async () => {
    let port = 0
    site = await serve('complete-hvac', {
      '/robots.txt': { body: 'User-agent: *\nAllow: /\nSitemap: __ORIGIN__/sitemap_index.xml\n' },
      '/sitemap_index.xml': { get body() { return children(port) }, type: 'application/xml' },
      '/sitemap-pages.xml.gz': { body: gzipSync(Buffer.from(pages)), type: 'application/gzip' },
      '/sitemap-services.xml': { body: services, type: 'application/xml' },
      '/sitemap.xml': { status: 404, body: 'gone' },
      '/bomb.xml.gz': { body: gzipSync(Buffer.alloc(4 * 1024 * 1024, 0x20)), type: 'application/gzip' },
      '/redirect-www': { get headers() { return { location: `http://www.palmettoair.test:${port}/landed` } }, status: 302, body: '' },
      '/landed': { body: 'landed' },
    })
    port = site.port
    origin = site.originFor('palmettoair.test')
  })
  after(() => site.server.close())

  it('a same-host sitemap index listing an offsite URL never fetches it; the www twin and the gzip child are read', async () => {
    site.requests.length = 0
    const crawl = await crawlSite(origin, { resolveAddresses: toLoopback })
    assert.equal(site.requests.some((entry) => entry.host?.startsWith('evil.test')), false)
    assert.ok(site.requests.some((entry) => entry.path === '/sitemap-pages.xml.gz'))
    assert.ok(site.requests.some((entry) => entry.host === `www.palmettoair.test:${site.port}` && entry.path === '/sitemap-services.xml'))
    // The gzip child decoded (with the origin it named, which is the www twin's host in that document) and the twin's services were kept.
    assert.ok(crawl.sitemapUrls.some((url) => url.endsWith('/services/ac-repair')))
    assert.ok(crawl.sitemapUrls.some((url) => url.endsWith('/contact')))
  })

  it('the fence applies to the first request of a document, not only to redirects', async () => {
    site.requests.length = 0
    const result = await fetchDocument(`http://evil.test:${site.port}/sitemap.xml`, { timeoutMs: 2000, maxBytes: 10_000, accept: '*/*', sameSiteAs: 'palmettoair.test', resolveAddresses: toLoopback })
    assert.deepEqual(result, { ok: false, code: 'redirect_offsite' })
    assert.deepEqual(site.requests, [])
    const twin = await fetchDocument(`http://www.palmettoair.test:${site.port}/sitemap-services.xml`, { timeoutMs: 2000, maxBytes: 10_000, accept: '*/*', sameSiteAs: 'palmettoair.test', resolveAddresses: toLoopback })
    assert.equal(twin.ok, true)
  })

  it('DNS counts against the deadline: a resolver that never settles is cut on the first request and on a later hop', async () => {
    const never = () => new Promise(() => {})
    const started = Date.now()
    const first = await fetchDocument(`${origin}/`, { timeoutMs: 300, maxBytes: 10_000, accept: '*/*', resolveAddresses: never })
    assert.deepEqual(first, { ok: false, code: 'timeout' })
    assert.ok(Date.now() - started < 1500)
    site.requests.length = 0
    const hopStart = Date.now()
    const hop = await fetchDocument(`${origin}/redirect-www`, {
      timeoutMs: 400, maxBytes: 10_000, accept: '*/*',
      resolveAddresses: (hostname) => (hostname.startsWith('www.') ? never() : toLoopback()),
    })
    assert.deepEqual(hop, { ok: false, code: 'timeout' })
    assert.ok(Date.now() - hopStart < 1500)
    assert.deepEqual(site.requests.map((entry) => entry.path), ['/redirect-www'])
  })

  it('gzip decoding is bounded on both the compressed and the decoded size', async () => {
    const small = await fetchDocument(`${origin}/sitemap-pages.xml.gz`, { timeoutMs: 2000, maxBytes: 64 * 1024, accept: '*/*', decodeGzip: true, resolveAddresses: toLoopback })
    assert.equal(small.ok, true)
    assert.match(small.text, /<urlset/)
    // A few kilobytes compressed, four megabytes decoded: refused at the decoded cap.
    const bomb = await fetchDocument(`${origin}/bomb.xml.gz`, { timeoutMs: 2000, maxBytes: 64 * 1024, accept: '*/*', decodeGzip: true, resolveAddresses: toLoopback })
    assert.deepEqual({ ok: bomb.ok, code: bomb.code }, { ok: false, code: 'too_large' })
    // Without decodeGzip the bytes come back as they are, inside the cap.
    const raw = await fetchDocument(`${origin}/sitemap-pages.xml.gz`, { timeoutMs: 2000, maxBytes: 64 * 1024, accept: '*/*', resolveAddresses: toLoopback })
    assert.equal(raw.ok, true)
    assert.doesNotMatch(raw.text, /<urlset/)
  })
})

describe('address policy', () => {
  it('IPv4: private, loopback, link-local and metadata, CGNAT, this-host, multicast, and malformed are refused; public passes', () => {
    for (const address of ['10.0.0.8', '127.0.0.1', '127.255.255.254', '169.254.169.254', '169.254.0.1', '172.16.0.1', '172.31.255.255', '192.168.1.10', '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255', '192.0.0.1', '1.2.3', '1.2.3.256']) {
      assert.equal(isBlockedIpv4(address), true, address)
    }
    for (const address of ['93.184.216.34', '8.8.8.8', '172.32.0.1', '100.128.0.1']) assert.equal(isBlockedIpv4(address), false, address)
  })

  it('IPv6: loopback, unspecified, link-local, unique-local, site-local, multicast, and local-use NAT64 are refused', () => {
    for (const address of ['::1', '::', 'fe80::1', 'fe80::1%en0', 'febf::1', 'fc00::1', 'fd00:ec2::254', 'fdff::1', 'fec0::1', 'ff02::1', '64:ff9b:1::1']) {
      assert.equal(isBlockedIpv6(address), true, address)
    }
    for (const address of ['2606:4700:4700::1111', '2001:4860:4860::8888', '[2606:4700:4700::1111]']) assert.equal(isBlockedIpv6(address), false, address)
  })

  it('IPv4-mapped addresses are judged by the IPv4 rules; the IPv4-compatible and NAT64 translation ranges are refused whatever they embed', () => {
    // IPv4-mapped, dotted and hex spellings (new URL() produces the hex form).
    assert.equal(isBlockedIpv6('::ffff:127.0.0.1'), true)
    assert.equal(isBlockedIpv6('::ffff:7f00:1'), true)
    assert.equal(isBlockedIpv6('::ffff:169.254.169.254'), true)
    assert.equal(isBlockedIpv6('::ffff:10.0.0.8'), true)
    assert.equal(isBlockedIpv6('::ffff:93.184.216.34'), false)
    assert.equal(isBlockedIpv6('::ffff:5db8:d822'), false)
    // IPv4-compatible ::/96 (deprecated): a legacy range, refused even with a public address inside.
    assert.equal(isBlockedIpv6('::127.0.0.1'), true)
    assert.equal(isBlockedIpv6('::7f00:1'), true)
    assert.equal(isBlockedIpv6('::93.184.216.34'), true)
    assert.equal(isBlockedIpv6('::5db8:d822'), true)
    // NAT64 well-known prefix 64:ff9b::/96 and local-use 64:ff9b:1::/48: translation ranges, refused even with a public address inside.
    assert.equal(isBlockedIpv6('64:ff9b::7f00:1'), true)
    assert.equal(isBlockedIpv6('64:ff9b::127.0.0.1'), true)
    assert.equal(isBlockedIpv6('64:ff9b::a9fe:a9fe'), true)
    assert.equal(isBlockedIpv6('64:ff9b::5db8:d822'), true)
    assert.equal(isBlockedIpv6('64:ff9b::93.184.216.34'), true)
    assert.equal(isBlockedIpv6('64:ff9b:1::93.184.216.34'), true)
    assert.equal(isBlockedIpv6('64:ff9b:1:ffff::5db8:d822'), true)
    // Malformed text is refused rather than guessed.
    assert.equal(isBlockedIpv6('not-an-address'), true)
    assert.equal(isBlockedIpv6('1:2:3:4:5:6:7:8:9'), true)
    assert.deepEqual(parseIpv6('::ffff:127.0.0.1'), [0, 0, 0, 0, 0, 0xffff, 0x7f00, 1])
    assert.deepEqual(parseIpv6('64:ff9b::1'), [0x64, 0xff9b, 0, 0, 0, 0, 0, 1])
  })

  it('resolves once and refuses when any answer is private; literals are judged without DNS; unresolvable hosts are reported', async () => {
    const mixed = await resolvePublicAddresses('mixed.test', async () => [{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.8', family: 4 }])
    assert.deepEqual(mixed, { ok: false, code: 'blocked_host' })
    const nat64 = await resolvePublicAddresses('nat.test', async () => [{ address: '64:ff9b::a00:8', family: 6 }])
    assert.deepEqual(nat64, { ok: false, code: 'blocked_host' })
    const fine = await resolvePublicAddresses('fine.test', async () => [{ address: '93.184.216.34', family: 4 }, { address: '2606:4700:4700::1111', family: 6 }])
    assert.deepEqual(fine, { ok: true, addresses: [{ address: '93.184.216.34', family: 4 }, { address: '2606:4700:4700::1111', family: 6 }] })
    assert.deepEqual(await resolvePublicAddresses('gone.test', async () => { throw new Error('ENOTFOUND') }), { ok: false, code: 'unresolvable_host' })
    assert.deepEqual(await resolvePublicAddresses('empty.test', async () => []), { ok: false, code: 'unresolvable_host' })
    assert.deepEqual(await resolvePublicAddresses('[::1]'), { ok: false, code: 'blocked_host' })
    assert.deepEqual(await resolvePublicAddresses('93.184.216.34'), { ok: true, addresses: [{ address: '93.184.216.34', family: 4 }] })
  })

  it('refuses private, loopback, and local addresses in the typed URL before any request', () => {
    for (const url of ['http://127.0.0.1:8080/', 'http://10.0.0.8/', 'http://192.168.1.10/', 'http://169.254.169.254/', 'localhost', 'http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://[64:ff9b::7f00:1]/', 'http://intranet.local/', 'http://svc.internal/']) {
      assert.throws(() => normalizeSiteUrl(url), (error) => error instanceof CrawlError && (error.code === 'blocked_host' || error.code === 'invalid_url'), url)
    }
    assert.throws(() => normalizeSiteUrl('ftp://example.com'), CrawlError)
    assert.throws(() => normalizeSiteUrl('https://user:pass@example.com'), CrawlError)
    assert.equal(normalizeSiteUrl('Example.com/path'), 'https://example.com')
  })

  it('a resolver that answers a private address refuses the crawl before any connection', async () => {
    let connected = false
    const transport = async () => { connected = true; throw new Error('must not connect') }
    await assert.rejects(
      crawlSite('http://private.test/', { resolveAddresses: async () => ({ ok: false, code: 'blocked_host' }), transport }),
      (error) => error instanceof CrawlError && error.code === 'blocked_host',
    )
    assert.equal(connected, false)
  })

  it('the bin exits 1 for a private address, never connects, and honors no environment switch', async () => {
    const { code, stderr } = await run(['init', 'http://127.0.0.1:9/'])
    assert.equal(code, 1)
    assert.match(stderr, /private or (?:internal|reserved)/)
    const withSwitch = await run(['init', 'http://127.0.0.1:9/'], { OPEN_SERVICE_PROFILE_ALLOW_LOCAL: '1' })
    assert.equal(withSwitch.code, 1)
    assert.match(withSwitch.stderr, /private or (?:internal|reserved)/)
    assert.doesNotMatch(readFileSync(bin, 'utf8') + readFileSync(join(root, 'src', 'crawl.mjs'), 'utf8'), /ALLOW_LOCAL|allowLocal/)
  })

  it('--help exits 0 and an unknown option exits 2', async () => {
    const help = await run(['--help'])
    assert.equal(help.code, 0)
    assert.match(help.stdout, /open-service-profile init <url>/)
    assert.match(help.stdout, /--ai-train <yes\|no>/)
    const bad = await run(['init', 'example.com', '--nope'])
    assert.equal(bad.code, 2)
  })
})

describe('validator and copy', () => {
  it('validates through the generated core: the same checker the web tool and the public audit use', () => {
    const errors = validateManifest({})
    assert.ok(errors.some((line) => /missing required property specVersion/.test(line)), errors.join('\n'))
    const example = JSON.parse(readFileSync(join(root, 'examples', 'v0.1', 'hvac-two-locations.json'), 'utf8'))
    assert.deepEqual(validateManifest(example), [])
    const twoPrimaries = { ...example, locations: example.locations.map((location) => ({ ...location, isPrimary: true })) }
    assert.ok(validateManifest(twoPrimaries).some((line) => /primary locations, exactly one required/.test(line)))
    // The core's own format predicates: no second implementation lives in this repository.
    assert.doesNotMatch(readFileSync(join(root, 'src', 'validate.mjs'), 'utf8'), /function validate\(|formats\s*=|date-time/)
  })

  it('the validator resolves its schema from a checkout path that contains a space', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'osp space '))
    try {
      cpSync(join(root, 'src'), join(dir, 'src'), { recursive: true })
      cpSync(join(root, 'schemas'), join(dir, 'schemas'), { recursive: true })
      const copied = await import(pathToFileURL(join(dir, 'src', 'validate.mjs')).href)
      assert.ok(copied.schemaPath.includes('osp space '))
      assert.ok(existsSync(copied.schemaPath))
      const example = JSON.parse(readFileSync(join(root, 'examples', 'v0.1', 'hvac-two-locations.json'), 'utf8'))
      assert.deepEqual(copied.validateManifest(example), [])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('no file in this repository\'s CLI tree carries an em-dash', () => {
    const walk = (entry) => (statSync(entry).isDirectory() ? readdirSync(entry).flatMap((name) => walk(join(entry, name))) : [entry])
    const offenders = ['bin', 'src', 'tests', 'scripts', 'README.md'].map((entry) => join(root, entry)).filter(existsSync).flatMap(walk).filter((file) => readFileSync(file, 'utf8').includes(EM_DASH))
    assert.deepEqual(offenders, [])
  })
})
