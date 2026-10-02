import test from 'node:test'
import assert from 'node:assert/strict'
import {attachProposals,summarizeUmbrella} from './enrichment.mjs'
import {filterOrganizations} from './directory.mjs'
const p=(year,titles,program='gsoc')=>({year,program,sourceUrl:'https://example.org/source',projects:titles.map(title=>({title,url:`https://example.org/${encodeURIComponent(title)}`}))})
test('proposal links preserve reported rejection and never invent a match',()=>{
  const orgs=[{name:'The Julia Language',slug:'julia',aliases:[]}]
  const result=attachProposals(orgs,[{organizationName:'Julia Language',outcome:'rejected'},{organizationName:'Unrelated',outcome:'accepted'}])
  assert.equal(result[0].organizationSlug,'julia');assert.equal(result[0].outcome,'rejected');assert.equal(result[1].organizationSlug,undefined)
})
test('umbrella frequency counts distinct years and keeps ideas separate from named projects',()=>{
  const parent={participations:[p(2024,['PyMC inference','PyMC model']),p(2025,['PyMC inference']),p(2026,['Generic project'])]}
  const group={candidates:[{name:'PyMC',aliases:['PyMC3'],ideaYears:[{year:2026,sourceUrl:'https://example.org/ideas'}]},{name:'QuTiP',aliases:[],ideaYears:[{year:2026}]}]}
  const rows=summarizeUmbrella(parent,group,[])
  assert.deepEqual(rows[0].years,[2025,2024]);assert.equal(rows[0].projectCount,3);assert.equal(rows[1].years.length,0);assert.equal(rows[1].ideaYears.length,1)
})
test('ambiguous names, substrings and other programs do not inflate GSoC frequency',()=>{
  const parent={participations:[p(2025,['Stan and PyMC integration','Understanding software']),p(2026,['Stan'], 'outreachy')]}
  const rows=summarizeUmbrella(parent,{candidates:[{name:'Stan',ideaYears:[],aliases:[]},{name:'PyMC',ideaYears:[],aliases:[]}]},[])
  assert.deepEqual(rows,[])
})
test('CNCF aggregates multiple LFX cohorts within a year only once',()=>{
  const rows=summarizeUmbrella({}, {program:'lfx'},[{name:'Kubernetes',slug:'kubernetes',website:'https://kubernetes.io',participations:[p(2024,['a'],'lfx'),p(2024,['b'],'lfx'),p(2025,['c'],'gsoc')]}])
  assert.deepEqual(rows[0].years,[2024]);assert.equal(rows[0].projectCount,2)
})
test('directory search discovers umbrella organizations by their sub-organizations',()=>{
  const org={name:'NumFOCUS',subOrganizationNames:['PyMC'],participations:[p(2026,[])]}
  assert.equal(filterOrganizations([org],{q:'pymc'}).length,1)
})
