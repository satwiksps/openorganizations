import test from 'node:test'
import assert from 'node:assert/strict'
import {createStarCounter,STAR_CACHE_KEY,STAR_CACHE_TTL,STAR_RETURN_TTL} from './repository-stars.mjs'

function fixture({ cached, fetcher, snapshot = {stars:0,checkedAt:'2026-10-02T00:00:00Z'} } = {}) {
  let time = Date.parse('2026-10-03T12:00:00Z')
  let calls = 0
  const data = new Map(cached ? [[STAR_CACHE_KEY, JSON.stringify(cached)]] : [])
  const store = createStarCounter(snapshot, {
    now: () => time,
    storage: () => ({ getItem: key => data.get(key), setItem: (key,value) => data.set(key,value) }),
    fetcher: (...args) => {
      calls++
      return fetcher ? fetcher(...args) : Promise.resolve({ok:true,json:async()=>({stargazers_count:3})})
    },
  })
  return {store,data,calls:()=>calls,now:()=>time,advance:ms=>{time+=ms}}
}

test('stale cache renders immediately, then both buttons receive one shared GitHub request', async () => {
  const f=fixture({cached:{count:1,at:Date.parse('2026-10-03T10:00:00Z')}})
  const desktop=[],mobile=[]
  const stop=f.store.subscribe(value=>desktop.push(value.count))
  f.store.subscribe(value=>mobile.push(value.count))
  const first=f.store.refresh()
  assert.equal(first,f.store.refresh())
  stop()
  await first
  assert.equal(f.calls(),1)
  assert.equal(desktop.at(-1),1)
  assert.equal(mobile.at(-1),3)
  assert.deepEqual(JSON.parse(f.data.get(STAR_CACHE_KEY)),{count:3,at:f.now()})
})

test('fresh cache expires after five minutes and returning to the tab rechecks after one minute', async () => {
  const f=fixture({cached:{count:2,at:Date.parse('2026-10-03T11:59:40Z')}})
  await f.store.refresh()
  assert.equal(f.calls(),0)
  f.advance(STAR_RETURN_TTL)
  await f.store.refresh({maxAge:STAR_RETURN_TTL})
  assert.equal(f.calls(),1)
  f.advance(STAR_CACHE_TTL-1)
  await f.store.refresh()
  assert.equal(f.calls(),1)
  f.advance(1)
  await f.store.refresh()
  assert.equal(f.calls(),2)
})

test('returning from the star link bypasses fresh cache without duplicating focus and visibility requests', async () => {
  const f=fixture()
  await f.store.refresh()
  f.store.invalidate()
  await Promise.all([f.store.refresh({maxAge:STAR_RETURN_TTL}),f.store.refresh({maxAge:STAR_RETURN_TTL})])
  assert.equal(f.calls(),2)
  await f.store.refresh({maxAge:STAR_RETURN_TTL})
  assert.equal(f.calls(),2)
})

test('bad cache values and future timestamps cannot hide the current count', async () => {
  for(const cached of [{count:99,at:Date.parse('2030-01-01')},{count:-1,at:Date.parse('2026-10-03')},{count:99,at:'tomorrow'}]){
    const f=fixture({cached})
    await f.store.refresh()
    assert.equal(f.store.getSnapshot().count,3)
    assert.equal(f.calls(),1)
  }
})

test('an older browser cache never replaces a newer build snapshot', async () => {
  const f=fixture({cached:{count:0,at:Date.parse('2026-10-03T11:00:00Z')},snapshot:{stars:3,checkedAt:'2026-10-03T11:59:50Z'}})
  await f.store.refresh()
  assert.equal(f.store.getSnapshot().count,3)
  assert.equal(f.calls(),0)
})

test('rate limits retain the last count, respect retry headers, and recover later', async () => {
  let ok=false
  const f=fixture({fetcher:async()=>ok?{ok:true,json:async()=>({stargazers_count:4})}:{ok:false,headers:new Headers({'retry-after':'600'})}})
  await f.store.refresh()
  assert.equal(f.store.getSnapshot().count,0)
  f.store.invalidate()
  f.advance(STAR_CACHE_TTL)
  await f.store.refresh()
  assert.equal(f.calls(),1)
  f.advance(STAR_CACHE_TTL)
  ok=true
  await f.store.refresh()
  assert.equal(f.store.getSnapshot().count,4)
})

test('network failures, invalid responses, and synchronous errors allow a later retry', async () => {
  for(const fail of [()=>Promise.reject(new Error('offline')),()=>Promise.resolve({ok:true,json:async()=>({stargazers_count:'3'})}),()=>{throw new Error('blocked')}]){
    let healthy=false
    const f=fixture({fetcher:()=>healthy?Promise.resolve({ok:true,json:async()=>({stargazers_count:0})}):fail()})
    await f.store.refresh()
    assert.equal(f.store.getSnapshot().count,0)
    f.advance(STAR_CACHE_TTL)
    healthy=true
    await f.store.refresh()
    assert.equal(f.calls(),2)
    assert.equal(f.store.getSnapshot().at,f.now())
    assert.equal(f.store.getSnapshot().count,0)
  }
})

test('blocked local storage does not prevent updating the visible count', async () => {
  const store=createStarCounter({}, {storage:()=>{throw new Error('disabled')},fetcher:async()=>({ok:true,json:async()=>({stargazers_count:5})})})
  await store.refresh()
  assert.equal(store.getSnapshot().count,5)
})
