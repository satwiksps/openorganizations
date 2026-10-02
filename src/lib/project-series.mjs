export function projectSeries(records, { by = 'year', year } = {}) {
  const buckets = new Map()
  for (const record of records) {
    if (year && Number(record.year) !== Number(year)) continue
    const label = by === 'term' ? record.cohort || String(record.year) : String(record.year)
    const current = buckets.get(label) || { label, year: record.year, projects: 0, records: 0 }
    current.projects += record.projectCount ?? record.projects?.length ?? 0
    current.records++
    buckets.set(label, current)
  }
  return [...buckets.values()].sort((a,b) => a.year-b.year || a.label.localeCompare(b.label, 'en', { numeric: true }))
}
