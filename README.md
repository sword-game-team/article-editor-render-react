# article-content-renderer-react

面向 React 的 Article Content Protocol 渲染组件。组件接收协议定义的 ProseMirror JSON，通过 React Element 安全渲染，不使用 `dangerouslySetInnerHTML`。

该项目与 Vue 3 版本保持相同的协议类型、运行时校验、节点能力、URL 安全策略、`articleButton` resolver 和 `acp-` 样式体系，框架接口改为 React 函数组件与回调 Props。

## 特性

- 支持 Article Content Protocol v1 的全部节点和 marks
- 支持 React 18.2 和 React 19
- 不使用 `dangerouslySetInnerHTML`
- 支持严格模式和非严格容错渲染
- 拦截危险链接和图片 URL
- `articleButton` 的完整 `href` 由使用者回调生成
- button/text 两种 `articleButton` 样式均使用 `<a>` 渲染
- 支持 React SSR
- 提供 TypeScript 类型、结构化错误和 CSS Variables
- React 和 React DOM 作为 peer dependencies，不会打入组件包

## 环境要求

- React `18.2+` 或 React `19.x`
- React DOM 与 React 使用相同的主版本
- Node.js 20.19 或更高版本用于本地开发和构建

## 安装

```bash
npm install @nova_voyager/article-content-renderer-react react react-dom
```

引入组件样式：

```ts
import '@nova_voyager/article-content-renderer-react/style.css'
```

## 基本使用

```tsx
import { useCallback } from 'react'
import {
  ArticleContentRenderer,
  type ArticleButtonClickPayload,
  type ArticleDocument,
  type RenderIssue,
  type ResolveArticleButtonLink,
} from '@nova_voyager/article-content-renderer-react'
import '@nova_voyager/article-content-renderer-react/style.css'

const article: ArticleDocument = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Article title' }],
    },
    {
      type: 'articleButton',
      attrs: {
        id: 'view-more',
        text: 'View more',
        style: 'button',
      },
    },
  ],
}

export function ArticlePage() {
  const resolveArticleButtonLink = useCallback<ResolveArticleButtonLink>((attrs) => {
    // 完整 href 由使用者返回；组件不会自动追加查询参数。
    return `/detail/${encodeURIComponent(attrs.id)}`
  }, [])

  const handleArticleButtonClick = useCallback((payload: ArticleButtonClickPayload) => {
    console.log(payload.attrs, payload.href)
  }, [])

  const handleRenderError = useCallback((issue: RenderIssue) => {
    console.warn(issue.code, issue.path, issue.message)
  }, [])

  return (
    <ArticleContentRenderer
      document={article}
      resolveArticleButtonLink={resolveArticleButtonLink}
      onArticleButtonClick={handleArticleButtonClick}
      onRenderError={handleRenderError}
    />
  )
}
```

也可以使用默认导出：

```tsx
import ArticleContentRenderer from '@nova_voyager/article-content-renderer-react'
```

## articleButton 链接

`style: "button"` 和 `style: "text"` 都使用 `<a>` 渲染，只改变视觉样式。resolver 会收到当前节点的完整只读属性：

```ts
interface ArticleButtonAttrs {
  id: string
  title?: string
  text: string
  style: 'text' | 'button'
}
```

resolver 类型：

```ts
type ResolveArticleButtonLink = (
  attrs: Readonly<ArticleButtonAttrs>,
  node: Readonly<ArticleButtonNode>,
) =>
  | string
  | {
      href: string
      target?: '_self' | '_blank'
      rel?: string
    }
  | null
```

完整 `href` 由使用者生成：

```tsx
const resolveArticleButtonLink: ResolveArticleButtonLink = (attrs) => {
  return `/detail/${attrs.id}`
}
```

当 `attrs.id` 为 `view-more` 时，最终 DOM 为：

```html
<a href="/detail/view-more">...</a>
```

组件不会自动添加 `?`，也不会自动把 `id`、`title`、`text` 或 `style` 转换成查询参数。resolver 返回的安全字符串就是最终 `href`。

resolver 必须是同步函数；建议保持它纯净、确定，不要在 resolver 中修改 React state 或执行异步请求。

### 使用闭包

可以通过闭包读取当前 React 组件的业务配置，再结合 `articleButton` 属性生成链接：

```tsx
interface ArticleViewProps {
  basePath: string
  tenantId: string
}

function ArticleView({ basePath, tenantId }: ArticleViewProps) {
  const resolveArticleButtonLink = useCallback<ResolveArticleButtonLink>(
    (attrs) => {
      const prefix = basePath.replace(/\/+$/, '')
      return `${prefix}/${encodeURIComponent(tenantId)}/${encodeURIComponent(attrs.id)}`
    },
    [basePath, tenantId],
  )

  return (
    <ArticleContentRenderer
      document={article}
      resolveArticleButtonLink={resolveArticleButtonLink}
    />
  )
}
```

以上示例使用路径段；如果业务需要 query、hash、绝对 URL 或其他结构，也全部由使用者自行决定。

### 指定 target 和 rel

```tsx
const resolveArticleButtonLink: ResolveArticleButtonLink = (attrs) => ({
  href: `/detail/${encodeURIComponent(attrs.id)}`,
  target: '_blank',
  rel: 'external',
})
```

当 `target` 为 `_blank` 时，组件会在现有 `rel` 基础上自动补充 `noopener noreferrer`。

### React Router

可以在点击回调中阻止 `<a>` 的原生跳转，然后交给路由器处理：

```tsx
import { useNavigate } from 'react-router-dom'

function ArticlePage() {
  const navigate = useNavigate()

  const resolveArticleButtonLink = useCallback<ResolveArticleButtonLink>(
    (attrs) => `/detail/${encodeURIComponent(attrs.id)}`,
    [],
  )

  const handleArticleButtonClick = useCallback(
    (payload: ArticleButtonClickPayload) => {
      if (!payload.href) return
      payload.event.preventDefault()
      void navigate(payload.href)
    },
    [navigate],
  )

  return (
    <ArticleContentRenderer
      document={article}
      resolveArticleButtonLink={resolveArticleButtonLink}
      onArticleButtonClick={handleArticleButtonClick}
    />
  )
}
```

即使使用客户端路由，也建议 resolver 返回真实可访问的 `href`，这样右键复制链接、在新标签页打开和无 JavaScript 场景仍保留基本语义。

## Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `document` | `unknown` | 必填 | Article Content Protocol 文档 |
| `protocolVersion` | `number` | `1` | 协议适配器版本 |
| `strict` | `boolean` | `false` | 校验失败时是否停止整篇正文渲染 |
| `resolveArticleButtonLink` | `ResolveArticleButtonLink` | `undefined` | 生成 `articleButton` 完整安全链接 |
| `onArticleButtonClick` | `(payload) => void` | `undefined` | 点击 button/text 形式的 `articleButton` 时调用 |
| `onRenderError` | `(issue) => void` | `undefined` | 协议或运行时渲染问题回调 |

## onArticleButtonClick

```ts
interface ArticleButtonClickPayload {
  attrs: Readonly<ArticleButtonAttrs>
  node: Readonly<ArticleButtonNode>
  href: string | null
  event: React.MouseEvent<HTMLAnchorElement>
}
```

回调在原生跳转前同步调用。执行 `payload.event.preventDefault()` 可以阻止原生跳转并交给 React Router 或其他业务逻辑处理。

如果 resolver 缺失、抛出异常、返回 `null` 或返回不安全 URL，组件仍渲染禁用状态的 `<a>`，但不设置 `href`，点击时会自动阻止默认行为。

## onRenderError

```ts
interface RenderIssue {
  code: RenderIssueCode
  path: string
  message: string
  nodeType?: string
}
```

校验问题和渲染时问题会在组件提交后通过回调报告。React 开发环境的 Strict Mode 可能重复执行 render，但组件会对同一轮运行时问题去重；使用方也可以按 `code + path + message` 去重保存。

## 严格模式与容错模式

默认 `strict={false}`：无法识别或不合法的节点会被跳过，其他合法内容继续渲染，同时通过 `onRenderError` 报告问题。

```tsx
<ArticleContentRenderer document={article} strict={false} />
```

严格模式下，只要协议校验失败，正文会替换为错误占位：

```tsx
<ArticleContentRenderer document={article} strict />
```

## 校验和 URL 安全

校验同时覆盖 JSON 结构、`contentModel` 和跨节点约束：

- `block+`、`listItem+`、`tableRow+` 等内容不能为空
- `codeBlock` 最多包含一个 text 节点
- 同一张表格的每一行必须具有相同列数
- 未知节点、mark、属性和越界值会被报告

普通链接和 `articleButton` 允许 `http:`、`https:`、`mailto:`、`tel:`、相对路径和页面锚点。图片允许 `http:`、`https:`、`blob:` 和相对路径。`javascript:`、`data:` 等危险协议会被拦截。

可以在组件之外单独校验：

```ts
import { validateArticleDocument } from '@nova_voyager/article-content-renderer-react'

const result = validateArticleDocument(article, { protocolVersion: 1 })
if (!result.valid) console.table(result.issues)
```

## DOM 结构

React 版本使用 Fragment 输出协议根节点，不会额外生成 `.acp-document` 包装层：

```html
<h1 class="acp-heading acp-heading--1">...</h1>
<p class="acp-paragraph">...</p>
```

所有协议节点都带有稳定的 `acp-` 类名和 `data-node-type`，便于业务方覆盖样式或做 DOM 测试。

## 样式覆盖

只修改主题变量：

```css
.my-article-theme {
  --acp-color-accent: #7c3aed;
  --acp-color-accent-hover: #6d28d9;
  --acp-radius: 8px;
  --acp-spacing-block: 20px;
}
```

```tsx
<article className="my-article-theme">
  <ArticleContentRenderer
    document={article}
    resolveArticleButtonLink={resolveArticleButtonLink}
  />
</article>
```

覆盖具体节点：

```css
.my-article-theme .acp-article-button--button {
  min-width: 160px;
  border-radius: 999px;
}

.my-article-theme .acp-article-button--text {
  font-weight: 700;
  text-decoration-style: dotted;
}

.my-article-theme .acp-heading--2 {
  color: #312e81;
}
```

业务样式应在组件样式之后加载，或通过更具体的外层主题选择器覆盖。

## SSR

组件不依赖 `window` 或 `document`，可以直接用于 React 服务端渲染：

```tsx
import { renderToString } from 'react-dom/server'
import { ArticleContentRenderer } from '@nova_voyager/article-content-renderer-react'

const html = renderToString(
  <ArticleContentRenderer
    document={article}
    resolveArticleButtonLink={(attrs) => `/detail/${attrs.id}`}
  />,
)
```

`onRenderError` 基于 React effect，在 SSR 阶段不会执行；需要在服务端提前检查内容时，请直接调用 `validateArticleDocument()`。

## 本地 Demo

```bash
npm install
npm run dev
```

默认访问 `http://localhost:5173`。Demo 包含主要节点、可编辑 `articleButton` resolver、严格模式、`_blank`、点击结果、错误列表和 JSON 查看器。

动态 resolver 编辑器只用于本地 Demo；生产项目应在 React/TypeScript 源码中定义 resolver，不应执行来自不可信用户的 JavaScript 字符串。

单独检查并构建 Demo：

```bash
npm run demo:typecheck
npm run demo:build
```

## 开发命令

```bash
npm run typecheck
npm run test:run
npm run build
npm run check
```

原始协议定义位于 [protocol/article-content-protocol-v1.json](./protocol/article-content-protocol-v1.json)，完整示例位于 [examples/article-v1.json](./examples/article-v1.json)。协议升级步骤见 [docs/protocol-upgrade.md](./docs/protocol-upgrade.md)。
