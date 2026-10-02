import {atomicWriteJson} from './build-data.mjs'
const headers={Accept:'application/vnd.github+json',...(process.env.GITHUB_TOKEN?{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`}:{})}
const response=await fetch('https://api.github.com/repos/satwiksps/openorganizations',{headers,signal:AbortSignal.timeout(15000)})
if(!response.ok)throw new Error(`GitHub stars unavailable (${response.status}); previous snapshot retained`)
const data=await response.json()
if(!Number.isSafeInteger(data.stargazers_count)||data.stargazers_count<0)throw new Error('Invalid star count')
await atomicWriteJson('data/repository.json',{repository:'satwiksps/openorganizations',stars:data.stargazers_count,checkedAt:new Date().toISOString()})
console.log(`Updated GitHub star snapshot: ${data.stargazers_count}`)
