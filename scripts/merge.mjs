import { readdir, readFile, writeFile } from "node:fs/promises";
import { stripHtml } from "./lib/common.mjs";

// Tag inference rules: a match assigns the tag, order sets priority.
const TAG_RULES = [
  ["vs-jev", /\bjev\b|typesafe/i],
  ["benchmark", /benchmark|评测|对比|head-to-head|\bvs\b|arena|准确率|accuracy/i],
  ["agent", /\bagent\b|tool.?call|工具调用|\bmcp\b|browser automation|浏览器自动化/i],
  ["routing", /rout(e|er|ing)|路由|分诊|triage/i],
  ["moderation", /moderat|审核|guardrail|nsfw|安全过滤|content safety/i],
  ["classification", /classif|分类|categor|intent|意图/i],
  ["extraction", /extract|抽取|结构化|json schema|字段提取/i],
  ["scoring", /scor(e|ing)|rank|评分|排序|优先级|priority|概率/i],
  ["multilingual", /multilingual|多语言|100\+ languages|中文|chinese|i18n/i],
  ["fine-tune", /fine.?tun|微调|\blora\b|finetun|rlcd 训练|train/i],
  ["deploy", /deploy|部署|onnx|laya\.cpp|\bmlx\b|docker|生产|serving|推理服务|edge/i],
  ["tutorial", /tutorial|教程|quickstart|getting started|上手|入门|示例/i],
  ["routing", /ticket|工单|support|客服|triage/i],
];

const VALID_SOURCES = new Set([
  "github",
  "huggingface",
  "reddit",
  "x",
  "threads",
  "blog",
  "video",
  "official",
]);

function inferTags(...texts) {
  const pool = texts.filter(Boolean).join(" ");
  const tags = [];
  for (const [tag, rule] of TAG_RULES) {
    if (rule.test(pool) && !tags.includes(tag)) tags.push(tag);
    if (tags.length >= 4) break;
  }
  return tags;
}

async function loadDir(dir) {
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  // Merge priority: github > huggingface > reddit > blogs.
  // On a same-URL conflict the earlier entry keeps its fields and later
  // ones only fill in what is missing.
  const PRIORITY = ["github.json", "huggingface.json", "reddit.json", "blogs.json"];
  const ordered = [...files]
    .filter((name) => name.endsWith(".json"))
    .sort((a, b) => {
      const ia = PRIORITY.indexOf(a);
      const ib = PRIORITY.indexOf(b);
      return (ia === -1 ? PRIORITY.length : ia) - (ib === -1 ? PRIORITY.length : ib);
    });
  const entries = [];
  for (const file of ordered) {
    try {
      const parsed = JSON.parse(await readFile(`${dir}/${file}`, "utf8"));
      const list = Array.isArray(parsed) ? parsed : parsed.cases ?? [];
      for (const item of list) entries.push(item);
      console.log(`  loaded ${dir}/${file}: ${list.length} entries`);
    } catch (error) {
      console.warn(`  skip ${dir}/${file}: ${error.message}`);
    }
  }
  return entries;
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "source", "ref"].forEach(
      (param) => parsed.searchParams.delete(param),
    );
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

function normalizeCase(entry, curatedBy, now) {
  const canonicalUrl = normalizeUrl(entry.canonicalUrl ?? "");
  const title = String(entry.title ?? "").trim() || "Untitled case";
  const excerpt = stripHtml(String(entry.excerpt ?? "")).trim() ||
    "社区公开案例，详情见原文链接。";

  const curatedAt = entry.curatedAt ?? entry.createdAt ?? now;
  const translation =
    entry.translation ??
    (entry.lang !== "zh"
      ? { status: "pending", targetLang: "zh-CN", detectedLang: entry.lang ?? "en" }
      : undefined);

  return {
    id: entry.id,
    sourceType: VALID_SOURCES.has(entry.sourceType) ? entry.sourceType : "blog",
    canonicalUrl: entry.canonicalUrl,
    title,
    author: {
      name: entry.author?.name ?? entry.author?.handle ?? "未知作者",
      handle: entry.author?.handle ?? "unknown",
      ...(entry.author?.avatarUrl ? { avatarUrl: entry.author.avatarUrl } : {}),
      ...(entry.author?.profileUrl ? { profileUrl: entry.author.profileUrl } : {}),
    },
    createdAt: entry.createdAt ?? curatedAt,
    excerpt,
    lang: entry.lang ?? (/[\u4e00-\u9fff]/.test(title + excerpt) ? "zh" : "en"),
    ...(translation ? { translation } : {}),
    ...(entry.code?.snippet
      ? { code: { lang: entry.code.lang ?? "python", snippet: entry.code.snippet } }
      : {}),
    metrics: entry.metrics ?? {},
    ...(entry.imageUrl ? { imageUrl: entry.imageUrl } : {}),
    tags:
      Array.isArray(entry.tags) && entry.tags.length > 0
        ? entry.tags
        : inferTags(title, excerpt, entry.translation?.text, entry.code?.snippet),
    variants: Array.isArray(entry.variants) ? entry.variants : [],
    links: Array.isArray(entry.links)
      ? entry.links.filter((link) => link?.url)
      : [],
    curatedAt,
    curatedBy,
    _urlKey: normalizeUrl(canonicalUrl),
  };
}

const now = new Date().toISOString();
const auto = await loadDir("src/data/auto");
const manual = await loadDir("src/data/manual");

const byUrl = new Map();
const byId = new Map();

function register(entry) {
  const urlKey = entry._urlKey;
  const existingByUrl = urlKey ? byUrl.get(urlKey) : undefined;
  const existingById = byId.get(entry.id);

  const target = existingById ?? existingByUrl;
  if (!target) {
    byId.set(entry.id, entry);
    if (urlKey) byUrl.set(urlKey, entry);
    return;
  }

  // manual overrides auto; inside one source the fuller record wins.
  const preferManual = entry.curatedBy === "manual";
  const merged = preferManual
    ? { ...target, ...entry, metrics: { ...target.metrics, ...entry.metrics } }
    : { ...entry, ...target, metrics: { ...entry.metrics, ...target.metrics } };

  if (target.id !== merged.id) byId.delete(target.id);
  byId.set(merged.id, merged);
  if (urlKey) byUrl.set(urlKey, merged);
}

for (const entry of auto) {
  register(normalizeCase(entry, "auto", now));
}
for (const entry of manual) {
  register(normalizeCase(entry, "manual", now));
}

const seenIds = new Set();
const cases = [];
for (const entry of byId.values()) {
  delete entry._urlKey;
  let id = entry.id;
  let suffix = 2;
  while (seenIds.has(id)) {
    id = `${entry.id}-${suffix}`;
    suffix += 1;
  }
  entry.id = id;
  seenIds.add(id);
  cases.push(entry);
}

cases.sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
);

const database = {
  schemaVersion: 1,
  // Derived from the newest curated entry so repeated merges of the same
  // inputs produce byte-identical output (CI rebuilds data before deploy).
  generatedAt: cases.reduce(
    (latest, item) => (item.curatedAt > latest ? item.curatedAt : latest),
    "",
  ),
  aliases: [],
  cases,
};

await writeFile(
  "src/data/cases.json",
  `${JSON.stringify(database, null, 2)}\n`,
);

const counts = {};
for (const item of cases) {
  counts[item.sourceType] = (counts[item.sourceType] ?? 0) + 1;
}
const readyTranslations = cases.filter(
  (item) => item.translation?.status === "ready",
).length;
const withCode = cases.filter((item) => item.code).length;

console.log(`\nmerged ${cases.length} cases -> src/data/cases.json`);
console.log(`  by source: ${JSON.stringify(counts)}`);
console.log(`  with code: ${withCode}, translations ready: ${readyTranslations}`);
