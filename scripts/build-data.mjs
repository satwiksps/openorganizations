import { createHash } from 'node:crypto'
import { readFile, writeFile, rename, mkdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const STATUSES = new Set(['historical', 'unknown', 'open', 'closed', 'upcoming'])
const SHARED_HOSTS = new Set(['github.com', 'gitlab.com', 'sourceforge.net', 'codeberg.org', 'bitbucket.org'])
export const cleanText = (value, limit = 1000) => String(value ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, limit)
export const slugify = value => cleanText(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'organization'
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 10)
const nameKey = value => cleanText(value).normalize('NFKC').toLowerCase()
function copyProvenance(source, target, label) {
  for (const field of ['sourceRevision', 'sourceStatus', 'sourceNote', 'sourceLicense', 'sourceAttribution']) {
    if (source[field] != null) {
      if (typeof source[field] !== 'string' || !cleanText(source[field])) throw new Error(`${label}.${field}: expected nonempty text`)
      target[field] = cleanText(source[field], field === 'sourceAttribution' ? 1200 : 600)
    }
  }
  for (const field of ['sourceHash', 'contentHash']) if (source[field] != null) {
    if (typeof source[field] !== 'string' || !/^[a-f0-9]{64}$/i.test(source[field])) throw new Error(`${label}.${field}: expected a SHA-256 hex digest`)
    target[field] = source[field].toLowerCase()
  }
}
export function httpUrl(value, label = 'URL', optional = false) {
  if (optional && (value == null || value === '')) return ''
  if (typeof value !== 'string' || value !== value.trim()) throw new Error(`${label}: expected a trimmed HTTP(S) URL`)
  let parsed
  try { parsed = new URL(value) } catch { throw new Error(`${label}: invalid URL ${value}`) }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || !parsed.hostname.includes('.')) throw new Error(`${label}: invalid HTTP(S) URL ${value}`)
  return value
}
export function dateValue(value, label = 'date') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value.slice(0, 10)) throw new Error(`${label}: invalid ISO date ${value}`)
  return value
}
export function websiteKey(value, websiteIsSource = false) {
  if (!value || websiteIsSource) return null
  const url = new URL(httpUrl(value))
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const path = url.pathname.replace(/\/+$/, '')
  if (SHARED_HOSTS.has(host) && !path) return null
  // Preserve owner/repository paths, case, queries, and fragments; never use a hosting domain alone.
  return `${host}${path}${url.search}${url.hash}`
}
function uniqueStrings(values = []) {
  const map = new Map()
  for (const item of values) {
    const text = cleanText(item, 120)
    if (text) map.set(text.toLowerCase(), text)
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'en'))
}
export function normalizeOrganization(row, aliases = {}) {
  if (!row || typeof row !== 'object') throw new Error('Organization must be an object')
  const originalName = cleanText(row.name, 200)
  if (!originalName) throw new Error('Organization name is required')
  const nameAliases = aliases.names || {}
  const name = nameAliases[nameKey(originalName)] || originalName
  const website = httpUrl(row.website, `${name}.website`)
  const org = {
    name, description: cleanText(row.description, 1500), website,
    logoUrl: httpUrl(row.logoUrl || '', `${name}.logoUrl`, true),
    category: cleanText(row.category || 'Open source', 120),
    technologies: uniqueStrings(row.technologies), topics: uniqueStrings(row.topics),
    participations: [],
  }
  if (row.websiteIsSource) org.websiteIsSource = true
  if (row.aliases?.length || name !== originalName) org.aliases = uniqueStrings([...(row.aliases || []), ...(name !== originalName ? [originalName] : [])])
  for (const item of row.participations || []) {
    const program = cleanText(item.program, 40)
    if (!/^[a-z0-9][a-z0-9-]*$/.test(program)) throw new Error(`${name}: invalid program ${program}`)
    const year = Number(item.year)
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error(`${name}: invalid participation year`)
    if (!STATUSES.has(item.status)) throw new Error(`${name}: invalid status ${item.status}`)
    const participation = {
      program, year, cohort: cleanText(item.cohort || String(year), 160), status: item.status,
      sourceUrl: httpUrl(item.sourceUrl, `${name}.sourceUrl`),
      verifiedAt: dateValue(item.verifiedAt, `${name}.verifiedAt`),
      projects: [],
    }
    for (const project of item.projects || []) {
      const title = cleanText(project.title, 400)
      if (!title) throw new Error(`${name}: project title is required`)
      const output = { title, url: httpUrl(project.url, `${name}.project.url`) }
      copyProvenance(project, output, `${name}.project`)
      if (project.applicationUrl) output.applicationUrl = httpUrl(project.applicationUrl, `${name}.project.applicationUrl`)
      if (project.product) output.product = cleanText(project.product, 200)
      participation.projects.push(output)
    }
    for (const field of ['applicationUrl']) if (item[field]) participation[field] = httpUrl(item[field], `${name}.${field}`)
    for (const field of ['applicationDeadline', 'fetchedAt']) if (item[field]) participation[field] = dateValue(item[field], `${name}.${field}`)
    const startFields = ['applicationStart', 'applicationStartDate', 'applicationStartsAt', 'startDate'].filter(field => item[field] != null)
    if (startFields.length) {
      const starts = startFields.map(field => dateValue(item[field], `${name}.${field}`))
      if (new Set(starts.map(Date.parse)).size !== 1) throw new Error(`${name}: conflicting application start dates`)
      participation.applicationStart = starts[0]
      if (participation.applicationDeadline && Date.parse(participation.applicationStart) > Date.parse(participation.applicationDeadline)) throw new Error(`${name}: application start is after its deadline`)
    }
    copyProvenance(item, participation, name)
    org.participations.push(participation)
  }
  if (!org.participations.length) throw new Error(`${name}: at least one participation is required`)
  return org
}
export function mergeOrganizations(rows, aliases = {}) {
  const normalized = rows.map(row => normalizeOrganization(row, aliases))
  const parents = normalized.map((_, i) => i)
  const find = i => parents[i] === i ? i : (parents[i] = find(parents[i]))
  const union = (a, b) => { parents[find(b)] = find(a) }
  const seenNames = new Map(), seenWebsites = new Map()
  for (let i = 0; i < normalized.length; i++) {
    const org = normalized[i], key = nameKey(org.name)
    const urlKey = websiteKey(org.website, org.websiteIsSource)
    if (seenNames.has(key)) union(i, seenNames.get(key))
    else seenNames.set(key, i)
    if (urlKey) {
      if (seenWebsites.has(urlKey)) union(i, seenWebsites.get(urlKey))
      else seenWebsites.set(urlKey, i)
    }
  }
  const groups = new Map()
  normalized.forEach((org, i) => { const key = find(i); groups.set(key, [...(groups.get(key) || []), org]) })
  const organizations = []
  for (const group of groups.values()) {
    // Keep identity independent of fetch order. Descriptive metadata is selected separately below.
    group.sort((a, b) => Math.min(...a.participations.map(p => p.year)) - Math.min(...b.participations.map(p => p.year)) || a.name.localeCompare(b.name, 'en'))
    const canonicalName = aliases.names?.[nameKey(group[0].name)] || group[0].name
    const org = { ...group[0], name: canonicalName }
    const participations = new Map()
    for (const next of group) {
      org.technologies = uniqueStrings([...org.technologies, ...next.technologies])
      org.topics = uniqueStrings([...org.topics, ...next.topics])
      for (const p of next.participations) {
        const key = `${p.program}\0${p.year}\0${p.cohort}`
        const prior = participations.get(key)
        if (prior && prior.status !== p.status) throw new Error(`${canonicalName}: conflicting status for ${p.program}/${p.year}/${p.cohort}`)
        const projects = new Map([...(prior?.projects || []), ...p.projects].map(project => [`${project.url}\0${project.title}`, project]))
        const merged = { ...(prior || {}), ...p, projects: [...projects.values()].sort((a, b) => a.title.localeCompare(b.title, 'en')) }
        if (prior && prior.sourceUrl !== p.sourceUrl) merged.additionalSourceUrls = [...new Set([...(prior.additionalSourceUrls || []), prior.sourceUrl])].filter(url => url !== p.sourceUrl).sort()
        participations.set(key, merged)
      }
    }
    const evidenceTime = row => Math.max(...row.participations.flatMap(p => [Date.parse(p.verifiedAt), ...(p.fetchedAt ? [Date.parse(p.fetchedAt)] : [])]))
    const latestYear = row => Math.max(...row.participations.map(p => p.year))
    const metadata = [...group].sort((a, b) => evidenceTime(b) - evidenceTime(a) || latestYear(b) - latestYear(a) || a.name.localeCompare(b.name, 'en') || a.description.localeCompare(b.description, 'en'))
    const genericCategory = value => /^(?:open source(?: communities)?|other|unknown|general)$/i.test(value)
    const boilerplate = row => row.websiteIsSource && /\b(?:is listed in|appears in|has participated in|listed .+ projects in)\b/i.test(row.description)
    org.description = (metadata.find(row => row.description && !boilerplate(row)) || metadata.find(row => row.description))?.description || ''
    org.category = (metadata.find(row => row.category && !genericCategory(row.category)) || metadata.find(row => row.category))?.category || 'Open source'
    org.logoUrl = metadata.find(row => row.logoUrl)?.logoUrl || ''
    const homepage = metadata.find(row => !row.websiteIsSource) || metadata[0]
    org.website = homepage.website
    if (homepage.websiteIsSource) org.websiteIsSource = true
    else delete org.websiteIsSource
    org.aliases = uniqueStrings(group.flatMap(row => [row.name, ...(row.aliases || [])])).filter(name => name !== org.name)
    org.slug = slugify(org.name)
    org.id = `org-${org.slug}`
    org.participations = [...participations.values()].sort((a, b) => b.year - a.year || a.program.localeCompare(b.program) || a.cohort.localeCompare(b.cohort))
    organizations.push(org)
  }
  const slugGroups = new Map()
  organizations.forEach(org => slugGroups.set(org.slug, [...(slugGroups.get(org.slug) || []), org]))
  for (const group of slugGroups.values()) if (group.length > 1) for (const org of group) {
    org.slug += `-${hash(nameKey(org.name))}`
    org.id = `org-${org.slug}`
  }
  for (const org of organizations) for (const p of org.participations) p.id = `${org.id}-${p.program}-${p.year}-${hash(p.cohort)}`
  return organizations.sort((a, b) => a.name.localeCompare(b.name, 'en'))
}
export function validateSnapshot(snapshot, label = 'snapshot') {
  const rows = Array.isArray(snapshot) ? snapshot : snapshot.organizations
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`${label}: organizations must be a nonempty array`)
  rows.forEach(row => normalizeOrganization(row))
  if (snapshot.fetchedAt) dateValue(snapshot.fetchedAt, `${label}.fetchedAt`)
  return rows
}
export function validateDirectory(directory) {
  dateValue(directory.generatedAt, 'generatedAt')
  if (!Array.isArray(directory.programs) || !directory.programs.length) throw new Error('Program registry is required')
  const programs = new Set()
  for (const program of directory.programs) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(program.id) || programs.has(program.id)) throw new Error(`Invalid/duplicate program ID: ${program.id}`)
    programs.add(program.id)
    httpUrl(program.officialUrl || program.url, `${program.id}.officialUrl`)
  }
  validateSnapshot(directory)
  const ids = new Set(), slugs = new Set(), participationIds = new Set()
  for (const org of directory.organizations) {
    if (!org.id || ids.has(org.id)) throw new Error(`Duplicate/missing organization ID: ${org.id}`)
    if (!org.slug || slugs.has(org.slug)) throw new Error(`Duplicate/missing organization slug: ${org.slug}`)
    ids.add(org.id); slugs.add(org.slug)
    for (const p of org.participations) {
      if (!programs.has(p.program)) throw new Error(`${org.name}: unknown program ${p.program}`)
      if (!p.id || participationIds.has(p.id)) throw new Error(`Duplicate/missing participation ID: ${p.id}`)
      participationIds.add(p.id)
      for (const sourceUrl of p.additionalSourceUrls || []) httpUrl(sourceUrl, 'additionalSourceUrl')
    }
  }
  return directory
}
export async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.tmp`
  try { await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); await rename(temporary, path) }
  finally { await rm(temporary, { force: true }) }
}
// Keep all history for organizations represented in a program since 2016.
// A participation cutoff is not a claim that an older project is discontinued.
export function retainRecentOrganizations(organizations) {
  return organizations.filter(org => org.participations.some(p => p.year > 2015))
}
export async function buildDirectory(root = ROOT) {
  const readJson = async name => JSON.parse(await readFile(resolve(root, 'data', name), 'utf8'))
  const [gsoc, sob, supplemental, registry, aliases] = await Promise.all(['gsoc.json', 'sob.json', 'supplemental.json', 'programs.json', 'aliases.json'].map(readJson))
  const snapshots = [gsoc, sob, supplemental]
  try { snapshots.push(await readJson('gsoc-history.json')) } catch (error) { if (error.code !== 'ENOENT') throw error }
  const rows = snapshots.flatMap((snapshot, i) => validateSnapshot(snapshot, ['gsoc', 'sob', 'supplemental'][i]))
  // Derive generation date from inputs so repeated offline builds produce identical bytes.
  const evidenceDates = rows.flatMap(row => row.participations.map(p => p.fetchedAt || p.verifiedAt))
  const directory = validateDirectory({ generatedAt: new Date(Math.max(...evidenceDates.map(Date.parse))).toISOString(), organizations: retainRecentOrganizations(mergeOrganizations(rows, aliases)), programs: Array.isArray(registry) ? registry : registry.programs })
  await atomicWriteJson(resolve(root, 'data/directory.json'), directory)
  console.log(`Built ${directory.organizations.length} organizations and ${directory.organizations.reduce((sum, org) => sum + org.participations.length, 0)} participations (offline).`)
  return directory
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildDirectory().catch(error => { console.error(error.message); process.exitCode = 1 })
