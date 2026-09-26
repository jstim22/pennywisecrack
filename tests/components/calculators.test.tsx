import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import BonusCalculator from "@/components/calculators/BonusCalculator";
import CompoundInterestCalculator from "@/components/calculators/CompoundInterestCalculator";
import PaycheckCalculator from "@/components/calculators/PaycheckCalculator";
import RetirementCalculator from "@/components/calculators/RetirementCalculator";
import SinkingFundCalculator from "@/components/calculators/SinkingFundCalculator";

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
