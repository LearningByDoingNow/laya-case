export type CaseSourceType =
  | "github"
  | "huggingface"
  | "reddit"
  | "x"
  | "threads"
  | "blog"
  | "video"
  | "official";

export type CaseMetrics = {
  stars?: number;
  forks?: number;
  upvotes?: number;
  comments?: number;
  likes?: number;
  views?: number;
};

export interface CaseAuthor {
  name: string;
  handle: string;
  avatarUrl?: string;
  profileUrl?: string;
}

export interface CaseCode {
  lang: string;
  snippet: string;
}

export interface CaseTranslation {
  status: "ready" | "pending";
  text?: string;
  targetLang: string;
  detectedLang?: string;
}

export interface CaseLink {
  url: string;
  displayUrl?: string;
  domain: string;
}

export interface CaseItem {
  id: string;
  sourceType: CaseSourceType;
  canonicalUrl: string;
  title: string;
  author: CaseAuthor;
  createdAt: string;
  excerpt: string;
  lang: string;
  translation?: CaseTranslation;
  code?: CaseCode;
  metrics: CaseMetrics;
  imageUrl?: string;
  tags: string[];
  variants: string[];
  links: CaseLink[];
  curatedAt: string;
  curatedBy: "auto" | "manual";
}

export interface CaseAlias {
  id: string;
  canonicalCaseId: string;
}

export interface CaseDatabase {
  schemaVersion: 1;
  generatedAt: string;
  aliases: CaseAlias[];
  cases: CaseItem[];
}
