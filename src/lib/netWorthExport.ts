import { buildCsv, buildXlsx, type Cell, type Sheet } from "./xlsx";
import {
  GROUPS,
  estimateNetWorth,
  groupsOf,
  type NetWorthItem,
} from "./netWorth";

const LIQUID_LABELS = GROUPS.filter((g) => g.liquid).map((g) => g.label);

// Items in the order they should appear, with blank names filled in.
function ordered(items: NetWorthItem[], kind: "asset" | "liability") {
  return groupsOf(kind).flatMap((g) =>
    items
      .filter((i) => i.group === g.id)
      .map((i) => ({
        group: g.label,
        name: i.name.trim() || g.label,
        amount: Number.isFinite(i.amount) ? Math.max(i.amount, 0) : 0,
      })),
  );
}

export function netWorthFilename(asOf: Date, extension: "xlsx" | "csv") {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `net-worth-${asOf.getFullYear()}-${pad(asOf.getMonth() + 1)}-${pad(asOf.getDate())}.${extension}`;
}

// A workbook with a "Net worth" sheet (assets, liabilities, and totals that are
// live formulas, so editing an amount updates them) and a "History" sheet for
// tracking net worth over time.
export function buildNetWorthWorkbook(items: NetWorthItem[], asOf: Date) {
  const e = estimateNetWorth(items);
  const assets = ordered(items, "asset");
  const debts = ordered(items, "liability");

  const rows: Sheet["rows"] = [];
  const at = () => rows.length + 1; // the next row's number
  const header = (label: string): Cell[] => [
    { value: label, style: "header" },
    { value: "Item", style: "header" },
    { value: "Amount", style: "header" },
  ];

  rows.push([{ value: "Net worth statement", style: "title" }]);
  rows.push([{ value: "As of", style: "bold" }, { value: asOf, style: "date" }]);
  rows.push([]);

  const section = (
    label: string,
    list: ReturnType<typeof ordered>,
    totalLabel: string,
    total: number,
  ) => {
    rows.push(header(label));
    const first = at();
    list.forEach((i) => rows.push([i.group, i.name, { value: i.amount, style: "money" }]));
    const last = at() - 1;
    const totalRow = at();
    rows.push([
      { value: totalLabel, style: "bold" },
      null,
      list.length > 0
        ? { formula: `SUM(C${first}:C${last})`, value: total, style: "moneyBold" }
        : { value: 0, style: "moneyBold" },
    ]);
    rows.push([]);
    return { first, last, totalRow };
  };

  const a = section("Assets", assets, "Total assets", e.totalAssets);
  const l = section("Liabilities", debts, "Total liabilities", e.totalLiabilities);

  rows.push([
    { value: "Net worth", style: "title" },
    null,
    { formula: `C${a.totalRow}-C${l.totalRow}`, value: e.netWorth, style: "moneyBold" },
  ]);
  rows.push([]);
  rows.push([
    "Debt-to-asset ratio",
    null,
    {
      formula: `IF(C${a.totalRow}=0,0,C${l.totalRow}/C${a.totalRow})`,
      value: e.debtToAssets ?? 0,
      style: "percent",
    },
  ]);
  const liquidFormula =
    assets.length > 0
      ? LIQUID_LABELS.map((label) => `SUMIF(A${a.first}:A${a.last},"${label.replace(/"/g, '""')}",C${a.first}:C${a.last})`).join("+")
      : "0";
  const liquidRow = at();
  rows.push([
    "Liquid assets (cash and non-retirement investments)",
    null,
    { formula: liquidFormula, value: e.liquid, style: "money" },
  ]);
  rows.push([
    "Liquid assets minus all debts",
    null,
    { formula: `C${liquidRow}-C${l.totalRow}`, value: e.liquidNetWorth, style: "money" },
  ]);
  rows.push([]);
  rows.push([
    {
      value: "Edit any amount above and the totals update. Made with PennyWisecrack.",
      style: "note",
    },
  ]);

  const history: Sheet["rows"] = [
    [
      { value: "Date", style: "header" },
      { value: "Total assets", style: "header" },
      { value: "Total liabilities", style: "header" },
      { value: "Net worth", style: "header" },
    ],
    [
      { value: asOf, style: "date" },
      { value: e.totalAssets, style: "money" },
      { value: e.totalLiabilities, style: "money" },
      { formula: "B2-C2", value: e.netWorth, style: "money" },
    ],
  ];
  for (let r = 3; r <= 26; r++) {
    history.push([null, null, null, { formula: `IF(B${r}="","",B${r}-C${r})`, style: "money" }]);
  }
  history[0].push(null, {
    value: "Add a new row each month to watch your net worth grow.",
    style: "note",
  });

  return buildXlsx([
    { name: "Net worth", rows, columnWidths: [46, 28, 16] },
    { name: "History", rows: history, columnWidths: [14, 16, 18, 16, 3, 50] },
  ]);
}

// The same numbers as a plain CSV.
export function buildNetWorthCsv(items: NetWorthItem[], asOf: Date) {
  const e = estimateNetWorth(items);
  const rows: (string | number | null)[][] = [
    ["Net worth statement", null, null, null],
    ["As of", asOf.toISOString().slice(0, 10), null, null],
    [],
    ["Type", "Category", "Item", "Amount"],
  ];
  for (const i of ordered(items, "asset")) rows.push(["Asset", i.group, i.name, i.amount]);
  rows.push(["", "", "Total assets", e.totalAssets]);
  for (const i of ordered(items, "liability")) rows.push(["Liability", i.group, i.name, i.amount]);
  rows.push(["", "", "Total liabilities", e.totalLiabilities]);
  rows.push(["", "", "Net worth", e.netWorth]);
  return buildCsv(rows);
}
