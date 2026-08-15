"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Sheet } from "@/lib/types";
import { chartDefaults, groupBy } from "@/lib/aggregate";
import { formatCompact, formatCurrency, formatNumber, isNumericColumn } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { ChartIcon } from "./icons";

interface Props {
  sheet: Sheet;
}

const COUNT = "__count__";

export default function ChartView({ sheet }: Props) {
  // Recharts measures the DOM, so only render it after hydration.
  const mounted = useHydrated();

  const dims = useMemo(
    () => sheet.columns.filter((c) => c.type === "text" || c.type === "date"),
    [sheet.columns],
  );
  const measures = useMemo(() => sheet.columns.filter(isNumericColumn), [sheet.columns]);
  const defaults = useMemo(() => chartDefaults(sheet), [sheet]);

  const [dimKey, setDimKey] = useState(defaults.dim?.key ?? dims[0]?.key ?? "");
  const [measureKey, setMeasureKey] = useState(defaults.measure?.key ?? measures[0]?.key ?? COUNT);

  const measureCol = sheet.columns.find((c) => c.key === measureKey);
  const isCurrency = measureCol?.type === "currency";
  const isCount = measureKey === COUNT || measures.length === 0;

  const data = useMemo(() => {
    if (!dimKey) return [];
    const groups = groupBy(sheet.rows, dimKey, isCount ? null : measureKey);
    return groups.slice(0, 12).map((g) => ({
      label: g.label,
      value: isCount ? g.count : g.value,
    }));
  }, [sheet.rows, dimKey, measureKey, isCount]);

  const maxValue = data.reduce((m, d) => Math.max(m, d.value), -Infinity);
  const dimLabel = sheet.columns.find((c) => c.key === dimKey)?.label ?? "";
  const measureLabel = isCount ? "Row count" : (measureCol?.label ?? "");

  const fmt = (n: number) => (isCount ? formatNumber(n) : isCurrency ? formatCurrency(n) : formatNumber(n));

  if (dims.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-10 text-center text-[13px] text-ink-soft">
        No categorical column to chart. Add a text/date column to see a breakdown.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gridline bg-paper-dim px-4 py-2.5">
        <div className="flex items-center gap-2">
          <ChartIcon size={16} className="text-forest" />
          <span className="text-[13px] font-semibold">Breakdown</span>
        </div>
        <Selector label="Measure" value={measureKey} onChange={setMeasureKey}>
          {measures.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
          <option value={COUNT}>Row count</option>
        </Selector>
        <span className="text-[12px] text-ink-soft">by</span>
        <Selector label="Dimension" value={dimKey} onChange={setDimKey}>
          {dims.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </Selector>
      </div>

      {/* Chart */}
      <div className="min-h-0 flex-1 p-4">
        {mounted && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--gridline)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "var(--ink-soft)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--gridline)" }}
                interval={0}
                angle={data.length > 6 ? -25 : 0}
                textAnchor={data.length > 6 ? "end" : "middle"}
                height={data.length > 6 ? 56 : 30}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--ink-soft)" }}
                tickLine={false}
                axisLine={false}
                width={54}
                tickFormatter={(v: number) => formatCompact(v, isCurrency)}
              />
              <Tooltip
                cursor={{ fill: "color-mix(in srgb, var(--forest) 7%, transparent)" }}
                content={({ active, payload, label }) =>
                  active && payload && payload.length ? (
                    <div className="rounded-[3px] border border-gridline bg-white px-3 py-2 shadow-[0_2px_6px_rgba(20,32,27,0.1)]">
                      <div className="text-[12px] font-semibold text-ink">{label}</div>
                      <div className="nums text-[13px] text-forest">{fmt(Number(payload[0].value))}</div>
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive={false} maxBarSize={72}>
                {data.map((d) => (
                  <Cell key={d.label} fill={d.value === maxValue ? "var(--amber)" : "var(--forest)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-ink-soft">
            {mounted ? "No data to chart." : ""}
          </div>
        )}
      </div>

      {/* Caption — reinforce that figures are computed in-app, not by the AI. */}
      <div className="flex items-center justify-between border-t border-gridline px-4 py-2 text-[11.5px] text-ink-soft">
        <span>
          {measureLabel} by {dimLabel}
          {data.length === 12 && " · top 12"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 bg-amber" /> highest · computed from {sheet.rows.length} rows
        </span>
      </div>
    </div>
  );
}

function Selector({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="nums rounded-[3px] border border-gridline bg-white px-2 py-1 text-[12.5px] font-medium text-ink focus:border-forest focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}
