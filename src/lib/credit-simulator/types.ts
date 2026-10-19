export const creditKeys = ["capital", "duration", "rate", "monthly"] as const;
export type CreditKey = (typeof creditKeys)[number];
export type CreditValues = Record<CreditKey, number>;
export type CreditInputs = Record<CreditKey, string>;
export interface CreditSummary {
  monthlyInsurance: number;
  totalMonthly: number;
  totalInterest: number;
  totalInsurance: number;
  totalCost: number;
}
export interface AmortizationRow {
  month: number;
  principal: number;
  interest: number;
  insurance: number;
  payment: number;
  balance: number;
}
