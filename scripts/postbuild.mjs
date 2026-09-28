import { lstat, readdir, readFile, writeFile, rm } from 'node:fs/promises'
import { dirname, extname, resolve, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MAX_ASSET_BYTES = 25 * 1024 * 1024
const ROOT_FILES = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'gatsby-config.js', 'gatsby-node.js', 'gatsby-browser.js', 'gatsby-ssr.js', '.nvmrc', '.npmrc', '.gitignore', '.env.example', 'LICENSE', 'NOTICE', 'NOTICE.md', 'README.md', 'CONTRIBUTING.md']
const SOURCE_DIRECTORIES = ['src', 'scripts', 'data', 'vendor', 'docs', '.github', 'static']
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.css', '.scss', '.md', '.mdx', '.txt', '.yaml', '.yml', '.html', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.sh'])
const SOURCE_BASENAMES = new Set(['LICENSE', 'NOTICE', 'COPYING', 'AUTHORS', '_headers', '_redirects', '.gitkeep'])
const EXCLUDED_DIRECTORIES = new Set(['node_modules', '.git', '.reference', '.cache', 'public', 'dist', 'coverage'])
const unixPath = value => value.split(sep).join('/')
const isMissing = error => error.code === 'ENOENT'

async function walk(directory) {
  const paths = []
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    const path = resolve(directory, entry.name)
    if (entry.isSymbolicLink()) throw new Error(`Source/output symlinks require explicit review: ${path}`)
    if (entry.isDirectory()) { if (!EXCLUDED_DIRECTORIES.has(entry.name)) paths.push(...await walk(path)) }
    else if (entry.isFile()) paths.push(path)
  }
  return paths
}

export function productionSiteUrl(value = process.env.SITE_URL || 'https://openorganizations.site') {
  const url = new URL(value)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('SITE_URL must be an HTTP(S) origin, without a path, credentials, query, or fragment')
  return url.origin
}

function writeString(header, value, offset, length) {
  const bytes = Buffer.from(String(value), 'utf8')
  if (bytes.length > length) throw new Error(`USTAR field exceeds ${length} bytes: ${value}`)
  bytes.copy(header, offset)
}
function writeOctal(header, value, offset, length) {
  const octal = value.toString(8)
  if (octal.length > length - 1) throw new Error('Source file exceeds USTAR numeric limits')
  writeString(header, `${octal.padStart(length - 1, '0')}\0`, offset, length)
}
function splitTarPath(path) {
  if (Buffer.byteLength(path) <= 100) return { name: path, prefix: '' }
  for (let index = path.lastIndexOf('/'); index > 0; index = path.lastIndexOf('/', index - 1)) {
    const prefix = path.slice(0, index), name = path.slice(index + 1)
    if (Buffer.byteLength(prefix) <= 155 && Buffer.byteLength(name) <= 100) return { name, prefix }
  }
  throw new Error(`Source path exceeds portable USTAR limits: ${path}`)
}

export function createSourceTar(files) {
  const blocks = []
  for (const file of files) {
    const path = `openorganizations/${file.path}`
    if (file.path.startsWith('/') || file.path.split('/').includes('..') || file.path.includes('\\')) throw new Error(`Unsafe source archive path: ${file.path}`)
    const { name, prefix } = splitTarPath(path)
    const header = Buffer.alloc(512)
    writeString(header, name, 0, 100)
    writeOctal(header, 0o644, 100, 8)
    writeOctal(header, 0, 108, 8)
    writeOctal(header, 0, 116, 8)
    writeOctal(header, file.contents.length, 124, 12)
    writeOctal(header, 0, 136, 12)
    header.fill(32, 148, 156)
    writeString(header, '0', 156, 1)
    writeString(header, 'ustar\0', 257, 6)
    writeString(header, '00', 263, 2)
    writeString(header, 'root', 265, 32)
    writeString(header, 'root', 297, 32)
    writeString(header, prefix, 345, 155)
    const checksum = header.reduce((total, byte) => total + byte, 0).toString(8).padStart(6, '0')
    writeString(header, `${checksum}\0 `, 148, 8)
    blocks.push(header, file.contents)
    const padding = (512 - file.contents.length % 512) % 512
    if (padding) blocks.push(Buffer.alloc(padding))
  }
  blocks.push(Buffer.alloc(1024))
  return Buffer.concat(blocks)
}

export async function sourceFiles(root = ROOT) {
  const paths = []
  for (const name of ROOT_FILES) {
    const path = resolve(root, name)
    try { const info = await lstat(path); if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Expected regular source file: ${path}`); paths.push(path) }
    catch (error) { if (!isMissing(error)) throw error; if (['package.json', 'pnpm-lock.yaml', 'LICENSE'].includes(name)) throw new Error(`Required source archive file is missing: ${name}`) }
  }
  for (const directory of SOURCE_DIRECTORIES) {
    try {
      for (const path of await walk(resolve(root, directory))) {
        const name = path.split(sep).at(-1)
        if (name.startsWith('.env') || /(?:^|[._-])(?:secret|credentials|token|private-key)(?:[._-]|$)/i.test(name)) continue
        if (SOURCE_EXTENSIONS.has(extname(name).toLowerCase()) || SOURCE_BASENAMES.has(name) || /(?:^|[-.])LICENSE(?:\.|$)/i.test(name)) paths.push(path)
      }
    } catch (error) { if (!isMissing(error)) throw error }
  }
  return Promise.all(paths.sort((a, b) => unixPath(relative(root, a)).localeCompare(unixPath(relative(root, b)), 'en')).map(async path => ({ path: unixPath(relative(root, path)), contents: await readFile(path) })))
}

const escapeXml = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

export async function postbuild({ root = ROOT, siteUrl = productionSiteUrl(), adsClient = process.env.GATSBY_ADSENSE_CLIENT || '' } = {}) {
  const output = resolve(root, 'public')
  await lstat(resolve(output, 'index.html'))
  const builtFiles = await walk(output)
  const routes = builtFiles.filter(path => path.endsWith(`${sep}index.html`)).map(path => {
    const page = unixPath(relative(output, dirname(path)))
    return page ? `/${page}/` : '/'
  }).filter(route => !/^\/404\//.test(route)).sort()
  if (routes.length > 50000) throw new Error('More than 50,000 pages: split the sitemap before deployment')
  const origin = productionSiteUrl(siteUrl)
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(route => `  <url><loc>${escapeXml(`${origin}${encodeURI(route)}`)}</loc></url>`).join('\n')}\n</urlset>\n`
  await writeFile(resolve(output, 'sitemap.xml'), sitemap)
  await writeFile(resolve(output, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`)

  if (adsClient) {
    if (!/^ca-pub-\d{16}$/.test(adsClient)) throw new Error('GATSBY_ADSENSE_CLIENT must be your actual ca-pub- followed by 16 digits')
    await writeFile(resolve(output, 'ads.txt'), `google.com, ${adsClient.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`)
  } else await rm(resolve(output, 'ads.txt'), { force: true })

  const files = await sourceFiles(root)
  const archive = gzipSync(createSourceTar(files), { level: 9 })
  if (archive.length >= MAX_ASSET_BYTES) throw new Error(`source.tar.gz is ${(archive.length / 1024 / 1024).toFixed(2)} MiB; reduce generated data duplication or arrange source hosting before deploying (Pages limit: 25 MiB/file)`)
  await writeFile(resolve(output, 'source.tar.gz'), archive)
  for (const path of await walk(output)) {
    const { size } = await lstat(path)
    if (size > MAX_ASSET_BYTES) throw new Error(`Output asset exceeds the Cloudflare Pages 25 MiB limit: ${relative(output, path)}`)
  }
  console.log(`Prepared ${routes.length} sitemap URLs and source.tar.gz (${files.length} files, ${(archive.length / 1024 / 1024).toFixed(2)} MiB). Advertising ${adsClient ? 'publisher file generated' : 'unconfigured; no ads.txt generated'}.`)
  return { routes, sourceFileCount: files.length, archiveBytes: archive.length }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) postbuild().catch(error => { console.error(error.message); process.exitCode = 1 })
