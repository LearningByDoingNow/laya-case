import {
  compact,
  detectLang,
  getText,
  sleep,
  slugId,
  stripHtml,
  writeAuto,
} from "./lib/common.mjs";

const DDG_QUERIES = [
  '"laya" "system one" decision model',
  "convaiinnovations laya 案例",
  "laya jev 对比 开源",
  "laya decision model 使用",
];

const LAYA_CONTEXT =
  /model|jev|system[\s-]?one|decision|convai|inference|benchmark|llm|open[- ]source|决策|模型|开源|类型/i;

const LAYA_FALSE_POSITIVE =
  /laya\s*air|game\s*engine|unity|character|actress|singer|waifu|hotel|resort/i;

const DATE_META =
  /(?:article:published_time|og:published_time|datePublished"?\s*:\s*)"([^"]{4,40})"/i;

function looksRelevant(text) {
  if (!/laya/i.test(text)) return false;
  if (LAYA_FALSE_POSITIVE.test(text)) return false;
  return LAYA_CONTEXT.test(text);
}

function decodeDdgHref(href) {
  try {
    const url = href.startsWith("http") ? new URL(href) : new URL(`https:${href}`);
    const target = url.searchParams.get("uddg");
    return target ? decodeURIComponent(target) : url.toString();
  } catch {
    return undefined;
  }
}

function parseRssItems(xml) {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/g) ?? [];
  for (const block of blocks.slice(0, 30)) {
    const title = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(block)?.[1];
    const link = /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/.exec(block)?.[1];
    const pubDate = /<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/.exec(block)?.[1];
    const description = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/.exec(block)?.[1];
    const creator = /<dc:creator>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/dc:creator>/.exec(block)?.[1];
    if (title && link) items.push({ title, link, pubDate, description, creator });
  }
  return items;
}

async function fetchPublishDate(url) {
  try {
    const html = await getText(url);
    const match = DATE_META.exec(html);
    if (!match) return undefined;
    const parsed = new Date(match[1]);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  } catch {
    return undefined;
  }
}

function toCase(entry) {
  const textPool = `${entry.title} ${stripHtml(entry.description ?? "")}`;
  const excerpt =
    compact(stripHtml(entry.description ?? ""), 480) ||
    `围绕 Laya 的公开文章：${entry.title}`;

  return {
    id: entry.id,
    sourceType: "blog",
    canonicalUrl: entry.canonicalUrl,
    title: entry.title,
    author: {
      name: entry.author ?? "未知作者",
      handle: entry.author ?? "unknown",
      ...(entry.profileUrl ? { profileUrl: entry.profileUrl } : {}),
    },
    createdAt: entry.createdAt ?? new Date().toISOString(),
    excerpt,
    lang: detectLang(textPool),
    metrics: entry.metrics ?? {},
    tags: [],
    variants: [],
    links: entry.links ?? [],
    curatedAt: new Date().toISOString(),
    curatedBy: "auto",
  };
}

async function fetchDdg() {
  const byUrl = new Map();

  for (const query of DDG_QUERIES) {
    try {
      const html = await getText(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      );
      const anchors =
        html.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g) ??
        [];
      const snippets =
        html.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g) ?? [];

      anchors.forEach((anchor, index) => {
        const href = /href="([^"]+)"/.exec(anchor)?.[1];
        const title = stripHtml(/>([\s\S]*?)<\/a>/.exec(anchor)?.[1] ?? "");
        const snippet = stripHtml(
          />([\s\S]*?)<\/a>/.exec(snippets[index] ?? "")?.[1] ?? "",
        );
        const url = href ? decodeDdgHref(href) : undefined;
        if (!url || !title) return;
        if (url.includes("duckduckgo.com")) return;
        if (!looksRelevant(`${title} ${snippet}`)) return;
        const clean = new URL(url);
        ["utm_source", "utm_medium", "utm_campaign", "ref"].forEach((param) =>
          clean.searchParams.delete(param),
        );
        byUrl.set(clean.toString(), { title, snippet });
      });
      console.log(`  [blogs] ddg q=${query} -> ${anchors.length} hits`);
    } catch (error) {
      console.warn(`  [blogs] ddg q=${query} failed: ${error.message}`);
    }
    await sleep(1500);
  }

  const cases = [];
  let budget = 8;
  for (const [url, meta] of byUrl) {
    if (budget <= 0) break;
    budget -= 1;
    const createdAt = await fetchPublishDate(url);
    cases.push(
      toCase({
        id: slugId(
          "blog",
          url.replace(/^https?:\/\//, "").split(/[?#]/)[0],
        ),
        canonicalUrl: url,
        title: meta.title,
        author: new URL(url).hostname.replace(/^www\./, ""),
        createdAt,
        description: meta.snippet,
        links: [],
      }),
    );
    await sleep(500);
  }
  return cases;
}

async function fetchRssFeed(url, idPrefix) {
  const xml = await getText(url);
  const items = parseRssItems(xml);
  return items
    .filter((item) => looksRelevant(`${item.title} ${stripHtml(item.description ?? "")}`))
    .map((item) => ({
      id: slugId(
        idPrefix,
        item.link.replace(/^https?:\/\//, "").split(/[?#]/)[0],
      ),
      canonicalUrl: item.link,
      title: stripHtml(item.title),
      author: item.creator ? stripHtml(item.creator) : undefined,
      createdAt: item.pubDate ? new Date(item.pubDate).toISOString() : undefined,
      description: item.description ?? "",
      links: [],
    }));
}

async function fetchDevTo() {
  const text = await getText("https://dev.to/api/articles?tag=laya&per_page=20");
  const items = JSON.parse(text);
  return items
    .filter((item) => looksRelevant(`${item.title} ${item.description ?? ""}`))
    .map((item) => ({
      id: slugId(
        "devto",
        item.url.replace(/^https?:\/\//, "").split(/[?#]/)[0],
      ),
      canonicalUrl: item.url,
      title: item.title,
      author: item.user?.username,
      createdAt: item.published_at,
      description: item.description ?? "",
      metrics: { likes: item.positive_reactions_count ?? 0 },
      links: [],
    }));
}

export async function fetchBlogs() {
  const cases = [];

  try {
    cases.push(...(await fetchDdg()));
  } catch (error) {
    console.warn(`  [blogs] ddg failed: ${error.message}`);
  }

  try {
    const devto = await fetchDevTo();
    cases.push(...devto);
    console.log(`  [blogs] dev.to -> ${devto.length} kept`);
  } catch (error) {
    console.warn(`  [blogs] dev.to failed: ${error.message}`);
  }

  for (const [feed, prefix] of [
    ["https://medium.com/feed/tag/laya", "medium"],
    ["https://medium.com/feed/tag/machine-learning", "medium-ml"],
  ]) {
    try {
      const items = await fetchRssFeed(feed, prefix);
      cases.push(...items);
      console.log(`  [blogs] ${feed} -> ${items.length} kept`);
    } catch (error) {
      console.warn(`  [blogs] ${feed} failed: ${error.message}`);
    }
    await sleep(800);
  }

  await writeAuto("blogs", cases);
  return cases.length;
}
