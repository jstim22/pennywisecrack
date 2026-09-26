// Dollar amounts as "$1,234.56"; negatives use a real minus sign ("−$12.00").
export function usd(n: number) {
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < -0.005 ? "−" : ""}$${abs}`;
}

export function pct(n: number) {
  return `${Number(n.toFixed(2))}%`;
}

// Whole dollars with commas, no symbol: "1,234,568".
export function money(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

// Whole dollars for estimates that don't need cents: "$1,235" ("−$12" if negative).
export function dollars(n: number) {
  const rounded = Math.round(Math.abs(n));
  return `${n < -0.5 ? "−" : ""}$${rounded.toLocaleString("en-US")}`;
}

// A rate as a percentage with one decimal: 0.1965 -> "19.7%".
export function rate1(fraction: number) {
  return `${(fraction * 100).toFixed(1)}%`;
}
