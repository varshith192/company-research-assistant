import { crawlSite } from "./crawler";
import { chatCompletion, parseJsonFromModel } from "./openrouter";
import { findCompetitorWebsite, normalizeUrl, resolveOfficialSite, searchSnippets } from "./serper";
import type { CompanyInfo, Competitor, CrawledPage, ProgressEvent, ResearchResult } from "./types";

const DOMAIN_LIKE = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i;

function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/\s/.test(trimmed)) return false;
  return DOMAIN_LIKE.test(trimmed);
}

interface AiAnalysis {
  companyName?: string;
  website?: string;
  phone?: string | null;
  address?: string | null;
  summary?: string;
  products?: string[];
  painPoints?: string[];
  competitors?: { name: string; website?: string | null }[];
}

function buildAnalysisPrompt(
  inputQuery: string,
  website: string,
  crawledPages: CrawledPage[],
  contactSnippets: string,
  competitorSnippets: string
): string {
  const pageContext = crawledPages
    .map((p) => `### ${p.category.toUpperCase()} — ${p.title} (${p.url})\n${p.textExcerpt}`)
    .join("\n\n")
    .slice(0, 12000);

  return `You are a B2B company research analyst. Analyze the company behind the website "${website}" (original user query: "${inputQuery}") using the crawled website content and search snippets below, then respond with ONLY a single JSON object (no markdown fences, no commentary).

CRAWLED WEBSITE CONTENT:
${pageContext || "(no pages could be crawled)"}

CONTACT/ADDRESS SEARCH SNIPPETS:
${contactSnippets || "(none found)"}

COMPETITOR SEARCH SNIPPETS:
${competitorSnippets || "(none found)"}

Respond with a JSON object matching exactly this shape:
{
  "companyName": string,
  "website": string,
  "phone": string or null,
  "address": string or null,
  "summary": string (2-4 sentences describing what the company does),
  "products": string[] (concise names of products/services offered),
  "painPoints": string[] (3-6 likely business pain points or challenges this company faces, framed as opportunities a vendor/partner could raise in outreach — infer from their market position, industry, and offerings),
  "competitors": [{ "name": string, "website": string or null }] (3-6 real companies in the same country/industry offering similar products or services; only include real, known companies)
}

Only output the JSON object.`;
}

function coerceCompanyInfo(
  analysis: AiAnalysis,
  fallbackWebsite: string,
  fallbackName: string
): CompanyInfo {
  return {
    companyName: analysis.companyName?.trim() || fallbackName,
    website: analysis.website?.trim() || fallbackWebsite,
    phone: analysis.phone?.trim() || null,
    address: analysis.address?.trim() || null,
    summary: analysis.summary?.trim() || "No summary could be generated.",
    products: Array.isArray(analysis.products) ? analysis.products.filter(Boolean) : [],
    painPoints: Array.isArray(analysis.painPoints) ? analysis.painPoints.filter(Boolean) : [],
  };
}

export async function* runResearch(
  rawQuery: string,
  model: string
): AsyncGenerator<ProgressEvent> {
  try {
    const query = rawQuery.trim();
    if (!query) {
      yield { step: "error", message: "Empty query", error: "Please enter a company name or website URL." };
      return;
    }

    yield { step: "resolving", message: `Resolving official website for "${query}"...` };

    let website: string;
    const searchQueries: string[] = [];
    let fallbackName = query;

    if (looksLikeUrl(query)) {
      website = normalizeUrl(query);
      fallbackName = new URL(website).hostname.replace(/^www\./, "").split(".")[0];
    } else {
      const resolved = await resolveOfficialSite(query);
      if (!resolved) {
        yield {
          step: "error",
          message: "Could not resolve website",
          error: `Couldn't find an official website for "${query}". Try providing the website URL directly.`,
        };
        return;
      }
      website = resolved.website;
      searchQueries.push(resolved.searchQuery);
      fallbackName = query;
    }

    yield { step: "crawling", message: `Crawling ${website}...` };

    let crawledPages: CrawledPage[] = [];
    try {
      crawledPages = await crawlSite(website);
    } catch {
      crawledPages = [];
    }

    yield { step: "searching", message: "Searching for contact details and competitors..." };

    const [contactResults, competitorResults] = await Promise.all([
      searchSnippets(`${fallbackName} contact phone number headquarters address`, 5).catch(() => null),
      searchSnippets(`${fallbackName} competitors alternatives`, 5).catch(() => null),
    ]);

    if (contactResults) searchQueries.push(contactResults.query);
    if (competitorResults) searchQueries.push(competitorResults.query);

    const contactSnippetText = (contactResults?.results ?? [])
      .map((r) => `- ${r.title}: ${r.snippet ?? ""}`)
      .join("\n");
    const competitorSnippetText = (competitorResults?.results ?? [])
      .map((r) => `- ${r.title}: ${r.snippet ?? ""}`)
      .join("\n");

    yield { step: "analyzing", message: `Analyzing with ${model}...` };

    const prompt = buildAnalysisPrompt(
      query,
      website,
      crawledPages,
      contactSnippetText,
      competitorSnippetText
    );

    const raw = await chatCompletion(model, [
      { role: "system", content: "You are a precise research analyst that only outputs valid JSON." },
      { role: "user", content: prompt },
    ]);

    const analysis = parseJsonFromModel<AiAnalysis>(raw);
    const company = coerceCompanyInfo(analysis, website, fallbackName);

    yield { step: "competitors", message: "Verifying competitor websites..." };

    const rawCompetitors = Array.isArray(analysis.competitors) ? analysis.competitors.slice(0, 6) : [];
    const competitors: Competitor[] = await Promise.all(
      rawCompetitors.map(async (c): Promise<Competitor> => {
        const name = c.name?.trim();
        if (!name) return { name: "Unknown", website: null };

        if (c.website) {
          try {
            return { name, website: normalizeUrl(c.website) };
          } catch {
            // fall through to search
          }
        }

        const found = await findCompetitorWebsite(name).catch(() => null);
        return { name, website: found };
      })
    );

    const result: ResearchResult = {
      company,
      competitors: competitors.filter((c) => c.name && c.name !== "Unknown"),
      sources: {
        crawledPages: crawledPages.map((p) => ({ url: p.url, title: p.title })),
        searchQueries,
      },
      model,
      generatedAt: new Date().toISOString(),
    };

    yield { step: "done", message: "Research complete.", result };
  } catch (err) {
    yield {
      step: "error",
      message: "Research failed",
      error: err instanceof Error ? err.message : "Unknown error occurred.",
    };
  }
}
