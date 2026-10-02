import React, { useId, useState } from 'react'
import { projectSeries } from '../lib/project-series.mjs'

export default function ProjectChart({ records, program, title = 'Projects by year' }) {
  const id = useId()
  const [by, setBy] = useState('year')
  const years = [...new Set(records.map(p => p.year))].sort((a,b) => b-a)
  const [year, setYear] = useState('')
  const selectedYear = years.includes(Number(year)) ? Number(year) : years[0]
  const rows = projectSeries(records, { by, year: by === 'term' ? selectedYear : undefined })
  const max = Math.max(1,...rows.map(r => r.projects))
  if (!records.length) return null
  return <figure className="project-chart" aria-labelledby={id}>
    <div className="chart-heading"><figcaption id={id}>{by === 'term' ? 'Projects by term' : title}</figcaption>{program === 'lfx' && <div className="chart-controls"><select aria-label="Chart grouping" value={by} onChange={e => setBy(e.target.value)}><option value="year">By year</option><option value="term">By term</option></select>{by === 'term' && <select aria-label="Chart year" value={selectedYear} onChange={e => setYear(e.target.value)}>{years.map(y => <option key={y}>{y}</option>)}</select>}</div>}</div>
    <div className="chart-scroll"><div className={`chart-bars ${by === 'term' ? 'chart-terms' : ''}`} style={{ minWidth: by === 'term' ? '100%' : `${rows.length*36}px` }} role="list" aria-label="Indexed project counts">{rows.map(row => <div className="chart-column" key={row.label} role="listitem" aria-label={`${row.label}: ${row.projects} indexed projects`} title={`${row.label}: ${row.projects} indexed projects`}><span className="chart-value">{row.projects}</span><span className="chart-bar" style={{height:`${Math.max(2,row.projects/max*104)}px`}}/><span className="chart-label">{row.label}</span></div>)}</div></div>
    <p className="chart-note">Indexed project records; missing years are not zero. <a href="/sources/">Coverage</a></p>
  </figure>
}
