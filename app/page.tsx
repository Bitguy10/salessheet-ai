import Link from "next/link";
import HeroDemo from "@/components/HeroDemo";
import {
  Logo,
  SparkIcon,
  AlertIcon,
  MessageIcon,
  ChartIcon,
  DownloadIcon,
  TableIcon,
  ArrowRight,
  ClipboardIcon,
  CheckIcon,
} from "@/components/icons";

// Faint graph-paper grid — thematic for a spreadsheet tool, built from thin
// lines (not a color gradient).
const graphPaper: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(var(--gridline) 1px, transparent 1px), linear-gradient(90deg, var(--gridline) 1px, transparent 1px)",
  backgroundSize: "28px 28px",
  backgroundPosition: "-1px -1px",
  opacity: 1,
};

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-paper">
      {/* ===== Nav ===== */}
      <header className="sticky top-0 z-30 border-b border-gridline bg-paper">
        <nav className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-5">
          <Link href="/" className="flex items-center gap-2 text-forest">
            <Logo size={22} />
            <span className="text-[15px] font-semibold tracking-tight text-ink">
              SalesSheet<span className="text-forest"> AI</span>
            </span>
          </Link>
          <div className="ml-auto hidden items-center gap-6 text-[13.5px] text-ink-soft sm:flex">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#ask" className="hover:text-ink">Ask your data</a>
          </div>
          <Link
            href="/app"
            className="ml-auto inline-flex items-center gap-1.5 rounded-[3px] bg-forest px-3.5 py-1.5 text-[13.5px] font-semibold text-paper hover:bg-forest-deep sm:ml-6"
          >
            Open the app <ArrowRight size={16} />
          </Link>
        </nav>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden border-b border-gridline">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.5]" style={graphPaper} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-[2px] border-l-2 border-amber bg-amber-wash px-2.5 py-1 text-[12px] font-medium text-ink">
              <SparkIcon size={13} className="text-amber" /> Free · runs in your browser
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              Turn messy sales data into answers
            </h1>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-soft">
              Paste notes or drop a file. SalesSheet structures it into a clean, interactive
              spreadsheet, flags duplicates and outliers, and answers your questions in plain
              English — citing the exact rows every time.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-[3px] bg-forest px-5 py-2.5 text-[14px] font-semibold text-paper hover:bg-forest-deep"
              >
                Open the app <ArrowRight size={17} />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-[3px] border border-gridline bg-white px-5 py-2.5 text-[14px] font-semibold text-ink hover:bg-paper-dim"
              >
                See how it works
              </a>
            </div>
            <p className="mt-5 flex items-center gap-1.5 text-[12.5px] text-ink-soft">
              <CheckIcon size={14} className="text-forest" /> No account. No data leaves your browser.
            </p>
          </div>
          <div className="lg:pl-4">
            <HeroDemo />
          </div>
        </div>
      </section>

      {/* ===== Capability strip ===== */}
      <section className="border-b border-gridline bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-gridline px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Stat label="Bring data in as">Paste · CSV · PDF</Stat>
          <Stat label="Automatically flags">Duplicates · Outliers · Gaps · Returns</Stat>
          <Stat label="Every answer">Cites the exact rows</Stat>
        </div>
      </section>

      {/* ===== Before / After ===== */}
      <section className="border-b border-gridline">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <SectionHeading
            kicker="The transform"
            title="From copy-paste chaos to a clean sheet"
            sub="No formatting rules, no column mapping. SalesSheet reads whatever you give it and returns structured rows — marking anything it inferred."
          />
          <div className="mt-9 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
            <Panel tone="raw" title="Before — raw paste">
              <pre className="nums whitespace-pre-wrap text-[11.5px] leading-relaxed text-ink-soft">
{`West region, March: Trailhead Pack — 128 units, $18,432
west / march / Summit Bottle ... 512 units  4,608.00
North March Base Layer Tee 45 units (revenue missing)
West, March, Trailhead Pack, 128, $18,432   (dup?)
East April Summit Bottle 250 -1800  (return)`}
              </pre>
            </Panel>
            <div className="flex items-center justify-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gridline bg-white text-forest">
                <ArrowRight size={18} />
              </div>
            </div>
            <Panel tone="clean" title="After — structured & flagged">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="bg-paper-dim text-left text-ink">
                    <th className="border-b border-gridline px-2 py-1 font-semibold">Region</th>
                    <th className="border-b border-gridline px-2 py-1 font-semibold">Product</th>
                    <th className="nums border-b border-gridline px-2 py-1 text-right font-semibold">Rev</th>
                  </tr>
                </thead>
                <tbody className="nums">
                  <MiniRow a="West" b="Trailhead Pack" c="$18,432" />
                  <MiniRow a="West" b="Summit Bottle" c="$4,608" zebra />
                  <MiniRow a="North" b="Base Layer Tee" c="—" flag />
                  <MiniRow a="West" b="Trailhead Pack" c="$18,432" zebra dup />
                  <MiniRow a="East" b="Summit Bottle" c="-$1,800" flag />
                </tbody>
              </table>
              <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-ink-soft">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2.5 w-1 bg-amber" /> AI-inferred
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2.5 w-1 bg-brick" /> Flagged for review
                </span>
              </div>
            </Panel>
          </div>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how" className="border-b border-gridline bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <SectionHeading
            kicker="How it works"
            title="Three steps, no setup"
            sub="From raw data to answers in under a minute."
          />
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            <Step n={1} icon={<ClipboardIcon size={18} />} title="Paste or upload">
              Drop a CSV or PDF, or paste straight from email or a POS export. Clean tables are parsed
              instantly; messy text goes to AI extraction.
            </Step>
            <Step n={2} icon={<AlertIcon size={18} />} title="Review what's flagged">
              Duplicates, outliers, missing values, and returns are detected by rules and highlighted
              in the grid — so you check what matters, not every row.
            </Step>
            <Step n={3} icon={<MessageIcon size={18} />} title="Ask in plain English">
              &ldquo;Which region led Q1?&rdquo; Answers are grounded in your data and cite the exact
              rows. If it&rsquo;s not in the data, it says so.
            </Step>
          </div>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="border-b border-gridline">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <SectionHeading
            kicker="Built for trust"
            title="Everything the numbers, none of the guesswork"
            sub="SalesSheet is designed so you can rely on what it tells you."
          />
          <div className="mt-9 grid gap-px overflow-hidden rounded-[4px] border border-gridline bg-gridline sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={<SparkIcon size={18} />} title="AI extraction, strict output">
              The model only structures your text into rows — never invents values. Anything it infers
              is marked, so you always know what to double-check.
            </Feature>
            <Feature icon={<TableIcon size={18} />} title="Math done in code, not by AI">
              Every total, average, and percentage is computed in the app from your structured data.
              The AI explains the numbers; it never calculates them.
            </Feature>
            <Feature icon={<AlertIcon size={18} />} title="Rule-based issue detection">
              Duplicates by exact match, outliers by IQR, plus missing values and returns — all
              deterministic, all explainable.
            </Feature>
            <Feature icon={<MessageIcon size={18} />} title="Answers that cite their sources">
              Chat is retrieval-grounded. Each answer links to the specific rows it drew from, and
              refuses to answer what isn&rsquo;t in your data.
            </Feature>
            <Feature icon={<ChartIcon size={18} />} title="Instant breakdowns">
              Chart any measure by any category with one click. The top performer is highlighted so
              the story is obvious at a glance.
            </Feature>
            <Feature icon={<DownloadIcon size={18} />} title="Local-first, export anytime">
              Sheets live in your browser via IndexedDB — no server storage. Export clean CSV whenever
              you need it elsewhere.
            </Feature>
          </div>
        </div>
      </section>

      {/* ===== Ask your data ===== */}
      <section id="ask" className="border-b border-gridline bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-2">
          <div>
            <SectionHeading
              kicker="Ask your data"
              title="A smart analyst that won't make things up"
              sub="Ask questions the way you'd ask a colleague. Answers come only from your sheet — grounded, cited, and honest about gaps."
              left
            />
            <ul className="mt-6 space-y-3 text-[14px] text-ink">
              <Check>Cites the exact rows behind every figure</Check>
              <Check>Refuses to answer what isn&rsquo;t in the data</Check>
              <Check>Never states a number the app didn&rsquo;t compute</Check>
            </ul>
          </div>
          <div className="rounded-[4px] border border-gridline bg-paper p-4 shadow-[0_2px_10px_rgba(20,32,27,0.06)]">
            <div className="ml-8 rounded-[3px] rounded-tr-none border border-gridline bg-white px-3 py-2 text-[13px]">
              Which region had the highest revenue, and were there any issues?
            </div>
            <div className="mt-3 rounded-[3px] border-l-2 border-forest bg-white px-3 py-2.5 text-[13px] leading-relaxed">
              West led with <span className="nums font-semibold">$41,472</span> across 3 sales. Note
              that one West entry looks duplicated, and an East row is a return.
              <div className="mt-2.5 space-y-1 border-t border-gridline pt-2 text-[12px] text-ink-soft">
                <div className="flex gap-1.5">
                  <span className="nums font-semibold text-forest">→ Row 1</span> West · Trailhead Pack · $18,432
                </div>
                <div className="flex gap-1.5">
                  <span className="nums font-semibold text-forest">→ Row 4</span> Possible duplicate of Row 1
                </div>
                <div className="flex gap-1.5">
                  <span className="nums font-semibold text-brick">→ Row 5</span> Negative revenue — return
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative bg-forest">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12]" style={graphPaper} />
        <div className="relative mx-auto max-w-6xl px-5 py-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-paper sm:text-4xl">
            Clean up your sales data in a minute
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-amber-soft">
            No sign-up, no upload to a server. Paste your data and start asking questions.
          </p>
          <Link
            href="/app"
            className="mt-7 inline-flex items-center gap-2 rounded-[3px] bg-amber px-6 py-3 text-[15px] font-semibold text-ink hover:bg-[#d9942f]"
          >
            Open the app <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-gridline bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-forest">
            <Logo size={18} />
            <span className="text-[13.5px] font-semibold text-ink">SalesSheet AI</span>
          </div>
          <p className="text-[12.5px] text-ink-soft sm:ml-2">
            A browser-based, AI-assisted spreadsheet for sales data.
          </p>
          <p className="text-[12px] text-ink-soft sm:ml-auto">
            Your data stays local · AI features require a configured proxy key
          </p>
        </div>
      </footer>
    </div>
  );
}

// ---- Local presentational helpers ----------------------------------------

function SectionHeading({
  kicker,
  title,
  sub,
  left,
}: {
  kicker: string;
  title: string;
  sub?: string;
  left?: boolean;
}) {
  return (
    <div className={left ? "" : "mx-auto max-w-2xl text-center"}>
      <span className="text-[12px] font-semibold uppercase tracking-wide text-forest">{kicker}</span>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      {sub && <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{sub}</p>}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-2 py-6 text-center">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="mt-1.5 text-[15px] font-semibold text-ink">{children}</div>
    </div>
  );
}

function Panel({
  tone,
  title,
  children,
}: {
  tone: "raw" | "clean";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-[4px] border border-gridline bg-white">
      <div
        className={`border-b border-gridline px-3 py-2 text-[11px] font-semibold uppercase tracking-wide ${
          tone === "clean" ? "text-forest" : "text-ink-soft"
        }`}
      >
        {title}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  children,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[4px] border border-gridline bg-paper p-5">
      <div className="flex items-center gap-2.5">
        <span className="nums flex h-7 w-7 items-center justify-center rounded-[3px] bg-forest text-[13px] font-semibold text-paper">
          {n}
        </span>
        <span className="text-forest">{icon}</span>
      </div>
      <h3 className="mt-3 text-[15px] font-semibold">{title}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-[3px] border border-gridline bg-paper text-forest">
        {icon}
      </div>
      <h3 className="mt-3 text-[14.5px] font-semibold">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest text-paper">
        <CheckIcon size={13} />
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

function MiniRow({
  a,
  b,
  c,
  zebra,
  flag,
  dup,
}: {
  a: string;
  b: string;
  c: string;
  zebra?: boolean;
  flag?: boolean;
  dup?: boolean;
}) {
  const flagStyle = flag
    ? { boxShadow: "inset 2px 0 0 var(--brick)", background: "var(--brick-wash)" }
    : undefined;
  return (
    <tr className={zebra ? "bg-zebra" : "bg-white"}>
      <td className="border-b border-gridline px-2 py-1" style={flagStyle}>{a}</td>
      <td className="border-b border-gridline px-2 py-1">
        <span className="inline-flex items-center gap-1">
          {b}
          {dup && <AlertIcon size={11} className="text-brick" />}
        </span>
      </td>
      <td className="border-b border-gridline px-2 py-1 text-right" style={flagStyle}>{c}</td>
    </tr>
  );
}
