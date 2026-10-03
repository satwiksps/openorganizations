import test from 'node:test'
import assert from 'node:assert/strict'
import { retainRecentOrganizations } from './build-data.mjs'

test('participation cutoff removes pre-2016-only organizations and preserves full cross-program history',()=>{
  const old={name:'Old',participations:[{program:'gsoc',year:2015}]}
  const retained={name:'Returning',participations:[{program:'gsoc',year:2013},{program:'lfx',year:2016}]}
  const current={name:'Current',participations:[{program:'gsoc',year:2026}]}
  const result=retainRecentOrganizations([old,retained,current])
  assert.deepEqual(result,[retained,current])
  assert.equal(result[0].participations.length,2)
  assert.equal(old.participations.length,1)
})
