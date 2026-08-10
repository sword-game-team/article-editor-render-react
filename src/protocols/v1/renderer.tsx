import {
  createElement,
  Fragment,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import type {
  ArticleButtonAttrs,
  ArticleButtonLinkDescriptor,
  ArticleButtonNode,
  ImageAlign,
  LinkTarget,
  RenderIssue,
  TextAlign,
} from '../../types.js'
import { AdSenseAd } from '../../components/AdSenseAd.js'
import { AdManagerAd } from '../../components/AdManagerAd.js'
import { replaceImageBaseUrl, sanitizeUrl, secureRel } from '../../core/url.js'
import type { RenderContext } from '../types.js'
import type { AdSlot } from '../types.js'

type UnknownRecord = Record<string, unknown>

const BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'bulletList',
  'orderedList',
  'codeBlock',
  'horizontalRule',
  'image',
  'articleButton',
  'table',
])

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function recordValue(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {}
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function childPath(path: string, ...keys: Array<string | number>): string {
  return `${path}/${keys.map(String).join('/')}`
}

function validTextAlign(value: unknown): value is TextAlign {
  return value === 'left' || value === 'center' || value === 'right' || value === 'justify'
}

function validImageAlign(value: unknown): value is ImageAlign {
  return value === 'left' || value === 'center' || value === 'right'
}

function validTarget(value: unknown): value is LinkTarget {
  return value === '_blank' || value === '_self'
}

function report(
  context: RenderContext,
  issue: Omit<RenderIssue, 'nodeType'> & { nodeType?: string },
): void {
  context.reportIssue(issue)
}

function renderText(value: unknown, path: string, context: RenderContext): ReactNode {
  if (!isRecord(value) || value.type !== 'text' || typeof value.text !== 'string' || !value.text) {
    return null
  }

  let rendered: ReactNode = value.text
  const marks = arrayValue(value.marks)

  for (let index = 0; index < marks.length; index += 1) {
    const mark = marks[index]
    if (!isRecord(mark) || typeof mark.type !== 'string') continue
    const markPath = childPath(path, 'marks', index)

    switch (mark.type) {
      case 'bold':
        rendered = createElement('strong', { className: 'acp-mark acp-mark--bold' }, rendered)
        break
      case 'italic':
        rendered = createElement('em', { className: 'acp-mark acp-mark--italic' }, rendered)
        break
      case 'strike':
        rendered = createElement('s', { className: 'acp-mark acp-mark--strike' }, rendered)
        break
      case 'underline':
        rendered = createElement('u', { className: 'acp-mark acp-mark--underline' }, rendered)
        break
      case 'code':
        rendered = createElement('code', { className: 'acp-mark acp-mark--code' }, rendered)
        break
      case 'link': {
        const attrs = recordValue(mark.attrs)
        const href = sanitizeUrl(attrs.href, 'link')
        if (!href) {
          report(context, {
            code: 'UNSAFE_URL',
            path: childPath(markPath, 'attrs', 'href'),
            message: 'The link URL is empty, malformed, or uses a disallowed protocol.',
            nodeType: 'link',
          })
          break
        }
        const target: LinkTarget = validTarget(attrs.target) ? attrs.target : '_blank'
        rendered = createElement(
          'a',
          {
            className: 'acp-link',
            href,
            target,
            rel: secureRel(undefined, target),
          },
          rendered,
        )
        break
      }
    }
  }

  return createElement(Fragment, { key: path }, rendered)
}

function renderInlineContent(value: unknown, path: string, context: RenderContext): ReactNode[] {
  return arrayValue(value)
    .map((child, index) => renderText(child, childPath(path, index), context))
    .filter((child): child is Exclude<ReactNode, null> => child !== null)
}

function renderListItem(value: unknown, path: string, context: RenderContext): ReactNode {
  if (!isRecord(value) || value.type !== 'listItem') return null
  return createElement(
    'li',
    { key: path, className: 'acp-list-item', 'data-node-type': 'listItem' },
    renderBlockContent(value.content, childPath(path, 'content'), context),
  )
}

function renderTableCell(value: unknown, path: string, context: RenderContext): ReactNode {
  if (!isRecord(value) || value.type !== 'tableCell') return null
  return createElement(
    'td',
    { key: path, className: 'acp-table-cell', 'data-node-type': 'tableCell' },
    renderBlockContent(value.content, childPath(path, 'content'), context),
  )
}

function renderTableRow(value: unknown, path: string, context: RenderContext): ReactNode {
  if (!isRecord(value) || value.type !== 'tableRow') return null
  const cells = arrayValue(value.content)
    .map((cell, index) => renderTableCell(cell, childPath(path, 'content', index), context))
    .filter((cell): cell is Exclude<ReactNode, null> => cell !== null)

  return createElement(
    'tr',
    { key: path, className: 'acp-table-row', 'data-node-type': 'tableRow' },
    cells,
  )
}

function normalizeArticleButtonLink(
  value: unknown,
): { href: string; target: LinkTarget; rel?: string } | null {
  if (isRecord(value) && value.target !== undefined && !validTarget(value.target)) return null
  if (isRecord(value) && value.rel !== undefined && typeof value.rel !== 'string') return null

  const descriptor: ArticleButtonLinkDescriptor | null =
    typeof value === 'string'
      ? { href: value }
      : isRecord(value) && typeof value.href === 'string'
        ? {
            href: value.href,
            ...(validTarget(value.target) ? { target: value.target } : {}),
            ...(typeof value.rel === 'string' ? { rel: value.rel } : {}),
          }
        : null

  if (!descriptor) return null
  const href = sanitizeUrl(descriptor.href, 'link')
  if (!href) return null
  const target = descriptor.target ?? '_self'

  return {
    href,
    target,
    rel: secureRel(descriptor.rel, target),
  }
}

function renderArticleButton(
  node: UnknownRecord,
  path: string,
  context: RenderContext,
): ReactNode {
  const rawAttrs = recordValue(node.attrs)
  if (
    typeof rawAttrs.id !== 'string' ||
    !rawAttrs.id ||
    typeof rawAttrs.text !== 'string' ||
    !rawAttrs.text ||
    (rawAttrs.style !== 'text' && rawAttrs.style !== 'button')
  ) {
    return null
  }

  const attrs: Readonly<ArticleButtonAttrs> = Object.freeze({
    id: rawAttrs.id,
    ...(typeof rawAttrs.title === 'string' ? { title: rawAttrs.title } : {}),
    text: rawAttrs.text,
    style: rawAttrs.style,
  })
  const typedNode: Readonly<ArticleButtonNode> = Object.freeze({ type: 'articleButton', attrs })

  let resolved: ReturnType<typeof normalizeArticleButtonLink> = null
  if (!context.resolveArticleButtonLink) {
    report(context, {
      code: 'LINK_RESOLUTION_FAILED',
      path,
      message: 'No resolveArticleButtonLink callback was provided for an articleButton node.',
      nodeType: 'articleButton',
    })
  } else {
    try {
      const result = context.resolveArticleButtonLink(attrs, typedNode)
      resolved = normalizeArticleButtonLink(result)
      if (!resolved) {
        report(context, {
          code:
            typeof result === 'string' || (isRecord(result) && typeof result.href === 'string')
              ? 'UNSAFE_URL'
              : 'LINK_RESOLUTION_FAILED',
          path,
          message: 'The articleButton link resolver returned no usable safe URL.',
          nodeType: 'articleButton',
        })
      }
    } catch (error) {
      report(context, {
        code: 'LINK_RESOLUTION_FAILED',
        path,
        message: `The articleButton link resolver threw an error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        nodeType: 'articleButton',
      })
    }
  }

  const href = resolved?.href ?? null
  const className = [
    'acp-article-button',
    `acp-article-button--${attrs.style}`,
    !href ? 'acp-article-button--disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return createElement(
    'a',
    {
      key: path,
      className,
      href: href ?? undefined,
      target: resolved?.target,
      rel: resolved?.rel,
      title: attrs.title,
      'data-node-type': 'articleButton',
      'data-article-button-id': attrs.id,
      'data-article-button-style': attrs.style,
      'aria-disabled': href ? undefined : 'true',
      onClick: (event: ReactMouseEvent<HTMLAnchorElement>) => {
        if (!href) event.preventDefault()
        context.emitArticleButtonClick({ attrs, node: typedNode, href, event })
      },
    },
    attrs.text,
  )
}

function renderBlock(value: unknown, path: string, context: RenderContext): ReactNode {
  if (!isRecord(value) || typeof value.type !== 'string' || !BLOCK_TYPES.has(value.type)) {
    return null
  }

  const attrs = recordValue(value.attrs)
  switch (value.type) {
    case 'paragraph': {
      const textAlign = validTextAlign(attrs.textAlign) ? attrs.textAlign : undefined
      return createElement(
        'p',
        {
          key: path,
          className: 'acp-paragraph',
          'data-node-type': 'paragraph',
          style: textAlign ? { textAlign } : undefined,
        },
        renderInlineContent(value.content, childPath(path, 'content'), context),
      )
    }
    case 'heading': {
      const level =
        Number.isInteger(attrs.level) && Number(attrs.level) >= 1 && Number(attrs.level) <= 6
          ? Number(attrs.level)
          : 1
      const textAlign = validTextAlign(attrs.textAlign) ? attrs.textAlign : undefined
      return createElement(
        `h${level}`,
        {
          key: path,
          className: `acp-heading acp-heading--${level}`,
          'data-node-type': 'heading',
          style: textAlign ? { textAlign } : undefined,
        },
        renderInlineContent(value.content, childPath(path, 'content'), context),
      )
    }
    case 'blockquote':
      return createElement(
        'blockquote',
        { key: path, className: 'acp-blockquote', 'data-node-type': 'blockquote' },
        renderBlockContent(value.content, childPath(path, 'content'), context),
      )
    case 'bulletList': {
      const items = arrayValue(value.content)
        .map((item, index) => renderListItem(item, childPath(path, 'content', index), context))
        .filter((item): item is Exclude<ReactNode, null> => item !== null)
      return createElement(
        'ul',
        { key: path, className: 'acp-list acp-list--bullet', 'data-node-type': 'bulletList' },
        items,
      )
    }
    case 'orderedList': {
      const start = Number.isInteger(attrs.start) && Number(attrs.start) >= 1 ? Number(attrs.start) : 1
      const items = arrayValue(value.content)
        .map((item, index) => renderListItem(item, childPath(path, 'content', index), context))
        .filter((item): item is Exclude<ReactNode, null> => item !== null)
      return createElement(
        'ol',
        {
          key: path,
          className: 'acp-list acp-list--ordered',
          'data-node-type': 'orderedList',
          start,
        },
        items,
      )
    }
    case 'codeBlock': {
      const language = typeof attrs.language === 'string' && attrs.language ? attrs.language : undefined
      const code = arrayValue(value.content)
        .filter((child) => isRecord(child) && child.type === 'text' && typeof child.text === 'string')
        .map((child) => (child as UnknownRecord).text as string)
        .join('')
      return createElement(
        'pre',
        {
          key: path,
          className: 'acp-code-block',
          'data-node-type': 'codeBlock',
          'data-language': language,
        },
        createElement('code', { className: language ? `language-${language}` : undefined }, code),
      )
    }
    case 'horizontalRule':
      return createElement('hr', {
        key: path,
        className: 'acp-horizontal-rule',
        'data-node-type': 'horizontalRule',
      })
    case 'image': {
      const src = sanitizeUrl(replaceImageBaseUrl(attrs.src, context.imageBaseUrl), 'image')
      if (!src) {
        report(context, {
          code: 'UNSAFE_URL',
          path: childPath(path, 'attrs', 'src'),
          message: 'The image URL is empty, malformed, or uses a disallowed protocol.',
          nodeType: 'image',
        })
        return null
      }
      const imageAlign: ImageAlign = validImageAlign(attrs.imageAlign) ? attrs.imageAlign : 'center'
      const width =
        Number.isInteger(attrs.width) && Number(attrs.width) >= 1 && Number(attrs.width) <= 10_000
          ? Number(attrs.width)
          : undefined
      const height =
        Number.isInteger(attrs.height) && Number(attrs.height) >= 1 && Number(attrs.height) <= 10_000
          ? Number(attrs.height)
          : undefined

      return createElement(
        'div',
        {
          key: path,
          className: `acp-image acp-image--${imageAlign}`,
          'data-node-type': 'image',
          'data-image-align': imageAlign,
        },
        createElement('img', {
          className: 'acp-image__element',
          src,
          alt: typeof attrs.alt === 'string' ? attrs.alt : '',
          title: typeof attrs.title === 'string' ? attrs.title : undefined,
          width,
          height,
          'data-image-align': imageAlign,
        }),
      )
    }
    case 'articleButton':
      return renderArticleButton(value, path, context)
    case 'table': {
      const rows = arrayValue(value.content)
        .map((row, index) => renderTableRow(row, childPath(path, 'content', index), context))
        .filter((row): row is Exclude<ReactNode, null> => row !== null)
      return createElement(
        'div',
        { key: path, className: 'acp-table-wrapper', 'data-node-type': 'table' },
        createElement('table', { className: 'acp-table' }, createElement('tbody', null, rows)),
      )
    }
  }
}

function renderBlockContent(value: unknown, path: string, context: RenderContext): ReactNode[] {
  return arrayValue(value)
    .map((child, index) => renderBlock(child, childPath(path, index), context))
    .filter((child): child is Exclude<ReactNode, null> => child !== null)
}

function adDataAttribute(value: unknown): string | number | undefined {
  return typeof value === 'string' || typeof value === 'number' ? value : undefined
}

function renderAdSlot(slot: AdSlot, context: RenderContext): ReactNode {
  const admSlotId = adDataAttribute(slot.adm)
  const adsSlotId = adDataAttribute(slot.ads)
  const renderedAd =
    admSlotId !== undefined && context.admPublisherId
      ? createElement(AdManagerAd, {
          publisherId: context.admPublisherId,
          slotId: admSlotId,
          title: context.adTitle,
          fallbackPublisherId: adsSlotId !== undefined ? context.adsPublisherId : undefined,
          fallbackSlotId: adsSlotId,
        })
      : adsSlotId !== undefined && context.adsPublisherId
        ? createElement(AdSenseAd, {
            publisherId: context.adsPublisherId,
            slotId: adsSlotId,
            title: context.adTitle,
          })
        : null

  return createElement(
    'div',
    {
      key: `/adConf/${slot.index}`,
      className: 'acp-ad-slot',
      'data-node-type': 'adSlot',
      'data-ad-slot': 'true',
      'data-ad-index': slot.index,
      'data-ad-location': slot.location,
      'data-adm': admSlotId,
      'data-ads': adsSlotId,
    },
    renderedAd,
  )
}

function renderDocumentContent(value: unknown, context: RenderContext): ReactNode[] {
  const content = arrayValue(value)
  const slotsByLocation = new Map<number, AdSlot[]>()

  context.adSlots.forEach((slot) => {
    if (slot.location > content.length) return
    const slots = slotsByLocation.get(slot.location) ?? []
    slots.push(slot)
    slotsByLocation.set(slot.location, slots)
  })

  return content.flatMap((child, index) => {
    const path = childPath('/content', index)
    const renderedBlock = renderBlock(child, path, context)
    const renderedSlots = (slotsByLocation.get(index + 1) ?? []).map((slot) =>
      renderAdSlot(slot, context),
    )
    return renderedBlock === null ? renderedSlots : [...renderedSlots, renderedBlock]
  })
}

export function renderDocumentV1(
  document: unknown,
  context: RenderContext,
): ReactElement | null {
  if (!isRecord(document) || document.type !== 'doc') return null
  return createElement(
    Fragment,
    null,
    renderDocumentContent(document.content, context),
  )
}
