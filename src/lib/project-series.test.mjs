import test from 'node:test'
import assert from 'node:assert/strict'
import { projectSeries } from './project-series.mjs'
import { filterOrganizations, getDirectoryFacets, parseDirectoryQuery, serializeDirectoryQuery } from './directory.mjs'

test('project charts count projects, preserve term boundaries, and do not invent missing years',()=>{
  const records=[{year:2020,cohort:'Q1',projects:[{},{}]},{year:2022,cohort:'Term 1',projectCount:3},{year:2022,cohort:'Term 2',projectCount:4},{year:2022,cohort:'Term 1',projectCount:1}]
  assert.deepEqual(projectSeries(records).map(r=>[r.label,r.projects]),[['2020',2],['2022',8]])
  assert.deepEqual(projectSeries(records,{by:'term',year:2022}).map(r=>[r.label,r.projects]),[['Term 1',4],['Term 2',4]])
})
test('term and year filters must belong to the same participation and survive a URL round trip',()=>{
  const organizations=[{id:'a',name:'A',technologies:[],topics:[],participations:[{program:'lfx',year:2024,cohort:'Term 1 · March–May'},{program:'lfx',year:2025,cohort:'Term 2 · June–August'}]}]
  const filters={program:'lfx',years:['2025'],terms:['Term 1 · March–May']}
  assert.equal(filterOrganizations(organizations,filters).length,0)
  assert.deepEqual(parseDirectoryQuery(serializeDirectoryQuery(filters)).terms,filters.terms)
  assert.equal(getDirectoryFacets(organizations,filters).terms.find(t=>t.value==='Term 2 · June–August').count,1)
})
