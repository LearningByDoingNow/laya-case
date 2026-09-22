import {
  compact,
  detectLang,
  getJson,
  getText,
  sleep,
  slugId,
  writeAuto,
} from "./lib/common.mjs";

const OFFICIAL_MODELS = [
  "convaiinnovations/laya",
  "convaiinnovations/laya-multilingual",
  "convaiinnovations/laya-typed-decisions",
];

const LAYA_FALSE_POSITIVE =
  /laya\s*air|layaengine|game\s*engine|\bunity\b|unreal|\bflutter\b/i;

const LAYA_TAGS = new Set([
  "laya",
  "system-one",
  "systemone",
  "system-1",
  "typed-decisions",
  "calibrated-decisions",
]);

const CODE_FENCE = /```([a-z]+)\n([\s\S]*?)```/g;

function looksRelevant(item) {
  const id = item.id ?? item.modelId ?? "";
  const repoName = id.split("/").slice(1).join("/");
  const text = `${id} ${(item.tags ?? []).join(" ")}`;
  if (LAYA_FALSE_POSITIVE.test(text)) return false;
  if (id.startsWith("convaiinnovations/laya")) return true;
  if ((item.tags ?? []).some((tag) => LAYA_TAGS.has(tag))) return true;
  // 仓库名以 laya 开头（laya-mlx、laya-cpp ...）
  if (/^laya[-.]/i.test(repoName)) return true;
  return false;
}

async function fetchCard(modelId) {
  for (const name of ["README.md", "readme.md"]) {
    try {
      const text = await getText(
        `https://huggingface.co/${modelId}/raw/main/${name}`,
      );
      if (text.trim()) return text;
    } catch {
      // 继续尝试
    }
  }
  return "";
}

function cardIntro(card) {
  const body = card
    .replace(/^---[\s\S]*?---/, "")
    .replace(/^#+\s.*$/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_>|]/g, "");
  const paragraphs = body
    .split(/\n{2,}/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const intro = paragraphs.find((part) => part.length > 60 && !/^#/.test(part));
  return intro ? compact(intro) : "";
}

function cardCode(card) {
  CODE_FENCE.lastIndex = 0;
  let match;
  while ((match = CODE_FENCE.exec(card)) !== null) {
    const snippet = match[2].trim();
    if (snippet.length < 20 || snippet.length > 1600) continue;
    if (!/^(python|py|ts|typescript|js|javascript|bash|sh)$/.test(match[1])) {
      continue;
    }
    return { lang: match[1] === "py" ? "python" : match[1], snippet };
  }
  return undefined;
}

function cardImage(card) {
  const match =
    /<img\s[^>]*src="(https:\/\/[^"]+)"/i.exec(card) ||
    /!\[[^\]]*\]\((https:\/\/[^)\s]+)\)/i.exec(card);
  if (!match) return undefined;
  // 只保留稳定图床，避免相对路径与占位图
  return /huggingface\.co|githubusercontent\.com/.test(match[1])
    ? match[1]
    : undefined;
}

function inferVariants(id, text) {
  const variants = [];
  if (/multilingual/i.test(id) || /multilingual|100\+ languages/i.test(text)) {
    variants.push("multilingual");
  }
  if (/typed-decisions/i.test(id)) variants.push("typed-decisions");
  if (/\/laya$/.test(id)) variants.push("english");
  return variants.slice(0, 3);
}

function toCase(item, card) {
  const id = item.id ?? item.modelId;
  const repoName = id.split("/").slice(1).join("/");
  const intro = cardIntro(card);
  const title = repoName || id;
  const excerpt =
    intro ||
    `HuggingFace 上的 Laya 相关模型（${(item.tags ?? [])
      .filter((tag) => !tag.includes(":"))
      .slice(0, 6)
      .join(", ")}）。`;
  const code = cardCode(card);
  const image = cardImage(card);
  const textPool = `${id} ${excerpt}`;

  return {
    id: slugId("hf", id),
    sourceType: "huggingface",
    canonicalUrl: `https://huggingface.co/${id}`,
    title,
    author: {
      name: item.author ?? id.split("/")[0],
      handle: item.author ?? id.split("/")[0],
      profileUrl: `https://huggingface.co/${id.split("/")[0]}`,
    },
    createdAt: item.createdAt ?? item.lastModified ?? new Date().toISOString(),
    excerpt: compact(excerpt),
    lang: detectLang(textPool),
    ...(code ? { code } : {}),
    metrics:
      typeof item.likes === "number"
        ? { likes: item.likes }
        : {},
    ...(image ? { imageUrl: image } : {}),
    tags: [],
    variants: inferVariants(id, textPool),
    links: [],
    curatedAt: new Date().toISOString(),
    curatedBy: "auto",
  };
}

export async function fetchHf() {
  const byId = new Map();

  for (const modelId of OFFICIAL_MODELS) {
    try {
      const item = await getJson(
        `https://huggingface.co/api/models/${modelId}?full=true`,
      );
      byId.set(item.id, item);
    } catch (error) {
      console.warn(`  [hf] official ${modelId} failed: ${error.message}`);
    }
    await sleep(400);
  }

  const endpoints = [
    "https://huggingface.co/api/models?search=laya&limit=100&sort=downloads&direction=-1",
    "https://huggingface.co/api/spaces?search=laya&limit=60&sort=likes&direction=-1",
  ];

  for (const url of endpoints) {
    try {
      const items = await getJson(url);
      for (const item of items) {
        const key = item.id ?? item.modelId;
        if (key && looksRelevant(item)) byId.set(key, item);
      }
      console.log(`  [hf] ${url.split("?")[1]} -> ${items.length} hits`);
    } catch (error) {
      console.warn(`  [hf] ${url} failed: ${error.message}`);
    }
    await sleep(600);
  }

  const items = [...byId.values()];
  const cases = [];
  for (const item of items) {
    const card = await fetchCard(item.id ?? item.modelId);
    cases.push(toCase(item, card));
    await sleep(220);
  }

  await writeAuto("huggingface", cases);
  return cases.length;
}
