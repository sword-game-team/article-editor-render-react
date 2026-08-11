import { createElement, useEffect, useRef, type ReactElement } from 'react'
import {
  CURRENT_PROTOCOL_VERSION,
  getProtocolAdapter,
  validateArticleDocument,
} from '../protocols/registry.js'
import type {
  ArticleButtonClickPayload,
  CustomSlot,
  RenderIssue,
  ResolveArticleButtonLink,
} from '../types.js'
import { DEFAULT_IMAGE_BASE_URL } from '../core/url.js'

const EMPTY_CUSTOM_SLOTS: readonly CustomSlot[] = Object.freeze([])

export interface ArticleContentRendererProps {
  document: unknown
  protocolVersion?: number
  strict?: boolean
  customSlots?: readonly CustomSlot[]
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

export function ArticleContentRenderer({
  document,
  protocolVersion = CURRENT_PROTOCOL_VERSION,
  strict = false,
  customSlots = EMPTY_CUSTOM_SLOTS,
  imageBaseUrl = DEFAULT_IMAGE_BASE_URL,
  resolveArticleButtonLink,
  onArticleButtonClick,
  onRenderError,
}: ArticleContentRendererProps): ReactElement | null {
  const validation = validateArticleDocument(document, { protocolVersion })
  const adapter = getProtocolAdapter(protocolVersion)
  const runtimeIssues: RenderIssue[] = []
  const reportedRuntimeIssues = useRef(new Set<string>())
  const runtimeIssueContext = useRef({
    document,
    protocolVersion,
    resolveArticleButtonLink,
    imageBaseUrl,
  })
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
        customSlots,
        imageBaseUrl,
        resolveArticleButtonLink,
        emitArticleButtonClick: (payload) => onArticleButtonClick?.(payload),
        reportIssue: (issue) => runtimeIssues.push(issue),
      })
    : null

  const validationIssuesKey = issueFingerprint(validation.issues)
  const runtimeIssuesKey = issueFingerprint(runtimeIssues)

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
