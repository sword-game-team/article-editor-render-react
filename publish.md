# npm 发版与更新流程

本文档用于发布和更新 React 渲染组件：

```text
article-content-renderer-next
```

以下命令默认都在 `editer_render_react` 项目根目录执行。当前项目的 `package.json` 已配置：

- npm 官方仓库：`https://registry.npmjs.org/`
- 公开作用域包：`publishConfig.access = "public"`
- 发布内容：`dist/`、`protocol/`，以及 npm 自动包含的 `package.json`、`README.md`、`LICENSE`
- 发布前钩子：`prepublishOnly` 会自动执行 `npm run check`
- Node.js 要求：`>= 20.19.0`

## 1. 首次发布前准备

### 1.1 npm 账号和权限

1. 注册并登录 [npm](https://www.npmjs.com/)。
2. 确认账号拥有 `@nova_voyager` 作用域下该包的发布权限。
3. 为 npm 账号开启双重验证（2FA）。直接发布通常需要 2FA，或使用具备相应权限的 granular access token。
4. 不要把 npm token、一次性验证码或包含凭据的 `.npmrc` 提交到 Git 仓库。

登录 npm 官方仓库：

```bash
npm login --registry=https://registry.npmjs.org/
```

确认当前登录账号及仓库地址：

```bash
npm whoami --registry=https://registry.npmjs.org/
npm config get registry
```

`npm config get registry` 应输出：

```text
https://registry.npmjs.org/
```

如果公司环境默认使用了其他镜像，不需要永久修改全局配置；本项目的 `publishConfig.registry` 会在发布时指定 npm 官方仓库，也可以在命令中显式添加 `--registry=https://registry.npmjs.org/`。

### 1.2 核对包信息

```bash
npm pkg get name version publishConfig files main module types exports peerDependencies
```

重点确认：

- 包名为 `article-content-renderer-next`
- 版本号是本次准备发布的版本
- `peerDependencies.react` 和 `peerDependencies.react-dom` 仍符合 React 使用方的实际版本
- `main`、`module`、`types`、`exports` 均指向 `dist/` 中存在的文件
- 没有把源码中的密钥、账号、内部地址或其他敏感信息放入发布文件

如果是首次发布，可以查询包名是否已存在：

```bash
npm view article-content-renderer-next --registry=https://registry.npmjs.org/
```

未发布过时返回 `404` 是正常现象。若包已存在，应先确认自己是维护者，并检查远端已有版本。

## 2. 发布前完整检查

### 2.1 安装依赖

CI 或已有 `package-lock.json` 时优先使用：

```bash
npm ci
```

需要更新依赖锁文件时使用：

```bash
npm install
```

### 2.2 检查组件和 Demo

```bash
npm run check
npm run demo:build
```

`npm run check` 会依次执行：

1. TypeScript 类型检查
2. Vitest 单元测试和 SSR 测试
3. 组件库正式构建

`npm run demo:build` 不会把 Demo 发布到 npm，但建议在每次发版前执行，以确认示例仍能正确使用组件公开 API。

如需人工查看 Demo：

```bash
npm run dev
```

重点检查普通内容渲染、严格模式、样式覆盖，以及 `articleButton` 的 button/text 两种样式和外部 resolver 生成的完整 `href`。

### 2.3 检查真正会上传的文件

```bash
npm pack --dry-run
```

输出中应主要包含：

```text
dist/
protocol/
package.json
README.md
LICENSE
```

不应包含 `node_modules/`、`demo/`、`tests/`、本地配置、日志、密钥或其他敏感文件。`npm pack --dry-run` 通过后，再执行实际发布。

如需在另一个本地 React 项目中做最终安装验证，可先生成 tarball：

```bash
npm pack
```

然后在测试项目中安装命令输出的 `.tgz` 文件：

```bash
npm install /absolute/path/to/nova_voyager-article-content-renderer-react-x.y.z.tgz
```

测试完成后，本地生成的 `.tgz` 文件不要提交到仓库。

## 3. 首次正式发布

当前包是 scoped public package。虽然 `package.json` 已配置 `publishConfig.access = "public"`，首次发布仍建议在命令中显式声明公开访问：

```bash
npm publish --access public --registry=https://registry.npmjs.org/
```

发布过程中如果要求输入 OTP，请输入验证器生成的一次性验证码。不要把 OTP 写进脚本或文档。

`npm publish` 会自动触发项目中的 `prepublishOnly`，也就是再次运行 `npm run check`。检查失败时不会上传包。

发布完成后验证：

```bash
npm view article-content-renderer-next version
npm view article-content-renderer-next dist-tags
npm view article-content-renderer-next files
```

也可以打开包页面：

[https://www.npmjs.com/package/article-content-renderer-next](https://www.npmjs.com/package/article-content-renderer-next)

再使用一个干净的 React 项目做安装验证：

```bash
npm install article-content-renderer-next@latest react react-dom
```

```ts
import {
  ArticleContentRenderer,
} from 'article-content-renderer-next'
import 'article-content-renderer-next/style.css'
```

## 4. 后续版本更新流程

### 4.1 完成功能和文档更新

每次发布前至少确认：

- 代码和测试已覆盖本次修改
- README 中公开 API、Props、Events、resolver 和样式说明仍准确
- 协议有变化时，同步更新 `protocol/`、类型、校验器、渲染器、测试和 Demo
- 新协议仍兼容旧 JSON；如果不兼容，需要按破坏性变更处理
- Git 工作区只包含计划进入本次版本的改动

```bash
git status
git diff
```

### 4.2 选择语义化版本

按 [Semantic Versioning](https://semver.org/lang/zh-CN/) 选择版本：

| 变更类型 | 命令 | 示例 | 适用情况 |
| --- | --- | --- | --- |
| Patch | `npm version patch` | `0.1.0 -> 0.1.1` | 向后兼容的 bug 修复、文档修正 |
| Minor | `npm version minor` | `0.1.0 -> 0.2.0` | 向后兼容的新节点、新能力或新选项 |
| Major | `npm version major` | `0.1.0 -> 1.0.0` | Props、事件、导出、CSS、协议或行为存在破坏性变化 |

对 `0.x` 阶段的包也应明确记录兼容性变化，不要仅因为主版本还是 `0` 就忽略破坏性变更说明。

### 4.3 推荐的正式更新步骤

先在旧版本号下完成质量检查：

```bash
npm ci
npm run check
npm run demo:build
npm pack --dry-run
```

确认通过后升级版本。以下以 patch 为例：

```bash
npm version patch -m "release: v%s"
```

`npm version` 会更新 `package.json` 和 `package-lock.json`，并在 Git 工作区干净时创建版本提交和 `vX.Y.Z` 标签。minor 或 major 发布时，把 `patch` 分别改为 `minor` 或 `major`。

核对新版本：

```bash
npm pkg get version
git show --stat --oneline HEAD
git tag --points-at HEAD
```

执行正式发布：

```bash
npm publish --access public --registry=https://registry.npmjs.org/
```

发布成功后验证 npm 远端内容，再推送版本提交和标签：

```bash
npm view article-content-renderer-next version
npm view article-content-renderer-next dist-tags
git push origin HEAD
git push origin --tags
```

如果项目暂时没有使用 Git 自动标签，可只修改版本文件：

```bash
npm version patch --no-git-tag-version
```

随后由维护者自行提交 `package.json` 和 `package-lock.json`。正式项目仍建议保留与 npm 版本一一对应的 Git tag。

## 5. Beta/预发布版本

尚未准备好给所有使用方升级的改动，不要直接占用 `latest`。例如从当前稳定版本创建下一个 minor 的 beta：

```bash
npm version preminor --preid=beta -m "release: v%s"
npm publish --tag beta --access public --registry=https://registry.npmjs.org/
```

后续 beta 迭代：

```bash
npm version prerelease --preid=beta -m "release: v%s"
npm publish --tag beta --access public --registry=https://registry.npmjs.org/
```

使用方安装 beta：

```bash
npm install article-content-renderer-next@beta
```

查看所有标签：

```bash
npm dist-tag ls article-content-renderer-next
```

Beta 验证完成后，应生成不带预发布后缀的正式版本，再按正式流程发布。不要把未充分验证的 beta 版本直接设置为 `latest`。

## 6. 使用方如何升级

升级到最新正式版：

```bash
npm install article-content-renderer-next@latest
```

升级到明确版本：

```bash
npm install article-content-renderer-next@0.2.0
```

确认实际安装版本及 React peer dependencies：

```bash
npm ls article-content-renderer-next react react-dom
```

升级后建议执行使用方项目自己的类型检查、单元测试和正式构建，并人工验证：

- 原有 ProseMirror JSON 是否保持一致的渲染结果
- 新协议节点或属性是否正常显示
- 自定义 CSS 是否仍能覆盖 `acp-` 样式
- `articleButton` resolver 是否仍返回业务方期望的完整链接
- React Router 接管跳转时是否仍调用 `preventDefault()`

## 7. 误发版本和回退处理

npm 上已经发布的同一个 `package@version` 不能被覆盖。发现问题后不要修改文件并用相同版本重新发布。

### 7.1 推荐处理方式：弃用坏版本并发布修复版

假设 `0.2.0` 有问题：

```bash
npm deprecate article-content-renderer-next@0.2.0 "该版本存在问题，请升级到 0.2.1"
```

修复代码后发布新的 patch 版本：

```bash
npm version patch -m "release: v%s"
npm publish --access public --registry=https://registry.npmjs.org/
```

如果错误版本意外占用了 `latest`，而修复版暂时无法立即发布，可以先把 `latest` 指回已验证的稳定版本：

```bash
npm dist-tag add article-content-renderer-next@0.1.0 latest
```

执行前务必把示例中的版本改为真实的最后稳定版本，并在执行后检查：

```bash
npm dist-tag ls article-content-renderer-next
```

### 7.2 谨慎使用 unpublish

`npm unpublish` 会影响已经依赖该版本的项目，通常应优先使用 `npm deprecate`。只有确认符合 npm 当前 unpublish policy 且确实必须删除时才执行：

```bash
npm unpublish article-content-renderer-next@0.2.0
```

即使删除成功，该版本号也不能再次使用，仍需发布一个新版本。执行前请阅读 npm 的最新政策：

- [npm Unpublish Policy](https://docs.npmjs.com/policies/unpublish/)
- [Deprecating package versions](https://docs.npmjs.com/deprecating-and-undeprecating-packages-or-package-versions/)

## 8. 每次正式发布检查清单

- [ ] 当前 npm 账号正确，并拥有 `@nova_voyager` 发布权限
- [ ] Git 分支和工作区状态正确
- [ ] 没有密钥、token、账号或内部敏感信息进入发布内容
- [ ] 协议、类型、校验、渲染、测试、Demo 和 README 已同步
- [ ] `npm ci` 成功
- [ ] `npm run check` 成功
- [ ] `npm run demo:build` 成功
- [ ] `npm pack --dry-run` 的文件列表正确
- [ ] 根据兼容性正确选择 patch/minor/major
- [ ] npm 版本号和 Git tag 一致
- [ ] 正式版发布到 `latest`，预发布版使用 `beta` 等独立 tag
- [ ] npm 远端的 version、dist-tags 和安装结果验证通过
- [ ] 版本提交和 tag 已推送到远端 Git 仓库
- [ ] 已通知使用方本次改动、兼容性影响和升级命令

## 9. 常用命令速查

```bash
# 登录与身份
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/

# 发布前检查
npm ci
npm run check
npm run demo:build
npm pack --dry-run

# 正式发版
npm version patch -m "release: v%s"
npm publish --access public --registry=https://registry.npmjs.org/

# 查询远端
npm view article-content-renderer-next version
npm view article-content-renderer-next versions --json
npm dist-tag ls article-content-renderer-next

# 使用方升级
npm install article-content-renderer-next@latest
```

npm 官方参考：

- [Creating and publishing scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
- [npm publish](https://docs.npmjs.com/cli/commands/npm-publish/)
- [npm version](https://docs.npmjs.com/cli/commands/npm-version/)
- [npm dist-tag](https://docs.npmjs.com/cli/commands/npm-dist-tag/)
