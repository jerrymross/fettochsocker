import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { updateModuleSchema } from "@/lib/schemas/modules";
import { getAllModules, updateModuleState } from "@/lib/server/modules";
import { getSession } from "@/lib/server/session";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const modules = await getAllModules();
  return NextResponse.json({ modules });
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = updateModuleSchema.parse(await request.json());
    const updatedModule = await updateModuleState(payload.key, payload.enabled);

    revalidatePath("/dashboard");
    revalidatePath("/recipes");
    revalidatePath("/import");
    revalidatePath("/export");
    revalidatePath("/admin/modules");
    revalidatePath("/settings");

    return NextResponse.json({ module: updatedModule });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update module state." },
      { status: 400 },
    );
  }
}
