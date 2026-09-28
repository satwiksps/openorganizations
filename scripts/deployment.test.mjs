import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, access, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { gzipSync, gunzipSync } from 'node:zlib'
import { execFileSync } from 'node:child_process'
import { createSourceTar, postbuild, productionSiteUrl, sourceFiles } from './postbuild.mjs'
import { refreshData, runNodeScript } from './refresh-data.mjs'

async function withFixture(run) {
  const base = resolve(tmpdir())
  const root = await mkdtemp(join(base, 'openorganizations-deployment-test-'))
  try {
    for (const directory of ['public/about', 'public/404', 'data', 'scripts', 'static/fonts', 'docs']) await mkdir(join(root, directory), { recursive: true })
    for (const [path, contents] of Object.entries({ 'package.json': '{}', 'pnpm-lock.yaml': 'lockfileVersion: 9.0', 'pnpm-workspace.yaml': 'allowBuilds: {}', LICENSE: 'Fixture license', '.env': 'DO_NOT_PUBLISH_THIS_SECRET', 'public/index.html': 'root', 'public/about/index.html': 'about', 'public/404/index.html': 'missing', 'static/fonts/OFL.txt': 'Font license', 'docs/DEPLOYMENT.md': 'Build instructions' })) await writeFile(join(root, path), contents)
    return await run(root)
  } finally {
    const target = resolve(root)
    if (!target.startsWith(base + sep) || !target.split(sep).at(-1).startsWith('openorganizations-deployment-test-')) throw new Error('Refusing unsafe fixture cleanup')
    await rm(target, { recursive: true, force: true })
  }
}

test('postbuild derives canonical sitemap routes from built HTML and excludes 404', () => withFixture(async root => {
  const result = await postbuild({ root, siteUrl: 'https://directory.example', adsClient: '' })
  assert.deepEqual(result.routes, ['/', '/about/'])
  const sitemap = await readFile(join(root, 'public/sitemap.xml'), 'utf8')
  assert.match(sitemap, /https:\/\/directory\.example\/about\//)
  assert.doesNotMatch(sitemap, /404/)
  assert.match(await readFile(join(root, 'public/robots.txt'), 'utf8'), /Sitemap: https:\/\/directory\.example\/sitemap.xml/)
  assert.throws(() => productionSiteUrl('https://directory.example/path'), /origin/)
  assert.throws(() => productionSiteUrl('https://user:password@directory.example'), /origin/)
  assert.throws(() => productionSiteUrl('javascript:alert(1)'), /origin/)
}))

test('source download retains build and license inputs, excludes secrets, and is reproducible', () => withFixture(async root => {
  await mkdir(join(root, 'src'), { recursive: true })
  await writeFile(join(root, 'src', 'credentials.json'), 'EXCLUDED_CREDENTIAL_VALUE')
  await postbuild({ root, siteUrl: 'https://directory.example', adsClient: '' })
  const archive = await readFile(join(root, 'public/source.tar.gz'))
  const text = gunzipSync(archive).toString('utf8')
  assert.match(text, /pnpm-workspace.yaml/)
  assert.match(text, /static\/fonts\/OFL.txt/)
  assert.match(text, /docs\/DEPLOYMENT.md/)
  assert.doesNotMatch(text, /DO_NOT_PUBLISH_THIS_SECRET|EXCLUDED_CREDENTIAL_VALUE/)
  assert.deepEqual(gzipSync(createSourceTar(await sourceFiles(root)), { level: 9 }), archive)
  const listing = execFileSync('tar', ['-tzf', join(root, 'public/source.tar.gz')], { encoding: 'utf8' })
  assert.match(listing, /openorganizations\/LICENSE/)
  const extracted = join(root, 'extracted')
  await mkdir(extracted)
  execFileSync('tar', ['-xzf', join(root, 'public/source.tar.gz'), '-C', extracted])
  assert.equal(await readFile(join(extracted, 'openorganizations/static/fonts/OFL.txt'), 'utf8'), 'Font license')
}))

test('portable archive supports long prefixes and rejects parent path traversal', () => withFixture(async root => {
  const path = `${'nested-directory/'.repeat(8)}source.mjs`
  const archivePath = join(root, 'long-path.tar.gz')
  await writeFile(archivePath, gzipSync(createSourceTar([{ path, contents: Buffer.from('export const answer = 42;') }])))
  assert.match(execFileSync('tar', ['-tzf', archivePath], { encoding: 'utf8' }), /source.mjs/)
  assert.throws(() => createSourceTar([{ path: '../outside', contents: Buffer.from('no') }]), /Unsafe/)
}))

test('ads.txt exists only for configured publisher syntax and is removed when ads are disabled', () => withFixture(async root => {
  await postbuild({ root, siteUrl: 'https://directory.example', adsClient: '' })
  await assert.rejects(access(join(root, 'public/ads.txt')))
  await postbuild({ root, siteUrl: 'https://directory.example', adsClient: 'ca-pub-1234567890123456' })
  assert.equal(await readFile(join(root, 'public/ads.txt'), 'utf8'), 'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n')
  await assert.rejects(postbuild({ root, siteUrl: 'https://directory.example', adsClient: 'invalid' }), /ca-pub/)
  await postbuild({ root, siteUrl: 'https://directory.example', adsClient: '' })
  await assert.rejects(access(join(root, 'public/ads.txt')))
}))

test('refresh stops at the first failed importer and restores every original snapshot', () => withFixture(async root => {
  const names = ['gsoc.json', 'sob.json', 'supplemental.json', 'directory.json']
  for (const name of names) await writeFile(join(root, 'data', name), `before-${name}`)
  const calls = []
  await assert.rejects(refreshData({ root, run: async (script, args) => {
    calls.push([script, args])
    await writeFile(join(root, 'data/gsoc.json'), 'changed')
    await writeFile(join(root, 'data/sob.json'), 'changed')
    if (script === 'import-supplemental.mjs') throw new Error('upstream unavailable')
  } }), /All previous snapshots restored/)
  assert.deepEqual(calls, [['import-gsoc.mjs', ['--ref', 'master']], ['import-sob.mjs', ['--ref', 'main']], ['import-supplemental.mjs', []]])
  for (const name of names) assert.equal(await readFile(join(root, 'data', name), 'utf8'), `before-${name}`)
}))

test('combined validation failure also rolls back newly created snapshot files', () => withFixture(async root => {
  await assert.rejects(refreshData({ root, run: async script => {
    await writeFile(join(root, 'data/directory.json'), 'new-invalid-directory')
    if (script === 'validate-data.mjs') throw new Error('invalid combined data')
  } }), /All previous snapshots restored/)
  await assert.rejects(access(join(root, 'data/directory.json')))
}))

test('pinned refresh preserves adapter defaults and validates only after all imports finish', () => withFixture(async root => {
  const calls = []
  await refreshData({ root, pinned: true, run: async (script, args) => { calls.push([script, args]) } })
  assert.deepEqual(calls, [['import-gsoc.mjs', []], ['import-sob.mjs', []], ['import-supplemental.mjs', []], ['build-data.mjs', []], ['validate-data.mjs', []]])
}))

test('child process failures propagate a nonzero exit code', () => withFixture(async root => {
  await writeFile(join(root, 'scripts/fails.mjs'), 'process.exitCode = 4')
  await assert.rejects(runNodeScript('fails.mjs', [], root), /exit 4/)
}))
