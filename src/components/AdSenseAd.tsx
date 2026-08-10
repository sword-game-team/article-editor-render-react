import { useEffect, useRef } from 'react'

type AdsByGoogleWindow = Window & {
  adsbygoogle?: Array<Record<string, unknown>>
}

interface AdSenseAdProps {
  publisherId: string
  slotId: string | number
  title: string
}

function normalizePublisherId(publisherId: string): string {
  const value = publisherId.trim()
  if (!value) return ''
  return value.startsWith('ca-pub-') ? value : `ca-pub-${value}`
}

export function AdSenseAd({ publisherId, slotId, title }: AdSenseAdProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const requestedKey = useRef<string | null>(null)
  const adClient = normalizePublisherId(publisherId)
  const adSlot = String(slotId).trim()
  const requestKey = `${adClient}:${adSlot}`

  useEffect(() => {
    const root = rootRef.current
    if (!root || !adClient || !adSlot) return

    const requestAd = () => {
      if (requestedKey.current === requestKey) return

      try {
        const adsWindow = window as AdsByGoogleWindow
        const queue = (adsWindow.adsbygoogle ??= [])
        queue.push({})
        requestedKey.current = requestKey
      } catch (error) {
        console.error('[ArticleContentRenderer] Failed to request AdSense ad:', error)
      }
    }

    if (typeof IntersectionObserver === 'undefined') {
      requestAd()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        requestAd()
        observer.disconnect()
      },
      { rootMargin: '200px 0px' },
    )

    observer.observe(root)
    return () => observer.disconnect()
  }, [adClient, adSlot, requestKey])

  if (!adClient || !adSlot) return null

  return (
    <div ref={rootRef} className="article-ad-wrapper" data-google-ad="true">
      <div className="article-ad-title">{title}</div>
      <ins
        key={requestKey}
        className="adsbygoogle article-ad-unit"
        style={{ display: 'block', width: '100%' }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
      />
    </div>
  )
}

export default AdSenseAd
