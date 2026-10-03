import React, { useId, useState } from "react";
import { ChevronDown, RotateCcw, Search, SlidersHorizontal } from "lucide-react";

function FilterGroup({ name, label, options, selected, onToggle }) {
  const id = useId();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const filtered = options.filter(option => option.label.toLowerCase().includes(search.toLowerCase()));
  const visible = expanded || search ? filtered : filtered.slice(0, name === "years" ? 6 : name === "terms" ? 8 : 5);
  return (
    <fieldset className={`filter-group filter-group-${name}`}>
      <legend><button type="button" className="filter-group-toggle" aria-expanded={!collapsed} aria-controls={`${id}-options`} onClick={() => setCollapsed(value => !value)}>{label}{selected.length > 0 && <span>{selected.length}</span>}<ChevronDown size={14} aria-hidden="true" /></button></legend>
      <div id={`${id}-options`} hidden={collapsed}>
      {options.length > 10 && (
        <div className="filter-search"><Search size={13} aria-hidden="true" /><input aria-label={`Find ${label.toLowerCase()}`} type="search" value={search} placeholder={`Find ${label.toLowerCase()}…`} onChange={event => setSearch(event.target.value)} /></div>
      )}
      <div className="filter-options">
        {visible.map(option => (
          <label className="filter-option" htmlFor={`${id}-${encodeURIComponent(option.value)}`} key={option.value}>
            <input id={`${id}-${encodeURIComponent(option.value)}`} type="checkbox" checked={selected.includes(option.value)} onChange={() => onToggle(name, option.value)} />
            <span>{option.label}</span><span className="filter-option-count">{option.count}</span>
          </label>
        ))}
        {!filtered.length && <p className="filter-no-options">No matching options</p>}
      </div>
      {!search && filtered.length > (name === "years" ? 6 : name === "terms" ? 8 : 5) && <button type="button" className="filter-expand" onClick={() => setExpanded(value => !value)}>{expanded ? "Show less" : `Show all ${filtered.length}`}</button>}
      </div>
    </fieldset>
  );
}

export default function FilterSidebar({ filters, facets, onToggle, onReset, filterCount }) {
  return (
    <div className="filter-sidebar">
      <div className="filter-heading"><h2><SlidersHorizontal size={16} aria-hidden="true" />Filters{filterCount > 0 && <span className="filter-total">{filterCount}</span>}</h2><button type="button" className="reset-filters" onClick={onReset} disabled={!filterCount && !filters.q && filters.program === "all"}><RotateCcw size={13} aria-hidden="true" />Reset</button></div>
      <FilterGroup name="years" label="Years" options={facets.years} selected={filters.years} onToggle={onToggle} />
      {filters.program === 'lfx' && <FilterGroup name="terms" label="Terms" options={facets.terms} selected={filters.terms} onToggle={onToggle} />}
      <FilterGroup name="categories" label="Categories" options={facets.categories} selected={filters.categories} onToggle={onToggle} />
      <FilterGroup name="technologies" label="Technologies" options={facets.technologies} selected={filters.technologies} onToggle={onToggle} />
      <FilterGroup name="topics" label="Topics" options={facets.topics} selected={filters.topics} onToggle={onToggle} />
    </div>
  );
}
