export interface CrawledPage {
  url: string;
  title: string;
  category: string;
  textExcerpt: string;
}

export interface Competitor {
  name: string;
  website: string | null;
}

export interface ResearchSources {
  crawledPages: { url: string; title: string }[];
  searchQueries: string[];
}

export interface CompanyInfo {
  companyName: string;
  website: string;
  phone: string | null;
  address: string | null;
  summary: string;
  products: string[];
  painPoints: string[];
}

export interface ResearchResult {
  company: CompanyInfo;
  competitors: Competitor[];
  sources: ResearchSources;
  model: string;
  generatedAt: string;
}

export type ProgressStep =
  | "resolving"
  | "crawling"
  | "searching"
  | "analyzing"
  | "competitors"
  | "done"
  | "error";

export interface ProgressEvent {
  step: ProgressStep;
  message: string;
  result?: ResearchResult;
  error?: string;
}

export interface ApplicantInfo {
  name: string;
  email: string;
}

export interface DiscordConfig {
  botToken: string;
  channelId: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  contextLength: number | null;
  promptPrice: string | null;
}

export interface ResearchRequestBody {
  query: string;
  model: string;
}
