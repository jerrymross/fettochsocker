import { NextResponse } from "next/server";
import { exportRecipeCollectionSchema } from "@/lib/schemas/exports";
import { createRecipePdf } from "@/lib/server/exports";
import { isModuleEnabled } from "@/lib/server/modules";
import { getSession } from "@/lib/server/session";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!(await isModuleEnabled("EXPORT"))) {
      return NextResponse.json({ error: "Export module is disabled." }, { status: 404 });
    }

    const payload = exportRecipeCollectionSchema.parse(await request.json());
    const { pdfBuffer, fileName } = await createRecipePdf(session.userId, session.role, payload);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate PDF." },
      { status: 400 },
    );
  }
}
