import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { defaultRecipeCategoryNames, normalizeRecipeCategoryName } from "@/lib/recipe-categories";

let defaultCategorySeedPromise: Promise<void> | null = null;

export async function ensureDefaultRecipeCategories() {
  if (!defaultCategorySeedPromise) {
    defaultCategorySeedPromise = prisma.recipeCategory
      .createMany({
        data: defaultRecipeCategoryNames.map((name, index) => ({
          name,
          sortOrder: index + 1,
        })),
        skipDuplicates: true,
      })
      .then(() => undefined)
      .catch((error) => {
        defaultCategorySeedPromise = null;
        throw error;
      });
  }

  await defaultCategorySeedPromise;
}

export async function listRecipeCategories() {
  await ensureDefaultRecipeCategories();

  return prisma.recipeCategory.findMany({
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
  });
}

export async function createRecipeCategory(name: string) {
  const normalizedName = normalizeRecipeCategoryName(name);

  if (normalizedName.length < 2 || normalizedName.length > 60) {
    throw new Error("Category name must be between 2 and 60 characters.");
  }

  await ensureDefaultRecipeCategories();

  const existingCategory = await prisma.recipeCategory.findUnique({
    where: { name: normalizedName },
  });

  if (existingCategory) {
    return existingCategory;
  }

  const nextSortOrder = await prisma.recipeCategory.aggregate({
    _max: {
      sortOrder: true,
    },
  });

  try {
    return await prisma.recipeCategory.create({
      data: {
        name: normalizedName,
        sortOrder: (nextSortOrder._max.sortOrder ?? 0) + 1,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await prisma.recipeCategory.findUnique({
        where: { name: normalizedName },
      });

      if (duplicate) {
        return duplicate;
      }
    }

    throw error;
  }
}
