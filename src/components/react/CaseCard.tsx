import {
  caseCover,
  compactText,
  formatMetric,
  metricEntries,
  sourceLabel,
  tagLabel,
} from "../../lib/cases";
import type { CaseItem } from "../../lib/types";

interface CaseCardProps {
  item: CaseItem;
  hotScore: number;
  index: number;
}

export default function CaseCard({ item, index }: CaseCardProps) {
  const cover = caseCover(item);
  const metrics = metricEntries(item).slice(0, 3);

  return (
    <a
      className="case-card"
      href={`/case/${item.id}`}
      data-case-card
      data-source={item.sourceType}
      data-code={item.code ? "true" : "false"}
      data-created={new Date(item.createdAt).getTime()}
    >
      <div className="case-visual">
        <span className="case-index">{String(index + 1).padStart(2, "0")}</span>
        <span className="case-signal">{sourceLabel(item.sourceType)}</span>
        <img
          src={cover}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.src = "/poster-placeholder.svg";
          }}
        />
        <span className="case-scanline" aria-hidden="true" />
      </div>

      <div className="case-card-body">
        <div className="case-author">
          <span className="author-avatar">
            {item.author.avatarUrl ? (
              <img
                src={item.author.avatarUrl}
                alt=""
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <b>{item.author.name.slice(0, 1).toUpperCase()}</b>
            )}
          </span>
          <span className="author-copy">
            <strong>{item.author.name}</strong>
            <small>@{item.author.handle}</small>
          </span>
        </div>

        <h3 className="case-title">{item.title}</h3>

        <p className="case-text original-text">{compactText(item.excerpt)}</p>
        {item.translation?.text && (
          <p className="case-text translated-text">
            {compactText(item.translation.text)}
          </p>
        )}

        {metrics.length > 0 && (
          <div className="case-metrics" aria-label="案例指标">
            {metrics.map((entry) => (
              <span key={entry.key}>
                <b>{formatMetric(item.metrics[entry.key] ?? 0)}</b>{" "}
                {entry.label}
              </span>
            ))}
          </div>
        )}

        <div className="case-flags">
          {item.code && <span className="flag code-flag">&lt;/&gt; 代码</span>}
          {item.translation?.text && (
            <span className="flag translation-flag">中文</span>
          )}
          {item.tags.slice(0, 2).map((entry) => (
            <span className="flag tag-flag" key={entry}>
              {tagLabel(entry)}
            </span>
          ))}
          {item.links.length > 0 && (
            <span className="flag link-flag">外链 {item.links.length}</span>
          )}
        </div>
      </div>
    </a>
  );
}
