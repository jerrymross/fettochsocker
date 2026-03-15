import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { renderPrintableRecipePdf, renderRecipeCollectionPdf } from "@/lib/pdf/recipe-pdf";
import type { PrintableRecipeDocument } from "@/lib/printable-recipe";
import type { ExportRecipeCollectionInput, ExportRecipeDocumentInput } from "@/lib/schemas/exports";
import { buildRecipeAccessWhere } from "@/lib/server/recipes";

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
    const pdfBuffer = await renderRecipeCollectionPdf(input.title, recipes as ExportRecipeRecord[]);

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
    const pdfBuffer = await renderPrintableRecipePdf(input.document as PrintableRecipeDocument, {
      locale: input.locale,
      ingredientsLabel: input.locale === "sv" ? "Ingredienser" : "Ingredients",
      stepsLabel: input.locale === "sv" ? "Steg" : "Steps",
      totalWeightLabel: input.locale === "sv" ? "Totalvikt" : "Total weight",
      generatedAtLabel: input.locale === "sv" ? "Genererad" : "Generated",
    });

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
