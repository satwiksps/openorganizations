import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "gatsby";
import { ArrowLeft, ArrowRight, Github, Grid2X2, Search, SlidersHorizontal, X } from "lucide-react";
import FilterSidebar from "./FilterSidebar";
import OrganizationCard from "./OrganizationCard";
import AdSlot from "./AdSlot";
import RepoStars from './RepoStars';
import { DEFAULT_FILTERS, PAGE_SIZE, filterOrganizations, getDirectoryFacets, getProgramCounts, normalizeFilters, paginateOrganizations, parseDirectoryQuery, serializeDirectoryQuery } from "../lib/directory.mjs";

const PRIMARY_PROGRAMS = ["gsoc", "lfx", "sob", "esoc", "outreachy", "c4gt"];
const FACET_LABELS = { years: "Year", categories: "Category", technologies: "Technology", topics: "Topic" };

function Brand({ mobile = false, onNavigate }) {
  return <Link className={`directory-brand${mobile ? " mobile-brand" : ""}`} to="/" onClick={onNavigate} aria-label="OpenOrganizations home"><img className="brand-symbol" src="/brand-mark.svg" width="36" height="36" alt=""/><span><span className="brand-name">OpenOrganizations</span><span className="brand-subtitle">Find your open source community</span></span></Link>;
}

export default function Directory({ organizations = [], programs = [], generatedAt = "", location }) {
  const [filters, setFilters] = useState(() => normalizeFilters(DEFAULT_FILTERS));
  const [hydrated, setHydrated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [today, setToday] = useState(() => generatedAt.slice(0, 10));
  const dialogRef = useRef(null);
  const filterTriggerRef = useRef(null);
  const resultsRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const readLocation = () => {
      const next = parseDirectoryQuery(window.location.search);
      if (next.program !== "all" && !programs.some(program => program.id === next.program)) next.program = "all";
      setFilters(next);
    };
    readLocation();
    setHydrated(true);
    setToday(new Date().toISOString().slice(0, 10));
    window.addEventListener("popstate", readLocation);
    return () => window.removeEventListener("popstate", readLocation);
  }, [programs, location?.search, location?.key]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (mobileOpen && dialog && !dialog.open) dialog.showModal();
    if (!mobileOpen && dialog?.open) dialog.close();
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);

  const matching = useMemo(() => filterOrganizations(organizations, filters, today), [organizations, filters, today]);
  const facets = useMemo(() => getDirectoryFacets(organizations, filters, today), [organizations, filters, today]);
  const counts = useMemo(() => getProgramCounts(organizations, programs, filters, today), [organizations, programs, filters, today]);
  const pagination = useMemo(() => paginateOrganizations(matching, filters.page), [matching, filters.page]);
  const filterCount = filters.years.length + filters.categories.length + filters.technologies.length + filters.topics.length + Number(filters.applicationsOpen);
  const primaryPrograms = PRIMARY_PROGRAMS.map(id => programs.find(program => program.id === id)).filter(Boolean);
  const otherPrograms = programs.filter(program => !PRIMARY_PROGRAMS.includes(program.id));
  const activeProgram = programs.find(program => program.id === filters.program);
  const visibleStart = matching.length ? (pagination.page - 1) * PAGE_SIZE + 1 : 0;
  const visibleEnd = Math.min(pagination.page * PAGE_SIZE, matching.length);

  function writeLocation(next, replace = false) {
    if (!hydrated) return;
    const query = serializeDirectoryQuery(next);
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) window.history[replace ? "replaceState" : "pushState"](window.history.state, "", nextUrl);
  }

  function updateFilters(patch, { replace = false, preservePage = false } = {}) {
    const next = normalizeFilters({ ...filters, ...patch, page: preservePage ? patch.page || filters.page : 1 });
    setFilters(next);
    writeLocation(next, replace);
  }

  function toggleFilter(key, value) {
    updateFilters({ [key]: filters[key].includes(value) ? filters[key].filter(item => item !== value) : [...filters[key], value] });
  }

  function resetFilters() {
    const next = normalizeFilters(DEFAULT_FILTERS);
    setFilters(next);
    writeLocation(next);
  }

  function changePage(page) {
    updateFilters({ page }, { preservePage: true });
    resultsRef.current?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }

  const sidebarProps = { filters, facets, onToggle: toggleFilter, onChange: updateFilters, onReset: resetFilters, filterCount };

  return (
    <div className="directory-shell">
      <a className="skip-link" href="#main-content">Skip to organizations</a>
      <aside className="directory-sidebar" aria-label="Directory navigation and filters">
        <Brand onNavigate={resetFilters} />
        <nav className="sidebar-nav" aria-label="Main navigation"><Link to="/" onClick={resetFilters} className="is-active" aria-current="page"><Grid2X2 size={16} aria-hidden="true" />Organizations</Link><Link to="/programs/">Programs<span>{programs.length}</span></Link></nav>
        <FilterSidebar {...sidebarProps} />
        <Link className="sidebar-proposals" to="/proposals/">Explore proposal examples <ArrowRight size={14}/></Link>
        <div className="sidebar-footer"><nav aria-label="Information"><Link to="/about/">About</Link><Link to="/sources/">Data & sources</Link><Link to="/privacy/">Privacy</Link></nav><RepoStars/></div>
      </aside>

      <main className="directory-main" id="main-content" tabIndex={-1}>
        <header className="directory-header">
          <div className="directory-topbar"><Brand mobile onNavigate={resetFilters} /><nav className="mobile-resources"><Link to="/programs/">Programs</Link><Link to="/proposals/">Proposals</Link></nav></div>
          <h1 className="visually-hidden">Open source organizations across mentorship programs</h1>
          <div className="search-field"><Search className="search-icon" size={20} aria-hidden="true" /><input ref={searchRef} type="search" aria-label="Search organizations, technologies, or topics" placeholder="Search organizations, technologies, or topics…" value={filters.q} onChange={event => updateFilters({ q: event.target.value }, { replace: true })} />{filters.q && <button className="search-clear" type="button" aria-label="Clear search" onClick={() => { updateFilters({ q: "" }, { replace: true }); searchRef.current?.focus(); }}><X size={16} aria-hidden="true" /></button>}<kbd aria-hidden="true">Search</kbd></div>
          <div className="program-tabs" role="group" aria-label="Filter by program">
            <button className={`program-tab${filters.program === "all" ? " is-active" : ""}`} type="button" aria-pressed={filters.program === "all"} onClick={() => updateFilters({ program: "all" })}>ALL<span className="program-count">{counts.all || 0}</span></button>
            {primaryPrograms.map(program => <button key={program.id} type="button" className={`program-tab${filters.program === program.id ? " is-active" : ""}`} aria-pressed={filters.program === program.id} title={program.name} onClick={() => updateFilters({ program: program.id })}>{program.label}<span className="program-count">{counts[program.id] || 0}</span></button>)}
            <label className="more-programs"><span className="visually-hidden">More programs</span><select className={`program-tab program-tab-more${otherPrograms.some(program => program.id === filters.program) ? " is-active" : ""}`} value={otherPrograms.some(program => program.id === filters.program) ? filters.program : ""} onChange={event => { if (event.target.value) updateFilters({ program: event.target.value }); }}><option value="" disabled>More</option>{otherPrograms.map(program => <option key={program.id} value={program.id}>{program.label} ({counts[program.id] || 0})</option>)}{!otherPrograms.length && <option disabled>No additional programs yet</option>}</select></label>
          </div>
        </header>

        <section className="directory-results" aria-label="Organizations">
          {activeProgram && <div className="program-coverage">{activeProgram.coverage} <a href={activeProgram.url} target="_blank" rel="noreferrer">Official program ↗</a></div>}
          <div className="directory-toolbar"><p className="result-count" role="status" aria-live="polite"><strong>{matching.length.toLocaleString("en-US")}</strong> {matching.length === 1 ? "organization" : "organizations"}{activeProgram && <span> in {activeProgram.label}</span>}</p><div className="directory-toolbar-actions"><button ref={filterTriggerRef} type="button" className="mobile-filter-button filter-button" onClick={() => setMobileOpen(true)} aria-haspopup="dialog"><SlidersHorizontal size={16} aria-hidden="true" />Filters{filterCount > 0 && <span>{filterCount}</span>}</button><label className="sort-control"><span>Sort by</span><select aria-label="Sort organizations" value={filters.sort} onChange={event => updateFilters({ sort: event.target.value })}><option value="name">Name A–Z</option><option value="recent">Most recent year</option></select></label></div></div>
          {(filterCount > 0 || filters.q) && <div className="active-filters" aria-label="Applied filters">{filters.q && <button type="button" className="filter-chip" onClick={() => updateFilters({ q: "" })} aria-label={`Remove search: ${filters.q}`}>Search: {filters.q}<X size={12} aria-hidden="true" /></button>}{Object.entries(FACET_LABELS).flatMap(([key, label]) => filters[key].map(value => <button key={`${key}-${value}`} type="button" className="filter-chip" onClick={() => toggleFilter(key, value)} aria-label={`Remove ${label.toLowerCase()} filter: ${value}`}>{value}<X size={12} aria-hidden="true" /></button>))}{filters.applicationsOpen && <button type="button" className="filter-chip" onClick={() => updateFilters({ applicationsOpen: false })}>Applications open<X size={12} aria-hidden="true" /></button>}<button type="button" className="reset-filters" onClick={resetFilters}>Clear all</button></div>}
          <div ref={resultsRef} tabIndex={-1} className="results-focus-target">
            {pagination.items.length ? <div className="organization-grid">{pagination.items.map(organization => <OrganizationCard key={organization.id} organization={organization} filters={filters} programs={programs} today={today} />)}</div> : <div className="empty-state"><Search size={32} aria-hidden="true" /><h2>No organizations found</h2><p>{filters.applicationsOpen ? "No verified open applications match these filters. Explore participation history or check the official program pages for new rounds." : "Try a different search or remove a filter to discover more communities."}</p><button type="button" onClick={resetFilters}>Reset filters</button><Link to="/programs/">Explore programs<ArrowRight size={15} aria-hidden="true" /></Link></div>}
          </div>
          {matching.length > 0 && <nav className="pagination" aria-label="Results pages"><p className="pagination-summary">Showing {visibleStart}–{visibleEnd} of {matching.length.toLocaleString("en-US")}</p><div className="pagination-controls"><button type="button" aria-label="Previous page" disabled={pagination.page === 1} onClick={() => changePage(pagination.page - 1)}><ArrowLeft size={16} aria-hidden="true" /><span>Previous</span></button><span>Page <strong>{pagination.page}</strong> of {pagination.totalPages}</span><button type="button" aria-label="Next page" disabled={pagination.page === pagination.totalPages} onClick={() => changePage(pagination.page + 1)}><span>Next</span><ArrowRight size={16} aria-hidden="true" /></button></div></nav>}
          <AdSlot />
          <div className="mobile-star-footer"><RepoStars compact/></div>
          <p className="directory-data-note">Participation history is not a promise of an open application. <Link to="/sources/">Check our sources and coverage.</Link></p>
        </section>
      </main>

      <dialog className="mobile-filter-dialog" ref={dialogRef} aria-labelledby="mobile-filter-title" onClose={() => { setMobileOpen(false); filterTriggerRef.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) setMobileOpen(false); }}>
        <div className="mobile-filter-panel"><div className="mobile-filter-heading"><h2 id="mobile-filter-title">Filter organizations</h2><button type="button" aria-label="Close filters" onClick={() => setMobileOpen(false)} autoFocus><X size={21} aria-hidden="true" /></button></div><div className="mobile-filter-body"><FilterSidebar {...sidebarProps} /></div><button type="button" className="mobile-filter-apply" onClick={() => setMobileOpen(false)}>Show {matching.length} {matching.length === 1 ? "organization" : "organizations"}<ArrowRight size={16} aria-hidden="true" /></button></div>
      </dialog>
    </div>
  );
}
