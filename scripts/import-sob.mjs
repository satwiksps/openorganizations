import { resolve } from 'node:path'
import { ROOT, atomicWriteJson, cleanText, httpUrl, validateSnapshot } from './build-data.mjs'
const REPOSITORY = 'Jaydeep869/SOB_Organizations'
const PINNED_REVISION = '8c73ebd590c90f68660ba8b8a629299c84641ebe'
const args = process.argv.slice(2)
const requestedRef = args.includes('--ref') ? args[args.indexOf('--ref') + 1] : PINNED_REVISION
async function fetchText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'OpenOrganizations data importer' } })
  if (!response.ok) throw new Error(`Fetch ${url}: HTTP ${response.status}`)
  return response.text()
}
async function main() {
  let revision = requestedRef
  if (!/^[a-f0-9]{40}$/.test(revision)) revision = JSON.parse(await fetchText(`https://api.github.com/repos/${REPOSITORY}/commits/${encodeURIComponent(revision)}`)).sha
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('Could not resolve source revision')
  const source = `https://github.com/${REPOSITORY}/blob/${revision}/src/data.js`
  const raw = await fetchText(`https://raw.githubusercontent.com/${REPOSITORY}/${revision}/src/data.js`)
  // Accept only the known JSON-returning wrapper. Never evaluate downloaded JavaScript.
  const match = raw.match(/^\s*export const getSobData = \(\) => \{\s*return\s*(\[[\s\S]*\]);\s*\};?\s*$/)
  if (!match) throw new Error('Source format changed; inspect the import adapter before updating')
  const rows = JSON.parse(match[1])
  if (!Array.isArray(rows) || rows.length < 20) throw new Error('Source is missing a complete organization list')
  const fetchedAt = new Date().toISOString()
  const organizations = rows.map(row => ({
    name: cleanText(row.name, 200), description: cleanText(row.description, 1500),
    website: httpUrl(cleanText(row.url)),
    // The source includes malformed avatar IDs and personal fork avatars. Omit those instead of displaying a contributor as the organization.
    logoUrl: /^https:\/\/avatars\.githubusercontent\.com\/u\/\d+(?:\?.*)?$/.test(row.image_url || '') ? row.image_url : '',
    category: cleanText(row.category || 'Bitcoin'), technologies: row.technologies || [], topics: row.topics || [],
    participations: Object.entries(row.years || {}).map(([year, record]) => ({
      program: 'sob', year: Number(year), cohort: year, status: 'historical', sourceUrl: source,
      verifiedAt: fetchedAt, fetchedAt, sourceRevision: revision,
      sourceNote: 'Historical participation from the community-maintained SoB Organizations dataset; not independently verified against an official year archive. Some repository links in the source are forks.',
      projects: (record.projects || []).map(project => ({ title: cleanText(project.project || project.title, 400), url: source })),
    })),
  }))
  const snapshot = { schemaVersion: 1, fetchedAt, source: `https://github.com/${REPOSITORY}`, sourceRevision: revision, license: 'MIT', sources: [{ url: source, officialUrl: 'https://www.summerofbitcoin.org/', rows: rows.length }], organizations }
  validateSnapshot(snapshot, 'SoB import')
  await atomicWriteJson(resolve(ROOT, 'data/sob.json'), snapshot)
  console.log(`Imported ${organizations.length} SoB organizations with historical project titles from ${revision}.`)
}
main().catch(error => { console.error(`SoB import failed; existing snapshot preserved. ${error.message}`); process.exitCode = 1 })
