import type { IngredientUnit } from "@prisma/client";
import type { RecipeCategoryOption } from "@/lib/recipe-categories";

export type EditableRecipe = {
  title: string;
  description: string;
  categoryIds: string[];
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: IngredientUnit;
    note?: string;
  }>;
  steps: Array<{
    instruction: string;
  }>;
};

export type RecipeListItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  categories: RecipeCategoryOption[];
  totalWeightGrams: number;
  updatedAt: string;
  ingredientCount: number;
  stepCount: number;
};
