import { mkdir, readFile, writeFile } from "node:fs/promises";

export const UA = "Laya-Case-Collector/0.1 (community case index)";

export async function getJson(url, { headers = {} } = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json", ...headers },
  });
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getText(url, { headers = {} } = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, ...headers },
  });
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  }
  return res.text();
}

export async function writeAuto(name, cases) {
  await mkdir("src/data/auto", { recursive: true });
  const path = `src/data/auto/${name}.json`;

  let previous = [];
  try {
    const existing = JSON.parse(await readFile(path, "utf8"));
    previous = Array.isArray(existing) ? existing : existing.cases ?? [];
  } catch {
    // First fetch, or the file is unreadable: treat it as a fresh write.
  }

  // Guard: when a whole source fails (rate limited, endpoint down) it returns
  // an empty array. Never overwrite existing data with an empty result, or the
  // source's history would be wiped.
  if (cases.length === 0 && previous.length > 0) {
    console.warn(
      `  [guard] ${name}: fetched 0 but ${previous.length} exist; keeping existing file`,
    );
    return path;
  }

  // Existing entries keep their first-seen timestamp and only new entries take
  // the current time. Otherwise re-collecting identical content would keep
  // bumping curatedAt and turn every scheduled run into an empty commit.
  const firstSeen = new Map(
    previous
      .map((item) => [item.id, item.curatedAt])
      .filter(([, value]) => value),
  );
  const stamp = new Date().toISOString();
  const stamped = cases.map((item) => ({
    ...item,
    curatedAt: firstSeen.get(item.id) ?? item.curatedAt ?? stamp,
  }));
  await writeFile(path, `${JSON.stringify(stamped, null, 2)}\n`);
  return path;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectLang(text) {
  return /[\u4e00-\u9fff]/.test(text) ? "zh" : "en";
}

export function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

export function compact(text, max = 460) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > max
    ? `${normalized.slice(0, max).trim()}...`
    : normalized;
}

export function makeLink(url) {
  return { url, displayUrl: undefined, domain: domainOf(url) };
}

export function slugId(prefix, value) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}-${slug}`;
}
