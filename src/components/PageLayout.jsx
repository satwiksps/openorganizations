import React from 'react'
import { Link } from 'gatsby'
import { ArrowLeft, ArrowUpRight, LayoutGrid, BookOpen, Layers } from 'lucide-react'
import CommunityFooter from './CommunityFooter'
import ProgramIcon from './ProgramIcon'

export function Brand() {
  return <Link className="brand" to="/" aria-label="OpenOrganizations home"><img className="brand-symbol" src="/brand-mark.svg" width="36" height="36" alt=""/><span>Open<span className="brand-accent">Organizations</span></span></Link>
}
export function Footer() {
  return <footer className="page-footer"><nav aria-label="Footer"><Link to="/about/">About</Link><Link to="/sources/">Data & sources</Link><Link to="/privacy/">Privacy</Link><a href="/source.tar.gz">Source code <ArrowUpRight size={13}/></a></nav></footer>
}
const programs=[['gsoc','GSoC'],['lfx','LFX'],['sob','Summer of Bitcoin'],['esoc','ESoC'],['outreachy','Outreachy'],['c4gt','C4GT'],['sok','Season of KDE']]
export default function PageLayout({children,backLabel='All organizations',backTo='/',wide=false}) {
  return <div className="inner-shell"><a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="inner-sidebar"><div className="inner-brand"><Brand/><p>Find your open source community</p></div>
      <nav className="inner-navigation" aria-label="Main navigation"><Link to="/" activeClassName="is-current"><LayoutGrid size={17}/>Organizations</Link><Link to="/programs/" activeClassName="is-current"><Layers size={17}/>Programs</Link><Link to="/proposals/" activeClassName="is-current"><BookOpen size={17}/>Proposals</Link></nav>
      <nav className="inner-programs" aria-label="Browse programs"><h2>Programs</h2>{programs.map(([id,label])=><Link key={id} to={`/?program=${id}`}><ProgramIcon program={id}/>{label}</Link>)}</nav>
      <div className="inner-sidebar-bottom"><CommunityFooter compact/><Footer/></div>
    </aside>
    <div className="inner-workspace"><header className="inner-mobile-header"><Brand/><nav aria-label="Mobile navigation"><Link to="/">Organizations</Link><Link to="/programs/" activeClassName="is-current">Programs</Link><Link to="/proposals/" activeClassName="is-current">Proposals</Link></nav></header>
      <div className="inner-breadcrumb"><Link to={backTo}><ArrowLeft size={15}/>{backLabel}</Link><a href="https://github.com/satwiksps/openorganizations" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={13}/></a></div>
      <main id="main-content" className={`content-page ${wide?'content-page-wide':''}`}>{children}</main><div className="inner-mobile-footer"><CommunityFooter compact/><Footer/></div>
    </div>
  </div>
}
