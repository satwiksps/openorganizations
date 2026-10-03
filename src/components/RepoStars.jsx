import React,{useEffect,useState} from 'react'
import {Star} from 'lucide-react'
import snapshot from '../../data/repository.json'
import {createStarCounter,STAR_RETURN_TTL} from '../lib/repository-stars.mjs'
const counter=createStarCounter(snapshot)
export default function RepoStars({compact=false}){
  const [{count:stars,at},setCount]=useState(counter.getSnapshot)
  useEffect(()=>{
    const unsubscribe=counter.subscribe(setCount)
    const refresh=()=>{if(document.visibilityState==='visible')counter.refresh()}
    const onReturn=()=>{if(document.visibilityState==='visible')counter.refresh({maxAge:STAR_RETURN_TTL})}
    refresh()
    const interval=window.setInterval(refresh,60000)
    window.addEventListener('focus',onReturn)
    document.addEventListener('visibilitychange',onReturn)
    return()=>{
      unsubscribe()
      window.clearInterval(interval)
      window.removeEventListener('focus',onReturn)
      document.removeEventListener('visibilitychange',onReturn)
    }
  },[])
  return <a className={`repo-stars ${compact?'repo-stars-compact':''}`} href="https://github.com/satwiksps/openorganizations" target="_blank" rel="noreferrer" onClick={counter.invalidate} onAuxClick={counter.invalidate} aria-label={`Star on GitHub. ${stars===null?'Star count unavailable':`${stars} stars`}. Please star for a cookie!`} title={`Please star for a cookie! 🍪 · ${at?`Last checked ${new Date(at).toISOString().slice(0,16).replace('T',' ')} UTC`:'Star count currently unavailable'}`}>
    <span className="repo-stars-top"><Star size={16} aria-hidden="true"/><strong>Star on GitHub</strong><span className="repo-star-count" aria-label={stars===null?'Star count unavailable':`${stars} GitHub stars`}>{stars===null?'—':stars.toLocaleString('en-US')}</span></span>
  </a>
}
