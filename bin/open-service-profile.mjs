#!/usr/bin/env node
// open-service-profile: draft an Open Service Profile manifest, llms.txt, llms-full.txt, a
// robots.txt AI section, and the Level 1 JSON-LD snippet from a business's own website. Nothing
// is invented: a fact the site does not state becomes a `# TODO:` line for the owner to complete.
//
//   npx open-service-profile init <url> [--place-id <id>] [--out <dir>] [--json] [--verbose]
//       [--min-days-ahead <n>] [--weekend-requests <allowed|saturday_only|not_allowed>]
//       [--emergency <yes|no>] [--contact-methods <call,text,email>]
//       [--service-model <on_site|in_shop|both>] [--primary <city or id>] [--time-zone <IANA zone>]
//       [--ai-read <yes|no>] [--ai-train <yes|no>]
//
// Node 20 or newer. No dependencies.
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { generateOpenServiceProfile } from '../src/core/osp-generator/generate.js'
import { ANSWER_FLAGS } from '../src/core/osp-generator/todo.js'
import { crawlSite, CrawlError } from '../src/crawl.mjs'
import { fetchPlaceListing } from '../src/places.mjs'
import { validateManifest } from '../src/validate.mjs'

const HELP = `open-service-profile: draft your Open Service Profile from your own website.
It also writes your llms.txt.

Usage
  open-service-profile init <url> [options]

Options
  --place-id <id>   Also read your Google Business Profile listing (needs GOOGLE_PLACES_API_KEY).
                    Listing facts fill only what your site lacks; they never override it, and the
                    listing is used only once it is confirmed as this business (its website is
                    your site, or, with no website, its phone or its name and postal code match).
  --out <dir>       Where to write the five files. Default: ./open-service-profile
  --json            Print the full result as JSON to stdout instead of writing files.
  --verbose         Print each URL as it is fetched.
  --help            This text.

Your answers (no website states these; you do)
  --min-days-ahead <n>            Earliest day you accept requests for, in days from today (0 to 60; 1 is tomorrow).
  --weekend-requests <value>      allowed, saturday_only, or not_allowed.
  --emergency <yes|no>            Whether you take urgent calls outside published hours.
  --contact-methods <list>        How you confirm a request: call, text, email (comma-separated).
  --service-model <value>         on_site, in_shop, or both. Asked only when your pages name no
                                  recognized trade, or more than one; one recognized trade settles it.
  --primary <city or id>          Which location is primary, when your pages list several.
  --time-zone <zone>              IANA zone such as America/Chicago. Asked only when your state spans two.
  --ai-read <yes|no>              robots.txt: may AI assistants read your public pages?
  --ai-train <yes|no>             robots.txt: may your pages be used for model training?
  When no answer flag is given and the terminal is interactive, the tool asks the booking and the
  robots questions. Unanswered questions stay "# TODO:" lines in the draft; the tool never guesses.

Files written
  open-service-profile.json   serve at /.well-known/open-service-profile (application/json, CORS *)
  llms.txt                    serve at /llms.txt
  llms-full.txt               serve at /llms-full.txt
  robots-ai-section.txt       merge into your robots.txt (a commented template until you answer)
  jsonld.html                 paste inside <head> on your home page (the Level 1 JSON-LD)

A fact your pages do not state becomes a "# TODO:" line, never a default. Resolve the TODO
lines, then run again. The draft claims Level 1 only when every Level 1 fact is established, no
value is a guess, the manifest validates against the standard, and your home page already
carries the Level 1 JSON-LD.

Standard: https://www.theservicemarketingguys.com/standards/open-service-profile/
`

function parseArgs(argv) {
  const args = { command: null, url: null, placeId: null, out: null, json: false, verbose: false, help: false, answers: {}, answerFlagsSeen: false }
  const rest = [...argv]
  const answer = (field, value) => { args.answers[field] = value; args.answerFlagsSeen = true }
  while (rest.length > 0) {
    const arg = rest.shift()
    if (arg === '--help' || arg === '-h') args.help = true
    else if (arg === '--json') args.json = true
    else if (arg === '--verbose') args.verbose = true
    else if (arg === '--place-id') args.placeId = rest.shift() ?? null
    else if (arg === '--out') args.out = rest.shift() ?? null
    else if (arg === ANSWER_FLAGS.minimumDaysAhead) answer('minimumDaysAhead', parseMinDays(rest.shift()))
    else if (arg === ANSWER_FLAGS.weekendRequests) answer('weekendRequests', parseWeekend(rest.shift()))
    else if (arg === ANSWER_FLAGS.emergencyAvailable) answer('emergencyAvailable', parseYesNo(rest.shift(), arg))
    else if (arg === ANSWER_FLAGS.contactMethods) answer('contactMethods', parseMethods(rest.shift()))
    else if (arg === ANSWER_FLAGS.serviceModel) answer('serviceModel', parseServiceModel(rest.shift()))
    else if (arg === ANSWER_FLAGS.primaryLocation) answer('primaryLocation', parseText(rest.shift(), arg))
    else if (arg === ANSWER_FLAGS.timeZone) answer('timeZone', parseTimeZone(rest.shift()))
    else if (arg === ANSWER_FLAGS.aiRead) answer('aiRead', parseYesNo(rest.shift(), arg))
    else if (arg === ANSWER_FLAGS.aiTrain) answer('aiTrain', parseYesNo(rest.shift(), arg))
    else if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}. Run with --help.`)
    else if (!args.command) args.command = arg
    else if (!args.url) args.url = arg
    else throw new Error(`Unexpected argument ${arg}. Run with --help.`)
  }
  return args
}

function parseMinDays(value) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 0 || number > 60) throw new Error('--min-days-ahead takes a whole number from 0 to 60.')
  return number
}

function parseWeekend(value) {
  if (!['allowed', 'saturday_only', 'not_allowed'].includes(value)) throw new Error('--weekend-requests takes allowed, saturday_only, or not_allowed.')
  return value
}

function parseYesNo(value, flag) {
  const lower = String(value ?? '').toLowerCase()
  if (['yes', 'y', 'true'].includes(lower)) return true
  if (['no', 'n', 'false'].includes(lower)) return false
  throw new Error(`${flag} takes yes or no.`)
}

function parseMethods(value) {
  const methods = String(value ?? '').split(',').map((part) => part.trim().toLowerCase()).filter(Boolean)
  if (methods.length === 0 || methods.some((method) => !['call', 'text', 'email'].includes(method))) throw new Error('--contact-methods takes a comma-separated list of call, text, email.')
  return Array.from(new Set(methods))
}

function parseServiceModel(value) {
  if (!['on_site', 'in_shop', 'both'].includes(value)) throw new Error('--service-model takes on_site, in_shop, or both.')
  return value
}

function parseText(value, flag) {
  const text = String(value ?? '').trim()
  if (!text || text.length > 120) throw new Error(`${flag} takes a city or location id.`)
  return text
}

function parseTimeZone(value) {
  const zone = String(value ?? '').trim()
  if (!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+$/.test(zone) || zone.length > 80) throw new Error('--time-zone takes an IANA zone such as America/Chicago.')
  return zone
}

/**
 * The booking and robots questions, asked only on an interactive terminal when no answer flag
 * was given. An empty answer leaves that field a TODO line. The service model, primary
 * location, and time zone are asked by flag only, because the draft knows whether they are
 * needed only after the crawl.
 */
async function askQuestions(io) {
  const rl = createInterface({ input: io.stdin, output: io.stderr })
  const answers = {}
  const ask = async (question) => (await rl.question(question)).trim()
  try {
    io.stderr.write('\nSix questions your website cannot answer. An empty answer leaves a TODO line.\n')
    const days = await ask('Earliest day you accept requests for, in days from today (0 to 60; 1 is tomorrow): ')
    if (days) answers.minimumDaysAhead = parseMinDays(days)
    const weekend = await ask('Weekend requests: allowed, saturday_only, or not_allowed: ')
    if (weekend) answers.weekendRequests = parseWeekend(weekend)
    const emergency = await ask('Do you take urgent calls outside published hours? yes or no: ')
    if (emergency) answers.emergencyAvailable = parseYesNo(emergency, 'emergency')
    const methods = await ask('How do you confirm a request? call, text, email (comma-separated): ')
    if (methods) answers.contactMethods = parseMethods(methods)
    const read = await ask('May AI assistants read your public pages? yes or no: ')
    if (read) answers.aiRead = parseYesNo(read, 'ai-read')
    const train = await ask('May your pages be used for model training? yes or no: ')
    if (train) answers.aiTrain = parseYesNo(train, 'ai-train')
  } finally {
    rl.close()
  }
  return answers
}

const ANSWER_FIELD = /^(?:bookingPolicy\.|business\.serviceModel$|business\.timeZone$|locations\[\]\.isPrimary$)/

/**
 * `io.crawlOptions` is the test seam (a transport and resolver aimed at a local server); the
 * shipped executable passes none, so the address policy always applies.
 */
export async function main(argv = process.argv.slice(2), io = { stdout: process.stdout, stderr: process.stderr, stdin: process.stdin, env: process.env }) {
  let args
  try {
    args = parseArgs(argv)
  } catch (error) {
    io.stderr.write(`${error.message}\n`)
    return 2
  }
  if (args.help || !args.command) {
    io.stdout.write(HELP)
    return args.help ? 0 : 2
  }
  if (args.command !== 'init') {
    io.stderr.write(`Unknown command ${args.command}. The one command is init. Run with --help.\n`)
    return 2
  }
  if (!args.url) {
    io.stderr.write('init needs a website address: open-service-profile init example.com\n')
    return 2
  }

  const log = args.verbose ? (line) => io.stderr.write(`${line}\n`) : () => {}
  let crawl
  try {
    crawl = await crawlSite(args.url, { ...(io.crawlOptions ?? {}), log })
  } catch (error) {
    if (error instanceof CrawlError) {
      io.stderr.write(`${error.message}\n`)
      return 1
    }
    throw error
  }

  const notices = []
  let places = null
  if (args.placeId) {
    try {
      places = await fetchPlaceListing(args.placeId, { apiKey: io.env.GOOGLE_PLACES_API_KEY, ...(io.placesOptions ?? {}) })
      if (!places) notices.push('The Google listing could not be read, so this draft comes from the website alone.')
    } catch (error) {
      notices.push(`${error.message} This draft comes from the website alone.`)
    }
  }

  let answers = args.answers
  if (!args.answerFlagsSeen && !args.json && io.stdin?.isTTY) {
    try {
      answers = await askQuestions(io)
    } catch (error) {
      io.stderr.write(`${error.message}\n`)
      return 2
    }
  }

  const result = generateOpenServiceProfile({ ...crawl, places, answers, validate: validateManifest })
  if (places && result.todos.some((todo) => todo.field === 'places')) {
    notices.push('The Google listing could not be confirmed as this business (its website, phone, or name and postal code do not match the site), so nothing from it was used.')
  }
  if (!crawl.complete) notices.push('Some pages were not read inside the time budget; run again for a complete draft.')

  if (args.json) {
    io.stdout.write(`${JSON.stringify({ ...result, notices }, null, 2)}\n`)
    return 0
  }

  const out = resolve(process.cwd(), args.out ?? 'open-service-profile')
  mkdirSync(out, { recursive: true })
  const files = [
    ['open-service-profile.json', result.files.manifest],
    ['llms.txt', result.files.llmsTxt],
    ['llms-full.txt', result.files.llmsFullTxt],
    ['robots-ai-section.txt', result.files.robotsSection],
    ['jsonld.html', result.files.jsonLd],
  ]
  for (const [name, text] of files) writeFileSync(resolve(out, name), text.endsWith('\n') ? text : `${text}\n`)

  const lines = []
  lines.push(`Read ${result.pages.filter((page) => page.fetched).length} of ${result.pages.length} pages on ${result.origin}.`)
  for (const notice of notices) lines.push(`Note: ${notice}`)
  lines.push('')
  lines.push(`Wrote ${files.length} files to ${out}:`)
  for (const entry of result.hosting) lines.push(`  ${entry.file.padEnd(28)} ${entry.path}`)
  lines.push('')
  if (result.level === 1) {
    lines.push('Every Level 1 fact was found on the site, the home page carries the Level 1 JSON-LD, and the manifest validates. The draft claims Level 1.')
  } else {
    lines.push('The draft claims no level yet. Resolve the TODO lines below, then run again.')
  }
  const missing = result.todos.filter((todo) => todo.kind === 'missing')
  const review = result.todos.filter((todo) => todo.kind === 'review')
  const missingFacts = missing.filter((todo) => !ANSWER_FIELD.test(todo.field))
  const missingAnswers = missing.filter((todo) => ANSWER_FIELD.test(todo.field))
  if (missingFacts.length > 0) {
    lines.push('', 'Missing facts (add them to your website or Google Business Profile):')
    for (const todo of missingFacts) lines.push(`  ${todo.line}`)
  }
  if (missingAnswers.length > 0) {
    lines.push('', 'Not answered (pass the flags, or run again in a terminal to be asked):')
    for (const todo of missingAnswers) lines.push(`  ${todo.line}`)
  }
  if (review.length > 0) {
    lines.push('', 'Review before publishing (derived values and notes for you to confirm):')
    for (const todo of review) lines.push(`  ${todo.line.replace(/\n/g, '\n  ')}`)
  }
  if (result.validation.length > 0) {
    lines.push('', 'Validation against Appendix A:')
    for (const error of result.validation) lines.push(`  ${error}`)
  }
  if (result.ratingsIgnored.length > 0) {
    lines.push('', 'Rating and review-count fields in the page markup were not copied; the standard forbids them.')
  }
  io.stdout.write(`${lines.join('\n')}\n`)
  return 0
}

const invokedDirectly = (() => {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
})()

if (invokedDirectly) {
  main().then((code) => { process.exitCode = code }, (error) => {
    process.stderr.write(`${error?.message ?? error}\n`)
    process.exitCode = 1
  })
}
