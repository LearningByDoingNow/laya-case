# Laya Case

[![CI](https://github.com/LearningByDoingNow/laya-case/actions/workflows/ci.yml/badge.svg)](https://github.com/LearningByDoingNow/laya-case/actions/workflows/ci.yml)
[![在线预览](https://img.shields.io/badge/%E5%9C%A8%E7%BA%BF%E9%A2%84%E8%A7%88-GitHub%20Pages-6799fe?style=flat-square)](https://learningbydoingnow.github.io/laya-case/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

**[🌐 在线预览 · Live Preview](https://learningbydoingnow.github.io/laya-case/)**

> 收集全网优秀 Laya / System 1 开源案例的收藏墙 — 可搜索、可筛选、可复制运行。
>
> A curated wall of open-source Laya / System 1 cases — searchable, filterable, runnable.

**简体中文** · [English](#english)

Laya Case 把 GitHub、HuggingFace、Reddit 与博客上公开分享的 Laya 使用案例整理成一张静态案例墙,保留来源链接、作者信息、互动数据、可运行代码与外部链接,方便集中浏览社区正在用 Laya 构建什么。

> 非官方社区项目,与 Convai Innovations / Laya 无隶属关系;模型、代码片段、账号信息与商标权利归原作者及原平台所有。

## 特性

| 特性 | 说明 |
|---|---|
| **全来源收录** | GitHub 仓库、HuggingFace 模型与 Space、Reddit 讨论、博客文章 |
| **搜索与筛选** | 关键词搜索;按来源与用途标签筛选;热门 / 最新 / Star / 代码优先排序 |
| **中英双语** | 界面中文优先,英文案例附中文参考与原文对照 |
| **可运行代码** | 详情页展示代码片段,一键复制 |
| **真实封面** | 每条案例使用平台官方封面:仓库社交卡、模型卡、文章配图、帖子预览 |
| **定时保鲜** | 每周一自动采集合并;单来源失败不阻断,空结果不覆盖 |
| **纯静态** | Astro 静态生成;canonical / Open Graph / JSON-LD;适配桌面与移动端 |

## 技术栈

| 层 | 选型 |
|---|---|
| 静态站点 | Astro |
| 交互 | React |
| 样式 | 原生 CSS |
| 数据管道 | Node.js 脚本(GitHub / HuggingFace / RSS 采集与合并) |
| 测试 | Playwright(桌面 + 移动端冒烟) |

## 快速开始

```bash
npm install
npm run dev
```

开发服务器运行在 [http://localhost:4321/laya-case/](http://localhost:4321/laya-case/)(与线上相同的 `/laya-case/` 子路径)。

```bash
npm run check   # 类型检查(astro check)
npm run build   # 静态构建 → dist/
```

推送到 `main` 后,由 GitHub Actions 自动完成检查与构建,并部署到 **[在线预览](https://learningbydoingnow.github.io/laya-case/)**。`base` 固定为 `/laya-case/`(定义在 `astro.config.mjs`),本地开发、测试与线上运行在完全相同的子路径上,保证三者 URL 与产物逐字节一致。

## 数据

数据管道分采集与合并两步:

```bash
npm run data:fetch                    # 拉取 GitHub / HuggingFace / Reddit / 博客
npm run data:fetch -- --only=github   # 只拉部分来源
npm run data:build                    # 合并 auto + manual → src/data/cases.json
```

- 自动采集输出到 `src/data/auto/*.json`
- 手动精选放在 `src/data/manual/*.json`(X、知乎等无公开 API 的来源);同 URL 时 manual 覆盖 auto
- `src/data/cases.json` 由合并生成,请勿手改
- 封面策略:GitHub 取仓库社交卡、HuggingFace 取官方缩略图、文章与帖子取 og:image 与预览图;`npm run data:covers` 为手动条目与缺失封面回填(Medium 走 feed;知乎与掘金因反爬跳过)
- 无 `GITHUB_TOKEN` 时 GitHub 搜索为 10 次/分,配置 `GITHUB_TOKEN` 可提升配额
- 英文来源默认标记 `translation.status: "pending"`,中文参考由人工或后续翻译流程补充
- 定时保鲜:`.github/workflows/refresh-data.yml` 每周一 03:00 UTC 自动执行采集与合并(也支持手动触发)。单个来源失败不阻断整体刷新;采集结果为空时保留已有文件;合并后案例数低于 60 条时中止发布。仅当数据真正有变化时,才由 `github-actions[bot]` 提交英文 commit 并触发 CI 重新构建部署

案例结构(`schemaVersion: 1`),每条包含:

- `sourceType`:github / huggingface / reddit / x / threads / blog / video / official
- `title`、`excerpt`、`author`、`canonicalUrl`、`createdAt`、`lang`
- `translation`:中文参考(ready / pending)
- `code`:可运行代码片段(语言 + 源码)
- `metrics`:stars / forks / upvotes / comments / likes / views(按来源取用)
- `tags`:用途标签(路由分诊、内容审核、Agent 工具、评测对比 ...)
- `variants`:用到的 Laya 变体或运行时(multilingual / laya.cpp / laya-mlx ...)
- `links`、`imageUrl`、`curatedAt`、`curatedBy`

### 配置

构建时可通过环境变量设置公开域名(仅 origin,不含子路径),用于生成 canonical 和分享元数据;子路径 `/laya-case/` 固定配置在 `astro.config.mjs` 的 `base`。CI 构建时会自动注入该变量:

```bash
PUBLIC_SITE_URL=https://learningbydoingnow.github.io npm run build
```

## 测试

本地(dev server 运行中)执行:

```bash
npm run test:smoke
```

对线上部署执行同一套测试,验证与本地行为一致:

```bash
TEST_ORIGIN=https://learningbydoingnow.github.io npm run test:smoke
```

测试默认使用本机 Chrome。

## 致谢

- 代码结构基于 [Jev-Case](https://github.com/Hiwoniu/Jev-Case)(MIT License),感谢 Hiwoniu
- Laya 模型与权重归 [Convai Innovations](https://huggingface.co/convaiinnovations) 所有(Apache 2.0)

## 许可

代码使用 [MIT License](./LICENSE)(继承自 Jev-Case)。

推文、文章、代码片段、账号信息与商标权利归原作者及原平台所有;本项目仅整理公开来源并保留原链接。

---

# English

**[🌐 Live Preview](https://learningbydoingnow.github.io/laya-case/)** · [简体中文](#laya-case)

Laya Case gathers publicly shared Laya use cases from GitHub, HuggingFace, Reddit and blogs into one static wall — keeping source links, authors, engagement metrics, runnable code and external links, so you can see at a glance what the community is building with Laya.

> Unofficial community project, not affiliated with Convai Innovations / Laya. Models, snippets, accounts and trademarks belong to their original authors and platforms.

## Features

| Feature | What it does |
|---|---|
| **Every source** | GitHub repos, HuggingFace models and spaces, Reddit threads, blog posts |
| **Search and filters** | Full-text search; filter by source and use-case tag; sort by hot / new / stars / code first |
| **Bilingual UI** | Chinese-first interface; English cases carry a Chinese reference next to the original |
| **Runnable code** | Code snippets on every detail page, one click to copy |
| **Real covers** | Each case uses its platform's own art: repo social card, model card, article image, post preview |
| **Fresh data** | Every Monday the pipeline re-collects and merges; one failing source never blocks the run and empty results never overwrite |
| **Static by default** | Astro static output; canonical / Open Graph / JSON-LD; desktop and mobile layouts |

## Stack

| Layer | Choice |
|---|---|
| Static site | Astro |
| Interaction | React |
| Styling | Vanilla CSS |
| Data pipeline | Node.js scripts (GitHub / HuggingFace / RSS collection and merge) |
| Testing | Playwright (desktop + mobile smoke tests) |

## Getting Started

```bash
npm install
npm run dev
```

The dev server runs at [http://localhost:4321/laya-case/](http://localhost:4321/laya-case/) — the same `/laya-case/` subpath as production.

```bash
npm run check   # type check (astro check)
npm run build   # static build → dist/
```

Pushing to `main` runs checks and the build in GitHub Actions, then deploys to the **[Live Preview](https://learningbydoingnow.github.io/laya-case/)**. The `base` is pinned to `/laya-case/` (defined in `astro.config.mjs`), so local development, tests and production all run under the identical subpath and produce byte-identical output.

## Data

The pipeline runs collection and merge as two steps:

```bash
npm run data:fetch                    # collect GitHub / HuggingFace / Reddit / blogs
npm run data:fetch -- --only=github   # collect a subset of sources
npm run data:build                    # merge auto + manual → src/data/cases.json
```

- Collection output goes to `src/data/auto/*.json`
- Hand-picked entries live in `src/data/manual/*.json` (sources without a public API, e.g. X, Zhihu); a manual entry overrides an auto entry with the same URL
- `src/data/cases.json` is generated by the merge — never edit it by hand
- Cover strategy: GitHub repo social cards, HuggingFace official thumbnails, og:image and preview images for articles and posts; `npm run data:covers` backfills manual entries and any missing cover (Medium via its feed; Zhihu and Juejin are skipped as they block crawlers)
- Without `GITHUB_TOKEN` GitHub search is limited to 10 requests/min; set the variable for a higher quota
- English sources default to `translation.status: "pending"`; Chinese references are filled in manually or by a later translation pass
- Scheduled refresh: `.github/workflows/refresh-data.yml` runs every Monday at 03:00 UTC (manual trigger supported). One failing source never blocks the run, empty results keep the existing file, and a case count below 60 aborts the publish. Only when data actually changed does `github-actions[bot]` push an English commit and trigger a CI rebuild and deploy

Each case follows `schemaVersion: 1` and contains:

- `sourceType`: github / huggingface / reddit / x / threads / blog / video / official
- `title`, `excerpt`, `author`, `canonicalUrl`, `createdAt`, `lang`
- `translation`: Chinese reference (ready / pending)
- `code`: runnable snippet (language + source)
- `metrics`: stars / forks / upvotes / comments / likes / views (per source)
- `tags`: use-case tags (routing, moderation, agents, benchmarks ...)
- `variants`: Laya variants or runtimes in use (multilingual / laya.cpp / laya-mlx ...)
- `links`, `imageUrl`, `curatedAt`, `curatedBy`

### Configuration

The public origin (origin only, no subpath) can be set through an environment variable at build time to generate canonical URLs and share metadata; the `/laya-case/` subpath itself is pinned in the `base` option of `astro.config.mjs`. CI injects this variable automatically:

```bash
PUBLIC_SITE_URL=https://learningbydoingnow.github.io npm run build
```

## Test

Locally (with the dev server running):

```bash
npm run test:smoke
```

The same suite against the live deployment verifies it behaves exactly like local:

```bash
TEST_ORIGIN=https://learningbydoingnow.github.io npm run test:smoke
```

Tests use the locally installed Chrome.

## Credits

- Code structure based on [Jev-Case](https://github.com/Hiwoniu/Jev-Case) (MIT License) — thanks Hiwoniu
- Laya models and weights belong to [Convai Innovations](https://huggingface.co/convaiinnovations) (Apache 2.0)

## License

The code uses the [MIT License](./LICENSE) (inherited from Jev-Case).

Tweets, articles, code snippets, account details and trademarks belong to their original authors and platforms; this project only indexes public sources and keeps the original links.
