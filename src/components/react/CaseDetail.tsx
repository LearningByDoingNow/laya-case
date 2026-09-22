import { useState } from "react";
import {
  caseCover,
  formatDate,
  formatMetric,
  metricEntries,
  sourceLabel,
  tagLabel,
} from "../../lib/cases";
import type { CaseItem, CaseTranslation } from "../../lib/types";

interface CaseDetailProps {
  item: CaseItem;
}

function TranslationBlock({
  translation,
}: {
  translation?: CaseTranslation;
}) {
  if (!translation) return null;

  if (translation.status !== "ready" || !translation.text) {
    return (
      <div className="translation-block">
        <span>中文翻译</span>
        <p>中文参考整理中，欢迎补充。</p>
        <small>In progress; contributions welcome.</small>
      </div>
    );
  }

  return (
    <div className="translation-block">
      <span>中文翻译</span>
      <p>{translation.text}</p>
      <small>中文参考；原文内容与表达以原文为准。</small>
    </div>
  );
}

function CodeBlock({ code }: { code: NonNullable<CaseItem["code"]> }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code.snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="detail-section code-section">
      <div className="code-heading">
        <h2>可运行代码</h2>
        <button type="button" className="copy-button" onClick={copy}>
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre className="detail-code" data-lang={code.lang}>
        <code>{code.snippet}</code>
      </pre>
    </section>
  );
}

export default function CaseDetail({ item }: CaseDetailProps) {
  const cover = caseCover(item);
  const metrics = metricEntries(item);
  const profileHref = item.author.profileUrl ?? item.canonicalUrl;

  return (
    <article className="case-detail">
      <header className="detail-head">
        <a className="back-link" href="/">
          ← 返回案例流
        </a>
        <div className="detail-coordinates">
          <span>CASE / {item.id}</span>
          <span>SOURCE / {sourceLabel(item.sourceType)}</span>
          <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
        </div>
      </header>

      <div className="detail-grid">
        <section className="detail-media-panel" aria-label="案例封面">
          <div className="detail-unavailable">
            <img src={cover} alt="" />
            <span>
              {sourceLabel(item.sourceType)} / {item.sourceType.toUpperCase()}
            </span>
          </div>
          <div className="media-ledger">
            <span>
              {item.variants.length > 0
                ? `VARIANT / ${item.variants.join(", ").toUpperCase()}`
                : `SOURCE / ${sourceLabel(item.sourceType).toUpperCase()}`}
            </span>
          </div>
        </section>

        <div className="detail-copy">
          <div className="detail-author">
            <span className="author-avatar large">
              {item.author.avatarUrl ? (
                <img src={item.author.avatarUrl} alt="" />
              ) : (
                <b>{item.author.name.slice(0, 1).toUpperCase()}</b>
              )}
            </span>
            <span>
              <strong>{item.author.name}</strong>
              <a
                href={profileHref}
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                @{item.author.handle}
              </a>
            </span>
          </div>

          <h1 className="detail-title">{item.title}</h1>

          <blockquote className="origin-text">{item.excerpt}</blockquote>
          <TranslationBlock translation={item.translation} />

          {metrics.length > 0 && (
            <div className="detail-metrics">
              {metrics.map((entry) => (
                <div key={entry.key}>
                  <strong>{formatMetric(item.metrics[entry.key] ?? 0)}</strong>
                  <span>{entry.label}</span>
                </div>
              ))}
            </div>
          )}

          {item.code && <CodeBlock code={item.code} />}

          <a
            className="source-button"
            href={item.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            <span>查看 {sourceLabel(item.sourceType)} 原链接</span>
            <span aria-hidden="true">↗</span>
          </a>

          {item.links.length > 0 && (
            <section className="detail-section">
              <h2>引用与外链</h2>
              <div className="link-list">
                {item.links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    <span>{link.domain}</span>
                    <span>
                      <strong>{link.displayUrl || link.url}</strong>
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {item.tags.length > 0 && (
            <section className="detail-section">
              <h2>用途标签</h2>
              <div className="tag-list">
                {item.tags.map((entry) => (
                  <span key={entry}>{tagLabel(entry)}</span>
                ))}
              </div>
            </section>
          )}

          <section className="detail-section provenance">
            <h2>来源说明</h2>
            <p>
              本条为社区整理，仅展示公开来源与链接。代码、文本、头像及商标权利归原作者和原平台所有；Laya
              模型归 Convai Innovations 所有。
            </p>
            <p>
              整理方式：{item.curatedBy === "manual" ? "手动精选" : "自动采集"} ·
              整理时间：{formatDate(item.curatedAt)}
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
