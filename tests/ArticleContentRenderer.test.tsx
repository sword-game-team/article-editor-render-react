// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ArticleContentRenderer, {
  type ArticleButtonClickPayload,
  type ArticleButtonNode,
  type ArticleDocument,
  type RenderIssue,
} from '../src'

const completeDocument: ArticleDocument = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      attrs: { textAlign: 'center' },
      content: [
        {
          type: 'text',
          text: 'formatted',
          marks: [
            { type: 'bold' },
            { type: 'italic' },
            { type: 'strike' },
            { type: 'underline' },
            { type: 'code' },
            { type: 'link', attrs: { href: '/relative' } },
          ],
        },
      ],
    },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Heading' }] },
    {
      type: 'blockquote',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Quote' }] }],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bullet' }] }],
        },
      ],
    },
    {
      type: 'orderedList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ordered' }] }],
        },
      ],
    },
    {
      type: 'codeBlock',
      attrs: { language: 'ts' },
      content: [{ type: 'text', text: 'const value = 1' }],
    },
    { type: 'horizontalRule' },
    {
      type: 'image',
      attrs: {
        src: 'https://cdn.example.com/image.png',
        alt: 'Example',
        width: 640,
        height: 360,
        imageAlign: 'right',
      },
    },
    {
      type: 'articleButton',
      attrs: { id: 'primary', text: 'Primary', title: 'Open primary', style: 'button' },
    },
    {
      type: 'articleButton',
      attrs: { id: 'secondary', text: 'Secondary', style: 'text' },
    },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableCell',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
            },
            {
              type: 'tableCell',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }],
            },
          ],
        },
      ],
    },
  ],
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ArticleContentRenderer', () => {
  it('receives and prints adConf and pubid', () => {
    const adConf = {
      adm: [{ id: 'adm-1' }],
      ads: [{ id: 'ads-1' }],
      loc: [{ id: 'loc-1' }],
    }
    const pubid = { adm: 'publisher-adm', ads: 'publisher-ads' }

    render(
      <ArticleContentRenderer
        document={{ type: 'doc', content: [] }}
        adConf={adConf}
        pubid={pubid}
      />,
    )

    expect(console.log).toHaveBeenCalledWith('[ArticleContentRenderer] adConf:', adConf)
    expect(console.log).toHaveBeenCalledWith('[ArticleContentRenderer] pubid:', pubid)
  })

  it('reports an error when non-empty adConf adm and ads arrays have different lengths', () => {
    const onRenderError = vi.fn<(issue: RenderIssue) => void>()

    render(
      <ArticleContentRenderer
        document={{ type: 'doc', content: [] }}
        adConf={{ adm: ['adm-1', 'adm-2'], ads: ['ads-1'], loc: [] }}
        pubid={{ adm: '', ads: '' }}
        onRenderError={onRenderError}
      />,
    )

    const issue = expect.objectContaining({
      code: 'AD_CONFIG_LENGTH_MISMATCH',
      path: '/adConf/ads',
    })
    expect(onRenderError).toHaveBeenCalledWith(issue)
    expect(console.error).toHaveBeenCalledWith(
      '[ArticleContentRenderer] Invalid adConf:',
      issue,
    )
  })

  it('does not report a length error when one ad array is empty or both lengths match', () => {
    const onRenderError = vi.fn<(issue: RenderIssue) => void>()
    const { rerender } = render(
      <ArticleContentRenderer
        document={{ type: 'doc', content: [] }}
        adConf={{ adm: ['adm-1'], ads: [], loc: [] }}
        onRenderError={onRenderError}
      />,
    )

    rerender(
      <ArticleContentRenderer
        document={{ type: 'doc', content: [] }}
        adConf={{ adm: ['adm-1'], ads: ['ads-1'], loc: [] }}
        onRenderError={onRenderError}
      />,
    )

    expect(
      onRenderError.mock.calls.some(([issue]) => issue.code === 'AD_CONFIG_LENGTH_MISMATCH'),
    ).toBe(false)
  })

  it('renders every v1 node family and nested marks as semantic elements', () => {
    const { container } = render(
      <ArticleContentRenderer
        document={completeDocument}
        resolveArticleButtonLink={(attrs) => `/actions/${attrs.id}`}
      />,
    )

    expect(container.querySelector('p')?.getAttribute('style')).toContain('text-align: center')
    expect(container.querySelector('h2')?.textContent).toBe('Heading')
    expect(container.querySelector('blockquote')?.textContent).toBe('Quote')
    expect(container.querySelector('ul li')?.textContent).toBe('Bullet')
    expect(container.querySelector('ol')?.getAttribute('start')).toBe('1')
    expect(container.querySelector('pre')?.getAttribute('data-language')).toBe('ts')
    expect(container.querySelector('pre code')?.textContent).toBe('const value = 1')
    expect(container.querySelector('hr')).not.toBeNull()

    const image = container.querySelector('.acp-image--right img')
    expect(image?.getAttribute('src')).toBe('https://cdn.example.com/image.png')
    expect(image?.getAttribute('alt')).toBe('Example')
    expect(image?.getAttribute('width')).toBe('640')
    expect(image?.getAttribute('height')).toBe('360')
    expect(image?.getAttribute('data-image-align')).toBe('right')
    expect(container.querySelectorAll('table tbody tr td')).toHaveLength(2)

    expect(container.querySelector('p a code u s em strong')?.textContent).toBe('formatted')
    const inlineLink = container.querySelector('p a')
    expect(inlineLink?.getAttribute('href')).toBe('/relative')
    expect(inlineLink?.getAttribute('target')).toBe('_blank')
    expect(inlineLink?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('resolves both articleButton styles to safe anchors and emits click details', () => {
    const resolver = vi.fn((attrs: { id: string }, _node: Readonly<ArticleButtonNode>) =>
      attrs.id === 'primary'
        ? { href: `/actions/${attrs.id}`, target: '_blank' as const, rel: 'external' }
        : `/actions/${attrs.id}`,
    )
    const listener = vi.fn((payload: ArticleButtonClickPayload) => payload.event.preventDefault())
    const { container } = render(
      <ArticleContentRenderer
        document={completeDocument}
        resolveArticleButtonLink={resolver}
        onArticleButtonClick={listener}
      />,
    )

    const links = container.querySelectorAll<HTMLAnchorElement>('.acp-article-button')
    expect(links).toHaveLength(2)
    expect(links[0]?.tagName).toBe('A')
    expect(links[0]?.classList.contains('acp-article-button--button')).toBe(true)
    expect(links[0]?.getAttribute('href')).toBe('/actions/primary')
    expect(links[0]?.getAttribute('target')).toBe('_blank')
    expect(links[0]?.getAttribute('rel')).toBe('external noopener noreferrer')
    expect(links[0]?.getAttribute('data-article-button-id')).toBe('primary')
    expect(links[1]?.classList.contains('acp-article-button--text')).toBe(true)
    expect(links[1]?.getAttribute('href')).toBe('/actions/secondary')
    expect(Object.isFrozen(resolver.mock.calls[0]?.[0])).toBe(true)
    expect(Object.isFrozen(resolver.mock.calls[0]?.[1])).toBe(true)

    fireEvent.click(links[0] as HTMLAnchorElement)
    expect(listener).toHaveBeenCalledOnce()
    const payload = listener.mock.calls[0]?.[0]
    expect(payload.href).toBe('/actions/primary')
    expect(payload.event.defaultPrevented).toBe(true)
  })

  it('uses the exact safe href returned by the consumer without appending parameters', () => {
    const resolver = vi.fn((attrs: { id: string }) => `/detail/${attrs.id}`)
    const { container } = render(
      <ArticleContentRenderer
        document={{
          type: 'doc',
          content: [
            {
              type: 'articleButton',
              attrs: { id: 'view-more', text: 'View more', style: 'text' },
            },
          ],
        }}
        resolveArticleButtonLink={resolver}
      />,
    )

    expect(resolver).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'view-more', text: 'View more', style: 'text' }),
      expect.objectContaining({ type: 'articleButton' }),
    )
    const href = container.querySelector('.acp-article-button')?.getAttribute('href')
    expect(href).toBe('/detail/view-more')
    expect(href).not.toContain('?')
    expect(href).not.toContain('tenantId')
    expect(href).not.toContain('articleId')
    expect(href).not.toContain('style=')
  })

  it('skips unsafe URLs while preserving other valid content', () => {
    const onRenderError = vi.fn<(issue: RenderIssue) => void>()
    const { container } = render(
      <ArticleContentRenderer
        document={{
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'safe text',
                  marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
                },
              ],
            },
            { type: 'image', attrs: { src: 'data:image/png;base64,abc' } },
            {
              type: 'articleButton',
              attrs: { id: 'bad', text: 'Bad link', style: 'button' },
            },
          ],
        }}
        resolveArticleButtonLink={() => 'javascript:alert(1)'}
        onRenderError={onRenderError}
      />,
    )

    expect(container.querySelector('p')?.textContent).toBe('safe text')
    expect(container.querySelector('p a')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.acp-article-button')?.hasAttribute('href')).toBe(false)
    expect(
      onRenderError.mock.calls.some(([issue]) =>
        ['UNSAFE_URL', 'LINK_RESOLUTION_FAILED'].includes(issue.code),
      ),
    ).toBe(true)
  })

  it('deduplicates runtime issues when React StrictMode repeats effects', () => {
    const onRenderError = vi.fn<(issue: RenderIssue) => void>()

    render(
      <StrictMode>
        <ArticleContentRenderer
          document={{
            type: 'doc',
            content: [
              {
                type: 'articleButton',
                attrs: { id: 'unsafe', text: 'Unsafe', style: 'button' },
              },
            ],
          }}
          resolveArticleButtonLink={() => 'javascript:alert(1)'}
          onRenderError={onRenderError}
        />
      </StrictMode>,
    )

    expect(onRenderError.mock.calls.filter(([issue]) => issue.code === 'UNSAFE_URL')).toHaveLength(1)
  })

  it('renders an error placeholder in strict mode and partial content otherwise', () => {
    const document = {
      type: 'doc',
      content: [
        { type: 'unknown' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Still visible' }] },
      ],
    }
    const strictError = vi.fn<(issue: RenderIssue) => void>()
    const tolerantError = vi.fn<(issue: RenderIssue) => void>()
    const strictRender = render(
      <ArticleContentRenderer document={document} strict onRenderError={strictError} />,
    )
    const tolerantRender = render(
      <ArticleContentRenderer document={document} onRenderError={tolerantError} />,
    )

    expect(strictRender.container.querySelector('[data-render-error="true"]')).not.toBeNull()
    expect(strictRender.container.textContent).toContain('Invalid article content')
    expect(tolerantRender.container.textContent).toContain('Still visible')
    expect(tolerantRender.container.textContent).not.toContain('unknown')
    expect(tolerantError.mock.calls[0]?.[0]).toMatchObject({
      code: 'UNKNOWN_NODE',
      path: '/content/0/type',
    })
  })
})
