import { useEffect, useRef, useState } from 'react'
import { AdSenseAd } from './AdSenseAd.js'

interface GoogleTagSlot {
  addService: (service: GoogleTagPubAdsService) => GoogleTagSlot
}

interface GoogleTagSlotRenderEndedEvent {
  slot: GoogleTagSlot
  isEmpty: boolean
}

interface GoogleTagPubAdsService {
  addEventListener: (
    eventName: 'slotRenderEnded',
    listener: (event: GoogleTagSlotRenderEndedEvent) => void,
  ) => void
  removeEventListener?: (
    eventName: 'slotRenderEnded',
    listener: (event: GoogleTagSlotRenderEndedEvent) => void,
  ) => void
}

interface GoogleTagApi {
  cmd: { push: (callback: () => void) => number }
  defineSlot: (adUnitPath: string, size: unknown, elementId: string) => GoogleTagSlot | null
  pubads: () => GoogleTagPubAdsService
  enableServices: () => void
  display: (elementId: string) => void
  destroySlots?: (slots: GoogleTagSlot[]) => boolean
}

type GoogleTagWindow = Window & {
  googletag?: GoogleTagApi
}

interface AdManagerAdProps {
  publisherId: string
  slotId: string | number
  title: string
  fallbackPublisherId?: string
  fallbackSlotId?: string | number
}

function getGoogleTagQueue(): GoogleTagApi {
  const googleTagWindow = window as GoogleTagWindow
  googleTagWindow.googletag ??= { cmd: [] } as unknown as GoogleTagApi
  return googleTagWindow.googletag
}

function buildAdUnitPath(publisherId: string, slotId: string): string {
  const prefix = publisherId.trim().replace(/\/+$/u, '')
  const suffix = slotId.replace(/^\/+|\/+$/gu, '')
  return prefix && suffix ? `${prefix}/${suffix}` : ''
}

export function AdManagerAd({
  publisherId,
  slotId,
  title,
  fallbackPublisherId = '',
  fallbackSlotId,
}: AdManagerAdProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const unitRef = useRef<HTMLDivElement>(null)
  const admSlotId = String(slotId).trim()
  const adsSlotId = fallbackSlotId === undefined ? '' : String(fallbackSlotId).trim()
  const adUnitPath = buildAdUnitPath(publisherId, admSlotId)
  const fallbackKey = `${adUnitPath}:${admSlotId}:${fallbackPublisherId}:${adsSlotId}`
  const [emptyAdmKey, setEmptyAdmKey] = useState<string | null>(null)
  const hasAdSenseFallback = Boolean(fallbackPublisherId.trim() && adsSlotId)
  const shouldUseAdSense = hasAdSenseFallback && emptyAdmKey === fallbackKey

  useEffect(() => {
    const root = rootRef.current
    const unit = unitRef.current
    if (!root || !unit || !adUnitPath || !admSlotId || shouldUseAdSense) return

    let cancelled = false
    let definedSlot: GoogleTagSlot | null = null
    let pubAds: GoogleTagPubAdsService | null = null
    let slotRenderEnded: ((event: GoogleTagSlotRenderEndedEvent) => void) | null = null

    const requestAd = () => {
      const googletag = getGoogleTagQueue()
      googletag.cmd.push(() => {
        if (cancelled) return

        const width = unit.clientWidth
        const height = unit.clientHeight
        const size = width > 0 && height > 0 ? ['fluid', [width, height]] : 'fluid'
        const slot = googletag.defineSlot(adUnitPath, size, admSlotId)
        if (!slot) return

        definedSlot = slot
        pubAds = googletag.pubads()
        slotRenderEnded = (event) => {
          if (cancelled || event.slot !== slot || !event.isEmpty) return
          if (hasAdSenseFallback) setEmptyAdmKey(fallbackKey)
        }

        pubAds.addEventListener('slotRenderEnded', slotRenderEnded)
        slot.addService(pubAds)
        googletag.enableServices()
        googletag.display(admSlotId)
      })
    }

    let observer: IntersectionObserver | null = null
    if (typeof IntersectionObserver === 'undefined') {
      requestAd()
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return
          requestAd()
          observer?.disconnect()
        },
        { rootMargin: '200px 0px' },
      )

      observer.observe(root)
    }

    return () => {
      cancelled = true
      observer?.disconnect()
      const googletag = getGoogleTagQueue()
      googletag.cmd.push(() => {
        if (pubAds && slotRenderEnded) {
          pubAds.removeEventListener?.('slotRenderEnded', slotRenderEnded)
        }
        if (definedSlot) googletag.destroySlots?.([definedSlot])
      })
    }
  }, [adUnitPath, admSlotId, fallbackKey, hasAdSenseFallback, shouldUseAdSense])

  if (shouldUseAdSense) {
    return <AdSenseAd publisherId={fallbackPublisherId} slotId={adsSlotId} title={title} />
  }

  if (!adUnitPath || !admSlotId) return null

  return (
    <div
      ref={rootRef}
      className="article-ad-wrapper article-adm-wrapper"
      data-google-ad-manager="true"
      data-ad-unit-path={adUnitPath}
    >
      <div className="article-ad-title">{title}</div>
      <div ref={unitRef} id={admSlotId} className="article-ad-unit article-adm-unit" />
    </div>
  )
}

export default AdManagerAd
