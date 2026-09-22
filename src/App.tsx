import { useEffect, useState } from "react";
import CaseDetail from "./components/react/CaseDetail";
import CaseWall from "./components/react/CaseWall";
import rawCases from "./data/cases.json";
import type { CaseDatabase, CaseItem, CaseSourceType } from "./lib/types";

const database = rawCases as CaseDatabase;
const aliases = new Map(
  database.aliases.map((alias) => [alias.id, alias.canonicalCaseId]),
);

const CODE_SOURCES: CaseSourceType[] = ["github", "huggingface"];

type Route =
  | { kind: "home" }
  | { kind: "case"; item: CaseItem }
  | { kind: "not-found" };

function readRoute(): Route {
  const pathname = window.location.pathname.replace(/\/+$/u, "") || "/";
  if (pathname === "/") return { kind: "home" };

  const match = pathname.match(/^\/case\/([^/]+)$/u);
  if (!match) return { kind: "not-found" };

  const requestedId = decodeURIComponent(match[1]);
  const canonicalId = aliases.get(requestedId) ?? requestedId;
  if (canonicalId !== requestedId) {
    window.history.replaceState({}, "", `/case/${canonicalId}`);
  }

  const item = database.cases.find((candidate) => candidate.id === canonicalId);
  return item ? { kind: "case", item } : { kind: "not-found" };
}

function setMeta(attribute: "name" | "property", key: string, value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = value;
}

function NotFound() {
  return (
    <section className="empty-state full">
      <p className="eyebrow">404 / CASE LOST</p>
      <h1>这条案例不存在。</h1>
      <a className="source-button compact" href="/">
        返回案例流
      </a>
    </section>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => readRoute());

  useEffect(() => {
    const handlePopState = () => {
      setRoute(readRoute());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (!anchor) return;

      const url = new URL(anchor.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        !/^\/(?:case\/[^/]+)?$/u.test(url.pathname)
      ) {
        return;
      }

      event.preventDefault();
      window.history.pushState({}, "", url.pathname);
      setRoute(readRoute());
      window.scrollTo({ top: 0 });
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    const item = route.kind === "case" ? route.item : undefined;
    const title = item
      ? `${item.title} · Laya Case`
      : route.kind === "home"
        ? "Laya Case | 开源 System 1 案例墙"
        : "Case not found | Laya Case";
    const description = item
      ? item.excerpt.slice(0, 180)
      : route.kind === "home"
        ? "浏览 GitHub、HuggingFace、Reddit 与博客上基于开源模型 Laya（System 1 决策模型）的公开案例、可运行代码与讨论。"
        : "没有找到这条案例。";
    const path = item ? `/case/${item.id}` : route.kind === "home" ? "/" : "/404";
    const canonicalURL = new URL(path, window.location.origin).toString();
    const image = item?.imageUrl;

    document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonicalURL);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);

    let canonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = canonicalURL;

    if (image) {
      setMeta("property", "og:image", image);
      setMeta("name", "twitter:card", "summary_large_image");
      setMeta("name", "twitter:image", image);
    } else {
      document.head
        .querySelector('meta[property="og:image"]')
        ?.remove();
      document.head
        .querySelector('meta[name="twitter:image"]')
        ?.remove();
      setMeta("name", "twitter:card", "summary");
    }

    const structuredData = document.getElementById("case-structured-data");
    if (!item) {
      structuredData?.remove();
      return;
    }

    const isCode = CODE_SOURCES.includes(item.sourceType);
    const script =
      structuredData instanceof HTMLScriptElement
        ? structuredData
        : document.createElement("script");
    script.id = "case-structured-data";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": isCode ? "SoftwareSourceCode" : "SocialMediaPosting",
      headline: item.title,
      datePublished: item.createdAt,
      url: item.canonicalUrl,
      ...(isCode
        ? {
            codeRepository: item.canonicalUrl,
            ...(item.code ? { programmingLanguage: item.code.lang } : {}),
          }
        : { articleBody: item.excerpt.slice(0, 1200) }),
      ...(image ? { image } : {}),
      ...(item.tags.length > 0 ? { keywords: item.tags.join(", ") } : {}),
      author: {
        "@type": isCode ? "Organization" : "Person",
        name: item.author.name,
        alternateName: `@${item.author.handle}`,
      },
    });
    if (!script.isConnected) document.head.append(script);
  }, [route]);

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Laya Case 首页">
          <span className="brand-mark">LAYA</span>
          <span className="brand-name">CASE</span>
        </a>
        <div className="header-meta">
          <span className="live-dot" aria-hidden="true" />
          <span>开源案例索引</span>
        </div>
        <nav className="header-nav" aria-label="主导航">
          <label className="translation-switch">
            <input type="checkbox" aria-label="中文翻译" />
            <span className="translation-option translation-original">原文</span>
            <span className="translation-option translation-chinese">中文</span>
          </label>
          <a href="/">案例</a>
          <a
            href="https://huggingface.co/convaiinnovations/laya"
            target="_blank"
            rel="noopener noreferrer"
          >
            HuggingFace
          </a>
        </nav>
      </header>

      <main>
        {route.kind === "home" && (
          <CaseWall
            cases={database.cases}
            scoreReferenceTime={new Date().toISOString()}
          />
        )}
        {route.kind === "case" && <CaseDetail item={route.item} />}
        {route.kind === "not-found" && <NotFound />}
      </main>

      <footer className="site-footer">
        <p>
          非官方社区整理，与 Convai Innovations / Laya
          无隶属关系。案例内容、代码与商标权利归原作者及原平台所有；站点代码基于
          Jev-Case（MIT）。
        </p>
        <p className="footer-tech">OPEN CASE INDEX / DATA ONLY / ORIGINALS LINKED</p>
      </footer>
    </div>
  );
}
