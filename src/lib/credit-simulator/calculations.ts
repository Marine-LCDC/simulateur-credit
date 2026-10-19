import { creditKeys, type CreditKey, type CreditValues, type CreditSummary, type AmortizationRow } from "./types.ts";
import { validateValue, validateInsurance } from "./validation.ts";

// log1p/expm1 avoid cancellation for very small rates and overflow for long loans.
function annuityFactor(rate: number, months: number): number {
  return rate === 0 ? months : -Math.expm1(-months * Math.log1p(rate)) / rate;
}
export function calculate(target: CreditKey, values: CreditValues): CreditValues {
  for (const key of creditKeys) if (key !== target) validateValue(key, values[key]);
  const { capital: p, duration, rate, monthly: m } = values;
  const n = duration * 12;
  const r = rate / 1200;
  let result: number;
  switch (target) {
    case "monthly": result = p / annuityFactor(r, n); break;
    case "capital": result = m * annuityFactor(r, n); break;
    case "duration":
      if (r > 0 && m <= p * r) throw new Error("La mensualité doit dépasser les intérêts mensuels pour rembourser le capital.");
      result = (r === 0 ? p / m : -Math.log1p(-p * r / m) / Math.log1p(r)) / 12;
      break;
    case "rate": {
      const minimum = p / n;
      if (m < minimum - minimum * 1e-12) throw new Error("Cette mensualité ne rembourse pas le capital sur cette durée, même à 0 %.");
      if (Math.abs(m - minimum) <= minimum * 1e-12) { result = 0; break; }
      let low = 0;
      let high = 100;
      if (m > p / annuityFactor(high / 1200, n)) throw new Error("Aucun taux compris entre 0 et 100 % ne correspond à ces valeurs.");
      for (let i = 0; i < 100; i++) {
        const mid = (low + high) / 2;
        if (p / annuityFactor(mid / 1200, n) < m) low = mid;
        else high = mid;
      }
      result = (low + high) / 2;
      break;
    }
  }
  validateValue(target, result);
  return { ...values, [target]: result };
}
function validateLoan(values: CreditValues) {
  for (const key of creditKeys) validateValue(key, values[key]);
  const expected = values.capital / annuityFactor(values.rate / 1200, values.duration * 12);
  if (Math.abs(expected - values.monthly) > Math.max(1e-7, expected * 1e-10)) {
    throw new Error("Ces valeurs ne sont pas cohérentes. Choisissez une variable à recalculer.");
  }
}
export function summarize(values: CreditValues, insuranceRate: number): CreditSummary {
  validateLoan(values);
  validateInsurance(insuranceRate);
  const monthlyInsurance = values.capital * insuranceRate / 1200;
  const totalInsurance = monthlyInsurance * values.duration * 12;
  const totalInterest = Math.max(0, values.monthly * values.duration * 12 - values.capital);
  return { monthlyInsurance, totalMonthly: values.monthly + monthlyInsurance, totalInterest, totalInsurance, totalCost: totalInterest + totalInsurance };
}
export function amortize(values: CreditValues, insuranceRate: number): AmortizationRow[] {
  const summary = summarize(values, insuranceRate);
  let balance = values.capital;
  const months = values.duration * 12;
  // Preserve fractional terms. The final payment and insurance are prorated;
  // its interest is the remainder so the schedule matches M*n-P exactly.
  const roundedMonths = Math.round(months);
  const count = roundedMonths > 0 && Math.abs(months - roundedMonths) < 1e-9 ? roundedMonths : Math.ceil(months);
  const rows: AmortizationRow[] = [];
  for (let month = 1; month <= count; month++) {
    const last = month === count;
    const fraction = last ? months - month + 1 : 1;
    const installment = values.monthly * fraction;
    // Prospective balances avoid cumulative cancellation over long/high-rate loans.
    const nextBalance = last ? 0 : values.monthly * annuityFactor(values.rate / 1200, months - month);
    const principal = Math.max(0, balance - nextBalance);
    const interest = Math.max(0, installment - principal);
    balance = nextBalance;
    const insurance = summary.monthlyInsurance * fraction;
    rows.push({ month, principal, interest, insurance, payment: principal + interest + insurance, balance });
  }
  return rows;
}
export const initialValues: CreditValues = calculate("monthly", { capital: 200000, duration: 20, rate: 3.5, monthly: 0 });
