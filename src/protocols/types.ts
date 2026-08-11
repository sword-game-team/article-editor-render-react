import type { ReactElement } from 'react'
import type {
  ArticleButtonClickPayload,
  CustomSlot,
  RenderIssue,
  ResolveArticleButtonLink,
  ValidationResult,
} from '../types.js'

export interface RenderContext {
  customSlots: readonly CustomSlot[]
  imageBaseUrl: string
  resolveArticleButtonLink?: ResolveArticleButtonLink
  emitArticleButtonClick: (payload: ArticleButtonClickPayload) => void
  reportIssue: (issue: RenderIssue) => void
}

export interface ProtocolAdapter {
  version: number
  validate: (document: unknown) => ValidationResult
  render: (document: unknown, context: RenderContext) => ReactElement | null
}
