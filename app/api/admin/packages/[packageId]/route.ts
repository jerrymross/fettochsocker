import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { recipePackageInputSchema } from "@/lib/schemas/admin";
import { updateRecipePackage } from "@/lib/server/admin";
import { isModuleEnabled } from "@/lib/server/modules";
import { getSession } from "@/lib/server/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ packageId: string }> },
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!(await isModuleEnabled("RECIPES"))) {
      return NextResponse.json({ error: "Recipes module is disabled." }, { status: 404 });
    }

    const { packageId } = await params;
    const payload = recipePackageInputSchema.parse(await request.json());
    const recipePackage = await updateRecipePackage(packageId, payload);

    revalidatePath("/admin");
    revalidatePath("/recipes");
    revalidatePath("/dashboard");
    revalidatePath("/export");

    return NextResponse.json({ recipePackage });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update recipe package." },
      { status: 400 },
    );
  }
}
