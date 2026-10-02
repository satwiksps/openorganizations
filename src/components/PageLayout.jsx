import React from "react"
import { Link } from "gatsby"
import { ArrowLeft, ArrowUpRight } from "lucide-react"
import RepoStars from './RepoStars'

export function Brand() {
  return <Link className="brand" to="/" aria-label="OpenOrganizations home"><img className="brand-symbol" src="/brand-mark.svg" width="36" height="36" alt=""/><span>Open<span className="brand-accent">Organizations</span></span></Link>
}

export function Footer() {
  return <footer className="page-footer"><RepoStars compact/><nav aria-label="Footer"><Link to="/about/">About</Link><Link to="/sources/">Data & sources</Link><Link to="/privacy/">Privacy</Link><a href="/source.tar.gz">Source code <ArrowUpRight size={13} /></a></nav></footer>
}

export default function PageLayout({ children, backLabel = "All organizations", backTo = "/", wide = false }) {
  return <><a className="skip-link" href="#main-content">Skip to content</a><header className="page-header"><Brand /><nav aria-label="Main navigation"><Link to="/">Organizations</Link><Link to="/programs/">Programs</Link><Link to="/proposals/">Proposals</Link><a href="https://github.com/satwiksps/openorganizations" className="github-link">GitHub <ArrowUpRight size={15} /></a></nav></header><main id="main-content" className={`content-page ${wide ? "content-page-wide" : ""}`}><Link className="back-link" to={backTo}><ArrowLeft size={16} />{backLabel}</Link>{children}</main><Footer /></>
}
