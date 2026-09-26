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
