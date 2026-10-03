import test from "node:test";
import assert from "node:assert/strict";
import { filterOrganizations, getDirectoryFacets, getMatchingParticipations, getProgramCounts, isParticipationOpen, normalizeFilters, paginateOrganizations, parseDirectoryQuery, serializeDirectoryQuery } from "./directory.mjs";

const organizations = [
  { id: "alpha", name: "Alpha Foundation", category: "Science", technologies: ["Python", "C++"], topics: ["Research"], participations: [{ program: "gsoc", year: 2024, status: "historical" }, { program: "lfx", year: 2025, status: "open", verifiedAt: "2026-09-28", applicationDeadline: "2026-10-01" }, { program: "lfx", year: 2025, status: "historical", cohort: "fall" }] },
  { id: "beta", name: "Béta Project", category: "Web", technologies: ["JavaScript"], topics: ["Accessibility"], participations: [{ program: "gsoc", year: 2025, status: "closed" }] },
  { id: "gamma", name: "Gamma Tools", category: "Science", technologies: ["Python"], topics: ["Research", "CLI"], participations: [{ program: "gsoc", year: 2025, status: "open", verifiedAt: "2026-07-01", applicationDeadline: "2026-08-01" }] },
];
const today = "2026-09-28";

test("program and year must match the same participation", () => {
  assert.deepEqual(filterOrganizations(organizations, { program: "gsoc", years: ["2025"] }, today).map(org => org.id), ["beta", "gamma"]);
  assert.deepEqual(getMatchingParticipations(organizations[0], { program: "gsoc", years: ["2025"] }, today), []);
});

test("open status must belong to the selected program and respect an expired deadline", () => {
  assert.deepEqual(filterOrganizations(organizations, { program: "gsoc", applicationsOpen: true }, today), []);
  assert.deepEqual(filterOrganizations(organizations, { applicationsOpen: true }, today).map(org => org.id), ["alpha"]);
  assert.equal(isParticipationOpen({ status: "applications_open", verifiedAt: today, applicationDeadline: "2026-09-28" }, today), true);
  assert.equal(isParticipationOpen({ status: "upcoming" }, today), false);
});

test("open badges require valid verification and deadline evidence, and a round that has started", () => {
  const open = { status: "open", verifiedAt: today, applicationDeadline: "2026-10-01" };
  assert.equal(isParticipationOpen(open, today), true);
  assert.equal(isParticipationOpen({ ...open, applicationDeadline: undefined }, today), false);
  assert.equal(isParticipationOpen({ ...open, applicationDeadline: "not-a-date" }, today), false);
  assert.equal(isParticipationOpen({ ...open, applicationDeadline: "2027-02-30" }, today), false);
  assert.equal(isParticipationOpen({ ...open, verifiedAt: undefined }, today), false);
  assert.equal(isParticipationOpen({ ...open, verifiedAt: "2026-10-01" }, today), false);
  assert.equal(isParticipationOpen({ ...open, applicationStart: "2026-09-29" }, today), false);
  assert.equal(isParticipationOpen({ ...open, applicationStart: "invalid" }, today), false);
  assert.equal(isParticipationOpen({ ...open, applicationStart: today }, today), true);
  assert.equal(isParticipationOpen(open, ""), false);
});

test("multi-word and accent-insensitive search matches name, technology and topics", () => {
  assert.deepEqual(filterOrganizations(organizations, { q: "beta accessibility" }, today).map(org => org.id), ["beta"]);
  assert.deepEqual(filterOrganizations(organizations, { q: "alpha C++" }, today).map(org => org.id), ["alpha"]);
  assert.deepEqual(filterOrganizations(organizations, { q: "Python Accessibility" }, today), []);
});

test("canonical organizations remain searchable by source aliases", () => {
  const rows = [{ ...organizations[0], name: "Bitcoin Dev Kit", aliases: ["BDK", "Historical Toolkit Name"] }];
  for (const q of ["BDK", "bdk Python", "historical toolkit", "Bitcoin Dev Kit"]) {
    assert.deepEqual(filterOrganizations(rows, { q }, today).map(org => org.id), ["alpha"]);
  }
  assert.deepEqual(filterOrganizations(rows, { q: "BDK", program: "gsoc", years: ["2025"] }, today), []);
});

test("selections within one facet use OR; separate facets intersect", () => {
  assert.deepEqual(filterOrganizations(organizations, { technologies: ["Python", "JavaScript"], topics: ["CLI"] }, today).map(org => org.id), ["gamma"]);
});

test("facet counts omit their own selection and count organizations once", () => {
  const facets = getDirectoryFacets(organizations, { technologies: ["Python"], program: "lfx" }, today);
  assert.deepEqual(facets.years, [{ value: "2025", label: "2025", count: 1 }]);
  assert.equal(facets.technologies.find(option => option.value === "c++").count, 1);
  const missing = getDirectoryFacets(organizations, { topics: ["Removed topic"] }, today);
  assert.equal(missing.topics.find(option => option.value === "removed topic").count, 0);
});

test("program badge counts apply every other filter with participation scoping", () => {
  assert.deepEqual(getProgramCounts(organizations, [{ id: "gsoc" }, { id: "lfx" }], { program: "gsoc", years: ["2025"] }, today), { all: 3, gsoc: 2, lfx: 1 });
});

test("URL filters round-trip special characters and multiple selections", () => {
  const original = normalizeFilters({ q: "C++ & accessibility", program: "lfx", years: [2025, 2024, 2025], categories: ["Science"], technologies: ["C++", "C#"], topics: ["CLI & tooling"], applicationsOpen: true, sort: "recent", page: 3 });
  const restored = parseDirectoryQuery(serializeDirectoryQuery(original));
  assert.deepEqual(restored, { ...original, years: ["2024", "2025"], technologies: ["c#", "c++"] });
  assert.equal(serializeDirectoryQuery({}), "");
});

test("case variants share one facet and matching remains compatible with old URL values", () => {
  const rows = [
    { ...organizations[0], category: "Science", technologies: ["Python", "python", "JavaScript"], topics: ["Research"] },
    { ...organizations[1], category: "science", technologies: ["python", "javascript"], topics: ["research"] },
  ];
  const facets = getDirectoryFacets(rows, {}, today);
  assert.deepEqual(facets.technologies, [{ value: "javascript", label: "JavaScript", count: 2 }, { value: "python", label: "Python", count: 2 }]);
  assert.deepEqual(facets.categories, [{ value: "science", label: "Science", count: 2 }]);
  assert.deepEqual(facets.topics, [{ value: "research", label: "Research", count: 2 }]);
  for (const spelling of ["Python", "PYTHON", "python"]) {
    const filters = parseDirectoryQuery(`?tech=${spelling}&category=SCIENCE&topic=Research`);
    assert.deepEqual(filterOrganizations(rows, filters, today).map(org => org.id), ["alpha", "beta"]);
    assert.equal(serializeDirectoryQuery(filters), "category=science&tech=python&topic=research");
  }
  // Even when filtering leaves only the lowercase source, the label remains stable.
  assert.equal(getDirectoryFacets(rows, { q: "beta" }, today).technologies.find(option => option.value === "python").label, "Python");
});

test("malformed query values cannot create invalid pagination or years", () => {
  assert.equal(parseDirectoryQuery("?page=Infinity&sort=garbage&open=false").page, 1);
  assert.deepEqual(parseDirectoryQuery("?year=2025&year=2025&year=oops").years, ["2025"]);
  assert.equal(parseDirectoryQuery("?page=-3").page, 1);
  assert.equal(parseDirectoryQuery("?page=1.2").page, 1);
});

test("pagination clamps pages after results shrink and handles empty results", () => {
  assert.deepEqual(paginateOrganizations(organizations, 500, 2), { page: 2, totalPages: 2, items: [organizations[2]] });
  assert.deepEqual(paginateOrganizations([], 500), { page: 1, totalPages: 1, items: [] });
});

test("recent sort uses the selected program's latest year without mutating data", () => {
  assert.deepEqual(filterOrganizations(organizations, { program: "gsoc", sort: "recent" }, today).map(org => org.id), ["beta", "gamma", "alpha"]);
  assert.deepEqual(organizations.map(org => org.id), ["alpha", "beta", "gamma"]);
});

test('first-time filter scopes first appearance and latest coverage to each program', () => {
 const rows=[...organizations,{...organizations[1],id:'returning',name:'Returning',participations:[{program:'gsoc',year:2023},{program:'gsoc',year:2025}]}];
 const ids=filters=>filterOrganizations(rows,{...filters,firstTime:true},today).map(o=>o.id);
 assert.deepEqual(ids({program:'gsoc'}),['beta','gamma']);
 assert.deepEqual(ids({program:'gsoc',years:['2024']}),['alpha']);
 assert.deepEqual(ids({program:'gsoc',years:['2023']}),['returning']);
 assert.deepEqual(ids({program:'lfx',terms:['fall']}),['alpha']);
 assert.deepEqual(ids({program:'all'}),['alpha','beta','gamma']);
 assert.deepEqual(ids({program:'gsoc',q:'Alpha'}),[]);
 const facets=getDirectoryFacets(rows,{program:'gsoc',firstTime:true},today);
 assert.equal(facets.years.find(y=>y.value==='2023').count,1);
 assert.equal(facets.years.find(y=>y.value==='2025').count,2);
 assert.equal(parseDirectoryQuery(serializeDirectoryQuery({firstTime:true})).firstTime,true);
 assert.equal(parseDirectoryQuery('?first=false').firstTime,false);
});
