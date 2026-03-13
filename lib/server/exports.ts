import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildPrintableRecipeHtml, type PrintableRecipeDocument } from "@/lib/printable-recipe";
import { formatIngredientAmount } from "@/lib/units";
import { buildRecipeAccessWhere } from "@/lib/server/recipes";
import { formatDate, formatGrams, toNumber } from "@/lib/utils";
import type { ExportRecipeCollectionInput, ExportRecipeDocumentInput } from "@/lib/schemas/exports";

type ExportRecipeRecord = Prisma.RecipeGetPayload<{
  include: {
    ingredients: {
      include: {
        ingredient: true;
      };
    };
    steps: true;
  };
}>;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getRecipePageDensity(recipe: ExportRecipeRecord) {
  const descriptionScore = Math.ceil(recipe.description.length / 180);
  const longStepScore = recipe.steps.reduce(
    (total, step) => total + Math.ceil(step.instruction.length / 220) - 1,
    0,
  );
  const score = recipe.ingredients.length + recipe.steps.length + descriptionScore + longStepScore;

  if (score > 24) {
    return "recipe-page recipe-tight";
  }

  if (score > 16) {
    return "recipe-page recipe-compact";
  }

  return "recipe-page";
}

function buildPdfHtml(title: string, recipes: ExportRecipeRecord[]) {
  const tocItems = recipes
    .map(
      (recipe, index) =>
        `
          <li class="toc-item">
            <span class="toc-index">${String(index + 1).padStart(2, "0")}</span>
            <span class="toc-title">${escapeHtml(recipe.title)}</span>
            <span class="toc-dots"></span>
            <span class="toc-page">${index + 3}</span>
          </li>
        `,
    )
    .join("");

  const recipeSections = recipes
    .map((recipe, index) => {
      const ingredients = recipe.ingredients
        .map(
          (item) =>
            `<tr><td>${escapeHtml(item.ingredient.name)}</td><td>${escapeHtml(formatIngredientAmount(toNumber(item.quantity), item.unit, "en-US"))}</td></tr>`,
        )
        .join("");

      const steps = recipe.steps
        .map((step) => `<li>${escapeHtml(step.instruction)}</li>`)
        .join("");

      const description = recipe.description.trim()
        ? `<p class="recipe-description">${escapeHtml(recipe.description)}</p>`
        : "";

      return `
        <section class="pdf-page ${getRecipePageDensity(recipe)}">
          <div class="page-frame">
            <div class="recipe-topbar">
              <p class="eyebrow">Recipe ${index + 1}</p>
              <span class="page-pill">Page ${index + 3}</span>
            </div>
            <header class="recipe-header">
              <div>
                <h2>${escapeHtml(recipe.title)}</h2>
                ${description}
              </div>
              <div class="weight-card">
                <span class="weight-label">Total weight</span>
                <strong>${formatGrams(toNumber(recipe.totalWeightGrams))}</strong>
              </div>
            </header>
            <div class="recipe-grid">
              <section class="recipe-panel">
                <h3>Ingredients</h3>
                <table><tbody>${ingredients}</tbody></table>
              </section>
              <section class="recipe-panel">
                <h3>Method</h3>
                <ol>${steps}</ol>
              </section>
            </div>
          </div>
        </section>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=block" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 0; }
          html, body { margin: 0; padding: 0; background: #f5f1e8; }
          body { font-family: "Inter", "Segoe UI", system-ui, Arial, sans-serif; color: #18222f; }
          .pdf-page {
            width: 210mm;
            height: 297mm;
            box-sizing: border-box;
            overflow: hidden;
            break-after: page;
            page-break-after: always;
            background: #ffffff;
          }
          .pdf-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          .page-frame {
            height: 100%;
            box-sizing: border-box;
            padding: 13mm 14mm 12mm;
            display: flex;
            flex-direction: column;
          }
          .eyebrow {
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.24em;
            font-size: 9px;
            color: #8b5e34;
          }
          .cover-page {
            background:
              radial-gradient(circle at top left, rgba(255, 240, 199, 0.92), transparent 34%),
              linear-gradient(145deg, #f6ead5 0%, #fbfaf7 46%, #dfebf8 100%);
          }
          .cover-page .page-frame {
            justify-content: space-between;
            padding: 16mm 16mm 18mm;
          }
          .cover-grid {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 12mm;
            align-items: end;
          }
          .cover-title {
            font-size: 33px;
            line-height: 1.02;
            letter-spacing: -0.04em;
            margin: 12px 0 0;
            max-width: 125mm;
          }
          .cover-lead {
            margin: 10px 0 0;
            max-width: 120mm;
            font-size: 13.5px;
            line-height: 1.6;
            color: #425468;
          }
          .cover-summary {
            align-self: end;
            border: 1px solid rgba(24, 34, 47, 0.08);
            border-radius: 18px;
            padding: 10mm 8mm;
            background: rgba(255, 255, 255, 0.72);
          }
          .cover-summary-label {
            display: block;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.18em;
            color: #6f8094;
          }
          .cover-summary strong {
            display: block;
            margin-top: 4px;
            font-size: 28px;
            line-height: 1;
            color: #0f172a;
          }
          .cover-meta {
            display: flex;
            justify-content: space-between;
            align-items: end;
            gap: 8mm;
            font-size: 11px;
            color: #425468;
          }
          .register-page .page-frame {
            padding: 14mm 14mm 12mm;
          }
          .register-header {
            display: flex;
            justify-content: space-between;
            align-items: end;
            gap: 10mm;
            border-bottom: 1px solid #d8e0e9;
            padding-bottom: 8mm;
          }
          .register-header h2 {
            margin: 6px 0 0;
            font-size: 29px;
            line-height: 1;
            letter-spacing: -0.04em;
          }
          .register-note {
            max-width: 70mm;
            font-size: 11px;
            line-height: 1.5;
            color: #5c6d81;
          }
          .register-list {
            list-style: none;
            padding: 0;
            margin: 9mm 0 0;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4mm 8mm;
            align-content: start;
          }
          .toc-item {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) minmax(10mm, 1fr) auto;
            gap: 3mm;
            align-items: center;
            border-bottom: 1px solid #e1e7ee;
            padding: 3.5mm 0;
          }
          .toc-index {
            font-size: 9px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #8b5e34;
          }
          .toc-title {
            font-size: 11.5px;
            font-weight: 600;
            color: #18222f;
          }
          .toc-dots {
            border-bottom: 1px dotted #b6c2d0;
            height: 0;
          }
          .toc-page {
            font-size: 11px;
            font-weight: 700;
            color: #425468;
          }
          .register-footer {
            margin-top: auto;
            display: flex;
            justify-content: space-between;
            align-items: end;
            font-size: 10px;
            color: #6a7a8c;
          }
          .recipe-page .page-frame {
            gap: 8mm;
          }
          .recipe-topbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .page-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 18mm;
            padding: 2mm 4mm;
            border-radius: 999px;
            background: #eef2f7;
            font-size: 9px;
            font-weight: 700;
            color: #425468;
          }
          .recipe-header {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 8mm;
            align-items: start;
            padding-bottom: 7mm;
            border-bottom: 1px solid #d8e0e9;
          }
          .recipe-header h2 {
            margin: 4px 0 0;
            font-size: 25px;
            line-height: 1.02;
            letter-spacing: -0.04em;
          }
          .recipe-description {
            margin: 7px 0 0;
            font-size: 11.6px;
            line-height: 1.52;
            color: #46596e;
          }
          .weight-card {
            min-width: 40mm;
            border: 1px solid #d8e0e9;
            border-radius: 16px;
            padding: 5mm 5.5mm;
            background: #fafbfd;
          }
          .weight-label {
            display: block;
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.18em;
            color: #6f8094;
          }
          .weight-card strong {
            display: block;
            margin-top: 2mm;
            font-size: 18px;
            line-height: 1.05;
            color: #0f172a;
          }
          .recipe-grid {
            display: grid;
            grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
            gap: 7mm;
            min-height: 0;
            flex: 1;
          }
          .recipe-panel {
            min-height: 0;
            overflow: hidden;
          }
          .recipe-panel h3 {
            margin: 0 0 4mm;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #44576a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          td {
            border-bottom: 1px solid #d7dee7;
            padding: 2.6mm 0;
            vertical-align: top;
            font-size: 11.2px;
            line-height: 1.35;
          }
          td:last-child {
            width: 28mm;
            padding-left: 4mm;
            text-align: right;
            font-weight: 700;
            white-space: nowrap;
          }
          .recipe-panel ol {
            margin: 0;
            padding-left: 5mm;
          }
          .recipe-panel ol li {
            margin: 0 0 2.8mm;
            font-size: 11.2px;
            line-height: 1.42;
          }
          .recipe-compact .recipe-header h2 { font-size: 22px; }
          .recipe-compact .recipe-description { font-size: 10.7px; line-height: 1.42; }
          .recipe-compact .recipe-grid { gap: 6mm; }
          .recipe-compact .recipe-panel h3 { margin-bottom: 3mm; font-size: 12px; }
          .recipe-compact td { padding: 2.1mm 0; font-size: 10.5px; }
          .recipe-compact td:last-child { width: 25mm; }
          .recipe-compact ol li { margin-bottom: 2.1mm; font-size: 10.5px; line-height: 1.34; }
          .recipe-tight .page-frame { padding: 11mm 12mm 10mm; gap: 5mm; }
          .recipe-tight .recipe-header { padding-bottom: 5mm; }
          .recipe-tight .recipe-header h2 { font-size: 19px; }
          .recipe-tight .recipe-description { margin-top: 5px; font-size: 9.8px; line-height: 1.28; }
          .recipe-tight .weight-card { padding: 4mm 4.5mm; min-width: 35mm; }
          .recipe-tight .weight-card strong { font-size: 15px; }
          .recipe-tight .recipe-grid { gap: 5mm; }
          .recipe-tight .recipe-panel h3 { margin-bottom: 2.5mm; font-size: 11px; }
          .recipe-tight td { padding: 1.5mm 0; font-size: 9.7px; line-height: 1.23; }
          .recipe-tight td:last-child { width: 23mm; padding-left: 3mm; }
          .recipe-tight .recipe-panel ol { padding-left: 4mm; }
          .recipe-tight .recipe-panel ol li { margin-bottom: 1.6mm; font-size: 9.7px; line-height: 1.22; }
        </style>
      </head>
      <body>
        <section class="pdf-page cover-page">
          <div class="page-frame">
            <div>
              <p class="eyebrow">Fett &amp; Socker export</p>
              <div class="cover-grid">
                <div>
                  <h1 class="cover-title">${escapeHtml(title)}</h1>
                  <p class="cover-lead">A print-ready recipe collection formatted for A4, with one recipe per page and a clean register at the front.</p>
                </div>
                <aside class="cover-summary">
                  <span class="cover-summary-label">Recipes</span>
                  <strong>${recipes.length}</strong>
                </aside>
              </div>
            </div>
            <div class="cover-meta">
              <span>Generated on ${escapeHtml(formatDate(new Date()))}</span>
              <span>Pages ${recipes.length + 2}</span>
            </div>
          </div>
        </section>
        <section class="pdf-page register-page">
          <div class="page-frame">
            <header class="register-header">
              <div>
                <p class="eyebrow">Register</p>
                <h2>Recipe index</h2>
              </div>
              <p class="register-note">Every recipe starts on its own A4 page, so the register stays stable and easy to scan in print.</p>
            </header>
            <ol class="register-list">${tocItems}</ol>
            <div class="register-footer">
              <span>${recipes.length} recipes</span>
              <span>Starts on page 3</span>
            </div>
          </div>
        </section>
        ${recipeSections}
      </body>
    </html>
  `;
}

async function renderPdfFromHtml(html: string) {
  process.env.PLAYWRIGHT_BROWSERS_PATH ??= "0";
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "networkidle",
    });

    return await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}

export async function createRecipePdf(userId: string, role: UserRole, input: ExportRecipeCollectionInput) {
  const recipes = await prisma.recipe.findMany({
    where: {
      id: { in: input.recipeIds },
      ...buildRecipeAccessWhere(userId, role),
    },
    include: {
      ingredients: {
        orderBy: { sortOrder: "asc" },
        include: { ingredient: true },
      },
      steps: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { title: "asc" },
  });

  if (recipes.length === 0) {
    throw new Error("No recipes were found for export.");
  }

  if (recipes.length !== input.recipeIds.length) {
    throw new Error("One or more selected recipes are not available for export.");
  }

  const exportJob = await prisma.exportJob.create({
    data: {
      userId,
      title: input.title,
      recipeIds: input.recipeIds,
      status: "PENDING",
      fileName: `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
      items: {
        create: recipes.map((recipe, index) => ({
          recipeId: recipe.id,
          sortOrder: index + 1,
        })),
      },
    },
  });

  try {
    const pdfBuffer = await renderPdfFromHtml(buildPdfHtml(input.title, recipes));

    await prisma.exportJob.update({
      where: { id: exportJob.id },
      data: {
        status: "GENERATED",
      },
    });

    return {
      pdfBuffer,
      fileName: exportJob.fileName ?? "recipes.pdf",
    };
  } catch (error) {
    await prisma.exportJob.update({
      where: { id: exportJob.id },
      data: {
        status: "FAILED",
      },
    });
    throw error;
  }
}

export async function createRecipeDocumentPdf(userId: string, input: ExportRecipeDocumentInput) {
  const exportJob = await prisma.exportJob.create({
    data: {
      userId,
      title: input.document.title,
      recipeIds: [],
      status: "PENDING",
      fileName: input.fileName,
    },
  });

  try {
    const pdfBuffer = await renderPdfFromHtml(
      buildPrintableRecipeHtml(input.document as PrintableRecipeDocument, {
        locale: input.locale,
        ingredientsLabel: input.locale === "sv" ? "Ingredienser" : "Ingredients",
        stepsLabel: input.locale === "sv" ? "Steg" : "Steps",
        totalWeightLabel: input.locale === "sv" ? "Totalvikt" : "Total weight",
        generatedAtLabel: input.locale === "sv" ? "Genererad" : "Generated",
      }),
    );

    await prisma.exportJob.update({
      where: { id: exportJob.id },
      data: {
        status: "GENERATED",
      },
    });

    return {
      pdfBuffer,
      fileName: exportJob.fileName ?? input.fileName,
    };
  } catch (error) {
    await prisma.exportJob.update({
      where: { id: exportJob.id },
      data: {
        status: "FAILED",
      },
    });
    throw error;
  }
}
