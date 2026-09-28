import React from "react"
import Directory from "../components/Directory"
import SEO from "../components/SEO"

export default function DirectoryPage({ pageContext, location }) {
  return <Directory organizations={pageContext.organizations} programs={pageContext.programs} generatedAt={pageContext.generatedAt} location={location} />
}
export const Head = () => <SEO />
