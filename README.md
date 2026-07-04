# Company Research Assistant

An AI-powered company research assistant. Give it a company name or a website URL and it
will resolve the official site, crawl it, enrich the findings with live web search, run AI
analysis, identify competitors, and produce a downloadable PDF report — all through a
ChatGPT-style interface.

Built for the Relu Consultancy AI & Automation Developer hackathon.

This project is split into two services:
- **Frontend** (this root directory) — Next.js chat UI, deploys to **Vercel**.
- **Backend** (`/server`) — a standalone Express API that does all crawling/search/AI/PDF/
  Discord work, deploys to **Render**.

> Note: the assignment's evaluation criteria ask for deployment as "a single unified
> project." This repo intentionally splits frontend and backend into two services instead
> (by request) — see [Deployment](#deployment) for how the two are wired together.

## Features

- **Company research** — accepts a company name *or* a website URL; resolves the official
  site via search when only a name is given.
- **Website crawler** — discovers and fetches Home/About/Products/Services/Solutions/
  Contact/Pricing pages, skips login/cart/duplicate pages, and extracts readable text for
  the AI (`lib/crawler.ts`).
- **Serper.dev search integration** — resolves official websites, finds contact/address
  details, and gathers competitor leads (`lib/serper.ts`).
- **OpenRouter AI integration** — any model available on OpenRouter can be selected from
  the Settings dialog; used to generate the company summary, products/services, AI pain
  points, and competitor suggestions (`lib/openrouter.ts`, `lib/research-pipeline.ts`).
- **Competitor analysis** — competitors are identified by the AI model and their websites
  are verified/backfilled with a Serper lookup when missing.
- **PDF report generation** — a polished PDF (company info, products, pain points,
  competitors) generated server-side with `@react-pdf/renderer` and downloadable with one
  click (`lib/pdf.tsx`).
- **Discord integration (bonus)** — a Settings tab to save a Discord Bot Token + Channel
  ID (plus applicant name/email). After each report, the app automatically posts the
  applicant/company details and the generated PDF to that Discord channel.
- **ChatGPT-style UI** — streamed, step-by-step progress (resolving → crawling →
  searching → analyzing → competitors → done) rendered as a live conversation, built with
  Tailwind CSS + shadcn/ui, fully responsive. Each search adds a browser history entry, so
  the Back button steps back through past searches instead of leaving the site.

## Tech Stack

**Frontend** (`/`): Next.js 16 (App Router) + TypeScript, Tailwind CSS + shadcn/ui.

**Backend** (`/server`): Express + TypeScript (run via `tsx`, no build step needed), reusing
the same `lib/` modules as the frontend originally did:
- **cheerio** — HTML parsing for the crawler (no headless browser, so it stays fast).
- **@react-pdf/renderer** — PDF generation, pure JS (no Chromium dependency).
- Native `fetch` for Serper.dev, OpenRouter, and the Discord REST API.
- **cors** — restricts which frontend origins may call the API.

No database and no authentication are used — there is nothing to persist. AI model choice
and Discord configuration are kept in the browser's `localStorage`.

## Getting Started (local development)

You run two processes locally: the Express API and the Next.js frontend.

### 1. Backend (`/server`)

```bash
cd server
npm install
cp .env.example .env
```

Fill in `server/.env`:

| Variable | Required | Description |
|---|---|---|
| `SERPER_API_KEY` | Yes | API key from [serper.dev](https://serper.dev). Used for all search: resolving official websites, contact/address lookups, and competitor discovery. |
| `OPENROUTER_API_KEY` | Yes | API key from [openrouter.ai](https://openrouter.ai/keys). Used for all AI analysis. Any model listed on OpenRouter can be selected in-app. |
| `PORT` | No | Defaults to `4000`. Render sets this automatically in production. |

The API accepts requests from any origin (no CORS allow-list) since there's no user data
or session/cookie auth involved — the Serper/OpenRouter secrets never leave the server
regardless of who calls it.

```bash
npm run dev
```

This starts the API at `http://localhost:4000` (check `GET /healthz`).

### 2. Frontend (repo root)

In a second terminal:

```bash
npm install
cp .env.example .env.local
```

`.env.local` just needs:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Discord's **Bot Token** and **Channel ID** are *not* environment variables — they are
entered at runtime from the app's Settings → Discord Integration tab and stored only in
the browser (per the assignment's "no database" requirement). The evaluator provides
these values at review time.

## Deployment

### Backend → Render

1. Push this repo to GitHub.
2. On Render, create a new **Web Service** pointed at this repo with **root directory
   `server`**.
3. Build command: `npm install && npm run build` (type-checks only; the app runs directly
   via `tsx`, no compiled output needed). Start command: `npm start`.
4. Add environment variables: `SERPER_API_KEY`, `OPENROUTER_API_KEY`.
5. Deploy and note the resulting URL, e.g. `https://company-research-api.onrender.com`.

### Frontend → Vercel

1. Import the same repo into [Vercel](https://vercel.com/new) — root directory stays the
   repo root (do **not** point it at `server`).
2. Add environment variable `NEXT_PUBLIC_API_BASE_URL` = the Render URL from above.
3. Deploy and note the resulting URL, e.g. `https://company-research-assistant.vercel.app`.

**Known limitation:** Render's free tier spins down after ~15 minutes of inactivity, so the
first request after idling can take 30-50 seconds while it cold-starts — the UI will just
sit on "Resolving official website..." during that window. Subsequent requests are fast.

## How It Works

1. User submits a company name or URL in the chat interface.
2. If a name was given, Serper.dev search resolves the most likely official website
   (filtering out LinkedIn, Wikipedia, Crunchbase, etc.).
3. The crawler fetches the homepage, discovers same-site links that look like About /
   Products / Services / Solutions / Pricing / Contact pages, fetches each (bounded
   concurrency + time budget), strips nav/script/footer noise, and extracts readable text
   — deduping pages with near-identical content and skipping login/cart/account pages.
4. Serper.dev is queried again for contact details and competitor leads to supplement the
   crawled content.
5. All of the above is sent to the user-selected OpenRouter model with a prompt asking for
   a structured JSON result: company summary, products/services, AI-generated pain points,
   and 3-6 competitors.
6. Any competitor missing a website gets a follow-up Serper lookup.
7. The result streams back to the UI step-by-step (`POST /api/research` on the Express API,
   newline-delimited JSON over a streamed response) and renders as a report card.
8. The user can download a PDF (`POST /api/pdf`) at any time; if Discord is configured, the
   PDF and applicant/company details are also posted automatically to the configured
   channel (`POST /api/discord`).

## Project Structure

```
app/                       Next.js frontend (deploys to Vercel)
  page.tsx                 Landing + chat page
  layout.tsx               Root layout, providers
components/
  chat/                    Chat thread, progress stepper, report card
  settings/                Settings dialog (AI model + Discord config)
  ui/                      shadcn/ui primitives
lib/                       Shared logic — imported by both the frontend and /server
  serper.ts                Serper.dev search wrapper
  crawler.ts               Website crawler
  openrouter.ts            OpenRouter chat + model list wrapper
  research-pipeline.ts     Orchestrates the end-to-end research flow
  pdf.tsx                  PDF document + renderer
  discord.ts               Discord REST delivery
  settings-context.tsx     Client-side settings (localStorage)
  api-base.ts              Resolves NEXT_PUBLIC_API_BASE_URL for frontend fetch calls
server/                    Express backend (deploys to Render)
  src/index.ts             Express app: CORS, JSON body parsing, route registration
  src/routes/research.ts   POST /api/research — streams NDJSON progress + final result
  src/routes/pdf.ts        POST /api/pdf — generates and returns the PDF report
  src/routes/discord.ts    POST /api/discord — sends the report to a Discord channel
  src/routes/models.ts     GET /api/models — proxies OpenRouter's model list (cached)
```

## Known Limitations

- Crawling is capped (~7 pages, ~25s time budget) so a single request finishes in
  reasonable time — very large sites will only have a representative subset of pages
  analyzed.
- Sites that block bots or require JavaScript to render content may return limited or no
  crawlable text; the pipeline falls back to search-derived context in that case.
- No RAG / conversation memory is implemented, per the assignment's requirements (not
  required).
- Splitting frontend/backend into two services (Vercel + Render) means this no longer
  matches the assignment's "single unified project" deployment ask — see the note at the
  top of this README.
