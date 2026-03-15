import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { Prisma } from "@prisma/client";
import type { PrintableRecipeDocument } from "@/lib/printable-recipe";
import { formatIngredientAmount } from "@/lib/units";
import { formatDate, formatGrams, toNumber } from "@/lib/utils";

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

const PORTRAIT_A4_SIZE = {
  width: 595.28,
  height: 841.89,
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingRight: 40,
    paddingBottom: 34,
    paddingLeft: 40,
    fontSize: 10,
    color: "#18222f",
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  coverPage: {
    backgroundColor: "#f7efe0",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 2.4,
    color: "#8b5e34",
  },
  coverTitle: {
    marginTop: 18,
    maxWidth: 360,
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.05,
  },
  coverLead: {
    marginTop: 10,
    maxWidth: 380,
    fontSize: 12,
    lineHeight: 1.55,
    color: "#425468",
  },
  coverMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  coverSummaryCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#d8e0e9",
    borderRadius: 16,
    backgroundColor: "#fffdfa",
    minWidth: 120,
  },
  coverSummaryValue: {
    marginTop: 6,
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  metaText: {
    fontSize: 10,
    color: "#425468",
  },
  registerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#d8e0e9",
    paddingBottom: 18,
  },
  registerTitle: {
    marginTop: 6,
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
  },
  registerNote: {
    maxWidth: 180,
    fontSize: 10,
    lineHeight: 1.5,
    color: "#5c6d81",
  },
  registerList: {
    marginTop: 22,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  tocRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e7ee",
    paddingBottom: 8,
  },
  tocIndex: {
    width: 28,
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#8b5e34",
  },
  tocTitle: {
    flexGrow: 1,
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
  },
  tocDots: {
    flexGrow: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#b6c2d0",
    borderStyle: "dotted",
    marginHorizontal: 10,
  },
  tocPage: {
    width: 18,
    textAlign: "right",
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#425468",
  },
  registerFooter: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    color: "#6a7a8c",
  },
  recipeTopbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pagePill: {
    borderRadius: 999,
    backgroundColor: "#eef2f7",
    paddingVertical: 5,
    paddingHorizontal: 11,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#425468",
  },
  recipeHeader: {
    marginTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#d8e0e9",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 18,
  },
  recipeHeaderContent: {
    flexGrow: 1,
    flexShrink: 1,
  },
  recipeTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.05,
  },
  recipeDescription: {
    marginTop: 8,
    fontSize: 10.5,
    lineHeight: 1.5,
    color: "#46596e",
  },
  weightCard: {
    minWidth: 108,
    borderWidth: 1,
    borderColor: "#d8e0e9",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fafbfd",
  },
  weightLabel: {
    fontSize: 7,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    color: "#6f8094",
  },
  weightValue: {
    marginTop: 6,
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  recipeGrid: {
    marginTop: 18,
    flexDirection: "row",
    gap: 18,
    flexGrow: 1,
  },
  recipePanel: {
    flexGrow: 1,
    flexBasis: 0,
  },
  panelTitle: {
    marginBottom: 10,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    color: "#44576a",
    fontFamily: "Helvetica-Bold",
  },
  ingredientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#d7dee7",
  },
  ingredientName: {
    flexGrow: 1,
    fontSize: 10.2,
    lineHeight: 1.32,
  },
  ingredientAmount: {
    width: 72,
    textAlign: "right",
    fontSize: 10.2,
    fontFamily: "Helvetica-Bold",
  },
  stepRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  stepIndex: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: "#eef2f7",
    textAlign: "center",
    fontSize: 8,
    paddingTop: 3,
    fontFamily: "Helvetica-Bold",
    color: "#425468",
  },
  stepText: {
    flexGrow: 1,
    fontSize: 10.2,
    lineHeight: 1.4,
  },
  printableTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.08,
  },
  printableDescription: {
    marginTop: 8,
    fontSize: 10.6,
    lineHeight: 1.45,
    color: "#46596e",
  },
  printableMetaGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  printableMetaItem: {
    width: "31%",
    borderWidth: 1,
    borderColor: "#d8e0e9",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#fafbfd",
  },
  printableSectionWrap: {
    marginTop: 18,
    flexDirection: "row",
    gap: 18,
  },
  printableFooter: {
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    fontSize: 8,
    color: "#64748b",
  },
});

function getRecipePageDensity(recipe: ExportRecipeRecord) {
  const descriptionScore = Math.ceil(recipe.description.length / 180);
  const longStepScore = recipe.steps.reduce(
    (total, step) => total + Math.ceil(step.instruction.length / 220) - 1,
    0,
  );
  const score = recipe.ingredients.length + recipe.steps.length + descriptionScore + longStepScore;

  if (score > 24) {
    return {
      titleSize: 18,
      descriptionSize: 9,
      rowPadding: 4,
      bodySize: 8.8,
      panelTitleSize: 10,
      gap: 12,
      stepGap: 6,
      amountWidth: 60,
    };
  }

  if (score > 16) {
    return {
      titleSize: 20,
      descriptionSize: 9.8,
      rowPadding: 5,
      bodySize: 9.6,
      panelTitleSize: 10.5,
      gap: 14,
      stepGap: 7,
      amountWidth: 66,
    };
  }

  return {
    titleSize: 22,
    descriptionSize: 10.5,
    rowPadding: 6,
    bodySize: 10.2,
    panelTitleSize: 11,
    gap: 18,
    stepGap: 8,
    amountWidth: 72,
  };
}

function RecipeCollectionDocument({
  title,
  recipes,
}: {
  title: string;
  recipes: ExportRecipeRecord[];
}) {
  return (
    <Document title={title} author="Fett & Socker" producer="Fett & Socker">
      <Page size={PORTRAIT_A4_SIZE} style={[styles.page, styles.coverPage]}>
        <View>
          <Text style={styles.eyebrow}>Fett & Socker export</Text>
          <Text style={styles.coverTitle}>{title}</Text>
          <Text style={styles.coverLead}>
            A print-ready recipe collection formatted for A4, with one recipe per page and a clean
            register at the front.
          </Text>
        </View>

        <View style={styles.coverMetaRow}>
          <Text style={styles.metaText}>Generated on {formatDate(new Date())}</Text>
          <View style={styles.coverSummaryCard}>
            <Text style={styles.weightLabel}>Recipes</Text>
            <Text style={styles.coverSummaryValue}>{String(recipes.length)}</Text>
          </View>
        </View>
      </Page>

      <Page size={PORTRAIT_A4_SIZE} style={styles.page}>
        <View style={styles.registerHeader}>
          <View>
            <Text style={styles.eyebrow}>Register</Text>
            <Text style={styles.registerTitle}>Recipe index</Text>
          </View>
          <Text style={styles.registerNote}>
            Every recipe starts on its own A4 page, so the register stays stable and easy to scan
            in print.
          </Text>
        </View>

        <View style={styles.registerList}>
          {recipes.map((recipe, index) => (
            <View key={recipe.id} style={styles.tocRow}>
              <Text style={styles.tocIndex}>{String(index + 1).padStart(2, "0")}</Text>
              <Text style={styles.tocTitle}>{recipe.title}</Text>
              <View style={styles.tocDots} />
              <Text style={styles.tocPage}>{String(index + 3)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.registerFooter}>
          <Text>{recipes.length} recipes</Text>
          <Text>Starts on page 3</Text>
        </View>
      </Page>

      {recipes.map((recipe, index) => {
        const density = getRecipePageDensity(recipe);

        return (
          <Page key={recipe.id} size={PORTRAIT_A4_SIZE} style={styles.page} wrap={false}>
            <View style={styles.recipeTopbar}>
              <Text style={styles.eyebrow}>Recipe {index + 1}</Text>
              <Text style={styles.pagePill}>Page {index + 3}</Text>
            </View>

            <View style={styles.recipeHeader}>
              <View style={styles.recipeHeaderContent}>
                <Text style={[styles.recipeTitle, { fontSize: density.titleSize }]}>{recipe.title}</Text>
                {recipe.description.trim() ? (
                  <Text style={[styles.recipeDescription, { fontSize: density.descriptionSize }]}>
                    {recipe.description}
                  </Text>
                ) : null}
              </View>
              <View style={styles.weightCard}>
                <Text style={styles.weightLabel}>Total weight</Text>
                <Text style={styles.weightValue}>{formatGrams(toNumber(recipe.totalWeightGrams))}</Text>
              </View>
            </View>

            <View style={[styles.recipeGrid, { gap: density.gap }]}>
              <View style={styles.recipePanel}>
                <Text style={[styles.panelTitle, { fontSize: density.panelTitleSize }]}>Ingredients</Text>
                {recipe.ingredients.map((item) => (
                  <View key={item.id} style={[styles.ingredientRow, { paddingVertical: density.rowPadding }]}>
                    <Text style={[styles.ingredientName, { fontSize: density.bodySize }]}>
                      {item.ingredient.name}
                    </Text>
                    <Text style={[styles.ingredientAmount, { width: density.amountWidth, fontSize: density.bodySize }]}>
                      {formatIngredientAmount(toNumber(item.quantity), item.unit, "en-US")}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.recipePanel}>
                <Text style={[styles.panelTitle, { fontSize: density.panelTitleSize }]}>Method</Text>
                {recipe.steps.map((step, stepIndex) => (
                  <View key={step.id} style={[styles.stepRow, { marginBottom: density.stepGap }]}>
                    <Text style={styles.stepIndex}>{stepIndex + 1}</Text>
                    <Text style={[styles.stepText, { fontSize: density.bodySize }]}>{step.instruction}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}

function PrintableRecipePdfDocument({
  document,
  locale,
  ingredientsLabel,
  stepsLabel,
  totalWeightLabel,
  generatedAtLabel,
}: {
  document: PrintableRecipeDocument;
  locale: "en" | "sv";
  ingredientsLabel: string;
  stepsLabel: string;
  totalWeightLabel: string;
  generatedAtLabel: string;
}) {
  const pdfLocale = locale === "sv" ? "sv-SE" : "en-US";

  return (
    <Document title={document.title} author="Fett & Socker" producer="Fett & Socker">
      <Page size={PORTRAIT_A4_SIZE} style={styles.page}>
        <View>
          <Text style={styles.eyebrow}>Fett & Socker</Text>
          <Text style={styles.printableTitle}>{document.title}</Text>
          <Text style={styles.printableDescription}>{document.description}</Text>
        </View>

        <View style={styles.printableMetaGrid}>
          <View style={styles.weightCard}>
            <Text style={styles.weightLabel}>{totalWeightLabel}</Text>
            <Text style={styles.weightValue}>
              {new Intl.NumberFormat(pdfLocale, { maximumFractionDigits: 2 }).format(
                document.totalWeightGrams,
              )}{" "}
              g
            </Text>
          </View>

          {(document.meta ?? []).map((item) => (
            <View key={`${item.label}-${item.value}`} style={styles.printableMetaItem}>
              <Text style={styles.weightLabel}>{item.label}</Text>
              <Text style={styles.metaText}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.printableSectionWrap}>
          <View style={styles.recipePanel}>
            <Text style={styles.panelTitle}>{ingredientsLabel}</Text>
            {document.ingredients.map((item, index) => (
              <View key={`${item.name}-${index}`} style={styles.ingredientRow}>
                <View style={{ flexGrow: 1 }}>
                  <Text style={styles.ingredientName}>{item.name}</Text>
                  {item.note ? <Text style={{ fontSize: 8.5, color: "#64748b" }}>{item.note}</Text> : null}
                </View>
                <Text style={styles.ingredientAmount}>
                  {formatIngredientAmount(item.quantity, item.unit, pdfLocale)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.recipePanel}>
            <Text style={styles.panelTitle}>{stepsLabel}</Text>
            {document.steps.map((step, index) => (
              <View key={`${step.instruction}-${index}`} style={styles.stepRow}>
                <Text style={styles.stepIndex}>{index + 1}</Text>
                <Text style={styles.stepText}>{step.instruction}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.printableFooter}>
          {generatedAtLabel}:{" "}
          {new Intl.DateTimeFormat(pdfLocale, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date())}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderRecipeCollectionPdf(title: string, recipes: ExportRecipeRecord[]) {
  return renderToBuffer(<RecipeCollectionDocument recipes={recipes} title={title} />);
}

export async function renderPrintableRecipePdf(
  document: PrintableRecipeDocument,
  options: {
    locale: "en" | "sv";
    ingredientsLabel: string;
    stepsLabel: string;
    totalWeightLabel: string;
    generatedAtLabel: string;
  },
) {
  return renderToBuffer(
    <PrintableRecipePdfDocument
      document={document}
      generatedAtLabel={options.generatedAtLabel}
      ingredientsLabel={options.ingredientsLabel}
      locale={options.locale}
      stepsLabel={options.stepsLabel}
      totalWeightLabel={options.totalWeightLabel}
    />,
  );
}
