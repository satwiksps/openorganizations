import test from 'node:test'
import assert from 'node:assert/strict'
import { parseLfxHistory } from './lfx-history.mjs'

test('historical parser excludes samples and intermediate SIG headings',()=>{
  const text=`### Sample
#### Fake
##### Example
- Description: not a selected project
## List of Selected Projects
#### Kubernetes
##### SIG Storage
###### [CSI driver](https://mentorship.lfx.linuxfoundation.org/project/one)
- Description: selected project
##### A second project
- Description: selected project
- LFX URL: https://mentorship.lfx.linuxfoundation.org/project/two
`
  assert.deepEqual(parseLfxHistory(text,'https://example.org',2021,'2021/test').map(r=>[r.name,r.title]),[['Kubernetes','CSI driver'],['Kubernetes','A second project']])
})
test('completed tables count project rows, not mentors or template headings',()=>{
  const text=`#### Completed Projects
| CNCF Projects | Community Bridge Project | Mentor |
| --- | --- | --- |
| Kubernetes | CSI driver | A |
| CoreDNS | DNS backend | B |
`
  assert.equal(parseLfxHistory(text,'https://example.org',2019,'2019/README.md').length,2)
})
