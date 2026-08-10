import { createElement, useEffect, useRef, type ReactElement } from 'react'
import {
  CURRENT_PROTOCOL_VERSION,
  getProtocolAdapter,
  validateArticleDocument,
} from '../protocols/registry.js'
import type {
  AdConfig,
  ArticleButtonClickPayload,
  PubId,
  RenderIssue,
  ResolveArticleButtonLink,
} from '../types.js'
import type { AdSlot } from '../protocols/types.js'
import { DEFAULT_IMAGE_BASE_URL } from '../core/url.js'

const EMPTY_AD_CONF: AdConfig = Object.freeze({
  adm: Object.freeze([]),
  ads: Object.freeze([]),
  loc: Object.freeze([]),
})

const EMPTY_PUBID: PubId = Object.freeze({
  adm: '',
  ads: '',
})

const DEFAULT_AD_TITLE = 'Advertisement'

export interface ArticleContentRendererProps {
  document: unknown
  protocolVersion?: number
  strict?: boolean
  adConf?: AdConfig
  pubid?: PubId
  adTitle?: string
  imageBaseUrl?: string
  resolveArticleButtonLink?: ResolveArticleButtonLink
  onArticleButtonClick?: (payload: ArticleButtonClickPayload) => void
  onRenderError?: (issue: RenderIssue) => void
}

function issueKey(issue: RenderIssue): string {
  return `${issue.code}:${issue.path}:${issue.message}`
}

function issueFingerprint(issues: readonly RenderIssue[]): string {
  return issues.map(issueKey).join('\n')
}

function validateAdConfig(adConf: AdConfig): RenderIssue | null {
  const admLength = adConf.adm?.length ?? 0
  const adsLength = adConf.ads?.length ?? 0
  const locLength = adConf.loc.length
  const admMatches = admLength === 0 || admLength === locLength
  const adsMatches = adsLength === 0 || adsLength === locLength
  const hasAdValues = admLength > 0 || adsLength > 0

  if ((locLength === 0 && !hasAdValues) || (hasAdValues && admMatches && adsMatches)) {
    return null
  }

  return {
    code: 'AD_CONFIG_LENGTH_MISMATCH',
    path: '/adConf',
    message: `Each non-empty adConf.adm or adConf.ads array must have the same length as adConf.loc, and at least one ad array must contain values when loc is non-empty. Received adm length ${admLength}, ads length ${adsLength}, and loc length ${locLength}.`,
  }
}

function createAdSlots(adConf: AdConfig, issue: RenderIssue | null): readonly AdSlot[] {
  if (issue) return []

  return adConf.loc
    .map((location, index) => ({
      index: index + 1,
      location,
      adm: adConf.adm?.[index],
      ads: adConf.ads?.[index],
    }))
    .filter((slot) => Number.isInteger(slot.location) && slot.location >= 1)
}

export function ArticleContentRenderer({
  document,
  protocolVersion = CURRENT_PROTOCOL_VERSION,
  strict = false,
  adConf = EMPTY_AD_CONF,
  pubid = EMPTY_PUBID,
  adTitle = DEFAULT_AD_TITLE,
  imageBaseUrl = DEFAULT_IMAGE_BASE_URL,
  resolveArticleButtonLink,
  onArticleButtonClick,
  onRenderError,
}: ArticleContentRendererProps): ReactElement | null {
  const validation = validateArticleDocument(document, { protocolVersion })
  const adapter = getProtocolAdapter(protocolVersion)
  const runtimeIssues: RenderIssue[] = []
  const reportedRuntimeIssues = useRef(new Set<string>())
  const reportedAdConfigIssue = useRef<string | null>(null)
  const runtimeIssueContext = useRef({
    document,
    protocolVersion,
    resolveArticleButtonLink,
    imageBaseUrl,
  })
  const adConfigIssue = validateAdConfig(adConf)
  const adSlots = createAdSlots(adConf, adConfigIssue)

  if (
    runtimeIssueContext.current.document !== document ||
    runtimeIssueContext.current.protocolVersion !== protocolVersion ||
    runtimeIssueContext.current.resolveArticleButtonLink !== resolveArticleButtonLink ||
    runtimeIssueContext.current.imageBaseUrl !== imageBaseUrl
  ) {
    reportedRuntimeIssues.current.clear()
    runtimeIssueContext.current = {
      document,
      protocolVersion,
      resolveArticleButtonLink,
      imageBaseUrl,
    }
  }

  const canRender = Boolean(adapter) && (!strict || validation.valid)
  const rendered = canRender
    ? adapter?.render(document, {
        adSlots,
        admPublisherId: pubid.adm,
        adsPublisherId: pubid.ads,
        adTitle,
        imageBaseUrl,
        resolveArticleButtonLink,
        emitArticleButtonClick: (payload) => onArticleButtonClick?.(payload),
        reportIssue: (issue) => runtimeIssues.push(issue),
      })
    : null

  const validationIssuesKey = issueFingerprint(validation.issues)
  const runtimeIssuesKey = issueFingerprint(runtimeIssues)
  const adConfigIssueKey = adConfigIssue ? issueKey(adConfigIssue) : ''

  useEffect(() => {
    console.log('[ArticleContentRenderer] adConf:', adConf)
    console.log('[ArticleContentRenderer] pubid:', pubid)
  }, [adConf, pubid])

  useEffect(() => {
    if (!adConfigIssue) {
      reportedAdConfigIssue.current = null
      return
    }
    if (reportedAdConfigIssue.current === adConfigIssueKey) return

    reportedAdConfigIssue.current = adConfigIssueKey
    console.error('[ArticleContentRenderer] Invalid adConf:', adConfigIssue)
    onRenderError?.(adConfigIssue)
  }, [adConfigIssueKey, onRenderError])

  useEffect(() => {
    if (!onRenderError) return
    validation.issues.forEach(onRenderError)
  }, [validationIssuesKey, onRenderError])

  useEffect(() => {
    if (!onRenderError) return
    runtimeIssues.forEach((issue) => {
      const key = issueKey(issue)
      if (reportedRuntimeIssues.current.has(key)) return
      reportedRuntimeIssues.current.add(key)
      onRenderError(issue)
    })
  }, [runtimeIssuesKey, onRenderError])

  if (!canRender) {
    return createElement(
      'div',
      {
        className: 'acp-render-error',
        role: 'alert',
        'data-render-error': 'true',
      },
      'Invalid article content',
    )
  }

  return rendered ?? null
}

export default ArticleContentRenderer
