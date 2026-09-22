import { useEffect, useMemo, useState } from "react";
import {
  getHotScore,
  sourceGroup,
  tagLabel,
} from "../../lib/cases";
import type { CaseItem } from "../../lib/types";
import CaseCard from "./CaseCard";

type SortMode = "hot" | "new" | "stars" | "code";
type FilterMode = "all" | "repo" | "discuss" | "article" | "code" | "zh";

interface CaseWallProps {
  cases: CaseItem[];
  scoreReferenceTime: string;
}

export default function CaseWall({
  cases,
  scoreReferenceTime,
}: CaseWallProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("hot");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [tag, setTag] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const scoreTime = new Date(scoreReferenceTime).getTime();

  const stats = useMemo(
    () => ({
      total: cases.length,
      repo: cases.filter(
        (item) => sourceGroup(item) === "repo",
      ).length,
      code: cases.filter((item) => item.code).length,
      zh: cases.filter(
        (item) => item.lang === "zh" || item.translation?.status === "ready",
      ).length,
    }),
    [cases],
  );

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of cases) {
      for (const entry of item.tags) {
        counts.set(entry, (counts.get(entry) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [cases]);

  const visibleCases = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = cases.filter((item) => {
      const searchText = [
        item.title,
        item.excerpt,
        item.translation?.text ?? "",
        item.author.name,
        item.author.handle,
        item.code?.snippet ?? "",
        ...item.tags,
        ...item.variants,
        ...item.links.map((link) => link.domain),
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !needle || searchText.includes(needle);
      const matchesFilter =
        filter === "all" ||
        (filter === "repo" && sourceGroup(item) === "repo") ||
        (filter === "discuss" && sourceGroup(item) === "discuss") ||
        (filter === "article" && sourceGroup(item) === "article") ||
        (filter === "code" && Boolean(item.code)) ||
        (filter === "zh" &&
          (item.lang === "zh" || item.translation?.status === "ready"));
      const matchesTag = !tag || item.tags.includes(tag);
      return matchesQuery && matchesFilter && matchesTag;
    });

    return filtered.sort((a, b) => {
      const hot = getHotScore(b, scoreTime) - getHotScore(a, scoreTime);
      if (sort === "new") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || hot
        );
      }
      if (sort === "stars") {
        return (b.metrics.stars ?? -1) - (a.metrics.stars ?? -1) || hot;
      }
      if (sort === "code") {
        return Number(Boolean(b.code)) - Number(Boolean(a.code)) || hot;
      }
      return hot;
    });
  }, [cases, filter, query, scoreTime, sort, tag]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <div data-case-wall-ready={hydrated ? "true" : "false"}>
      <section className="signal-head" aria-labelledby="page-title">
        <div className="signal-title-block">
          <p className="eyebrow">OPEN-SOURCE CASE INDEX / NON-OFFICIAL</p>
          <h1 id="page-title">
            Laya 在开源世界，
            <br />
            <span>正在长成什么。</span>
          </h1>
        </div>
        <div className="signal-stats" aria-label="案例库统计">
          <div>
            <strong>{stats.total}</strong>
            <span>收录案例</span>
          </div>
          <div>
            <strong>{stats.repo}</strong>
            <span>开源仓库</span>
          </div>
          <div>
            <strong>{stats.code}</strong>
            <span>带可运行代码</span>
          </div>
          <div>
            <strong>{stats.zh}</strong>
            <span>中文参考</span>
          </div>
        </div>
      </section>

      <section className="about-strip" aria-labelledby="about-title">
        <div className="about-copy">
          <p className="eyebrow">WHAT IS LAYA</p>
          <h2 id="about-title">先认识一下 Laya</h2>
          <p>
            Laya 是 Convai Innovations 开源的 System 1
            决策模型家族（Apache 2.0）：输入状态与结构化问题，单次前向传播直接输出带校准概率的类型化判断——分类、打分、是非——从不生成文本，所以没有幻觉可解析。覆盖
            100+ 语言，权重完全开放，可本地部署、可微调。社区常把它作为 Jev
            的开源替代来实测与对比，下方案例收录了大量 Laya vs Jev 同题对比。
          </p>
          <code className="quickstart">pip install laya</code>
        </div>
        <div className="about-facts">
          <div>
            <strong>~33ms</strong>
            <span>单题前向延迟</span>
          </div>
          <div>
            <strong>100+</strong>
            <span>支持语言</span>
          </div>
          <div>
            <strong>3</strong>
            <span>官方 checkpoint</span>
          </div>
          <div>
            <strong>Apache 2.0</strong>
            <span>开放权重</span>
          </div>
        </div>
      </section>

      <section className="case-wall" aria-labelledby="wall-title">
        <div className="wall-toolbar">
          <div className="toolbar-heading">
            <h2 id="wall-title">案例流</h2>
            <span>{visibleCases.length} 条信号</span>
          </div>

          <label className="search-field">
            <span>搜索</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="标题、摘要、作者、代码或域名"
              autoComplete="off"
            />
          </label>

          <div className="control-row">
            <div className="segmented" aria-label="排序方式">
              {(
                [
                  ["hot", "热门"],
                  ["new", "最新"],
                  ["stars", "Star 优先"],
                  ["code", "代码优先"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={sort === value ? "is-active" : ""}
                  onClick={() => setSort(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="segmented filters" aria-label="筛选条件">
              {(
                [
                  ["all", "全部"],
                  ["repo", "仓库"],
                  ["discuss", "讨论"],
                  ["article", "文章"],
                  ["code", "有代码"],
                  ["zh", "中文"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={filter === value ? "is-active" : ""}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {tagCounts.length > 0 && (
          <div className="tag-filters" aria-label="按用途标签筛选">
            <button
              type="button"
              className={!tag ? "is-active" : ""}
              onClick={() => setTag(null)}
            >
              全部标签
            </button>
            {tagCounts.map(([entry, count]) => (
              <button
                key={entry}
                type="button"
                className={tag === entry ? "is-active" : ""}
                onClick={() => setTag(tag === entry ? null : entry)}
              >
                {tagLabel(entry)} <b>{count}</b>
              </button>
            ))}
          </div>
        )}

        {visibleCases.length > 0 ? (
          <div className="case-grid">
            {visibleCases.map((item, index) => (
              <CaseCard
                key={item.id}
                item={item}
                index={index}
                hotScore={getHotScore(item, scoreTime)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="eyebrow">NO MATCHING SIGNAL</p>
            <h2>没有匹配的案例</h2>
            <p>清除搜索或切换筛选条件后重试。</p>
          </div>
        )}
      </section>
    </div>
  );
}
