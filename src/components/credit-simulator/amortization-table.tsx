import { useMemo } from "react";
import { amortize } from "@/lib/credit-simulator/calculations";
import type { CreditValues } from "@/lib/credit-simulator/types";
import { money } from "@/lib/credit-simulator/format";

export function AmortizationTable({ values, insuranceRate }: { values: CreditValues; insuranceRate: number }) {
  const rows = useMemo(() => amortize(values, insuranceRate), [values, insuranceRate]);
  return <section className="credit-amortization" id="credit-amortization" aria-labelledby="amortization-title">
    <h2 id="amortization-title">Tableau d’amortissement</h2>
    <p className="muted" id="amortization-help">{rows.length} échéances. Sur petit écran, faites défiler le tableau horizontalement. Si la durée comprend une fraction de mois, la dernière échéance et son assurance sont proratisées.</p>
    <div className="credit-table-scroll" role="region" aria-label="Échéances du prêt" aria-describedby="amortization-help" tabIndex={0}>
      <table><caption className="credit-sr-only">Amortissement du dernier calcul validé</caption><thead><tr>{["Mois", "Capital remboursé", "Intérêts", "Assurance", "Mensualité totale", "Capital restant dû"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.month}><th scope="row">{row.month}</th>{[row.principal, row.interest, row.insurance, row.payment, row.balance].map((value, index) => <td key={index}>{money(value)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  </section>;
}
