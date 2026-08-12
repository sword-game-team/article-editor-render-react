import { describe, expect, it } from 'vitest'
import { validateArticleDocument } from '../src'

describe('validateArticleDocument', () => {
  it('accepts protocol defaults omitted from JSON', () => {
    const result = validateArticleDocument({
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'default values',
                      marks: [{ type: 'link', attrs: { href: '/details' } }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        { type: 'image', attrs: { src: '/image.png' } },
      ],
    })

    expect(result).toEqual({ valid: true, issues: [] })
  })

  it('enforces content models and table column consistency', () => {
    const result = validateArticleDocument({
      type: 'doc',
      content: [
        { type: 'blockquote', content: [] },
        {
          type: 'codeBlock',
          content: [
            { type: 'text', text: 'one' },
            { type: 'text', text: 'two' },
          ],
        },
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                { type: 'tableCell', content: [{ type: 'paragraph' }] },
                { type: 'tableCell', content: [{ type: 'paragraph' }] },
              ],
            },
            {
              type: 'tableRow',
              content: [{ type: 'tableCell', content: [{ type: 'paragraph' }] }],
            },
          ],
        },
      ],
    })

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['INVALID_CONTENT', 'TABLE_COLUMN_MISMATCH']),
    )
    expect(result.issues.find((issue) => issue.code === 'TABLE_COLUMN_MISMATCH')?.path).toBe(
      '/content/2/content/1/content',
    )
  })

  it('reports unknown properties, nodes, marks, and invalid attributes', () => {
    const result = validateArticleDocument({
      type: 'doc',
      unexpected: true,
      content: [
        { type: 'unsupported' },
        {
          type: 'heading',
          attrs: { level: 9, textAlign: 'middle' },
          content: [{ type: 'text', text: 'Heading', marks: [{ type: 'rainbow' }] }],
        },
      ],
    })

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['UNKNOWN_PROPERTY', 'UNKNOWN_NODE', 'UNKNOWN_MARK', 'INVALID_VALUE']),
    )
  })

  it('accepts link articleButtons with their own href and without a business id', () => {
    const result = validateArticleDocument({
      type: 'doc',
      content: [
        {
          type: 'articleButton',
          attrs: { text: 'Read the guide', style: 'link', href: '/guides/getting-started' },
        },
        {
          type: 'articleButton',
          attrs: { text: 'Link without a destination', style: 'link' },
        },
      ],
    })

    expect(result).toEqual({ valid: true, issues: [] })
  })

  it('enforces the conditional articleButton id and href rules', () => {
    const result = validateArticleDocument({
      type: 'doc',
      content: [
        { type: 'articleButton', attrs: { text: 'Missing id', style: 'button' } },
        {
          type: 'articleButton',
          attrs: { id: 'unexpected-href', text: 'Unexpected href', style: 'text', href: '/bad' },
        },
      ],
    })

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_PROPERTY', path: '/content/0/attrs/id' }),
        expect.objectContaining({ code: 'INVALID_VALUE', path: '/content/1/attrs/href' }),
      ]),
    )
  })

  it('rejects an unsupported protocol version', () => {
    const result = validateArticleDocument(
      { type: 'doc', content: [] },
      { protocolVersion: 2 },
    )

    expect(result.valid).toBe(false)
    expect(result.issues[0]?.code).toBe('UNSUPPORTED_PROTOCOL')
  })
})
