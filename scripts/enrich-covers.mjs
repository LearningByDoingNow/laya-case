// Backfill for missing cover art. The auto sources produce their own covers
// during data:fetch; this pass covers manual entries and any auto entry still
// without one. Zhihu answers every agent with 403 and Juejin only exposes
// signed image URLs that expire within days, so both stay on the placeholder
// on purpose. The script only fills gaps, so it is safe to run repeatedly.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  BROWSER_UA,
  FB_CRAWLER_UA,
  getText,
  htmlImage,
  ogImage,
  sleep,
  UA,
} from "./lib/common.mjs";

const UA_LADDER = [UA, BROWSER_UA, FB_CRAWLER_UA];

// Sites that never yield a durable cover image.
const SKIP = [/zhihu\.com/, /juejin\.cn/];

// Upstream pages sometimes point their og:image at deployments that have
// already gone away. These map dead artwork to its durable copy in the
// official repo; the refresh pipeline reapplies the repair after every fetch.
const REPAIRS = new Map([
  [
    "https://laya-ai.vercel.app/laya_vs_jev_full.png",
    "https://raw.githubusercontent.com/NandhaKishorM/laya/main/assets/laya_vs_jev_full.png",
  ],
]);

async function ogFromPage(url) {
  for (const agent of UA_LADDER) {
    try {
      const html = await getText(url, { headers: { "User-Agent": agent } });
      const image = ogImage(html);
      if (image) return image;
    } catch {
      // Try the next agent in the ladder
    }
    await sleep(400);
  }
  return undefined;
}

async function ogFromMediumFeed(url) {
  const [publication, slug] = new URL(url).pathname.split("/").filter(Boolean);
  if (!publication || !slug) return undefined;
  const feeds = publication.startsWith("@")
    ? [`https://medium.com/feed/${publication}`]
    : [
        `https://medium.com/feed/${publication}`,
        `https://medium.com/feed/@${publication}`,
      ];
  for (const feed of feeds) {
    try {
      const xml = await getText(feed);
      const block = (xml.match(/<item[\s\S]*?<\/item>/g) ?? []).find((item) =>
        item.includes(slug),
      );
      const description =
        /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/.exec(
          block ?? "",
        )?.[1] ?? "";
      const content =
        /<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/.exec(
          block ?? "",
        )?.[1] ?? "";
      // Publication feeds put the hero image in content:encoded, personal
      // feeds put it in the description.
      const image = htmlImage(content) ?? htmlImage(description);
      if (image) return image;
    } catch {
      // Try the next feed variant
    }
    await sleep(400);
  }
  return undefined;
}

async function coverFor(item) {
  const url = item.canonicalUrl ?? "";
  if (!url || SKIP.some((rule) => rule.test(url))) return undefined;
  // Medium blocks page fetches outright, but its RSS feeds are open and carry
  // the hero image of every story.
  if (/^https?:\/\/([a-z0-9-]+\.)*medium\.com\//i.test(url)) {
    return (await ogFromMediumFeed(url)) ?? ogFromPage(url);
  }
  return ogFromPage(url);
}

async function enrichFile(path) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch {
    console.warn(`  [covers] skip ${path} (unreadable)`);
    return 0;
  }
  const entries = Array.isArray(parsed) ? parsed : (parsed.cases ?? []);
  let filled = 0;
  for (const entry of entries) {
    if (!entry) continue;
    if (entry.imageUrl && REPAIRS.has(entry.imageUrl)) {
      entry.imageUrl = REPAIRS.get(entry.imageUrl);
      filled += 1;
      console.log(`  [covers] ${entry.id} repaired -> ${entry.imageUrl.slice(0, 88)}`);
      continue;
    }
    if (entry.imageUrl) continue;
    const image = await coverFor(entry);
    if (image) {
      entry.imageUrl = image;
      filled += 1;
      console.log(`  [covers] ${entry.id} -> ${image.slice(0, 88)}`);
    }
    await sleep(200);
  }
  if (filled > 0) {
    const output = Array.isArray(parsed) ? entries : { ...parsed, cases: entries };
    await writeFile(path, `${JSON.stringify(output, null, 2)}\n`);
  }
  return filled;
}

export async function enrichCovers() {
  let files = [];
  try {
    files = (await readdir("src/data/auto"))
      .filter((name) => name.endsWith(".json"))
      .map((name) => `src/data/auto/${name}`);
  } catch {
    // No auto directory yet; manual entries still get a pass below.
  }
  files.push("src/data/manual/cases.json");

  let total = 0;
  for (const path of files) {
    total += await enrichFile(path);
  }
  return total;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const filled = await enrichCovers().catch((error) => {
    console.error(`  [covers] failed: ${error.message}`);
    return 0;
  });
  console.log(`[covers] ${filled} backfilled`);
}
