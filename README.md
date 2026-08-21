# SalesSheet AI

Turn messy sales notes into a clean, interactive spreadsheet — in the browser, for free.

Paste a pile of unstructured sales data (or import a CSV/PDF) and SalesSheet AI
structures it into a typed grid you can sort, chart, and interrogate in plain
English. Your data stays on your machine; the only thing that leaves is the text
you hand to the AI for structuring or chat, and that goes through a **server-side
proxy** so your API key is never exposed to the browser.

## What it does

- **Messy-text extraction** — paste free-form notes; the AI returns strict, typed rows.
- **CSV / PDF import** — delimited files parse locally; PDFs are read client-side.
- **Anomaly flagging** — duplicates, missing values, outliers, and returns are surfaced.
- **Charts & KPIs** — aggregates and visualizations, all computed by the app.
- **Grounded chat** — ask questions in natural language; answers cite the exact rows.
- **CSV export** — take your cleaned data anywhere.

## How the AI behaves (by design)

SalesSheet AI is built so the model never fabricates numbers:

- **The AI never does arithmetic.** Every total, average, and aggregate is computed
  by the app from your data — the model only *structures* and *retrieves*.
- **Ambiguous or missing fields become `null`, never a guess.** Uncertain values are
  flagged for review rather than invented.
- **Chat is retrieval-grounded.** Every answer is tied to specific rows, with citations.

Colour language: **amber** marks AI-inferred / AI-touched values; **brick red** marks
anything flagged for your review.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19
- Tailwind CSS v4, TypeScript (strict)
- [Groq](https://groq.com) API via a server-side proxy (default model `openai/gpt-oss-120b`)
- IndexedDB (via `idb`) for local persistence — no accounts, no backend database
- `recharts` for charts, `pdfjs-dist` for PDF import

## Running locally

```bash
npm install
```

Create `.env.local` and add your Groq key (get one free at
<https://console.groq.com/keys>):

```
GROQ_API_KEY=your_key_here
# optional: GROQ_MODEL=openai/gpt-oss-120b
```

Then start the dev server:

```bash
npm run dev
```

Open <http://localhost:3000> — the workspace lives at `/app`.

> **No key?** The app still works: CSV/TSV parsing, the sample dataset, anomaly
> detection, charts, and CSV export all run locally, and chat falls back to
> app-computed KPIs. Only free-form Q&A and messy-text extraction need a key.

## Deploying

Deploys cleanly to [Vercel](https://vercel.com). Add `GROQ_API_KEY` as an
environment variable in your Vercel project settings — it is read only on the
server and is never sent to the browser.

## Privacy

Your sales data is stored locally in your browser (IndexedDB). It is sent to the
Groq API only when you use AI extraction or free-form chat, and only through this
app's server-side proxy.
