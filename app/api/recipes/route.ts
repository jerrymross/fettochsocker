import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { recipeInputSchema } from "@/lib/schemas/recipe";
import { isModuleEnabled } from "@/lib/server/modules";
import { saveRecipe, listRecipes } from "@/lib/server/recipes";
import { getSession } from "@/lib/server/session";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!(await isModuleEnabled("RECIPES"))) {
    return NextResponse.json({ error: "Recipes module is disabled." }, { status: 404 });
  }

  const recipes = await listRecipes();
  return NextResponse.json({ recipes });
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

    const payload = recipeInputSchema.parse(await request.json());
    const recipe = await saveRecipe(payload, session.userId);

    revalidatePath("/dashboard");
    revalidatePath("/recipes");

    return NextResponse.json({ recipe }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create recipe." },
      { status: 400 },
    );
  }
}
