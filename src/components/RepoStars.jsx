import React,{useEffect,useState} from 'react'
import {Star} from 'lucide-react'
import snapshot from '../../data/repository.json'
export default function RepoStars({compact=false}){
  const [stars,setStars]=useState(Number.isSafeInteger(snapshot.stars)?snapshot.stars:null)
  const [fresh,setFresh]=useState(false)
  useEffect(()=>{
    const key='openorganizations:stars:v1',controller=new AbortController()
    try{const cache=JSON.parse(localStorage.getItem(key));if(cache&&Number.isSafeInteger(cache.count)&&cache.count>=0&&Date.now()-cache.at<6*60*60*1000){setStars(cache.count);setFresh(true);return}}catch{}
    fetch('https://api.github.com/repos/satwiksps/openorganizations',{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Stars unavailable');return r.json()}).then(data=>{
      if(!Number.isSafeInteger(data.stargazers_count)||data.stargazers_count<0)return
      setStars(data.stargazers_count);setFresh(true)
      try{localStorage.setItem(key,JSON.stringify({count:data.stargazers_count,at:Date.now()}))}catch{}
    }).catch(()=>{})
    return()=>controller.abort()
  },[])
  return <a className={`repo-stars ${compact?'repo-stars-compact':''}`} href="https://github.com/satwiksps/openorganizations" target="_blank" rel="noreferrer" title={fresh?'Recent GitHub star count':snapshot.checkedAt?`Last checked ${snapshot.checkedAt.slice(0,10)}`:'Star count currently unavailable'}>
    <span className="repo-stars-top"><Star size={16} aria-hidden="true"/><strong>Star on GitHub</strong><span className="repo-star-count" aria-label={stars===null?'Star count unavailable':`${stars} GitHub stars`}>{stars===null?'—':stars.toLocaleString('en-US')}</span></span>
    <span className="repo-cookie">Please star for a cookie <span aria-hidden="true">🍪</span></span>
  </a>
}
