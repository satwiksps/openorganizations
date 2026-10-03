export const STAR_CACHE_KEY = 'openorganizations:stars:v2'
export const STAR_CACHE_TTL = 5 * 60 * 1000
export const STAR_RETURN_TTL = 60 * 1000

const repositoryUrl = 'https://api.github.com/repos/satwiksps/openorganizations'
const validCount = count => Number.isSafeInteger(count) && count >= 0

// Both the desktop and mobile buttons share a request and the last good result.
export function createStarCounter(snapshot, {
  fetcher = (...args) => fetch(...args),
  storage = () => localStorage,
  now = () => Date.now(),
} = {}) {
  const snapshotAt = Date.parse(snapshot.checkedAt)
  let value = {
    count: validCount(snapshot.stars) ? snapshot.stars : null,
    at: Number.isFinite(snapshotAt) && snapshotAt <= now() ? snapshotAt : 0,
  }
  let initialized = false
  let pending = null
  let retryAt = 0
  let invalidated = false
  const listeners = new Set()
  const publish = next => {
    value = next
    for (const listener of listeners) listener(value)
  }

  function hydrate() {
    if (initialized) return
    initialized = true
    try {
      const cached = JSON.parse(storage().getItem(STAR_CACHE_KEY))
      if (cached && validCount(cached.count) && Number.isFinite(cached.at) &&
          cached.at > value.at && cached.at <= now()) publish(cached)
    } catch {}
  }

  function refresh({ maxAge = STAR_CACHE_TTL } = {}) {
    hydrate()
    if (pending) return pending
    const time = now()
    if (time < retryAt || (!invalidated && value.count !== null &&
        time >= value.at && time - value.at < maxAge)) return Promise.resolve(value)
    invalidated = false
    pending = Promise.resolve().then(async () => {
      try {
        const response = await fetcher(repositoryUrl, {
          cache: 'no-cache',
          headers: { Accept: 'application/vnd.github+json' },
          signal: AbortSignal.timeout(10000),
        })
        if (!response.ok) {
          const reset = Number(response.headers?.get('x-ratelimit-reset')) * 1000
          const retry = Number(response.headers?.get('retry-after')) * 1000
          retryAt = Math.max(now() + STAR_CACHE_TTL, reset || 0, now() + (retry || 0))
          throw new Error('GitHub stars unavailable')
        }
        const data = await response.json()
        if (!validCount(data.stargazers_count)) throw new Error('Invalid star count')
        const next = { count: data.stargazers_count, at: now() }
        try { storage().setItem(STAR_CACHE_KEY, JSON.stringify(next)) } catch {}
        publish(next)
        retryAt = 0
      } catch {
        retryAt = Math.max(retryAt, now() + STAR_CACHE_TTL)
      }
      return value
    }).finally(() => { pending = null })
    return pending
  }

  return {
    getSnapshot: () => value,
    subscribe(listener) {
      listeners.add(listener)
      hydrate()
      listener(value)
      return () => listeners.delete(listener)
    },
    invalidate: () => { invalidated = true },
    refresh,
  }
}
