import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { buildDirectory, dateValue, httpUrl, mergeOrganizations, normalizeOrganization, validateDirectory, websiteKey } from './build-data.mjs'

const participation = (program = 'gsoc', year = 2025, cohort = String(year), extra = {}) => ({ program, year, cohort, status: 'historical', sourceUrl: 'https://example.org/archive', verifiedAt: '2026-09-28', projects: [{ title: 'Improve documentation', url: 'https://example.org/project' }], ...extra })
const organization = (name = 'Example', website = 'https://example.org', participations = [participation()]) => ({ name, description: 'Example open source organization', website, logoUrl: '', category: 'Development', technologies: ['JavaScript'], topics: [], participations })
const registry = [{ id: 'gsoc', officialUrl: 'https://summerofcode.withgoogle.com' }, { id: 'lfx', officialUrl: 'https://lfx.linuxfoundation.org' }]

test('merges cross-program history while preserving distinct program/year/cohort memberships', () => {
  const rows = [organization(), organization('Example', 'https://example.org', [participation('lfx', 2025, 'Spring'), participation('lfx', 2025, 'Fall'), participation('gsoc', 2024)])]
  const result = mergeOrganizations(rows)
  assert.equal(result.length, 1)
  assert.equal(result[0].participations.length, 4)
  assert.equal(new Set(result[0].participations.map(p => p.id)).size, 4)
  assert.deepEqual(result[0].participations.filter(p => p.program === 'gsoc' && p.year === 2025).map(p => p.cohort), ['2025'])
  assert.equal(result[0].participations.some(p => p.program === 'lfx' && p.year === 2024), false)
})
test('never merges unrelated repositories through a shared GitHub domain or a source-page fallback', () => {
  const rows = [organization('One', 'https://github.com/owner/one'), organization('Two', 'https://github.com/owner/two'), organization('Three', 'https://github.com'), organization('Four', 'https://github.com')]
  assert.equal(mergeOrganizations(rows).length, 4)
  const fallbackRows = [organization('Project A'), organization('Project B')].map(org => ({ ...org, websiteIsSource: true }))
  assert.equal(mergeOrganizations(fallbackRows).length, 2)
  assert.equal(websiteKey('https://github.com'), null)
  assert.notEqual(websiteKey(rows[0].website), websiteKey(rows[1].website))
})
test('explicit aliases deduplicate canonical names and produce stable IDs regardless of row order', () => {
  const rows = [organization('BDK', 'https://github.com/bitcoindevkit'), organization('Bitcoin Dev Kit', 'https://bitcoindevkit.org', [participation('lfx')])]
  const aliases = { names: { bdk: 'Bitcoin Dev Kit' } }
  const a = mergeOrganizations(rows, aliases), b = mergeOrganizations([...rows].reverse(), aliases)
  assert.equal(a.length, 1)
  assert.equal(a[0].id, 'org-bitcoin-dev-kit')
  assert.equal(a[0].id, b[0].id)
  assert.deepEqual(a[0].participations.map(p => p.id).sort(), b[0].participations.map(p => p.id).sort())
})
test('slug collisions have stable disambiguators', () => {
  const rows = [organization('C++', 'https://cplusplus.com'), organization('C#', 'https://csharp.net')]
  const a = mergeOrganizations(rows), b = mergeOrganizations([...rows].reverse())
  assert.equal(new Set(a.map(org => org.slug)).size, 2)
  assert.deepEqual(a.map(org => org.id).sort(), b.map(org => org.id).sort())
})
test('duplicate project imports are deduplicated; conflicting statuses fail for review', () => {
  assert.equal(mergeOrganizations([organization(), organization()])[0].participations[0].projects.length, 1)
  assert.throws(() => mergeOrganizations([organization(), organization('Example', 'https://example.org', [participation('gsoc', 2025, '2025', { status: 'open' })])]), /conflicting status/)
})
test('validation rejects unsafe URLs, impossible dates, unknown programs, and duplicate identities', () => {
  for (const url of ['javascript:alert(1)', 'https://name:secret@example.org', 'https://example.org ', '/relative']) assert.throws(() => httpUrl(url))
  for (const date of ['2025-02-29', '2026-13-01', 'not-a-date']) assert.throws(() => dateValue(date))
  assert.equal(dateValue('2024-02-29'), '2024-02-29')
  const directory = { generatedAt: '2026-09-28T00:00:00.000Z', programs: registry, organizations: mergeOrganizations([organization()]) }
  assert.equal(validateDirectory(directory), directory)
  assert.throws(() => validateDirectory({ ...directory, organizations: [...directory.organizations, ...directory.organizations] }), /Duplicate/)
  assert.throws(() => validateDirectory({ ...directory, programs: registry.filter(p => p.id !== 'gsoc') }), /unknown program/)
})
test('retains source licenses, attribution, content digests, and project-specific application links', () => {
  const digest = 'a'.repeat(64)
  const row = organization('Example', 'https://example.org', [participation('gsoc', 2025, '2025', {
    sourceLicense: 'CC-BY-3.0', sourceAttribution: 'Outreachy / Software Freedom Conservancy', sourceHash: digest, contentHash: digest,
    projects: [{ title: 'Improve documentation', url: 'https://example.org/project', applicationUrl: 'https://example.org/apply', product: 'Documentation', sourceStatus: 'accepted' }],
  })])
  const p = mergeOrganizations([row])[0].participations[0]
  assert.equal(p.sourceLicense, 'CC-BY-3.0')
  assert.equal(p.sourceAttribution, 'Outreachy / Software Freedom Conservancy')
  assert.equal(p.sourceHash, digest)
  assert.equal(p.contentHash, digest)
  assert.equal(p.projects[0].applicationUrl, 'https://example.org/apply')
  assert.equal(p.projects[0].product, 'Documentation')
  assert.throws(() => normalizeOrganization(organization('Bad', 'https://example.org', [participation('gsoc', 2025, '2025', { sourceHash: 'not-a-digest' })])), /SHA-256/)
})
test('normalizes application start variants and rejects invalid or contradictory windows', () => {
  for (const field of ['applicationStart', 'applicationStartDate', 'applicationStartsAt', 'startDate']) {
    const p = normalizeOrganization(organization('Example', 'https://example.org', [participation('gsoc', 2025, '2025', { [field]: '2026-09-01', applicationDeadline: '2026-10-01' })])).participations[0]
    assert.equal(p.applicationStart, '2026-09-01')
    assert.equal(Object.hasOwn(p, 'applicationStartDate'), false)
  }
  const normalize = extra => normalizeOrganization(organization('Example', 'https://example.org', [participation('gsoc', 2025, '2025', extra)]))
  assert.throws(() => normalize({ applicationStartDate: '2026-02-30' }), /invalid ISO/)
  assert.throws(() => normalize({ applicationStart: '2026-09-01', startDate: '2026-09-02' }), /conflicting application/)
  assert.throws(() => normalize({ applicationStart: '2026-10-01', applicationDeadline: '2026-09-01' }), /after its deadline/)
})
test('chooses metadata by evidence date and keeps meaningful descriptions and categories over boilerplate', () => {
  const olderEvidence = { ...organization('Example', 'https://example.org', [participation('gsoc', 2026, '2026', { verifiedAt: '2026-09-10' })]), description: 'Old description', category: 'Science' }
  const newerEvidence = { ...organization('Example', 'https://example.org', [participation('lfx', 2025, 'Spring', { verifiedAt: '2026-09-01', fetchedAt: '2026-09-15T00:00:00.000Z' })]), description: 'Current evidence describes a scientific imaging toolkit', category: 'Data and science' }
  const boilerplate = { ...organization('Example', 'https://example.org/archive', [participation('lfx', 2026, 'Fall', { verifiedAt: '2026-09-28' })]), websiteIsSource: true, description: 'Example is listed in the mentorship project directory.', category: 'Open source communities' }
  const result = mergeOrganizations([newerEvidence, boilerplate, olderEvidence])[0]
  assert.equal(result.description, newerEvidence.description)
  assert.equal(result.category, 'Data and science')
  assert.equal(result.website, 'https://example.org')
  assert.equal(result.websiteIsSource, undefined)
})
test('offline build is reproducible and a failed validation preserves the last valid directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'openorganizations-data-test-'))
  const dataPath = join(root, 'data')
  await mkdir(dataPath)
  try {
    const write = (name, data) => writeFile(join(dataPath, name), JSON.stringify(data))
    await Promise.all([write('gsoc.json', [organization()]), write('sob.json', [organization('Other', 'https://other.org')]), write('supplemental.json', [organization('Third', 'https://third.org')]), write('programs.json', registry), write('aliases.json', { names: {} })])
    await buildDirectory(root)
    const before = await readFile(join(dataPath, 'directory.json'), 'utf8')
    await buildDirectory(root)
    assert.equal(await readFile(join(dataPath, 'directory.json'), 'utf8'), before)
    await write('supplemental.json', [organization('Bad', 'javascript:alert(1)')])
    await assert.rejects(() => buildDirectory(root), /invalid HTTP/)
    assert.equal(await readFile(join(dataPath, 'directory.json'), 'utf8'), before)
  } finally {
    const absolute = resolve(root)
    const allowedParent = `${resolve(tmpdir())}${sep}`
    assert.ok(absolute.startsWith(allowedParent) && absolute.slice(allowedParent.length).startsWith('openorganizations-data-test-'), 'cleanup stays inside the test temporary directory')
    await rm(absolute, { recursive: true, force: true })
  }
})
