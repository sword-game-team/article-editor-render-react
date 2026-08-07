import type { ReactNode } from 'react'
import type {
  ArticleButtonClickPayload,
  RenderIssue,
  ResolveArticleButtonLink,
  ValidationResult,
} from '../types'

export interface RenderContext {
  resolveArticleButtonLink?: ResolveArticleButtonLink
  emitArticleButtonClick: (payload: ArticleButtonClickPayload) => void
  reportIssue: (issue: RenderIssue) => void
}

export interface ProtocolAdapter {
  version: number
  validate: (document: unknown) => ValidationResult
  render: (document: unknown, context: RenderContext) => ReactNode
}
