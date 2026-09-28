import { createRequire } from 'node:module'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { ROOT, atomicWriteJson, cleanText, httpUrl, validateSnapshot } from './build-data.mjs'
const require = createRequire(import.meta.url)
const filters = require('../vendor/gsoc-filters/index.js')
const PINNED_REVISION = '73961070242dcd5b7b3b0b42abf906012a6511ce'
const REPOSITORY = 'nishantwrp/gsoc-organizations'
const args = process.argv.slice(2)
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback
const requestedRef = option('--ref', PINNED_REVISION)
const sourceDir = option('--source-dir', '')
async function fetchText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'OpenOrganizations data importer' } })
  if (!response.ok) throw new Error(`Fetch ${url}: HTTP ${response.status}`)
  return response.text()
}
function sourceUrl(value, fallback) {
  const text = cleanText(value || fallback, 3000)
  return httpUrl(text, 'GSoC source URL')
}
function normalizeTags(values, filter) {
  let result = [...new Set((values || []).flatMap(value => filter(cleanText(value))).filter(Boolean))].sort()
  for (let i = 0; i < 15; i++) {
    const next = [...new Set(result.flatMap(filter).filter(Boolean))].sort()
    if (JSON.stringify(result) === JSON.stringify(next)) return next
    result = next
  }
  throw new Error('Upstream normalization rules contain a cycle')
}
async function main() {
  let revision = requestedRef
  if (!/^[a-f0-9]{40}$/.test(revision)) {
    if (sourceDir) throw new Error('Local imports require --ref with the 40-character source commit')
    revision = JSON.parse(await fetchText(`https://api.github.com/repos/${REPOSITORY}/commits/${encodeURIComponent(revision)}`)).sha
  }
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('Could not resolve source revision')
  const filenames = sourceDir
    ? await readdir(resolve(sourceDir, 'api/data'))
    : JSON.parse(await fetchText(`https://api.github.com/repos/${REPOSITORY}/contents/api/data?ref=${revision}`)).map(file => file.name)
  const years = filenames.filter(name => /^20\d{2}\.json$/.test(name)).map(name => Number(name.slice(0, 4))).sort((a, b) => a - b)
  if (!years.includes(2016) || !years.includes(2026)) throw new Error('Source is missing required GSoC historical snapshots (2016–2026)')
  const fetchedAt = new Date().toISOString()
  const organizations = [], sources = []
  for (const year of years) {
    const path = `api/data/${year}.json`
    const downloadUrl = `https://raw.githubusercontent.com/${REPOSITORY}/${revision}/${path}`
    const raw = sourceDir ? await readFile(resolve(sourceDir, path), 'utf8') : await fetchText(downloadUrl)
    const data = JSON.parse(raw)
    if (Number(data.year) !== year || !Array.isArray(data.organizations) || data.organizations.length < 100) throw new Error(`${year}: source is missing a complete organization list`)
    sources.push({ year, url: downloadUrl, officialUrl: httpUrl(data.archive_url), rows: data.organizations.length })
    for (const row of data.organizations) {
      const source = sourceUrl(row.projects_url, data.archive_url)
      organizations.push({
        name: filters.nameFilters.filter(cleanText(row.name)),
        description: cleanText(row.description, 1500),
        website: sourceUrl(row.url, source),
        logoUrl: row.image_url ? sourceUrl(row.image_url) : '',
        category: filters.categoryFilters.filter(cleanText(row.category || 'Open source')),
        technologies: normalizeTags(row.technologies, filters.technologyFilters.filter),
        topics: normalizeTags(row.topics, filters.topicFilters.filter),
        participations: [{
          program: 'gsoc', year, cohort: String(year), status: 'historical',
          sourceUrl: source, verifiedAt: fetchedAt, fetchedAt, sourceRevision: revision,
          sourceNote: 'Participation imported from the GSoC Organizations archive snapshot; this historical listing is not an application-status claim.',
          projects: (row.projects || []).map(project => ({ title: cleanText(project.title, 400), url: sourceUrl(project.project_url, source) })),
        }],
      })
    }
  }
  const snapshot = { schemaVersion: 1, fetchedAt, source: `https://github.com/${REPOSITORY}`, sourceRevision: revision, license: 'GPL-3.0', sources, organizations }
  validateSnapshot(snapshot, 'GSoC import')
  await atomicWriteJson(resolve(ROOT, 'data/gsoc.json'), snapshot)
  console.log(`Imported ${organizations.length} GSoC organization-year rows (${years[0]}–${years.at(-1)}) from ${revision}.`)
}
main().catch(error => { console.error(`GSoC import failed; existing snapshot preserved. ${error.message}`); process.exitCode = 1 })
