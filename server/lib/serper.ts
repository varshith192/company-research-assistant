const SERPER_ENDPOINT = "https://google.serper.dev/search";

export interface SerperOrganicResult {
  title: string;
  link: string;
  snippet?: string;
}

interface SerperResponse {
  organic?: SerperOrganicResult[];
  knowledgeGraph?: {
    title?: string;
    website?: string;
    description?: string;
    attributes?: Record<string, string>;
  };
}

const NON_OFFICIAL_DOMAINS = [
  "wikipedia.org",
  "linkedin.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "crunchbase.com",
  "glassdoor.com",
  "indeed.com",
  "youtube.com",
  "bloomberg.com",
  "forbes.com",
  "g2.com",
  "capterra.com",
  "trustpilot.com",
  "amazon.com",
  "apps.apple.com",
  "play.google.com",
  "reddit.com",
  "medium.com",
  "github.com",
  "pitchbook.com",
  "owler.com",
  "zoominfo.com",
  "bing.com",
  "google.com",
];

function getApiKey(): string {
  const key = process.env.SERPER_API_KEY;
  if (!key) {
    throw new Error(
      "SERPER_API_KEY is not set. Add it to your environment to enable search."
    );
  }
  return key;
}

async function serperSearch(query: string, num = 10): Promise<SerperResponse> {
  const res = await fetch(SERPER_ENDPOINT, {
    method: "POST",
    headers: {
      "X-API-KEY": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num }),
  });

  if (!res.ok) {
    throw new Error(`Serper search failed (${res.status}): ${await res.text()}`);
  }

  return (await res.json()) as SerperResponse;
}

function isLikelyOfficialDomain(link: string): boolean {
  try {
    const host = new URL(link).hostname.replace(/^www\./, "");
    return !NON_OFFICIAL_DOMAINS.some(
      (banned) => host === banned || host.endsWith(`.${banned}`)
    );
  } catch {
    return false;
  }
}

export async function resolveOfficialSite(
  companyName: string
): Promise<{ website: string; searchQuery: string } | null> {
  const query = `${companyName} official website`;
  const data = await serperSearch(query, 10);

  if (data.knowledgeGraph?.website && isLikelyOfficialDomain(data.knowledgeGraph.website)) {
    return { website: normalizeUrl(data.knowledgeGraph.website), searchQuery: query };
  }

  const candidate = (data.organic ?? []).find((r) => isLikelyOfficialDomain(r.link));
  if (!candidate) return null;

  const url = new URL(candidate.link);
  return { website: `${url.protocol}//${url.hostname}`, searchQuery: query };
}

export function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.hostname}`;
}

export async function searchSnippets(
  query: string,
  num = 5
): Promise<{ query: string; results: SerperOrganicResult[] }> {
  const data = await serperSearch(query, num);
  return { query, results: data.organic ?? [] };
}

export async function findCompetitorWebsite(
  competitorName: string
): Promise<string | null> {
  const query = `${competitorName} official website`;
  const data = await serperSearch(query, 5);
  const candidate = (data.organic ?? []).find((r) => isLikelyOfficialDomain(r.link));
  if (!candidate) return null;
  return normalizeUrl(candidate.link);
}
