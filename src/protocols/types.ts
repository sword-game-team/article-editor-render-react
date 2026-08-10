import type { ReactElement } from 'react'
import type {
  ArticleButtonClickPayload,
  RenderIssue,
  ResolveArticleButtonLink,
  ValidationResult,
} from '../types.js'

export interface RenderContext {
  adSlots: readonly AdSlot[]
  admPublisherId: string
  adsPublisherId: string
  adTitle: string
  imageBaseUrl: string
  resolveArticleButtonLink?: ResolveArticleButtonLink
  emitArticleButtonClick: (payload: ArticleButtonClickPayload) => void
  reportIssue: (issue: RenderIssue) => void
}

export interface AdSlot {
  index: number
  location: number
  adm: unknown
  ads: unknown
}

export interface ProtocolAdapter {
  version: number
  validate: (document: unknown) => ValidationResult
  render: (document: unknown, context: RenderContext) => ReactElement | null
}
