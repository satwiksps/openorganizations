import React,{useEffect,useRef,useState} from 'react'
import {X,ChevronUp,ChevronDown} from 'lucide-react'
import {loadAdSense,isLocalAdPreview} from '../lib/advertising.mjs'

// Real overlay creatives, close controls and frequency limits are owned by
// AdSense Auto ads. Never wrap a display ad unit in our own popup.
export default function Advertising({children}) {
  const [preview,setPreview]=useState(false),[anchor,setAnchor]=useState(false),[expanded,setExpanded]=useState(false),[vignette,setVignette]=useState(false)
  const modal=useRef(null)
  useEffect(()=>{
    const local=isLocalAdPreview();setPreview(local)
    if(local)return
    const client=process.env.GATSBY_ADSENSE_CLIENT||''
    if(process.env.GATSBY_ADSENSE_AUTO_ADS!=='true')return
    const update=()=>{if(window.__ooAdsConsent===true)loadAdSense(client)}
    update();window.addEventListener('openorganizations:ads-consent',update)
    return()=>window.removeEventListener('openorganizations:ads-consent',update)
  },[])
  useEffect(()=>{if(vignette&&!modal.current?.open)modal.current?.showModal();if(!vignette&&modal.current?.open)modal.current.close()},[vignette])
  return <>{children}{preview&&<>
    <div className="ad-preview-tools" aria-label="Local ad previews"><span>Local ad previews</span><button onClick={()=>setAnchor(true)}>Anchor</button><button onClick={()=>setVignette(true)}>Vignette</button><button aria-label="Close preview controls" onClick={()=>{setPreview(false);setAnchor(false);setVignette(false)}}><X size={14}/></button></div>
    {anchor&&<aside className={`preview-anchor ${expanded?'is-expanded':''}`} aria-label="Anchor advertisement preview"><div className="ad-controls"><span>Advertisement · preview</span><button aria-label={expanded?'Collapse advertisement':'Expand advertisement'} onClick={()=>setExpanded(!expanded)}>{expanded?<ChevronDown size={16}/>:<ChevronUp size={16}/>}</button><button aria-label="Close anchor advertisement" onClick={()=>setAnchor(false)}><X size={16}/></button></div><div className="ad-preview-creative">Anchor ad placement</div></aside>}
    <dialog ref={modal} className="preview-vignette" aria-labelledby="vignette-title" onClose={()=>setVignette(false)}><div className="ad-controls"><span id="vignette-title">Advertisement · preview</span><button aria-label="Close vignette advertisement" onClick={()=>setVignette(false)} autoFocus><X size={20}/></button></div><div className="ad-preview-creative">Occasional vignette placement</div><p>Preview only. Live ads and their frequency are controlled in AdSense.</p></dialog>
  </>}</>
}
