import React, { useState } from "react"
import { Link } from "gatsby"
import { ArrowUpRight, ChevronDown, ExternalLink, Globe, History } from "lucide-react"
import PageLayout from "../components/PageLayout"
import SEO from "../components/SEO"

function Logo({ organization }) {
  const [failed, setFailed] = useState(false)
  return organization.logoUrl && !failed ? <img className="detail-logo" src={organization.logoUrl} alt="" width="100" height="100" onError={() => setFailed(true)} /> : <span className="logo-fallback" aria-hidden="true">{organization.name.split(/\s+/).slice(0, 2).map(word => word[0]).join("")}</span>
}

function dateLabel(value) {
  if (!value || Number.isNaN(Date.parse(value))) return "Not recorded"
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(value))
}

function Participation({ participation, program, first }) {
  const projects = participation.projects || []
  const statusLabel = { historical: "Past participation", unknown: "Check official timeline", closed: "Applications closed", upcoming: "Upcoming", open: "Check application deadline" }[participation.status] || "Check official timeline"
  return <details className="participation" open={first}>
    <summary><span className="participation-year">{participation.year}</span><span className="participation-title">{program?.name || participation.program}<small>{participation.cohort && participation.cohort !== String(participation.year) ? participation.cohort : "Annual program"}{projects.length ? ` · ${projects.length} ${projects.length === 1 ? "project" : "projects"} indexed` : ""}</small></span><span className="status-badge">{statusLabel}</span><ChevronDown size={17} className="chevron" aria-hidden="true" /></summary>
    <div className="participation-content">
      <div className="participation-links"><a href={participation.sourceUrl} target="_blank" rel="noreferrer">Participation source <ArrowUpRight size={14} /></a>{participation.applicationUrl && !projects.some(project => project.applicationUrl) && <a href={participation.applicationUrl} target="_blank" rel="noreferrer">Program / application details <ExternalLink size={13} /></a>}{participation.applicationDeadline && <span>Application deadline: {dateLabel(participation.applicationDeadline)}</span>}</div>
      {projects.length > 0 ? <ul className="project-list">{projects.map((project, index) => <li key={`${project.url}-${index}`} className="project-item"><a href={project.url} target="_blank" rel="noreferrer">{project.title}<ArrowUpRight size={14} aria-hidden="true" /></a>{project.applicationUrl && project.applicationUrl !== project.url && <a className="project-mentorship-link" href={project.applicationUrl} target="_blank" rel="noreferrer">Mentorship details <ExternalLink size={12} /></a>}{project.product && <p>{project.product}</p>}{project.description && <p>{project.description}</p>}</li>)}</ul> : <p className="no-projects">Project details are available from the participation source. This record does not list individual projects.</p>}
      <p className="participation-source">Source checked {dateLabel(participation.verifiedAt)}. {participation.sourceNote || "Availability and eligibility are determined by the program. Follow the source for current details."}{participation.sourceAttribution && <> Imported and normalized from {participation.sourceAttribution}, <a href={participation.sourceLicense === "CC-BY-SA-4.0" ? "https://creativecommons.org/licenses/by-sa/4.0/" : participation.sourceLicense === "CC-BY-3.0" ? "https://creativecommons.org/licenses/by/3.0/" : participation.sourceUrl}>{participation.sourceLicense}</a>.</>}</p>
    </div>
  </details>
}

export default function OrganizationPage({ pageContext: { organization, programs } }) {
  const [selected, setSelected] = useState("all")
  const ids = [...new Set(organization.participations.map(p => p.program))]
  const visible = organization.participations.filter(p => selected === "all" || p.program === selected).sort((a, b) => b.year - a.year || a.program.localeCompare(b.program) || b.cohort.localeCompare(a.cohort))
  const issueUrl = `https://github.com/satwiksps/openorganizations/issues/new?template=data-correction.yml&title=${encodeURIComponent(`Data correction: ${organization.name}`)}`
  return <PageLayout wide>
    <div className="detail-heading"><Logo organization={organization} /><div><div className="page-eyebrow">Organization profile</div><h1>{organization.name}</h1><span className="detail-category">{organization.category}</span></div></div>
    <p className="detail-description">{organization.description}</p>
    <div className="detail-actions"><a className="button-primary" href={organization.website} target="_blank" rel="noreferrer"><Globe size={16} />{organization.websiteIsSource ? "View program source" : "Visit website"} <ArrowUpRight size={14} /></a><a className="button-secondary" href={issueUrl} target="_blank" rel="noreferrer">Suggest a correction <ArrowUpRight size={14} /></a></div>
    <div className="detail-tags" aria-label="Technologies">{organization.technologies.map(tag => <Link key={tag} to={`/?tech=${encodeURIComponent(tag)}`}>{tag}</Link>)}</div>
    <div className="info-note"><History size={16} aria-hidden="true" /> <strong>Participation history.</strong> An organization’s appearance here does not mean applications are currently open. Each program and cohort has its own timeline and eligibility.</div>
    <section className="detail-section" aria-labelledby="participation-title"><div className="detail-section-title"><h2 id="participation-title">Programs & participation</h2><span>{organization.participations.length} records across {ids.length} {ids.length === 1 ? "program" : "programs"}</span></div>
      {ids.length > 1 && <div className="detail-program-tabs" role="group" aria-label="Filter participation by program"><button type="button" aria-pressed={selected === "all"} onClick={() => setSelected("all")}>All programs</button>{ids.map(id => <button type="button" key={id} aria-pressed={selected === id} onClick={() => setSelected(id)}>{programs.find(p => p.id === id)?.label || id}</button>)}</div>}
      <div className="participation-list">{visible.map((participation, index) => <Participation key={participation.id} participation={participation} program={programs.find(p => p.id === participation.program)} first={index === 0} />)}</div>
    </section>
    {organization.topics.length > 0 && <section className="detail-section"><h2>Explore related topics</h2><div className="detail-tags">{organization.topics.map(tag => <Link key={tag} to={`/?topic=${encodeURIComponent(tag)}`}>{tag}</Link>)}</div></section>}
  </PageLayout>
}

export const Head = ({ pageContext: { organization } }) => <SEO title={organization.name} description={`${organization.description} Explore participation history, technologies and official project sources.`.slice(0, 300)} path={`/organizations/${organization.slug}/`} />
