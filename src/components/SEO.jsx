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
    <meta property="og:site_name" content="OpenOrganizations" />
    <meta property="og:image" content={`${origin}/social/openorganizations-landscape.jpg`} />
    <meta property="og:image:width" content="1730" />
    <meta property="og:image:height" content="909" />
    <meta property="og:image:alt" content="OpenOrganizations directory in a browser window under a warm spotlight" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content={`${origin}/social/openorganizations-landscape.jpg`} />
    <meta name="twitter:image:alt" content="Find your open source community with OpenOrganizations" />
    {noindex && <meta name="robots" content="noindex,follow" />}
    {children}
  </>
}
