import { Prisma, UserRole } from "@prisma/client";
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
  packageLinks: {
    include: {
      package: {
        select: {
          id: true,
          name: true,
        },
      },
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

export function buildRecipeAccessWhere(userId: string, role: UserRole): Prisma.RecipeWhereInput {
  if (role === "ADMIN") {
    return {};
  }

  return {
    OR: [
      { isPublic: true },
      { authorId: userId },
      {
        packageLinks: {
          some: {
            package: {
              userLinks: {
                some: {
                  userId,
                },
              },
            },
          },
        },
      },
    ],
  };
}

export function buildRecipeWriteWhere(userId: string, role: UserRole): Prisma.RecipeWhereInput {
  if (role === "ADMIN") {
    return {};
  }

  return {
    authorId: userId,
  };
}

export async function listRecipes(userId: string, role: UserRole) {
  return prisma.recipe.findMany({
    where: buildRecipeAccessWhere(userId, role),
    include: recipeInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function listRecipeSummaries(userId: string, role: UserRole) {
  return prisma.recipe.findMany({
    where: buildRecipeAccessWhere(userId, role),
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      isPublic: true,
      authorId: true,
      totalWeightGrams: true,
      updatedAt: true,
      categories: {
        include: {
          category: true,
        },
      },
      _count: {
        select: {
          ingredients: true,
        },
      },
    },
  });
}

export async function countRecipes(userId: string, role: UserRole) {
  return prisma.recipe.count({
    where: buildRecipeAccessWhere(userId, role),
  });
}

export async function listRecentRecipes(userId: string, role: UserRole, take = 24) {
  return prisma.recipe.findMany({
    where: buildRecipeAccessWhere(userId, role),
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      totalWeightGrams: true,
      updatedAt: true,
    },
  });
}

export async function listRecipeSearchItems(userId: string, role: UserRole) {
  return prisma.recipe.findMany({
    where: buildRecipeAccessWhere(userId, role),
    select: {
      id: true,
      title: true,
    },
    orderBy: { title: "asc" },
  });
}

export async function searchRecipeItems(userId: string, role: UserRole, query: string, take = 6) {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length === 0) {
    return [];
  }

  return prisma.recipe.findMany({
    where: {
      ...buildRecipeAccessWhere(userId, role),
      title: {
        contains: normalizedQuery,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      title: true,
    },
    orderBy: { title: "asc" },
    take,
  });
}

export async function listRecipesForExport(userId: string, role: UserRole) {
  return prisma.recipe.findMany({
    where: buildRecipeAccessWhere(userId, role),
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      totalWeightGrams: true,
    },
  });
}

export async function getRecipeById(recipeId: string, userId: string, role: UserRole) {
  return prisma.recipe.findFirst({
    where: {
      id: recipeId,
      ...buildRecipeAccessWhere(userId, role),
    },
    include: recipeInclude,
  });
}

export async function getRecipeByIdForWrite(recipeId: string, userId: string, role: UserRole) {
  return prisma.recipe.findFirst({
    where: {
      id: recipeId,
      ...buildRecipeWriteWhere(userId, role),
    },
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
        isPublic: input.isPublic,
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
        isPublic: input.isPublic,
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
