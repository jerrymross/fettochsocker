import type { IngredientUnit } from "@prisma/client";
import { formatIngredientAmount } from "@/lib/units";

export type PrintableRecipeDocument = {
  title: string;
  description: string;
  totalWeightGrams: number;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: IngredientUnit;
    note?: string;
  }>;
  steps: Array<{
    instruction: string;
  }>;
  meta?: Array<{
    label: string;
    value: string;
  }>;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildPrintableRecipeHtml(
  document: PrintableRecipeDocument,
  options: {
    locale?: "en" | "sv";
    ingredientsLabel?: string;
    stepsLabel?: string;
    totalWeightLabel?: string;
    generatedAtLabel?: string;
  } = {},
) {
  const locale = options.locale === "sv" ? "sv-SE" : "en-US";
  const ingredientsLabel = options.ingredientsLabel ?? "Ingredients";
  const stepsLabel = options.stepsLabel ?? "Steps";
  const totalWeightLabel = options.totalWeightLabel ?? "Total weight";
  const generatedAtLabel = options.generatedAtLabel ?? "Generated";
  const metaCount = (document.meta?.length ?? 0) + 1;
  const contentScore =
    document.ingredients.length +
    document.steps.length +
    Math.ceil(document.description.length / 160) +
    metaCount;
  const densityClass = contentScore > 30 ? "ultra-dense" : contentScore > 20 ? "dense" : "standard";

  const ingredients = document.ingredients
    .map(
      (item) => `
        <tr>
          <td>
            <div class="ingredient-name">${escapeHtml(item.name)}</div>
            ${item.note ? `<div class="ingredient-note">${escapeHtml(item.note)}</div>` : ""}
          </td>
          <td class="ingredient-amount">${escapeHtml(formatIngredientAmount(item.quantity, item.unit, locale))}</td>
        </tr>
      `,
    )
    .join("");

  const steps = document.steps
    .map(
      (step, index) => `
        <li>
          <span class="step-index">${index + 1}</span>
          <span class="step-text">${escapeHtml(step.instruction)}</span>
        </li>
      `,
    )
    .join("");

  const meta = (document.meta ?? [])
    .map(
      (item) => `
        <div class="meta-item">
          <span class="meta-label">${escapeHtml(item.label)}</span>
          <span class="meta-value">${escapeHtml(item.value)}</span>
        </div>
      `,
    )
    .join("");
  const metaSection = meta ? `<section class="meta-grid">${meta}</section>` : "";

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(document.title)}</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          html, body { margin: 0; padding: 0; background: #fff; }
          body { font-family: "Segoe UI", Arial, sans-serif; color: #18222f; font-size: 12px; line-height: 1.45; }
          .page {
            width: 210mm;
            height: 297mm;
            box-sizing: border-box;
            overflow: hidden;
            padding: 11mm 12mm 10mm;
            display: flex;
            flex-direction: column;
            gap: 6mm;
          }
          .eyebrow { text-transform: uppercase; letter-spacing: 0.24em; font-size: 9px; color: #7b5c2e; margin: 0 0 5px; }
          .header { border-bottom: 1px solid #d7dee7; padding-bottom: 6mm; }
          .header-top { display: flex; justify-content: space-between; gap: 8mm; align-items: start; }
          .title-wrap { min-width: 0; }
          h1 { font-size: 24px; margin: 0; line-height: 1.04; letter-spacing: -0.035em; }
          .description { margin: 7px 0 0; max-width: 100%; font-size: 11.5px; line-height: 1.48; color: #425468; }
          .meta-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
          .meta-item { border: 1px solid #d7dee7; border-radius: 12px; padding: 8px 10px; background: #fafbfd; }
          .meta-label { display: block; font-size: 8px; color: #58708a; text-transform: uppercase; letter-spacing: 0.14em; }
          .meta-value { display: block; margin-top: 4px; font-size: 12px; font-weight: 700; color: #0f172a; line-height: 1.2; }
          .weight-highlight {
            min-width: 38mm;
            border: 1px solid #d7dee7;
            border-radius: 16px;
            padding: 9px 10px;
            background: linear-gradient(180deg, #fbfcfe 0%, #f5f7fa 100%);
          }
          .weight-highlight .meta-label { font-size: 8px; }
          .weight-highlight .meta-value { font-size: 16px; margin-top: 3px; }
          .content {
            flex: 1;
            min-height: 0;
            display: grid;
            grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
            gap: 7mm;
          }
          .section {
            min-height: 0;
            overflow: hidden;
          }
          .section-title { margin: 0 0 4mm; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #415466; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          td { padding: 2.4mm 0; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: 10.9px; line-height: 1.28; }
          tr:last-child td { border-bottom: 0; }
          .ingredient-name { font-weight: 600; color: #0f172a; line-height: 1.24; }
          .ingredient-note { margin-top: 1px; font-size: 9.2px; color: #64748b; line-height: 1.25; }
          .ingredient-amount { width: 26mm; text-align: right; font-weight: 700; white-space: nowrap; padding-left: 10px; font-size: 10.4px; }
          ol { list-style: none; padding: 0; margin: 0; display: grid; gap: 5px; }
          li { display: grid; grid-template-columns: 19px 1fr; gap: 7px; align-items: start; break-inside: avoid-page; page-break-inside: avoid; }
          .step-index { display: inline-flex; align-items: center; justify-content: center; min-height: 17px; border-radius: 999px; background: #eef2f7; font-size: 9px; font-weight: 700; }
          .step-text { white-space: pre-wrap; line-height: 1.28; font-size: 10.7px; }
          .footer { margin-top: auto; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 8px; color: #64748b; }
          body.dense h1 { font-size: 21px; }
          body.dense .description { font-size: 10.5px; line-height: 1.36; }
          body.dense .meta-grid { gap: 6px; margin-top: 8px; }
          body.dense .meta-item { padding: 7px 8px; }
          body.dense .meta-value { font-size: 11px; }
          body.dense .weight-highlight { min-width: 34mm; padding: 7px 8px; }
          body.dense .weight-highlight .meta-value { font-size: 14px; }
          body.dense .content { gap: 6mm; }
          body.dense .section-title { margin-bottom: 3mm; font-size: 11px; }
          body.dense td { padding: 2mm 0; font-size: 10px; }
          body.dense .ingredient-note { font-size: 8.7px; }
          body.dense .ingredient-amount { width: 23mm; font-size: 9.7px; }
          body.dense ol { gap: 4px; }
          body.dense li { grid-template-columns: 17px 1fr; gap: 6px; }
          body.dense .step-index { min-height: 15px; font-size: 8px; }
          body.dense .step-text { font-size: 9.9px; line-height: 1.22; }
          body.ultra-dense .page { padding: 9mm 10mm 8mm; gap: 4mm; }
          body.ultra-dense h1 { font-size: 18px; }
          body.ultra-dense .header { padding-bottom: 4.5mm; }
          body.ultra-dense .description { margin-top: 5px; font-size: 9.4px; line-height: 1.2; }
          body.ultra-dense .meta-grid { gap: 4px; margin-top: 6px; }
          body.ultra-dense .meta-item { padding: 5px 6px; border-radius: 10px; }
          body.ultra-dense .meta-label { font-size: 7px; }
          body.ultra-dense .meta-value { margin-top: 2px; font-size: 9.8px; }
          body.ultra-dense .weight-highlight { min-width: 30mm; padding: 6px 7px; }
          body.ultra-dense .weight-highlight .meta-value { font-size: 12px; }
          body.ultra-dense .content { gap: 5mm; }
          body.ultra-dense .section-title { margin-bottom: 2.5mm; font-size: 10px; }
          body.ultra-dense td { padding: 1.4mm 0; font-size: 9.1px; line-height: 1.16; }
          body.ultra-dense .ingredient-note { font-size: 8px; line-height: 1.15; }
          body.ultra-dense .ingredient-amount { width: 21mm; font-size: 8.8px; padding-left: 7px; }
          body.ultra-dense ol { gap: 2px; }
          body.ultra-dense li { grid-template-columns: 15px 1fr; gap: 5px; }
          body.ultra-dense .step-index { min-height: 13px; font-size: 7px; }
          body.ultra-dense .step-text { font-size: 8.9px; line-height: 1.12; }
          body.ultra-dense .footer { padding-top: 4px; font-size: 7px; }
        </style>
      </head>
      <body class="${densityClass}">
        <main class="page">
          <header class="header">
            <p class="eyebrow">Fett &amp; Socker</p>
            <div class="header-top">
              <div class="title-wrap">
                <h1>${escapeHtml(document.title)}</h1>
                <p class="description">${escapeHtml(document.description)}</p>
              </div>
              <div class="weight-highlight">
                <span class="meta-label">${escapeHtml(totalWeightLabel)}</span>
                <span class="meta-value">${escapeHtml(new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(document.totalWeightGrams))} g</span>
              </div>
            </div>
            ${metaSection}
          </header>
          <section class="content">
            <section class="section">
              <h2 class="section-title">${escapeHtml(ingredientsLabel)}</h2>
              <table><tbody>${ingredients}</tbody></table>
            </section>
            <section class="section steps-section">
              <h2 class="section-title">${escapeHtml(stepsLabel)}</h2>
              <ol>${steps}</ol>
            </section>
          </section>
          <p class="footer">${escapeHtml(generatedAtLabel)}: ${escapeHtml(new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date()))}</p>
        </main>
      </body>
    </html>
  `;
}
