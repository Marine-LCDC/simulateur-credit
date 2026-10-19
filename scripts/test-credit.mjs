import test from "node:test";
import assert from "node:assert/strict";
import { calculate, initialValues, summarize, amortize } from "../src/lib/credit-simulator/calculations.ts";
import { parseNumber, validateInsurance } from "../src/lib/credit-simulator/validation.ts";
import { createCreditPdf } from "../src/lib/credit-simulator/pdf.ts";

const close = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
test("monthly payment and inverse calculations preserve precision", () => {
  // Independently checked with 50-digit decimal arithmetic.
  close(initialValues.monthly, 1159.9194359661867, 1e-8);
  for (const target of ["capital", "duration", "rate", "monthly"]) {
    close(calculate(target, { ...initialValues, [target]: NaN })[target], initialValues[target]);
  }
});
test("zero rate works for all four unknowns", () => {
  const loan = { capital: 120000, duration: 10, rate: 0, monthly: 1000 };
  for (const target of Object.keys(loan)) close(calculate(target, { ...loan, [target]: NaN })[target], loan[target]);
  close(summarize(loan, 0).totalCost, 0);
});
test("insurance and total cost use initial capital without display rounding", () => {
  const summary = summarize(initialValues, .33);
  close(summary.monthlyInsurance, 55);
  close(summary.totalInsurance, 13200);
  close(summary.totalInterest, initialValues.monthly * 240 - 200000);
  close(summary.totalCost, summary.totalInterest + 13200);
  close(summary.totalMonthly, initialValues.monthly + 55);
});
test("first and final installments, principal and interest totals", () => {
  const rows = amortize(initialValues, .33);
  assert.equal(rows.length, 240);
  close(rows[0].interest, 200000 * .035 / 12);
  close(rows[0].principal, initialValues.monthly - rows[0].interest);
  close(rows[0].insurance, 55);
  assert.equal(rows.at(-1).balance, 0);
  close(rows.reduce((sum, row) => sum + row.principal, 0), 200000);
  close(rows.reduce((sum, row) => sum + row.interest, 0), summarize(initialValues, .33).totalInterest);
  close(rows.at(-1).payment, initialValues.monthly + 55);
});
test("fractional durations have a prorated final installment consistent with summary", () => {
  const loan = calculate("duration", { ...initialValues, monthly: 1500 });
  const rows = amortize(loan, .33);
  assert.equal(rows.length, Math.ceil(loan.duration * 12));
  assert.equal(rows.at(-1).balance, 0);
  close(rows.reduce((sum, row) => sum + row.payment, 0), loan.capital + summarize(loan, .33).totalCost);
  close(rows.reduce((sum, row) => sum + row.insurance, 0), summarize(loan, .33).totalInsurance);
});
test("round trips, tiny rates and supported extremes remain finite", () => {
  for (const duration of [.01, 1, 20, 100]) for (const rate of [0, 1e-9, .5, 3.5, 50, 100]) {
    const loan = calculate("monthly", { capital: 200000, duration, rate, monthly: 0 });
    close(calculate("capital", loan).capital, loan.capital);
    close(calculate("rate", loan).rate, rate, 1e-6);
    const rows = amortize(loan, .33);
    assert.ok(rows.every(row => Object.values(row).every(value => Number.isFinite(value) && value >= 0)));
    close(rows.reduce((sum, row) => sum + row.principal, 0), loan.capital, 1e-6);
    close(rows.reduce((sum, row) => sum + row.payment, 0), loan.capital + summarize(loan, .33).totalCost, .001);
  }
});
test("invalid and impossible inputs have explanatory errors", () => {
  for (const capital of [0, -1, Infinity, NaN, 1e13]) assert.throws(() => calculate("monthly", { ...initialValues, capital }));
  for (const duration of [0, -1, 101]) assert.throws(() => calculate("monthly", { ...initialValues, duration }));
  assert.throws(() => calculate("monthly", { ...initialValues, rate: -1 }));
  assert.throws(() => calculate("duration", { ...initialValues, monthly: 100 }), /intérêts/);
  assert.throws(() => calculate("rate", { ...initialValues, monthly: 100 }), /0 %/);
  assert.throws(() => calculate("rate", { ...initialValues, monthly: 1e6 }), /100 %/);
  assert.throws(() => summarize({ ...initialValues, monthly: 42 }, .33), /cohérentes/);
  for (const value of [-1, NaN, Infinity, 101]) assert.throws(() => validateInsurance(value));
});
test("French decimal and space input; reject empty, partial and nonnumeric strings", () => {
  close(parseNumber("200 000,25"), 200000.25);
  close(parseNumber("3,50"), 3.5);
  for (const input of ["", " ", "abc", "12abc", "1,2,3", "Infinity"]) assert.throws(() => parseNumber(input));
});
test("PDF contains Titayla summary, all installments and multipage structure", () => {
  const doc = createCreditPdf(initialValues, .33, new Date("2026-09-24T12:00:00Z"));
  assert.ok(doc.getNumberOfPages() > 2);
  const source = doc.output();
  assert.match(source, /Titayla/);
  assert.match(source, /24\/09\/2026/);
  assert.match(source, /240/);
  assert.doesNotMatch(source, /Les Clés|cloudfront|NaN|Infinity/);
});
