import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {attachProposals} from '../src/lib/enrichment.mjs'
export async function exportApi(root=resolve(dirname(fileURLToPath(import.meta.url)),'..')) {
  const directory=JSON.parse(await readFile(resolve(root,'data/directory.json'),'utf8'))
  const resources=JSON.parse(await readFile(resolve(root,'data/proposals.json'),'utf8'))
  const output=resolve(root,'public/api/v1')
  await mkdir(resolve(output,'organizations'),{recursive:true})
  const meta={version:1,generatedAt:directory.generatedAt,coverage:'Organizations with indexed participation since 2016; earlier history retained. First appearance is based on indexed coverage, not a guarantee of first-ever participation.',sources:'/sources/'}
  const proposals=attachProposals(directory.organizations,resources.proposals)
  const write=(path,data)=>writeFile(resolve(output,path),JSON.stringify(data)+'\n')
  await write('organizations.json',{meta,organizations:directory.organizations})
  await write('programs.json',{meta,programs:directory.programs})
  await write('proposals.json',{meta:{...meta,checkedAt:resources.checkedAt},sources:resources.sources,proposals})
  for(const organization of directory.organizations){
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(organization.slug))throw Error('Unsafe organization slug')
    await write(`organizations/${organization.slug}.json`,{meta,organization,proposals:proposals.filter(p=>p.organizationSlug===organization.slug)})
  }
  console.log(`Exported public API: ${directory.organizations.length} organizations, ${directory.programs.length} programs, ${proposals.length} proposals.`)
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))exportApi().catch(error=>{console.error(error.message);process.exitCode=1})
