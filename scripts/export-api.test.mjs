import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {exportApi} from './export-api.mjs';
test('API exports aggregate snapshots and per-organization proposal links',async()=>{
 const root=await mkdtemp(join(tmpdir(),'oo-api-'));
 try {
  await mkdir(join(root,'data'));
  const organization={slug:'example',name:'Example',participations:[{program:'gsoc',year:2025}]};
  await writeFile(join(root,'data/directory.json'),JSON.stringify({generatedAt:'2026-10-03',organizations:[organization],programs:[{id:'gsoc'}]}));
  await writeFile(join(root,'data/proposals.json'),JSON.stringify({checkedAt:'2026-10-01',sources:[],proposals:[{organizationName:'Example',url:'https://example.org/proposal'}]}));
  await exportApi(root);
  const read=async path=>JSON.parse(await readFile(join(root,'public/api/v1',path),'utf8'));
  assert.deepEqual((await read('organizations.json')).organizations,[organization]);
  assert.equal((await read('programs.json')).programs[0].id,'gsoc');
  const single=await read('organizations/example.json');
  assert.equal(single.proposals[0].organizationSlug,'example');
  assert.deepEqual(single.organization,organization);
  assert.equal((await read('proposals.json')).meta.checkedAt,'2026-10-01');
  await assert.rejects(read('organizations/unknown.json'),{code:'ENOENT'});
 } finally {await rm(root,{recursive:true,force:true});}
});
