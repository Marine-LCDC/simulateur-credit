import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { amortize, summarize } from "./calculations.ts";
import { decimal, disclaimer, durationLabel, money } from "./format.ts";
import type { CreditValues } from "./types.ts";

// Helvetica's WinAnsi encoding supports French accents and €, but not narrow spaces.
const pdfText = (text: string) => text.replace(/[\u00a0\u202f]/g, " ").replace(/[’]/g, "'");
export function createCreditPdf(values: CreditValues, insuranceRate: number, date = new Date()) {
  const summary = summarize(values, insuranceRate);
  const rows = amortize(values, insuranceRate);
  const doc = new jsPDF();
  doc.setProperties({ title: "Simulateur de crédit - Titayla", author: "Titayla" });
  doc.setTextColor(8, 70, 116);
  doc.setFontSize(24); doc.text("Titayla", 16, 22);
  doc.setFontSize(18); doc.text("Simulateur de crédit", 16, 34);
  doc.setFontSize(10); doc.text(`Simulation du ${date.toLocaleDateString("fr-FR")}`, 16, 43);
  const details = [
    ["Capital emprunté", money(values.capital)], ["Durée", durationLabel(values.duration)],
    ["Taux d’intérêt annuel", `${decimal(values.rate, 4)} %`], ["Mensualité hors assurance", money(values.monthly)],
    ["Taux d’assurance annuel", `${decimal(insuranceRate, 4)} %`], ["Assurance mensuelle sur capital initial", money(summary.monthlyInsurance)],
    ["Mensualité assurance comprise", money(summary.totalMonthly)], ["Total des intérêts", money(summary.totalInterest)],
    ["Total des assurances", money(summary.totalInsurance)], ["Coût total du crédit (intérêts + assurances)", money(summary.totalCost)],
  ];
  autoTable(doc, { startY: 51, margin: { left: 16, right: 16 }, body: details.map(row => row.map(pdfText)), theme: "striped", styles: { fontSize: 10, cellPadding: 3 }, columnStyles: { 1: { halign: "right", fontStyle: "bold" } }, alternateRowStyles: { fillColor: [237, 247, 249] } });
  doc.setFontSize(9); doc.setTextColor(70, 90, 100);
  doc.text(doc.splitTextToSize(pdfText("Assurance constante sur le capital initial. Aucun frais de dossier, de garantie, de courtage ou de notaire n’est inclus. Une fraction de mois donne lieu à une dernière échéance proratisée, assurance comprise."), 178), 16, 164);
  doc.text(doc.splitTextToSize(pdfText(disclaimer), 178), 16, 189);
  doc.addPage();
  autoTable(doc, {
    startY: 30, margin: { top: 30, bottom: 20, left: 12, right: 12 },
    head: [["Mois", "Capital\nremboursé", "Intérêts", "Assurance", "Mensualité\ntotale", "Capital\nrestant dû"]],
    body: rows.map(row => [String(row.month), ...[row.principal, row.interest, row.insurance, row.payment, row.balance].map(value => pdfText(money(value)))]),
    theme: "striped", styles: { fontSize: 8, cellPadding: 2.5, halign: "right" }, headStyles: { fillColor: [8, 70, 116] }, alternateRowStyles: { fillColor: [237, 247, 249] }, rowPageBreak: "avoid",
    willDrawPage: () => { doc.setFontSize(13); doc.setTextColor(8, 70, 116); doc.text("Titayla - Tableau d'amortissement", 12, 19); },
  });
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page); doc.setFontSize(8); doc.setTextColor(85, 110, 124);
    doc.text("Titayla | Simulation indicative et non contractuelle", 16, 286);
    doc.text(`${page} / ${totalPages}`, 194, 286, { align: "right" });
  }
  return doc;
}
