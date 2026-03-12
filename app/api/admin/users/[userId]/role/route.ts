import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { updateUserRoleSchema } from "@/lib/schemas/admin";
import { updateAdminUserRole } from "@/lib/server/admin";
import { getSession } from "@/lib/server/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { userId } = await params;
    const payload = updateUserRoleSchema.parse(await request.json());
    const user = await updateAdminUserRole(userId, payload, session.userId);

    revalidatePath("/admin");
    revalidatePath("/recipes");
    revalidatePath("/dashboard");
    revalidatePath("/export");

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update user role." },
      { status: 400 },
    );
  }
}
