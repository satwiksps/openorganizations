import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { atomicWriteJson } from './build-data.mjs'
const directory=JSON.parse(await readFile('data/directory.json','utf8'))
let previous={logos:{}}
try{previous=JSON.parse(await readFile('data/logos.json','utf8'))}catch(error){if(error.code!=='ENOENT')throw error}
await mkdir('static/logos',{recursive:true})
const logos={}, failures=[];let cursor=0,completed=0
const knownOwners={cncf:'cncf',numfocus:'numfocus','the-apache-software-foundation':'apache','kde-community':'KDE','python-software-foundation':'python'}
function safePublicUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!/^(?:localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(u.hostname)&&u.hostname.includes('.')}catch{return false}}
async function request(url){
  if(!safePublicUrl(url))throw new Error('Not a public HTTPS URL')
  const r=await fetch(url,{signal:AbortSignal.timeout(7000),headers:{'User-Agent':'OpenOrganizations logo cache'},redirect:'error'})
  if(!r.ok)throw new Error(`HTTP ${r.status}`)
  if(Number(r.headers.get('content-length'))>2*1024*1024)throw new Error('Image too large')
  const reader=r.body.getReader(),chunks=[];let size=0
  while(true){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024){await reader.cancel();throw new Error('Image too large')}chunks.push(value)}
  return{bytes:Buffer.concat(chunks),type:r.headers.get('content-type')||''}
}
function extension(bytes){
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return'png'
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return'jpg'
  if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')return'webp'
  if(bytes.subarray(0,3).toString()==='GIF')return'gif'
  if(bytes.subarray(0,4).equals(Buffer.from([0,0,1,0])))return'ico'
  // Remote SVGs are not copied into a public executable document surface.
  return null
}
await Promise.all(Array.from({length:12},async()=>{while(cursor<directory.organizations.length){
  const org=directory.organizations[cursor++],cached=previous.logos[org.slug]
  if(cached){try{await access(`static${cached.path}`);logos[org.slug]=cached;completed++;continue}catch{}}
  const candidates=[]
  if(org.logoUrl)candidates.push(org.logoUrl.replace(/=w\d+(?:-h\d+)?$/, '=w256'))
  const owner=knownOwners[org.slug]||(!org.websiteIsSource&&new URL(org.website).hostname==='github.com'?new URL(org.website).pathname.split('/')[1]:null)
  if(owner)candidates.push(`https://avatars.githubusercontent.com/${encodeURIComponent(owner)}?s=160`)
  if(!org.websiteIsSource){const origin=new URL(org.website).origin.replace(/^http:/,'https:');candidates.push(`${origin}/favicon.ico`)}
  for(const url of [...new Set(candidates)]){try{const{bytes}=await request(url);const ext=extension(bytes);if(!ext||bytes.length<100)continue
    const path=`/logos/${createHash('sha256').update(bytes).digest('hex').slice(0,20)}.${ext}`
    await writeFile(`static${path}`,bytes);logos[org.slug]={path,sourceUrl:url,checkedAt:new Date().toISOString(),kind:url.includes('favicon.ico')?'Website icon':'Organization image'};break
  }catch{}}
  if(!logos[org.slug])failures.push(org.slug)
  completed++;if(completed%100===0)console.log(`Logos: ${completed}/${directory.organizations.length} checked; ${Object.keys(logos).length} cached`)
}}))
await atomicWriteJson('data/logos.json',{checkedAt:new Date().toISOString(),logos,missing:failures.sort()})
console.log(`Cached ${Object.keys(logos).length} organization images; ${failures.length} use visible initials fallbacks.`)
