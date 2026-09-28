import { spawn } from 'node:child_process'
import { readFile, writeFile, rename, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROOT } from './build-data.mjs'

export function runNodeScript(script, args = [], root = ROOT) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [resolve(root, 'scripts', script), ...args], { cwd: root, stdio: 'inherit', shell: false })
    child.once('error', reject)
    child.once('exit', (code, signal) => code === 0 ? resolveRun() : reject(new Error(`${script} failed (${signal || `exit ${code}`})`)))
  })
}

export async function refreshData({ pinned = false, root = ROOT, run = runNodeScript } = {}) {
  const names = ['gsoc.json', 'sob.json', 'supplemental.json', 'directory.json']
  const originals = new Map()
  for (const name of names) {
    try { originals.set(name, await readFile(resolve(root, 'data', name))) }
    catch (error) { if (error.code !== 'ENOENT') throw error; originals.set(name, null) }
  }
  try {
    // These are CLI adapters, not importable APIs. Never evaluate upstream code.
    await run('import-gsoc.mjs', pinned ? [] : ['--ref', 'master'], root)
    await run('import-sob.mjs', pinned ? [] : ['--ref', 'main'], root)
    // Supplemental repository pins are changed after source-specific review.
    await run('import-supplemental.mjs', [], root)
    await run('build-data.mjs', [], root)
    await run('validate-data.mjs', [], root)
    console.log('All imports and the combined directory passed validation. Review the data diff before publishing.')
  } catch (error) {
    const rollbackErrors = []
    for (const [name, contents] of originals) {
      const destination = resolve(root, 'data', name)
      const temporary = `${destination}.${process.pid}.rollback`
      try {
        if (contents === null) await rm(destination, { force: true })
        else { await writeFile(temporary, contents); await rename(temporary, destination) }
      } catch (rollbackError) { rollbackErrors.push(`${name}: ${rollbackError.message}`) }
      finally { await rm(temporary, { force: true }).catch(() => {}) }
    }
    throw new Error(`${error.message}. ${rollbackErrors.length ? `Snapshot rollback needs attention: ${rollbackErrors.join('; ')}` : 'All previous snapshots restored.'}`)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  if (args.some(argument => argument !== '--pinned')) { console.error('Usage: node scripts/refresh-data.mjs [--pinned]'); process.exitCode = 1 }
  else refreshData({ pinned: args.includes('--pinned') }).catch(error => { console.error(error.message); process.exitCode = 1 })
}
