import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createRecipeCategory, listRecipeCategories } from "@/lib/server/recipe-categories";
import { isModuleEnabled } from "@/lib/server/modules";
import { getSession } from "@/lib/server/session";

const createRecipeCategorySchema = z.object({
  name: z.string().trim().min(2).max(60),
});

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!(await isModuleEnabled("RECIPES"))) {
    return NextResponse.json({ error: "Recipes module is disabled." }, { status: 404 });
  }

  const categories = await listRecipeCategories();
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!(await isModuleEnabled("RECIPES"))) {
      return NextResponse.json({ error: "Recipes module is disabled." }, { status: 404 });
    }

    const payload = createRecipeCategorySchema.parse(await request.json());
    const category = await createRecipeCategory(payload.name);

    revalidatePath("/recipes");
    revalidatePath("/recipes/new");
    revalidatePath("/import");

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create category." },
      { status: 400 },
    );
  }
}
