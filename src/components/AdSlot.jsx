import React, { useEffect, useRef, useState } from "react"

// A certified CMP must bridge its actual consent decision to this event.
// This component never infers consent from region, continued browsing or time.
export default function AdSlot() {
  const client = process.env.GATSBY_ADSENSE_CLIENT || ""
  const slot = process.env.GATSBY_ADSENSE_SLOT || ""
  const configured = /^ca-pub-\d{16}$/.test(client) && /^\d+$/.test(slot)
  const [consented, setConsented] = useState(false)
  const requested = useRef(false)
  useEffect(() => {
    if (!configured) return
    const update = () => setConsented(window.__ooAdsConsent === true)
    update()
    window.addEventListener("openorganizations:ads-consent", update)
    return () => window.removeEventListener("openorganizations:ads-consent", update)
  }, [configured])
  useEffect(() => {
    if (!consented || !configured || requested.current) return
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
  }, [consented, configured, client])
  if (!configured || !consented) return null
  return <aside className="ad-slot" aria-label="Advertisement"><span>Advertisement</span><ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" /></aside>
}
