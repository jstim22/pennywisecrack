import type { ComponentType } from "react";
import {
  BonusIcon,
  BudgetIcon,
  CarIcon,
  CompoundInterestIcon,
  DebtPayoffIcon,
  MortgageIcon,
  NetWorthIcon,
  OpportunityCostIcon,
  PaycheckIcon,
  RetirementIcon,
  SinkingFundIcon,
  StudentLoanIcon,
  TaxIcon,
} from "@/components/calculators/CalculatorIcons";

export type CalculatorTool = {
  // The calculator's page, e.g. "/calculators/mortgage".
  href: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

export type CalculatorSection = {
  // Used in the page's #anchor links.
  id: string;
  // Short name for the table of contents.
  label: string;
  // The section's heading.
  title: string;
  blurb: string;
  tools: CalculatorTool[];
};

// Every calculator lives in exactly one section. To add a calculator, add its
// page under src/app/calculators and list it here; a test checks they match.
export const CALCULATOR_SECTIONS: CalculatorSection[] = [
  {
    id: "money-basics",
    label: "Money basics",
    title: "Getting a handle on your money",
    blurb: "Decide where your pay goes each month, and see where you stand today.",
    tools: [
      {
        href: "/calculators/budget",
        title: "Budget Buckets",
        description: "Find out how much you can spend each month by splitting your pay into buckets.",
        icon: BudgetIcon,
      },
      {
        href: "/calculators/net-worth",
        title: "Net Worth",
        description: "Add up what you own and owe, then download it as a spreadsheet.",
        icon: NetWorthIcon,
      },
    ],
  },
  {
    id: "paychecks-taxes",
    label: "Paychecks & taxes",
    title: "What will I actually take home?",
    blurb: "See what's left after taxes, whether it's a paycheck, a bonus, or freelance income.",
    tools: [
      {
        href: "/calculators/paycheck",
        title: "Paycheck Estimator",
        description: "Get a rough idea of what a paycheck actually pays you after taxes.",
        icon: PaycheckIcon,
      },
      {
        href: "/calculators/bonus",
        title: "Bonus Estimator",
        description: "See what a one-time bonus really pays after taxes.",
        icon: BonusIcon,
      },
      {
        href: "/calculators/income-tax",
        title: "Income Tax",
        description: "See how much you might pay in taxes, W-2 or 1099, and how your rate changes as you earn more.",
        icon: TaxIcon,
      },
    ],
  },
  {
    id: "saving-growing",
    label: "Saving & growing",
    title: "Saving and growing your money",
    blurb: "Save up for something, watch your money compound, and plan for retirement.",
    tools: [
      {
        href: "/calculators/sinking-fund",
        title: "Sinking Fund",
        description: "See how long it'll take to save up for something you want.",
        icon: SinkingFundIcon,
      },
      {
        href: "/calculators/compound-interest",
        title: "Compound Interest",
        description: "Watch how a little savings can grow into a lot over time.",
        icon: CompoundInterestIcon,
      },
      {
        href: "/calculators/retirement",
        title: "Retirement",
        description: "See what starting early could be worth by the time you retire.",
        icon: RetirementIcon,
      },
    ],
  },
  {
    id: "big-purchase",
    label: "Making a purchase",
    title: "Thinking about making a purchase?",
    blurb: "Before you buy a car, a home, or anything big, see what it really costs, now and later.",
    tools: [
      {
        href: "/calculators/car-loan",
        title: "Car Loan",
        description: "See what a car really costs with tax, interest, and a down payment.",
        icon: CarIcon,
      },
      {
        href: "/calculators/mortgage",
        title: "Mortgage",
        description: "See a home's real monthly cost, with PMI, property tax, and insurance.",
        icon: MortgageIcon,
      },
      {
        href: "/calculators/opportunity-cost",
        title: "Opportunity Cost",
        description: "See what a decision today could cost you at retirement, and if it's worth it.",
        icon: OpportunityCostIcon,
      },
    ],
  },
  {
    id: "paying-off-debt",
    label: "Paying off debt",
    title: "Paying off debt",
    blurb: "Make a plan to get out of debt faster, including student loans.",
    tools: [
      {
        href: "/calculators/debt-payoff",
        title: "Debt Payoff",
        description: "Compare the snowball and avalanche methods, and see how fast you could be debt-free.",
        icon: DebtPayoffIcon,
      },
      {
        href: "/calculators/student-loans",
        title: "Student Loans",
        description: "See what your loans will cost and compare repayment plans, including the new income-based one.",
        icon: StudentLoanIcon,
      },
    ],
  },
];

export const ALL_CALCULATORS = CALCULATOR_SECTIONS.flatMap((s) => s.tools);
