"use client";

import { useState, type KeyboardEvent } from "react";
import useElementWidth from "./useElementWidth";
import { dollars, rate1 } from "@/lib/format";

type Point = { wages: number; total: number; average: number; marginal: number };

// Colors come from the validated reference palette: blue and orange, stepped
// separately for the light and dark surfaces.
const AVERAGE = "stroke-[#2a78d6] dark:stroke-[#3987e5]";
const AVERAGE_FILL = "fill-[#2a78d6] dark:fill-[#3987e5]";
const AVERAGE_KEY = "bg-[#2a78d6] dark:bg-[#3987e5]";
const MARGINAL = "stroke-[#eb6834] dark:stroke-[#d95926]";
const MARGINAL_FILL = "fill-[#eb6834] dark:fill-[#d95926]";
const MARGINAL_KEY = "bg-[#eb6834] dark:bg-[#d95926]";

const HEIGHT = 280;
const MARGIN = { top: 12, right: 16, bottom: 30, left: 44 };

function compact(v: number) {
  if (v >= 1_000_000) return `$${v / 1_000_000}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v}`;
}

export default function TaxRateChart({
  curve,
  maxWages,
  current,
  capWages,
  payNoun = "pay",
}: {
  curve: Point[];
  maxWages: number;
  // Pay where Social Security tax stops; marked on the chart when in range.
  capWages: number;
  // "pay" or "1099 income", for the readout.
  payNoun?: string;
  // Where you are now (exact, not one of the sampled points).
  current: { wages: number; average: number; marginal: number };
}) {
  const [ref, width] = useElementWidth();
  const [hover, setHover] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);

  const plotW = width - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const peak = Math.max(
    ...curve.map((p) => Math.max(p.average, p.marginal)),
    current.average,
    current.marginal,
  );
  const yMax = Math.max(0.3, Math.ceil(peak * 10) / 10);
  const x = (wages: number) => MARGIN.left + (wages / maxWages) * plotW;
  const y = (rate: number) => MARGIN.top + plotH * (1 - rate / yMax);
  const line = (key: "average" | "marginal") =>
    curve.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.wages)},${y(p[key])}`).join(" ");

  const yStep = yMax <= 0.4 ? 0.1 : 0.2;
  const yTicks: number[] = [];
  for (let t = 0; t <= yMax + 1e-9; t += yStep) yTicks.push(t);
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxWages);

  const currentVisible = current.wages <= maxWages;
  const shown = hover ?? (focused ? nearestIndex(current.wages) : null);
  const point = shown === null ? null : curve[shown];

  function nearestIndex(wages: number) {
    return Math.min(
      Math.max(Math.round((wages / maxWages) * (curve.length - 1)), 0),
      curve.length - 1,
    );
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const wages = ((e.clientX - rect.left - MARGIN.left) / plotW) * maxWages;
    setHover(nearestIndex(wages));
  }

  function onKeyDown(e: KeyboardEvent<SVGSVGElement>) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const from = hover ?? nearestIndex(current.wages);
    setHover(Math.min(Math.max(from + step, 0), curve.length - 1));
  }

  const tableRows = curve.filter((_, i) => i % 10 === 0);
  const tooltipLeft = point ? x(point.wages) : 0;

  return (
    <div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-foreground/70">
        <span className="flex items-center gap-2">
          <span className={`h-0.5 w-4 rounded ${AVERAGE_KEY}`} />
          Average rate on all your income
        </span>
        <span className="flex items-center gap-2">
          <span className={`h-0.5 w-4 rounded ${MARGINAL_KEY}`} />
          Rate on your next dollar
        </span>
      </div>

      <div ref={ref} className="relative mt-2">
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={`Tax rates from $0 to ${dollars(maxWages)} of ${payNoun}. Use the left and right arrow keys to move along the chart.`}
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
                {Math.round(t * 100)}%
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text
              key={t}
              x={x(t)}
              y={HEIGHT - 10}
              textAnchor={t === 0 ? "start" : t === maxWages ? "end" : "middle"}
              className="fill-foreground/50 text-[11px]"
            >
              {compact(t)}
            </text>
          ))}

          <path d={line("marginal")} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className={MARGINAL} />
          <path d={line("average")} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className={AVERAGE} />

          {capWages <= maxWages && (
            <g>
              <line
                x1={x(capWages)}
                x2={x(capWages)}
                y1={MARGIN.top}
                y2={MARGIN.top + plotH}
                className="stroke-foreground/25"
                strokeWidth={1}
              />
              <text
                x={x(capWages) + (x(capWages) > width - 130 ? -6 : 6)}
                y={MARGIN.top + plotH - 8}
                textAnchor={x(capWages) > width - 130 ? "end" : "start"}
                className="fill-foreground/60 text-[11px]"
              >
                Social Security cap
              </text>
            </g>
          )}

          {currentVisible && (
            <>
              <circle cx={x(current.wages)} cy={y(current.marginal)} r={5} strokeWidth={2} className={`${MARGINAL_FILL} stroke-background`} />
              <circle cx={x(current.wages)} cy={y(current.average)} r={5} strokeWidth={2} className={`${AVERAGE_FILL} stroke-background`} />
            </>
          )}

          {point && (
            <line
              x1={x(point.wages)}
              x2={x(point.wages)}
              y1={MARGIN.top}
              y2={MARGIN.top + plotH}
              className="stroke-foreground/30"
              strokeWidth={1}
            />
          )}
        </svg>

        {point && (
          <div
            className="pointer-events-none absolute top-2 z-10 w-44 rounded-md border border-border bg-background p-2.5 text-xs shadow-md"
            style={{
              left: Math.min(Math.max(tooltipLeft + 10, 0), width - 176),
            }}
          >
            <p className="font-medium">{dollars(point.wages)} of {payNoun}</p>
            <p className="mt-1.5 flex items-center gap-2">
              <span className={`h-0.5 w-3 rounded ${AVERAGE_KEY}`} />
              <span className="font-semibold">{rate1(point.average)}</span>
              <span className="text-foreground/60">average</span>
            </p>
            <p className="mt-1 flex items-center gap-2">
              <span className={`h-0.5 w-3 rounded ${MARGINAL_KEY}`} />
              <span className="font-semibold">{rate1(point.marginal)}</span>
              <span className="text-foreground/60">next dollar</span>
            </p>
            <p className="mt-1.5 text-foreground/60">
              About {dollars(point.total)} in taxes
            </p>
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-foreground/70">
          See the numbers
        </summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-foreground/50">
            <tr>
              <th className="py-1 font-medium">Yearly {payNoun}</th>
              <th className="py-1 text-right font-medium">Taxes</th>
              <th className="py-1 text-right font-medium">Average</th>
              <th className="py-1 text-right font-medium">Next dollar</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((p) => (
              <tr key={p.wages} className="border-t border-border">
                <td className="py-1">{dollars(p.wages)}</td>
                <td className="py-1 text-right">{dollars(p.total)}</td>
                <td className="py-1 text-right">{rate1(p.average)}</td>
                <td className="py-1 text-right">{rate1(p.marginal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
