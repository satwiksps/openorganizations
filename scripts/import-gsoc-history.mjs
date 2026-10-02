import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { atomicWriteJson, cleanText, validateSnapshot } from './build-data.mjs'
const require = createRequire(import.meta.url)
const { nameFilters } = require('../vendor/gsoc-filters/index.js')
const revision = '51e1a4beffa4bb489562be07172ed55463a8f62f'
const repository = 'dojutsu-user/GSoC-Data-Analyser'
const sourceUrl = `https://github.com/${repository}/blob/${revision}/Dataset/2009-2015.json`
async function get(path) {
  const response = await fetch(`https://raw.githubusercontent.com/${repository}/${revision}/${path}`, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Historical source: HTTP ${response.status}`)
  return response.text()
}
// The archived scraper double-encoded some UTF-8 names. Repair only reversible mojibake.
export function repairEncoding(text) {
  if (!/[ÃÂâ]/.test(text)) return text
  const repaired = Buffer.from(text, 'latin1').toString('utf8')
  return repaired.includes('\uFFFD') ? text : repaired
}
async function main() {
  const raw = await get('Dataset/2009-2015.json'), data = JSON.parse(raw)
  const current = JSON.parse(await readFile('data/directory.json', 'utf8'))
  const key = text => text.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '')
  const existing = new Map(current.organizations.flatMap(org => [org.name, ...(org.aliases || [])].map(name => [key(name), org.name])))
  const now = new Date().toISOString(), organizations = []
  for (let year = 2009; year <= 2015; year++) {
    const entries = Object.entries(data[year] || {})
    if (entries.length < 100) throw new Error(`Incomplete ${year} archive`)
    for (const [rawName, projects] of entries) {
      const normalized = nameFilters.filter(cleanText(repairEncoding(rawName)))
      const name = existing.get(key(normalized)) || normalized
      organizations.push({ name, aliases: name === normalized ? [] : [normalized], website: sourceUrl, websiteIsSource: true,
        description: `${name} appears in the historical Google Summer of Code project archive.`, logoUrl: '', category: 'Open source', technologies: [], topics: [],
        participations: [{ program: 'gsoc', year, cohort: String(year), status: 'historical', sourceUrl, verifiedAt: now, fetchedAt: now,
          sourceRevision: revision, sourceHash: createHash('sha256').update(raw).digest('hex'), sourceLicense: 'MIT', sourceAttribution: 'Vaibhav Gupta / GSoC-Data-Analyser',
          sourceNote: 'Community mirror of the 2009–2015 Google Melange project archive. Original Melange project links may now redirect; the participation source retains the mirrored records. Organizations without indexed projects may be absent.',
          projects: projects.map(p => ({title: cleanText(repairEncoding(p.title), 400), url: p.link})) }],
      })
    }
    console.log(`GSoC ${year}: ${entries.length} organizations with archived projects`)
  }
  const snapshot = {schemaVersion: 1, fetchedAt: now, source: sourceUrl, sourceRevision: revision, license: 'MIT', organizations}
  validateSnapshot(snapshot, 'Historical GSoC')
  await writeFile('vendor/gsoc-history-LICENSE', await get('LICENSE'))
  await atomicWriteJson('data/gsoc-history.json', snapshot)
}
if (process.argv[1]?.endsWith('import-gsoc-history.mjs')) main().catch(error => { console.error(error); process.exitCode = 1 })
