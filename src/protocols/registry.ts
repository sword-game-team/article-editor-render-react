import type { RenderIssue, ValidationResult } from '../types'
import type { ProtocolAdapter } from './types'
import { renderDocumentV1 } from './v1/renderer'
import { validateDocumentV1 } from './v1/validator'

const V1_ADAPTER: ProtocolAdapter = Object.freeze({
  version: 1,
  validate: validateDocumentV1,
  render: renderDocumentV1,
})

const ADAPTERS = new Map<number, ProtocolAdapter>([[V1_ADAPTER.version, V1_ADAPTER]])

export const SUPPORTED_PROTOCOL_VERSIONS = Object.freeze([...ADAPTERS.keys()])
export const CURRENT_PROTOCOL_VERSION = 1 as const

export function getProtocolAdapter(version: number): ProtocolAdapter | undefined {
  return ADAPTERS.get(version)
}

export function validateArticleDocument(
  document: unknown,
  options: { protocolVersion?: number } = {},
): ValidationResult {
  const version = options.protocolVersion ?? CURRENT_PROTOCOL_VERSION
  const adapter = getProtocolAdapter(version)
  if (adapter) return adapter.validate(document)

  const issue: RenderIssue = {
    code: 'UNSUPPORTED_PROTOCOL',
    path: '',
    message: `Article Content Protocol version ${version} is not supported.`,
  }
  return { valid: false, issues: [issue] }
}
