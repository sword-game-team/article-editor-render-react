import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ArticleContentRenderer from '../src'

describe('server-side rendering', () => {
  it('renders without browser globals or an extra document wrapper', () => {
    const html = renderToString(
      <ArticleContentRenderer
        document={{
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'SSR' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'Ready' }] },
          ],
        }}
      />,
    )

    expect(html).toContain('<h1')
    expect(html).toContain('SSR')
    expect(html).toContain('<p')
    expect(html).not.toContain('acp-document')
  })
})
