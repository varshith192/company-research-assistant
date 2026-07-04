"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowUp, Building2, Loader2, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { apiUrl } from "@/lib/api-base";
import { useSettings } from "@/lib/settings-context";
import type { ProgressEvent, ProgressStep, ResearchResult } from "@/lib/types";
import { ProgressStepper } from "./progress-stepper";
import { ReportCard } from "./report-card";

interface ChatTurn {
  id: string;
  query: string;
  status: "streaming" | "done" | "error";
  step: ProgressStep;
  stepMessage: string;
  result?: ResearchResult;
  error?: string;
  downloading?: boolean;
  discordStatus?: "sending" | "sent" | "error" | null;
}

const EXAMPLES = ["Stripe", "Tesla", "Microsoft", "https://www.notion.so"];

export function ChatInterface() {
  const { settings, hasDiscordConfig } = useSettings();
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Give each new search its own browser history entry so the Back button
  // steps back through past searches (ending at the empty hero view)
  // instead of immediately leaving the site.
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      window.history.pushState({ messages }, "", window.location.href);
    } else {
      window.history.replaceState({ messages }, "", window.location.href);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      const state = event.state as { messages?: ChatTurn[] } | null;
      prevMessageCountRef.current = state?.messages?.length ?? 0;
      setMessages(state?.messages ?? []);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function applyEvent(id: string, event: ProgressEvent) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        if (event.step === "error") {
          return { ...m, status: "error", error: event.error ?? "Something went wrong." };
        }
        if (event.step === "done" && event.result) {
          void maybeSendDiscord(id, event.result);
          return { ...m, status: "done", step: event.step, stepMessage: event.message, result: event.result };
        }
        return { ...m, step: event.step, stepMessage: event.message };
      })
    );
  }

  async function maybeSendDiscord(id: string, result: ResearchResult) {
    if (!hasDiscordConfig) return;
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, discordStatus: "sending" } : m)));
    try {
      const res = await fetch(apiUrl("/api/discord"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: settings.discordBotToken,
          channelId: settings.discordChannelId,
          applicant: { name: settings.applicantName, email: settings.applicantEmail },
          result,
        }),
      });
      if (!res.ok) throw new Error();
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, discordStatus: "sent" } : m)));
      toast.success("Report sent to Discord.");
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, discordStatus: "error" } : m)));
      toast.error("Failed to send report to Discord.");
    }
  }

  async function submit(query: string) {
    const trimmed = query.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setInput("");
    const id = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id, query: trimmed, status: "streaming", step: "resolving", stepMessage: "Starting research..." },
    ]);

    try {
      const res = await fetch(apiUrl("/api/research"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, model: settings.model }),
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error ?? "Research request failed.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            applyEvent(id, JSON.parse(line) as ProgressEvent);
          } catch {
            // ignore malformed line
          }
        }
      }
      if (buffer.trim()) {
        try {
          applyEvent(id, JSON.parse(buffer) as ProgressEvent);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: "error", error: message } : m)));
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf(id: string, result: ResearchResult) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, downloading: true } : m)));
    try {
      const res = await fetch(apiUrl("/api/pdf"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result,
          applicant: { name: settings.applicantName, email: settings.applicantEmail },
        }),
      });
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.company.companyName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-research-report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download PDF report.");
    } finally {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, downloading: false } : m)));
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Building2 className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Research any company in seconds
            </h1>
            <p className="mx-auto max-w-lg text-muted-foreground">
              Enter a company name or website URL. We&apos;ll crawl the site, search the web, and
              generate an AI-powered research report with competitor insights.
            </p>
          </div>

          <form
            className="w-full max-w-xl"
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
          >
            <div className="flex items-center gap-2 rounded-2xl border bg-card p-2 shadow-sm">
              <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. Stripe or https://stripe.com"
                className="border-0 shadow-none focus-visible:ring-0"
                disabled={busy}
              />
              <Button type="submit" size="icon" disabled={busy || !input.trim()} className="shrink-0 rounded-xl">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => submit(ex)}
                disabled={busy}
                className="rounded-full border bg-card px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-6 py-6">
            {messages.map((m) => (
              <div key={m.id} className="space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    {m.query}
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="w-full max-w-full">
                    {m.status === "streaming" && (
                      <Card className="p-5">
                        <ProgressStepper currentStep={m.step} />
                      </Card>
                    )}

                    {m.status === "error" && (
                      <Card className="border-destructive/40 bg-destructive/5 p-5">
                        <div className="flex items-start gap-2.5 text-sm">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                          <div className="space-y-2">
                            <p className="text-destructive">{m.error}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => submit(m.query)}
                              disabled={busy}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Try again
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}

                    {m.status === "done" && m.result && (
                      <ReportCard
                        result={m.result}
                        onDownloadPdf={() => downloadPdf(m.id, m.result!)}
                        downloading={Boolean(m.downloading)}
                        discordStatus={m.discordStatus}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="sticky bottom-0 border-t bg-background/80 py-4 backdrop-blur">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(input);
              }}
            >
              <div className="flex items-center gap-2 rounded-2xl border bg-card p-2 shadow-sm">
                <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Research another company..."
                  className="border-0 shadow-none focus-visible:ring-0"
                  disabled={busy}
                />
                <Button type="submit" size="icon" disabled={busy || !input.trim()} className="shrink-0 rounded-xl">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
