import { IngredientUnit } from "@prisma/client";

export const ingredientUnitLabels: Record<IngredientUnit, string> = {
  G: "g",
  KG: "kg",
  ML: "ml",
  CL: "cl",
  DL: "dl",
  L: "l",
  TSP: "tsk",
  TBSP: "msk",
  PCS: "st",
};

export const ingredientUnitOptions = [
  IngredientUnit.G,
  IngredientUnit.KG,
  IngredientUnit.ML,
  IngredientUnit.CL,
  IngredientUnit.DL,
  IngredientUnit.L,
  IngredientUnit.TSP,
  IngredientUnit.TBSP,
  IngredientUnit.PCS,
] as const;

export function formatIngredientAmount(value: number, unit: IngredientUnit, locale = "sv-SE") {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} ${ingredientUnitLabels[unit]}`;
}

export function convertToWeightGrams(value: number, unit: IngredientUnit) {
  switch (unit) {
    case IngredientUnit.G:
      return value;
    case IngredientUnit.KG:
      return value * 1000;
    default:
      return null;
  }
}

export function usesWeightUnit(unit: IngredientUnit) {
  return unit === IngredientUnit.G || unit === IngredientUnit.KG;
}
