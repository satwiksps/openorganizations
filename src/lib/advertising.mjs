export function loadAdSense(client) {
  if (typeof document === 'undefined' || !/^ca-pub-\d{16}$/.test(client)) return
  if (document.querySelector('script[data-openorganizations-ads]')) return
  const script=document.createElement('script')
  script.async=true
  script.src=`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`
  script.crossOrigin='anonymous'
  script.dataset.openorganizationsAds='true'
  document.head.appendChild(script)
}
export function isLocalAdPreview() {
  return typeof window !== 'undefined' && ['127.0.0.1','localhost'].includes(window.location.hostname) && new URLSearchParams(window.location.search).get('ad-preview')==='1'
}
