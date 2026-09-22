import rawCases from "../data/cases.json";
import type { CaseDatabase, CaseItem, CaseSourceType } from "./types";

const database = rawCases as CaseDatabase;

if (database.schemaVersion !== 1 || !Array.isArray(database.cases)) {
  throw new Error("cases.json does not match schemaVersion 1");
}

export const SOURCE_LABELS: Record<CaseSourceType, string> = {
  github: "GitHub",
  huggingface: "HuggingFace",
  reddit: "Reddit",
  x: "X",
  threads: "Threads",
  blog: "博客",
  video: "视频",
  official: "官方",
};

export const TAG_LABELS: Record<string, string> = {
  classification: "分类打分",
  routing: "路由分诊",
  moderation: "内容审核",
  agent: "Agent 工具",
  extraction: "结构化抽取",
  scoring: "评分排序",
  multilingual: "多语言",
  "fine-tune": "微调实战",
  deploy: "部署运行",
  benchmark: "评测对比",
  "vs-jev": "Jev 对比",
  tutorial: "上手教程",
};

export type SourceGroup = "repo" | "discuss" | "article";

export function getCases(): CaseItem[] {
  return database.cases;
}

export function getCaseAliases() {
  return database.aliases ?? [];
}

export function getGeneratedAt(): string {
  return database.generatedAt;
}

export function sourceLabel(sourceType: CaseSourceType): string {
  return SOURCE_LABELS[sourceType] ?? sourceType;
}

export function tagLabel(tag: string): string {
  return TAG_LABELS[tag] ?? tag;
}

export function sourceGroup(item: CaseItem): SourceGroup {
  if (item.sourceType === "github" || item.sourceType === "huggingface") {
    return "repo";
  }
  if (item.sourceType === "reddit" || item.sourceType === "x" || item.sourceType === "threads") {
    return "discuss";
  }
  return "article";
}

interface MetricEntry {
  key: keyof CaseItem["metrics"];
  label: string;
}

const METRIC_ORDER: MetricEntry[] = [
  { key: "stars", label: "Star" },
  { key: "upvotes", label: "Upvote" },
  { key: "likes", label: "点赞" },
  { key: "comments", label: "评论" },
  { key: "views", label: "浏览" },
  { key: "forks", label: "Fork" },
];

export function metricEntries(item: CaseItem): MetricEntry[] {
  return METRIC_ORDER.filter((entry) => {
    const value = item.metrics[entry.key];
    return typeof value === "number";
  });
}

export function getHotScore(
  item: CaseItem,
  referenceTime = Date.now(),
): number {
  const { stars, upvotes, likes, comments, views } = item.metrics;
  const signal =
    Math.log10((stars ?? 0) + 1) * 0.3 +
    Math.log10((upvotes ?? 0) + 1) * 0.28 +
    Math.log10((views ?? 0) + 1) * 0.18 +
    Math.log10((likes ?? 0) + 1) * 0.12 +
    Math.log10((comments ?? 0) + 1) * 0.12;
  const ageHours = Math.max(
    0,
    (referenceTime - new Date(item.createdAt).getTime()) / 3_600_000,
  );

  return signal * 0.5 ** (ageHours / 168);
}

export function caseCover(item: CaseItem): string {
  return item.imageUrl || `${import.meta.env.BASE_URL}poster-placeholder.svg`;
}

export function formatMetric(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}亿`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}万`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date(value));
}

export function compactText(value: string, length = 210): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length).trim()}...` : text;
}
