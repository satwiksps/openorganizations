import React, { useState } from 'react'
import { ArrowUpRight, GitBranch, MessageCircle } from 'lucide-react'

export default function CommunityResources({ organization }) {
  const [query,setQuery] = useState('')
  const [limit,setLimit] = useState(8)
  const links = organization.resources?.links || []
  const repos = organization.resources?.repositories || []
  const filtered = repos.filter(r => r.name.toLowerCase().includes(query.toLowerCase()))
  if (!links.length && !repos.length) return null
  return <section className="detail-section community-resources" id="community"><h2>Get involved</h2>
    {links.length>0 && <><div className="community-links">{links.map(link => <a href={link.url} key={link.url} target="_blank" rel="noreferrer" title={`Published in ${link.year}; view the source for current details`}><MessageCircle size={15}/>{link.label}<ArrowUpRight size={13}/></a>)}</div><p className="resource-caption">Links from the organization’s <a href={organization.resources.sourceUrl}>published listing</a> ({organization.resources.year}). Older contact links may have moved.</p></>}
    {repos.length>0 && <div className="community-repositories"><div className="detail-section-title"><h3>Repositories</h3><span>{repos.length} linked</span></div><p className="resource-caption">{organization.resources.repositorySource ? <>From the <a href={organization.resources.repositorySource}>community’s repository directory</a>. Membership does not imply mentorship participation.</> : 'Repositories linked by published projects. These may include dependencies or mirrors.'}</p>{repos.length>8 && <input type="search" aria-label="Search repositories" placeholder="Find a repository…" value={query} onChange={e=>{setQuery(e.target.value);setLimit(8)}}/>}
    <ul className="repository-grid">{filtered.slice(0,limit).map(repo=><li key={repo.url}><a href={repo.url} target="_blank" rel="noreferrer"><GitBranch size={15}/><span>{repo.name}</span><ArrowUpRight size={13}/></a>{repo.archived && <small>Archived</small>}</li>)}</ul>{!filtered.length&&<p>No repositories match.</p>}{filtered.length>limit&&<button className="show-suborgs" onClick={()=>setLimit(n=>n+50)}>Show {Math.min(50,filtered.length-limit)} more repositories</button>}</div>}
  </section>
}
