import {
  compact,
  detectLang,
  getText,
  makeLink,
  sleep,
  slugId,
  stripHtml,
  writeAuto,
} from "./lib/common.mjs";

// Reddit's .json endpoint returns 403 for plain clients, but search.rss (Atom) works.
const SEARCHES = [
  { sub: "LocalLLaMA", q: "laya" },
  { sub: "LocalLLaMA", q: '"system one" model' },
  { sub: "LocalLLaMA", q: "laya.cpp OR laya-mlx" },
  { sub: "MachineLearning", q: "laya decision model" },
  { sub: "LocalLLaMA", q: "convaiinnovations" },
];

const LAYA_CONTEXT =
  /model|jev|system[\s-]?one|decision|convai|weights|inference|benchmark|\bmlx\b|onnx|hugging\s?face|llm|checkpoint|latency|classification|routing|guardrail|moderation|open[- ]source|typed/i;

const LAYA_FALSE_POSITIVE =
  /laya\s*air|game\s*engine|\bunity\b|girl|character|actress|singer|cosplay|waifu|hotel|resort/i;

function looksRelevant(text) {
  if (!/laya/i.test(text)) return false;
  if (LAYA_FALSE_POSITIVE.test(text)) return false;
  return LAYA_CONTEXT.test(text);
}

async function searchRss(sub, q) {
  const url = `https://www.reddit.com/r/${sub}/search.rss?q=${encodeURIComponent(
    q,
  )}&restrict_sr=on&sort=new&t=month`;
  const xml = await getText(url);
  const entries = [];
  const blocks = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  for (const block of blocks) {
    const title = /<title[^>]*>([\s\S]*?)<\/title>/.exec(block)?.[1];
    const id = /<id[^>]*>t3_([a-z0-9]+)<\/id>/.exec(block)?.[1];
    const published =
      /<published[^>]*>([^<]+)<\/published>/.exec(block)?.[1] ??
      /<updated[^>]*>([^<]+)<\/updated>/.exec(block)?.[1];
    const name = /<name[^>]*>([^<]+)<\/name>/.exec(block)?.[1];
    const link = /<link[^>]*href="(https:\/\/www\.reddit\.com\/[^"]+)"/.exec(
      block,
    )?.[1];
    const content =
      /<content type="html"[^>]*>([\s\S]*?)<\/content>/.exec(block)?.[1] ?? "";
    if (title && id && link) {
      entries.push({ title, id, published, name, link, content });
    }
  }
  return entries;
}

function extractExternalLink(content) {
  const decoded = content.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const hrefs = [...decoded.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(
    (match) => match[1],
  );
  return hrefs.find(
    (href) => !/reddit\.com|redd\.it|preview\.redd|redditstatic/.test(href),
  );
}

function toCase(post) {
  const body = stripHtml(post.content);
  const externalUrl = extractExternalLink(post.content);
  const excerpt =
    compact(body, 480) ||
    (externalUrl
      ? `讨论帖并附外部链接：${externalUrl}`
      : "Reddit 上关于 Laya 的社区讨论帖。");
  const author = post.name?.replace(/^\/u\//, "") ?? "[deleted]";

  return {
    id: slugId("reddit", post.id),
    sourceType: "reddit",
    canonicalUrl: post.link,
    title: stripHtml(post.title),
    author: {
      name: author,
      handle: author,
      ...(author !== "[deleted]"
        ? { profileUrl: `https://www.reddit.com/user/${author}` }
        : {}),
    },
    createdAt: post.published
      ? new Date(post.published).toISOString()
      : new Date().toISOString(),
    excerpt,
    lang: detectLang(`${post.title} ${body}`),
    metrics: {},
    tags: [],
    variants: [],
    links: externalUrl ? [makeLink(externalUrl)] : [],
    curatedAt: new Date().toISOString(),
    curatedBy: "auto",
  };
}

export async function fetchReddit() {
  const byId = new Map();

  for (const { sub, q } of SEARCHES) {
    try {
      const posts = await searchRss(sub, q);
      let kept = 0;
      for (const post of posts) {
        const text = `${post.title} ${stripHtml(post.content)}`;
        if (looksRelevant(text)) {
          byId.set(post.id, post);
          kept += 1;
        }
      }
      console.log(
        `  [reddit] r/${sub} q=${q} -> ${posts.length} hits, ${kept} kept`,
      );
    } catch (error) {
      console.warn(`  [reddit] r/${sub} q=${q} failed: ${error.message}`);
    }
    // Reddit RSS rate limits are strict (429), so space the queries out
    await sleep(4500);
  }

  const cases = [...byId.values()].map(toCase);
  await writeAuto("reddit", cases);
  return cases.length;
}
