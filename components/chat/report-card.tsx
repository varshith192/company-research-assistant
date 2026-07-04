"use client";

import { useState } from "react";
import {
  Building2,
  ChevronDown,
  ExternalLink,
  FileDown,
  Globe,
  Lightbulb,
  Loader2,
  MapPin,
  MessageCircleQuestion,
  Phone,
  Send,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ResearchResult } from "@/lib/types";

interface ReportCardProps {
  result: ResearchResult;
  onDownloadPdf: () => void;
  downloading: boolean;
  discordStatus?: "sending" | "sent" | "error" | null;
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function ReportCard({ result, onDownloadPdf, downloading, discordStatus }: ReportCardProps) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const { company, competitors, sources } = result;

  return (
    <Card className="w-full overflow-hidden p-0">
      <div className="border-b bg-muted/40 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-tight">{company.companyName}</h3>
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
              >
                <Globe className="h-3.5 w-3.5" />
                {hostname(company.website)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            {result.model}
          </Badge>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2 text-sm">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{company.phone ?? <span className="text-muted-foreground">Not available</span>}</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{company.address ?? <span className="text-muted-foreground">Not available</span>}</span>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-foreground/90">{company.summary}</p>

        {company.products.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Products &amp; Services
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {company.products.map((p, i) => (
                <Badge key={i} variant="outline" className="font-normal">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {company.painPoints.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5" />
              AI-Generated Pain Points
            </h4>
            <ul className="space-y-1.5">
              {company.painPoints.map((point, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {competitors.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Competitors
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {competitors.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
                >
                  <span className="truncate font-medium">{c.name}</span>
                  {c.website ? (
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {hostname(c.website)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">Unknown</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(sources.crawledPages.length > 0 || sources.searchQueries.length > 0) && (
          <div>
            <button
              onClick={() => setSourcesOpen((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <MessageCircleQuestion className="h-3.5 w-3.5" />
              Sources used
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", sourcesOpen && "rotate-180")} />
            </button>
            {sourcesOpen && (
              <div className="mt-2 space-y-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                {sources.crawledPages.length > 0 && (
                  <div>
                    <p className="font-medium text-foreground">Crawled pages</p>
                    <ul className="mt-1 space-y-0.5">
                      {sources.crawledPages.map((p, i) => (
                        <li key={i} className="truncate">
                          {p.title} — {p.url}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {sources.searchQueries.length > 0 && (
                  <div>
                    <p className="font-medium text-foreground">Search queries</p>
                    <ul className="mt-1 space-y-0.5">
                      {sources.searchQueries.map((q, i) => (
                        <li key={i}>&ldquo;{q}&rdquo;</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-3 p-5 pt-4">
        <Button onClick={onDownloadPdf} disabled={downloading} className="gap-2">
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Download PDF Report
        </Button>

        {discordStatus && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs",
              discordStatus === "sent" && "text-emerald-600 dark:text-emerald-400",
              discordStatus === "error" && "text-destructive",
              discordStatus === "sending" && "text-muted-foreground"
            )}
          >
            {discordStatus === "sending" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {discordStatus === "sent" && <Send className="h-3.5 w-3.5" />}
            {discordStatus === "sending" && "Sending to Discord..."}
            {discordStatus === "sent" && "Sent to Discord"}
            {discordStatus === "error" && "Failed to send to Discord"}
          </span>
        )}
      </div>
    </Card>
  );
}
