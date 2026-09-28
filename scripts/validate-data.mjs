import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { ROOT, validateDirectory } from './build-data.mjs'
try {
  const directory = validateDirectory(JSON.parse(await readFile(resolve(ROOT, 'data/directory.json'), 'utf8')))
  console.log(`Validated ${directory.organizations.length} organizations across ${directory.programs.length} programs.`)
} catch (error) { console.error(error.message); process.exitCode = 1 }
