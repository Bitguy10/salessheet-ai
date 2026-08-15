// Static hero visual with a looping "scan" to imply AI reading the data.
// Pure markup + CSS keyframes (defined in globals.css); no client JS needed.
import { Logo, SparkIcon, AlertIcon } from "./icons";

export default function HeroDemo() {
  return (
    <div className="overflow-hidden rounded-[4px] border border-gridline bg-white shadow-[0_2px_10px_rgba(20,32,27,0.08)]">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-gridline bg-paper-dim px-3 py-2">
        <Logo size={16} />
        <span className="text-[12px] font-semibold text-ink">SalesSheet AI</span>
        <span className="ml-auto flex gap-1">
          <span className="h-2 w-2 rounded-full bg-gridline" />
          <span className="h-2 w-2 rounded-full bg-gridline" />
          <span className="h-2 w-2 rounded-full bg-gridline" />
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2">
        {/* messy input with scan line */}
        <div className="relative overflow-hidden border-b border-gridline sm:border-b-0 sm:border-r">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
            Pasted notes
          </div>
          <pre className="nums whitespace-pre-wrap px-3 pb-4 text-[10.5px] leading-relaxed text-ink-soft">
{`West, March: Trailhead Pack
  128 units, $18,432
west/mar/Summit Bottle 512 4608
North Mar Base Layer Tee 45
  (revenue missing)
West March Trailhead 128 $18,432
East Apr Summit Bottle 250 -1800`}
          </pre>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-8"
            style={{
              background: "linear-gradient(180deg, transparent, color-mix(in srgb, var(--forest) 14%, transparent), transparent)",
              animation: "ss-scan 3.4s ease-in-out infinite",
            }}
          />
        </div>

        {/* structured output */}
        <div>
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
            Structured
          </div>
          <table className="w-full border-t border-gridline text-[10.5px]">
            <thead>
              <tr className="bg-paper-dim text-left">
                <th className="border-b border-gridline px-2 py-1 font-semibold">Region</th>
                <th className="border-b border-gridline px-2 py-1 font-semibold">Product</th>
                <th className="nums border-b border-gridline px-2 py-1 text-right font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody className="nums">
              <Row region="West" product="Trailhead Pack" rev="$18,432" />
              <Row region="West" product="Summit Bottle" rev="$4,608" zebra />
              <Row region="North" product="Base Layer Tee" rev="—" flag />
              <Row region="West" product="Trailhead Pack" rev="$18,432" zebra dup />
              <Row region="East" product="Summit Bottle" rev="-$1,800" flag />
            </tbody>
          </table>
        </div>
      </div>

      {/* grounded answer strip */}
      <div className="border-t border-gridline bg-paper px-3 py-2.5">
        <div className="flex items-start gap-2">
          <SparkIcon size={14} className="mt-0.5 shrink-0 text-forest" />
          <div className="text-[11.5px] leading-relaxed text-ink">
            West led Q1 with <span className="nums font-semibold">$41,472</span> in revenue.
            <span className="nums ml-1.5 font-semibold text-forest">→ Rows 1, 4</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  region,
  product,
  rev,
  zebra,
  flag,
  dup,
}: {
  region: string;
  product: string;
  rev: string;
  zebra?: boolean;
  flag?: boolean;
  dup?: boolean;
}) {
  return (
    <tr className={zebra ? "bg-zebra" : "bg-white"}>
      <td
        className="border-b border-gridline px-2 py-1"
        style={flag ? { boxShadow: "inset 2px 0 0 var(--brick)", background: "var(--brick-wash)" } : undefined}
      >
        {region}
      </td>
      <td className="border-b border-gridline px-2 py-1">
        <span className="inline-flex items-center gap-1">
          {product}
          {dup && <AlertIcon size={11} className="text-brick" />}
        </span>
      </td>
      <td
        className="border-b border-gridline px-2 py-1 text-right"
        style={
          flag
            ? { boxShadow: "inset 2px 0 0 var(--brick)", background: "var(--brick-wash)" }
            : undefined
        }
      >
        {rev}
      </td>
    </tr>
  );
}
