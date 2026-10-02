import React, { useEffect, useRef, useState } from 'react'
export default function OrgLogo({organization,detail=false}) {
  const src=organization.localLogo || organization.logoUrl
  const [loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false)
  const imageRef=useRef(null)
  useEffect(()=>{
    const image=imageRef.current
    // A local image can finish before React hydrates, so its load event may be missed.
    setLoaded(Boolean(image?.complete && image.naturalWidth>0))
    setFailed(Boolean(src && image?.complete && !image.naturalWidth))
  },[src])
  const initials=organization.name.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase()
  return <span className={`org-logo ${detail?'org-logo-detail':''} ${organization.logoKind==='Website icon'?'org-logo-icon':''}`}>
    {(!loaded||failed||!src)&&<span className="logo-fallback" aria-label={`${organization.name} initials`}>{initials}</span>}
    {src&&!failed&&<img ref={imageRef} key={src} src={src} alt="" width={detail?100:160} height={detail?100:72} loading={detail?'eager':'lazy'} decoding="async" style={{opacity:loaded?1:0}} onLoad={()=>setLoaded(true)} onError={()=>setFailed(true)}/>}
  </span>
}
