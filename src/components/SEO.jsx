import React from "react"
import { graphql, useStaticQuery } from "gatsby"

export default function SEO({ title = "Explore open-source organizations", description = "Find organizations across GSoC, LFX, Summer of Bitcoin, Outreachy, C4GT and more. Search by technology, topic and participation year.", path = "/", noindex = false, children }) {
  const { site } = useStaticQuery(graphql`query OpenOrganizationsSiteUrl { site { siteMetadata { siteUrl } } }`)
  const origin = site.siteMetadata.siteUrl
  const fullTitle = `${title} | OpenOrganizations`
  return <>
    <html lang="en" />
    <title>{fullTitle}</title>
    <meta name="description" content={description} />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#dc6b18" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="canonical" href={`${origin}${path}`} />
    <meta property="og:title" content={fullTitle} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={`${origin}${path}`} />
    <meta name="twitter:card" content="summary" />
    {noindex && <meta name="robots" content="noindex,follow" />}
    {children}
  </>
}
