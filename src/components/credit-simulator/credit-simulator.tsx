"use client";

import { useState } from "react";
import { flushSync } from "react-dom";
import { calculate, initialValues, summarize } from "@/lib/credit-simulator/calculations";
import { creditKeys, type CreditInputs, type CreditKey, type CreditValues } from "@/lib/credit-simulator/types";
import { labels, parseNumber, validateInsurance } from "@/lib/credit-simulator/validation";
import { decimal, disclaimer } from "@/lib/credit-simulator/format";
import { CreditField } from "./credit-field";
import { CreditSummary } from "./credit-summary";
import { AmortizationTable } from "./amortization-table";
import "./credit-simulator.css";

function displayInputs(values: CreditValues): CreditInputs {
  const precise = (value: number, minimumFractionDigits = 0) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits, maximumFractionDigits: 4 }).format(value);
  return { capital: decimal(values.capital), duration: precise(values.duration), rate: precise(values.rate, 2), monthly: decimal(values.monthly) };
}
export function CreditSimulator() {
  const [inputs, setInputs] = useState<CreditInputs>(() => displayInputs(initialValues));
  // Untouched fields retain their full precision, independently of display rounding.
  const [edited, setEdited] = useState<Partial<Record<CreditKey, boolean>>>({});
  const [values, setValues] = useState(initialValues);
  const [lastEdited, setLastEdited] = useState<CreditKey | null>(null);
  const [insuranceInput, setInsuranceInput] = useState("0,33");
  const [insuranceRate, setInsuranceRate] = useState(0.33);
  const [insuranceError, setInsuranceError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showTable, setShowTable] = useState(false);
  const [exporting, setExporting] = useState(false);
  const pending = lastEdited !== null;
  const summary = summarize(values, insuranceRate);

  function runCalculation(target: CreditKey) {
    try {
      const source = { ...values };
      for (const key of creditKeys) if (key !== target && edited[key]) source[key] = parseNumber(inputs[key]);
      const next = calculate(target, source);
      summarize(next, insuranceRate);
      setValues(next); setInputs(displayInputs(next)); setEdited({}); setLastEdited(null); setError("");
      setMessage(`${labels[target]} : calcul effectué.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Le calcul n’a pas abouti."); setMessage(""); }
  }
  async function downloadPdf() {
    setExporting(true); setError("");
    try {
      const { createCreditPdf } = await import("@/lib/credit-simulator/pdf");
      const pdf = createCreditPdf(values, insuranceRate);
      pdf.save("simulation-credit-titayla.pdf");
      setMessage("Le PDF de votre simulation a été généré.");
    } catch { setError("Le PDF n’a pas pu être généré. Réessayez dans quelques instants."); }
    finally { setExporting(false); }
  }
  return <div className="credit-app">
    <section className="credit-panel" aria-labelledby="credit-input-title">
      <div className="credit-panel-heading"><span className="credit-step">01</span><div><h2 id="credit-input-title">À vous de choisir l’inconnue.</h2><p className="muted">Renseignez trois valeurs, puis cliquez sur Calculer à côté de celle que vous recherchez.</p></div></div>
      <div className="credit-fields">{creditKeys.map(key => <CreditField key={key} field={key} value={inputs[key]} pulse={pending && lastEdited !== key}
        onChange={value => { setInputs(current => ({ ...current, [key]: value })); setEdited(current => ({ ...current, [key]: true })); setLastEdited(key); setError(""); setMessage(""); }}
        onCalculate={() => runCalculation(key)} />)}</div>
      <div className="credit-insurance"><div><h3>L’assurance emprunteur</h3><p className="muted">Calculée sur le capital initial, elle reste constante pendant toute la durée du prêt.</p></div>
        <div className="credit-field"><label htmlFor="credit-insurance">Taux d’assurance annuel (%)</label><input id="credit-insurance" type="text" inputMode="decimal" value={insuranceInput} aria-invalid={!!insuranceError} aria-describedby={insuranceError ? "insurance-error" : undefined}
          onChange={event => { setInsuranceInput(event.target.value); try { const next = validateInsurance(parseNumber(event.target.value)); setInsuranceRate(next); setInsuranceError(""); } catch (reason) { setInsuranceError(reason instanceof Error ? reason.message : "Taux d’assurance invalide."); } }} />
        </div>
      </div>
      {insuranceError && <p className="error" id="insurance-error" role="alert">{insuranceError} La synthèse conserve le dernier taux valide.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <p className="credit-status" role="status">{message || (pending ? "Les trois boutons mis en évidence indiquent les valeurs que vous pouvez recalculer." : "Les calculs restent sur votre appareil. Aucune simulation n’est enregistrée.")}</p>
    </section>
    <CreditSummary values={values} summary={summary} pending={pending} />
    <div className="credit-actions"><button type="button" className="button secondary" aria-expanded={showTable} aria-controls="credit-amortization" onClick={() => setShowTable(!showTable)}>{showTable ? "Masquer le tableau d’amortissement" : "Voir le tableau d’amortissement"}</button>
      <button type="button" className="button" disabled={pending || !!insuranceError || exporting} onClick={downloadPdf}>{exporting ? "Préparation du PDF…" : "Télécharger en PDF"}</button>
      <button type="button" className="button secondary" disabled={pending || !!insuranceError} onClick={() => { flushSync(() => setShowTable(true)); window.print(); }}>Imprimer</button>
    </div>
    {pending && <p className="muted small">Recalculez une variable avant de télécharger le PDF. Le tableau affiche le dernier calcul validé.</p>}
    {showTable && <AmortizationTable values={values} insuranceRate={insuranceRate} />}
    <p className="credit-disclaimer">{disclaimer}</p>
  </div>;
}
