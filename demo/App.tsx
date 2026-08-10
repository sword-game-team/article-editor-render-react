import { useCallback, useMemo, useState } from 'react'
import {
  ArticleContentRenderer,
  type AdConfig,
  type ArticleButtonAttrs,
  type ArticleButtonClickPayload,
  type ArticleButtonLink,
  type ArticleButtonNode,
  type ArticleDocument,
  type RenderIssue,
  type ResolveArticleButtonLink,
  type PubId,
} from '../src'

const DEFAULT_RESOLVER_CODE = [
  'const { id, title, text, style } = attrs',
  '',
  '// href 完全由使用者拼接，组件不会自动追加参数',
  'return `/detail/${id}`',
].join('\n')

type ExecutableResolver = (
  attrs: Readonly<ArticleButtonAttrs>,
  node: Readonly<ArticleButtonNode>,
) => ArticleButtonLink

function compileResolver(source: string): ExecutableResolver {
  return new Function('attrs', 'node', `"use strict";\n${source}`) as ExecutableResolver
}

// const article: ArticleDocument = {
//   type: 'doc',
//   content: [
//     {
//       type: 'heading',
//       attrs: { level: 1, textAlign: 'center' },
//       content: [{ type: 'text', text: 'Article Content Protocol v1' }],
//     },
//     {
//       type: 'paragraph',
//       content: [
//         { type: 'text', text: '这个 Demo 展示 ' },
//         { type: 'text', text: '粗体', marks: [{ type: 'bold' }] },
//         { type: 'text', text: '、' },
//         { type: 'text', text: '斜体', marks: [{ type: 'italic' }] },
//         { type: 'text', text: '、' },
//         { type: 'text', text: '删除线', marks: [{ type: 'strike' }] },
//         { type: 'text', text: '、' },
//         { type: 'text', text: '下划线', marks: [{ type: 'underline' }] },
//         { type: 'text', text: '、' },
//         { type: 'text', text: 'inlineCode()', marks: [{ type: 'code' }] },
//         { type: 'text', text: ' 和 ' },
//         {
//           type: 'text',
//           text: '安全链接',
//           marks: [
//             {
//               type: 'link',
//               attrs: { href: 'https://example.com', target: '_blank' },
//             },
//           ],
//         },
//         { type: 'text', text: '。' },
//       ],
//     },
//     {
//       type: 'blockquote',
//       content: [
//         {
//           type: 'paragraph',
//           content: [
//             {
//               type: 'text',
//               text: '协议数据只描述内容；渲染、安全和业务链接由组件负责。',
//             },
//           ],
//         },
//       ],
//     },
//     {
//       type: 'heading',
//       attrs: { level: 2 },
//       content: [{ type: 'text', text: '列表与代码块' }],
//     },
//     {
//       type: 'bulletList',
//       content: [
//         {
//           type: 'listItem',
//           content: [
//             {
//               type: 'paragraph',
//               content: [{ type: 'text', text: '无序列表支持嵌套块节点。' }],
//             },
//           ],
//         },
//         {
//           type: 'listItem',
//           content: [
//             {
//               type: 'paragraph',
//               content: [{ type: 'text', text: '每个节点都会经过协议校验。' }],
//             },
//           ],
//         },
//       ],
//     },
//     {
//       type: 'orderedList',
//       attrs: { start: 3 },
//       content: [
//         {
//           type: 'listItem',
//           content: [
//             {
//               type: 'paragraph',
//               content: [{ type: 'text', text: '有序列表可以指定起始序号。' }],
//             },
//           ],
//         },
//         {
//           type: 'listItem',
//           content: [
//             {
//               type: 'paragraph',
//               content: [{ type: 'text', text: '省略时默认从 1 开始。' }],
//             },
//           ],
//         },
//       ],
//     },
//     {
//       type: 'codeBlock',
//       attrs: { language: 'ts' },
//       content: [
//         {
//           type: 'text',
//           text: "const resolver = (attrs) => `/action/${attrs.id}`",
//         },
//       ],
//     },
//     {
//       type: 'heading',
//       attrs: { level: 2 },
//       content: [{ type: 'text', text: '图片、操作链接与表格' }],
//     },
//     {
//       type: 'image',
//       attrs: {
//         src: '/demo-image.svg',
//         alt: 'Article Content Renderer illustration',
//         width: 960,
//         height: 360,
//         imageAlign: 'center',
//       },
//     },
//     {
//       type: 'paragraph',
//       content: [
//         {
//           type: 'text',
//           text: '下面两个 articleButton 使用同一个闭包 resolver，只改变视觉样式：',
//         },
//       ],
//     },
//     {
//       type: 'articleButton',
//       attrs: {
//         id: 'view-product',
//         title: '查看商品详情',
//         text: '按钮样式链接',
//         style: 'button',
//       },
//     },
//     {
//       type: 'paragraph',
//       content: [{ type: 'text', text: '也可以渲染成更轻量的文本操作：' }],
//     },
//     {
//       type: 'articleButton',
//       attrs: {
//         id: '1',
//         title: '查看更多内容',
//         text: '文本样式链接',
//         style: 'text',
//       },
//     },
//     {
//       type: 'table',
//       content: [
//         {
//           type: 'tableRow',
//           content: [
//             {
//               type: 'tableCell',
//               content: [{ type: 'paragraph', content: [{ type: 'text', text: '节点' }] }],
//             },
//             {
//               type: 'tableCell',
//               content: [{ type: 'paragraph', content: [{ type: 'text', text: 'DOM' }] }],
//             },
//             {
//               type: 'tableCell',
//               content: [{ type: 'paragraph', content: [{ type: 'text', text: '说明' }] }],
//             },
//           ],
//         },
//         {
//           type: 'tableRow',
//           content: [
//             {
//               type: 'tableCell',
//               content: [{ type: 'paragraph', content: [{ type: 'text', text: 'articleButton' }] }],
//             },
//             {
//               type: 'tableCell',
//               content: [{ type: 'paragraph', content: [{ type: 'text', text: '<a>' }] }],
//             },
//             {
//               type: 'tableCell',
//               content: [
//                 { type: 'paragraph', content: [{ type: 'text', text: '外部生成安全链接' }] },
//               ],
//             },
//           ],
//         },
//       ],
//     },
//     { type: 'horizontalRule' },
//     {
//       type: 'paragraph',
//       attrs: { textAlign: 'center' },
//       content: [{ type: 'text', text: 'Demo end' }],
//     },
//   ],
// }
const article: ArticleDocument = {"type": "doc", "content": [{"type": "paragraph", "content": [{"text": "Your Brain Health Check-In Is Closer Than You Think", "type": "text"}]}, {"type": "articleButton", "attrs": {"id": "1915", "text": "🧐 Know Your Early Memory Signs", "style": "text"}}, {"type": "articleButton", "attrs": {"id": "1916", "text": "🧐 How To Assess Alzheimer's Disease Risk", "style": "text"}}, {"type": "articleButton", "attrs": {"id": "1917", "text": "🧐 How To Protect Vision And Hearing", "style": "text"}}, {"type": "paragraph", "content": [{"text": "Your mind may be sending out several clear signals indicating that your memory level is shifting and your brain health needs attention.", "type": "text"}]}, {"type": "articleButton", "attrs": {"id": "1892", "text": "Learn your brain health ➝", "style": "button", "title": "You will remain in the same website"}}, {"type": "image", "attrs": {"src": "https://asserts.gameseeks.com/icon/1786011855687209000.jpg", "imageAlign": "center"}}, {"type": "paragraph", "content": [{"text": "Wondering how your memory and focus might be changing? It is essential to know what to watch for, and we need simple ways to track the signs and feel prepared.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 2}, "content": [{"text": "Discover More About Your Cognitive Rhythm", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "How sharp am I", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Your brain style", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "What your senses need", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Future cognition insights", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Wondering if spending 10 minutes on the \"If You Can Answer These 10 Questions, You Have Over 160 IQ!\" quiz is a good use of your time? This viral test has become a popular casual activity for young and middle-aged people, offering a fun way to explore your cognitive skills and spark friendly conversations with peers.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "What can you unlock with this quick 10-question IQ quiz? Besides a rough estimate of your problem-solving abilities, you can compare your results with millions of active users who have already taken the test across social platforms. It also gives you a chance to identify small gaps in your logical reasoning skills you might not have noticed before.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "But is it really worth carving time out of your busy schedule for this quiz? However, every decision requires reflection, and there are points that must be carefully considered before you dive in. Especially for young and middle-aged people with limited free time, these reflections become even more important.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "So what should you consider before starting the test? Understanding the pros and cons of the \"If You Can Answer These 10 Questions, You Have Over 160 IQ!\" quiz is essential to make a choice that fits your personal goals and schedule. Let’s break down the key factors to help you decide.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 3}, "content": [{"text": "Advantages of If You Can Answer These 10 Questions, You Have Over 160 IQ!", "type": "text"}]}, {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Quick Cognitive Skill Check", "type": "text", "marks": [{"type": "bold"}]}, {"text": ": This quiz lets you assess your logical reasoning, pattern recognition, and critical thinking skills in less than 15 minutes. You don’t need to sign up for long, formal assessments to get a general sense of your current cognitive strengths. For example, you might discover you excel at spatial reasoning problems more than verbal logic puzzles.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Fun Social Interaction Opportunity", "type": "text", "marks": [{"type": "bold"}]}, {"text": ": Sharing your results with friends and family can spark lighthearted, engaging conversations about intelligence and problem-solving. It can also turn into a friendly group activity where you compare answers and work through tricky questions together. Many users post their results on social media to connect with other people who got similar scores.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Low-Stakes Brain Exercise", "type": "text", "marks": [{"type": "bold"}]}, {"text": ": Working through the 10 questions gives your brain a small, low-pressure workout that can help keep your cognitive skills sharp. Unlike high-stakes tests that cause anxiety, this quiz is designed to be fun, so you can focus on the problem-solving process instead of worrying about a perfect score. It makes for a great short break from work or household chores.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Insight for Further Skill Development", "type": "text", "marks": [{"type": "bold"}]}, {"text": ": Your quiz results can point you to specific cognitive skills you might want to improve with regular practice. If you struggle with number sequence questions, for example, you can look for simple daily exercises to build that skill over time. It can serve as a starting point for anyone interested in casual brain training.", "type": "text"}]}]}]}, {"type": "heading", "attrs": {"level": 3}, "content": [{"text": "Disadvantages of If You Can Answer These 10 Questions, You Have Over 160 IQ!", "type": "text"}]}, {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Not a Clinically Valid IQ Assessment", "type": "text", "marks": [{"type": "bold"}]}, {"text": ": This short online quiz is not administered or reviewed by licensed psychologists, so its results are not a formal measure of your actual IQ. Taking the result too seriously may lead to unnecessary disappointment or an overinflated sense of ability that does not match real-world cognitive testing. You can view it as entertainment rather than a professional assessment to avoid this issue.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Potential for Unnecessary Time Sink", "type": "text", "marks": [{"type": "bold"}]}, {"text": ": While the quiz itself is short, you may find yourself falling down a rabbit hole of similar online tests after you finish, wasting hours of free time. Many platforms that host this quiz also suggest dozens of related quizzes that can keep you scrolling long after you answer the 10 questions. Setting a time limit before you start can help you avoid this unintended distraction.", "type": "text"}]}]}, {"type": "listItem", "content": [{"type": "paragraph", "content": [{"text": "Risk of Misleading Self-Perception", "type": "text", "marks": [{"type": "bold"}]}, {"text": ": If you score lower than expected, you might incorrectly assume you have weaker cognitive skills than you actually do, which can harm your confidence in other areas of life. A short quiz cannot account for different types of intelligence, like emotional intelligence or creative problem-solving, that are critical to daily success. Remind yourself that one short test cannot capture the full scope of your abilities.", "type": "text"}]}]}]}, {"type": "heading", "attrs": {"level": 3}, "content": [{"text": "Conclusion", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "If You Can Answer These 10 Questions, You Have Over 160 IQ! can transform your casual break time, offering a fun way to exercise your brain and connect with friends. However, it's important to carefully weigh both the benefits and the risks involved before you decide to take it, especially if you value formal, accurate assessments of your skills.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Each young and middle-aged person should balance the desire to test their cognitive skills with the understanding that this is not a professional evaluation. Focus on having fun rather than treating the result as a definitive judgment of your intelligence to avoid unnecessary frustration or overconfidence.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "The decision shouldn't be impulsive. Considering pros and cons helps build a relaxing, engaging, and low-stress experience whether you choose to take the quiz or spend your time on another activity. You will get the most value out of it if you approach it with a lighthearted, curious mindset.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "If you're thinking about taking this 10-question IQ quiz, reflect carefully on what you hope to get out of the experience. The most important thing is to engage with it responsibly and enjoy If You Can Answer These 10 Questions, You Have Over 160 IQ! in a healthy, balanced, and fun way.", "type": "text"}]}, {"type": "heading", "attrs": {"level": 3}, "content": [{"text": "FAQ", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Is the 10-question 160+ IQ test a legitimate professional IQ assessment?", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "paragraph", "content": [{"text": "No, this short online quiz is not a clinically valid IQ test administered by licensed psychologists. Formal IQ assessments take hours to complete and cover a far wider range of cognitive skills than 10 multiple-choice questions. You can treat this quiz as a fun casual activity rather than an official measure of your intelligence. If you want a formal assessment, reach out to a licensed neuropsychologist in your area.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "Where can I find the official, original version of this 10-question IQ quiz?", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "paragraph", "content": [{"text": "The quiz has been shared widely across social media and puzzle websites, so there is no single official original version. Many platforms have edited the questions to fit their own audience, so results may vary slightly across different versions. To avoid low-quality or misleading copies, look for versions posted by reputable puzzle and brain training platforms. Always avoid versions that ask you to share personal information or pay to see your results.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "What does this quiz actually measure, versus what common claims say?", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "paragraph", "content": [{"text": "Common claims say the quiz can accurately tell you if you have an IQ over 160, which would put you in the top 0.1% of the population. In reality, the quiz only measures a narrow set of logical reasoning and pattern recognition skills, not the full scope of intelligence. It also does not account for other types of intelligence, like creative thinking, emotional intelligence, or practical problem-solving skills. Focus on the fun of solving the puzzles rather than the final score to get the most out of the experience.", "type": "text"}]}, {"type": "paragraph", "content": [{"text": "What safety precautions should I take when taking this quiz online?", "type": "text", "marks": [{"type": "bold"}]}]}, {"type": "paragraph", "content": [{"text": "First, never provide personal information like your full name, email address, or payment details to access the quiz or view your results. Many scam versions of the quiz collect this information to send spam or commit fraud. Second, avoid clicking on pop-up ads that appear while you are taking the quiz, as they may lead to malicious websites. If a platform asks you to share your result on social media to see your score, you can exit the page and find a different version of the quiz.", "type": "text"}]}]}

const adConf: AdConfig = {
  adm: [{ id: 'demo-adm' }],
  ads: [{ id: 'demo-ads' }],
  loc: [],
}

const pubid: PubId = {
  adm: 'demo-adm-publisher',
  ads: 'demo-ads-publisher',
}

export default function App() {
  const [strict, setStrict] = useState(false)
  const [allowNavigation, setAllowNavigation] = useState(false)
  const [openInNewTab, setOpenInNewTab] = useState(false)
  const [resolverCode, setResolverCode] = useState(DEFAULT_RESOLVER_CODE)
  const [appliedResolverCode, setAppliedResolverCode] = useState(DEFAULT_RESOLVER_CODE)
  const [resolverCodeError, setResolverCodeError] = useState('')
  const [activeResolver, setActiveResolver] = useState<ExecutableResolver>(() =>
    compileResolver(DEFAULT_RESOLVER_CODE),
  )
  const [lastClick, setLastClick] = useState<ArticleButtonClickPayload | null>(null)
  const [renderIssues, setRenderIssues] = useState<RenderIssue[]>([])

  const formattedDocument = useMemo(() => JSON.stringify(article, null, 2), [])
  const resolverHasChanges = resolverCode !== appliedResolverCode

  const applyResolverCode = useCallback((): void => {
    try {
      const resolver = compileResolver(resolverCode)
      setActiveResolver(() => resolver)
      setAppliedResolverCode(resolverCode)
      setResolverCodeError('')
      setLastClick(null)
      setRenderIssues([])
    } catch (error) {
      setResolverCodeError(error instanceof Error ? error.message : String(error))
    }
  }, [resolverCode])

  const resetResolverCode = useCallback((): void => {
    const resolver = compileResolver(DEFAULT_RESOLVER_CODE)
    setResolverCode(DEFAULT_RESOLVER_CODE)
    setAppliedResolverCode(DEFAULT_RESOLVER_CODE)
    setActiveResolver(() => resolver)
    setResolverCodeError('')
    setLastClick(null)
    setRenderIssues([])
  }, [])

  const resolveArticleButtonLink = useCallback<ResolveArticleButtonLink>(
    (attrs, node) => {
      const result = activeResolver(attrs, node)
      if (!openInNewTab || typeof result !== 'string') return result

      return { href: result, target: '_blank', rel: 'demo-link' }
    },
    [activeResolver, openInNewTab],
  )

  const handleArticleButtonClick = useCallback(
    (payload: ArticleButtonClickPayload): void => {
      if (!allowNavigation) payload.event.preventDefault()
      setLastClick(payload)
    },
    [allowNavigation],
  )

  const handleRenderError = useCallback((issue: RenderIssue): void => {
    const key = `${issue.code}:${issue.path}:${issue.message}`
    setRenderIssues((current) =>
      current.some((existing) => `${existing.code}:${existing.path}:${existing.message}` === key)
        ? current
        : [...current, issue],
    )
  }, [])

  const clearRuntimeState = useCallback((): void => {
    setLastClick(null)
    setRenderIssues([])
  }, [])

  return (
    <main className="demo-shell">
      <header className="demo-hero">
        <p className="demo-eyebrow">React component playground</p>
        <h1>Article Content Renderer</h1>
        <p>修改左侧控制项，直接观察协议内容、样式和使用者完整拼接的 articleButton 链接。</p>
      </header>

      <div className="demo-layout">
        <aside className="demo-panel demo-controls">
          <div className="demo-panel__header">
            <div>
              <p className="demo-panel__eyebrow">Runtime options</p>
              <h2>控制台</h2>
            </div>
            <button className="demo-reset" type="button" onClick={clearRuntimeState}>
              清空状态
            </button>
          </div>

          <section className="demo-resolver-editor">
            <div className="demo-resolver-editor__header">
              <div>
                <h3>articleButton resolver</h3>
                <p>使用 JavaScript 读取节点属性并返回完整链接。</p>
              </div>
              <span
                className={`demo-code-state${
                  resolverHasChanges ? ' demo-code-state--pending' : ''
                }`}
              >
                {resolverHasChanges ? '待应用' : '已应用'}
              </span>
            </div>

            <div className="demo-code-reference" aria-label="可用回调参数">
              <code>attrs.id</code>
              <code>attrs.title</code>
              <code>attrs.text</code>
              <code>attrs.style</code>
              <code>node</code>
            </div>

            <label className="demo-code-field">
              <span>回调函数体</span>
              <textarea
                value={resolverCode}
                onChange={(event) => setResolverCode(event.target.value)}
                aria-label="articleButton resolver 代码"
                rows={8}
                spellCheck={false}
              />
            </label>

            <p className="demo-code-example">
              默认示例读取全部 attrs，并返回 <code>{'/detail/${attrs.id}'}</code>。这里返回什么安全链接，最终
              href 就是什么。
            </p>

            {resolverCodeError ? (
              <p className="demo-code-error" role="alert">
                无法应用：{resolverCodeError}
              </p>
            ) : null}

            <div className="demo-code-actions">
              <button className="demo-apply" type="button" onClick={applyResolverCode}>
                应用回调
              </button>
              <button className="demo-secondary" type="button" onClick={resetResolverCode}>
                恢复示例
              </button>
            </div>
          </section>

          <label className="demo-check">
            <input
              checked={strict}
              onChange={(event) => setStrict(event.target.checked)}
              type="checkbox"
            />
            <span>严格模式</span>
          </label>

          <label className="demo-check">
            <input
              checked={openInNewTab}
              onChange={(event) => setOpenInNewTab(event.target.checked)}
              type="checkbox"
            />
            <span>articleButton 使用 _blank</span>
          </label>

          <label className="demo-check">
            <input
              checked={allowNavigation}
              onChange={(event) => setAllowNavigation(event.target.checked)}
              type="checkbox"
            />
            <span>允许链接实际跳转</span>
          </label>

          <p className="demo-hint">
            可编辑回调只用于本地开发 Demo。正式项目应在源码中传入 resolver。默认拦截跳转，方便在下方检查最终
            href。
          </p>

          <section id="article-button-result" className="demo-runtime-card">
            <h3>最近一次点击</h3>
            {lastClick ? (
              <dl>
                <div>
                  <dt>节点 ID</dt>
                  <dd>{lastClick.attrs.id}</dd>
                </div>
                <div>
                  <dt>节点样式</dt>
                  <dd>{lastClick.attrs.style}</dd>
                </div>
                <div>
                  <dt>生成链接</dt>
                  <dd className="demo-break">{lastClick.href}</dd>
                </div>
                <div>
                  <dt>已阻止跳转</dt>
                  <dd>{lastClick.event.defaultPrevented ? '是' : '否'}</dd>
                </div>
              </dl>
            ) : (
              <p>点击正文中的按钮或文本操作后显示。</p>
            )}
          </section>

          <section className="demo-runtime-card">
            <h3>渲染问题（{renderIssues.length}）</h3>
            {renderIssues.length ? (
              <ul className="demo-issues">
                {renderIssues.map((issue) => (
                  <li key={`${issue.code}:${issue.path}:${issue.message}`}>
                    <strong>{issue.code}</strong>
                    <span>{issue.path || '/'}</span>
                    <small>{issue.message}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p>当前协议数据没有发现问题。</p>
            )}
          </section>
        </aside>

        <section className="demo-panel demo-preview">
          <div className="demo-panel__header demo-preview__header">
            <div>
              <p className="demo-panel__eyebrow">Rendered result</p>
              <h2>文章预览</h2>
            </div>
            <span className="demo-version">Protocol v1</span>
          </div>

          <article className="demo-render-surface">
            <ArticleContentRenderer
              document={article}
              strict={strict}
              adConf={adConf}
              pubid={pubid}
              resolveArticleButtonLink={resolveArticleButtonLink}
              onArticleButtonClick={handleArticleButtonClick}
              onRenderError={handleRenderError}
            />
          </article>

          <details className="demo-json">
            <summary>查看 ProseMirror JSON</summary>
            <pre>{formattedDocument}</pre>
          </details>
        </section>
      </div>
    </main>
  )
}
