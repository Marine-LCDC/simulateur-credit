import type { CreditKey } from "./types.ts";

export const labels: Record<CreditKey, string> = {
  capital: "Montant emprunté",
  duration: "Durée",
  rate: "Taux d’intérêt",
  monthly: "Mensualité hors assurance",
};
// Explicit numerical safeguards; these are not lending eligibility rules.
const limits: Record<CreditKey, number> = { capital: 1e12, monthly: 1e12, duration: 100, rate: 100 };
export function validateValue(key: CreditKey, value: number): number {
  if (!Number.isFinite(value) || (key === "rate" ? value < 0 : value <= 0)) {
    throw new Error(`${labels[key]} : saisissez un nombre ${key === "rate" ? "positif ou nul" : "strictement positif"}.`);
  }
  if (value > limits[key]) {
    throw new Error(`${labels[key]} : la limite du simulateur est ${limits[key].toLocaleString("fr-FR")}${key === "duration" ? " ans" : key === "rate" ? " %" : " €"}.`);
  }
  return value;
}
export function parseNumber(input: string): number {
  const normalized = input.trim().replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
    throw new Error("Saisissez une valeur numérique dans chaque champ nécessaire au calcul.");
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) throw new Error("Cette valeur est trop grande.");
  return value;
}
export function validateInsurance(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("Le taux d’assurance doit être compris entre 0 et 100 %.");
  }
  return value;
}
