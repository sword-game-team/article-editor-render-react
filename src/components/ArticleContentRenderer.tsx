import { createElement, useEffect, useRef, type ReactNode } from 'react'
import {
  CURRENT_PROTOCOL_VERSION,
  getProtocolAdapter,
  validateArticleDocument,
} from '../protocols/registry'
import type {
  AdConfig,
  ArticleButtonClickPayload,
  PubId,
  RenderIssue,
  ResolveArticleButtonLink,
} from '../types'

const EMPTY_AD_CONF: AdConfig = Object.freeze({
  adm: Object.freeze([]),
  ads: Object.freeze([]),
  loc: Object.freeze([]),
})

const EMPTY_PUBID: PubId = Object.freeze({
  adm: '',
  ads: '',
})

export interface ArticleContentRendererProps {
  document: unknown
  protocolVersion?: number
  strict?: boolean
  adConf?: AdConfig
  pubid?: PubId
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
  const admHasValues = adConf.adm.length > 0
  const adsHasValues = adConf.ads.length > 0

  if (!admHasValues || !adsHasValues || adConf.adm.length === adConf.ads.length) return null

  return {
    code: 'AD_CONFIG_LENGTH_MISMATCH',
    path: '/adConf/ads',
    message: `adConf.adm and adConf.ads must have the same length when both arrays contain values. Received adm length ${adConf.adm.length} and ads length ${adConf.ads.length}.`,
  }
}

export function ArticleContentRenderer({
  document,
  protocolVersion = CURRENT_PROTOCOL_VERSION,
  strict = false,
  adConf = EMPTY_AD_CONF,
  pubid = EMPTY_PUBID,
  resolveArticleButtonLink,
  onArticleButtonClick,
  onRenderError,
}: ArticleContentRendererProps): ReactNode {
  const validation = validateArticleDocument(document, { protocolVersion })
  const adapter = getProtocolAdapter(protocolVersion)
  const runtimeIssues: RenderIssue[] = []
  const reportedRuntimeIssues = useRef(new Set<string>())
  const reportedAdConfigIssue = useRef<string | null>(null)
  const runtimeIssueContext = useRef({ document, protocolVersion, resolveArticleButtonLink })
  const adConfigIssue = validateAdConfig(adConf)

  if (
    runtimeIssueContext.current.document !== document ||
    runtimeIssueContext.current.protocolVersion !== protocolVersion ||
    runtimeIssueContext.current.resolveArticleButtonLink !== resolveArticleButtonLink
  ) {
    reportedRuntimeIssues.current.clear()
    runtimeIssueContext.current = { document, protocolVersion, resolveArticleButtonLink }
  }

  const canRender = Boolean(adapter) && (!strict || validation.valid)
  const rendered = canRender
    ? adapter?.render(document, {
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

  return rendered
}

export default ArticleContentRenderer
