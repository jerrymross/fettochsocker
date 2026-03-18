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

const volumeMlPerUnit: Partial<Record<IngredientUnit, number>> = {
  [IngredientUnit.ML]: 1,
  [IngredientUnit.CL]: 10,
  [IngredientUnit.DL]: 100,
  [IngredientUnit.L]: 1000,
  [IngredientUnit.TSP]: 5,
  [IngredientUnit.TBSP]: 15,
};

const densityHints: Array<{ pattern: RegExp; gramsPerMl: number }> = [
  { pattern: /\b(vatten|kallt vatten|varmt vatten)\b/i, gramsPerMl: 1 },
  { pattern: /\b(mjolk|mjölk|kaffegradde|kaffegrädde|gradde|grädde|vispgradde|vispgrädde|gradde)\b/i, gramsPerMl: 1 },
  { pattern: /\b(olja|rapsolja|solrosolja|olivolja)\b/i, gramsPerMl: 0.92 },
  { pattern: /\b(smor|smör|smalt smor|smalt smör|margarin)\b/i, gramsPerMl: 0.95 },
  { pattern: /\b(honung|sirap|glykos)\b/i, gramsPerMl: 1.4 },
  { pattern: /\b(vetemjol|vetemjöl|mjol|mjöl|potatismjol|potatismjöl)\b/i, gramsPerMl: 0.6 },
  { pattern: /\b(florsocker)\b/i, gramsPerMl: 0.6 },
  { pattern: /\b(muscovadosocker|farinsocker|socker|strosocker|strösocker)\b/i, gramsPerMl: 0.85 },
  { pattern: /\b(vaniljsocker|bakpulver)\b/i, gramsPerMl: 0.8 },
  { pattern: /\b(salt)\b/i, gramsPerMl: 1.2 },
  { pattern: /\b(kakao)\b/i, gramsPerMl: 0.42 },
  { pattern: /\b(choklad|notter|nötter|mandel)\b/i, gramsPerMl: 0.6 },
];

const pieceWeightHints: Array<{ pattern: RegExp; gramsPerPiece: number }> = [
  { pattern: /\b(agg|ägg)\b/i, gramsPerPiece: 50 },
  { pattern: /\b(aggula|äggula)\b/i, gramsPerPiece: 18 },
  { pattern: /\b(aggvita|äggvita)\b/i, gramsPerPiece: 30 },
];

function normalizeIngredientName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function detectDensity(ingredientName?: string) {
  const normalized = normalizeIngredientName(ingredientName ?? "");

  if (!normalized) {
    return null;
  }

  const hint = densityHints.find(({ pattern }) => pattern.test(normalized));
  return hint?.gramsPerMl ?? null;
}

function detectPieceWeight(ingredientName?: string) {
  const normalized = normalizeIngredientName(ingredientName ?? "");

  if (!normalized) {
    return null;
  }

  const hint = pieceWeightHints.find(({ pattern }) => pattern.test(normalized));
  return hint?.gramsPerPiece ?? null;
}

export function formatIngredientAmount(value: number, unit: IngredientUnit, locale = "sv-SE") {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} ${ingredientUnitLabels[unit]}`;
}

export function convertToWeightGrams(value: number, unit: IngredientUnit, ingredientName?: string) {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  switch (unit) {
    case IngredientUnit.G:
      return value;
    case IngredientUnit.KG:
      return value * 1000;
    case IngredientUnit.PCS: {
      const gramsPerPiece = detectPieceWeight(ingredientName);
      return gramsPerPiece ? Number((value * gramsPerPiece).toFixed(2)) : null;
    }
    default: {
      const mlPerUnit = volumeMlPerUnit[unit];
      if (!mlPerUnit) {
        return null;
      }

      const gramsPerMl = detectDensity(ingredientName);
      return gramsPerMl ? Number((value * mlPerUnit * gramsPerMl).toFixed(2)) : null;
    }
  }
}

export function usesWeightUnit(unit: IngredientUnit, ingredientName?: string) {
  return convertToWeightGrams(1, unit, ingredientName) !== null;
}
