export const nameKey = value => String(value || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'')
const proposalAliases = {processingfoundation:'processing',beagleboard:'beagleboardorg',boost:'boostclibraries',cdli:'cuneiformdigitallibraryinitiative',nrnb:'nationalresourcefornetworkbiologynrnb',kde:'kdecommunity',gnome:'gnomefoundation',owasp:'owaspfoundation',r:'rprojectforstatisticalcomputing',ml4sci:'machinelearningforscienceml4sciumbrellaorganization',julialanguage:'thejulialanguage',mesa:'projectmesa',ccextractor:'ccextractordevelopment',castorsoftware:'castor',ga4gh:'globalallianceforgenomicshealth',haskell:'haskellorg'}
Object.assign(proposalAliases, {"julia":"thejulialanguage","apachesoftwarefoundation":"theapachesoftwarefoundation","apertus":"apertusassociation","cdf":"continuousdeliveryfoundation","dialatunfoundation":"digitalimpactalliancedialatunfoundation","gfoss":"opentechnologiesalliancegfoss","uccross":"centerforresearchinopensourcesoftwarecrossatucsantacruz","liquidgalaxy":"liquidgalaxyproject","circuitverse":"circuitverseorg","gnu":"gnuproject","palisadoes":"thepalisadoesfoundation","stratosphereresearchlaboratory":"stratospherelaboratoryczechtechnicaluniversityinprague","52north":"52northinitiativeforgeospatialopensourcesoftwaregmbh","d4cg":"dataforthecommongood","pecan":"pecanproject","su2foundation":"stichtingsu2","unicode":"unicodeinc","blender":"blenderfoundation","django":"djangosoftwarefoundation","osipi":"openscienceinitiativeforperfusionimaging","cbioportal":"cbioportalforcancergenomics","kro":"krokuberesourceorchestrator","cncfharbor":"harbor","cncfkonveyor":"konveyor","cncfkcl":"kcl","cncfkyverno":"kyverno"})
export function attachProposals(organizations, proposals) {
  const names=new Map()
  organizations.forEach(org=>[org.name,...(org.aliases||[])].forEach(name=>names.set(nameKey(name),org)))
  return proposals.map(proposal=>{
    const key=nameKey(proposal.organizationName)
    const org=names.get(key) || names.get(proposalAliases[key])
    return {...proposal,...(org?{organizationSlug:org.slug,organizationName:org.name}:{})}
  })
}
const words = text => String(text).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
function mentions(title, name) {
  const term=words(name)
  return term.length>=3 && (` ${words(title)} `).includes(` ${term} `)
}
export function summarizeUmbrella(parent, group, organizations) {
  if(group.program) return organizations.filter(org=>org.participations.some(p=>p.program===group.program)).map(org=>{
    const records=org.participations.filter(p=>p.program===group.program),years=[...new Set(records.map(p=>p.year))].sort((a,b)=>b-a)
    return {name:org.name,organizationSlug:org.slug,website:org.website,years,projectCount:records.reduce((n,p)=>n+p.projects.length,0),ideaYears:[],evidence:records.map(p=>({year:p.year,url:p.sourceUrl,title:p.cohort})),basis:'Program records'}
  }).sort((a,b)=>b.years.length-a.years.length||a.name.localeCompare(b.name))
  const results=group.candidates.map(c=>({...c, years:[],projectCount:0,evidence:[],basis:'Named project titles'}))
  for(const participation of parent.participations.filter(p=>p.program==='gsoc')) for(const project of participation.projects){
    // Count only unambiguous named matches. Shared technologies and generic titles
    // remain unassigned; this is deliberately a lower bound, not an acceptance rate.
    let matches=results.filter(c=>mentions(project.title,c.name))
    if(!matches.length) matches=results.filter(c=>(c.aliases||[]).some(name=>mentions(project.title,name)))
    if(matches.length!==1) continue
    const result=matches[0]
    result.years.push(participation.year);result.projectCount++
    result.evidence.push({year:participation.year,url:project.url,title:project.title})
  }
  return results.filter(c=>c.projectCount||c.ideaYears.length).map(c=>({...c,years:[...new Set(c.years)].sort((a,b)=>b-a),ideaYears:[...new Map(c.ideaYears.map(p=>[p.year,p])).values()].sort((a,b)=>b.year-a.year)})).sort((a,b)=>b.years.length-a.years.length||b.ideaYears.length-a.ideaYears.length||a.name.localeCompare(b.name))
}
