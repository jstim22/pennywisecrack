import { describe, expect, it } from "vitest";
import { check, near } from "../helpers";
import { unzip } from "../zipReader";
import { crc32, zip } from "@/lib/zip";
import {
  buildCsv,
  buildXlsx,
  columnName,
  escapeAttr,
  escapeXml,
  excelDate,
  safeSheetName,
} from "@/lib/xlsx";
import {
  GROUPS,
  estimateNetWorth,
  medianForAge,
  type GroupId,
  type NetWorthItem,
} from "@/lib/netWorth";
import { buildNetWorthCsv, buildNetWorthWorkbook, netWorthFilename } from "@/lib/netWorthExport";

let nextId = 1;
const item = (group: GroupId, amount: number, name = ""): NetWorthItem => ({ id: nextId++, group, name, amount });

describe("net worth", () => {
  const items = [
    item("cash", 3_000, "Checking"),
    item("cash", 7_000, "Savings"),
    item("investments", 5_000),
    item("retirement", 25_000, "401(k)"),
    item("property", 12_000, "Car"),
    item("loans", 20_000, "Student loans"),
    item("cards", 1_500),
  ];
  const e = estimateNetWorth(items);

  check("total assets", e.totalAssets, 52_000);
  check("total liabilities", e.totalLiabilities, 21_500);
  check("net worth = assets - liabilities", e.netWorth, 30_500);
  check("cash", e.byGroup.cash, 10_000);
  check("retirement", e.byGroup.retirement, 25_000);
  check("student loans group", e.byGroup.loans, 20_000);
  check("liquid: cash + investments (not retirement)", e.liquid, 15_000);
  check("liquid minus all debts", e.liquidNetWorth, 15_000 - 21_500);
  check("debt-to-assets", e.debtToAssets!, 21_500 / 52_000, 1e-9);
  it("has an entry for every group", () => {
    expect(Object.keys(e.byGroup).sort()).toEqual(GROUPS.map((g) => g.id).sort());
  });
  it("can be negative", () => {
    const neg = estimateNetWorth([item("cash", 500), item("loans", 30_000)]);
    check("net worth", neg.netWorth, -29_500);
  });
  it("has no ratio without assets", () => {
    expect(estimateNetWorth([item("cards", 900)]).debtToAssets).toBeNull();
  });
  it("knows when there's nothing entered", () => {
    expect(estimateNetWorth([]).hasItems).toBe(false);
    expect(estimateNetWorth([item("cash", 0)]).hasItems).toBe(false);
    expect(e.hasItems).toBe(true);
  });
  it("ignores junk amounts", () => {
    const j = estimateNetWorth([item("cash", NaN), item("cash", -50), item("cash", 100)]);
    check("only the good one counts", j.totalAssets, 100);
  });
});

describe("comparing to people your age", () => {
  check("under 35", medianForAge(27)!.median, 39_000);
  check("35 to 44 starts at 35", medianForAge(35)!.median, 135_000);
  check("44 is still 35 to 44", medianForAge(44)!.median, 135_000);
  check("45 to 54", medianForAge(50)!.median, 247_000);
  check("55 to 64", medianForAge(60)!.median, 364_000);
  check("65 to 74", medianForAge(70)!.median, 410_000);
  check("75 and older", medianForAge(90)!.median, 335_000);
  it("has nothing without an age", () => {
    expect(medianForAge(0)).toBeNull();
    expect(medianForAge(NaN)).toBeNull();
  });
  it("shows how far above or below the median you are", () => {
    const r = estimateNetWorth([item("cash", 50_000)], 30);
    check("difference", r.benchmark!.difference, 11_000);
    check("ratio", r.benchmark!.ratio, 50_000 / 39_000, 1e-9);
    expect(estimateNetWorth([item("cash", 50_000)]).benchmark).toBeNull();
  });
});

describe("the zip writer", () => {
  it("writes files an independent reader can read back, with correct CRCs", () => {
    const files = unzip(
      zip([
        { name: "a.txt", content: "hello" },
        { name: "dir/b.xml", content: "<x>café ✓</x>" },
        { name: "empty.txt", content: "" },
      ]),
    );
    expect(files).toEqual({ "a.txt": "hello", "dir/b.xml": "<x>café ✓</x>", "empty.txt": "" });
  });
  it("computes the standard CRC-32", () => {
    // The well-known check value for the string "123456789".
    check("CRC-32 of 123456789", crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
    check("CRC-32 of nothing", crc32(new Uint8Array()), 0);
  });
});

describe("the spreadsheet writer", () => {
  it("names columns like a spreadsheet", () => {
    expect(columnName(0)).toBe("A");
    expect(columnName(25)).toBe("Z");
    expect(columnName(26)).toBe("AA");
    expect(columnName(27)).toBe("AB");
    expect(columnName(701)).toBe("ZZ");
    expect(columnName(702)).toBe("AAA");
  });
  it("converts dates to spreadsheet day numbers", () => {
    check("1900-01-01 is 2", excelDate(new Date(1900, 0, 1)), 2);
    check("2000-01-01", excelDate(new Date(2000, 0, 1)), 36_526);
    check("2026-09-26", excelDate(new Date(2026, 8, 26)), 46_291);
  });
  it("escapes text", () => {
    expect(escapeXml(`a & b < c > "d"`)).toBe('a &amp; b &lt; c &gt; "d"');
    expect(escapeXml("a\u0000b")).toBe("ab");
    expect(escapeAttr(`say "hi" & <go>`)).toBe("say &quot;hi&quot; &amp; &lt;go&gt;");
  });
  it("makes sheet names Excel accepts", () => {
    expect(safeSheetName("Net worth")).toBe("Net worth");
    expect(safeSheetName("a/b:c*d?e[f]g\\h")).toBe("a b c d e f g h");
    expect(safeSheetName("x".repeat(50))).toHaveLength(31);
    expect(safeSheetName("   ")).toBe("Sheet");
  });
  it("writes text, numbers, formulas, dates and styles", () => {
    const files = unzip(
      buildXlsx([
        {
          name: "Test",
          columnWidths: [20, 10],
          rows: [
            ["Label <1>", 42],
            [{ value: "Total", style: "bold" }, { formula: "SUM(B1:B1)", value: 42, style: "moneyBold" }],
            [{ value: new Date(2026, 8, 26), style: "date" }],
            [null, "x"],
          ],
        },
      ]),
    );
    expect(Object.keys(files).sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]);
    const sheet = files["xl/worksheets/sheet1.xml"];
    expect(sheet).toContain('<c r="A1" t="inlineStr"><is><t xml:space="preserve">Label &lt;1&gt;</t></is></c>');
    expect(sheet).toContain('<c r="B1"><v>42</v></c>');
    expect(sheet).toContain('<c r="B2" s="4"><f>SUM(B1:B1)</f><v>42</v></c>');
    expect(sheet).toContain('<c r="A3" s="8"><v>46291</v></c>');
    expect(sheet).toContain('<c r="B4" t="inlineStr">');
    expect(sheet).not.toContain('r="A4"');
    expect(sheet).toContain('<col min="1" max="1" width="20" customWidth="1"/>');
    expect(files["xl/workbook.xml"]).toContain('<sheet name="Test" sheetId="1" r:id="rId1"/>');
    expect(files["xl/workbook.xml"]).toContain('fullCalcOnLoad="1"');
  });
  it("puts every part in the content types and relationships", () => {
    const files = unzip(buildXlsx([{ name: "A", rows: [["x"]] }, { name: "B", rows: [["y"]] }]));
    for (const n of [1, 2]) {
      expect(files["[Content_Types].xml"]).toContain(`/xl/worksheets/sheet${n}.xml`);
      expect(files["xl/_rels/workbook.xml.rels"]).toContain(`worksheets/sheet${n}.xml`);
    }
    expect(files["xl/_rels/workbook.xml.rels"]).toContain('Id="rId3"');
  });
  it("style ids in the sheet exist in the stylesheet", () => {
    const files = unzip(buildXlsx([{ name: "S", rows: [[{ value: 1, style: "moneyBold" }, { value: 2, style: "note" }]] }]));
    const xfs = files["xl/styles.xml"].match(/<cellXfs count="(\d+)"/)![1];
    expect(Number(xfs)).toBe(9);
    expect(files["xl/styles.xml"].match(/<xf /g)!.length).toBe(1 + 9); // 1 cell style xf + 9 cell xfs
  });
  it("makes CSV that spreadsheets won't run as formulas", () => {
    expect(buildCsv([["a", 1, null], ["=SUM(A1)", "+1", '-2'], ['say "hi", ok', "x\ny", "@me"]])).toBe(
      `a,1,\r\n'=SUM(A1),'+1,'-2\r\n"say ""hi"", ok","x\ny",'@me\r\n`,
    );
    expect(buildCsv([[-5]])).toBe("-5\r\n");
  });
});

describe("the net worth spreadsheet", () => {
  const items = [
    item("cash", 3_000, "Checking"),
    item("cash", 8_000, "Savings"),
    item("retirement", 25_000, "401(k)"),
    item("property", 12_000, "Car"),
    item("loans", 20_000, "Student loans"),
    item("cards", 1_500, ""),
  ];
  const asOf = new Date(2026, 8, 26);
  const files = unzip(buildNetWorthWorkbook(items, asOf));
  const sheet = files["xl/worksheets/sheet1.xml"];
  const history = files["xl/worksheets/sheet2.xml"];
  const total = estimateNetWorth(items);

  it("has a Net worth sheet and a History sheet", () => {
    expect(files["xl/workbook.xml"]).toContain('name="Net worth"');
    expect(files["xl/workbook.xml"]).toContain('name="History"');
  });
  it("lists every item with its category and amount", () => {
    expect(sheet).toContain(">Cash &amp; bank accounts<");
    expect(sheet).toContain(">Checking<");
    expect(sheet).toContain('<c r="C5" s="3"><v>3000</v></c>');
    expect(sheet).toContain(">Student loans<");
    // A blank name falls back to the category.
    expect(sheet).toContain(">Credit cards<");
  });
  it("totals with live formulas and correct cached values", () => {
    // Rows: 1 title, 2 date, 3 blank, 4 Assets header, 5-8 assets, 9 total.
    expect(sheet).toContain(`<c r="C9" s="4"><f>SUM(C5:C8)</f><v>${total.totalAssets}</v></c>`);
    // 11 Liabilities header, 12-13 liabilities, 14 total.
    expect(sheet).toContain(`<c r="C14" s="4"><f>SUM(C12:C13)</f><v>${total.totalLiabilities}</v></c>`);
    // 16 Net worth.
    expect(sheet).toContain(`<c r="C16" s="4"><f>C9-C14</f><v>${total.netWorth}</v></c>`);
  });
  it("adds the ratio and the liquid figures", () => {
    expect(sheet).toContain("<f>IF(C9=0,0,C14/C9)</f>");
    expect(sheet).toContain('SUMIF(A5:A8,"Cash &amp; bank accounts",C5:C8)+SUMIF(A5:A8,"Investments",C5:C8)');
    expect(sheet).toContain("Liquid assets minus all debts");
  });
  it("starts a history with today's numbers, and room to add more", () => {
    expect(history).toContain(`<c r="A2" s="8"><v>46291</v></c>`);
    expect(history).toContain(`<c r="B2" s="3"><v>${total.totalAssets}</v></c>`);
    expect(history).toContain('<c r="D2" s="3"><f>B2-C2</f>');
    expect(history).toContain('<f>IF(B26="","",B26-C26)</f>');
  });
  it("handles names with symbols and formulas-looking text", () => {
    const tricky = unzip(buildNetWorthWorkbook([item("cash", 10, `=HYPERLINK("x") & <b>`)], asOf))["xl/worksheets/sheet1.xml"];
    expect(tricky).toContain('=HYPERLINK("x") &amp; &lt;b&gt;');
    // Written as text, never as a formula.
    expect(tricky).not.toContain("<f>HYPERLINK");
  });
  it("copes with nothing entered", () => {
    const empty = unzip(buildNetWorthWorkbook([], asOf))["xl/worksheets/sheet1.xml"];
    expect(empty).toContain("Total assets");
    expect(empty).not.toContain("<f>SUM(");
    expect(empty).toContain("<f>C6-C10</f>".replace("C6-C10", empty.match(/<f>(C\d+-C\d+)<\/f>/)![1]));
  });
  it("names the file by date", () => {
    expect(netWorthFilename(asOf, "xlsx")).toBe("net-worth-2026-09-26.xlsx");
    expect(netWorthFilename(new Date(2026, 0, 5), "csv")).toBe("net-worth-2026-01-05.csv");
  });
});

describe("the net worth CSV", () => {
  const csv = buildNetWorthCsv(
    [item("cash", 3_000, "Checking"), item("loans", 20_000, "=Loan, big"), item("cash", 500, "Savings")],
    new Date(2026, 8, 26),
  );
  const lines = csv.trim().split("\r\n");
  it("has a header and every item", () => {
    expect(lines[0]).toBe("Net worth statement,,,");
    expect(lines[1]).toBe("As of,2026-09-26,,");
    expect(lines).toContain("Type,Category,Item,Amount");
    expect(lines).toContain("Asset,Cash & bank accounts,Checking,3000");
    expect(lines).toContain("Asset,Cash & bank accounts,Savings,500");
  });
  it("adds totals", () => {
    expect(lines).toContain(",,Total assets,3500");
    expect(lines).toContain(",,Total liabilities,20000");
    expect(lines).toContain(",,Net worth,-16500");
  });
  it("keeps typed names from being read as formulas", () => {
    expect(lines).toContain(`Liability,Loans,"'=Loan, big",20000`);
  });
  it("agrees with the spreadsheet totals", () => {
    near(3_500 - 20_000, estimateNetWorth([item("cash", 3_000), item("loans", 20_000), item("cash", 500)]).netWorth, 1e-9, "net worth");
  });
});
