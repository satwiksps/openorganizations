import React from 'react'
import {Database, Heart, Linkedin} from 'lucide-react'
import RepoStars from './RepoStars'
export default function CommunityFooter({compact=false}) {
  return <div className="community-footer"><RepoStars compact={compact}/><nav className="community-socials" aria-label="API and creator profiles"><a href="/api/" target="_blank" rel="noreferrer" title="OpenOrganizations API"><Database size={15}/><span>API</span></a><a href="https://www.linkedin.com/in/satwiksps" target="_blank" rel="noreferrer" aria-label="Satwik on LinkedIn" title="LinkedIn"><Linkedin size={16}/></a><a href="https://x.com/satwiksps" target="_blank" rel="noreferrer" aria-label="Satwik on X" title="X"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.8-9L1 2h6.5l4.4 6.7L18.9 2Zm-1.1 18h1.7L6.6 3.9H4.8L17.8 20Z"/></svg></a></nav><a className="creator-credit" href="https://github.com/satwiksps" target="_blank" rel="noreferrer">Made with <Heart size={12} fill="currentColor" aria-label="love"/> by <strong>satwiksps</strong></a></div>
}
