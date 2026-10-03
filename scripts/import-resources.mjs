import { createHash } from 'node:crypto'
import { atomicWriteJson, cleanText } from './build-data.mjs'
import { extraSources, importExtraProposals } from './proposal-archives.mjs'
const checkedAt = new Date().toISOString()
const sources = [
  {repo:'devweekends/open-source-proposals',revision:'f09b802e5466e8b5b1e9a2c01b29b728f6cd9f9a',label:'Open Source Proposals Archive',layout:'program-year'},
  {repo: 'Google-Summer-of-Code-Archive/gsoc-proposals-archive', revision: '20dc27bac2647cc7ebe6ed13f3cb500b109e76d0', label: 'Community GSoC proposal archive'},
  {repo: 'satwiksps/GSoC_archive_2026', revision: '52321020fdeda5dc5cd57a21df4e7e85525f23cd', label: 'GSoC 2026 community archive', year: 2026},
]
async function get(url) {
  const response = await fetch(url, {signal: AbortSignal.timeout(30000)})
  if (!response.ok) throw new Error(`${response.status}: ${url}`)
  return response.text()
}
const encoded = path => path.split('/').map(encodeURIComponent).join('/')
const proposals = [], seenBlobs = new Set()
for (const source of sources) {
  const tree = JSON.parse(await get(`https://api.github.com/repos/${source.repo}/git/trees/${source.revision}?recursive=1`))
  if (tree.truncated || !tree.tree?.length) throw new Error('Incomplete proposal tree')
  for (const file of tree.tree.filter(file => file.type === 'blob' && /\.(?:pdf|docx|mdown)$/i.test(file.path))) {
    const parts = file.path.split('/');
    const program = source.layout ? ({GSoC:'gsoc',LFX:'lfx','Summer of Bitcoin':'sob'}[parts.shift()]) : 'gsoc';
    const year = source.year || Number(parts.shift());
    if(!program || seenBlobs.has(file.sha)) continue;
    if (!year || parts.length < 2) continue
    const organizationName = parts[0]
    const outcome = source.layout ? (file.path.includes('/_rejected/')?'rejected':'accepted') : source.year ? (/\/accepted\//i.test(file.path) ? 'accepted' : /\/rejected\//i.test(file.path) ? 'rejected' : 'unknown') : 'accepted'
    const url = `https://github.com/${source.repo}/blob/${source.revision}/${encoded(file.path)}`
    seenBlobs.add(file.sha);
    proposals.push({blobSha:file.sha,id: createHash('sha256').update(url).digest('hex').slice(0,12), program, year, organizationName,
      title: cleanText(parts.at(-1).replace(/\.(pdf|docx|mdown)$/i,'').replace(/_/g,' '), 250), outcome, url,
      sourceUrl:`https://github.com/${source.repo}`, sourceLabel:source.label, checkedAt,
      outcomeNote: 'Outcome is reported by the archive maintainers, not independently verified by this directory.'})
  }
}
await importExtraProposals({proposals, seenBlobs, checkedAt})
sources.push(...extraSources)
for (const proposal of proposals) proposal.folderUrl ||= proposal.url.replace('/blob/', '/tree/').split('/').slice(0,-1).join('/')
if (proposals.length < 60) throw new Error('Proposal coverage unexpectedly fell')
await atomicWriteJson('data/proposals.json',{checkedAt, sources, proposals})

const numRevision = 'b999b4f9e54d0c1cbd238388d2546ebdbc8d8f16'
const numAliases = {'pymc3':'PyMC', 'pymc':'PyMC', 'colour':'Colour Science', 'colour science':'Colour Science', 'fenics project':'FEniCS', 'fenics':'FEniCS', 'ecodata retriever':'Data Retriever', 'matplotlib':'Matplotlib', 'econ-ark':'Econ-ARK', 'econ-ark:':'Econ-ARK', 'pysal':'PySAL'}
const candidates = new Map()
for (let year=2015; year<=2026; year++) {
  const path = `${year}/ideas-list.md`, sourceUrl = `https://github.com/numfocus/gsoc/blob/${numRevision}/${path}`
  const text = (await get(`https://raw.githubusercontent.com/numfocus/gsoc/${numRevision}/${path}`)).replace(/<!--[\s\S]*?-->/g,'')
  let count=0
  for (const line of text.split('\n')) {
    if (!/^[-*]\s+/.test(line)) continue
    const match = line.match(/^\s*[-*]\s+\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/) || line.match(/^\s*[-*]\s+(.+?)\s+(https?:\/\/\S+)/) || (/^- SciML\s*$/.test(line) ? ['', 'SciML', sourceUrl] : null)
    if (!match) continue
    const rawName=cleanText(match[1].replace(/:$/,'')), name=numAliases[rawName.toLowerCase()] || rawName
    const key=name.toLowerCase(), existing=candidates.get(key) || {name, aliases:[], website:match[2], ideaYears:[]}
    existing.aliases=[...new Set([...existing.aliases,rawName,...(name==='PyMC'?['PyMC3']:[])])]
    existing.website=match[2]; existing.ideaYears.push({year,sourceUrl}); candidates.set(key,existing); count++
  }
  if (count<2) throw new Error(`NumFOCUS ${year}: unexpected ideas list`)
}
const apacheUrl='https://projects.apache.org/json/foundation/projects.json'
const apache=JSON.parse(await get(apacheUrl))
const apacheProjects=Object.entries(apache).filter(([,p])=>p.name?.startsWith('Apache ')).map(([id,p])=>({name:p.name, aliases:[p.name.slice(7), ...(id.length>=4?[id]:[])], website:p.homepage, sourceUrl:apacheUrl, ideaYears:[]}))
if(apacheProjects.length<100) throw new Error('Incomplete Apache project catalog')
await atomicWriteJson('data/umbrellas.json',{checkedAt, groups:[
  {parentSlug:'numfocus', name:'NumFOCUS', sourceUrl:`https://github.com/numfocus/gsoc/tree/${numRevision}`, candidates:[...candidates.values()]},
  {parentSlug:'the-apache-software-foundation', name:'Apache Software Foundation',sourceUrl:apacheUrl,candidates:apacheProjects},
  {parentSlug:'cncf',name:'CNCF',sourceUrl:'https://github.com/cncf/mentoring/tree/main/programs/lfx-mentorship',program:'lfx',candidates:[]}
]})
console.log(`Indexed ${proposals.length} public proposal links, ${candidates.size} NumFOCUS sub-organizations and ${apacheProjects.length} Apache project names.`)
