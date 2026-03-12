import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { recipePackageInputSchema } from "@/lib/schemas/admin";
import { createRecipePackage } from "@/lib/server/admin";
import { isModuleEnabled } from "@/lib/server/modules";
import { getSession } from "@/lib/server/session";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!(await isModuleEnabled("RECIPES"))) {
      return NextResponse.json({ error: "Recipes module is disabled." }, { status: 404 });
    }

    const payload = recipePackageInputSchema.parse(await request.json());
    const recipePackage = await createRecipePackage(payload, session.userId);

    revalidatePath("/admin");
    revalidatePath("/recipes");
    revalidatePath("/dashboard");
    revalidatePath("/export");

    return NextResponse.json({ recipePackage }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create recipe package." },
      { status: 400 },
    );
  }
}
