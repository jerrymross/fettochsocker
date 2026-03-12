import { IngredientUnit } from "@prisma/client";
import { z } from "zod";

export const ingredientInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.coerce.number().positive().max(100000),
  unit: z.nativeEnum(IngredientUnit),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

export const stepInputSchema = z.object({
  instruction: z.string().trim().min(1).max(5000),
});

export const recipeInputSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(10).max(5000),
  categoryIds: z.array(z.string().cuid()).max(20).default([]),
  ingredients: z.array(ingredientInputSchema).min(1).max(100),
  steps: z.array(stepInputSchema).min(1).max(100),
});

export const recipeIdSchema = z.object({
  recipeId: z.string().cuid(),
});

export const scaleByWeightSchema = z.object({
  mode: z.literal("TOTAL_WEIGHT"),
  targetTotalWeight: z.coerce.number().positive().max(100000),
});

export const scaleByPortionSchema = z.object({
  mode: z.literal("PORTIONS"),
  portionWeight: z.coerce.number().positive().max(100000),
  portionCount: z.coerce.number().int().positive().max(10000),
});

export const scaleRecipeSchema = z.discriminatedUnion("mode", [
  scaleByWeightSchema,
  scaleByPortionSchema,
]);

export type RecipeFormInput = z.input<typeof recipeInputSchema>;
export type RecipeInput = z.output<typeof recipeInputSchema>;
