import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { recipeInputSchema } from "@/lib/schemas/recipe";
import { isModuleEnabled } from "@/lib/server/modules";
import { getRecipeById, removeRecipe, saveRecipe } from "@/lib/server/recipes";
import { getSession } from "@/lib/server/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recipeId: string }> },
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!(await isModuleEnabled("RECIPES"))) {
    return NextResponse.json({ error: "Recipes module is disabled." }, { status: 404 });
  }

  const { recipeId } = await params;
  const recipe = await getRecipeById(recipeId);

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  return NextResponse.json({ recipe });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ recipeId: string }> },
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!(await isModuleEnabled("RECIPES"))) {
      return NextResponse.json({ error: "Recipes module is disabled." }, { status: 404 });
    }

    const { recipeId } = await params;
    const payload = recipeInputSchema.parse(await request.json());
    const recipe = await saveRecipe(payload, session.userId, recipeId);

    revalidatePath("/dashboard");
    revalidatePath("/recipes");
    revalidatePath(`/recipes/${recipeId}`);

    return NextResponse.json({ recipe });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update recipe." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ recipeId: string }> },
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!(await isModuleEnabled("RECIPES"))) {
      return NextResponse.json({ error: "Recipes module is disabled." }, { status: 404 });
    }

    const { recipeId } = await params;
    const recipe = await getRecipeById(recipeId);

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
    }

    await removeRecipe(recipeId);

    revalidatePath("/dashboard");
    revalidatePath("/recipes");
    revalidatePath(`/recipes/${recipeId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete recipe." },
      { status: 400 },
    );
  }
}
