# 协议升级说明

React 组件通过协议适配器隔离不同版本。业务项目只依赖 `ArticleContentRenderer`；协议升级后，应在本组件包内部增加或升级适配器，再发布新的 npm 版本。

## v1 文件位置

- 协议原文：`protocol/article-content-protocol-v1.json`
- TypeScript 类型：`src/types.ts`
- 协议元数据：`src/protocols/v1/metadata.ts`
- 运行时校验：`src/protocols/v1/validator.ts`
- React 渲染器：`src/protocols/v1/renderer.tsx`
- 适配器注册表：`src/protocols/registry.ts`
- 公共样式：`src/styles.css`
- 测试：`tests/`
- Demo 数据：`demo/App.tsx`

## 兼容性更新

如果协议 v1 只增加向后兼容的可选属性或可选节点：

1. 更新协议 JSON 和 `ARTICLE_CONTENT_PROTOCOL_V1` 元数据。
2. 更新 `src/types.ts`。
3. 在 validator 中增加结构和边界校验。
4. 在 renderer 中增加安全、语义化的 React Element 输出。
5. 新增合法、非法、容错和 SSR 测试。
6. 更新 Demo 与 README。
7. 执行 `npm run check` 和 `npm run demo:build`。

兼容更新通常发布 minor 版本；纯 bug 修复通常发布 patch 版本。

## 新协议版本

协议存在破坏性变化时，建议增加 `src/protocols/v2/`，不要直接让 v1 适配器改变旧文档语义：

```text
src/protocols/
├── registry.ts
├── types.ts
├── v1/
│   ├── metadata.ts
│   ├── renderer.tsx
│   └── validator.ts
└── v2/
    ├── metadata.ts
    ├── renderer.tsx
    └── validator.ts
```

在 `registry.ts` 中注册 v2 adapter，并根据发布策略更新 `CURRENT_PROTOCOL_VERSION`。使用方可以显式选择：

```tsx
<ArticleContentRenderer document={article} protocolVersion={2} />
```

## 新节点检查清单

- 是否有明确的 content model、必填属性、默认值和边界
- validator 是否拒绝未知属性、错误子节点和越界值
- 是否使用语义化 DOM，且没有 `dangerouslySetInnerHTML`
- URL、媒体、样式或其他外部输入是否经过白名单处理
- 列表生成的 React Element 是否有稳定 key
- 严格模式是否阻止非法文档，容错模式是否保留其他合法内容
- SSR 是否无需浏览器全局变量
- `onRenderError` 是否返回准确的 JSON Pointer 路径
- CSS 类名是否使用稳定的 `acp-` 前缀
- README、示例 JSON 和 Demo 是否同步

## articleButton 兼容约束

`articleButton` 的两个视觉样式都必须继续使用 `<a>`。resolver 返回的是完整链接，渲染器不得自动添加 query、hash 或其他节点属性。

如果未来需要新增 resolver 输入属性，应优先把它加入 `attrs`/`node` 类型，并保持原回调仍可工作。若修改回调返回结构、同步执行模型、事件载荷或链接安全规则，应按破坏性变更评估并发布 major 版本。
