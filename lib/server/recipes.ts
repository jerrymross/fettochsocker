import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { RecipeInput } from "@/lib/schemas/recipe";
import { convertToWeightGrams } from "@/lib/units";
import { slugify, toNumber } from "@/lib/utils";

const recipeInclude = {
  ingredients: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      ingredient: true,
    },
  },
  steps: {
    orderBy: { sortOrder: "asc" as const },
  },
  categories: {
    include: {
      category: true,
    },
  },
  author: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.RecipeInclude;

export async function listRecipes() {
  return prisma.recipe.findMany({
    include: recipeInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function listRecipeSearchItems() {
  return prisma.recipe.findMany({
    select: {
      id: true,
      title: true,
    },
    orderBy: { title: "asc" },
  });
}

export async function getRecipeById(recipeId: string) {
  return prisma.recipe.findUnique({
    where: { id: recipeId },
    include: recipeInclude,
  });
}

export async function removeRecipe(recipeId: string) {
  return prisma.recipe.delete({
    where: { id: recipeId },
  });
}

function totalWeightFromInput(input: RecipeInput) {
  return input.ingredients.reduce((sum, item) => sum + (convertToWeightGrams(item.quantity, item.unit) ?? 0), 0);
}

async function resolveIngredientIds(input: RecipeInput) {
  return Promise.all(
    input.ingredients.map(async (item) => {
      const ingredient = await prisma.ingredient.upsert({
        where: { name: item.name.trim() },
        update: {},
        create: { name: item.name.trim() },
      });

      return {
        ingredientId: ingredient.id,
        quantity: item.quantity,
        unit: item.unit,
        note: item.note || null,
      };
    }),
  );
}

async function resolveCategoryIds(input: RecipeInput) {
  if (input.categoryIds.length === 0) {
    return [];
  }

  const categories = await prisma.recipeCategory.findMany({
    where: {
      id: {
        in: input.categoryIds,
      },
    },
    select: {
      id: true,
    },
  });

  if (categories.length !== input.categoryIds.length) {
    throw new Error("One or more categories could not be found.");
  }

  return categories.map((category) => category.id);
}

async function ensureUniqueSlug(baseTitle: string, existingId?: string) {
  const baseSlug = slugify(baseTitle);
  let candidate = baseSlug;
  let index = 1;

  while (true) {
    const match = await prisma.recipe.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!match || match.id === existingId) {
      return candidate;
    }

    index += 1;
    candidate = `${baseSlug}-${index}`;
  }
}

export async function saveRecipe(input: RecipeInput, authorId: string, recipeId?: string) {
  const ingredientRows = await resolveIngredientIds(input);
  const categoryIds = await resolveCategoryIds(input);
  const totalWeightGrams = totalWeightFromInput(input);
  const slug = await ensureUniqueSlug(input.title, recipeId);

  if (!recipeId) {
    return prisma.recipe.create({
      data: {
        slug,
        title: input.title,
        description: input.description,
        authorId,
        totalWeightGrams,
        categories: {
          create: categoryIds.map((categoryId) => ({
            categoryId,
          })),
        },
        ingredients: {
          create: ingredientRows.map((item, index) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
            note: item.note,
            sortOrder: index + 1,
          })),
        },
        steps: {
          create: input.steps.map((step, index) => ({
            instruction: step.instruction,
            sortOrder: index + 1,
          })),
        },
      },
      include: recipeInclude,
    });
  }

  return prisma.$transaction(async (transaction) => {
    await transaction.recipeCategoryLink.deleteMany({ where: { recipeId } });
    await transaction.recipeIngredient.deleteMany({ where: { recipeId } });
    await transaction.recipeStep.deleteMany({ where: { recipeId } });

    return transaction.recipe.update({
      where: { id: recipeId },
      data: {
        slug,
        title: input.title,
        description: input.description,
        totalWeightGrams,
        categories: {
          create: categoryIds.map((categoryId) => ({
            categoryId,
          })),
        },
        ingredients: {
          create: ingredientRows.map((item, index) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
            note: item.note,
            sortOrder: index + 1,
          })),
        },
        steps: {
          create: input.steps.map((step, index) => ({
            instruction: step.instruction,
            sortOrder: index + 1,
          })),
        },
      },
      include: recipeInclude,
    });
  });
}

export function scaleRecipe(
  recipe: Awaited<ReturnType<typeof getRecipeById>>,
  targetTotalWeight: number,
) {
  if (!recipe) {
    return null;
  }

  const baseWeight = toNumber(recipe.totalWeightGrams);
  const factor = baseWeight > 0 ? targetTotalWeight / baseWeight : 1;

  return {
    baseWeight,
    factor,
    targetTotalWeight,
    ingredients: recipe.ingredients.map((item) => ({
      id: item.id,
      name: item.ingredient.name,
      unit: item.unit,
      baseQuantity: toNumber(item.quantity),
      scaledQuantity: Number((toNumber(item.quantity) * factor).toFixed(2)),
      note: item.note,
    })),
  };
}
