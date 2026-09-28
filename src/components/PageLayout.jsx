import React from "react"
import { Link } from "gatsby"
import { ArrowLeft, ArrowUpRight } from "lucide-react"

export function Brand() {
  return <Link className="brand" to="/" aria-label="OpenOrganizations home"><span className="brand-mark" aria-hidden="true">&lt;/&gt;</span><span>Open<span className="brand-accent">Organizations</span></span></Link>
}

export function Footer() {
  return <footer className="page-footer"><span>Built for the open-source community.</span><nav aria-label="Footer"><Link to="/about/">About</Link><Link to="/sources/">Data & sources</Link><Link to="/privacy/">Privacy</Link><a href="https://github.com/satwiksps/openorganizations">Source code <ArrowUpRight size={13} /></a></nav></footer>
}

export default function PageLayout({ children, backLabel = "All organizations", backTo = "/", wide = false }) {
  return <><a className="skip-link" href="#main-content">Skip to content</a><header className="page-header"><Brand /><nav aria-label="Main navigation"><Link to="/">Organizations</Link><Link to="/programs/">Programs</Link><a href="https://github.com/satwiksps/openorganizations" className="github-link">GitHub <ArrowUpRight size={15} /></a></nav></header><main id="main-content" className={`content-page ${wide ? "content-page-wide" : ""}`}><Link className="back-link" to={backTo}><ArrowLeft size={16} />{backLabel}</Link>{children}</main><Footer /></>
}
