import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { updateRecipeVisibilitySchema } from "@/lib/schemas/admin";
import { updateRecipeVisibility } from "@/lib/server/admin";
import { isModuleEnabled } from "@/lib/server/modules";
import { getSession } from "@/lib/server/session";

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!(await isModuleEnabled("RECIPES"))) {
      return NextResponse.json({ error: "Recipes module is disabled." }, { status: 404 });
    }

    const payload = updateRecipeVisibilitySchema.parse(await request.json());
    const recipe = await updateRecipeVisibility(payload);

    revalidatePath("/admin");
    revalidatePath("/recipes");
    revalidatePath("/dashboard");
    revalidatePath("/export");
    revalidatePath(`/recipes/${recipe.id}`);

    return NextResponse.json({ recipe });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update recipe visibility." },
      { status: 400 },
    );
  }
}
