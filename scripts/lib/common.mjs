import { mkdir, writeFile } from "node:fs/promises";

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
  // Stamp collection time once per fetch so downstream merges are deterministic.
  const stamp = new Date().toISOString();
  const stamped = cases.map((item) => ({ curatedAt: stamp, ...item }));
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
