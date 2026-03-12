import { IngredientUnit } from "@prisma/client";
import { z } from "zod";

export const exportRecipeCollectionSchema = z.object({
  title: z.string().trim().min(3).max(160),
  recipeIds: z.array(z.string().cuid()).min(1).max(50),
});

export const exportRecipeDocumentSchema = z.object({
  fileName: z.string().trim().min(3).max(160),
  locale: z.enum(["en", "sv"]),
  document: z.object({
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().min(1).max(5000),
    totalWeightGrams: z.coerce.number().nonnegative().max(1000000),
    ingredients: z.array(
      z.object({
        name: z.string().trim().min(1).max(160),
        quantity: z.coerce.number().positive().max(100000),
        unit: z.nativeEnum(IngredientUnit),
        note: z.string().trim().max(200).optional(),
      }),
    ),
    steps: z.array(
      z.object({
        instruction: z.string().trim().min(1).max(5000),
      }),
    ),
    meta: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(120),
          value: z.string().trim().min(1).max(200),
        }),
      )
      .max(6)
      .optional(),
  }),
});

export type ExportRecipeCollectionInput = z.infer<typeof exportRecipeCollectionSchema>;
export type ExportRecipeDocumentInput = z.infer<typeof exportRecipeDocumentSchema>;
