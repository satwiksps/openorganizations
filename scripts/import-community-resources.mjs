import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { atomicWriteJson } from './build-data.mjs'
import { nameKey } from '../src/lib/enrichment.mjs'
const require=createRequire(import.meta.url)
const filters=require('../vendor/gsoc-filters/index.js')
const data=JSON.parse(await readFile('data/directory.json','utf8'))
const revision=JSON.parse(await readFile('data/gsoc.json','utf8')).sourceRevision
const names=new Map(data.organizations.flatMap(o=>[o.name,...o.aliases].map(n=>[nameKey(n),o.slug])))
const communities={}
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{Accept:'application/json',...(process.env.GITHUB_TOKEN&&url.startsWith('https://api.github.com/')?{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`}:{})}});if(!r.ok)throw new Error(`${r.status}: ${url}`);return r.text()}
const fields={irc_channel:'Chat / community',mailing_list:'Forum / mailing list',contact_email:'Contact email',guide_url:'Contributor guide',ideas_url:'Project ideas',blog_url:'Blog'}
function safe(value){try{const u=new URL(value);return ['https:','http:','mailto:','irc:','ircs:'].includes(u.protocol)?u.href:null}catch{return null}}
for(let year=2026;year>=2016;year--){
  const source=`https://raw.githubusercontent.com/nishantwrp/gsoc-organizations/${revision}/api/data/${year}.json`
  const raw=JSON.parse(await get(source))
  for(const row of raw.organizations){
    const slug=names.get(nameKey(filters.nameFilters.filter(row.name)))
    if(!slug||communities[slug]?.links?.length)continue
    const links=[]
    for(const [field,label] of Object.entries(fields)){const url=safe(row[field]);if(url&&!links.some(l=>l.url===url))links.push({label,url,year})}
    if(links.length)communities[slug]={links,year,sourceUrl:row.projects_url||source}
  }
}
// Only follow repository links actually present in indexed project sources.
for(const org of data.organizations){
  const urls=[...new Set(org.participations.flatMap(p=>p.projects.map(project=>project.url)).map(url=>url.match(/^https:\/\/github\.com\/([^/]+\/[^/#?]+)/i)?.[0]).filter(Boolean))]
  if(urls.length){communities[org.slug]||={links:[]};communities[org.slug].repositories=urls.map(url=>({name:url.split('/').slice(-2).join('/'),url})).sort((a,b)=>a.name.localeCompare(b.name))}
}
// Official community mirrors/directories. Keep all pages; do not imply these
// repositories are accepted GSoC projects or independent organizations.
const directories={ 'kde-community':'KDE','gnome-foundation':'GNOME','mozilla':'mozilla','fossasia':'fossasia','owasp-foundation':'OWASP','jboss-community':'jboss','scummvm':'scummvm' }
for(const [slug,owner] of Object.entries(directories)){
  const repositories=[]
  for(let page=1;page<=30;page++){
    const rows=JSON.parse(await get(`https://api.github.com/orgs/${owner}/repos?type=public&per_page=100&page=${page}`))
    if(!Array.isArray(rows))throw new Error('Invalid repository listing')
    repositories.push(...rows.filter(r=>!r.fork).map(r=>({name:r.name,url:r.html_url,archived:r.archived})))
    if(rows.length<100)break
    if(page===30)throw new Error('Incomplete repository pagination')
  }
  communities[slug]||={links:[]}
  communities[slug].repositories=repositories.sort((a,b)=>Number(a.archived)-Number(b.archived)||a.name.localeCompare(b.name))
  communities[slug].repositorySource=`https://github.com/${owner}`
  console.log(`${owner}: ${repositories.length} repositories`)
}
await atomicWriteJson('data/community-resources.json',{checkedAt:new Date().toISOString(),sourceRevision:revision,communities})
console.log(`Resources for ${Object.keys(communities).length} organizations; ${Object.values(communities).filter(c=>c.links.length).length} with published community links`)
