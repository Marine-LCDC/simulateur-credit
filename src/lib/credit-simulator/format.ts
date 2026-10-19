export const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
export const decimal = (value: number, digits = 2) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
export const durationLabel = (value: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 }).format(value)} ans`;
export const disclaimer = "Simulation indicative et non contractuelle. Les résultats sont fournis à titre informatif et peuvent différer des conditions proposées par un établissement prêteur ou un assureur.";
