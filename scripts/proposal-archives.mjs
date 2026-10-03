import {createHash} from 'node:crypto'
export const extraSources = [
  {repo:'SammanSarkar/GSoC_archive_2025',revision:'bec1685d09e1932836ba63302dac3a76adb9c6c5',year:2025,label:'GSoC 2025 community archive'},
  {repo:'Aritra8438/GSoC_archive',revision:'6e00fd11fef3936d45b605e9205b37fe29db4cb0',label:'GSoC accepted and rejected proposals'},
  {repo:'nirmaltodwal7/GSoC_archive_2026',revision:'331dd0757427a805480fae9e0e5c33c0f32202c6',year:2026,label:'GSoC 2026 upstream archive'},
  {repo:'saketkc/fos-proposals',revision:'e3558e334d8abb4e9ba13257e7af4a58137b92f0',layout:'markdown',label:'FOSS proposal archive'},
  {repo:'JatsuAkaYashvant/Accepted-proposals',revision:'4a2b3e5e77183758187742368c75dd70b6de7399',layout:'metadata',label:'Accepted open-source proposals'},
]
const encode = path => path.split('/').map(encodeURIComponent).join('/')
const markdownOrgs = {'Connexions':'Connexions','Genome-Informatics':'Genome Informatics','BioJS':'BioJS','KDE':'KDE','Mozilla':'Mozilla','Sympy':'SymPy','HimanshuMishra':'Python Software Foundation','Pratyaksh':'Python Software Foundation','SaketC':'Python Software Foundation','Sumith1896':'Python Software Foundation','The-Eclipse':'Eclipse Foundation','kamdjouduplex':'Apache Software Foundation','MovingBlocks':'MovingBlocks','OBF':'Open Bioinformatics Foundation','PSF':'Python Software Foundation','lowRISC':'lowRISC','CCExtractor':'CCExtractor','CNCF':'CNCF','PostgreSQL':'PostgreSQL','ToL':'Tree of Life'}
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.text()}
export async function importExtraProposals({proposals,seenBlobs,checkedAt}){
  for(const source of extraSources){
    const tree=JSON.parse(await get(`https://api.github.com/repos/${source.repo}/git/trees/${source.revision}?recursive=1`))
    if(tree.truncated||!tree.tree?.length)throw new Error(`Incomplete archive: ${source.repo}`)
    for(const file of tree.tree.filter(f=>f.type==='blob'&&/\.(pdf|docx|md)$/i.test(f.path))){
      if(seenBlobs.has(file.sha))continue
      let parts=file.path.split('/'),year=source.year||Number(parts[0]),organizationName=source.year?parts[0]:parts[1],program='gsoc',title=parts.at(-1).replace(/\.(pdf|docx|md)$/i,'').replace(/_/g,' ')
      let outcome=/\/rejected\//i.test(file.path)?'rejected':/\/accepted\//i.test(file.path)||source.year===2025?'accepted':'unknown'
      if(source.layout==='markdown'){
        year=Number(parts[0].replace('GSoC-',''));const folder=parts.at(-2)
        organizationName=Object.entries(markdownOrgs).find(([prefix])=>folder?.startsWith(prefix+'-'))?.[1]
      }else if(source.layout==='metadata'){
        if(!/\.pdf$/i.test(file.path))continue
        program={GSoC:'gsoc',SoB:'sob',C4GT:'c4gt'}[parts[0]];year=Number(parts[1]);outcome='accepted'
        const metadata=await get(`https://raw.githubusercontent.com/${source.repo}/${source.revision}/${encode(parts.slice(0,-1).join('/')+'/metadata.md')}`)
        const field=name=>metadata.match(new RegExp(`\\|\\s*${name}\\s*\\|([^|]+)\\|`,'i'))?.[1].trim()
        organizationName=field('Mentor Organization');title=field('Project')||title
      }
      if(!program||!year||year<2005||year>2026||!organizationName||parts.length<2||/^(README|CONTRIBUTING|AUTHORS)/i.test(parts.at(-1)))continue
      // This archive explicitly labels its TARDIS document 2024 despite its 2025 root.
      if(source.year===2025&&file.path.startsWith('TARDIS-SN/'))year=2024
      const url=`https://github.com/${source.repo}/blob/${source.revision}/${encode(file.path)}`
      const folder=source.layout==='markdown'||source.layout==='metadata'?parts.slice(0,-1):source.year?parts.slice(0,1):parts.slice(0,2)
      seenBlobs.add(file.sha)
      proposals.push({id:createHash('sha256').update(url).digest('hex').slice(0,12),blobSha:file.sha,program,year,organizationName,title,outcome,url,folderUrl:`https://github.com/${source.repo}/tree/${source.revision}/${encode(folder.join('/'))}`,sourceUrl:`https://github.com/${source.repo}`,sourceLabel:source.label,checkedAt,outcomeNote:'Outcome is reported by archive maintainers, not independently verified.'})
    }
  }
}

