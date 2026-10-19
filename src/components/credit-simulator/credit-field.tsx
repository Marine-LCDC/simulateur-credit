import type { CreditKey } from "@/lib/credit-simulator/types";
import { labels } from "@/lib/credit-simulator/validation";

export function CreditField({ field, value, pulse, onChange, onCalculate }: {
  field: CreditKey; value: string; pulse: boolean;
  onChange: (value: string) => void; onCalculate: () => void;
}) {
  const unit = field === "duration" ? "années" : field === "rate" ? "%" : "€";
  return <div className="credit-field">
    <label htmlFor={`credit-${field}`}>{labels[field]}</label>
    <div className="credit-field-row">
      <div className="credit-input-wrap">
        <input id={`credit-${field}`} inputMode="decimal" type="text" value={value} onChange={event => onChange(event.target.value)} aria-describedby={`unit-${field}`} autoComplete="off" spellCheck={false} />
        <span id={`unit-${field}`}>{unit}</span>
      </div>
      <button type="button" className={`button credit-calculate ${pulse ? "credit-pulse" : ""}`} onClick={onCalculate} aria-label={`Calculer : ${labels[field]}`}>Calculer</button>
    </div>
  </div>;
}
