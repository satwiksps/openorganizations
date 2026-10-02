import {readFile} from 'node:fs/promises'
import {atomicWriteJson,cleanText} from './build-data.mjs'
const revision='51ceb6a8e0446d36b20d45564dd10045f133420b'
const candidates=new Map()
for(let year=2020;year<=2026;year++){
  const path=year===2026?'ideas.html':year===2020?'2020/psf_ideas.html':`${year}/ideas.html`
  const sourceUrl=`https://github.com/python-gsoc/python-gsoc.github.io/blob/${revision}/${path}`
  const response=await fetch(`https://raw.githubusercontent.com/python-gsoc/python-gsoc.github.io/${revision}/${path}`)
  if(!response.ok)throw new Error(`Missing PSF source ${year}`)
  const text=(await response.text()).replace(/<!--[\s\S]*?-->/g,'').split(/<h2[^>]*>\s*(?:Not participating|Friends of)/i)[0]
  const sections=[...text.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2|$)/gi)]
  for(const [,rawName,body] of sections){
    const name=cleanText(rawName)
    const links=[...body.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(([,url,label])=>({url:url.replaceAll('&amp;','&'),label:cleanText(label)})).filter(l=>/^https?:\/\//.test(l.url))
    const homepage=links.find(l=>/^Homepage/i.test(l.label))
    const ideas=links.find(l=>/^Ideas Page/i.test(l.label))
    if(!homepage||!ideas||!name||/Getting started|Ideas for/i.test(name))continue
    const entry=candidates.get(name.toLowerCase())||{name,aliases:[],website:homepage.url,ideaYears:[],communityLinks:[]}
    entry.ideaYears.push({year,sourceUrl});entry.website=homepage.url
    entry.communityLinks=links.filter(l=>/^(Chat|Mailing List|Discussions|Source Code|Slack|Reddit)/i.test(l.label)).slice(0,5)
    candidates.set(name.toLowerCase(),entry)
  }
}
if(candidates.size<8)throw new Error('PSF parser lost coverage')
const data=JSON.parse(await readFile('data/umbrellas.json','utf8'))
data.groups=data.groups.filter(g=>g.parentSlug!=='python-software-foundation')
data.groups.push({parentSlug:'python-software-foundation',sourceUrl:`https://github.com/python-gsoc/python-gsoc.github.io/tree/${revision}`,candidates:[...candidates.values()]})
await atomicWriteJson('data/umbrellas.json',data)
console.log(`Indexed ${candidates.size} Python umbrella communities with source and contact links`)
