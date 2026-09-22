import { expect, test } from "@playwright/test";

test("renders the case wall with Laya intro and filters", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#page-title")).toContainText("Laya 在开源世界");
  await page.waitForFunction(
    () =>
      document.querySelector('[data-case-wall-ready="true"]') !== null,
  );

  // Laya 特性介绍带
  await expect(page.locator(".about-strip .quickstart")).toHaveText(
    "pip install laya",
  );
  await expect(page.locator(".about-facts strong").first()).toContainText("33ms");

  const totalCases = await page.locator(".case-card").count();
  expect(totalCases).toBeGreaterThan(30);

  const codeCases = await page.locator('.case-card[data-code="true"]').count();
  expect(codeCases).toBeGreaterThan(3);

  // 溢出检查（桌面 + 移动 viewport 共用）
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  // 来源分组筛选
  await page.getByRole("button", { name: "仓库", exact: true }).click();
  const repoCases = await page.locator(".case-card").count();
  expect(repoCases).toBeGreaterThan(0);
  expect(repoCases).toBeLessThan(totalCases);
  await page.getByRole("button", { name: "全部", exact: true }).click();

  // 用途标签筛选存在且可点
  const tagFilter = page.locator(".tag-filters button").nth(1);
  if ((await tagFilter.count()) > 0) {
    await tagFilter.click();
    const tagged = await page.locator(".case-card").count();
    expect(tagged).toBeGreaterThan(0);
    expect(tagged).toBeLessThanOrEqual(totalCases);
    await page.locator('.tag-filters button:has-text("全部标签")').click();
  }

  // 搜索空态
  await page.locator('input[type="search"]').fill("not-a-real-case-signal");
  await expect(page.getByText("没有匹配的案例")).toBeVisible();
});

test("renders the official case page with code and source link", async ({
  page,
}) => {
  await page.goto("case/gh-nandhakishorm-laya/");
  await expect(page.locator(".detail-title")).toHaveText("laya");
  await expect(page.locator(".origin-text")).toBeVisible();
  await expect(page.locator(".detail-coordinates")).toContainText(
    "SOURCE / GitHub",
  );
  await expect(page.getByRole("link", { name: /查看 GitHub 原链接/ })).toHaveAttribute(
    "href",
    "https://github.com/NandhaKishorM/laya",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /gh-nandhakishorm-laya/,
  );
  // 官方仓库应带可运行代码
  await expect(page.locator(".detail-code")).toBeVisible();
  await expect(page.getByRole("button", { name: "复制" })).toBeVisible();
});

test("shows pending Chinese reference for untranslated cases", async ({
  page,
}) => {
  await page.goto("case/gh-mizorewww-laya-mlx/");
  await expect(page.locator(".translation-block")).toContainText(
    "中文参考整理中",
  );
});

test("switches case wall text to Chinese translations", async ({ page }) => {
  await page.goto("./");
  const card = page.locator(
    'a[href$="/case/medium-laya-bye-bye-typescript-jev/"]',
  );
  await expect(card.locator(".original-text")).toBeVisible();
  await expect(card.locator(".translated-text")).toBeHidden();

  await page.getByRole("checkbox", { name: "中文翻译" }).check();
  await expect(card.locator(".original-text")).toBeHidden();
  await expect(card.locator(".translated-text")).toBeVisible();
  await expect(card.locator(".translated-text")).toContainText("非自回归");
});

test("does not expose unpublished case ids", async ({ page }) => {
  const response = await page.goto("case/not-a-real-case-id/");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("这条案例不存在。")).toBeVisible();
});
