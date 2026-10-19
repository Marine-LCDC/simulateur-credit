import type { CreditValues, CreditSummary as Summary } from "@/lib/credit-simulator/types";
import { decimal, durationLabel, money } from "@/lib/credit-simulator/format";

export function CreditSummary({ values, summary, pending }: { values: CreditValues; summary: Summary; pending: boolean }) {
  const items = [
    ["Capital emprunté", money(values.capital)], ["Durée", durationLabel(values.duration)],
    ["Taux d’intérêt", `${decimal(values.rate)} %`], ["Mensualité hors assurance", money(values.monthly)],
    ["Assurance mensuelle", money(summary.monthlyInsurance)], ["Total des intérêts", money(summary.totalInterest)],
    ["Total des assurances", money(summary.totalInsurance)], ["Coût total du crédit", money(summary.totalCost)],
  ];
  return <section className="credit-summary" aria-labelledby="credit-summary-title" aria-live="polite" aria-atomic="true">
    <div className="credit-summary-header"><p className="eyebrow">Votre financement en un regard</p><h2 id="credit-summary-title">Synthèse du projet</h2>
      {pending && <p className="credit-pending">Dernier calcul validé — choisissez une variable à recalculer pour actualiser ces résultats.</p>}
      <p>Mensualité assurance comprise</p><p className="credit-total">{money(summary.totalMonthly)} <span>/ mois</span></p>
    </div>
    <dl className="credit-summary-grid">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p className="credit-summary-note">Coût total = intérêts + assurances. Aucun autre frais n’est inclus.</p>
  </section>;
}
