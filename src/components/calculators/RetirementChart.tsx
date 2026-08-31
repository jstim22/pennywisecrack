const BASE_MILESTONES = [
  1_000, 10_000, 100_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000,
];

function buildMilestoneDomain(maxBalance: number) {
  const list: number[] = [];
  for (const m of BASE_MILESTONES) {
    list.push(m);
    if (m >= maxBalance && list.length >= 2) return list;
  }
  let next = 20_000_000;
  while (list[list.length - 1] < maxBalance || list.length < 2) {
    list.push(next);
    next += 10_000_000;
  }
  return list;
}

function formatMoney(v: number) {
  if (v >= 1_000_000) {
    const millions = v / 1_000_000;
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
}

export default function RetirementChart({
  data,
}: {
  data: { age: number; balance: number }[];
}) {
  if (data.length === 0) return null;

  const maxBalance = Math.max(...data.map((d) => d.balance), 1);
  const milestones = buildMilestoneDomain(maxBalance);
  const domainMin = milestones[0];
  const domainMax = milestones[milestones.length - 1];
  const logMin = Math.log10(domainMin);
  const logMax = Math.log10(domainMax);

  // Sized close to the container's typical rendered width (~650-720px, now
  // that the chart spans the full card width) so SVG units are roughly 1:1
  // with real pixels and text stays legible.
  const width = 680;
  const height = 280;
  const marginLeft = 64;
  const marginRight = 16;
  const marginTop = 26;
  const marginBottom = 32;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;

  function yFor(value: number) {
    const v = Math.max(value, domainMin);
    const t = (Math.log10(v) - logMin) / (logMax - logMin);
    const clamped = Math.min(Math.max(t, 0), 1);
    return marginTop + plotHeight * (1 - clamped);
  }

  const n = data.length;
  function xFor(i: number) {
    return marginLeft + (n === 1 ? plotWidth / 2 : (i / (n - 1)) * plotWidth);
  }

  // Sample down to a small handful of points — plotting one vertex per
  // year makes the line look like noise once there are 20+ years of data.
  const TARGET_POINTS = 10;
  const step = Math.max(Math.ceil((n - 1) / TARGET_POINTS), 1);
  const indices: number[] = [];
  for (let i = 0; i < n; i += step) indices.push(i);
  if (indices[indices.length - 1] !== n - 1) indices.push(n - 1);

  const points = indices.map((i) => ({
    x: xFor(i),
    y: yFor(data[i].balance),
    age: data[i].age,
    balance: data[i].balance,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const baseline = marginTop + plotHeight;
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baseline} L ${points[0].x.toFixed(1)} ${baseline} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Projected balance over time"
    >
      <defs>
        <linearGradient id="retirement-area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor="currentColor"
            stopOpacity="0.25"
            className="text-navy dark:text-baby-blue"
          />
          <stop
            offset="100%"
            stopColor="currentColor"
            stopOpacity="0"
            className="text-navy dark:text-baby-blue"
          />
        </linearGradient>
      </defs>

      {(() => {
        // Walk from the largest milestone down so the top (most relevant)
        // label always shows, skipping any that would crowd the previous
        // one — milestones bunch up near the top on a log scale.
        const MIN_LABEL_GAP = 15;
        let lastLabelY = -Infinity;
        return [...milestones].reverse().map((m) => {
          const y = yFor(m);
          const showLabel = Math.abs(y - lastLabelY) >= MIN_LABEL_GAP;
          if (showLabel) lastLabelY = y;
          return (
            <g key={m}>
              <line
                x1={marginLeft}
                x2={width - marginRight}
                y1={y}
                y2={y}
                className="stroke-border"
                strokeWidth={1}
              />
              {showLabel && (
                <text
                  x={marginLeft - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-foreground/50"
                  fontSize={12}
                >
                  {formatMoney(m)}
                </text>
              )}
            </g>
          );
        });
      })()}

      <path d={areaPath} fill="url(#retirement-area-fill)" />
      <path
        d={linePath}
        fill="none"
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="stroke-navy dark:stroke-baby-blue"
      />

      {points.map((p) => (
        <g key={p.age}>
          <circle
            cx={p.x}
            cy={p.y}
            r={4}
            className="fill-navy dark:fill-baby-blue"
          >
            <title>{`Age ${p.age}: $${p.balance.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}`}</title>
          </circle>
          <text
            x={p.x}
            y={Math.max(p.y - 10, 12)}
            textAnchor="middle"
            fontSize={12}
            fontWeight={500}
            className="fill-foreground/80"
          >
            {formatMoney(p.balance)}
          </text>
          <text
            x={p.x}
            y={height - marginBottom + 18}
            textAnchor="middle"
            fontSize={11}
            className="fill-foreground/50"
          >
            {p.age}
          </text>
        </g>
      ))}
    </svg>
  );
}
