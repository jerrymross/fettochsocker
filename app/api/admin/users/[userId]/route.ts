import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { deleteAdminUser } from "@/lib/server/admin";
import { getSession } from "@/lib/server/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { userId } = await params;
    const user = await deleteAdminUser(userId, session.userId);

    revalidatePath("/admin");
    revalidatePath("/recipes");
    revalidatePath("/dashboard");
    revalidatePath("/export");

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete user." },
      { status: 400 },
    );
  }
}
