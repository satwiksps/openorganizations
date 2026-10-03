import React, { useState } from "react"
import { Link } from "gatsby"
import { ArrowUpRight, ChevronDown, ExternalLink, Globe, History } from "lucide-react"
import PageLayout from "../components/PageLayout"
import SEO from "../components/SEO"
import OrgLogo from '../components/OrgLogo'
import CommunityResources from '../components/CommunityResources'
import ProjectChart from '../components/ProjectChart'
import AdSlot from '../components/AdSlot'
import SubOrganizations from '../components/SubOrganizations'

function dateLabel(value) {
  if (!value || Number.isNaN(Date.parse(value))) return "Not recorded"
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(value))
}

function Participation({ participation, program, first }) {
  const projects = participation.projects || []
  const statusLabel = { historical: "Past participation", unknown: "Check official timeline", closed: "Applications closed", upcoming: "Upcoming", open: "Check application deadline" }[participation.status] || "Check official timeline"
  return <details className="participation" open={first}>
    <summary><span className="participation-year">{participation.year}</span><span className="participation-title">{program?.name || participation.program}<small>{participation.cohort && participation.cohort !== String(participation.year) ? participation.cohort : "Annual program"}{projects.length ? ` · ${projects.length} ${projects.length === 1 ? "project" : "projects"} indexed` : ""}</small></span>{participation.status !== "historical" && <span className="status-badge">{statusLabel}</span>}<ChevronDown size={17} className="chevron" aria-hidden="true" /></summary>
    <div className="participation-content">
      <div className="participation-links"><a href={participation.sourceUrl} target="_blank" rel="noreferrer">Participation source <ArrowUpRight size={14} /></a>{participation.applicationUrl && !projects.some(project => project.applicationUrl) && <a href={participation.applicationUrl} target="_blank" rel="noreferrer">Program / application details <ExternalLink size={13} /></a>}{participation.applicationDeadline && <span>Application deadline: {dateLabel(participation.applicationDeadline)}</span>}</div>
      {projects.length > 0 ? <ul className="project-list">{projects.map((project, index) => <li key={`${project.url}-${index}`} className="project-item"><a href={project.url} target="_blank" rel="noreferrer">{project.title}<ArrowUpRight size={14} aria-hidden="true" /></a>{project.applicationUrl && project.applicationUrl !== project.url && <a className="project-mentorship-link" href={project.applicationUrl} target="_blank" rel="noreferrer">Mentorship details <ExternalLink size={12} /></a>}{project.product && <p>{project.product}</p>}{project.description && <p>{project.description}</p>}</li>)}</ul> : <p className="no-projects">Project details are available from the participation source. This record does not list individual projects.</p>}
      <details className="participation-source"><summary>Source checked {dateLabel(participation.verifiedAt)}</summary><p>{participation.sourceNote || "See the program source for current details."}{participation.sourceAttribution && <> Imported and normalized from {participation.sourceAttribution}, <a href={participation.sourceLicense === "CC-BY-SA-4.0" ? "https://creativecommons.org/licenses/by-sa/4.0/" : participation.sourceLicense === "CC-BY-3.0" ? "https://creativecommons.org/licenses/by/3.0/" : participation.sourceUrl}>{participation.sourceLicense}</a>.</>}</p></details>
    </div>
  </details>
}

export default function OrganizationPage({ pageContext: { organization, programs } }) {
  const [selected, setSelected] = useState("all")
  const ids = [...new Set(organization.participations.map(p => p.program))]
  const visible = organization.participations.filter(p => selected === "all" || p.program === selected).sort((a, b) => b.year - a.year || a.program.localeCompare(b.program) || b.cohort.localeCompare(a.cohort))
  const issueUrl = `https://github.com/satwiksps/openorganizations/issues/new?template=data-correction.yml&title=${encodeURIComponent(`Data correction: ${organization.name}`)}`
  return <PageLayout wide>
    <h1 className="organization-page-title">{organization.name}</h1>
    <div className="organization-overview">
      <section className="organization-summary" aria-label="Organization overview">
        <OrgLogo organization={organization} detail/>
        <div className="detail-actions"><a className="button-primary" href={organization.website} target="_blank" rel="noreferrer"><Globe size={16}/>{organization.websiteIsSource?'Program source':'Visit website'}<ArrowUpRight size={14}/></a></div>
        <p className="detail-description">{organization.description}</p>
        <h2 className="summary-label">Category</h2><span className="detail-category">{organization.category}</span>
        <h2 className="summary-label">Years</h2><div className="summary-years">{[...new Set(organization.participations.map(p=>p.year))].sort((a,b)=>b-a).map(year=><a className="year-chip" key={year} href={organization.participations.find(p=>p.year===year).sourceUrl} target="_blank" rel="noreferrer">{year}</a>)}</div>
        {organization.technologies.length>0&&<><h2 className="summary-label">Technologies</h2><div className="detail-tags">{organization.technologies.map(tag=><Link key={tag} to={`/?tech=${encodeURIComponent(tag)}`}>{tag}</Link>)}</div></>}
        {organization.topics.length>0&&<><h2 className="summary-label">Topics</h2><div className="detail-tags topic-tags">{organization.topics.map(tag=><Link key={tag} to={`/?topic=${encodeURIComponent(tag)}`}>{tag}</Link>)}</div></>}
        <a className="correction-link" href={issueUrl} target="_blank" rel="noreferrer">Suggest a correction <ArrowUpRight size={12}/></a>
      </section>
      <div className="organization-context"><section className="overview-chart"><h2>Project history</h2><ProjectChart records={organization.participations} program={ids.length===1?ids[0]:'all'}/></section><CommunityResources organization={organization}/><AdSlot placement="profile"/></div>
    </div>
    {organization.proposals?.length>0&&<section className="detail-section"><div className="detail-section-title"><h2>Proposal examples</h2><Link to="/proposals/">Browse the proposal library →</Link></div><p className="suborg-explainer">Outcomes are reported by the linked archives.</p><div className="proposal-folders">{[...new Map(organization.proposals.filter(p=>p.folderUrl).map(p=>[p.folderUrl,p])).values()].map(p=><a key={p.folderUrl} href={p.folderUrl} target="_blank" rel="noreferrer">{p.sourceLabel} · {p.year} folder ↗</a>)}</div><ul className="profile-proposals">{organization.proposals.map(p=><li key={p.id}><span className={`outcome outcome-${p.outcome}`}>{p.year} · {p.outcome}</span><a href={p.url} target="_blank" rel="noreferrer">{p.title} ↗</a></li>)}</ul></section>}
    <SubOrganizations organization={organization}/>
    <section className="detail-section" aria-labelledby="participation-title"><div className="detail-section-title"><h2 id="participation-title">Programs & participation</h2><span>{organization.participations.length} {organization.participations.length === 1 ? "record" : "records"} across {ids.length} {ids.length === 1 ? "program" : "programs"}</span></div>
      {ids.length > 1 && <div className="detail-program-tabs" role="group" aria-label="Filter participation by program"><button type="button" aria-pressed={selected === "all"} onClick={() => setSelected("all")}>All programs</button>{ids.map(id => <button type="button" key={id} aria-pressed={selected === id} onClick={() => setSelected(id)}>{programs.find(p => p.id === id)?.label || id}</button>)}</div>}
      <div className="participation-list">{visible.map((participation, index) => <Participation key={participation.id} participation={participation} program={programs.find(p => p.id === participation.program)} first={index === 0} />)}</div>
    </section>
  </PageLayout>
}

export const Head = ({ pageContext: { organization } }) => <SEO title={organization.name} description={`${organization.description} Explore participation history, technologies and official project sources.`.slice(0, 300)} path={`/organizations/${organization.slug}/`} />
