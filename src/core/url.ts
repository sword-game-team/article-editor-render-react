type UrlKind = 'link' | 'image'

const LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])
const IMAGE_PROTOCOLS = new Set(['http:', 'https:', 'blob:'])
const URL_BASE = 'https://article-content-renderer.invalid/'

export const DEFAULT_IMAGE_BASE_URL = 'https://www.doitme.link/'

export function replaceImageBaseUrl(value: unknown, imageBaseUrl: string): unknown {
  if (typeof value !== 'string') return value

  const source = value.trim()
  if (!source.startsWith(DEFAULT_IMAGE_BASE_URL)) return source

  const targetBase = imageBaseUrl.trim() || DEFAULT_IMAGE_BASE_URL
  const normalizedTargetBase = targetBase.replace(/\/+$/u, '')
  const imagePath = source.slice(DEFAULT_IMAGE_BASE_URL.length).replace(/^\/+/, '')
  return `${normalizedTargetBase}/${imagePath}`
}

export function sanitizeUrl(value: unknown, kind: UrlKind): string | null {
  if (typeof value !== 'string') return null

  const candidate = value.trim()
  if (!candidate || /[\u0000-\u001F\u007F]/u.test(candidate)) return null

  try {
    const parsed = new URL(candidate, URL_BASE)
    const allowedProtocols = kind === 'link' ? LINK_PROTOCOLS : IMAGE_PROTOCOLS
    return allowedProtocols.has(parsed.protocol) ? candidate : null
  } catch {
    return null
  }
}

export function secureRel(rel: unknown, target: '_blank' | '_self'): string | undefined {
  const tokens = new Set(
    typeof rel === 'string'
      ? rel
          .trim()
          .split(/\s+/u)
          .filter(Boolean)
      : [],
  )

  if (target === '_blank') {
    tokens.add('noopener')
    tokens.add('noreferrer')
  }

  return tokens.size > 0 ? [...tokens].join(' ') : undefined
}

