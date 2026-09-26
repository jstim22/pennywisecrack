import { describe } from "vitest";
import { check, checkStr } from "../helpers";
import { estimateSinkingFund, equivalentContributions, describeDuration, type SinkingFundInputs } from "@/lib/sinkingFund";

const base: SinkingFundInputs = { goal: 1200, saved: 0, contribution: 100, frequency: "monthly", apyPct: null };
const est = (o: Partial<SinkingFundInputs>) => estimateSinkingFund({ ...base, ...o });

const a = est({});
const w = est({ goal: 520, contribution: 10, frequency: "weekly" });
const y = est({ frequency: "yearly", contribution: 1200 });
const d = est({ goal: 365, contribution: 1, frequency: "daily" });
const m = (1.04) ** (1 / 12) - 1;
const fv12 = 100 * ((1 + m) ** 12 - 1) / m;
const h = est({ apyPct: 4 });
const bigger = est({ goal: 5000, apyPct: 4 });
const bigger0 = est({ goal: 5000 });
const one = est({ saved: 1000, contribution: 0.0001, goal: 1040, apyPct: 4 });
const eq = Object.fromEntries(equivalentContributions(10, "weekly").map(e => [e.value, e.amount]));
const eq2 = Object.fromEntries(equivalentContributions(100, "yearly").map(e => [e.value, e.amount]));
const never = est({ goal: 1e9, contribution: 1 });
const junk = est({ goal: NaN, saved: -5, contribution: NaN, apyPct: NaN });

describe("no interest", () => {
  check("12 monthly deposits", a.deposits, 12);
  check("takes a year", a.days!, 365);
  check("contributed", a.contributed, 1200);
  check("no interest", a.interest, 0);
  check("52 weekly deposits", w.deposits, 52);
  check("weekly for 52 weeks = 1 year", w.days!, 365);
  check("yearly single deposit", y.deposits, 1);
  check("yearly = 365 days", y.days!, 365);
  check("daily 365 deposits", d.deposits, 365);
  check("daily takes 365 days", d.days!, 365);
  check("semimonthly 24/yr", est({ goal: 2400, contribution: 100, frequency: "semimonthly" }).days!, 365);
  check("biweekly 26/yr", est({ goal: 2600, contribution: 100, frequency: "biweekly" }).days!, 365);
  check("already saved some", est({ saved: 200 }).deposits, 10);
  check("partial last deposit rounds up", est({ goal: 250, contribution: 100 }).deposits, 3);
});

describe("high-yield savings, 4% APY, monthly compounding", () => {
  check("still 12 deposits", h.deposits, 12);
  check("interest earned = annuity FV - contributions", h.interest, fv12 - 1200, 0.01);
  check("goal hit on 12th deposit", h.days!, 365);
  check("interest gets there sooner (fewer deposits)", bigger.deposits < bigger0.deposits ? 1 : 0, 1);
  check("daysSaved = difference", bigger.daysSaved, bigger0.days! - bigger.days!);
  check("no daysSaved without interest", bigger0.daysSaved, 0);
  check("$1000 at 4% APY becomes ~$1040 in a year", one.days!, 365, 1);
  check("balance compounding: APY not nominal", est({ saved: 1000, contribution: 0.0001, goal: 1040.5, apyPct: 4 }).days! > 365 ? 1 : 0, 1);
  check("0% APY behaves like no interest", est({ apyPct: 0 }).interest, 0);
});

describe("equivalents", () => {
  check("$10/week yearly", eq.yearly, 520);
  check("$10/week monthly", eq.monthly, 520 / 12);
  check("$10/week biweekly", eq.biweekly, 20);
  check("$10/week semimonthly", eq.semimonthly, 520 / 24);
  check("$10/week daily", eq.daily, 520 / 365);
  check("selected stays exact", eq.weekly, 10);
  check("$100/yr monthly", eq2.monthly, 100 / 12);
});

describe("states & guards", () => {
  check("reached", est({ saved: 1200 }).reached ? 1 : 0, 1);
  check("no goal", est({ goal: 0 }).hasGoal ? 1 : 0, 0);
  check("no goal: no days", est({ goal: 0 }).days === null ? 1 : 0, 1);
  check("no contribution: can't save", est({ contribution: 0 }).canSave ? 1 : 0, 0);
  check("never flagged", never.neverReached ? 1 : 0, 1);
  check("interest can't save you at $0", est({ contribution: 0, saved: 100, apyPct: 4 }).days === null ? 1 : 0, 1);
  check("garbage stays finite", Number.isFinite(junk.progressPct) ? 1 : 0, 1);
  check("progress", est({ saved: 300 }).progressPct, 25);
});

describe("duration text", () => {
  checkStr("1 day", describeDuration(1), "1 day");
  checkStr("9 days", describeDuration(9), "9 days");
  checkStr("3 weeks", describeDuration(21), "3 weeks");
  checkStr("8 weeks", describeDuration(56), "8 weeks");
  checkStr("3 months", describeDuration(91), "3 months");
  checkStr("12 months", describeDuration(365), "12 months");
  checkStr("2 years", describeDuration(730), "2 years");
  checkStr("2 years, 3 months", describeDuration(365 * 2 + 91), "2 years, 3 months");
  checkStr("1 year is 12 months", describeDuration(365.0), "12 months");
});
