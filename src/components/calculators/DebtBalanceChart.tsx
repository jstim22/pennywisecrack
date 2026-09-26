"use client";

import { useState, type KeyboardEvent } from "react";
import useElementWidth from "./useElementWidth";
import { dollars } from "@/lib/format";
import { at } from "@/lib/debtPayoff";

export type BalanceSeries = {
  key: string;
  label: string;
  values: number[];
  // Tailwind classes for the line, the legend key, and the tooltip key.
  stroke: string;
  key_bg: string;
};

const HEIGHT = 280;
const MARGIN = { top: 12, right: 16, bottom: 30, left: 52 };

function compactMoney(v: number) {
  if (v >= 1_000_000) return `$${+(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${+(v / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return `$${Math.round(v)}`;
}

// Axis maximum and tick values: the smallest 4-6 evenly spaced round steps
// (1, 2, 2.5 or 5 times a power of ten) that reach `v`.
function niceScale(v: number) {
  const top = Math.max(v, 1);
  let best = { max: Infinity, step: 1, count: 1 };
  const magnitude = Math.floor(Math.log10(top));
  for (let p = magnitude - 2; p <= magnitude + 1; p++) {
    for (const base of [1, 2, 2.5, 5]) {
      const step = base * Math.pow(10, p);
      for (const count of [4, 5, 6]) {
        const max = step * count;
        if (max >= top - 1e-9 && max < best.max) best = { max, step, count };
      }
    }
  }
  return {
    max: best.max,
    ticks: Array.from({ length: best.count + 1 }, (_, i) => i * best.step),
  };
}

function monthLabel(m: number, startLabel = "Now") {
  if (m === 0) return startLabel;
  if (m < 12) return `${m} mo`;
  const years = m / 12;
  return `${+years.toFixed(1)} yr${years === 1 ? "" : "s"}`;
}

export default function DebtBalanceChart({
  series,
  maxMonths,
  horizonMonths,
  startLabel = "Now",
  description = "Total debt left",
}: {
  series: BalanceSeries[];
  maxMonths: number;
  // Draws a "Your goal date" marker when given.
  horizonMonths?: number;
  // What month 0 is called ("Now", "Start").
  startLabel?: string;
  // What the chart shows, for screen readers.
  description?: string;
}) {
  const [ref, width] = useElementWidth();
  const [hover, setHover] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);

  const plotW = width - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const { max: yMax, ticks: yTicks } = niceScale(
    Math.max(...series.map((s) => at(s.values, 0)), 1),
  );
  const x = (m: number) => MARGIN.left + (m / maxMonths) * plotW;
  const y = (v: number) => MARGIN.top + plotH * (1 - v / yMax);
  const path = (values: number[]) =>
    Array.from({ length: maxMonths + 1 }, (_, m) => {
      return `${m === 0 ? "M" : "L"}${x(m)},${y(at(values, m))}`;
    }).join(" ");

  const tickEvery = [1, 3, 6, 12, 24, 36, 60, 120, 240].find(
    (s) => maxMonths / s <= 6,
  ) ?? 360;
  const xTicks: number[] = [];
  for (let m = 0; m <= maxMonths; m += tickEvery) xTicks.push(m);

  const startMonth = Math.min(horizonMonths ?? 0, maxMonths);
  const shown = hover ?? (focused ? startMonth : null);

  function nearest(month: number) {
    return Math.min(Math.max(Math.round(month), 0), maxMonths);
  }
  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setHover(nearest(((e.clientX - rect.left - MARGIN.left) / plotW) * maxMonths));
  }
  function onKeyDown(e: KeyboardEvent<SVGSVGElement>) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const from = hover ?? startMonth;
    setHover(nearest(from + step * (e.shiftKey ? 6 : 1)));
  }

  const goal =
    horizonMonths !== undefined && horizonMonths <= maxMonths ? horizonMonths : null;
  const tableMonths: number[] = [];
  const tableEvery = maxMonths <= 36 ? 3 : maxMonths <= 120 ? 12 : 24;
  for (let m = 0; m <= maxMonths; m += tableEvery) tableMonths.push(m);
  if (tableMonths[tableMonths.length - 1] !== maxMonths) tableMonths.push(maxMonths);

  return (
    <div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-foreground/70">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-2">
            <span className={`h-0.5 w-4 rounded ${s.key_bg}`} />
            {s.label}
          </span>
        ))}
      </div>

      <div ref={ref} className="relative mt-2">
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={`${description} over ${monthLabel(maxMonths)}. Use the left and right arrow keys to move along the chart.`}
          tabIndex={0}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setHover(null);
          }}
          onKeyDown={onKeyDown}
          className="block max-w-full touch-pan-y rounded outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-baby-blue"
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(t)}
                y2={y(t)}
                className="stroke-foreground/10"
                strokeWidth={1}
              />
              <text
                x={MARGIN.left - 8}
                y={y(t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-foreground/50 text-[11px]"
              >
                {compactMoney(t)}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text
              key={t}
              x={x(t)}
              y={HEIGHT - 10}
              textAnchor={t === 0 ? "start" : t === maxMonths ? "end" : "middle"}
              className="fill-foreground/50 text-[11px]"
            >
              {monthLabel(t, startLabel)}
            </text>
          ))}

          {goal !== null && (
            <g>
              <line
                x1={x(goal)}
                x2={x(goal)}
                y1={MARGIN.top}
                y2={MARGIN.top + plotH}
                className="stroke-foreground/25"
                strokeWidth={1}
              />
              <text
                x={x(goal) + (x(goal) > width - 110 ? -6 : 6)}
                y={MARGIN.top + 12}
                textAnchor={x(goal) > width - 110 ? "end" : "start"}
                className="fill-foreground/60 text-[11px]"
              >
                Your goal date
              </text>
            </g>
          )}

          {[...series].reverse().map((s) => (
            <path
              key={s.key}
              d={path(s.values)}
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              className={s.stroke}
            />
          ))}

          {shown !== null && (
            <line
              x1={x(shown)}
              x2={x(shown)}
              y1={MARGIN.top}
              y2={MARGIN.top + plotH}
              className="stroke-foreground/30"
              strokeWidth={1}
            />
          )}
        </svg>

        {shown !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 w-48 rounded-md border border-border bg-background p-2.5 text-xs shadow-md"
            style={{
              left: Math.min(Math.max(x(shown) + 10, 0), width - 196),
            }}
          >
            <p className="font-medium">
              {shown === 0 ? startLabel : `After ${monthLabel(shown)}`}
            </p>
            {series.map((s) => (
              <p key={s.key} className="mt-1.5 flex items-center gap-2">
                <span className={`h-0.5 w-3 shrink-0 rounded ${s.key_bg}`} />
                <span className="font-semibold">
                  {dollars(at(s.values, shown))}
                </span>
                <span className="truncate text-foreground/60">{s.label}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-foreground/70">
          See the numbers
        </summary>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full text-left text-xs">
            <thead className="text-foreground/50">
              <tr>
                <th className="py-1 pr-2 font-medium">When</th>
                {series.map((s) => (
                  <th key={s.key} className="py-1 pl-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableMonths.map((m) => (
                <tr key={m} className="border-t border-border">
                  <td className="py-1 pr-2">{monthLabel(m, startLabel)}</td>
                  {series.map((s) => (
                    <td key={s.key} className="py-1 pl-2 text-right">
                      {dollars(at(s.values, m))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
