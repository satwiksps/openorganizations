export const PAGE_SIZE = 24;
export const DEFAULT_FILTERS = Object.freeze({
  q: "", program: "all", years: [], categories: [], technologies: [], topics: [],
  applicationsOpen: false, sort: "name", page: 1,
});

const unique = values => [...new Set((Array.isArray(values) ? values : []).map(String).map(value => value.trim()).filter(Boolean))];
const fold = value => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const facetValues = values => unique(unique(values).map(fold));
const compare = (a, b) => String(a).localeCompare(String(b), "en", { sensitivity: "base", numeric: true });
const strings = values => (Array.isArray(values) ? values : []).map(value => typeof value === "string" ? value : value?.name || value?.label || "").filter(Boolean);

export function normalizeFilters(input = {}) {
  return {
    q: typeof input.q === "string" ? input.q.slice(0, 300) : "",
    program: typeof input.program === "string" && input.program ? input.program : "all",
    years: unique(input.years).filter(year => /^\d{4}$/.test(year)),
    categories: facetValues(input.categories), technologies: facetValues(input.technologies), topics: facetValues(input.topics),
    applicationsOpen: input.applicationsOpen === true,
    sort: input.sort === "recent" ? "recent" : "name",
    page: Number.isSafeInteger(Number(input.page)) && Number(input.page) > 0 ? Math.min(Number(input.page), 100000) : 1,
  };
}

export function parseDirectoryQuery(search = "") {
  const query = new URLSearchParams(search);
  return normalizeFilters({
    q: query.get("q") || "", program: query.get("program") || "all",
    years: query.getAll("year"), categories: query.getAll("category"),
    technologies: query.getAll("tech"), topics: query.getAll("topic"),
    applicationsOpen: query.get("open") === "1", sort: query.get("sort"), page: query.get("page") || 1,
  });
}

export function serializeDirectoryQuery(input) {
  const filters = normalizeFilters(input);
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.program !== "all") query.set("program", filters.program);
  for (const [key, values] of [["year", filters.years], ["category", filters.categories], ["tech", filters.technologies], ["topic", filters.topics]]) {
    [...values].sort(compare).forEach(value => query.append(key, value));
  }
  if (filters.applicationsOpen) query.set("open", "1");
  if (filters.sort !== "name") query.set("sort", filters.sort);
  if (filters.page > 1) query.set("page", String(filters.page));
  return query.toString();
}

export function isParticipationOpen(participation, today = new Date().toISOString().slice(0, 10)) {
  const status = fold(participation.status).replace(/[ _]+/g, "-");
  if (!["open", "applications-open", "accepting-applications"].includes(status)) return false;
  const validDay = value => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/.test(value)) return null;
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value.slice(0, 10)) return null;
    return value.slice(0, 10);
  };
  const currentDay = validDay(today);
  const verifiedDay = validDay(participation.verifiedAt);
  const deadlineDay = validDay(participation.applicationDeadline);
  if (!currentDay || !verifiedDay || !deadlineDay || verifiedDay > currentDay || deadlineDay < currentDay) return false;
  const start = participation.applicationStart || participation.applicationStartDate || participation.applicationStartsAt;
  if (start && (!validDay(start) || validDay(start) > currentDay)) return false;
  return true;
}

export function getMatchingParticipations(organization, input = {}, today) {
  const filters = normalizeFilters(input);
  return (organization.participations || []).filter(participation =>
    (filters.program === "all" || participation.program === filters.program) &&
    (!filters.years.length || filters.years.includes(String(participation.year))) &&
    (!filters.applicationsOpen || isParticipationOpen(participation, today))
  );
}

function hasAny(selected, values) {
  return !selected.length || values.some(value => selected.includes(fold(value)));
}

function facetLabels(organizations, key) {
  const labels = new Map();
  // Choose from the full dataset so labels stay consistent when program filters change.
  // Prefer source capitalization (Python, JavaScript, CLI) over lowercase variants.
  const rank = value => /[A-Z]/.test(value) ? /[a-z]/.test(value) ? 2 : 1 : 0;
  for (const organization of organizations) {
    const values = key === "categories" ? [organization.category] : strings(organization[key]);
    for (const value of values.filter(Boolean)) {
      const canonical = fold(value), current = labels.get(canonical);
      if (!current || rank(value) > rank(current) || (rank(value) === rank(current) && value.localeCompare(current, "en", { sensitivity: "variant", caseFirst: "upper" }) < 0)) labels.set(canonical, value);
    }
  }
  return labels;
}

export function filterOrganizations(organizations, input = {}, today) {
  const filters = normalizeFilters(input);
  const terms = fold(filters.q).trim().split(/\s+/).filter(Boolean);
  return organizations.filter(organization => {
    if (!getMatchingParticipations(organization, filters, today).length) return false;
    if (!hasAny(filters.categories, [organization.category])) return false;
    if (!hasAny(filters.technologies, strings(organization.technologies))) return false;
    if (!hasAny(filters.topics, strings(organization.topics))) return false;
    const haystack = fold([organization.name, ...strings(organization.aliases), ...strings(organization.subOrganizationNames), organization.description, organization.category, ...strings(organization.technologies), ...strings(organization.topics)].join(" "));
    return terms.every(term => haystack.includes(term));
  }).sort((a, b) => {
    if (filters.sort === "recent") {
      const latest = organization => Math.max(0, ...getMatchingParticipations(organization, filters, today).map(participation => Number(participation.year) || 0));
      const difference = latest(b) - latest(a);
      if (difference) return difference;
    }
    return compare(a.name, b.name) || compare(a.id, b.id);
  });
}

export function getDirectoryFacets(organizations, input = {}, today) {
  const filters = normalizeFilters(input);
  const facets = {};
  for (const key of ["years", "categories", "technologies", "topics"]) {
    const labels = key === "years" ? new Map() : facetLabels(organizations, key);
    const withoutFacet = { ...filters, [key]: [] };
    const matching = filterOrganizations(organizations, withoutFacet, today);
    const counts = new Map();
    for (const organization of matching) {
      const values = key === "years" ? getMatchingParticipations(organization, withoutFacet, today).map(participation => String(participation.year))
        : key === "categories" ? [organization.category] : strings(organization[key]);
      (key === "years" ? unique(values) : facetValues(values)).forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
    }
    filters[key].forEach(value => { if (!counts.has(value)) counts.set(value, 0); });
    facets[key] = [...counts].map(([value, count]) => ({ value, label: labels.get(value) || value, count }))
      .sort((a, b) => key === "years" ? Number(b.value) - Number(a.value) : compare(a.value, b.value));
  }
  return facets;
}

export function getProgramCounts(organizations, programs, input = {}, today) {
  const filters = normalizeFilters(input);
  return Object.fromEntries(["all", ...programs.map(program => program.id)].map(program => [program, filterOrganizations(organizations, { ...filters, program }, today).length]));
}

export function paginateOrganizations(organizations, requestedPage = 1, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(organizations.length / pageSize));
  const page = Math.max(1, Math.min(totalPages, Number(requestedPage) || 1));
  return { page, totalPages, items: organizations.slice((page - 1) * pageSize, page * pageSize) };
}
