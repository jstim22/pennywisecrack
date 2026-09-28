import { afterEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import BonusCalculator from "@/components/calculators/BonusCalculator";
import CompoundInterestCalculator from "@/components/calculators/CompoundInterestCalculator";
import PaycheckCalculator from "@/components/calculators/PaycheckCalculator";
import RetirementCalculator from "@/components/calculators/RetirementCalculator";
import SinkingFundCalculator from "@/components/calculators/SinkingFundCalculator";
import TaxCalculator from "@/components/calculators/TaxCalculator";
import DebtPayoffCalculator from "@/components/calculators/DebtPayoffCalculator";
import StudentLoanCalculator from "@/components/calculators/StudentLoanCalculator";
import MortgageCalculator from "@/components/calculators/MortgageCalculator";
import CarLoanCalculator from "@/components/calculators/CarLoanCalculator";
import OpportunityCostCalculator from "@/components/calculators/OpportunityCostCalculator";
import BudgetCalculator from "@/components/calculators/BudgetCalculator";
import NetWorthCalculator from "@/components/calculators/NetWorthCalculator";
import { unzip } from "../zipReader";
import Calculators from "@/app/calculators/page";
import CalculatorsToc from "@/components/calculators/CalculatorsToc";
import CalculatorsLayout from "@/app/calculators/layout";
import BlogLayout from "@/app/blog/layout";
import LearningLayout from "@/app/learning/layout";
import Footer from "@/components/Footer";
import Disclaimer from "@/app/disclaimer/page";
import Privacy from "@/app/privacy/page";
import { CALCULATOR_SECTIONS } from "@/lib/calculatorCatalog";

// These render each calculator the way a visitor sees it and check the
// numbers on screen, so they catch wiring mistakes the engine tests can't.

const text = () => document.body.textContent ?? "";
const field = (id: string) => document.getElementById(id) as HTMLInputElement;
const type = (id: string, value: string) =>
  fireEvent.change(field(id), { target: { value } });
const pick = (id: string, value: string) =>
  fireEvent.change(field(id), { target: { value } });
const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));

describe("Paycheck Estimator", () => {
  it("opens on $15 an hour x 10 hrs a week, paid every two weeks", () => {
    render(<PaycheckCalculator />);
    expect(text()).toContain("$300.00 gross");
    expect(text()).toContain("Take-home pay$277.05");
    expect(text()).toContain("Social Security (6.2%)−$18.60");
    expect(text()).toContain("Medicare (1.45%)−$4.35");
    expect(text()).toContain("Federal income tax−$0.00");
  });

  it("matches a real pay stub: $78k salary, $289 pre-tax insurance, biweekly", () => {
    render(<PaycheckCalculator />);
    click("Salary");
    type("salary", "78000");
    type("insurancePreTax", "289");
    expect(text()).toContain("Social Security (6.2%)−$168.08");
    expect(text()).toContain("Medicare (1.45%)−$39.31");
    expect(text()).toContain("Federal income tax−$256.80");
  });

  it("adds state tax once a state is chosen", () => {
    render(<PaycheckCalculator />);
    click("Salary");
    type("salary", "40000");
    expect(text()).toContain("State income tax−$0.00");
    pick("state", "PA");
    // 3.07% of $40,000 = $1,228 a year, over 26 paychecks
    expect(text()).toContain("State income tax (PA)−$47.23");
  });
});

describe("Bonus Estimator", () => {
  it("opens on $2,000 on top of $40,000 a year", () => {
    render(<BonusCalculator />);
    expect(field("bonus").value).toBe("2,000.00");
    expect(field("annualPay").value).toBe("40,000.00");
    expect(text()).toContain("You keep$1,407.00");
    expect(text()).toContain("Federal income tax (22% flat)−$440.00");
    expect(text()).toContain("Income tax you'll owe$240.00");
    expect(text()).toContain("about $200.00 back");
  });

  it("fills in California's published 10.23% bonus rate", () => {
    render(<BonusCalculator />);
    pick("state", "CA");
    expect(field("stateBonusRate").value).toBe("10.23");
    expect(text()).toContain("State income tax (CA)−$204.60");
    expect(text()).toContain("You keep$1,202.40");
  });

  it("asks which county in Maryland and adds that county's tax", () => {
    render(<BonusCalculator />);
    expect(document.getElementById("local")).toBeNull();
    pick("state", "MD");
    expect(document.getElementById("local")).not.toBeNull();
    pick("local", "baltimore-city");
    expect(text()).toContain("Local income tax (Baltimore City)−$64.00");
    expect(text()).toContain("You keep$1,248.00");
  });

  it("forgets the county when the state changes", () => {
    render(<BonusCalculator />);
    pick("state", "MD");
    pick("local", "baltimore-city");
    pick("state", "TX");
    expect(document.getElementById("local")).toBeNull();
    expect(text()).not.toContain("Local income tax");
  });

  it("lets you override the state withholding rate", () => {
    render(<BonusCalculator />);
    pick("state", "IL");
    type("stateBonusRate", "10");
    expect(text()).toContain("State income tax (IL)−$200.00");
  });
});

describe("Sinking Fund Calculator", () => {
  it("opens on $150 goal, $20 saved, $10 a week", () => {
    render(<SinkingFundCalculator />);
    expect(text()).toContain("3 months");
    expect(text()).toContain("13 deposits");
    expect(text()).toContain("$130.00");
    expect(text()).toContain("$20.00 of $150.00 saved");
  });

  it("shows the same pace for every frequency", () => {
    render(<SinkingFundCalculator />);
    for (const value of ["$1.42", "$10.00", "$20.00", "$21.67", "$43.33", "$520.00"]) {
      expect(text()).toContain(value);
    }
    click("Daily");
    expect(text()).toContain("How much can you save per day?");
    expect(text()).toContain("$3,650.00");
  });

  it("switches the question with the frequency", () => {
    render(<SinkingFundCalculator />);
    click("Semimonthly");
    expect(text()).toContain("How much can you save twice a month?");
    click("Yearly");
    expect(text()).toContain("How much can you save per year?");
  });

  it("adds high-yield savings interest", () => {
    render(<SinkingFundCalculator />);
    click("Monthly");
    type("goal", "1200");
    type("saved", "0");
    type("contribution", "100");
    expect(text()).not.toContain("Interest earned");
    fireEvent.click(screen.getByLabelText(/High-yield savings account/));
    expect(field("apy").value).toBe("4");
    expect(text()).toContain("Interest earned$21.84");
  });

  it("says so when the goal is already met, or nothing is being saved", () => {
    render(<SinkingFundCalculator />);
    type("saved", "150");
    expect(text()).toContain("already hit your goal");
    type("saved", "20");
    type("contribution", "0");
    expect(text()).toContain("Enter how much you can save");
  });
});

describe("Compound Interest Calculator", () => {
  it("opens on $100 + $20 a month at 5% for 5 years", () => {
    render(<CompoundInterestCalculator />);
    expect(text()).toContain("$1,488.46");
    expect(text()).toContain("You put in$1,300.00");
    expect(text()).toContain("Interest earned$188.46");
  });

  it("adds a one-time lump sum", () => {
    render(<CompoundInterestCalculator />);
    click("+ Add a lump sum");
    const when = screen.getByLabelText("When to add this lump sum");
    fireEvent.change(when, { target: { value: "2" } });
    expect(text()).toContain("$2,649.93");
    fireEvent.click(screen.getByLabelText("Remove this lump sum"));
    expect(text()).toContain("$1,488.46");
  });

  it("raises contributions each year", () => {
    render(<CompoundInterestCalculator />);
    type("contributionGrowth", "2");
    expect(text()).toContain("$1,541.17");
  });

  it("shows today's dollars when adjusting for inflation", () => {
    render(<CompoundInterestCalculator />);
    fireEvent.click(screen.getByLabelText("Adjust for inflation"));
    expect(text()).toContain("$1,299.65 in today's dollars");
  });

  it("customizes a single year", () => {
    render(<CompoundInterestCalculator />);
    fireEvent.click(screen.getByLabelText("Customize by year"));
    const rows = document.querySelectorAll(".max-h-64 > div");
    expect(rows).toHaveLength(5);
    const [amount, rate] = rows[2].querySelectorAll("input");
    fireEvent.change(amount, { target: { value: "200" } });
    fireEvent.change(rate, { target: { value: "12" } });
    expect(text()).toContain("$4,071.14");
  });

  it("runs Monte Carlo scenarios", () => {
    render(<CompoundInterestCalculator />);
    expect(text()).not.toContain("Monte Carlo outcomes");
    fireEvent.click(screen.getByLabelText(/Monte Carlo scenarios/));
    expect(text()).toContain("Monte Carlo outcomes");
    expect(text()).toContain("10th percentile");
    expect(text()).toContain("90th percentile");
  });
});

describe("Retirement Calculator", () => {
  it("opens on age 16 to 65, $50 a month at 9%", () => {
    render(<RetirementCalculator />);
    expect(text()).toContain("By age 65, you could have$532,845");
    expect(text()).toContain("You put in$29,400");
    expect(document.querySelector("svg")).not.toBeNull();
  });

  it("adds a lump sum at a chosen age", () => {
    render(<RetirementCalculator />);
    click("+ Add a lump sum");
    fireEvent.change(screen.getByLabelText("When to add this lump sum"), {
      target: { value: "26" },
    });
    fireEvent.change(screen.getByLabelText("Lump sum amount"), {
      target: { value: "10000" },
    });
    expect(text()).toContain("$862,976");
    expect(text()).toContain("You put in$39,400");
  });

  it("flags a lump sum that falls outside the timeline", () => {
    render(<RetirementCalculator />);
    click("+ Add a lump sum");
    fireEvent.change(screen.getByLabelText("When to add this lump sum"), {
      target: { value: "60" },
    });
    type("retireAge", "40");
    expect(text()).toContain("Age 60 is outside your timeline");
  });

  it("applies the glide path and yearly contribution raise", () => {
    render(<RetirementCalculator />);
    type("contributionGrowth", "2");
    expect(text()).toContain("$663,348");
    fireEvent.click(screen.getByLabelText(/Glide path/));
    expect(text()).toContain("$448,992");
  });

  it("switches to yearly contributions", () => {
    render(<RetirementCalculator />);
    click("Yearly");
    type("contribution", "600");
    expect(text()).toContain("$511,221");
  });

  it("suggests how much more to invest to reach $1M and $5M", () => {
    render(<RetirementCalculator />);
    expect(text()).toContain("more a month to reach $1,000,000 by age 65");
    expect(text()).toContain("more a month to reach $5,000,000 by age 65");
  });

  it("asks for a later retirement age when it isn't after today's", () => {
    render(<RetirementCalculator />);
    type("retireAge", "10");
    expect(text()).toContain("Set a retirement age older than your current age");
  });
});

describe("Income Tax Calculator", () => {
  it("opens on $60,000 of pay with no state", () => {
    render(<TaxCalculator />);
    expect(text()).toContain("you could pay about$9,610");
    expect(text()).toContain("16.0% of your $60,000 income");
    expect(text()).toContain("You'd keep about $50,390 ($4,199 a month)");
    expect(text()).toContain("Federal income tax$5,020");
    expect(text()).toContain("Social Security $3,720 · Medicare $870");
    expect(text()).toContain("Pick your state to include it");
    expect(text()).toContain("Next dollar19.7%");
  });

  it("adds state tax", () => {
    render(<TaxCalculator />);
    pick("state", "IL");
    expect(text()).toContain("State income tax (IL)$2,825");
    expect(text()).toContain("Next dollar24.6%");
  });

  it("asks which county in Maryland and adds that county's tax", () => {
    render(<TaxCalculator />);
    pick("state", "MD");
    pick("local", "baltimore-city");
    expect(text()).toContain("Local income tax (Baltimore City)$1,710");
    pick("state", "TX");
    expect(document.getElementById("local")).toBeNull();
    expect(text()).not.toContain("Local income tax");
  });

  it("shows how each federal bracket adds up", () => {
    render(<TaxCalculator />);
    expect(text()).toContain("leaves $43,900 to be taxed");
    expect(text()).toContain("$12,400$1,240");
    expect(text()).toContain("$31,500$3,780");
    expect(text()).toContain("Federal income tax$5,020");
  });

  it("lowers federal tax with a traditional 401(k), but not Social Security", () => {
    render(<TaxCalculator />);
    type("retirement", "6000");
    expect(text()).toContain("Federal income tax$4,300");
    expect(text()).toContain("Social Security $3,720");
    expect(text()).toContain("Savings & benefits");
  });

  it("uses itemized deductions when they beat the standard one", () => {
    render(<TaxCalculator />);
    type("itemized", "20000");
    expect(text()).toContain("Federal income tax$4,552");
    expect(text()).toContain("bigger than the standard deduction");
  });

  it("applies credits and says when some go unused", () => {
    render(<TaxCalculator />);
    type("credits", "1000");
    expect(text()).toContain("Federal income tax$4,020");
    type("credits", "6000");
    expect(text()).toContain("Federal income tax$0");
    expect(text()).toContain("$980 of them goes unused");
  });

  it("explains the Social Security cap for high earners", () => {
    render(<TaxCalculator />);
    type("wages", "250000");
    expect(text()).toContain("Social Security tax stops at $184,500");
    expect(text()).toContain("Medicare $4,075"); // 1.45% plus 0.9% over $200,000
  });

  it("says when income is under the deduction", () => {
    render(<TaxCalculator />);
    type("wages", "10000");
    expect(text()).toContain("likely owe no federal income tax");
  });

  it("asks for pay when there is none", () => {
    render(<TaxCalculator />);
    type("wages", "0");
    expect(text()).toContain("Enter your yearly pay");
    expect(document.querySelector('svg[role="img"]')).toBeNull();
  });

  it("draws the rate chart, with a table of the same numbers", () => {
    render(<TaxCalculator />);
    const chart = document.querySelector('svg[role="img"]')!;
    expect(chart.getAttribute("aria-label")).toContain("$100,000");
    expect(document.querySelectorAll("details table tbody tr")).toHaveLength(11);
    click("$500k");
    expect(
      document.querySelector('svg[role="img"]')!.getAttribute("aria-label"),
    ).toContain("$500,000");
  });

  it("explains the Social Security cap dip, and marks it once the range reaches it", () => {
    render(<TaxCalculator />);
    expect(text()).toContain("Why the next-dollar rate drops near $184,500");
    expect(text()).toContain("extra 0.9% Medicare tax starts");
    expect(text()).toContain("Choose a bigger range above");
    expect(text()).not.toContain("Social Security cap");
    click("$250k");
    expect(text()).toContain("Social Security cap");
    expect(text()).not.toContain("Choose a bigger range above");
  });

  it("shows a readout when you move along the chart with the keyboard", () => {
    render(<TaxCalculator />);
    const chart = document.querySelector('svg[role="img"]')!;
    fireEvent.focus(chart);
    fireEvent.keyDown(chart, { key: "ArrowRight" });
    expect(text()).toMatch(/\$\d[\d,]* of pay\d+\.\d%average/);
  });
});

describe("Debt Payoff Calculator", () => {
  it("opens on three debts with $200 extra and a 3-year goal", () => {
    render(<DebtPayoffCalculator />);
    expect(field("debt-1-balance").value).toBe("6,000.00");
    expect(field("debt-2-apr").value).toBe("9");
    expect(field("debt-3-minimum").value).toBe("220.00");
    expect(field("extra").value).toBe("200.00");
    expect(field("horizon").value).toBe("3");
    expect(text()).toContain("you could be debt-free in2 years, 7 months");
  });

  it("compares the three methods", () => {
    render(<DebtPayoffCalculator />);
    expect(text()).toContain("Debt-free in 6 years, 10 months");
    expect(text()).toContain("$7,617");
    expect(text()).toContain("$2,939");
    expect(text()).toContain("$2,613");
    expect(text()).toContain("Avalanche saves you about $325 in interest");
    expect(text()).toContain("Snowball clears your first debt (Personal loan)");
  });

  it("shows what you'd still owe at the time horizon", () => {
    render(<DebtPayoffCalculator />);
    expect(text()).toContain("In 3 years");
    expect(text()).toContain("Minimums only$6,653");
    expect(text()).toContain("Snowball" + "Debt-free ✓");
    expect(text()).toContain("You're on track");
  });

  it("says how much extra you'd need when the goal is too soon", () => {
    render(<DebtPayoffCalculator />);
    type("horizon", "1");
    expect(text()).toContain("To be debt-free in 1 year, you'd need about");
    expect(text()).toContain("extra a month");
    expect(text()).not.toContain("You're on track");
  });

  it("lists the payoff order for each method", () => {
    render(<DebtPayoffCalculator />);
    const lists = document.querySelectorAll("ol");
    expect(lists).toHaveLength(2);
    const names = (ol: Element) => [...ol.querySelectorAll("li")].map((li) => li.textContent);
    expect(names(lists[0])[0]).toContain("Personal loan"); // snowball: smallest balance
    expect(names(lists[1])[0]).toContain("Credit card"); // avalanche: highest rate
  });

  it("adds and removes debts", () => {
    render(<DebtPayoffCalculator />);
    click("+ Add a debt");
    expect(field("debt-4-balance").value).toBe("1,000.00");
    fireEvent.click(screen.getByRole("button", { name: "Remove Car loan" }));
    expect(document.getElementById("debt-3-balance")).toBeNull();
    expect(document.querySelectorAll("ol li")).toHaveLength(6);
  });

  it("uses the names you type", () => {
    render(<DebtPayoffCalculator />);
    fireEvent.change(screen.getByLabelText("Name of debt 1"), { target: { value: "Visa" } });
    expect(document.querySelector("ol li")?.textContent).not.toContain("Visa"); // snowball lists the loan first
    expect(text()).toContain("Visa");
  });

  it("asks for a debt when there are none", () => {
    render(<DebtPayoffCalculator />);
    for (const name of ["Remove Credit card", "Remove Personal loan", "Remove Car loan"]) {
      fireEvent.click(screen.getByRole("button", { name }));
    }
    expect(text()).toContain("Add a debt with a balance");
    expect(document.querySelector('svg[role="img"]')).toBeNull();
  });

  it("warns when payments can't keep up with the interest", () => {
    render(<DebtPayoffCalculator />);
    type("debt-1-balance", "100000");
    type("extra", "0");
    expect(text()).toContain("more than 100 years");
    expect(text()).toContain("less than one month of interest");
  });

  it("draws the balance chart with a table and a keyboard readout", () => {
    render(<DebtPayoffCalculator />);
    const chart = document.querySelector('svg[role="img"]')!;
    expect(chart.getAttribute("aria-label")).toContain("Total debt left");
    expect(document.querySelectorAll("details table tbody tr").length).toBeGreaterThan(3);
    fireEvent.focus(chart);
    fireEvent.keyDown(chart, { key: "ArrowRight" });
    expect(text()).toMatch(/After \d/);
  });
});

describe("Student Loan Calculator", () => {
  it("opens on a $25,000 federal loan at 6.52% on the 10-year plan", () => {
    render(<StudentLoanCalculator />);
    expect(field("loan-1-balance").value).toBe("25,000.00");
    expect(field("loan-1-rate").value).toBe("6.52");
    expect(text()).toContain("Standard (10 yrs) plan, your monthly payment is$284");
    expect(text()).toContain("plus your $50 extra");
    expect(text()).toContain("Paid off in 8 years, 1 month");
    expect(text()).toContain("Your $50 extra a month gets you out 1 year, 11 months sooner");
  });

  it("compares every plan side by side, without your extra", () => {
    render(<StudentLoanCalculator />);
    const cards = [...document.querySelectorAll("section button[aria-pressed]")];
    expect(cards).toHaveLength(4);
    const t = (i: number) => cards[i].textContent;
    expect(t(0)).toContain("$284 / month");
    expect(t(0)).toContain("10 years");
    expect(t(1)).toContain("$218 / month");
    expect(t(1)).toContain("15 years");
    expect(t(2)).toContain("$169 / month");
    expect(t(2)).toContain("25 years");
    expect(t(3)).toContain("$167 / month");
    expect(t(3)).toContain("rising to about $346");
  });

  it("switches plans by clicking a card", () => {
    render(<StudentLoanCalculator />);
    fireEvent.click(screen.getByRole("button", { name: /Extended/ }));
    expect(text()).toContain("Extended (25 yrs) plan, your monthly payment is$169");
    expect((document.getElementById("plan") as HTMLSelectElement).value).toBe("extended");
  });

  it("lets you choose your own term", () => {
    render(<StudentLoanCalculator />);
    pick("plan", "custom");
    type("customYears", "5");
    expect(text()).toContain("Your term plan, your monthly payment is$489");
    expect(document.querySelectorAll("section button[aria-pressed]")).toHaveLength(5);
  });

  it("adds the interest that builds up before repayment starts", () => {
    render(<StudentLoanCalculator />);
    type("monthsUntil", "12");
    expect(text()).toContain("$1,630 of interest builds up");
    expect(text()).toContain("owing $26,630 instead of $25,000");
    fireEvent.click(screen.getByLabelText(/Subsidized/));
    expect(text()).not.toContain("of interest builds up");
  });

  it("shows the Repayment Assistance Plan, with forgiveness for a low income", () => {
    render(<StudentLoanCalculator />);
    pick("plan", "rap");
    type("extra", "0");
    expect(text()).toContain("RAP (income-based) plan, your monthly payment is$167");
    expect(text()).toContain("rising to about $346 as your income grows");
    type("loan-1-balance", "80000");
    type("income", "30000");
    expect(text()).toContain("would be forgiven");
    expect(text()).toContain("may count as taxable income");
  });

  it("gives RAP a $50 discount per dependent", () => {
    render(<StudentLoanCalculator />);
    pick("plan", "rap");
    type("raise", "0");
    expect(text()).toContain("your monthly payment is$167");
    type("dependents", "2");
    expect(text()).toContain("your monthly payment is$67");
  });

  it("compares the payment to your income", () => {
    render(<StudentLoanCalculator />);
    expect(text()).toContain("about 6.8% of your monthly income");
    type("loan-1-balance", "80000");
    expect(text()).toContain("more than the common advice");
  });

  it("adds and removes loans", () => {
    render(<StudentLoanCalculator />);
    click("+ Add a loan");
    expect(field("loan-2-rate").value).toBe("6.52");
    fireEvent.click(screen.getByRole("button", { name: "Remove Federal loan" }));
    expect(document.getElementById("loan-1-balance")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Remove loan 1" }));
    expect(text()).toContain("Add a loan with a balance");
    expect(document.querySelector('svg[role="img"]')).toBeNull();
  });

  it("draws the balance chart for each plan, with a table", () => {
    render(<StudentLoanCalculator />);
    const chart = document.querySelector('svg[role="img"]')!;
    expect(chart.getAttribute("aria-label")).toContain("Student loan balance");
    expect(document.querySelectorAll("details table tbody tr").length).toBeGreaterThan(3);
  });
});

describe("Student Loan Calculator: autopay discount", () => {
  // These depend on today's date (the 1% discount window is fixed), so pin it.
  const on = (year: number, month: number, day: number) =>
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(year, month, day, 12) });
  afterEach(() => vi.useRealTimers());

  it("starts off, and counts down the days to the sign-up deadline", () => {
    on(2026, 8, 26);
    render(<StudentLoanCalculator />);
    expect((screen.getByLabelText(/Pay by autopay/) as HTMLInputElement).checked).toBe(false);
    expect(text()).toContain("You have 4 days left (through September 30, 2026)");
    expect(text()).not.toContain("Autopay saves you");
  });

  it("shows what autopay saves on a federal loan: 1% for 21 months, then 0.25%", () => {
    on(2026, 8, 26);
    render(<StudentLoanCalculator />);
    fireEvent.click(screen.getByLabelText(/Pay by autopay/));
    expect(text()).toMatch(/Autopay saves you about \$[\d,]+ in interest/);
    expect(text()).toContain("1% off for your first 1 year, 9 months of payments, then 0.25% off");
  });

  it("leaves your required payment alone", () => {
    on(2026, 8, 26);
    render(<StudentLoanCalculator />);
    const payment = () => text().match(/your monthly payment is\$(\d+)/)?.[1];
    const before = payment();
    fireEvent.click(screen.getByLabelText(/Pay by autopay/));
    expect(payment()).toBe(before);
  });

  it("counts only the months left in the window if repayment starts later", () => {
    on(2026, 8, 26);
    render(<StudentLoanCalculator />);
    fireEvent.click(screen.getByLabelText(/Pay by autopay/));
    type("monthsUntil", "12");
    expect(text()).toContain("1% off for your first 9 months of payments");
    type("monthsUntil", "40");
    expect(text()).toContain("since the temporary 1% window doesn't cover your payments");
  });

  it("after the deadline, asks if you enrolled in time", () => {
    on(2026, 9, 15);
    render(<StudentLoanCalculator />);
    expect(text()).not.toContain("days left");
    fireEvent.click(screen.getByLabelText(/Pay by autopay/));
    const late = screen.getByLabelText(/I enrolled by September 30, 2026/) as HTMLInputElement;
    expect(late.checked).toBe(true);
    expect(text()).toContain("1% off for your first");
    fireEvent.click(late);
    expect(text()).toContain("since the temporary 1% window doesn't cover your payments");
  });

  it("doesn't apply to private loans", () => {
    on(2026, 8, 26);
    render(<StudentLoanCalculator />);
    fireEvent.click(screen.getByLabelText(/Pay by autopay/));
    fireEvent.click(screen.getByLabelText("Federal Direct Loan (not a private loan)"));
    expect(screen.queryByLabelText(/Subsidized/)).toBeNull();
    expect(text()).toContain("None of your loans are marked as federal");
    expect(text()).not.toContain("Autopay saves you");
  });

  it("explains that RAP already waives interest your payment doesn't cover", () => {
    on(2026, 8, 26);
    render(<StudentLoanCalculator />);
    pick("plan", "rap");
    type("loan-1-balance", "80000");
    type("income", "30000");
    type("extra", "0");
    fireEvent.click(screen.getByLabelText(/Pay by autopay/));
    expect(text()).toContain("interest your payment doesn't cover is waived either way");
  });
});

describe("Income Tax Calculator: 1099 income", () => {
  it("asks for 1099 income, and only shows business settings once you have some", () => {
    render(<TaxCalculator />);
    expect(field("selfEmployment").value).toBe("0.00");
    expect(document.getElementById("businessExpenses")).toBeNull();
    expect(text()).not.toContain("Self-employment tax");
    type("selfEmployment", "20000");
    expect(document.getElementById("businessExpenses")).not.toBeNull();
    expect(document.getElementById("seHealth")).not.toBeNull();
    expect(document.getElementById("sep")).not.toBeNull();
    expect(text()).toContain("Self-employment tax (1099)");
  });

  it("works out a freelancer's taxes: $80,000 of 1099 income, $10,000 of expenses", () => {
    render(<TaxCalculator />);
    type("wages", "0");
    type("selfEmployment", "80000");
    type("businessExpenses", "10000");
    expect(text()).toContain("you could pay about$14,342");
    expect(text()).toContain("20.5% of your $70,000 income");
    expect(text()).toContain("Federal income tax$4,452");
    expect(text()).toContain("Self-employment tax (1099)Social Security $8,016 · Medicare $1,875$9,891");
    expect(text()).toContain("Half of your self-employment tax ($4,945) comes off your income");
    expect(text()).toContain("business income (QBI) deduction takes another $9,791");
    expect(text()).toContain("leaves $39,164 to be taxed");
  });

  it("says what to set aside each quarter", () => {
    render(<TaxCalculator />);
    type("wages", "0");
    type("selfEmployment", "80000");
    type("businessExpenses", "10000");
    expect(text()).toContain("set aside about $3,586 every quarter");
    expect(text()).toContain("estimated taxes in April, June, September, and January");
    expect(text()).toContain("110% if last year's income was over $150,000");
  });

  it("adds 1099 tax on top of a W-2 job", () => {
    render(<TaxCalculator />);
    const before = text().match(/you could pay about\$([\d,]+)/)?.[1];
    type("selfEmployment", "20000");
    const after = text().match(/you could pay about\$([\d,]+)/)?.[1];
    expect(Number(after?.replace(/,/g, ""))).toBeGreaterThan(Number(before?.replace(/,/g, "")));
    expect(text()).toContain("Social Security & Medicare");
    expect(text()).toContain("Self-employment tax (1099)");
  });

  it("switches the chart to 1099 income when that's most of your pay", () => {
    render(<TaxCalculator />);
    type("wages", "0");
    type("selfEmployment", "80000");
    expect(document.querySelector('svg[role="img"]')!.getAttribute("aria-label")).toContain("of 1099 income");
    expect(text()).toContain("Yearly 1099 income");
    expect(text()).toContain("of earnings");
  });

  it("takes a SEP-IRA and health insurance off your income", () => {
    render(<TaxCalculator />);
    type("wages", "0");
    type("selfEmployment", "80000");
    type("businessExpenses", "10000");
    type("sep", "5000");
    expect(text()).toContain("Savings & benefits");
    type("sep", "30000");
    expect(text()).toContain("A SEP-IRA can take up to 20% of your profit");
  });
});

describe("Mortgage Calculator", () => {
  it("opens on a $400,000 home with 10% down at 6.5% for 30 years", () => {
    render(<MortgageCalculator />);
    expect(field("price").value).toBe("400,000.00");
    expect(field("down").value).toBe("10");
    expect(text()).toContain("Your estimated monthly payment$2,974");
    expect(text()).toContain("drops to $2,809 when PMI ends");
    expect(text()).toContain("Principal & interest$2,275");
    expect(text()).toContain("Property tax0.9% of the price a year (national average)$300");
    expect(text()).toContain("Homeowners insurance0.7% of the price a year$233");
    expect(text()).toContain("Mortgage insurance (PMI)0.55% of the loan a year (a guess)$165");
    expect(text()).toContain("about $533 a month into escrow");
    expect(text()).toContain("Cash to close$52,000");
  });

  it("explains PMI: how long it lasts and what 20% down would do", () => {
    render(<MortgageCalculator />);
    expect(text()).toContain("PMI costs $165 a month for about 7 years, 11 months");
    expect(text()).toContain("Putting another $40,000 down (20%) would avoid it");
  });

  it("drops PMI at 20% down", () => {
    render(<MortgageCalculator />);
    type("down", "20");
    expect(text()).not.toContain("PMI costs");
    expect(text()).not.toContain("drops to");
    expect(text()).toContain("Your estimated monthly payment$2,556");
    expect(text()).toContain("With 20% or more down, there's no PMI");
  });

  it("keeps your down payment when you switch between % and $", () => {
    render(<MortgageCalculator />);
    click("Dollars ($)");
    expect(field("down").value).toBe("40,000.00");
    type("down", "80000");
    click("Percent (%)");
    expect(field("down").value).toBe("20");
  });

  it("guesses property tax from your state", () => {
    render(<MortgageCalculator />);
    pick("state", "IL");
    expect(text()).toContain("The average for Illinois");
    expect(text()).toContain("1.88% of the price a year (Illinois average)$627");
    expect(field("taxRate").value).toBe("1.88");
  });

  it("lets you override the guesses, and reset them", () => {
    render(<MortgageCalculator />);
    type("pmiRate", "1");
    expect(text()).toContain("1% of the loan a year");
    expect(text()).not.toContain("(a guess)");
    click("Reset to the guess (0.55%)");
    expect(text()).toContain("0.55% of the loan a year (a guess)");
    pick("state", "TX");
    type("taxRate", "2");
    expect(text()).toContain("You changed this.");
    click("Reset to the guess (1.4%)");
    expect(field("taxRate").value).toBe("1.4");
  });

  it("charges more PMI for a lower credit score", () => {
    render(<MortgageCalculator />);
    pick("credit", "620");
    expect(field("pmiRate").value).toBe("1.25");
  });

  it("adds HOA dues and a different loan length", () => {
    render(<MortgageCalculator />);
    type("hoa", "250");
    expect(text()).toContain("HOA dues");
    click("15 years");
    expect(text()).toContain("Principal & interest$3,136");
  });

  it("shows what extra payments save", () => {
    render(<MortgageCalculator />);
    type("extra", "300");
    expect(text()).toContain("Your $300 extra a month pays the loan off");
    expect(text()).toContain("With your extra");
  });

  it("compares your payment to your income", () => {
    render(<MortgageCalculator />);
    type("income", "120000");
    expect(text()).toContain("Your housing payment is about 29.7% of your monthly income");
    type("otherDebt", "500");
    expect(text()).toContain("with your other debts");
  });

  it("draws the balance chart and a year-by-year table", () => {
    render(<MortgageCalculator />);
    expect(document.querySelector('svg[role="img"]')!.getAttribute("aria-label")).toContain("Mortgage balance left");
    expect(document.querySelectorAll("details table tbody tr").length).toBeGreaterThan(20);
  });

  it("asks for a price when there isn't one", () => {
    render(<MortgageCalculator />);
    type("price", "0");
    expect(text()).toContain("Enter a home price");
  });
});

describe("Car Loan Calculator", () => {
  it("opens on a $30,000 car, $4,000 down, 7% for 5 years, with no state picked", () => {
    render(<CarLoanCalculator />);
    expect(text()).toContain("Your monthly payment$554");
    expect(text()).toContain("for 5 years");
    expect(text()).toContain("You borrow$27,997");
    expect(text()).toContain("Sales tax4.99% (national average)$1,497");
    expect(text()).toContain("Title, registration & dealer fees$500");
    expect(text()).toContain("Total cost$37,262");
  });

  it("flags the default 5-year term against the 20/4/10 guideline's 4 years", () => {
    render(<CarLoanCalculator />);
    expect(text()).toContain("A term of 5 years is longer than the 20/4/10 guideline's 4 years");
    expect(text()).toContain("Loans past 4 years usually cost more interest overall");
  });

  it("switches loan lengths with the quick-pick buttons", () => {
    render(<CarLoanCalculator />);
    click("6 mo");
    expect(text()).toContain("Your monthly payment$4,762");
    expect(text()).toContain("for 6 months");
    expect(document.getElementById("customTerm")).toBeNull();
    expect(text()).not.toContain("longer than the 20/4/10 guideline");
    click("24 mo");
    expect(text()).toContain("Your monthly payment$1,253");
  });

  it("switches to Custom and remembers the length you were on", () => {
    render(<CarLoanCalculator />);
    click("12 mo");
    click("Custom");
    expect(field("customTerm").value).toBe("12");
    type("customTerm", "45");
    expect(text()).toContain("for 3 years, 9 months");
    expect(text()).not.toContain("longer than the 20/4/10 guideline");
    type("customTerm", "54");
    expect(text()).toContain("for 4 years, 6 months");
    expect(text()).toContain("A term of 4 years, 6 months is longer than the 20/4/10 guideline's 4 years");
  });

  it("compares loan lengths from 6 to 84 months, marking the ones over 4 years", () => {
    render(<CarLoanCalculator />);
    const rows = document.querySelectorAll("section button[aria-pressed]");
    expect(rows).toHaveLength(8);
    expect(rows[3].textContent).toContain("$864");
    expect(rows[3].textContent).not.toContain("over 4 yrs");
    expect(rows[4].textContent).toContain("$670");
    expect(rows[4].textContent).not.toContain("over 4 yrs");
    expect(rows[5].textContent).toContain("$554");
    expect(rows[5].textContent).toContain("over 4 yrs");
    expect(rows[7].textContent).toContain("$423");
    expect(rows[7].textContent).toContain("over 4 yrs");
    fireEvent.click(rows[7]);
    expect(text()).toContain("Your monthly payment$423");
    expect(field("customTerm").value).toBe("84");
    expect(screen.getByRole("button", { name: "Custom" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("warns when you'd owe more than the car is worth", () => {
    render(<CarLoanCalculator />);
    expect(text()).toContain("You'd never owe more than the car is worth");
    type("down", "0");
    expect(text()).toContain("You'd owe more than the car is worth for about");
    expect(text()).toContain("gap coverage");
  });

  it("takes a trade-in off what you borrow, and off the sales tax", () => {
    render(<CarLoanCalculator />);
    type("tradeIn", "10000");
    // tax (national average 4.99%) on $20,000; borrow 30,000 + 998 + 500 - 4,000 - 10,000
    expect(text()).toContain("You borrow$17,498");
  });

  it("checks the 20/4/10 rule", () => {
    render(<CarLoanCalculator />);
    expect(text()).toContain("Doesn't meet it: 20% down (including a trade-in): you have 13.3%");
    expect(text()).toContain("Doesn't meet it: Loan of 4 years or less");
    expect(text()).toContain("Not checked: Total car costs under 10% of your income");
    type("down", "6000");
    fireEvent.click(document.querySelectorAll("section button[aria-pressed]")[4]); // 48 months
    type("income", "120000");
    type("insurance", "120");
    type("upkeep", "100");
    expect(text()).toContain("Meets it: 20% down");
    expect(text()).toContain("Meets it: Loan of 4 years or less");
    expect(text()).toContain("Meets it: Total car costs under 10% of your income");
  });

  it("says when you wouldn't need a loan", () => {
    render(<CarLoanCalculator />);
    type("down", "40000");
    expect(text()).toContain("You wouldn't need a loan");
  });

  it("shows what extra payments save", () => {
    render(<CarLoanCalculator />);
    type("extra", "150");
    expect(text()).toContain("Your $150 extra a month pays it off");
  });

  it("draws what you owe vs. what it's worth", () => {
    render(<CarLoanCalculator />);
    const label = document.querySelector('svg[role="img"]')!.getAttribute("aria-label");
    expect(label).toContain("Loan balance compared with the car's estimated value");
  });

  describe("sales tax by state", () => {
    it("asks for a state, and guesses the rate once you pick one", () => {
      render(<CarLoanCalculator />);
      expect(text()).toContain("Used to guess your sales tax rate");
      pick("state", "IL");
      expect(text()).toContain("Sales tax6.25% (Illinois average)$1,875");
    });

    it("shows the advanced-settings rate and note", () => {
      render(<CarLoanCalculator />);
      expect(field("taxPct").value).toBe("4.99");
      pick("state", "IL");
      expect(field("taxPct").value).toBe("6.25");
      expect(text()).toContain("The average rate for Illinois");
    });

    it("lets you override the guess, and reset it", () => {
      render(<CarLoanCalculator />);
      pick("state", "IL");
      type("taxPct", "2");
      expect(text()).toContain("You changed this.");
      expect(text()).toContain("Sales tax2%$600");
      click("Reset to the guess (6.25%)");
      expect(field("taxPct").value).toBe("6.25");
    });

    it("has no tax in a no-tax state", () => {
      render(<CarLoanCalculator />);
      pick("state", "OR");
      expect(field("taxPct").value).toBe("0");
    });

    it("flags DC's excise tax as a special case", () => {
      render(<CarLoanCalculator />);
      pick("state", "DC");
      expect(text()).toContain("doesn't charge an ordinary sales tax on cars");
      expect(text()).toContain("excise tax based on the vehicle's weight and fuel economy");
      expect(text()).toContain("dmv.dc.gov");
      expect(text()).toContain("We don't have a simple rate for District of Columbia");
    });
  });
});

describe("Opportunity Cost Calculator", () => {
  it("opens on a $5,000 purchase at 25, retiring at 65", () => {
    render(<OpportunityCostCalculator />);
    expect(text()).toContain("Spending $5,000 now could cost you$81,557");
    expect(text()).toContain("about $27,554 in today's dollars");
    expect(text()).toContain("16.3×");
    expect(text()).toContain("$92 a month");
  });

  it("fills in an example", () => {
    render(<OpportunityCostCalculator />);
    click("$5 coffee every workday");
    expect(field("oneTime").value).toBe("0.00");
    expect(field("monthly").value).toBe("105.00");
    expect(field("years").value).toBe("10");
    expect(text()).toContain("Spending $12,600 now");
  });

  it("gives a verdict once you say what it's worth", () => {
    render(<OpportunityCostCalculator />);
    expect(text()).toContain("Add how many years you'll enjoy it");
    type("usefulYears", "5");
    type("valuePerYear", "2000");
    expect(text()).toContain("Worth it, by this measure.");
    expect(text()).toContain("about $1,188 a year of value");
    type("valuePerYear", "500");
    expect(text()).toContain("Probably not, by this measure.");
  });

  it("turns the cost into hours of work", () => {
    render(<OpportunityCostCalculator />);
    type("hourlyWage", "25");
    expect(text()).toContain("200 hours");
    expect(text()).toContain("5.0 full-time weeks");
  });

  it("shows cheaper versions", () => {
    render(<OpportunityCostCalculator />);
    expect(text()).toContain("As planned$5,000$81,557");
    expect(text()).toContain("50% of the cost$2,500$40,779");
  });

  it("costs less at an older age", () => {
    render(<OpportunityCostCalculator />);
    type("currentAge", "45");
    expect(text()).not.toContain("$81,557");
    expect(text()).toContain("over 20 years");
  });

  it("runs a range of outcomes", () => {
    render(<OpportunityCostCalculator />);
    expect(text()).not.toContain("Monte Carlo outcomes");
    fireEvent.click(screen.getByLabelText(/Show a range of outcomes/));
    expect(text()).toContain("Monte Carlo outcomes");
  });

  it("asks for a later retirement age when there's no time left", () => {
    render(<OpportunityCostCalculator />);
    type("retireAge", "20");
    expect(text()).toContain("Set a retirement age older than your current age");
  });

  it("asks for a cost when there isn't one", () => {
    render(<OpportunityCostCalculator />);
    type("oneTime", "0");
    expect(text()).toContain("Enter a cost above");
  });
});

describe("Budget Buckets Calculator", () => {
  it("opens on $4,000 a month split 25 / 25 / 25 / 25", () => {
    render(<BudgetCalculator />);
    expect(field("takeHome").value).toBe("4,000.00");
    expect(text()).toContain("you can spend about$3,000");
    expect(text()).toContain("set aside $1,000");
    expect(text()).toContain("about $692 a week to spend");
    expect(text()).toContain("Adds up to 100%.");
    expect(text()).toContain("Housing and other needs together are $2,000 (50.0% of your pay)");
  });

  it("shows each bucket by month, week, and day", () => {
    render(<BudgetCalculator />);
    for (const label of ["Housing", "Other needs", "Wants", "Savings"]) {
      expect(text()).toContain(label);
    }
    expect(text()).toContain("25.0% · $231 a week · $33 a day");
  });

  it("switches to the classic 50/30/20 split", () => {
    render(<BudgetCalculator />);
    click("50 / 30 / 20");
    expect(field("pct-wants").value).toBe("30");
    expect(field("pct-savings").value).toBe("20");
    expect(text()).toContain("you can spend about$3,200");
    expect(text()).toContain("set aside $800");
    expect(text()).toContain("The classic rule");
  });

  it("lets you make your own split, and warns when it doesn't add up", () => {
    render(<BudgetCalculator />);
    type("pct-savings", "15");
    expect(text()).toContain("Adds up to 90.0%, so $400 a month isn't assigned to a bucket");
    expect(text()).toContain("Your own split");
    type("pct-savings", "35");
    expect(text()).toContain("$400 a month more than you have");
  });

  it("estimates your take-home from your salary", () => {
    render(<BudgetCalculator />);
    click("Estimate from my salary");
    expect(field("yearlyPay").value).toBe("60,000.00");
    expect(text()).toContain("We estimate about $4,199 a month");
    expect(text()).toContain("Of your $4,199 a month");
    pick("state", "PA");
    expect(text()).toContain("Of your $4,");
    expect(text()).not.toContain("Of your $4,199 a month");
  });

  it("tracks what you've spent and what's left", () => {
    render(<BudgetCalculator />);
    fireEvent.click(screen.getByText("Track this month's spending (optional)"));
    type("spent-wants", "450");
    expect(text()).toContain("$450 spent · $550 left");
    expect(text()).toContain("You have $2,550 left to spend across housing, needs, and wants");
    type("spent-needs", "1200");
    expect(text()).toContain("$1,200 spent · $200 over");
    expect(text()).toContain("$1,350 left to spend");
    type("spent-savings", "400");
    expect(text()).toContain("$400 saved · $600 to go");
  });

  it("suggests ways to split each bucket", () => {
    render(<BudgetCalculator />);
    expect(text()).toContain("Groceries$350");
    expect(text()).toContain("Eating out$300");
    expect(text()).toContain("Retirement$400");
  });

  it("asks for pay when there isn't any", () => {
    render(<BudgetCalculator />);
    type("takeHome", "0");
    expect(text()).toContain("Enter your pay to see how much you can spend");
  });
});

describe("Net Worth Calculator", () => {
  it("opens on an example with $53,000 owned and $21,500 owed", () => {
    render(<NetWorthCalculator />);
    expect(text()).toContain("Your net worth$31,500");
    expect(text()).toContain("$53,000 owned minus $21,500 owed");
    expect(text()).toContain("Quick-access money$16,000");
    expect(text()).toContain("40.6%");
  });

  it("updates as you change amounts", () => {
    render(<NetWorthCalculator />);
    fireEvent.change(screen.getByLabelText("Amount for Checking account"), { target: { value: "10000" } });
    expect(text()).toContain("Your net worth$38,500");
  });

  it("goes negative, with a reassuring note", () => {
    render(<NetWorthCalculator />);
    fireEvent.change(screen.getByLabelText("Amount for Student loans"), { target: { value: "100000" } });
    expect(text()).toContain("Your net worth−$48,500");
    expect(text()).toContain("A negative net worth is common");
  });

  it("adds and removes items", () => {
    render(<NetWorthCalculator />);
    fireEvent.click(screen.getAllByRole("button", { name: "+ Add an asset here" })[0]);
    const names = screen.getAllByLabelText(/Name of this asset in Cash & bank accounts/);
    expect(names).toHaveLength(3);
    fireEvent.change(names[2], { target: { value: "Cash under the mattress" } });
    fireEvent.change(screen.getByLabelText("Amount for Cash under the mattress"), { target: { value: "500" } });
    expect(text()).toContain("Your net worth$32,000");
    fireEvent.click(screen.getByRole("button", { name: "Remove Cash under the mattress" }));
    expect(text()).toContain("Your net worth$31,500");
    fireEvent.click(screen.getByRole("button", { name: "Remove Car" }));
    expect(text()).toContain("Your net worth$19,500");
  });

  it("compares you to people your age", () => {
    render(<NetWorthCalculator />);
    expect(text()).not.toContain("median net worth");
    type("age", "30");
    expect(text()).toContain("People under 35 have a median net worth of about $39,000");
    expect(text()).toContain("You're about $7,500 below that");
    type("age", "40");
    expect(text()).toContain("People 35 to 44 have a median net worth of about $135,000");
  });

  it("clears the example to start fresh", () => {
    render(<NetWorthCalculator />);
    click("Clear it out and start with my own numbers");
    expect(text()).toContain("Add what you own and what you owe");
    expect(text()).not.toContain("Your net worth");
    fireEvent.change(screen.getByLabelText("Amount for Savings account"), { target: { value: "1200" } });
    expect(text()).toContain("Your net worth$1,200");
  });

  describe("downloads", () => {
    function capture() {
      const blobs: Blob[] = [];
      const names: string[] = [];
      URL.createObjectURL = (b: Blob | MediaSource) => {
        blobs.push(b as Blob);
        return "blob:test";
      };
      URL.revokeObjectURL = () => {};
      const realClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        names.push(this.download);
      };
      return { blobs, names, restore: () => (HTMLAnchorElement.prototype.click = realClick) };
    }

    it("downloads a spreadsheet with live totals", async () => {
      const cap = capture();
      render(<NetWorthCalculator />);
      click("Download spreadsheet (.xlsx)");
      cap.restore();
      expect(cap.names[0]).toMatch(/^net-worth-\d{4}-\d{2}-\d{2}\.xlsx$/);
      expect(cap.blobs[0].type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      const files = unzip(new Uint8Array(await cap.blobs[0].arrayBuffer()));
      const sheet = files["xl/worksheets/sheet1.xml"];
      expect(sheet).toContain("Checking account");
      expect(sheet).toContain("<f>SUM(C5:C9)</f><v>53000</v>");
      expect(sheet).toContain("<v>31500</v>");
    });

    it("downloads a CSV", async () => {
      const cap = capture();
      render(<NetWorthCalculator />);
      click("Download CSV");
      cap.restore();
      expect(cap.names[0]).toMatch(/\.csv$/);
      const csv = await cap.blobs[0].text();
      expect(csv).toContain("Asset,Cash & bank accounts,Checking account,3000");
      expect(csv).toContain(",,Net worth,31500");
    });

    it("exports what you've edited", async () => {
      const cap = capture();
      render(<NetWorthCalculator />);
      fireEvent.change(screen.getByLabelText("Amount for Checking account"), { target: { value: "10000" } });
      click("Download CSV");
      cap.restore();
      expect(await cap.blobs[0].text()).toContain(",,Net worth,38500");
    });
  });
});

describe("Calculators page: sections and table of contents", () => {
  it("has a heading and a group of tools for each section", () => {
    render(<Calculators />);
    for (const section of CALCULATOR_SECTIONS) {
      const el = document.getElementById(section.id)!;
      expect(el, section.id).not.toBeNull();
      expect(el.querySelector("h2")!.textContent).toBe(section.title);
      for (const tool of section.tools) {
        expect(el.querySelector(`a[href="${tool.href}"]`), tool.href).not.toBeNull();
      }
    }
  });

  it("puts debt and purchase tools where you'd look for them", () => {
    render(<Calculators />);
    const debt = document.getElementById("paying-off-debt")!;
    expect(debt.textContent).toContain("Debt Payoff");
    expect(debt.textContent).toContain("Student Loans");
    const purchase = document.getElementById("big-purchase")!;
    expect(purchase.querySelector("h2")!.textContent).toBe("Thinking about making a purchase?");
    for (const name of ["Car Loan", "Mortgage", "Opportunity Cost"]) {
      expect(purchase.textContent).toContain(name);
    }
  });

  it("has a table of contents that links to every section", () => {
    render(<Calculators />);
    const nav = screen.getByRole("navigation", { name: "Calculator categories" });
    const links = [...nav.querySelectorAll("a")];
    expect(links.map((a) => a.getAttribute("href"))).toEqual(CALCULATOR_SECTIONS.map((s) => `#${s.id}`));
    expect(links.map((a) => a.textContent)).toEqual(CALCULATOR_SECTIONS.map((s) => s.label));
    for (const a of links) {
      expect(document.getElementById(a.getAttribute("href")!.slice(1))).not.toBeNull();
    }
  });

  it("lists all thirteen tools once", () => {
    render(<Calculators />);
    expect(document.querySelectorAll('a[href^="/calculators/"]')).toHaveLength(13);
  });

  describe("highlighting the section you're reading", () => {
    type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
    let callback: Callback | null = null;
    const RealObserver = globalThis.IntersectionObserver;

    function mockObserver() {
      globalThis.IntersectionObserver = class {
        constructor(cb: Callback) {
          callback = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      } as unknown as typeof IntersectionObserver;
    }
    afterEach(() => {
      globalThis.IntersectionObserver = RealObserver;
      callback = null;
    });

    const sections = [
      { id: "a", label: "First" },
      { id: "b", label: "Second" },
    ];
    const withSections = () => {
      for (const s of sections) {
        const el = document.createElement("section");
        el.id = s.id;
        document.body.appendChild(el);
      }
    };

    it("marks the section that scrolls into view, and moves as you scroll", async () => {
      mockObserver();
      withSections();
      render(<CalculatorsToc sections={sections} />);
      const link = (label: string) => screen.getByRole("link", { name: label });
      expect(link("First").getAttribute("aria-current")).toBeNull();

      const { act } = await import("@testing-library/react");
      act(() => callback!([{ target: document.getElementById("a")!, isIntersecting: true }]));
      expect(link("First").getAttribute("aria-current")).toBe("true");
      expect(link("Second").getAttribute("aria-current")).toBeNull();

      act(() =>
        callback!([
          { target: document.getElementById("a")!, isIntersecting: false },
          { target: document.getElementById("b")!, isIntersecting: true },
        ]),
      );
      expect(link("Second").getAttribute("aria-current")).toBe("true");
      expect(link("First").getAttribute("aria-current")).toBeNull();
      document.body.querySelectorAll("section").forEach((el) => el.remove());
    });

    it("marks the last section once you reach the bottom of the page", async () => {
      mockObserver();
      withSections();
      render(<CalculatorsToc sections={sections} />);
      const { act } = await import("@testing-library/react");
      act(() => callback!([{ target: document.getElementById("a")!, isIntersecting: true }]));
      expect(screen.getByRole("link", { name: "First" }).getAttribute("aria-current")).toBe("true");

      // A 3,000px-tall page, scrolled to the end of a 768px window.
      Object.defineProperty(document.documentElement, "scrollHeight", { value: 3_000, configurable: true });
      Object.defineProperty(window, "scrollY", { value: 3_000 - window.innerHeight, configurable: true });
      act(() => {
        window.dispatchEvent(new Event("scroll"));
      });
      expect(screen.getByRole("link", { name: "Second" }).getAttribute("aria-current")).toBe("true");
      expect(screen.getByRole("link", { name: "First" }).getAttribute("aria-current")).toBeNull();

      // Scroll back up: the section in view takes over again.
      Object.defineProperty(window, "scrollY", { value: 200, configurable: true });
      act(() => {
        window.dispatchEvent(new Event("scroll"));
      });
      expect(screen.getByRole("link", { name: "First" }).getAttribute("aria-current")).toBe("true");

      Object.defineProperty(document.documentElement, "scrollHeight", { value: 0, configurable: true });
      Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
      document.body.querySelectorAll("section").forEach((el) => el.remove());
    });

    it("marks a link you click", () => {
      mockObserver();
      render(<CalculatorsToc sections={sections} />);
      fireEvent.click(screen.getByRole("link", { name: "Second" }));
      expect(screen.getByRole("link", { name: "Second" }).getAttribute("aria-current")).toBe("true");
    });

    it("still works without IntersectionObserver", () => {
      // @ts-expect-error removing it to simulate an old browser
      delete globalThis.IntersectionObserver;
      render(<CalculatorsToc sections={sections} />);
      expect(screen.getAllByRole("link")).toHaveLength(2);
    });
  });
});

describe("disclaimers", () => {
  it("shows one on the calculators, blog, and learning sections, linking to the full text", () => {
    for (const Layout of [CalculatorsLayout, BlogLayout, LearningLayout]) {
      const { unmount } = render(
        <Layout>
          <p>page content</p>
        </Layout>,
      );
      expect(text()).toContain("page content");
      const note = screen.getByRole("complementary", { name: "Disclaimer" });
      expect(note.textContent).toContain("financial, tax, legal, or investment advice");
      expect(note.textContent).toContain("not a financial advisor, tax preparer, accountant, attorney, or broker");
      expect(note.querySelector('a[href="/disclaimer"]')).not.toBeNull();
      unmount();
    }
  });

  it("says the tools are illustrative", () => {
    render(<CalculatorsLayout>{null}</CalculatorsLayout>);
    expect(text()).toContain("These tools are illustrative, not advice");
    expect(text()).toContain("your real numbers will differ");
  });

  it("puts a notice and legal links in the footer of every page", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: "Disclaimer & Terms" }).getAttribute("href")).toBe("/disclaimer");
    expect(screen.getByRole("link", { name: "Privacy" }).getAttribute("href")).toBe("/privacy");
    expect(text()).toContain("not financial, tax, legal, or investment advice");
  });

  it("has a full Disclaimer & Terms page", () => {
    render(<Disclaimer />);
    expect(text()).toContain("Disclaimer & Terms of Use");
    expect(text()).toMatch(/Last updated [A-Z][a-z]+ \d{1,2}, \d{4}/);
    for (const phrase of [
      "For education and information only",
      "No professional relationship",
      "Calculators give estimates",
      "Projections and investing",
      "Investing involves risk",
      "past performance does not predict future results",
      "Accuracy and updates",
      "Your decisions are your responsibility",
      "No warranties",
      "Limitation of liability",
      "Other websites and sources",
    ]) {
      expect(text(), phrase).toContain(phrase);
    }
    expect(screen.getByRole("link", { name: "Privacy page" }).getAttribute("href")).toBe("/privacy");
  });

  it("has a Privacy page that says what's collected", () => {
    render(<Privacy />);
    expect(text()).toContain("stay in your browser");
    expect(text()).toContain("We don't currently use advertising cookies or third-party analytics");
    expect(text()).toContain("under 13");
    expect(screen.getByRole("link", { name: "Disclaimer & Terms" }).getAttribute("href")).toBe("/disclaimer");
  });
});
