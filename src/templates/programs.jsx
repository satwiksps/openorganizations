import React from "react"
import { Link } from "gatsby"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import PageLayout from "../components/PageLayout"
import ProjectChart from '../components/ProjectChart'
import ProgramIcon from '../components/ProgramIcon'
import SEO from "../components/SEO"

export default function ProgramsPage({ pageContext: { programs, organizations } }) {
  return <PageLayout wide><h1>Open-source programs</h1><p className="page-intro">Compare project history and find participating organizations.</p><div className="program-page-grid">{programs.map(program => {
    const orgs = organizations.filter(org => org.participations.some(p => p.program === program.id))
    const years = [...new Set(orgs.flatMap(org => org.participations.filter(p => p.program === program.id).map(p => p.year)))].sort((a,b) => a-b)
    return <article className="program-page-card" key={program.id}><span className="program-label"><ProgramIcon program={program.id}/>{program.label}</span><h2>{program.name}</h2><p>{program.description}</p><div className="program-stats"><span><strong>{orgs.length}</strong> organizations indexed</span><span>{years.length ? years.length === 1 ? years[0] : `${years[0]}–${years.at(-1)}` : "Coverage pending"}</span></div><details className="program-coverage"><summary>Data coverage</summary><p>{program.coverage}</p></details><ProjectChart records={orgs.flatMap(org => org.participations.filter(p => p.program === program.id))} program={program.id}/><div className="program-card-actions"><Link className="button-primary" to={`/?program=${program.id}`}>Explore organizations <ArrowRight size={14} /></Link><a href={program.url} target="_blank" rel="noreferrer">Official program <ArrowUpRight size={13} /></a></div></article>
  })}</div></PageLayout>
}
export const Head = () => <SEO title="Open-source programs" description="Explore GSoC, LFX, Summer of Bitcoin, Outreachy, C4GT, European Summer of Code and other open-source programs, with transparent data coverage." path="/programs/" />
