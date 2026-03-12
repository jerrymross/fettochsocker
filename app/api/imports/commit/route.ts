import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { commitImportSchema } from "@/lib/schemas/imports";
import { commitImport } from "@/lib/server/imports";
import { isModuleEnabled } from "@/lib/server/modules";
import { getSession } from "@/lib/server/session";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!(await isModuleEnabled("IMPORT")) || !(await isModuleEnabled("RECIPES"))) {
      return NextResponse.json({ error: "Import module is disabled." }, { status: 404 });
    }

    const payload = commitImportSchema.parse(await request.json());
    const recipe = await commitImport(session.userId, payload);

    revalidatePath("/dashboard");
    revalidatePath("/recipes");
    revalidatePath("/import");

    return NextResponse.json({ recipe }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to finalize import." },
      { status: 400 },
    );
  }
}
