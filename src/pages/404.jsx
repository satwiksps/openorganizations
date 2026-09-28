import React from "react"
import { Link } from "gatsby"
import PageLayout from "../components/PageLayout"
import SEO from "../components/SEO"
export default function NotFound() { return <PageLayout><div className="not-found"><h1>404</h1><h2>This page isn’t in the directory.</h2><p>The address may have changed. Search the directory to find the organization.</p><Link to="/" className="button-primary">Explore organizations</Link></div></PageLayout> }
export const Head = () => <SEO title="Page not found" path="/404/" noindex />
