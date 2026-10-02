import React, { useEffect, useRef, useState } from "react"

// A certified CMP must bridge its actual consent decision to this event.
// This component never infers consent from region, continued browsing or time.
export default function AdSlot({ placement = 'directory' }) {
  const client = process.env.GATSBY_ADSENSE_CLIENT || ""
  const slots = { directory: process.env.GATSBY_ADSENSE_SLOT, profile: process.env.GATSBY_ADSENSE_PROFILE_SLOT, proposals: process.env.GATSBY_ADSENSE_PROPOSALS_SLOT }
  const slot = slots[placement] || process.env.GATSBY_ADSENSE_SLOT || ""
  const configured = /^ca-pub-\d{16}$/.test(client) && /^\d+$/.test(slot)
  const [consented, setConsented] = useState(false)
  const [nearby, setNearby] = useState(false)
  const [preview, setPreview] = useState(false)
  const container = useRef(null)
  const requested = useRef(false)
  useEffect(() => {
    setPreview(['127.0.0.1', 'localhost'].includes(window.location.hostname) && new URLSearchParams(window.location.search).get('ad-preview') === '1')
  }, [])
  useEffect(() => {
    if (!configured) return
    const update = () => setConsented(window.__ooAdsConsent === true)
    update()
    window.addEventListener("openorganizations:ads-consent", update)
    return () => window.removeEventListener("openorganizations:ads-consent", update)
  }, [configured])
  useEffect(() => {
    if (!configured || !container.current) return
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setNearby(true); observer.disconnect() } }, { rootMargin: '300px' })
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [configured])
  useEffect(() => {
    if (preview || !consented || !configured || !nearby || requested.current) return
    requested.current = true
    if (!document.querySelector("script[data-openorganizations-ads]")) {
      const script = document.createElement("script")
      script.async = true
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`
      script.crossOrigin = "anonymous"
      script.dataset.openorganizationsAds = "true"
      document.head.appendChild(script)
    }
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}) } catch { /* Ad blockers must not break the directory. */ }
  }, [consented, configured, client, nearby, preview])
  if (preview) return <aside className={`ad-slot ad-slot-${placement} ad-preview`} aria-label="Advertisement placement preview"><span>Advertisement · local preview</span><div>Reserved ad space</div></aside>
  if (!configured) return null
  return <aside ref={container} className={`ad-slot ad-slot-${placement}`} aria-label="Advertisement"><span>Advertisement</span>{consented && <ins className="adsbygoogle" style={{ display: "block", height: '90px' }} data-ad-client={client} data-ad-slot={slot} data-ad-format="horizontal" data-full-width-responsive="true" />}</aside>
}
