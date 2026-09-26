// Fixed-rate loans paid off month by month: mortgages, car loans, and the
// like. Interest is charged monthly at the yearly rate / 12.

// The fixed monthly payment that pays a loan off in `months`.
export function amortizedPayment(balance: number, ratePct: number, months: number) {
  if (balance <= 0 || months <= 0) return 0;
  const r = ratePct / 1200;
  if (r === 0) return balance / months;
  return (balance * r) / (1 - Math.pow(1 + r, -months));
}

export type AmortizationRow = {
  month: number;
  interest: number;
  principal: number;
  // Balance after this month's payment.
  balance: number;
};

export type YearRow = {
  year: number;
  interest: number;
  principal: number;
  balance: number;
};

const PENNY = 0.005;

export function amortize({
  principal,
  ratePct,
  months,
  extraMonthly = 0,
}: {
  principal: number;
  ratePct: number;
  months: number;
  extraMonthly?: number;
}) {
  const payment = amortizedPayment(principal, ratePct, months);
  const rate = ratePct / 1200;
  const rows: AmortizationRow[] = [];
  const balanceByMonth = [Math.max(principal, 0)];
  let balance = Math.max(principal, 0);
  let totalInterest = 0;
  let totalPaid = 0;

  for (let m = 1; balance > PENNY && m <= Math.max(months, 1) * 2 + 12; m++) {
    const interest = balance * rate;
    const pay = Math.min(payment + Math.max(extraMonthly, 0), balance + interest);
    const principalPaid = pay - interest;
    balance = balance - principalPaid;
    if (balance <= PENNY) balance = 0;
    totalInterest += interest;
    totalPaid += pay;
    rows.push({ month: m, interest, principal: principalPaid, balance });
    balanceByMonth.push(balance);
  }

  const years: YearRow[] = [];
  rows.forEach((r) => {
    const y = Math.ceil(r.month / 12);
    let row = years[y - 1];
    if (!row) {
      row = { year: y, interest: 0, principal: 0, balance: 0 };
      years[y - 1] = row;
    }
    row.interest += r.interest;
    row.principal += r.principal;
    row.balance = r.balance;
  });

  return {
    payment,
    rows,
    years,
    balanceByMonth,
    months: rows.length,
    totalInterest,
    totalPaid,
  };
}
