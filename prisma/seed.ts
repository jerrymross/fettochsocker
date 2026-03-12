import "dotenv/config";
import { IngredientUnit, ModuleKey, PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { defaultRecipeCategoryNames } from "@/lib/recipe-categories";

const prisma = new PrismaClient();

async function upsertIngredient(name: string) {
  return prisma.ingredient.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function seedRecipeCategories() {
  await prisma.recipeCategory.createMany({
    data: defaultRecipeCategoryNames.map((name, index) => ({
      name,
      sortOrder: index + 1,
    })),
    skipDuplicates: true,
  });

  return prisma.recipeCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

async function main() {
  const passwordHash = await bcrypt.hash("admin1234", 12);
  const userPasswordHash = await bcrypt.hash("demo1234", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@admin.se" },
    update: {
      name: "Admin User",
      passwordHash,
      role: UserRole.ADMIN,
    },
    create: {
      email: "admin@admin.se",
      name: "Admin User",
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "chef@receptlight.local" },
    update: {
      name: "Chef Demo",
      passwordHash: userPasswordHash,
      role: UserRole.USER,
    },
    create: {
      email: "chef@receptlight.local",
      name: "Chef Demo",
      passwordHash: userPasswordHash,
      role: UserRole.USER,
    },
  });

  await prisma.module.createMany({
    data: [
      {
        key: ModuleKey.RECIPES,
        name: "Recipes",
        description: "Recipe creation, scaling, and recipe detail views.",
        enabled: true,
        sortOrder: 1,
      },
      {
        key: ModuleKey.IMPORT,
        name: "Import",
        description: "File upload, Unstructured parsing, preview, and recipe mapping.",
        enabled: true,
        sortOrder: 2,
      },
      {
        key: ModuleKey.EXPORT,
        name: "Export",
        description: "Single and batch PDF recipe exports with cover and contents.",
        enabled: true,
        sortOrder: 3,
      },
    ],
    skipDuplicates: true,
  });

  const categories = await seedRecipeCategories();
  const categoryByName = Object.fromEntries(categories.map((category) => [category.name, category]));

  const flour = await upsertIngredient("Bread flour");
  const water = await upsertIngredient("Water");
  const salt = await upsertIngredient("Salt");
  const yeast = await upsertIngredient("Fresh yeast");
  const tomato = await upsertIngredient("Tomatoes");
  const basil = await upsertIngredient("Basil");
  const oliveOil = await upsertIngredient("Olive oil");

  await prisma.recipe.upsert({
    where: { slug: "rustic-country-loaf" },
    update: {
      categories: {
        deleteMany: {},
        create: [
          { categoryId: categoryByName.Bageri.id },
        ],
      },
    },
    create: {
      slug: "rustic-country-loaf",
      title: "Rustic Country Loaf",
      description: "A flexible lean dough with enough structure for scaling and portioning tests.",
      authorId: admin.id,
      totalWeightGrams: 1760,
      categories: {
        create: [
          { categoryId: categoryByName.Bageri.id },
        ],
      },
      ingredients: {
        create: [
          { ingredientId: flour.id, quantity: 1000, unit: IngredientUnit.G, sortOrder: 1 },
          { ingredientId: water.id, quantity: 700, unit: IngredientUnit.G, sortOrder: 2 },
          { ingredientId: salt.id, quantity: 20, unit: IngredientUnit.G, sortOrder: 3 },
          { ingredientId: yeast.id, quantity: 40, unit: IngredientUnit.G, sortOrder: 4 },
        ],
      },
      steps: {
        create: [
          { sortOrder: 1, instruction: "Mix the flour and water until no dry spots remain." },
          { sortOrder: 2, instruction: "Add salt and yeast, then knead until medium gluten development." },
          { sortOrder: 3, instruction: "Bulk ferment for 90 minutes with one fold at 45 minutes." },
          { sortOrder: 4, instruction: "Divide, shape, proof, and bake at 240C with steam." },
        ],
      },
    },
  });

  await prisma.recipe.upsert({
    where: { slug: "tomato-basil-sauce" },
    update: {
      categories: {
        deleteMany: {},
        create: [
          { categoryId: categoryByName.Fyllning.id },
        ],
      },
    },
    create: {
      slug: "tomato-basil-sauce",
      title: "Tomato Basil Sauce",
      description: "A fast service sauce seeded as a second exportable recipe.",
      authorId: user.id,
      totalWeightGrams: 1280,
      categories: {
        create: [
          { categoryId: categoryByName.Fyllning.id },
        ],
      },
      ingredients: {
        create: [
          { ingredientId: tomato.id, quantity: 1000, unit: IngredientUnit.G, sortOrder: 1 },
          { ingredientId: basil.id, quantity: 80, unit: IngredientUnit.G, sortOrder: 2 },
          { ingredientId: oliveOil.id, quantity: 180, unit: IngredientUnit.G, sortOrder: 3 },
          { ingredientId: salt.id, quantity: 20, unit: IngredientUnit.G, sortOrder: 4 },
        ],
      },
      steps: {
        create: [
          { sortOrder: 1, instruction: "Sweat the basil gently in olive oil without coloring." },
          { sortOrder: 2, instruction: "Add tomatoes and salt, then simmer until slightly reduced." },
          { sortOrder: 3, instruction: "Blend or crush to the desired service texture." },
        ],
      },
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
