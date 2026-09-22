# Laya Case

收集全网优秀 Laya / System 1 开源 case 的收藏库 | A curated collection of open-source Laya cases from across the web.

Laya Case 把 GitHub、HuggingFace、Reddit、X 与博客上公开分享的 Laya 使用案例整理成可搜索、可筛选的静态案例墙。项目保留来源链接、作者信息、互动指标、中文参考、可运行代码片段与外部链接，方便集中浏览社区正在用 Laya 构建什么。

> 非官方社区项目，与 Convai Innovations / Laya 无隶属关系。模型、代码片段、账号信息与商标权利归原作者及原平台所有。

## Features

- 开源生态全收录：GitHub 仓库、HuggingFace 模型与 Space、Reddit 讨论、博客文章、X 帖子
- 热门、最新、Star 优先、代码优先排序；按来源类型与用途标签筛选
- 搜索标题、摘要、作者、代码片段、标签与链接域名
- 案例详情页展示原文、中文参考、互动指标、可运行代码（一键复制）与外链
- 数据管道：`npm run data:fetch` 自动采集，`src/data/manual/` 手动精选优先
- Astro 静态生成，包含 canonical、Open Graph 与 JSON-LD（`SoftwareSourceCode` / `SocialMediaPosting`）
- 响应式布局，适配桌面与移动端

## Stack

- Astro：静态页面、案例详情页、SEO 和分享元数据
- React：案例墙、搜索、筛选、排序
- 原生 CSS：响应式案例浏览界面
- Playwright：桌面与移动端冒烟测试

## Getting Started

```bash
npm install
npm run dev
```

开发服务器默认运行在 [http://localhost:4321](http://localhost:4321)。

检查并构建静态站点：

```bash
npm run check
npm run build
```

构建结果输出到 `dist/`，可部署到 GitHub Pages、Cloudflare Pages、Vercel 或任意静态托管平台。

## Data

数据管道分两步：

```bash
npm run data:fetch                 # 拉取 GitHub / HuggingFace / Reddit / 博客
npm run data:fetch -- --only=github,hf   # 只拉部分来源
npm run data:build                 # 合并 auto + manual → src/data/cases.json
```

- 自动采集输出到 `src/data/auto/*.json`
- 手动精选放在 `src/data/manual/*.json`（X、知乎等无公开 API 的来源）；同 URL 时 manual 覆盖 auto
- `src/data/cases.json` 由合并生成，请勿手改
- 无头采集依赖公开接口；GitHub 搜索无 token 为 10 次/分，配置 `GITHUB_TOKEN` 可提升配额
- 英文来源默认标记 `translation.status: "pending"`，中文参考由人工或后续翻译流程补充

案例结构（`schemaVersion: 1`），每条包含：

- `sourceType`：github / huggingface / reddit / x / blog / video / official
- `title`、`excerpt`、`author`、`canonicalUrl`、`createdAt`、`lang`
- `translation`：中文参考（ready / pending）
- `code`：可运行代码片段（语言 + 源码）
- `metrics`：stars / forks / upvotes / comments / likes / views（按来源取用）
- `tags`：用途标签（路由分诊、内容审核、Agent 工具、评测对比 ...）
- `variants`：用到的 Laya 变体或运行时（multilingual / laya.cpp / laya-mlx ...）
- `links`、`imageUrl`、`curatedAt`、`curatedBy`

### Configuration

构建时可通过环境变量设置公开域名，用于生成 canonical 和分享元数据：

```
PUBLIC_SITE_URL=https://your-domain.example npm run build
```

## Test

开发服务器运行在 `http://127.0.0.1:4321` 时执行：

```bash
npm run test:smoke
```

测试默认使用本机 Chrome。

## Credits

- 代码结构基于 [Jev-Case](https://github.com/Hiwoniu/Jev-Case)（MIT License），感谢 Hiwoniu
- Laya 模型与权重归 [Convai Innovations](https://huggingface.co/convaiinnovations) 所有（Apache 2.0）

## License

代码使用 [MIT License](https://github.com/Hiwoniu/Jev-Case/blob/main/LICENSE)（继承自 Jev-Case）。

推文、文章、代码片段、账号信息与商标权利归原作者及原平台所有；本项目仅整理公开来源并保留原链接。
