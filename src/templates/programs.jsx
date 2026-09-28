import React from "react"
import { Link } from "gatsby"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import PageLayout from "../components/PageLayout"
import SEO from "../components/SEO"

export default function ProgramsPage({ pageContext: { programs, organizations } }) {
  return <PageLayout wide><div className="page-eyebrow">Find your path</div><h1>Many programs. One place to explore.</h1><p className="page-intro">Discover communities through open-source mentorships and contribution programs. Check each program’s official site for eligibility, funding and application dates.</p><div className="program-page-grid">{programs.map(program => {
    const orgs = organizations.filter(org => org.participations.some(p => p.program === program.id))
    const years = [...new Set(orgs.flatMap(org => org.participations.filter(p => p.program === program.id).map(p => p.year)))].sort((a,b) => a-b)
    return <article className="program-page-card" key={program.id}><span className="program-label">{program.label}</span><h2>{program.name}</h2><p>{program.description}</p><div className="program-stats"><span><strong>{orgs.length}</strong> organizations indexed</span><span>{years.length ? years.length === 1 ? years[0] : `${years[0]}–${years.at(-1)}` : "Coverage pending"}</span></div><div className="program-coverage">{program.coverage}</div><div className="program-card-actions"><Link className="button-primary" to={`/?program=${program.id}`}>Explore organizations <ArrowRight size={14} /></Link><a href={program.url} target="_blank" rel="noreferrer">Official program <ArrowUpRight size={13} /></a></div></article>
  })}</div></PageLayout>
}
export const Head = () => <SEO title="Open-source programs" description="Explore GSoC, LFX, Summer of Bitcoin, Outreachy, C4GT, European Summer of Code and other open-source programs, with transparent data coverage." path="/programs/" />
