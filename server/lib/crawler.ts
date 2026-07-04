import * as cheerio from "cheerio";
import type { CrawledPage } from "./types";

const MAX_PAGES = 7;
const PER_PAGE_TIMEOUT_MS = 8000;
const TOTAL_TIME_BUDGET_MS = 25000;
const MAX_TEXT_LENGTH = 2500;

const CATEGORY_KEYWORDS: { category: string; patterns: RegExp[] }[] = [
  { category: "about", patterns: [/about/i, /company/i, /who-we-are/i, /our-story/i] },
  { category: "products", patterns: [/product/i, /platform/i, /features/i] },
  { category: "services", patterns: [/service/i] },
  { category: "solutions", patterns: [/solution/i, /use-case/i, /industries/i] },
  { category: "pricing", patterns: [/pricing/i, /plans/i] },
  { category: "contact", patterns: [/contact/i, /get-in-touch/i, /support/i] },
];

const SKIP_PATTERNS = [
  /login/i,
  /signin/i,
  /sign-in/i,
  /signup/i,
  /sign-up/i,
  /register/i,
  /account/i,
  /cart/i,
  /checkout/i,
  /wp-admin/i,
  /\.(pdf|jpg|jpeg|png|gif|svg|zip|mp4|css|js)$/i,
  /^mailto:/i,
  /^tel:/i,
  /^javascript:/i,
];

function shouldSkip(url: string): boolean {
  return SKIP_PATTERNS.some((p) => p.test(url));
}

function categorize(url: string, linkText: string): string | null {
  const haystack = `${url} ${linkText}`;
  for (const { category, patterns } of CATEGORY_KEYWORDS) {
    if (patterns.some((p) => p.test(haystack))) return category;
  }
  return null;
}

async function fetchWithTimeout(url: string, ms: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CompanyResearchBot/1.0; +https://vercel.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractText($: cheerio.CheerioAPI): string {
  $("script, style, nav, footer, header, noscript, svg, iframe, form").remove();
  const text = $("body").text();
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);
}

function extractTitle($: cheerio.CheerioAPI): string {
  return $("title").first().text().trim() || $("h1").first().text().trim() || "Untitled";
}

function normalizePath(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return url;
  }
}

interface CandidateLink {
  url: string;
  category: string;
}

function discoverCandidates(html: string, baseUrl: string): CandidateLink[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const candidates: CandidateLink[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || shouldSkip(href)) return;

    let absolute: URL;
    try {
      absolute = new URL(href, base);
    } catch {
      return;
    }

    if (absolute.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) {
      return;
    }
    if (shouldSkip(absolute.pathname)) return;

    const category = categorize(absolute.pathname, $(el).text());
    if (!category) return;

    const key = normalizePath(absolute.toString());
    if (seen.has(key)) return;
    seen.add(key);

    candidates.push({ url: `${absolute.origin}${absolute.pathname}`, category });
  });

  return candidates;
}

export async function crawlSite(startUrl: string): Promise<CrawledPage[]> {
  const startedAt = Date.now();
  const pages: CrawledPage[] = [];
  const contentHashes = new Set<string>();

  const homepageHtml = await fetchWithTimeout(startUrl, PER_PAGE_TIMEOUT_MS);
  if (!homepageHtml) {
    throw new Error(`Could not reach ${startUrl}. The site may be down or blocking crawlers.`);
  }

  const $home = cheerio.load(homepageHtml);
  const homeText = extractText($home);
  pages.push({
    url: startUrl,
    title: extractTitle($home),
    category: "home",
    textExcerpt: homeText,
  });
  contentHashes.add(homeText.slice(0, 200));

  const candidates = discoverCandidates(homepageHtml, startUrl);

  const byCategory = new Map<string, CandidateLink>();
  for (const c of candidates) {
    if (!byCategory.has(c.category)) byCategory.set(c.category, c);
  }

  const toFetch = Array.from(byCategory.values()).slice(0, MAX_PAGES - 1);

  const CONCURRENCY = 4;
  let cursor = 0;

  async function worker() {
    while (cursor < toFetch.length) {
      const idx = cursor++;
      const candidate = toFetch[idx];
      if (Date.now() - startedAt > TOTAL_TIME_BUDGET_MS) return;

      const html = await fetchWithTimeout(candidate.url, PER_PAGE_TIMEOUT_MS);
      if (!html) continue;

      const $page = cheerio.load(html);
      const text = extractText($page);
      if (text.length < 40) continue;

      const hashKey = text.slice(0, 200);
      if (contentHashes.has(hashKey)) continue;
      contentHashes.add(hashKey);

      pages.push({
        url: candidate.url,
        title: extractTitle($page),
        category: candidate.category,
        textExcerpt: text,
      });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, toFetch.length) }, () => worker())
  );

  return pages;
}
