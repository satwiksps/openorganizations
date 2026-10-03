import React from "react";
import OrgLogo from './OrgLogo';
import { Link } from "gatsby";
import { ArrowUpRight } from "lucide-react";
import { getMatchingParticipations, isParticipationOpen } from "../lib/directory.mjs";

export default function OrganizationCard({ organization, filters, programs, today }) {
  const participations = getMatchingParticipations(organization, filters, today);
  const years = [...new Set(participations.map(participation => participation.year))].sort((a, b) => b - a);
  const programIds = [...new Set(participations.map(participation => participation.program))];
  const open = participations.some(participation => isParticipationOpen(participation, today));
  const technologies = organization.technologies || [];

  return (
    <article className="organization-card">
      <Link className="organization-card-link" to={`/organizations/${organization.slug}/`} aria-label={`View ${organization.name}`}>
        <div className="organization-card-heading">
          <div className="organization-logo">
            <OrgLogo organization={organization}/>
          </div>
          <ArrowUpRight className="card-arrow" size={19} aria-hidden="true" />
          <h2 className="organization-name">{organization.name}</h2>
          {organization.category && <span className="organization-category">{organization.category}</span>}
        </div>
        <p className="organization-description">{organization.description}</p>
        <div className="organization-programs" aria-label="Programs">
          {programIds.map(id => <span className={`program-badge program-${id}`} key={id}>{programs.find(program => program.id === id)?.label || id}</span>)}
        </div>
        <div className="organization-years" aria-label="Participation years">
          {years.slice(0, 5).map(year => <span className="year-chip" key={year}>{year}</span>)}
          {years.length > 5 && <span className="year-chip year-chip-more" title={years.slice(5).join(", ")}>+{years.length - 5}</span>}
        </div>
        <div className="organization-technologies" aria-label="Technologies">
          {technologies.slice(0, 4).map(technology => <span className="technology-chip" key={technology}>{technology}</span>)}
          {technologies.length > 4 && <span className="technology-chip technology-chip-more">+{technologies.length - 4}</span>}
        </div>
        {(organization.subOrganizationCount>0 || organization.proposalCount>0)&&<p className="card-resources">{organization.subOrganizationCount>0&&<span>{organization.subOrganizationCount} sub-organizations</span>}{organization.proposalCount>0&&<span>{organization.proposalCount} {organization.proposalCount === 1 ? 'proposal' : 'proposals'}</span>}</p>}
        {open && <p className="organization-meta application-open"><span aria-hidden="true" />Applications open</p>}
      </Link>
    </article>
  );
}
