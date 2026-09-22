import {
  compact,
  detectLang,
  getJson,
  getText,
  sleep,
  slugId,
  writeAuto,
} from "./lib/common.mjs";

// 官方仓库不在 convaiinnovations 组织下，单独保证收录。
const OFFICIAL_REPOS = ["NandhaKishorM/laya"];

// 搜索词覆盖：官方仓库引用、pip 安装命令、System One / typed decision 关键词、
// 各语言运行时（laya.cpp / mlx / rust / go ...）与 topic 标记。
const QUERIES = [
  '"NandhaKishorM/laya" in:readme',
  '"pip install laya" in:readme',
  'laya "system one"',
  'laya "typed decision"',
  "laya decision model",
  "laya.cpp",
  "laya convaiinnovations",
  "topic:laya",
];

const LAYA_CONTEXT =
  /system[\s-]?one|system[\s-]?1|decision|typed|jev|convai|nandha|modernbert|rlcd|noul|calibrat|guardrail|moderation|routing|classif|inference|runtime|server|\bapi\b|\bsdk\b|bench|arena|playground|agent|\bmcp\b|onnx|\bmlx\b|candle|\brust\b|\bgolang\b|\bdocker\b|mirror|elixir|typescript|node|browser|skill/i;

const LAYA_FALSE_POSITIVE =
  /laya\s*air|layaengine|laya engine|game\s*engine|gameengine|游戏|引擎|beating\b|cocos|行为树|behavior tree|\bunity\b|unreal|\bflutter\b|\bcambodia\b|\bfilipino\b|\bphilippine\b/i;

const README_NAMES = ["README.md", "readme.md", "README.MD", "Readme.md", "README"];

const CODE_FENCE = /```([a-z]+)\n([\s\S]*?)```/g;

function readmeCode(readme, langHint) {
  // 跳过过短的片段（比如单独的 `pip install laya`），取第一个可用代码块
  CODE_FENCE.lastIndex = 0;
  let match;
  while ((match = CODE_FENCE.exec(readme)) !== null) {
    const lang = match[1];
    const snippet = match[2].trim();
    if (snippet.length < 20 || snippet.length > 1600) continue;
    if (!/^(python|py|ts|typescript|js|javascript|bash|sh|elixir|ex|rust|go)$/.test(lang)) {
      continue;
    }
    return { lang: langHint ?? lang, snippet };
  }
  return undefined;
}

function looksRelevant(repo) {
  // laya 必须出现在名称或描述里（仅 topic 命中说明关联不可靠）
  const core = `${repo.name} ${repo.description ?? ""}`;
  if (!/laya/i.test(core)) return false;
  const text = `${core} ${(repo.topics ?? []).join(" ")}`;
  if (LAYA_FALSE_POSITIVE.test(text)) return false;
  return LAYA_CONTEXT.test(text);
}

async function searchRepos(query) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(
    query,
  )}&per_page=30&sort=stars&order=desc`;
  const headers = { "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const data = await getJson(url, { headers });
  return data.items ?? [];
}

async function fetchReadme(fullName) {
  for (const name of README_NAMES) {
    try {
      const text = await getText(
        `https://raw.githubusercontent.com/${fullName}/HEAD/${name}`,
      );
      if (text.trim()) return text;
    } catch {
      // 尝试下一个常见文件名
    }
  }
  return "";
}

function readmeIntro(readme) {
  const body = readme
    .replace(/^---[\s\S]*?---/, "")
    .replace(/^#+\s.*$/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_>]/g, "");
  const paragraphs = body.split(/\n{2,}/).map((part) => part.replace(/\s+/g, " ").trim());
  const intro = paragraphs.find((part) => part.length > 60);
  return intro ? compact(intro) : "";
}

function readmeImage(readme) {
  const match = /<img\s[^>]*src="(https:\/\/[^"]+)"/i.exec(readme) ||
    /!\[[^\]]*\]\((https:\/\/[^)\s]+)\)/i.exec(readme);
  return match?.[1];
}

function inferVariants(text) {
  const variants = [];
  const rules = [
    ["laya.cpp", /laya\.cpp/i],
    ["laya-mlx", /\bmlx\b/i],
    ["laya-rust", /\brust\b/i],
    ["laya-go", /\bgo server\b|\blaya-go\b/i],
    ["laya-candle", /\bcandle\b/i],
    ["laya.cpp", /\bonnx\b/i],
    ["multilingual", /multilingual|100\+ languages/i],
    ["typed-decisions", /typed[- ]decisions/i],
    ["node", /node\.?js|typescript/i],
    ["elixir", /elixir/i],
  ];
  for (const [variant, rule] of rules) {
    if (rule.test(text) && !variants.includes(variant)) variants.push(variant);
    if (variants.length >= 3) break;
  }
  return variants;
}

function toCase(repo, readme) {
  const intro = readmeIntro(readme);
  const excerpt = repo.description || intro || "GitHub 上使用 / 围绕 Laya 构建的开源项目。";
  const code = readmeCode(readme);
  const image = readmeImage(readme);
  const textPool = [repo.name, repo.description ?? "", intro].join(" ");

  return {
    id: slugId("gh", repo.full_name),
    sourceType: "github",
    canonicalUrl: repo.html_url,
    title: repo.name,
    author: {
      name: repo.owner.login,
      handle: repo.owner.login,
      avatarUrl: repo.owner.avatar_url,
      profileUrl: repo.owner.html_url,
    },
    createdAt: repo.created_at,
    excerpt: compact(excerpt),
    lang: detectLang(textPool),
    ...(code ? { code } : {}),
    metrics: {
      ...(typeof repo.stargazers_count === "number"
        ? { stars: repo.stargazers_count }
        : {}),
      ...(typeof repo.forks_count === "number" ? { forks: repo.forks_count } : {}),
    },
    ...(image ? { imageUrl: image } : {}),
    tags: [],
    variants: inferVariants(textPool),
    links: [],
    curatedAt: new Date().toISOString(),
    curatedBy: "auto",
  };
}

export async function fetchGithub() {
  const byId = new Map();

  for (const fullName of OFFICIAL_REPOS) {
    try {
      const repo = await getJson(`https://api.github.com/repos/${fullName}`, {
        headers:
          process.env.GITHUB_TOKEN !== undefined
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {},
      });
      byId.set(repo.full_name.toLowerCase(), repo);
    } catch (error) {
      console.warn(`  [github] official repo ${fullName} failed: ${error.message}`);
    }
    await sleep(800);
  }

  for (const query of QUERIES) {
    try {
      const items = await searchRepos(query);
      for (const repo of items) {
        if (looksRelevant(repo)) byId.set(repo.full_name.toLowerCase(), repo);
      }
      console.log(`  [github] q=${query} -> ${items.length} hits`);
    } catch (error) {
      console.warn(`  [github] q=${query} failed: ${error.message}`);
    }
    await sleep(2200);
  }

  const repos = [...byId.values()]
    .sort((a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0))
    .slice(0, 30);

  const cases = [];
  for (const repo of repos) {
    const readme = await fetchReadme(repo.full_name);
    cases.push(toCase(repo, readme));
    await sleep(180);
  }

  await writeAuto("github", cases);
  return cases.length;
}
